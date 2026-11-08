/**
 * Signature motions: a lantern swaying, a candy cane swinging, a nose
 * blinking, bubbles rising from a cauldron, a stocking swinging from its
 * loop, snow falling round a snowman.
 *
 * A theme declares its motions by id (`ThemePackage.motions`); its art names
 * them, on a part (`ArtPart.motion`) or on the whole figure
 * (`DrawnArt.motion`), with a pivot where the art gives one. A part keeps its
 * place in the figure: its motion wraps its nodes inside the body's group, so
 * it rides the body's hop, turn and squash and stays attached; a figure's
 * motion wraps everything the body group draws, inside the body's own
 * transform. A live scene plays them in CSS (`animate.ts`), so a frame
 * writes nothing for them; static output, reduced motion and a still
 * character draw the rest pose, which is the art as drawn.
 */
import type { FigureMotionRef, PartMotionRef, Point, ShapeDef } from '../../core/types.js';
import type { StateMood } from '../../motion/mood.js';
import type { CharacterState } from '../../motion/states.js';
import type { SceneNode } from '../../render/scene.js';
import type { PartFrame } from '../../sim/snapshot.js';
import { about, animatedAttrs, compile, type Compiled, type MotionEasing, type Stop } from './animate.js';
import type { DecorGlyph, DecorPaint } from './decor.js';
import { K } from './kit.js';

/**
 * How a swing moves over one period: back and forth either side of the rest
 * pose (`swing`), out to its amplitude and back (`bob`), out and back in the
 * first `duty` of the period and then still (`pulse`, `beats` times over for
 * a buzz), or from rest to its amplitude and round again (`loop`, a full
 * turn for a spinning blade).
 */
export type MotionWave = 'swing' | 'bob' | 'pulse' | 'loop';

/**
 * When a motion plays: in these moods (`moodOf`) or these states, and never
 * in those `except` names. Absent, it always plays.
 */
export interface MotionGate {
  moods?: readonly StateMood[];
  states?: readonly CharacterState[];
  except?: { moods?: readonly StateMood[]; states?: readonly CharacterState[] };
}

interface MotionBase {
  /** Seconds per period. */
  period: number;
  /** Where in its period it starts, 0 to 1. */
  phase?: number;
  easing?: MotionEasing;
  when?: MotionGate;
  /**
   * Where it turns and stretches when the art gives no pivot: a point of the
   * box round what moves (every part naming it, or the whole figure), as
   * shares of its width and height. Default `[0.5, 0.5]`, the middle.
   */
  origin?: readonly [number, number];
}

/** A turn, a move, a stretch or a fade, on one wave. */
export interface PartSwing extends MotionBase {
  kind: 'rotate' | 'translate' | 'scale' | 'blink';
  /**
   * How far it goes: degrees for `rotate`; `[dx, dy]` in the art's units
   * (its 100-unit box) for `translate`; how much it grows, as a share
   * (`0.1` is 10 %, `[x, y]` per axis) for `scale`; how much of its opacity
   * it loses, 0 to 1, for `blink`.
   */
  amplitude: number | readonly [number, number];
  /** Default `swing` for `rotate`, `bob` otherwise. */
  wave?: MotionWave;
  /** The share of the period a `pulse` moves in, 0 to 1. Default 0.3. */
  duty?: number;
  /** How many times a `pulse` goes out and back within its `duty`. Default 1. */
  beats?: number;
}

/**
 * One stop of a keyframed motion, `at` a share of the period: a move in the
 * art's units, a turn and a skew in degrees, a stretch, all about the pivot,
 * and an opacity. A stop that gives none of the four transforms leaves the
 * transform to the stops either side of it, as a CSS keyframe does.
 */
export interface MotionKey {
  at: number;
  translate?: readonly [number, number];
  rotate?: number;
  skew?: readonly [number, number];
  scale?: number | readonly [number, number];
  opacity?: number;
}

