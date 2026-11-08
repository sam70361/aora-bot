import type { CharacterOptions } from '../core/options.js';
import {
  CENTER,
  DEFAULT_FACE_TUNE,
  DEFAULT_POSE,
  DEFAULT_POSE_HOME,
  isCuteFamily,
  isDrawnFace,
  type CuteMouthId,
  type FaceTune,
  type MouthId,
  type MouthSpec,
  type NoseId,
  type Pose,
  type PoseHome,
  type ShapeId,
  type ShapePart,
} from '../core/types.js';
import { computeFaceGeometry, turnFace } from '../face/placement.js';
import {
  getCuteMouth,
  getMouth,
  LINE_WEIGHT,
  morphMouth,
  mouthSpecFor,
  resolveLineWeight,
} from '../face/features.js';
import { morphEyePair } from '../face/morph.js';
import {
  drawnMouthFor,
  drawnPairFor,
  drawnPairForState,
  getFaceDesign,
  morphDrawnPair,
  type AnyFaceDesign,
  type DrawnEntry,
  type DrawnInput,
  type DrawnPair,
} from '../face/drawn/index.js';
import {
  CUTE_EYE_TOPOLOGIES,
  EYE_TOPOLOGIES,
  eyePairFor,
  type EyePair,
  type ExpressionId,
} from '../face/topologies.js';
import { evaluateFx, type FxFrame } from '../motion/fx.js';
import { themeExtras } from '../themes/extras-hook.js';
import { evaluateHudPrimitives, HUD_PRINT_MIN_PX } from '../hud/dials.js';
import type { HudSpec } from '../hud/spec.js';
import { clamp, easeOutCubic, easeOutQuart, frameLerp } from '../math/easing.js';
import { autoNoseForKey, fnv1a32, mulberry32 } from '../math/hash.js';
import { settleSpring, spring, stepSpring, type Spring } from '../math/spring.js';
import {
  BELT_CORE_SIZE,
  beltBodyRing,
  BELT_BODY_SHARE,
  beltForState,
  blendBeltFrames,
  evaluateBelt,
  type BeltFrame,
  type BeltKind,
} from '../motion/belts.js';
import { behaviourFor, createImpulseBehaviour, type BodyTargets } from '../motion/behaviours.js';
import {
  ANTIC_STATES,
  faceTuneForState,
  gazeForState,
  IDLE_STATE,
  mouthForState,
  STATE_BLINK_MS,
  STATE_BLUSH,
  STATE_CUTE_EYES,
  STATE_CUTE_MOUTH,
  STATE_ENTRY_EFFECTS,
  STATE_EYE_SWITCH_MS,
  STATE_EYE_TOPOLOGIES,
  STATE_FX,
  STATE_MOUTH_TALK,
  settleForState,
  type CharacterState,
} from '../motion/states.js';
import { createParticleSystem, type ParticleSystem } from '../particles.js';
import { getEyeScaleForShape, getShape, getShapeScale } from '../shapes/registry.js';
import { particleFrames, trailFrames } from './particle-frames.js';
import type {
  BadgeFrame,
  BeltRingFrame,
  BeltSnapshot,
  FaceFrame,
  FrameSnapshot,
  HudSnapshot,
  PartFrame,
} from './snapshot.js';

/** Where the eyes are looking, as a fraction of the way to the edge of their range. */
export interface Gaze {
  x: number;
  y: number;
}

/**
 * Runs deferred work for the simulation. The only deferred work there is is
 * the second and third phase of a blink.
 *
 * By default the simulation keeps these on its own clock, so a run in Node is
 * a pure function of its inputs. A host that wants blink phases on wall time
 * between frames — `createCharacter` does — supplies its own.
 */
export interface Scheduler {
  later(fn: () => void, ms: number): void;
  cancelAll(): void;
}

/**
 * A simulation that sits still: one frame of a character at rest.
 *
 * This is what static rendering uses. Nothing is random and nothing moves —
 * no blinks, no gaze drift, no cycling expressions, no body behaviour — so
 * the output is fully determined by the options.
 */
export interface StillOptions {
  /** Where in a belt's cycle to sample it. Defaults to 0. */
  beltTime?: number;
  /** Pin the expression instead of taking the state's first one. */
  expression?: ExpressionId;
  /** Pin the mouth instead of taking the state's. */
  mouth?: MouthId | CuteMouthId;
}

export interface SimulationOptions extends Omit<
  CharacterOptions,
  'sourceId' | 'followTarget' | 'autoPause' | 'paused' | 'style' | 'styleOptions'
> {
  /**
   * Gaze derived from something the simulation cannot see, such as a
   * pointer in viewport pixels. Called once per step with the simulation
   * clock; consulted only when no explicit `gazeTarget` is set.
   */
  followGaze?: (clock: number) => Gaze | null;
  scheduler?: Scheduler;
  /**
   * How large the character is drawn, in CSS pixels. A function is read only
   * when a HUD is on screen, so a host can measure lazily.
   */
  displaySizePx?: number | (() => number);
  still?: boolean | StillOptions;
  /**
   * Counter-scale the eyes for the shape's optical scale, so they read the
   * same size on every body. On unless disabled.
   *
   * Static output does not apply it, so the static renderer turns it off to
   * keep that output byte-stable; the two disagree on every shape whose scale
   * is not 1.
   */
  compensateEyes?: boolean;
}

