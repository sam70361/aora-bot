/**
 * Mood decorations: small doodles round a figure that change with the
 * state's mood, such as sparkles when it is happy, a moon when it sleeps,
 * swirls while it thinks or anger marks when it is cross.
 *
 * A theme declares them as data (`DecorSpec`, on its package or one of its
 * skins): glyph paths, colour rules over the ink and the page, and per mood
 * (or per state) which glyphs go where and how they move. The core ships no
 * glyph of its own. Each one is placed against the figure's outline, its
 * body and every part, so it keeps clear of the face and of the props, and
 * inside the box the character is drawn in. A placement is worked out once
 * per shape and set and kept, so a live scene hands the same nodes over
 * every frame and their motion runs in CSS (`animate.ts`). Static output,
 * reduced motion and a still character draw the rest pose; a character
 * shown smaller than the set's `minPx` draws none. A change of mood
 * cross-fades the two sets over the accent's 480 ms.
 */
import type { ColorId, ShapeDef } from '../../core/types.js';
import type { StateMood } from '../../motion/mood.js';
import type { CharacterState } from '../../motion/states.js';
import type { SceneNode } from '../../render/scene.js';
import type { ExtrasPaints } from '../extras-hook.js';
import { animatedAttrs, compile, type MotionEasing, type Stop } from './animate.js';
import { figureOf, fxFootprint, type Footprint } from './fx-anchor.js';
import { K } from './kit.js';
import { leanInto, type MoodAccent } from './lean.js';
import { clearance } from './silhouette.js';

/**
 * The colours a decoration takes from the character and the page: the ink,
 * the mood accent (the ink leaned into the mood, as vivid as the skin's
 * `moodAccent` makes it), the colour state effects are drawn in, the page,
 * and the page's contrast (black on a light page, white on a dark one).
 */
export type DecorTone = 'ink' | 'accent' | 'fx' | 'page' | 'contrast';

/**
 * A decoration's colour. A tone, a palette colour (which turns with the
 * page as a body of that colour does), or either of those turned round the
 * hue wheel by `hue` degrees, mixed `share` percent with another, held at
 * least `chroma` and within a `lightness` band (OKLCH, 0 to 1).
 */
export type DecorPaint =
  | DecorTone
  | { color: ColorId }
  | {
      from: DecorTone | { color: ColorId };
      hue?: number;
      chroma?: number;
      lightness?: readonly [number, number];
      mix?: { with: DecorTone | { color: ColorId }; share: number };
    };

/** One path of a glyph, filled, or stroked `stroke` units wide (in the glyph's box), in its own colour or the item's. */
export interface DecorLayer {
  d: string;
  stroke?: number;
  paint?: DecorPaint;
  opacity?: number;
}

/** A glyph drawn in a `box`-unit square (24 by default) with its origin at the top left, as an icon is. */
export interface DecorGlyph {
  box?: number;
  layers: readonly DecorLayer[];
}

/** Where round the figure a decoration goes: a side or a corner, the upper or lower half, or anywhere. */
export type DecorZone =
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left'
  | 'top-left'
  | 'upper'
  | 'lower'
  | 'around';

/** The zones as ranges of direction from the figure's centre, in degrees clockwise from twelve o'clock. */
const ZONES: Record<DecorZone, readonly [number, number]> = {
  top: [-28, 28],
  'top-right': [22, 72],
  right: [62, 118],
  'bottom-right': [108, 158],
  bottom: [152, 208],
  'bottom-left': [202, 252],
  left: [242, 298],
  'top-left': [288, 338],
  upper: [-80, 80],
  lower: [100, 260],
  around: [0, 360],
};

/**
 * How a decoration moves, with the lab's names beside the short ones:
 * bobbing up and back (`drift`, or `float`), swelling and dimming
 * (`twinkle`), floating up and fading (`rise`), a beat of growth (`pop`, or
 * `throb`), turning round (`spin`), rocking either side (`sway`, or
 * `wiggle`), a bob with a tilt (`bob`), or a shrink and dim like a flicker
 * (`flick`). `amplitude` is in shape units for the moves (a share of the
 * size by default), degrees for the turns and a share for the swells.
 */