/** A motion written as keyframes: a tumbler's rock with a pause at each end, a hop and lean, a shake that dies away. */
export interface PartKeys extends MotionBase {
  kind: 'keys';
  keys: readonly MotionKey[];
}

/**
 * A stream that leaves the part (or the figure) and fades, such as bubbles
 * rising, snow falling or steam: `count` copies at even phases, each
 * travelling `travel` (art units) over a period from a point scattered
 * within `spread` (one width, or `[width, height]`, centred on `at` or the
 * pivot), turning `turn` degrees and growing from `from` to `grow` times its
 * size, fading in over the first `fade[0]` of the way and out over the last
 * `fade[1]`. Each copy's period differs from the next by up to `vary` of it.
 * A copy is the part itself, or `glyph` (one of the theme's decoration
 * glyphs, or one given here) `size` art units across in `paint`. `replace`
 * hides the part in a live scene, so only its copies are seen; static output
 * always draws the part and never a copy.
 */
export interface PartEmitter extends MotionBase {
  kind: 'emit';
  count: number;
  travel: readonly [number, number];
  spread?: number | readonly [number, number];
  at?: Point;
  turn?: number;
  from?: number;
  grow?: number;
  fade?: readonly [number, number];
  vary?: number;
  replace?: boolean;
  glyph?: string | DecorGlyph;
  size?: number;
  paint?: DecorPaint;
}

export type PartMotion = PartSwing | PartKeys | PartEmitter;

/** The motions a theme's shape may name, and the glyphs its emitters draw. */
export interface ShapeMotions {
  table: Readonly<Record<string, PartMotion>>;
  glyphs: Readonly<Record<string, DecorGlyph>>;
}

/**
 * Where a motion meets the figure, in shape space: the art's pivot if it
 * gives one, the box round what moves (every part naming the motion, or the
 * whole figure), and the art's units.
 */
interface MotionAnchor {
  readonly pivot?: Point;
  readonly box: readonly [number, number, number, number];
  readonly unit: number;
  readonly offset: Point;
}

function boxOf(outlines: readonly (readonly Point[])[]): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const outline of outlines) {
    for (const [x, y] of outline) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  return [x0, y0, x1, y1];
}

const anchors = new WeakMap<PartMotionRef | FigureMotionRef, MotionAnchor>();

/** A part's anchor: the box round every part of its shape naming the same motion (its own, from another shape). */
function partAnchor(shape: ShapeDef, part: PartFrame, ref: PartMotionRef): MotionAnchor {
  let anchor = anchors.get(ref);
  if (!anchor) {
    const same = shape.parts.filter((p) => p.motion?.id === ref.id).map((p) => p.outline);
    anchor = { ...ref, box: boxOf(same.length > 0 ? same : [part.outline]) };
    anchors.set(ref, anchor);
  }
  return anchor;
}

function figureAnchor(shape: ShapeDef, ref: FigureMotionRef): MotionAnchor {
  let anchor = anchors.get(ref);
  if (!anchor) {
    anchor = { ...ref, box: boxOf([shape.outline, ...shape.parts.map((p) => p.outline)]) };
    anchors.set(ref, anchor);
  }
  return anchor;
}

/** Whether a gated motion plays in this state. */
export function gateOpen(when: MotionGate | undefined, state: CharacterState, mood: StateMood): boolean {
  if (!when) return true;
  if (when.except?.states?.includes(state) || when.except?.moods?.includes(mood)) return false;
  if (!when.states && !when.moods) return true;
  return !!when.states?.includes(state) || !!when.moods?.includes(mood);
}

const n3 = (v: number): number => Math.round(v * 1000) / 1000;

/** Where a motion turns: the art's pivot, or its `origin` in the box of what moves. */
function pivotOf(anchor: MotionAnchor, motion: PartMotion): Point {
  if (anchor.pivot) return anchor.pivot;
  const [ox, oy] = motion.origin ?? [0.5, 0.5];
  const [x0, y0, x1, y1] = anchor.box;
  return [x0 + (x1 - x0) * ox, y0 + (y1 - y0) * oy];
}