export interface Simulation {
  readonly state: CharacterState;
  /** Seconds of simulated time. */
  readonly clock: number;
  /** Advance by `dt` seconds. A step of 0 recomputes targets without moving anything. */
  step(dt: number): void;
  /** Apply changed options. Fields left `undefined` keep their value. */
  update(next: Partial<CharacterOptions>): void;
  spin(turns?: number): void;
  bounce(strength?: number): void;
  burst(count?: number): void;
  /**
   * Jump every spring to its target. Anything mid-flight — a face-style
   * crossfade, a nose swap, an eye morph — lands immediately.
   */
  settle(): void;
  /** Drop deferred work and reopen the eyes: what a host does when it freezes the character. */
  hold(): void;
  /** The current frame. Call after `step`. */
  snapshot(): FrameSnapshot;
  dispose(): void;
}

interface Springs {
  tilt: Spring;
  x: Spring;
  y: Spring;
  squash: Spring;
  blink: Spring;
  eyeScale: Spring;
  gazeX: Spring;
  gazeY: Spring;
  eyeMorph: Spring;
  mouthMorph: Spring;
  /** 0 = eyes-only face, 1 = line face. */
  lineBlend: Spring;
  /** 0 = not the cute face, 1 = the cute face. */
  cuteBlend: Spring;
  /** How flushed the cheeks are. */
  blush: Spring;
  /** Fades the mood effect in when a state arrives. */
  fx: Spring;
  /** Dips to 0 and recovers when the nose is swapped, so the swap fades. */
  featureFade: Spring;
  /** 0 = the face just left, 1 = the face now asked for: cross-fades a drawn face in or out. */
  faceFade: Spring;
  spin: Spring;
  beltBlend: Spring;
  /** 0 = the outgoing belt, 1 = the incoming one. */
  beltFade: Spring;
  hudBlend: Spring;
  badge: Spring;
  /** 0 = the outgoing shape's parts, 1 = the incoming shape's. */
  partsFade: Spring;
}

function makeSprings(face: CharacterOptions['face'], state: CharacterState): Springs {
  return {
    tilt: spring(0, 5, 0.9),
    x: spring(0, 3.5, 1),
    y: spring(0, 4, 1),
    squash: spring(1, 10, 0.8),
    blink: spring(1, 26, 1),
    eyeScale: spring(1, 9, 0.85),
    gazeX: spring(0, 13, 1),
    gazeY: spring(0, 13, 1),
    eyeMorph: spring(1, 8, 1),
    mouthMorph: spring(1, 8, 1),
    lineBlend: spring(face === 'line' ? 1 : 0, 10, 1),
    cuteBlend: spring(isCuteFamily(face) ? 1 : 0, 10, 1),
    blush: spring(isCuteFamily(face) ? STATE_BLUSH[state] : 0, 8, 1),
    fx: spring(1, 7, 1),
    featureFade: spring(1, 12, 1),
    faceFade: spring(1, 10, 1),
    spin: spring(0, 6.2, 1),
    beltBlend: spring(0, 14, 1),
    beltFade: spring(1, 11, 1),
    hudBlend: spring(0, 12, 1),
    badge: spring(0, 9, 0.55),
    partsFade: spring(1, 12, 1),
  };
}

/** Amplitude of the talking pulse on `MouthSpec.open`, in eye radii. */
const TALK_AMPLITUDE = 0.34;
const TALK_AMPLITUDE_CUTE = 0.6;

/** Body targets for a character that is not moving. */
const REST_TARGETS: BodyTargets = { tilt: 0, x: 0, y: 0, squash: 1 };

const EMPTY: readonly never[] = Object.freeze([]);

type Resolved = Required<
  Pick<
    CharacterOptions,
    'state' | 'variant' | 'face' | 'emphasis' | 'badgeColor' | 'seed' | 'entryEffects' | 'antics'
  >
> &
  Omit<CharacterOptions, 'shape'> & { shape: ShapeId };

/**
 * Build the part of a character that is not drawing.
 *
 * Everything that decides what the character is doing — the state machine,
 * springs, behaviours, blink and expression schedules, belts, HUD, particles
 * — lives here, and nothing here touches a DOM. A simulation in Node steps
 * and snapshots exactly as one in a browser does: the same seed and the same
 * inputs give the same frames.
 */