export interface DecorAnimation {
  kind:
    'drift' | 'float' | 'twinkle' | 'rise' | 'pop' | 'throb' | 'spin' | 'sway' | 'wiggle' | 'bob' | 'flick';
  /** Seconds per period; the lab's own by default. */
  period?: number;
  amplitude?: number;
  easing?: MotionEasing;
}

/** One kind of decoration in a set. */
export interface DecorItem {
  /** A glyph of the spec's `glyphs`. */
  glyph: string;
  paint: DecorPaint;
  /** Across, in shape units (the figure is `SHAPE_SPACE` across). */
  size: number;
  zone: DecorZone;
  /** How many of it, spread over the zone. Default 1. */
  count?: number;
  /** Its turn, in degrees; each copy turns a seeded few degrees either way of it (`jitter`, default 8). */
  turn?: number;
  jitter?: number;
  animation?: DecorAnimation;
}

/**
 * A theme's (or a skin's) mood decorations: its glyphs, and the items each
 * mood shows (`moodOf`), or each state where it wants one of its own (a
 * state's entry wins over its mood's); `always` items join every set, and
 * show on their own where a state has none. `minPx` hides them on a
 * character shown narrower (default 64), `gap` is how far they keep from the
 * figure (shape units, default 6). Engine effects (the Zz, the sparkles)
 * stay and the decorations keep clear of them, unless `fx` is `replace`,
 * which leaves the scene's effects out wherever a set is showing.
 */
export interface DecorSpec {
  glyphs: Readonly<Record<string, DecorGlyph>>;
  moods?: Partial<Record<StateMood, readonly DecorItem[]>>;
  states?: Partial<Record<CharacterState, readonly DecorItem[]>>;
  always?: readonly DecorItem[];
  /**
   * How far past the box the character is drawn in a copy may go, as a share
   * of the box (the lab's cards: about 0.12). Default 0. A live scene shows
   * them (its SVG overflows); a static document clips at its box unless the
   * page shows it with `overflow: visible`.
   */
  reach?: number;
  minPx?: number;
  gap?: number;
  fx?: 'avoid' | 'replace';
}

/** The default width, in CSS pixels, below which a set is not drawn. */
export const DECOR_MIN_PX = 64;
const DEFAULT_GAP = 6;

/** Which of a spec's sets a state shows, as a key, or `null` when it shows none. */
export function decorSetKey(spec: DecorSpec, state: CharacterState): string | null {
  if (spec.states?.[state]) return `s:${state}`;
  const mood = K.moodOf(state);
  return spec.moods?.[mood] || spec.always?.length ? `m:${mood}` : null;
}

const itemsOf = (spec: DecorSpec, key: string): readonly DecorItem[] => [
  ...((key.startsWith('s:')
    ? spec.states?.[key.slice(2) as CharacterState]
    : spec.moods?.[key.slice(2) as StateMood]) ?? []),
  ...(spec.always ?? []),
];

/** The mood a set's colours lean into. */
const moodOfKey = (key: string): StateMood =>
  key.startsWith('s:') ? K.moodOf(key.slice(2) as CharacterState) : (key.slice(2) as StateMood);

/** The states a set shows for, whose effects it keeps clear of. */
function statesOfKey(spec: DecorSpec, key: string): CharacterState[] {
  if (key.startsWith('s:')) return [key.slice(2) as CharacterState];
  const mood = key.slice(2) as StateMood;
  return K.states.filter((state) => K.moodOf(state) === mood && !spec.states?.[state]);
}

// ---------------------------------------------------------------- placement

/** One decoration where it goes: its centre, size and turn in shape units, and where in its motion it starts. */
export interface PlacedDecor {
  item: DecorItem;
  x: number;
  y: number;
  size: number;
  turn: number;
  phase: number;
}

const placements = new WeakMap<DecorSpec, WeakMap<ShapeDef, Map<string, PlacedDecor[]>>>();

const RAY_STEP = 2;