/** A point of the art, in shape space. */
const inShape = (anchor: MotionAnchor, [x, y]: Point): Point => [
  anchor.offset[0] + x * anchor.unit,
  anchor.offset[1] + y * anchor.unit,
];

/** The wave's shape over a period, as (time, value) pairs; values run -1..1 for `swing`, 0..1 otherwise. */
function waveStops(wave: MotionWave, duty: number, beats: number, settleBack: number): [number, number][] {
  switch (wave) {
    case 'swing':
      return [
        [0, -1],
        [0.5, 1],
        [1, -1],
      ];
    case 'bob':
      return [
        [0, 0],
        [0.5, 1],
        [1, 0],
      ];
    case 'loop':
      return [
        [0, 0],
        [1, 1],
      ];
    case 'pulse': {
      const out: [number, number][] = [[0, 0]];
      const n = Math.max(1, Math.round(beats));
      for (let k = 1; k < n * 2; k++) out.push([(k * duty) / (n * 2), k % 2 === 1 ? 1 : settleBack]);
      out.push([duty, 0], [1, 0]);
      return out;
    }
  }
}

/**
 * Where a motion's numbers are written: shape space in an SVG's user units,
 * or a layer box's own shares (`%`) for a figure that a layered scene moves
 * as a whole box.
 */
interface Space {
  point: (p: Point) => Point;
  length: (d: number) => number;
  unit: 'px' | '%';
}

const SHAPE_SPACE: Space = { point: (p) => p, length: (d) => d, unit: 'px' };

/** The drawing box of a figure scaled `scale` about the centre, in shares of the box. */
function boxSpace(scale: number): Space {
  const { center, viewBox } = K;
  const share = 100 / viewBox.width;
  return {
    point: ([x, y]) => [
      (center + (x - center) * scale - viewBox.minX) * share,
      (center + (y - center) * scale - viewBox.minY) * share,
    ],
    length: (d) => d * scale * share,
    unit: '%',
  };
}

function swingStops(motion: PartSwing, anchor: MotionAnchor, space: Space): Stop[] {
  const wave = motion.wave ?? (motion.kind === 'rotate' ? 'swing' : 'bob');
  const [ax, ay] =
    typeof motion.amplitude === 'number' ? [motion.amplitude, motion.amplitude] : motion.amplitude;
  const [px, py] = space.point(pivotOf(anchor, motion));
  const { unit } = space;
  // A buzz swings past the rest pose a little on its way back; a move or a fade does not.
  const back = motion.kind === 'rotate' ? -0.2 : 0;
  return waveStops(wave, motion.duty ?? 0.3, motion.beats ?? 1, back).map(([at, v]): Stop => {
    switch (motion.kind) {
      case 'rotate':
        return { at, transform: about(px, py, `rotate(${n3(v * ax)}deg)`, unit) };
      case 'translate':
        return {
          at,
          transform: `translate(${n3(space.length(v * ax * anchor.unit))}${unit},${n3(space.length(v * ay * anchor.unit))}${unit})`,
        };
      case 'scale':
        return { at, transform: about(px, py, `scale(${n3(1 + v * ax)},${n3(1 + v * ay)})`, unit) };
      case 'blink': {
        const share = wave === 'swing' ? (v + 1) / 2 : v;
        return { at, opacity: Math.min(1, Math.max(0, 1 - share * ax)) };
      }
    }
  });
}

function keyStops(motion: PartKeys, anchor: MotionAnchor, space: Space): Stop[] {
  const [px, py] = space.point(pivotOf(anchor, motion));
  const { unit } = space;
  return motion.keys.map((key): Stop => {
    const moves =
      key.translate !== undefined ||
      key.rotate !== undefined ||
      key.skew !== undefined ||
      key.scale !== undefined;
    const [tx, ty] = key.translate ?? [0, 0];
    const [kx, ky] = key.skew ?? [0, 0];
    const [sx, sy] = typeof key.scale === 'number' ? [key.scale, key.scale] : (key.scale ?? [1, 1]);
    return {
      at: key.at,
      // Every stop writes the same list of functions, so any two of them interpolate term by term.
      transform: moves
        ? `translate(${n3(space.length(tx * anchor.unit))}${unit},${n3(space.length(ty * anchor.unit))}${unit}) ${about(
            px,
            py,
            `rotate(${n3(key.rotate ?? 0)}deg) skew(${n3(kx)}deg,${n3(ky)}deg) scale(${n3(sx)},${n3(sy)})`,
            unit,
          )}`
        : undefined,
      opacity: key.opacity,
    };
  });
}

