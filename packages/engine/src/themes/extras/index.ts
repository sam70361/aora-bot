/**
 * A theme's extras: mood decorations, signature motions, the vivid mood
 * accent and the effect anchor (`@aora-bot/engine/themes/extras`).
 *
 * Only themes use them, so they are not in the core. A theme's entry
 * imports `EXTRAS` and hands it over as `ThemePackage.extras`; the first
 * theme installed into a copy of the core builds it there, and every theme
 * after registers its data with it. It imports nothing of the core at run
 * time: the core lends it its helpers (`ExtrasKit`).
 */
import type { ShapeDef } from '../../core/types.js';
import type { SceneNode } from '../../render/scene.js';
import type { FrameSnapshot } from '../../sim/snapshot.js';
import type { ExtrasPaints, ExtrasScene, ThemeExtras, ThemeExtrasFactory } from '../extras-hook.js';
import { BASE_RULES, styleNode } from './animate.js';
import {
  decorColor,
  decorFade,
  decorNodes,
  decorSetKey,
  decorShown,
  type DecorPaints,
  type DecorSpec,
} from './decor.js';
import { faceInk } from './colour.js';
import { asLaid, fxPlacement, placerOf } from './fx-anchor.js';
import { K, useKit } from './kit.js';
import { leanInto, type MoodAccent } from './lean.js';
import { createStage, shareRules } from './stage.js';
import {
  moved,
  movedBy,
  movedFigure,
  movedFigureBox,
  type MotionScene,
  type PartMotion,
  type ShapeMotions,
} from './motion.js';

export type {
  DecorAnimation,
  DecorGlyph,
  DecorItem,
  DecorLayer,
  DecorPaint,
  DecorSpec,
  DecorTone,
  DecorZone,
} from './decor.js';
export { DECOR_MIN_PX } from './decor.js';
export type { MotionEasing } from './animate.js';
export type { LightnessBand, MoodAccent, MoodLean } from './lean.js';
export type { FaceInk } from './colour.js';
export type {
  MotionGate,
  MotionKey,
  MotionWave,
  PartEmitter,
  PartKeys,
  PartMotion,
  PartSwing,
} from './motion.js';

/** What a copy of the extras knows of the installed themes. */
interface Registry {
  /** The decorations each skin draws. */
  decors: Map<string, DecorSpec>;
  /** How vivid each skin's mood accent is, for the decorations' `accent` tone. */
  vivid: Map<string, MoodAccent | undefined>;
  /** The motions each theme shape may name. */
  motions: Map<string, ShapeMotions>;
  /** Every shape a theme draws: the ones whose effects are anchored to their outline. */
  shapes: Set<string>;
}

interface Theme {
  definition: { id: string };
  art: Readonly<Record<string, unknown>>;
  variants: readonly { variant: string; decor?: unknown; medium?: { moodAccent?: MoodAccent } }[];
  decor?: unknown;
  motions?: unknown;
}

type ArtLike = {
  motion?: string | readonly string[];
  props?: readonly { motion?: string }[];
  parts?: readonly { motion?: string }[];
};

/** Refuse decorations that name a glyph they do not have, and art that names a motion the theme does not declare. */
function check(theme: Theme): void {
  const id = theme.definition.id;
  const decor = theme.decor as DecorSpec | undefined;
  const motions = theme.motions as Readonly<Record<string, PartMotion>> | undefined;
  for (const spec of [decor, ...theme.variants.map((skin) => skin.decor as DecorSpec | null | undefined)]) {
    if (!spec) continue;
    const sets = [...Object.values(spec.moods ?? {}), ...Object.values(spec.states ?? {}), spec.always ?? []];
    const missing = sets.flat().find((item) => item && !spec.glyphs[item.glyph]);
    if (missing)
      throw new Error(
        `Theme "${id}": a decoration names the glyph "${missing.glyph}", which it does not draw`,
      );
  }
  for (const [shape, entry] of Object.entries(theme.art)) {
    const art = entry as ArtLike;
    const named = [
      ...(art.props ?? art.parts ?? []).flatMap((part) => (part.motion ? [part.motion] : [])),
      ...(typeof art.motion === 'string' ? [art.motion] : (art.motion ?? [])),
    ];
    const unknown = named.find((motion) => !motions?.[motion]);
    if (unknown)
      throw new Error(
        `Theme "${id}": ${shape} names the motion "${unknown}", which the theme does not declare`,
      );
  }
  for (const [name, motion] of Object.entries(motions ?? {})) {
    if (motion.kind === 'emit' && typeof motion.glyph === 'string' && !decor?.glyphs[motion.glyph])
      throw new Error(
        `Theme "${id}": the motion "${name}" emits the glyph "${motion.glyph}", which its decor does not draw`,
      );
  }
}