/**
 * Where a set's decorations go on a shape drawn at `scale`: each copy on a
 * ray from the figure's centre within its zone, at the first point that is
 * `gap` clear of the figure, clear of the face box, clear of the copies
 * already placed and of the effects the set's states throw, and inside the
 * box. A copy that finds no room on its ray tries the rays either side of
 * it in its zone, then again at three quarters of its size, and is left out
 * if there is still none. Deterministic: the same shape and set always
 * place the same way.
 */
export function placeDecor(spec: DecorSpec, key: string, shape: ShapeDef, scale: number): PlacedDecor[] {
  let byShape = placements.get(spec);
  if (!byShape) placements.set(spec, (byShape = new WeakMap()));
  let byKey = byShape.get(shape);
  if (!byKey) byShape.set(shape, (byKey = new Map()));
  const known = byKey.get(key);
  if (known) return known;

  const figure = figureOf(shape);
  const gap = spec.gap ?? DEFAULT_GAP;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [bx0, by0, bx1, by1] of figure.boxes) {
    x0 = Math.min(x0, bx0);
    y0 = Math.min(y0, by0);
    x1 = Math.max(x1, bx1);
    y1 = Math.max(y1, by1);
  }
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const { center, viewBox, stateFx } = K;
  const inBox = (b: number) => center + (b - center) / scale;
  /** The box a copy must stay in, grown by `past` shape units on every side. */
  const boxOf = (past: number) => ({
    left: inBox(viewBox.minX - past),
    top: inBox(viewBox.minY - past),
    right: inBox(viewBox.minX + viewBox.width + past),
    bottom: inBox(viewBox.minY + viewBox.height + past),
  });
  // Inside the box first; past it, as far as the spec reaches, before a copy shrinks.
  const boxes = spec.reach ? [boxOf(0), boxOf(spec.reach * viewBox.width)] : [boxOf(0)];
  let { left, top, right, bottom } = boxes[0]!;
  const face = shape.face;
  const taken: Footprint[] =
    spec.fx === 'replace'
      ? []
      : [
          ...new Set(statesOfKey(spec, key).flatMap((state) => (stateFx[state] ? [stateFx[state]!] : []))),
        ].flatMap((kind) => fxFootprint(shape, kind, scale));

  const fits = (x: number, y: number, r: number): boolean => {
    if (x - r < left || x + r > right || y - r < top || y + r > bottom) return false;
    const fx = (x - face.x) / (face.sx + r + gap);
    const fy = (y - face.y) / (face.sy + r + gap);
    if (fx * fx + fy * fy < 1) return false;
    for (const [tx, ty, tr] of taken) {
      if (Math.hypot(x - tx, y - ty) < r + tr + 2) return false;
    }
    return clearance(figure, x, y, gap + r + 1) >= gap + r;
  };

  /** The first point along a ray, outwards from the centre, where a copy of radius `r` fits. */
  const along = (deg: number, r: number): [number, number] | null => {
    const a = (deg * Math.PI) / 180;
    const ux = Math.sin(a);
    const uy = -Math.cos(a);
    for (let d = 0; d < 400; d += RAY_STEP) {
      const x = cx + ux * d;
      const y = cy + uy * d;
      if (x < left - r || x > right + r || y < top - r || y > bottom + r) return null;
      if (fits(x, y, r)) return [x, y];
    }
    return null;
  };

  const out: PlacedDecor[] = [];
  itemsOf(spec, key).forEach((item, index) => {
    const [a0, a1] = ZONES[item.zone];
    const count = Math.max(1, Math.round(item.count ?? 1));
    for (let k = 0; k < count; k++) {
      const rand = K.random(K.hash(`${shape.id}:${key}:${index}:${k}`));
      const aim = a0 + ((a1 - a0) * (k + 0.5 + (rand() - 0.5) * 0.5)) / count;
      const turn = (item.turn ?? 0) + (rand() - 0.5) * 2 * (item.jitter ?? 8);
      const phase = rand();
      let spot: [number, number] | null = null;
      let size = item.size;
      for (const shrink of [1, 0.75]) {
        size = item.size * shrink;
        const r = size / 2;
        for (const box of boxes) {
          ({ left, top, right, bottom } = box);
          for (let step = 0; !spot && step <= 12; step++) {
            const off = (step % 2 === 1 ? 1 : -1) * Math.ceil(step / 2) * 6;
            const deg = aim + off;
            if (step > 0 && (deg < a0 || deg > a1)) continue;
            spot = along(deg, r);
          }
          if (spot) break;
        }
        if (spot) break;
      }
      if (!spot) continue;
      out.push({ item, x: spot[0], y: spot[1], size, turn, phase });
      taken.push([spot[0], spot[1], size / 2]);
    }
  });
  byKey.set(key, out);
  return out;
}