/** One copy of an emitter: its keyframes, from where it starts to where it fades. */
function emitStops(motion: PartEmitter, origin: Point, start: Point, unit: number): Stop[] {
  const [sx, sy] = start;
  const tx = motion.travel[0] * unit;
  const ty = motion.travel[1] * unit;
  const from = motion.from ?? 1;
  const grow = motion.grow ?? 1;
  const turn = motion.turn ?? 0;
  const [fadeIn, fadeOut] = motion.fade ?? [0.15, 0.15];
  const at = (k: number, opacity: number): Stop => ({
    at: k,
    transform: `translate(${n3(sx + tx * k)}px,${n3(sy + ty * k)}px) ${about(
      origin[0],
      origin[1],
      `rotate(${n3(turn * k)}deg) scale(${n3(from + (grow - from) * k)})`,
    )}`,
    opacity,
  });
  return [at(0, 0), at(fadeIn, 1), at(1 - fadeOut, 1), at(1, 0)];
}

interface Plan {
  /** What wraps the nodes (a swing or keys, nested in order), or each copy (an emitter). */
  wraps: readonly Record<string, string>[];
  rules: readonly string[];
  /** Whether the part itself is drawn as well as its copies. */
  keep: boolean;
  /** An emitter's glyph and where each copy of it starts, or `null` for copies of the part. */
  glyph: { glyph: DecorGlyph; at: Point; size: number; paint: DecorPaint } | null;
}

const plans = new WeakMap<MotionAnchor, Map<PartMotion, Map<string, Plan>>>();

/**
 * How `motion` plays at `anchor`, `shift` into its period: in shape space,
 * or, with `boxScale`, in the shares of a layer box that holds a figure
 * drawn at that scale.
 */
function planFor(
  shape: string,
  motion: PartMotion,
  anchor: MotionAnchor,
  seed: string,
  shift: number,
  glyphs: ShapeMotions['glyphs'],
  boxScale?: number,
): Plan {
  let byMotion = plans.get(anchor);
  if (!byMotion) plans.set(anchor, (byMotion = new Map()));
  let byShift = byMotion.get(motion);
  if (!byShift) byMotion.set(motion, (byShift = new Map()));
  const key = boxScale === undefined ? `${shift}` : `${shift}|${boxScale}`;
  let plan = byShift.get(key);
  if (plan) return plan;
  const space = boxScale === undefined ? SHAPE_SPACE : boxSpace(boxScale);
  const phase = (motion.phase ?? 0) + shift;
  let animations: Compiled[];
  let glyph: Plan['glyph'] = null;
  if (motion.kind === 'emit') {
    const rand = K.random(K.hash(`${shape}:${seed}`));
    const count = Math.max(1, Math.round(motion.count));
    const [w, h] = typeof motion.spread === 'number' ? [motion.spread, 0] : (motion.spread ?? [0, 0]);
    const origin = motion.at ? inShape(anchor, motion.at) : pivotOf(anchor, motion);
    const named = typeof motion.glyph === 'string' ? glyphs[motion.glyph] : motion.glyph;
    if (named)
      glyph = {
        glyph: named,
        at: origin,
        size: (motion.size ?? 8) * anchor.unit,
        paint: motion.paint ?? 'ink',
      };
    animations = Array.from({ length: count }, (_, k) => {
      const start: Point = [(rand() - 0.5) * w * anchor.unit, (rand() - 0.5) * h * anchor.unit];
      const period = motion.period * (1 + (rand() - 0.5) * (motion.vary ?? 0));
      return compile(
        emitStops(motion, origin, start, anchor.unit),
        period,
        phase + k / count,
        motion.easing ?? 'linear',
      );
    });
  } else {
    const stops =
      motion.kind === 'keys' ? keyStops(motion, anchor, space) : swingStops(motion, anchor, space);
    animations = [compile(stops, motion.period, phase, motion.easing ?? 'sine')];
  }
  plan = {
    wraps: animations.map(animatedAttrs),
    rules: animations.map((a) => a.rule),
    keep: motion.kind !== 'emit' || motion.replace !== true,
    glyph,
  };
  byShift.set(key, plan);
  return plan;
}