/** A live scene's decoration layer while it has none to show. */
let emptyLayer: SceneNode | null = null;
const NO_NODES: SceneNode[] = [];
const NO_RULES: readonly string[] = [];

function createScene(live: boolean, phaseSeed: string | undefined, registry: Registry): ExtrasScene {
  const rules = new Set<string>();
  let frame: FrameSnapshot;
  let shape: ShapeDef;
  let paints: () => ExtrasPaints;
  let spec: DecorSpec | undefined;
  let setKey: string | null = null;
  let moving = false;
  let framePaints: DecorPaints | null = null;
  let styled = false;
  const decorPaints = (): DecorPaints =>
    (framePaints ??= { ...paints(), vivid: registry.vivid.get(frame.variant) });
  const motion: MotionScene = {
    live,
    settled: false,
    state: 'idle',
    mood: 'calm',
    rules,
    color: (paint) => decorColor(paint, decorPaints(), motion.mood),
    // In twentieths, so the keyframes a page compiles stay few.
    shift: phaseSeed ? (K.hash(phaseSeed) % 20) / 20 : 0,
  };

  /*
   * A live scene's decorations sit in two slots, so a change of set fades the
   * new one in over the old one as both stay where they are in the DOM. The
   * one being left is emptied once it has faded.
   */
  const slots: [string | null, string | null] = [null, null];
  let showing = 0;
  let changedAt = 0;
  const cache = new Map<string, { nodes: SceneNode[]; rules: string[] }>();
  /** The set a live scene wants, and what its key was worked out from, so a steady frame builds no string. */
  const wanted = {
    key: null as string | null,
    set: null as string | null,
    variant: '',
    shape: '',
    ink: null as unknown,
    moving: false,
  };
  /** The live layer last handed over, and what it was built from. */
  const layer = {
    node: null as SceneNode | null,
    showing: 0,
    a: null as string | null,
    b: null as string | null,
    opacity: 1,
  };

  /** A set's nodes, built once per key and kept; the rules they play are counted into this frame's. */
  const nodesFor = (key: string | null): SceneNode[] => {
    if (key === null || !spec) return NO_NODES;
    let entry = cache.get(key);
    if (!entry) {
      const played = new Set<string>();
      const setId = key.slice(key.lastIndexOf('|') + 1);
      const nodes = decorNodes(
        spec,
        setId,
        shape,
        frame.shapeScale,
        decorPaints(),
        moving,
        played,
        motion.shift,
      );
      if (cache.size > 24) cache.clear();
      entry = { nodes, rules: [...played] };
      cache.set(key, entry);
    }
    for (const rule of entry.rules) rules.add(rule);
    return entry.nodes;
  };

  return {
    begin(next, nextShape, nextPaints, sizePx) {
      rules.clear();
      frame = next;
      shape = nextShape;
      paints = nextPaints;
      framePaints = null;
      motion.state = next.state;
      motion.mood = K.moodOf(next.state);
      motion.settled = next.settled === true;
      moving = live && !next.settled;
      spec = registry.decors.get(next.variant);
      setKey = spec && decorShown(spec, sizePx) ? decorSetKey(spec, next.state) : null;
    },

    part: (part, nodes) => moved(shape, registry.motions.get(shape.id), part, nodes, motion),

    play: (id, nodes) => movedBy(shape, registry.motions.get(shape.id), id, nodes, motion),

    figure: (nodes) => movedFigure(shape, registry.motions.get(shape.id), nodes, motion),

    figureBox: () => movedFigureBox(shape, registry.motions.get(shape.id), frame.shapeScale, motion),

    get quiet() {
      return setKey !== null && spec?.fx === 'replace';
    },

    decor() {
      const { node } = K;
      if (!live && setKey === null) return null;
      // A live scene with nothing to show and nothing fading keeps only the empty layer.
      if (live && setKey === null && slots[0] === null && slots[1] === null)
        return (emptyLayer ??= node('g', { 'data-aora-decor': '' }, []));
      // The decorations fade with the body as a belt or a dial takes it over.
      const fade = (1 - (frame.belt?.blend ?? 0)) * (1 - frame.hud.opacity);
      const alpha = Math.round(fade * 100) / 100;
      if (!live)
        return node(
          'g',
          { 'data-aora-decor': '', opacity: fade < 0.999 ? alpha : undefined },
          nodesFor(setKey),
        );

      // What a set's nodes depend on besides the set itself, so a new ink or a new shape builds them again.
      if (
        wanted.set !== setKey ||
        wanted.variant !== frame.variant ||
        wanted.shape !== frame.shape ||
        wanted.ink !== frame.ink ||
        wanted.moving !== moving
      ) {
        const own = frame.ink;
        const inkKey = own ? ('flat' in own ? own.flat : `${own.from}>${own.to}`) : '';
        wanted.key =
          spec && setKey !== null
            ? `${frame.variant}|${frame.shape}|${inkKey}|${moving ? 1 : 0}|${setKey}`
            : null;
        Object.assign(wanted, {
          set: setKey,
          variant: frame.variant,
          shape: frame.shape,
          ink: frame.ink,
          moving,
        });
      }
      const want = wanted.key;
      if (want !== slots[showing]) {
        if (slots[showing] !== null) {
          showing = 1 - showing;
          changedAt = frame.time;
        }
        slots[showing] = want;
      }
      const other = 1 - showing;
      if (slots[other] !== null && frame.time - changedAt > K.moodEaseMs / 1000 + 0.05) slots[other] = null;
      // A frame like the last hands over the same nodes, so it allocates nothing; their rules still count.
      if (
        layer.node &&
        layer.showing === showing &&
        layer.a === slots[0] &&
        layer.b === slots[1] &&
        layer.opacity === alpha
      ) {
        nodesFor(slots[0]);
        nodesFor(slots[1]);
        return layer.node;
      }
      const fadeStyle = decorFade();
      layer.node = node('g', { 'data-aora-decor': '', opacity: alpha, style: 'pointer-events:none' }, [
        node('g', { opacity: showing === 0 ? 1 : 0, style: fadeStyle }, nodesFor(slots[0])),
        node('g', { opacity: showing === 1 ? 1 : 0, style: fadeStyle }, nodesFor(slots[1])),
      ]);
      Object.assign(layer, { showing, a: slots[0], b: slots[1], opacity: alpha });
      return layer.node;
    },

    style() {
      // Once a live scene has had one it keeps it, so the DOM keeps its shape.
      if (!live || (rules.size === 0 && !styled)) return null;
      styled = true;
      return styleNode(rules) ?? K.node('style', undefined, undefined, { text: '' });
    },

    rules() {
      if (!live || rules.size === 0) return NO_RULES;
      return [...BASE_RULES, ...rules];
    },
  };
}