// ------------------------------------------------------------------ drawing

/** The colours a scene resolves a decoration's tones to, and how vivid the skin's mood accent is. */
export interface DecorPaints extends ExtrasPaints {
  vivid: MoodAccent | undefined;
}

const n2 = (v: number): number => Math.round(v * 100) / 100;

function toneOf(tone: DecorTone | { color: ColorId }, paints: DecorPaints, mood: StateMood): string {
  if (typeof tone === 'object') return paints.partColor(tone.color).fill;
  switch (tone) {
    case 'ink':
      return paints.ink;
    case 'accent':
      return leanInto(paints.ink, mood, paints.vivid);
    case 'fx':
      return paints.fx;
    case 'page':
      return paints.page;
    case 'contrast':
      return paints.contrast;
  }
}

/** A decoration's colour as CSS: every one an expression of the ink, the page or a palette colour. */
export function decorColor(paint: DecorPaint, paints: DecorPaints, mood: StateMood): string {
  if (typeof paint === 'string' || 'color' in paint) return toneOf(paint, paints, mood);
  let base = toneOf(paint.from, paints, mood);
  if (paint.mix) {
    base = `color-mix(in oklab, ${base}, ${toneOf(paint.mix.with, paints, mood)} ${n2(paint.mix.share)}%)`;
  }
  if (paint.hue === undefined && paint.chroma === undefined && paint.lightness === undefined) return base;
  const l = paint.lightness ? `clamp(${paint.lightness[0]}, l, ${paint.lightness[1]})` : 'l';
  const c = paint.chroma === undefined ? 'c' : `max(c, ${paint.chroma})`;
  const h = paint.hue ? `calc(h + ${paint.hue})` : 'h';
  return `oklch(from ${base} ${l} ${c} ${h} / alpha)`;
}

/** The stops of a decoration's motion, about its own centre, for a decoration `size` across. */
function decorStops(animation: DecorAnimation, size: number): Stop[] {
  const a = animation.amplitude;
  switch (animation.kind) {
    case 'drift':
    case 'float': {
      const lift = n2(a ?? size * 0.18);
      return [
        { at: 0, transform: 'translate(0px,0px)' },
        { at: 0.5, transform: `translate(0px,${-lift}px)` },
        { at: 1, transform: 'translate(0px,0px)' },
      ];
    }
    case 'twinkle': {
      const spread = a ?? 0.36;
      const low = `scale(${n2(1 - spread * 0.78)})`;
      return [
        { at: 0, transform: low, opacity: 0.6 },
        { at: 0.5, transform: `scale(${n2(1 + spread * 0.22)})`, opacity: 1 },
        { at: 1, transform: low, opacity: 0.6 },
      ];
    }
    case 'rise': {
      const lift = a ?? size * 0.36;
      return [
        { at: 0, transform: `translate(${n2(-size * 0.1)}px,${n2(size * 0.2)}px) scale(0.8)`, opacity: 0 },
        { at: 0.25, opacity: 1 },
        { at: 1, transform: `translate(${n2(size * 0.18)}px,${n2(-lift)}px) scale(1.05)`, opacity: 0 },
      ];
    }
    case 'pop':
    case 'throb': {
      const grow = a ?? 0.16;
      return [
        { at: 0, transform: 'scale(0.9)' },
        { at: 0.3, transform: `scale(${n2(1 + grow)})` },
        { at: 1, transform: 'scale(0.9)' },
      ];
    }
    case 'spin':
      return [
        { at: 0, transform: 'rotate(0deg)' },
        { at: 1, transform: `rotate(${a ?? 360}deg)` },
      ];
    case 'sway':
    case 'wiggle': {
      const turn = a ?? 8;
      return [
        { at: 0, transform: `rotate(${-turn}deg)` },
        { at: 0.5, transform: `rotate(${turn}deg)` },
        { at: 1, transform: `rotate(${-turn}deg)` },
      ];
    }
    case 'bob': {
      const lift = n2(a ?? size * 0.12);
      return [
        { at: 0, transform: 'translate(0px,0px) rotate(0deg)' },
        { at: 0.5, transform: `translate(0px,${-lift}px) rotate(-10deg)` },
        { at: 1, transform: 'translate(0px,0px) rotate(0deg)' },
      ];
    }
    case 'flick': {
      const dip = a ?? 0.18;
      return [
        { at: 0, transform: 'scale(1)', opacity: 1 },
        { at: 0.45, transform: `scale(${n2(1 - dip)})`, opacity: 0.55 },
        { at: 1, transform: 'scale(1)', opacity: 1 },
      ];
    }
  }
}