/** What a scene knows when it moves a part or a figure. */
export interface MotionScene {
  /** A live scene plays motions; a static one draws the rest pose. */
  live: boolean;
  /** Reduced motion or a still character: the rest pose. */
  settled: boolean;
  state: CharacterState;
  mood: StateMood;
  /** The keyframes rules this frame plays, collected for the scene's `<style>`. */
  rules: Set<string>;
  /** An emitted glyph's colour as CSS (`decorColor`). */
  color: (paint: DecorPaint) => string;
  /** How far into its period this character starts every motion, 0 to 1: two of one shape do not move in step. */
  shift: number;
}

const f2 = (v: number): number => Math.round(v * 100) / 100;

/** A glyph copy's nodes, centred on where the stream starts. */
function glyphNodes(plan: NonNullable<Plan['glyph']>, scene: MotionScene): SceneNode[] {
  const box = plan.glyph.box ?? 24;
  const k = plan.size / box;
  const { node } = K;
  return [
    node(
      'g',
      {
        transform: `translate(${f2(plan.at[0])} ${f2(plan.at[1])}) scale(${f2(k)}) translate(${-box / 2} ${-box / 2})`,
      },
      plan.glyph.layers.map((layer) => {
        const paint = scene.color(layer.paint ?? plan.paint);
        return node(
          'path',
          layer.stroke
            ? {
                d: layer.d,
                stroke: paint,
                'stroke-width': layer.stroke,
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                opacity: layer.opacity,
              }
            : { d: layer.d, fill: paint, opacity: layer.opacity },
        );
      }),
    ),
  ];
}

/** `nodes` as `ids` of the shape's `motions` move them. */
function play(
  shape: ShapeDef,
  motions: ShapeMotions,
  ids: readonly string[],
  anchor: MotionAnchor,
  nodes: SceneNode[],
  scene: MotionScene,
  whole = false,
): SceneNode[] {
  const { node } = K;
  let out = nodes;
  const streams: SceneNode[] = [];
  let keep = true;
  for (const id of ids) {
    const motion = motions.table[id];
    if (!motion || !gateOpen(motion.when, scene.state, scene.mood)) continue;
    const plan = planFor(shape.id, motion, anchor, id, scene.shift, motions.glyphs);
    for (const rule of plan.rules) scene.rules.add(rule);
    if (motion.kind !== 'emit') {
      out = [node('g', plan.wraps[0], out)];
      continue;
    }
    // A whole figure streams glyphs only, and never hides itself for them.
    if (whole && !plan.glyph) continue;
    const copy = plan.glyph ? glyphNodes(plan.glyph, scene) : nodes;
    for (const attrs of plan.wraps) streams.push(node('g', attrs, copy));
    keep &&= whole || plan.keep;
  }
  if (streams.length === 0) return out;
  return keep ? [...out, ...streams] : streams;
}

/**
 * A part's nodes as they move in this frame: wrapped in its motion's
 * animated group, or with an emitter's stream beside them, or as they are
 * when the part has no motion, the motion is gated off, or the scene draws
 * the rest pose.
 */