export function createSimulation(options: SimulationOptions = {}): Simulation {
  /*
   * Defaults are applied per key rather than by spreading `options` over them:
   * a caller passing `{ shape: undefined }` — which is what an optional React
   * prop looks like — means "default", not "no shape".
   */
  let opts: Resolved = {
    pose: options.pose,
    poseHome: options.poseHome,
    faceTune: options.faceTune,
    gazeTarget: options.gazeTarget,
    ink: options.ink,
    eyeScale: options.eyeScale,
    lineWeight: options.lineWeight,
    hud: options.hud,
    onSettle: options.onSettle,
    reducedMotion: options.reducedMotion,
    nose: options.nose,
    shape: options.shape ?? 'mochi',
    state: options.state ?? IDLE_STATE,
    variant: options.variant ?? 'solid',
    face: options.face ?? 'cute',
    emphasis: options.emphasis ?? false,
    badgeColor: options.badgeColor ?? null,
    seed: options.seed ?? 'aora',
    entryEffects: options.entryEffects ?? true,
    antics: options.antics ?? false,
  };

  const reduced = opts.reducedMotion ?? false;
  const stillOptions = options.still ? (options.still === true ? {} : options.still) : null;
  const still = stillOptions !== null;
  const compensateEyes = options.compensateEyes ?? true;
  const seedHash = fnv1a32(opts.seed);
  const random = mulberry32(seedHash);

  const pending: { at: number; fn: () => void }[] = [];
  const ownScheduler: Scheduler = {
    later(fn, ms) {
      pending.push({ at: clock + ms / 1000, fn });
    },
    cancelAll() {
      pending.length = 0;
    },
  };
  const scheduler = options.scheduler ?? ownScheduler;

  const springs = makeSprings(opts.face, opts.state);
  let shapeDef = getShape(opts.shape);
  let particles: ParticleSystem = createParticleSystem({ radius: shapeDef.beltRadius, random });
  /** The shape just left, whose parts are still fading out. */
  let previousParts: readonly ShapePart[] = EMPTY;
  /** The current shape's parts at full opacity, built once so a resting frame allocates nothing. */
  let restParts: readonly PartFrame[] | null = null;

  let clock = 0;
  let stateClock = 0;
  let behaviour = behaviourFor(opts.state);
  let impulseBehaviour = createImpulseBehaviour(opts.state);

  let topologyIndex = 0;
  let fromEyes: EyePair = isCuteFamily(opts.face) ? CUTE_EYE_TOPOLOGIES.dot : EYE_TOPOLOGIES.neutral;
  let toEyes: EyePair = currentTopology();
  // A still frame has no morph to be part-way through; starting both ends on
  // the same pair keeps the blend an exact copy rather than a lerp at t = 1.
  if (still) fromEyes = toEyes;
  /*
   * A drawn face's own eyes, on the same morph spring as the plain ones. The
   * plain cute pair keeps running underneath, so a switch to or from the cute
   * face morphs rather than fades; the drawn layers cross-fade on `faceFade`,
   * the face just left kept as it was when the switch came.
   */
  let design: AnyFaceDesign | null = isDrawnFace(opts.face) ? getFaceDesign(opts.face) : null;
  let toDrawn: DrawnPair | null = currentDrawn();
  let fromDrawn: DrawnPair | null = design && !still ? drawnPairFor(design, 'dot') : toDrawn;
  let previousDrawn: { design: AnyFaceDesign; eyes: DrawnPair } | null = null;
  let nextSwitch = scheduleSwitch();
  let nextBlink = scheduleBlink();
  let nextGaze = still ? Infinity : 0;
  // The random glance the eyes are currently drifting towards, in shape
  // units. Kept apart from the spring target so a followed pointer can be
  // added on top every frame without accumulating.
  let driftGazeX = 0;
  let driftGazeY = 0;

  let fromMouth: MouthSpec = mouthFor(opts.state);
  let toMouth: MouthSpec = fromMouth;
  let noseId: NoseId | null = opts.nose === undefined ? autoNoseForKey(opts.seed) : opts.nose;

  let baseFaceTune: FaceTune = { ...DEFAULT_FACE_TUNE, ...options.faceTune };
  let activeFaceTune: FaceTune = faceTuneForState(opts.state, baseFaceTune);
  const renderedFaceTune: FaceTune = { ...activeFaceTune };

  let pose: Pose = { ...DEFAULT_POSE, ...options.pose };
  let poseHome: PoseHome = { ...DEFAULT_POSE_HOME, ...options.poseHome };

  let beltKind: BeltKind | null = beltForState(opts.state);
  let beltClock = still ? (stillOptions?.beltTime ?? 0) : 0;
  let previousBelt: BeltKind | null = null;
  let previousBeltClock = 0;

  let hudSpec: HudSpec | null = options.hud ?? null;
  let hudClock = 0;
  /**
   * The fitted eye radius, cached.
   *
   * The HUD needs it on every frame, including frames where the face is not
   * drawn at all because a belt has taken the body over — a dial has to keep
   * its stroke weight while the character behind it turns into a bead. It
   * only depends on the shape and the face tuning, so it is measured once and
   * invalidated when either changes.
   */
  let fittedEyeRadius = 0;

  let spinTarget = 0;
  let bounceUntil = 0;
  let bounceStart = 0;
  let bounceStrength = 1;
  let wideTrails = false;
  let nextAntic = scheduleAntic();

  /** The eyes the current state and face want right now: the pinned expression, or the state's cycle. */
  function currentTopology(): EyePair {
    const cute = isCuteFamily(opts.face);
    const pinned = still ? stillOptions?.expression : undefined;
    if (pinned) return eyePairFor(cute, pinned);
    const table: Record<CharacterState, string[]> = cute ? STATE_CUTE_EYES : STATE_EYE_TOPOLOGIES;
    const list = table[opts.state] ?? ['neutral'];
    return eyePairFor(cute, list[topologyIndex % list.length] ?? 'neutral');
  }

  /** The drawn face's eyes the current state wants right now, or `null` on a face that is not drawn. */
  function currentDrawn(): DrawnPair | null {
    if (!design) return null;
    const pinned = still ? stillOptions?.expression : undefined;
    return pinned ? drawnPairFor(design, pinned) : drawnPairForState(design, opts.state, topologyIndex);
  }

  /** The mouth a state wears on the current face, unless a still frame pins one. */
  function mouthFor(state: CharacterState): MouthSpec {
    const cute = isCuteFamily(opts.face);
    const pinned = still ? stillOptions?.mouth : undefined;
    if (design) return drawnMouthFor(design, state, pinned);
    const spec = pinned ? mouthSpecFor(cute, pinned) : undefined;
    if (spec) return spec;
    return cute ? getCuteMouth(STATE_CUTE_MOUTH[state]) : getMouth(mouthForState(state));
  }

  /** The drawn eyes as they are this frame. */
  function blendedDrawn(): DrawnPair | null {
    if (!fromDrawn || !toDrawn) return toDrawn;
    const t = reduced ? 1 : easeOutCubic(clamp(springs.eyeMorph.value, 0, 1));
    return morphDrawnPair(fromDrawn, toDrawn, t);
  }

  /** Start the eyes on their way to what the state wants now, plain and drawn alike. */
  function retargetEyes(): void {
    fromEyes = blendedEyes();
    toEyes = currentTopology();
    fromDrawn = blendedDrawn();
    toDrawn = currentDrawn();
    springs.eyeMorph.value = 0;
    springs.eyeMorph.target = 1;
  }

  function scheduleSwitch(): number {
    if (still) return Infinity;
    const range = STATE_EYE_SWITCH_MS[opts.state];
    if (!range) return Infinity;
    return stateClock + (range[0] + random() * (range[1] - range[0])) / 1000;
  }

  function scheduleBlink(): number {
    if (still) return Infinity;
    const range = STATE_BLINK_MS[opts.state];
    if (!range) return Infinity;
    return clock + (range[0] + random() * (range[1] - range[0])) / 1000;
  }

  function scheduleAntic(): number {
    if (still || !opts.antics || !ANTIC_STATES.includes(opts.state)) return Infinity;
    return clock + 20 + random() * 25;
  }

  function startBounce(strength: number): void {
    bounceStart = clock;
    bounceUntil = clock + 1.33;
    bounceStrength = strength;
  }

  /** The flourish a state plays as it arrives. */
  function playEntryEffect(state: CharacterState): void {
    if (!opts.entryEffects || reduced || still) return;
    const effect = STATE_ENTRY_EFFECTS[state];
    if (!effect) return;
    if (effect.spin) spinTarget += effect.spin;
    if (effect.burst) particles.burst(effect.burst);
    if (effect.bounce) startBounce(0.5);
  }

  /**
   * Adopt a state: reset its clock, restart every morph, swap the belt.
   *
   * Shared by `update({ state })` and by the settle clock below, because a
   * state the simulation moves to by itself has to arrive exactly as one the
   * host asked for — same eye morph, same mouth morph, same entry flourish.
   */
  function enterState(next: CharacterState): void {
    opts = { ...opts, state: next };
    stateClock = 0;
    topologyIndex = 0;
    behaviour = behaviourFor(next);
    impulseBehaviour = createImpulseBehaviour(next);

    retargetEyes();
    activeFaceTune = faceTuneForState(next, baseFaceTune);
    nextSwitch = scheduleSwitch();
    nextBlink = scheduleBlink();

    fromMouth = blendedMouth();
    toMouth = mouthFor(next);
    springs.mouthMorph.value = 0;
    springs.mouthMorph.target = 1;
    // The effect of the new state fades in rather than appearing mid-pose.
    springs.fx.value = 0;

    const nextBelt = beltForState(next);
    if (nextBelt !== beltKind) {
      /*
       * Two belts on screen at once, briefly. A swap is invisible while the
       * body is still a shape — the blend spring hides it — but going from
       * one belt straight to another means three beads vanish and a pencil
       * appears in the same frame. Keeping the outgoing frame lets the dots
       * collapse into whatever replaces them.
       */
      if (beltKind && nextBelt) {
        previousBelt = beltKind;
        previousBeltClock = beltClock;
        springs.beltFade.value = 0;
        springs.beltFade.target = 1;
      } else {
        previousBelt = null;
        springs.beltFade.value = 1;
        springs.beltFade.target = 1;
      }
      beltKind = nextBelt;
      beltClock = 0;
    }

    playEntryEffect(next);
    nextAntic = scheduleAntic();
  }

  function runDue(): void {
    if (pending.length === 0) return;
    // Work may schedule more work, so look again after each one fires.
    for (let i = 0; i < pending.length;) {
      const item = pending[i]!;
      if (item.at <= clock) {
        pending.splice(i, 1);
        item.fn();
        i = 0;
      } else {
        i++;
      }
    }
  }

  function step(dt: number): void {
    clock += dt;
    stateClock += dt;
    if (beltKind) beltClock += dt;
    if (previousBelt) previousBeltClock += dt;
    if (hudSpec) hudClock += dt;
    if (!options.scheduler) runDue();

    /*
     * Finite states. An arrival held for ten minutes is not an arrival, and
     * every host that used one had to write the same timeout; the simulation
     * owns the clock instead and tells the host where it went. Under reduced
     * motion there is nothing to watch, so the moment passes at once.
     */
    const settle = still ? null : settleForState(opts.state);
    if (settle && (reduced || stateClock * 1000 >= settle.afterMs)) {
      const from = opts.state;
      enterState(settle.to);
      opts.onSettle?.(from, settle.to);
    }

    // Expression cycling.
    if (stateClock >= nextSwitch) {
      topologyIndex++;
      retargetEyes();
      nextSwitch = scheduleSwitch();
    }

    // Blinking. The overshoot past 1 is what makes a blink read as a blink
    // rather than as the eyes briefly vanishing.
    if (clock >= nextBlink) {
      nextBlink = scheduleBlink();
      blinkSequence();
      if (random() < 0.14) scheduler.later(blinkSequence, 190);
    }

    // Antics: a small hop or a single spin, rarely, so a character left alone
    // in a corner still seems to have a life of its own.
    if (clock >= nextAntic) {
      nextAntic = scheduleAntic();
      if (random() < 0.6) startBounce(0.4);
      else spinTarget += 1;
    }

    // Gaze drift. An explicit target wins over a followed one: a host that
    // has done the conversion itself knows something this does not.
    const follow = still ? null : (opts.gazeTarget ?? options.followGaze?.(clock) ?? null);
    const gaze = gazeForState(opts.state);
    if (clock >= nextGaze) {
      const damping = follow ? 0.2 : 1;
      driftGazeX = (random() * 2 - 1) * gaze.x * damping;
      driftGazeY = (random() * 2 - 1) * gaze.y * damping;
      nextGaze = clock + (gaze.every[0] + random() * (gaze.every[1] - gaze.every[0])) / 1000;
    }
    // Set, not added: this runs every frame, and a `+=` here integrates the
    // pointer offset until the eyes leave the body.
    springs.gazeX.target = driftGazeX + (follow ? clamp(follow.x, -0.6, 0.6) * 22 : 0);
    springs.gazeY.target = driftGazeY + (follow ? clamp(follow.y, -0.6, 0.6) * 14 : 0);

    // Body behaviour.
    let targets: BodyTargets = REST_TARGETS;
    if (!still) {
      targets = behaviour({
        t: stateClock,
        clock,
        random,
        impulse: (v) => {
          springs.y.velocity += v;
        },
      });
      impulseBehaviour?.({
        t: stateClock,
        clock,
        random,
        impulse: (v) => {
          springs.y.velocity += v;
        },
      });
    }

    springs.tilt.target = targets.tilt;
    springs.x.target = targets.x;
    springs.squash.target = targets.squash;
    springs.y.target = targets.y + bounceOffset();

    springs.eyeScale.target = opts.emphasis ? 1.32 : 1;
    // A HUD is a readout around a body. Handing that body to a belt would
    // erase the silhouette the dial sits on, so HUD mode keeps the shape.
    // The cute face keeps its body too: what a belt said it says as an effect
    // beside the figure (STATE_FX), and only the older faces shrink to a core.
    const cuteFamily = isCuteFamily(opts.face);
    springs.beltBlend.target = hudSpec || cuteFamily ? 0 : beltKind ? 1 : 0;
    springs.beltFade.target = 1;
    springs.hudBlend.target = hudSpec ? 1 : 0;
    springs.badge.target = opts.state === 'notifying' ? 1 : 0;
    springs.spin.target = spinTarget;
    springs.lineBlend.target = opts.face === 'line' ? 1 : 0;
    springs.cuteBlend.target = cuteFamily ? 1 : 0;
    springs.blush.target = cuteFamily ? STATE_BLUSH[opts.state] : 0;
    springs.fx.target = 1;
    springs.mouthMorph.target = 1;
    springs.featureFade.target = 1;
    springs.faceFade.target = 1;

    if (reduced) {
      for (const s of Object.values(springs)) settleSpring(s);
    } else {
      for (const s of Object.values(springs)) stepSpring(s, dt);
    }

    // Face tune eases rather than snapping, so a state change does not pop.
    for (const key of Object.keys(activeFaceTune) as (keyof FaceTune)[]) {
      renderedFaceTune[key] = reduced
        ? activeFaceTune[key]
        : frameLerp(renderedFaceTune[key], activeFaceTune[key], 0.13, dt);
    }

    if (!reduced) {
      particles.update(dt, {
        spinVelocity: springs.spin.velocity * Math.PI * 2,
        sizeScale: 1,
        wide: wideTrails,
        sustain: false,
      });
    }

    // The outgoing belt is spent once the cross-fade has landed. Dropping it
    // here, not when drawing, keeps a snapshot from changing the simulation.
    if (previousBelt && clamp(springs.beltFade.value, 0, 1) >= 0.999) previousBelt = null;
    if (previousDrawn && clamp(springs.faceFade.value, 0, 1) >= 0.999) previousDrawn = null;
  }

  function blinkSequence(): void {
    springs.blink.value = 1;
    springs.blink.target = 0.05;
    scheduler.later(() => {
      springs.blink.target = 1.08;
      scheduler.later(() => {
        springs.blink.target = 1;
      }, 150);
    }, 70);
  }

  function bounceOffset(): number {
    if (still || clock >= bounceUntil) return 0;
    // Four decreasing parabolic arcs.
    const heights = [48, 28, 14, 6];
    const durations = [0.5, 0.382, 0.27, 0.177];
    let t = clock - bounceStart;
    for (let i = 0; i < heights.length; i++) {
      const d = durations[i]!;
      if (t < d) {
        const p = t / d;
        return -heights[i]! * bounceStrength * 4 * p * (1 - p);
      }
      t -= d;
    }
    return 0;
  }

  /** The host's own eye multiplier, clamped so a typo cannot fill the body. */
  const staticEyeScale = (): number => {
    const v = opts.eyeScale;
    return v == null || !Number.isFinite(v) ? 1 : clamp(v, 0.5, 2);
  };

  /** Multiplier that makes eyes read the same size on every body. */
  const shapeEyeScale = (): number => (compensateEyes ? getEyeScaleForShape(opts.shape) : 1);

  /** Fitted eye radius for the current shape, measured on demand. */
  function eyeRadius(): number {
    if (fittedEyeRadius > 0) return fittedEyeRadius;
    fittedEyeRadius = computeFaceGeometry({
      shape: shapeDef,
      eyes: EYE_TOPOLOGIES.neutral,
      faceTune: renderedFaceTune,
      pose,
      poseHome,
      eyeScale: shapeEyeScale() * staticEyeScale(),
    }).eyeRadius;
    return fittedEyeRadius;
  }

  function blendedEyes(): EyePair {
    const t = reduced ? 1 : easeOutCubic(clamp(springs.eyeMorph.value, 0, 1));
    return morphEyePair(fromEyes, toEyes, t);
  }

  function blendedMouth(): MouthSpec {
    const t = reduced ? 1 : easeOutCubic(clamp(springs.mouthMorph.value, 0, 1));
    return morphMouth(fromMouth, toMouth, t);
  }

  /** The mouth as drawn this frame: the morph plus, in talking states, a pulse on `open`. */
  function currentMouth(): MouthSpec {
    const m = blendedMouth();
    if (reduced || still || !STATE_MOUTH_TALK.includes(opts.state)) return m;
    // Two incommensurate sines so the pulse reads as speech, not as a metronome.
    const pulse = 0.5 + 0.5 * Math.sin(clock * Math.PI * 2 * 3.1) * Math.sin(clock * Math.PI * 2 * 0.9 + 1);
    // The cute mouth is drawn in its own, smaller unit, so it needs a bigger swing to read as speech.
    const amplitude = isCuteFamily(opts.face) ? TALK_AMPLITUDE_CUTE : TALK_AMPLITUDE;
    return { ...m, open: m.open + amplitude * pulse };
  }

  /** The belt as drawn this frame, cross-faded if one is on its way out. */
  function currentBeltFrame(): BeltFrame | null {
    if (!beltKind) return null;
    const to = evaluateBelt(beltKind, beltClock);
    if (!previousBelt) return to;
    const k = clamp(springs.beltFade.value, 0, 1);
    return blendBeltFrames(evaluateBelt(previousBelt, previousBeltClock), to, k);
  }

  /**
   * How large the core sphere is, following the belt cross-fade.
   *
   * Two belts with different core sizes — a pencil keeps a body to write
   * beside, a whirl reduces it to a bead — would otherwise step between the
   * two the moment the state changed.
   */
  function beltCoreSize(): number {
    const target = beltKind ? BELT_CORE_SIZE[beltKind] : 26;
    if (!previousBelt) return target;
    const from = BELT_CORE_SIZE[previousBelt];
    return from + (target - from) * clamp(springs.beltFade.value, 0, 1);
  }

  function displayedSize(): number {
    const size = options.displaySizePx;
    return typeof size === 'function' ? size() : (size ?? 0);
  }

  function snapshot(): FrameSnapshot {
    const blend = clamp(springs.beltBlend.value, 0, 1);
    const beltFrame = currentBeltFrame();

    // The shape, or a shrinking circle as a belt takes over.
    const outline =
      blend > 0.001 ? beltBodyRing(shapeDef.ring, shapeDef.radius, blend, beltCoreSize()) : shapeDef.outline;

    const tilt = springs.tilt.value * shapeDef.tiltScale;
    const cute = clamp(springs.cuteBlend.value, 0, 1);
    // How much of the belt's motion the body takes: all of it as a core, a share of it as a whole figure.
    const share = beltFrame && beltKind ? blend + (1 - blend) * cute * (BELT_BODY_SHARE[beltKind] ?? 0) : 0;
    const coreScale = beltFrame ? 1 + (beltFrame.coreScale - 1) * share : 1;

    const hudFade = clamp(springs.hudBlend.value, 0, 1);
    const face = faceFrame(blend, hudFade);
    return {
      state: opts.state,
      shape: opts.shape,
      shapeScale: getShapeScale(opts.shape),
      time: clock,
      settled: reduced || still,
      variant: opts.variant,
      ink: opts.ink ?? null,
      body: {
        outline,
        radius: shapeDef.radius,
        x: springs.x.value + (beltFrame ? beltFrame.coreX * share : 0),
        y: springs.y.value + (beltFrame ? beltFrame.coreY * share : 0),
        rotation: tilt,
        scaleX: coreScale,
        scaleY: springs.squash.value * coreScale,
        coreOpacity: bodyOpacity(beltFrame, blend, cute),
        parts: partFrames(blend),
      },
      face,
      belt: beltFrame && blend >= 0.01 ? beltSnapshot(beltFrame, blend) : null,
      fx: fxFrame(face, blend, hudFade),
      hud: hudSnapshot(hudFade),
      badge: badgeFrame(),
      particles: particleFrames(particles.particles),
      trails: trailFrames(particles.trails),
    };
  }

  /**
   * The figure's extra pieces. They are not part of the ring a belt morphs
   * into a bead, so they fade out quickly as the belt takes over; and across a
   * change of shape the old shape's parts fade out while the new one's fade
   * in, rather than one set standing on the other body for a frame.
   */
  function partFrames(blend: number): readonly PartFrame[] {
    const fade = clamp(springs.partsFade.value, 0, 1);
    const present = clamp(1 - blend / 0.5, 0, 1);
    const crossing = fade < 0.999 && previousParts.length > 0;
    if (present >= 0.999 && !crossing) {
      restParts ??= shapeDef.parts.map((part) => ({ ...part, opacity: 1 }));
      return restParts;
    }
    if (present <= 0.001) return EMPTY;

    const frames: PartFrame[] = [];
    if (crossing) {
      for (const part of previousParts) frames.push({ ...part, opacity: (1 - fade) * present });
    }
    for (const part of shapeDef.parts) frames.push({ ...part, opacity: fade * present });
    return frames;
  }

  /**
   * The body's own opacity: the belt core's, or on the whole figure the dimming
   * of the one belt that has any (standby). 
ull leaves the paint alone.
   */
  function bodyOpacity(beltFrame: BeltFrame | null, blend: number, cute: number): number | null {
    if (!beltFrame) return null;
    if (cute < 0.005) return beltFrame.coreOpacity;
    const dim = 1 + (beltFrame.coreOpacity - 1) * clamp(springs.fx.value, 0, 1);
    return dim < 0.999 ? dim : blend > 0.001 ? beltFrame.coreOpacity : null;
  }

  function faceFrame(blend: number, hudFade: number): FaceFrame {
    // Eyes fade out as the body becomes a core sphere, and again when a HUD
    // takes the interior: the ring is the reading, the body is a silhouette.
    const eyeVisible = blend < 0.35 && hudFade < 0.98;
    const opacity = (eyeVisible ? 1 - blend / 0.35 : 0) * (1 - hudFade);
    const lineBlend = clamp(springs.lineBlend.value, 0, 1);
    const cute = clamp(springs.cuteBlend.value, 0, 1);
    const frame: FaceFrame = {
      style: opts.face,
      opacity,
      geometry: null,
      lineBlend,
      featureFade: clamp(springs.featureFade.value, 0, 1),
      features: false,
      cute,
      blush: clamp(springs.blush.value, 0, 1) * cute,
    };
    if (opacity <= 0.01) return frame;

    const features = lineBlend > 0.005;
    frame.features = features;
    frame.geometry = computeFaceGeometry({
      shape: shapeDef,
      eyes: blendedEyes(),
      faceTune: renderedFaceTune,
      pose,
      poseHome,
      // Counter-scale so eyes read the same size on a tofu as on a mochi,
      // despite those bodies being drawn at different scales.
      eyeScale: springs.eyeScale.value * shapeEyeScale() * staticEyeScale(),
      blink: clamp(springs.blink.value, 0.05, 1.2),
      gazeX: springs.gazeX.value,
      gazeY: springs.gazeY.value,
      face: features ? 'line' : cute > 0.005 ? 'cute' : 'eyes',
      lineBlend,
      cuteBlend: cute,
      mouth: features || cute > 0.005 ? currentMouth() : undefined,
      nose: features ? noseId : null,
      lineWeight: resolveLineWeight(opts.lineWeight),
      drawn: cute > 0.005 ? drawnInput() : undefined,
    });
    // A spin turns the body about its vertical axis: the outline stays upright and the face goes round.
    const yaw = (springs.spin.value % 1) * Math.PI * 2;
    if (Math.cos(yaw) < 1 - 1e-6) frame.geometry = turnFace(frame.geometry, shapeDef, yaw);
    return frame;
  }

  /** The drawn faces on show this frame, the one being left first; `undefined` when there are none. */
  function drawnInput(): DrawnInput | undefined {
    const fade = clamp(springs.faceFade.value, 0, 1);
    const entries: DrawnEntry[] = [];
    if (previousDrawn) entries.push({ ...previousDrawn, weight: 1 - fade });
    const eyes = blendedDrawn();
    if (design && eyes) entries.push({ design, eyes, weight: fade });
    if (entries.length === 0) return undefined;
    return {
      entries,
      time: stateClock,
      settled: reduced || still,
      weight: resolveLineWeight(opts.lineWeight) / LINE_WEIGHT,
    };
  }

  /**
   * The mood effect, faded by how far the cute face is in and how little a
   * belt or a dial has taken the body over. `null` when this state throws
   * nothing off, or the face is not the cute one.
   */
  function fxFrame(face: FaceFrame, blend: number, hudFade: number): FxFrame | null {
    const kind = STATE_FX[opts.state];
    if (!kind || face.cute < 0.005 || design?.quietFx.includes(kind)) return null;

    let anchor: { x: number; y: number; r: number } | undefined;
    // A drawn eye is larger than a dot and sits elsewhere: a tear falls from the eye that is drawn.
    const drawn = face.geometry?.drawn;
    const drawnLeft = drawn?.[drawn.length - 1]?.left.layers[0]?.rings[0];
    const left = drawnLeft ?? face.geometry?.left.points;
    if (kind === 'tear') {
      if (!left || left.length === 0) return null;
      const xs = left.map((p) => p[0]);
      const ys = left.map((p) => p[1]);
      const lo = Math.min(...xs);
      const hi = Math.max(...xs);
      anchor = { x: (lo + hi) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2, r: (hi - lo) / 2 };
    }

    const frame = evaluateFx(kind, stateClock, {
      settled: reduced || still,
      ring: shapeDef.beltRadius + 14,
      anchor,
    });
    const fade = clamp(springs.fx.value, 0, 1) * face.cute * (1 - blend) * (1 - hudFade);
    if (frame.items.length === 0 || fade < 0.01) return null;
    // A theme's figure moves it out of the way of its own props, where it has any in the top right.
    const extras = frame.space === 'scene' ? themeExtras() : null;
    const placed = extras ? extras.placeFx(shapeDef, kind, getShapeScale(opts.shape)) : null;
    return {
      ...frame,
      items: frame.items.map((item) =>
        placed ? placed(item, item.opacity * fade) : { ...item, opacity: item.opacity * fade },
      ),
    };
  }

  function beltSnapshot(frame: BeltFrame, blend: number): BeltSnapshot {
    return {
      blend,
      dots: frame.dots,
      rings: frame.rings.map((ring): BeltRingFrame => {
        const { dash, ...rest } = ring;
        if (!dash) return rest;
        const [on, period] = dash.split(' ').map(Number) as [number, number];
        return { ...rest, dash: { on, period } };
      }),
      glyphs: frame.glyphs ?? EMPTY,
    };
  }

  function hudSnapshot(fade: number): HudSnapshot {
    // Measuring the face is not free, and a character without a dial has no
    // use for a stroke weight.
    if (!hudSpec || fade < 0.01) return { opacity: fade, primitives: null, strokeWidth: 0 };

    const lineWeight = resolveLineWeight(opts.lineWeight);
    const shown = displayedSize();
    return {
      opacity: fade,
      strokeWidth: Math.max(0.6, lineWeight * eyeRadius()),
      primitives: evaluateHudPrimitives(hudSpec, hudClock * 1000, {
        radius: shapeDef.radius,
        eyeRadius: eyeRadius(),
        lineWeight,
        reducedMotion: reduced,
        print: shown < 1 || shown >= HUD_PRINT_MIN_PX,
      }),
    };
  }

  function badgeFrame(): BadgeFrame | null {
    const v = springs.badge.value;
    if (v < 0.01 || !opts.badgeColor) return null;
    return {
      color: opts.badgeColor,
      x: CENTER + shapeDef.radius * 0.62,
      y: CENTER - shapeDef.radius * 0.62,
      r: 18 * easeOutQuart(clamp(v, 0, 1)),
    };
  }

  return {
    get state() {
      return opts.state;
    },
    get clock() {
      return clock;
    },

    step,

    update(next) {
      const prevState = opts.state;
      const prevShape = opts.shape;
      const prevFace = opts.face;
      const { shape: nextShape, ...rest } = next;
      opts = { ...opts, ...withoutUndefined(rest), shape: nextShape ?? prevShape };

      // Each face has its own eye and mouth tables, so a live switch has to
      // pick the new face's pair for the state and morph to it.
      if (opts.face !== prevFace) {
        // Two designs have nothing to interpolate between: the face being left keeps its eyes as they are and fades.
        const leaving = blendedDrawn();
        previousDrawn = design && leaving ? { design, eyes: leaving } : null;
        design = isDrawnFace(opts.face) ? getFaceDesign(opts.face) : null;
        if (previousDrawn || design) {
          springs.faceFade.value = 0;
          springs.faceFade.target = 1;
        }
        fromEyes = blendedEyes();
        toEyes = currentTopology();
        toDrawn = currentDrawn();
        fromDrawn = toDrawn;
        springs.eyeMorph.value = 0;
        springs.eyeMorph.target = 1;
        fromMouth = blendedMouth();
        toMouth = mouthFor(opts.state);
        springs.mouthMorph.value = 0;
        springs.mouthMorph.target = 1;
      }

      if (nextShape && opts.shape !== prevShape) {
        previousParts = shapeDef.parts;
        shapeDef = getShape(opts.shape);
        restParts = null;
        springs.partsFade.value = 0;
        springs.partsFade.target = 1;
        particles = createParticleSystem({ radius: shapeDef.beltRadius, random });
        fittedEyeRadius = 0;
      }
      if (next.faceTune || next.eyeScale !== undefined) fittedEyeRadius = 0;

      if (next.state && next.state !== prevState) enterState(next.state);

      if (next.hud !== undefined) {
        hudSpec = next.hud;
        // The clock starts when the dial appears, not when the character did:
        // a progress ring handed a value halfway through a session should
        // begin its sweep from where the eye finds it.
        if (hudSpec) hudClock = 0;
      }

      if (next.antics !== undefined) nextAntic = scheduleAntic();

      if (next.nose !== undefined) {
        const resolved = next.nose === null ? null : next.nose;
        if (resolved !== noseId) {
          noseId = resolved;
          // Fade the old nose out and the new one in rather than snapping.
          springs.featureFade.value = 0;
          springs.featureFade.target = 1;
        }
      }

      if (next.faceTune) {
        baseFaceTune = { ...DEFAULT_FACE_TUNE, ...next.faceTune };
        activeFaceTune = faceTuneForState(opts.state, baseFaceTune);
      }
      if (next.pose) pose = { ...pose, ...next.pose };
      if (next.poseHome) poseHome = { ...DEFAULT_POSE_HOME, ...next.poseHome };
    },

    spin(turns = 1) {
      spinTarget += turns;
      wideTrails = Math.abs(turns) > 1;
    },

    bounce(strength = 1) {
      startBounce(strength);
    },

    burst(count = 16) {
      if (reduced) return;
      particles.burst(count);
    },

    settle() {
      // First pass computes the targets for the current state; the second
      // leaves every spring parked on them.
      step(0);
      for (const s of Object.values(springs)) settleSpring(s);
      for (const key of Object.keys(activeFaceTune) as (keyof FaceTune)[]) {
        renderedFaceTune[key] = activeFaceTune[key];
      }
      step(0);
    },

    hold() {
      // A blink that resolves while frozen would move the eyes on a still
      // character the moment it resumes. Drop it and let the schedule restart.
      scheduler.cancelAll();
      springs.blink.target = 1;
    },

    snapshot,

    dispose() {
      scheduler.cancelAll();
      particles.clear();
    },
  };
}

/** Copy of `obj` without keys whose value is `undefined`. */
function withoutUndefined<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }
  return out;
}