/** The lab's periods, in seconds. */
const PERIOD: Record<DecorAnimation['kind'], number> = {
  drift: 3.2,
  float: 3.2,
  twinkle: 2.2,
  rise: 3,
  pop: 0.9,
  throb: 0.9,
  spin: 9,
  sway: 1.6,
  wiggle: 1.6,
  bob: 2.4,
  flick: 1.4,
};

const EASING: Record<DecorAnimation['kind'], MotionEasing> = {
  drift: 'sine',
  float: 'sine',
  twinkle: 'sine',
  rise: 'ease-out',
  pop: 'sine',
  throb: 'sine',
  spin: 'linear',
  sway: 'sine',
  wiggle: 'sine',
  bob: 'sine',
  flick: 'sine',
};

/** One decoration's nodes. `rules` collects the keyframes it plays, when it moves. */
function decorNode(
  placed: PlacedDecor,
  glyph: DecorGlyph,
  color: (paint: DecorPaint) => string,
  moving: boolean,
  rules: Set<string>,
  shift: number,
): SceneNode {
  const box = glyph.box ?? 24;
  const k = placed.size / box;
  const layers = glyph.layers.map((layer) => {
    const paint = color(layer.paint ?? placed.item.paint);
    return K.node(
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
  });
  const where = `translate(${n2(placed.x)} ${n2(placed.y)}) rotate(${n2(placed.turn)})`;
  const fit = `scale(${n2(k)}) translate(${-box / 2} ${-box / 2})`;
  const animation = placed.item.animation;
  const { node } = K;
  if (!moving || !animation) return node('g', { transform: `${where} ${fit}` }, layers);
  const played = compile(
    decorStops(animation, placed.size),
    animation.period ?? PERIOD[animation.kind],
    placed.phase + shift,
    animation.easing ?? EASING[animation.kind],
  );
  rules.add(played.rule);
  return node('g', { transform: where }, [
    node('g', animatedAttrs(played), [node('g', { transform: fit }, layers)]),
  ]);
}

/** A set's decorations as nodes, for a shape drawn at `scale`; each starts `shift` further into its period. */
export function decorNodes(
  spec: DecorSpec,
  key: string,
  shape: ShapeDef,
  scale: number,
  paints: DecorPaints,
  moving: boolean,
  rules: Set<string>,
  shift = 0,
): SceneNode[] {
  const mood = moodOfKey(key);
  const colors = new Map<DecorPaint, string>();
  const color = (paint: DecorPaint): string => {
    let css = colors.get(paint);
    if (css === undefined) colors.set(paint, (css = decorColor(paint, paints, mood)));
    return css;
  };
  return placeDecor(spec, key, shape, scale).flatMap((placed) => {
    const glyph = spec.glyphs[placed.item.glyph];
    return glyph ? [decorNode(placed, glyph, color, moving, rules, shift)] : [];
  });
}

/** Whether a set shows at this display width (0: unknown, which shows it). */
export const decorShown = (spec: DecorSpec, sizePx: number): boolean =>
  !(sizePx > 0) || sizePx >= (spec.minPx ?? DECOR_MIN_PX);

/** The style a live set's slot fades with, as the mood accent does. */
export const decorFade = (): string => `transition:opacity ${K.moodEaseMs}ms ease`;