export function moved(
  shape: ShapeDef,
  motions: ShapeMotions | undefined,
  part: PartFrame,
  nodes: SceneNode[],
  scene: MotionScene,
): SceneNode[] {
  const ref = part.motion;
  if (!ref || !motions || !scene.live || scene.settled || nodes.length === 0) return nodes;
  return play(shape, motions, [ref.id], partAnchor(shape, part, ref), nodes, scene);
}

const boxAnchors = new WeakMap<ShapeDef, MotionAnchor>();

/**
 * Nodes a skin draws (its underlay) as the motion `id` moves them, about
 * the box round the whole figure and in its art's units, but never about
 * the figure's own pivot.
 */
export function movedBy(
  shape: ShapeDef,
  motions: ShapeMotions | undefined,
  id: string,
  nodes: SceneNode[],
  scene: MotionScene,
): SceneNode[] {
  if (!motions?.table[id] || !scene.live || scene.settled || nodes.length === 0) return nodes;
  let anchor = boxAnchors.get(shape);
  if (!anchor) {
    anchor = {
      box: boxOf([shape.outline, ...shape.parts.map((p) => p.outline)]),
      unit: shape.motion?.unit ?? 1,
      offset: shape.motion?.offset ?? [0, 0],
    };
    boxAnchors.set(shape, anchor);
  }
  return play(shape, motions, [id], anchor, nodes, scene);
}

/** Everything a figure's body group draws, as the figure's own motions move it this frame. */
export function movedFigure(
  shape: ShapeDef,
  motions: ShapeMotions | undefined,
  nodes: SceneNode[],
  scene: MotionScene,
): SceneNode[] {
  const ref = shape.motion;
  if (!ref || !motions || !scene.live || scene.settled) return nodes;
  return play(shape, motions, ref.ids, figureAnchor(shape, ref), nodes, scene, true);
}

const streamsKept = new WeakMap<Plan, { colors: string; nodes: SceneNode[] }>();

/** An emitter's copies of its glyph, the same nodes while their colours stay. */
function streamOf(plan: Plan, scene: MotionScene): SceneNode[] {
  const glyph = plan.glyph!;
  const colors = glyph.glyph.layers.map((layer) => scene.color(layer.paint ?? glyph.paint)).join('|');
  const kept = streamsKept.get(plan);
  if (kept?.colors === colors) return kept.nodes;
  const copy = glyphNodes(glyph, scene);
  const nodes = plan.wraps.map((attrs) => K.node('g', attrs, copy));
  streamsKept.set(plan, { colors, nodes });
  return nodes;
}

interface FigureBox {
  wraps: readonly { class: string; style: string }[];
  streams: SceneNode[];
}

const NO_BOX: FigureBox = { wraps: [], streams: [] };

/**
 * A figure's own motions as a layered scene plays them on the boxes that
 * hold its layers, drawn at `scale`: one inline style per box, outermost
 * first, and the glyphs its emitters stream.
 */
export function movedFigureBox(
  shape: ShapeDef,
  motions: ShapeMotions | undefined,
  scale: number,
  scene: MotionScene,
): FigureBox {
  const ref = shape.motion;
  if (!ref || !motions || !scene.live || scene.settled) return NO_BOX;
  const anchor = figureAnchor(shape, ref);
  const wraps: { class: string; style: string }[] = [];
  const streams: SceneNode[] = [];
  for (const id of ref.ids) {
    const motion = motions.table[id];
    if (!motion || !gateOpen(motion.when, scene.state, scene.mood)) continue;
    const box = motion.kind === 'emit' ? undefined : scale;
    const plan = planFor(shape.id, motion, anchor, id, scene.shift, motions.glyphs, box);
    for (const rule of plan.rules) scene.rules.add(rule);
    if (motion.kind !== 'emit') {
      wraps.push(plan.wraps[0] as { class: string; style: string });
      continue;
    }
    if (!plan.glyph) continue;
    streams.push(...streamOf(plan, scene));
  }
  // The first motion named wraps innermost in a single scene, so it is the last box here.
  wraps.reverse();
  return wraps.length === 0 && streams.length === 0 ? NO_BOX : { wraps, streams };
}