function createExtras(): ThemeExtras {
  const registry: Registry = { decors: new Map(), vivid: new Map(), motions: new Map(), shapes: new Set() };
  return {
    register(given) {
      const theme = given as Theme;
      check(theme);
      const decor = theme.decor as DecorSpec | undefined;
      for (const skin of theme.variants) {
        const spec = (skin.decor === undefined ? decor : skin.decor) as DecorSpec | null | undefined;
        if (spec) registry.decors.set(skin.variant, spec);
        else registry.decors.delete(skin.variant);
        registry.vivid.set(skin.variant, skin.medium?.moodAccent);
      }
      const table = theme.motions as Readonly<Record<string, PartMotion>> | undefined;
      for (const shape of Object.keys(theme.art)) {
        registry.shapes.add(shape);
        if (table) registry.motions.set(shape, { table, glyphs: decor?.glyphs ?? {} });
      }
    },
    scene: (live, phaseSeed) => createScene(live, phaseSeed, registry),
    decorates: (variant) => registry.decors.has(variant),
    bleeds: (variant) => (registry.decors.get(variant)?.reach ?? 0) > 0,
    lean: leanInto,
    placeFx(shape, kind, scale) {
      if (!registry.shapes.has(shape.id)) return null;
      const placement = fxPlacement(shape, kind, scale);
      return asLaid(placement) ? null : placerOf(placement);
    },
    faceInk,
    stage: createStage,
    share: shareRules,
  };
}

/** The extras, for `ThemePackage.extras`. */
export const EXTRAS: ThemeExtrasFactory = (kit) => {
  useKit(kit);
  return createExtras();
};
