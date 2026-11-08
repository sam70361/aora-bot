/**
 * The vector series' drawing media: `pencil`, `marker`, `crayon`,
 * `watercolor`, `neon`, `chalk` and `gothic`, and the paper ones, `origami`,
 * crumpled rather than drawn, and `relief`, pressed up from behind.
 *
 * A medium repaints the same snapshot by hand. The body and its pieces are
 * redrawn from their outlines — a wobbling double line, hatching, a scribbled
 * fill, a dried edge — as geometry worked out once per outline and cached with
 * it, so a character at rest costs nothing to redraw. What cannot be redrawn
 * without knowing how it is built — the face in any of its styles, the
 * effects, the dials, the belt — is treated as a group, through a mask or a
 * filter.
 *
 * Every mask and filter is a layer the browser composites each frame, so
 * there are at most two per character, with regions that follow the group
 * they treat. Where a grain can be carried by the paint instead, it is: a
 * grained fill is a pattern tile of its colour with seeded specks cut out of
 * it (the specks are a small image, so a tile costs one draw to rasterise
 * again when the body's scale changes), and crayon's rim is broken by a seeded
 * dash pattern. Pencil and chalk are line drawings whose face has to take the
 * grain too, so they mask the body group and the layers outside it. Nothing
 * here runs a noise filter; the only filters are a blur (neon's glow) and a
 * dilation (marker's rim).
 *
 * No medium paints a background: every one reads on the host's own page,
 * light or dark, through the ink tokens and the page-contrast shift the
 * hollow variants already use.
 */
import { fnv1a32, mulberry32 } from '../../math/hash.js';
import { VIEWBOX, type FaceBox, type PartColor, type Ring } from '../../core/types.js';
import { getShape } from '../../shapes/registry.js';
import type { FrameSnapshot, PartFrame } from '../../sim/snapshot.js';
import { MOOD_EASE_MS, MOOD_LEAN, STATE_MOODS, moodOf, type StateMood } from '../../motion/mood.js';
import { chromaHex } from '../pixel/shade.js';
import type { PartColorPaint } from '../part-color.js';
import { node, type SceneNode } from '../scene.js';
import { HAIR_SHADE_OPACITY, INNER_WHITE, isBodyPiece, mergedSilhouette } from './parts.js';
import type { BodySplit, VectorParams } from './build.js';
import { grainImage, type GrainShape } from './grain.js';
import { GOTHIC_GRAIN, paintGothic } from './gothic.js';
import { fold } from './origami.js';
import { themeExtras, type ExtrasScene } from '../../themes/extras-hook.js';
import type { FaceInk } from '../../themes/extras/colour.js';
import type { MoodAccent } from '../../themes/extras/lean.js';

/** The drawing media the core ships. A theme adds media of its own through `defineMedium`. */
export const MEDIA = [
  'pencil',
  'marker',
  'crayon',
  'watercolor',
  'neon',
  'chalk',
  'origami',
  'relief',
  'gothic',
] as const;
export type BuiltinMedium = (typeof MEDIA)[number];
/** A medium's id: a built-in one or one a theme defined. */
export type Medium = BuiltinMedium | (string & Record<never, never>);

const isBuiltin = (variant: string): variant is BuiltinMedium =>
  (MEDIA as readonly string[]).includes(variant);

export const isMedium = (variant: string): variant is Medium => isBuiltin(variant) || DEFINED.has(variant);
/** One of the media the core ships, rather than one a theme defined. */
export const isBuiltinMedium = isBuiltin;
/**
 * The variants whose body is a line rather than a filled mass. Their face,
 * eyes and features take the ink (shifted towards the page's contrast)
 * instead of a face colour, and their pieces are drawn as outlines.
 */
export const isLineVariant = (variant: string): boolean =>
  variant === 'outline' ||
  variant === 'glass' ||
  variant === 'pencil' ||
  variant === 'neon' ||
  variant === 'chalk';

/**
 * The variants that wear the soft variant's dark face and pink-leaning blush.
 * A crayon or watercolour body is a painted surface, and a face painted on it
 * in a darker pigment is what reads; the host's `--aora-face-soft` turns it
 * white on a black body exactly as it does for `soft`.
 */
export const wearsDarkFace = (variant: string): boolean =>
  variant === 'soft' ||
  variant === 'crayon' ||
  variant === 'watercolor' ||
  DEFINED.get(variant)?.darkFace === true;

/**
 * The variants that throw their effects in the line's colour rather than the
 * effects' own. Pencil is a graphite drawing, so its heart is graphite too;
 * neon and chalk keep the colours, as coloured tubes and coloured chalk.
 */
export const monochromeEffects = (variant: string): boolean =>
  variant === 'outline' || variant === 'glass' || variant === 'pencil';

/**
 * How far a line variant's face, and the line itself in the media, is mixed
 * towards the page's contrast, in percent. Graphite is the ink gone grey;
 * chalk is paler on a dark page; a neon tube's core is white-hot on a dark
 * page and deep on a light one.
 */
export function lineShift(variant: string): number {
  switch (variant) {
    case 'pencil':
      return 45;
    case 'chalk':
      return 48;
    case 'neon':
      return 55;
    default:
      return 22;
  }
}

/**
 * Each medium's line as a share of `strokeWidth`, the way the glass rim is:
 * one parameter sets the weight of every line variant, and each draws it at
 * the width its tool has.
 */
const LINE_SHARE: Partial<Record<string, number>> = { pencil: 0.45, marker: 0.42, neon: 0.5, chalk: 0.62 };

/**
 * Widths, in CSS pixels, over which a medium's fine detail fades out: the
 * grain (and with it the masks that carry it on the face) and the hatching.
 * Below the first a speck or a hatch line is a fraction of a pixel, and all it
 * does is thin out a face whose strokes are already under a pixel, so a small
 * character is drawn as cleanly as `outline`.
 */
const DETAIL_PX = [40, 80] as const;

/**
 * The thinnest a medium's line is drawn, in device pixels: about what
 * `outline`'s line covers on a 24 px character. A pencil line a third of a
 * pixel wide is a grey haze rather than a line.
 */
const LINE_MIN_PX = 0.85;

/** How a medium draws at the size it is shown. */
export interface MediumSize {
  /** The parameters as drawn: `grain` and `hatching` fade out on a small character. */
  params: VectorParams;
  /** The thinnest line in shape units, so that it covers `LINE_MIN_PX`; 0 when the size is unknown. */
  minLine: number;
}

/**
 * The medium at `sizePx`, the width the character is shown at. An unknown
 * size (0) draws full detail, as the HUD's figure does: a static document
 * with no size of its own is drawn for the size it will be shown at, which
 * is not known.
 */
export function mediumSize(params: VectorParams, sizePx: number, shapeScale: number): MediumSize {
  if (!(sizePx > 0)) return { params, minLine: 0 };
  const detail = Math.min(1, Math.max(0, (sizePx - DETAIL_PX[0]) / (DETAIL_PX[1] - DETAIL_PX[0])));
  const unitPx = (sizePx / VIEWBOX.width) * shapeScale;
  return {
    // In tenths, as the parameter's own step: the defs' ids and the dash patterns are keyed by it.
    params:
      detail >= 1
        ? params
        : {
            ...params,
            grain: Math.round(params.grain * detail * 10) / 10,
            hatching: params.hatching && detail >= 0.5,
          },
    minLine: LINE_MIN_PX / unitPx,
  };
}

/** The paints a medium works with, resolved by the scene. */
export interface MediumPaint {
  /** The body's paint: a colour, a token or a gradient reference. */
  ink: string;
  /** The ink as one colour, for strokes, mixes and filter floods. */
  solid: string;
  /** A line medium's line: the ink shifted towards the page's contrast, as its face is. */
  line: string;
  /** Paint of the leaf accessory. */
  leaf: string;
  /** What hair is shaded towards. */
  hairShade: string;
  /** A part's own colour and its ring. */
  partColor: (color: PartColor) => PartColorPaint;
  /** A line medium's line in another colour, shifted as `line` is. */
  lineOf: (color: string) => string;
}

/** `color` mixed with `into`, unless it is a gradient, which cannot be mixed and is used as it is. */
const mixPaint = (color: string, into: string, percent: number): string =>
  color.startsWith('url(') ? color : `color-mix(in oklab, ${color}, ${into} ${percent}%)`;

/** How much black darkens a filled medium's edge: marker's outline, crayon's rim, watercolour's dried edge. */
const EDGE_DARKNESS: Partial<Record<string, number>> = { marker: 52, crayon: 24, watercolor: 30 };

/** How much white lifts watercolour's wash above the ink. */
const WASH_WHITE = 24;

// ---------------------------------------------------------------- regions

/**
 * What a grain mask's texture covers, in the user space of the group it
 * treats. It is generous on purpose: the root group is scaled about the
 * centre, so a small shape's effects reach well outside shape space, and a
 * mask hides whatever falls outside its texture.
 */
const REGION = { x: -120, y: -120, width: 470, height: 470 } as const;

/**
 * A mask or filter region round the treated group's own box, `margin` of its
 * size on every side. The work a browser does each frame is the size of this
 * region, so it follows the content rather than covering the whole canvas;
 * the margin is what a stroke, a dilation or a glow reaches past the box,
 * and a group of small effects needs a larger share of its small box.
 */
const around = (margin: number) => ({
  x: -margin,
  y: -margin,
  width: 1 + 2 * margin,
  height: 1 + 2 * margin,
});

// --------------------------------------------------------------- textures

const f1 = (n: number): number => Math.round(n * 10) / 10;
const pct = (n: number): number => Math.round(n * 100) / 100;

export interface GrainSpec extends GrainShape {
  /** Turn of the tile, in degrees, so its repeat does not line up with anything. */
  angle: number;
  /** How much of the pigment a full speck takes away, before the `grain` parameter scales it. */
  opacity: number;
  /**
   * The share of that a line medium lays over its whole body group, face
   * and all, and over everything outside it, through one mask each; 0 for a
   * filled medium, which grains its fills through their paint and leaves the
   * face clean. Below 1 because a face's lines are a few units wide, and a
   * grain that roughens a body would break them up.
   */
  body: number;
}

/**
 * The grain of each medium's paper, as specks the pigment does not reach.
 * Sized in shape units, so the grain scales with the character: at 24 px it
 * melts into a slightly lighter tone, at 400 px it is the tooth of the paper.
 */
const GRAIN: Partial<Record<string, GrainSpec>> = {
  pencil: {
    tile: 30,
    angle: 21,
    opacity: 0.8,
    body: 0.75,
    specks: { count: 190, r: [0.35, 0.95] },
    seed: 11,
  },
  crayon: {
    tile: 40,
    angle: 0,
    opacity: 0.8,
    body: 0,
    specks: { count: 40, r: [0.4, 1] },
    streaks: { count: 100, length: [2, 5.5], width: 0.85, angle: -35, spread: 12 },
    seed: 23,
  },
  watercolor: { tile: 32, angle: 13, opacity: 0.3, body: 0, specks: { count: 110, r: [0.35, 1] }, seed: 37 },
  chalk: {
    tile: 40,
    angle: 8,
    opacity: 0.95,
    body: 0.72,
    specks: { count: 260, r: [0.45, 1.3] },
    streaks: { count: 50, length: [2, 5], width: 0.9, angle: 35, spread: 25 },
    seed: 41,
  },
  gothic: GOTHIC_GRAIN,
};

/**
 * Watercolour's granulation: pigment settled in the paper's hollows, as
 * darker specks in the wash. It shares the wash's tile, so the wash's one
 * pattern carries both, and a piece costs one pattern rather than two.
 */
const PIGMENT = { tile: 32, opacity: 0.13, specks: { count: 100, r: [0.3, 0.85] }, seed: 53 } as const;

const tileAttrs = (spec: GrainSpec) => ({ width: spec.tile, height: spec.tile });

const patternAttrs = (id: string, spec: GrainSpec) => ({
  id,
  ...tileAttrs(spec),
  patternUnits: 'userSpaceOnUse',
  patternTransform: spec.angle ? `rotate(${spec.angle})` : undefined,
});

// ------------------------------------------------------------------ paints

const TONES: readonly Tone[] = ['body', 'leaf', 'inner', 'hair'];

/**
 * A piece's colour: its tone's recipe over the ink, or its own colour where
 * it has one, laid flat. A line medium draws every piece but the inside of an
 * ear in the ink, or in the piece's own colour.
 */
function pieceColor(part: { tone: Tone; color?: PartColor }, paint: MediumPaint, line: boolean): string {
  const own = part.color === undefined ? null : paint.partColor(part.color).fill;
  if (own) return own;
  if (line && part.tone !== 'inner') return paint.ink;
  switch (part.tone) {
    case 'body':
      return paint.ink;
    case 'leaf':
      return paint.leaf;
    case 'inner':
      return mixPaint(paint.solid, '#fff', INNER_WHITE * 100);
    case 'hair':
      return mixPaint(paint.solid, paint.hairShade, HAIR_SHADE_OPACITY * 100);
  }
}

/** What a piece's grained fill is keyed by: its tone, and its own colour where it has one. */
const fillKey = (part: { tone: Tone; color?: PartColor }): string =>
  part.color === undefined ? part.tone : `${part.tone}-${fnv1a32(part.color).toString(36)}`;

/**
 * The fills a medium grains, by piece tone and colour. Each becomes one
 * pattern: the colour with the grain cut out of it. Only the filled media
 * grain a paint; a line is grained by breaking it (see `DASHES`), which costs
 * nothing to redraw, where a stroke painted with a pattern has its tile
 * rasterised again whenever the body's scale or turn changes.
 */
function grainTones(variant: Medium, paint: MediumPaint, parts: readonly PartFrame[]): [string, string][] {
  if (!grainsFills(variant)) return [];
  const fills = new Map<string, string>(TONES.map((tone) => [tone, pieceColor({ tone }, paint, false)]));
  for (const part of parts) {
    if (part.color !== undefined) fills.set(fillKey(part), pieceColor(part, paint, false));
  }
  const list = [...fills];
  return variant === 'watercolor'
    ? list.map(([key, color]) => [key, mixPaint(color, '#fff', WASH_WHITE)])
    : list;
}

/** The media whose fills are grained through a pattern. */
const GRAINED_FILLS: ReadonlySet<string> = new Set<Medium>(['crayon', 'watercolor', 'gothic']);
const grainsFills = (variant: string): boolean =>
  GRAINED_FILLS.has(variant) || DEFINED.get(variant)?.grainedFills === true;

/** A medium's paper grain: a built-in one's, or the one a theme's medium declares. */
const grainOf = (variant: string): GrainSpec | undefined => GRAIN[variant] ?? DEFINED.get(variant)?.grain;

const grainLevel = (params: VectorParams): number => Math.round(params.grain * 10);
/** A def's id. The grain strength is in it, so two settings inlined in one page keep apart. */
const defId = (prefix: string, name: string, params: VectorParams) =>
  `${prefix}-${name}${grainLevel(params)}`;

/**
 * The paint a filled medium lays a piece's fill with: the grained pattern of
 * its tone, or the colour itself when the grain is off, there are no defs to
 * point at, or the colour is a gradient (a pattern of a gradient would stretch
 * the gradient over each tile).
 */
function grainedFill(
  variant: Medium,
  prefix: string | undefined,
  params: VectorParams,
  key: string,
  color: string,
): string {
  if (!prefix || !grainsFills(variant) || params.grain <= 0 || color.startsWith('url(')) return color;
  return `url(#${defId(prefix, key, params)})`;
}

/**
 * Seeded dash patterns that break a line the way its tool does: graphite
 * skipping on the paper's tooth, chalk crumbling, wax catching. In shape
 * units, as `[dash, gap]` ranges; the gaps scale with `grain`. Many uneven
 * pairs, so the repeat is longer than any piece's outline.
 */
const DASHES: Partial<Record<string, { dash: [number, number]; gap: [number, number]; seed: number }>> = {
  crayon: { dash: [3, 9], gap: [0.6, 1.8], seed: 73 },
};

const dashCache = new Map<string, string>();

/** A medium's broken line as a `stroke-dasharray`, or `undefined` for a whole one. */
function dashes(variant: Medium, grain: number): string | undefined {
  const spec = DASHES[variant];
  if (!spec || grain <= 0) return undefined;
  const key = `${variant}:${grain}`;
  let value = dashCache.get(key);
  if (value === undefined) {
    const rand = mulberry32(spec.seed);
    const pairs: string[] = [];
    for (let i = 0; i < 16; i++) {
      const dash = spec.dash[0] + rand() * (spec.dash[1] - spec.dash[0]);
      const gap = (spec.gap[0] + rand() * (spec.gap[1] - spec.gap[0])) * grain;
      pairs.push(`${f1(dash)} ${f1(gap)}`);
    }
    value = pairs.join(' ');
    dashCache.set(key, value);
  }
  return value;
}

// ----------------------------------------------------------------- defs

/**
 * The medium's defs: its grain (the image once, then a pattern per grained
 * fill, or the line media's two masks, each reading it), and the filters of
 * the two media that need one. Nothing here depends on the frame, so a live
 * scene writes it once and leaves it.
 */
export function mediumDefs(
  variant: Medium,
  prefix: string,
  given: MediumPaint,
  params: VectorParams,
  parts: readonly PartFrame[] = [],
): SceneNode {
  const paint = paintFor(variant, given);
  const children: SceneNode[] = [];
  const spec = grainOf(variant);
  if (spec && params.grain > 0) {
    const image = `${prefix}-texture`;
    const strength = (share: number) => pct(Math.min(1, spec.opacity * params.grain * share));
    // Paper with the specks dark: a luminance mask that takes the pigment away where they are.
    const paper = (share: number) => [
      node('rect', { ...tileAttrs(spec), fill: '#fff' }),
      node('use', { href: `#${image}`, opacity: strength(share) }),
    ];
    const mask = defId(prefix, 'grain', params);
    const tones = grainTones(variant, paint, parts);
    children.push(
      node('image', {
        id: image,
        href: grainImage(spec, true),
        ...tileAttrs(spec),
        preserveAspectRatio: 'none',
      }),
    );
    if (tones.length > 0) {
      children.push(
        node('mask', { id: mask, maskUnits: 'userSpaceOnUse', x: 0, y: 0, ...tileAttrs(spec) }, paper(1)),
      );
    }
    const settled =
      variant === 'watercolor' || DEFINED.get(variant)?.pigment === true
        ? pigment(prefix, params, children)
        : null;
    for (const [tone, color] of tones) {
      if (color.startsWith('url(')) continue;
      children.push(
        node('pattern', patternAttrs(defId(prefix, tone, params), spec), [
          node('rect', { ...tileAttrs(spec), fill: color, mask: `url(#${mask})` }),
          ...(settled ? [settled] : []),
        ]),
      );
    }
    if (spec.body > 0) {
      const tile = defId(prefix, 'body-tile', params);
      children.push(
        node('pattern', patternAttrs(tile, spec), paper(spec.body)),
        node('mask', { id: defId(prefix, 'body', params), ...around(0.25) }, [
          node('rect', { ...REGION, fill: `url(#${tile})` }),
        ]),
        node('mask', { id: defId(prefix, 'over', params), ...around(0.6) }, [
          node('rect', { ...REGION, fill: `url(#${tile})` }),
        ]),
      );
    }
  }
  if (variant === 'neon' && params.neonGlow > 0) children.push(...glowFilters(prefix, params.neonGlow));
  if (variant === 'marker') children.push(rimFilter(`${prefix}-rim`, mixPaint(paint.solid, '#000', 62)));
  children.push(...(DEFINED.get(variant)?.defs?.(prefix, paint, params) ?? []));
  return node('defs', undefined, children);
}

/**
 * Watercolour's granulation, defined into `children`: its image and the mask
 * that lets only its specks through. Returns the layer a wash tile lays over
 * its colour: black, through that mask.
 */
function pigment(prefix: string, params: VectorParams, children: SceneNode[]): SceneNode {
  const image = `${prefix}-pigment-texture`;
  const mask = defId(prefix, 'pigment', params);
  const tile = { width: PIGMENT.tile, height: PIGMENT.tile };
  children.push(
    node('image', { id: image, href: grainImage(PIGMENT, false), ...tile, preserveAspectRatio: 'none' }),
    node('mask', { id: mask, maskUnits: 'userSpaceOnUse', x: 0, y: 0, ...tile }, [
      node('use', { href: `#${image}` }),
    ]),
  );
  return node('rect', {
    ...tile,
    fill: '#000',
    'fill-opacity': pct(Math.min(1, PIGMENT.opacity * params.grain)),
    mask: `url(#${mask})`,
  });
}

const filterAttrs = (id: string, margin: number) => ({
  id,
  ...around(margin),
  'color-interpolation-filters': 'sRGB',
});

const glowId = (prefix: string, glow: number, role: MediumRole) => `${prefix}-${role}-glow${glow}`;

/**
 * Neon's glow: the tube's own colours blurred and brightened under it, so a
 * tube glows the ink, a white-hot eye glows white and a pink heart glows pink.
 * One blur, which is most of the cost of a frame; the body's region is a
 * share of the body, the effects' a larger share of their smaller box.
 */
function glowFilters(prefix: string, glow: number): SceneNode[] {
  const halo = [
    node('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: f1(glow * 0.55), result: 'blur' }),
    node('feComponentTransfer', { in: 'blur', result: 'halo' }, [
      node('feFuncA', { type: 'linear', slope: 2 }),
    ]),
    node('feMerge', undefined, [
      node('feMergeNode', { in: 'halo' }),
      node('feMergeNode', { in: 'SourceGraphic' }),
    ]),
  ];
  return [
    node('filter', filterAttrs(glowId(prefix, glow, 'body'), 0.25), halo),
    node('filter', filterAttrs(glowId(prefix, glow, 'over'), 0.6), halo),
  ];
}

/** Marker's rim: everything it covers is outlined in the dark marker, the way the body is. */
function rimFilter(id: string, color: string): SceneNode {
  const flood = color.startsWith('url(') ? 'currentColor' : color;
  return node('filter', filterAttrs(id, 0.3), [
    node('feMorphology', { in: 'SourceAlpha', operator: 'dilate', radius: 1.5, result: 'fat' }),
    node('feFlood', { 'flood-color': flood }),
    node('feComposite', { in2: 'fat', operator: 'in', result: 'rim' }),
    node('feMerge', undefined, [
      node('feMergeNode', { in: 'rim' }),
      node('feMergeNode', { in: 'SourceGraphic' }),
    ]),
  ]);
}

/**
 * Where a treatment goes: the whole body group with the face and the badge
 * on it (`body`), the face on its own, or everything outside the body
 * (`over`).
 */
export type MediumRole = 'body' | 'face' | 'over';

/**
 * The mask or filter a group takes in this medium, or `undefined` when it is
 * drawn as it is. Neon glows the body and everything outside it; marker
 * outlines the face, which its body does not draw; pencil and chalk grain the
 * whole body group through one mask, since a face of any style is only known
 * as a group, and the effects, dials and belt through another. Crayon and
 * watercolour grain their fills through their paint.
 */
export function mediumTreatment(
  variant: Medium,
  prefix: string,
  params: VectorParams,
  role: MediumRole,
): Record<string, string> | undefined {
  const spec = grainOf(variant);
  if (spec) {
    if (role === 'face' || spec.body <= 0 || params.grain <= 0) return undefined;
    return { mask: `url(#${defId(prefix, role, params)})` };
  }
  if (variant === 'neon') {
    if (role === 'face' || params.neonGlow <= 0) return undefined;
    return { filter: `url(#${glowId(prefix, params.neonGlow, role)})` };
  }
  if (variant === 'marker') return role === 'face' ? { filter: `url(#${prefix}-rim)` } : undefined;
  return undefined;
}

// --------------------------------------------------------------- geometry

type Vec = [number, number];

const TAU = Math.PI * 2;

/** Outward unit normals of a closed ring, whichever way round it is wound. */
function normals(ring: Ring): Vec[] {
  const n = ring.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % n]!;
    area += a[0] * b[1] - b[0] * a[1];
  }
  const s = area >= 0 ? 1 : -1;
  return ring.map((_, i) => {
    const a = ring[(i - 1 + n) % n]!;
    const b = ring[(i + 1) % n]!;
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    return [(s * ty) / len, (-s * tx) / len];
  });
}

/** A hand's slow drift along a line: a few seeded sine waves that close on themselves round a loop. */
function handWave(seed: number): (t: number) => number {
  const rand = mulberry32(seed);
  const waves = (
    [
      [2, 0.5],
      [3, 0.32],
      [5, 0.2],
      [8, 0.12],
    ] as const
  ).map(([freq, amp]) => ({ freq, amp, phase: rand() * TAU }));
  return (t) => waves.reduce((sum, w) => sum + w.amp * Math.sin(TAU * w.freq * t + w.phase), 0);
}

interface Extent {
  cx: number;
  cy: number;
  size: number;
}

function extentOf(ring: Ring): Extent {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, size: Math.max(maxX - minX, maxY - minY) };
}

/**
 * How much of the hand's wobble a piece takes. An ear is drawn with the same
 * hand as the head, but a wobble the size of the head's would swallow it.
 */
const wobbleScale = (size: number): number => Math.min(1, Math.max(0.3, size / 160));

/** Every point pushed along its normal by `offset(i)`. */
function displaced(ring: Ring, offset: (i: number) => number): Vec[] {
  const nrm = normals(ring);
  return ring.map((p, i) => {
    const o = offset(i);
    return [p[0] + nrm[i]![0] * o, p[1] + nrm[i]![1] * o];
  });
}

/** A ring with a point between every pair, for an edge rough enough to need them. */
function densified(ring: Ring): Vec[] {
  const out: Vec[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    out.push([a[0], a[1]], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  }
  return out;
}

const pt = (p: readonly [number, number]): string => `${f1(p[0])} ${f1(p[1])}`;
const mid = (a: readonly [number, number], b: readonly [number, number]): Vec => [
  (a[0] + b[0]) / 2,
  (a[1] + b[1]) / 2,
];

/**
 * A smooth closed curve through the midpoints of a ring, with the points as
 * quadratic controls. One decimal: the hand moves the line by more than that.
 */
function closedCurve(points: readonly (readonly [number, number])[]): string {
  const n = points.length;
  if (n < 3) return '';
  let d = `M${pt(mid(points[n - 1]!, points[0]!))}`;
  for (let i = 0; i < n; i++) d += `Q${pt(points[i]!)} ${pt(mid(points[i]!, points[(i + 1) % n]!))}`;
  return `${d}Z`;
}

/** The same curve, open, from the first point to the last. */
function openCurve(points: readonly (readonly [number, number])[]): string {
  const n = points.length;
  if (n < 2) return '';
  let d = `M${pt(points[0]!)}`;
  for (let i = 1; i < n - 1; i++) d += `Q${pt(points[i]!)} ${pt(mid(points[i]!, points[i + 1]!))}`;
  return `${d}L${pt(points[n - 1]!)}`;
}

function inside(ring: Ring, x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

/** Where a line crosses a ring, as sorted positions along it: inside between each pair. */
function crossings(pu: number[], pv: number[], c: number): number[] {
  const n = pu.length;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = pu[i]! - c;
    const b = pu[j]! - c;
    if ((a < 0 && b >= 0) || (a >= 0 && b < 0)) out.push(pv[i]! + ((pv[j]! - pv[i]!) * a) / (a - b));
  }
  return out.sort((x, y) => x - y);
}

/** Intervals `[a, b]` of `from` that are not in any interval of `minus`. */
function subtract(from: number[], minus: number[]): number[] {
  let out = from;
  for (let k = 0; k + 1 < minus.length; k += 2) {
    const [m0, m1] = [minus[k]!, minus[k + 1]!];
    const next: number[] = [];
    for (let i = 0; i + 1 < out.length; i += 2) {
      const [a, b] = [out[i]!, out[i + 1]!];
      if (m1 <= a || m0 >= b) next.push(a, b);
      else {
        if (m0 > a) next.push(a, m0);
        if (m1 < b) next.push(m1, b);
      }
    }
    out = next;
  }
  return out;
}

export interface HatchSpec {
  /** Direction of the strokes, in degrees clockwise from +x. */
  angle: number;
  /** Distance between strokes, in shape units. */
  gap: number;
  /** How far each end is pulled in, at most, so the strokes do not all stop on the line. */
  ragged: number;
  seed: number;
  /**
   * Only the shadow side: the part of the piece that the piece itself, moved
   * by this vector, does not cover — a crescent on the far side from the light.
   */
  shade?: Vec;
}

/**
 * Parallel strokes across a ring, cut to its inside, one list per stroke line.
 * A line that crosses a notch gives two strokes, so the fill never leaves the
 * piece, whatever its shape.
 */
function hatch(ring: Ring, spec: HatchSpec): Vec[][][] {
  const a = (spec.angle * Math.PI) / 180;
  const v: Vec = [Math.cos(a), Math.sin(a)];
  const u: Vec = [-v[1], v[0]];
  const pu = ring.map((p) => p[0] * u[0] + p[1] * u[1]);
  const pv = ring.map((p) => p[0] * v[0] + p[1] * v[1]);
  const shade = spec.shade;
  const su = shade ? shade[0] * u[0] + shade[1] * u[1] : 0;
  const sv = shade ? shade[0] * v[0] + shade[1] * v[1] : 0;
  const rand = mulberry32(spec.seed);
  const lo = Math.min(...pu);
  const hi = Math.max(...pu);

  const lines: Vec[][][] = [];
  for (let c = lo + spec.gap * (0.3 + rand() * 0.5); c < hi; c += spec.gap * (0.85 + rand() * 0.3)) {
    let span = crossings(pu, pv, c);
    if (shade) {
      // The covered part is where the moved piece lies: the ring shifted along the same vector.
      const moved = crossings(
        pu.map((x) => x + su),
        pv.map((x) => x + sv),
        c,
      );
      span = subtract(span, moved);
    }
    const strokes: Vec[][] = [];
    for (let k = 0; k + 1 < span.length; k += 2) {
      const t0 = span[k]! + rand() * spec.ragged;
      const t1 = span[k + 1]! - rand() * spec.ragged;
      if (t1 - t0 < spec.gap * 0.6) continue;
      const at = (t: number): Vec => [c * u[0] + t * v[0], c * u[1] + t * v[1]];
      strokes.push([at(t0), at(t1)]);
    }
    lines.push(strokes);
  }
  return lines;
}

/** Strokes as separate segments. */
function strokesPath(lines: Vec[][][]): string {
  let d = '';
  for (const line of lines) for (const [a, b] of line) d += `M${pt(a!)}L${pt(b!)}`;
  return d;
}

/**
 * Strokes joined end to end into a back-and-forth scribble, the way a marker
 * fills a shape without lifting. A line that does not cross the piece exactly
 * once breaks the scribble and starts another.
 */
function scribblePath(lines: Vec[][][]): string {
  let d = '';
  let chained = false;
  let flip = false;
  for (const line of lines) {
    if (line.length !== 1) {
      for (const [a, b] of line) d += `M${pt(a!)}L${pt(b!)}`;
      chained = false;
      continue;
    }
    const [a, b] = line[0]!;
    const [first, last] = flip ? [b!, a!] : [a!, b!];
    d += `${chained ? 'L' : 'M'}${pt(first)}L${pt(last)}`;
    chained = true;
    flip = !flip;
  }
  return d;
}

// ------------------------------------------------------------------ cache

const cache = new WeakMap<Ring, Map<string, unknown>>();

/**
 * Geometry derived from an outline, remembered by the identity of the outline
 * and the key. A plain shape hands over the same array every frame, so its
 * wobble and hatching are worked out once; a belt's morphing ring is new each
 * frame and is redrawn each frame, which is what a moving outline needs.
 */
function remember<T>(ring: Ring, key: string, make: () => T): T {
  let entry = cache.get(ring);
  if (!entry) {
    entry = new Map();
    cache.set(ring, entry);
  }
  let value = entry.get(key) as T | undefined;
  if (value === undefined) {
    value = make();
    entry.set(key, value);
  }
  return value;
}

/** A closed wobbling line round the ring, `amp` units at most either side. */
function wobbleClosed(ring: Ring, seed: number, amp: number): Vec[] {
  const wave = handWave(seed);
  const n = ring.length;
  return displaced(ring, (i) => amp * wave(i / n));
}

/**
 * One loop and a little more, open, drifting outwards as it goes: the second
 * pass of a hand that does not quite find its own start again.
 */
function overshoot(ring: Ring, seed: number, amp: number): Vec[] {
  const n = ring.length;
  const rand = mulberry32(seed);
  const start = Math.floor(rand() * n);
  const extra = Math.round(n * 0.09);
  const wave = handWave(seed + 1);
  const nrm = normals(ring);
  const out: Vec[] = [];
  for (let k = 0; k <= n + extra; k++) {
    const i = (start + k) % n;
    const o = amp * wave(k / n) + amp * 0.7 * (k / (n + extra) - 0.5);
    out.push([ring[i]![0] + nrm[i]![0] * o, ring[i]![1] + nrm[i]![1] * o]);
  }
  return out;
}

/**
 * Watercolour's pooled pigment: the wash's own outline drawn smaller round a
 * point inside it, wobbled. A blot is kept only if it stays inside the wash,
 * so a crescent or a notched shape simply has fewer of them.
 */
function pools(ring: Ring, wash: Vec[]): string[] {
  const { cx, cy, size } = extentOf(ring);
  const rand = mulberry32(59);
  const out: string[] = [];
  for (let k = 0; k < 2; k++) {
    const scale = 0.38 + rand() * 0.24;
    const ox = (rand() - 0.5) * size * 0.28;
    const oy = (rand() - 0.5) * size * 0.28;
    const wave = handWave(61 + k);
    const n = wash.length;
    const blot: Vec[] = wash.map((p, i) => {
      const s = scale * (1 + 0.12 * wave(i / n));
      return [cx + ox + (p[0] - cx) * s, cy + oy + (p[1] - cy) * s];
    });
    if (blot.every((p, i) => i % 4 !== 0 || inside(wash, p[0], p[1]))) out.push(closedCurve(blot));
  }
  return out;
}

// ----------------------------------------------------------------- pieces

type Tone = PartFrame['tone'];

/** One outline the medium draws: the body, or one of its pieces. */
interface Piece {
  ring: Ring;
  tone: Tone;
  /** The piece's colour: the ink, the leaf, the inside of an ear, the hair, or its own. */
  color: string;
  /** What its grained fill is keyed by (`fillKey`). */
  key: string;
  /** Whether it is part of the body's mass rather than laid over it. */
  mass: boolean;
  /** Whether the art asks for it undecorated (`ShapePart.plain`): a skin leaves its marks off it. */
  plain: boolean;
  /** Whether its part names a signature motion (`ShapePart.motion`): it may move off its rest pose. */
  moving: boolean;
  /** A fading piece's opacity; `undefined` at full strength in a static scene. */
  opacity: number | undefined;
}

interface DrawContext {
  paint: MediumPaint;
  params: VectorParams;
  /** A piece's fill as the medium lays it, grained where the medium grains its fills. */
  fill: (piece: Piece, color?: string) => string;
  /** A line medium's line for this piece: the ink's, or its own colour's. */
  line: string;
  /** The medium's broken line, as a `stroke-dasharray`. */
  dash: string | undefined;
  /** The medium's line width, in shape units. */
  width: number;
  /** The hand's wobble, scaled for this piece. */
  wobble: number;
  /** The thinnest a line may be drawn, in shape units; 0 when the size is unknown. */
  minLine: number;
  /** Whether the outlines are the shape's own, not a belt's morph: what is worked out per outline is kept. */
  settled: boolean;
  /** The drawing functions a medium defined outside the core draws with. */
  kit: MediumKit;
  /** Whether the scene is live, kept and updated in place, rather than a static document. */
  live: boolean;
  /** The prefix of this character's defs (`MediumDefinition.defs`), or `undefined` where it has none. */
  prefix: string | undefined;
  /** The mood of the state the frame shows (`moodOf`). */
  mood: StateMood;
  /**
   * A medium's accent (an edge, a glow, a plate) as it shows in this frame: leaned into the mood when the
   * medium follows it (`MediumDefinition.followsMood`), else as it is.
   */
  accent: (color: string) => { fill: string; style: string | undefined };
  /** Where the shape's face sits at rest, its fitted ellipse in shape space: what a mark on the body keeps clear of. */
  face: FaceBox;
  /** Every piece of the figure in drawing order, the body among them, so a mark on one can keep clear of the others. */
  pieces: readonly Piece[];
}

/**
 * The body and its pieces as the medium draws them, replacing the flat body
 * and `partLayers`. A line medium draws the body and its same-ink pieces as
 * one merged outline when they join cleanly, as `outline` does, and leaves the
 * inside of an ear out; a filled medium paints same-ink pieces under the body
 * and accessories over it, each in its own colour and with the same tool.
 */
export function mediumBody(
  frame: FrameSnapshot,
  variant: Medium,
  given: MediumPaint,
  { params, minLine }: MediumSize,
  prefix: string | undefined,
  live: boolean,
  motion?: ExtrasScene,
  into?: Pick<BodySplit, 'below' | 'above'>,
): SceneNode[] {
  const paint = paintFor(variant, given);
  const line = isLineVariant(variant);
  const core = frame.body.coreOpacity;
  const behind: Piece[] = [];
  const front: Piece[] = [];
  const merged = line ? mergedSilhouette(frame) : null;
  const shown = (part: PartFrame) => live || part.opacity > 0.01;
  const alpha = (part: PartFrame) => (!live && part.opacity >= 1 ? undefined : pct(part.opacity));
  let moving: Map<Piece, PartFrame> | null = null;

  for (const part of frame.body.parts) {
    if (!shown(part)) continue;
    if (isBodyPiece(part) && merged) continue;
    if (part.tone === 'inner' && line) continue;
    const piece: Piece = {
      ring: part.outline,
      tone: part.tone,
      color: pieceColor(part, paint, line),
      key: fillKey(part),
      mass: isBodyPiece(part),
      plain: part.plain === true,
      moving: part.motion !== undefined,
      opacity: alpha(part),
    };
    if (part.motion && motion) (moving ??= new Map()).set(piece, part);
    (part.tone === 'body' ? behind : front).push(piece);
  }
  const body: Piece = {
    ring: merged ?? frame.body.outline,
    tone: 'body',
    color: paint.ink,
    key: 'body',
    mass: true,
    plain: false,
    moving: false,
    opacity: undefined,
  };

  const share = LINE_SHARE[variant] ?? 0;
  const fill = (piece: Piece, color = piece.color) => grainedFill(variant, prefix, params, piece.key, color);
  const dash = dashes(variant, params.grain);
  const mood = moodOf(frame.state);
  const defined = DEFINED.get(variant);
  const follows = defined?.followsMood === true;
  const vivid = defined?.moodAccent;
  const extras = vivid ? themeExtras() : null;
  // A vivid accent is the theme extras' to lean; without them it leans as every accent does.
  const lean = (color: string, at: StateMood): string =>
    extras && vivid ? extras.lean(color, at, vivid) : leanInto(color, at);
  const accent = (color: string) => ({
    fill: follows ? lean(color, mood) : color,
    style: follows && live ? `transition:fill ${MOOD_EASE_MS}ms ease` : undefined,
  });
  const all = [...behind, body, ...front];
  const face = getShape(frame.shape).face;
  const context = (piece: Piece): DrawContext => ({
    paint,
    params,
    fill,
    line: piece.color === paint.ink ? paint.line : paint.lineOf(piece.color),
    dash,
    width: share > 0 ? Math.max(params.strokeWidth * share, minLine) : 0,
    wobble: params.wobble * wobbleScale(extentOf(piece.ring).size),
    minLine,
    settled: frame.belt === null,
    kit: KIT,
    live,
    prefix,
    mood,
    accent,
    face,
    pieces: all,
  });
  const draw = (piece: Piece): SceneNode =>
    node('g', { opacity: piece.opacity }, painterOf(variant)(piece, context(piece)));
  const parts = moving;
  /*
   * In layers, a moving piece is drawn in a layer of its own behind or over
   * the body, so its motion repaints that layer and not the textured rest.
   */
  const drawn =
    parts && motion
      ? all.flatMap((piece) => {
          const part = parts.get(piece);
          if (!part) return [draw(piece)];
          const nodes = motion.part(part, [draw(piece)]);
          if (!into) return nodes;
          (piece.tone === 'body' ? into.below : into.above).push(...nodes);
          return [];
        })
      : all.map(draw);
  let under = defined?.underlay?.(frame, all, context(body)) ?? [];
  const breathes = motion && under.length > 0 ? defined?.underlayMotion?.(frame) : undefined;
  if (motion && breathes) {
    under = motion.play(breathes, under);
    // Behind the moving pieces drawn behind the body, as in one tree.
    if (into) {
      into.below.unshift(...under);
      under = [];
    }
  }
  return [node('g', { opacity: core === null ? undefined : pct(core) }, [...under, ...drawn])];
}

/** A filled medium's edge for a piece: its own colour, darkened. */
const edgeFor = (variant: Medium, piece: Piece, ctx: DrawContext): string =>
  mixPaint(
    piece.color === ctx.paint.ink ? ctx.paint.solid : piece.color,
    '#000',
    EDGE_DARKNESS[variant] ?? 30,
  );

/** How much of the ink tints a line medium's inside: a hair mass is darker than a face. */
const tintOf = (piece: Piece, base: number): number => (piece.tone === 'hair' ? base * 4 : base);

/**
 * Origami's paper: the steps a facet's light is rounded to, the most white
 * and black laid over the colour, the shadow a sheet casts and how far it
 * lies above the page, and the weight of its creases and its edge.
 */
const ORIGAMI = {
  levels: 4,
  light: 0.2,
  dark: 0.13,
  shadow: 0.1,
  lift: [2, 5],
  crease: 0.7,
  creaseOpacity: 0.12,
  edge: 22,
  edgeWidth: 1.2,
} as const;

/**
 * Relief's card: the shadow it casts and how far it stands off the page, the
 * lit rim up and to the left and the shaded one down and to the right (each
 * a stroke clipped to the piece, so only its inner half shows, and how far it
 * is moved towards its side), and its edge. Widths and offsets are a body's;
 * a smaller piece takes a share of them.
 */
const RELIEF = {
  shadow: 0.16,
  lift: [4, 8],
  lit: { width: 8, opacity: 0.5, shift: [-3, -3.5] },
  shade: { width: 10, opacity: 0.2, shift: [3.5, 4.5] },
  edge: 18,
  edgeWidth: 1,
} as const;

/** The share of relief's rims a piece takes: a body's whole, an ear's less, so a rim never fills it. */
const reliefScale = (size: number): number => Math.min(1, Math.max(0.4, size / 160));

/** A polygon as a closed path of straight sides. */
const polygonPath = (points: readonly (readonly [number, number])[]): string =>
  points.length < 3 ? '' : `M${points.map((p) => pt(p)).join('L')}Z`;

const PAINTERS: Record<BuiltinMedium, (piece: Piece, ctx: DrawContext) => SceneNode[]> = {
  /**
   * Graphite: a faint tint, hatching on the side away from the light, and the
   * outline drawn twice — once closed, once a loose pass that overshoots its
   * start. The lines skip where the graphite misses the paper's tooth.
   */
  pencil(piece, ctx) {
    const { ring } = piece;
    const line = ctx.line;
    const w = ctx.width;
    const out: SceneNode[] = [
      node('path', {
        d: remember(ring, 'curve', () => closedCurve(ring)),
        fill: piece.color,
        'fill-opacity': tintOf(piece, 0.1),
      }),
    ];
    if (ctx.params.hatching) {
      const d = remember(ring, 'pencil-shade', () => {
        const { size } = extentOf(ring);
        const s = Math.max(6, size * 0.1);
        return strokesPath(
          hatch(ring, { angle: 50, gap: 3.4, ragged: 2.5, seed: 5, shade: [-s * 0.66, -s * 0.75] }),
        );
      });
      out.push(node('path', { d, stroke: line, 'stroke-width': f1(w * 0.26), 'stroke-opacity': 0.55 }));
    }
    const wob = ctx.wobble;
    out.push(
      node('path', {
        d: remember(ring, `pencil-a${wob}`, () => closedCurve(wobbleClosed(ring, 7, wob * 0.55))),
        stroke: line,
        'stroke-width': f1(w),
        'stroke-linejoin': 'round',
        'stroke-dasharray': ctx.dash,
      }),
      node('path', {
        d: remember(ring, `pencil-b${wob}`, () => openCurve(overshoot(ring, 13, wob * 1.2))),
        stroke: line,
        'stroke-width': f1(w * 0.7),
        'stroke-opacity': 0.45,
        'stroke-dasharray': ctx.dash,
        'stroke-dashoffset': 9,
      }),
    );
    return out;
  },

  /**
   * Marker: a pale pass printed slightly off, a scribble filling the shape
   * without lifting, and a darker double outline. The gaps in the scribble
   * show the pale pass, or the page where it has slipped.
   */
  marker(piece, ctx) {
    const { ring, color } = piece;
    const w = ctx.width;
    const wob = ctx.wobble;
    const dark = edgeFor('marker', piece, ctx);
    const scribble = remember(ring, `marker-fill${f1(w)}`, () => {
      const inset = displaced(ring, () => -w * 0.7);
      return scribblePath(hatch(inset, { angle: -52, gap: w * 1.45, ragged: w * 0.5, seed: 17 }));
    });
    return [
      node('path', {
        d: remember(ring, `marker-under${wob}`, () => closedCurve(wobbleClosed(ring, 19, wob * 0.8))),
        fill: color,
        'fill-opacity': 0.3,
        transform: 'translate(3 3)',
      }),
      node('path', {
        d: scribble,
        stroke: color,
        'stroke-width': f1(w * 1.05),
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
      node('path', {
        d: remember(ring, `marker-a${wob}`, () => closedCurve(wobbleClosed(ring, 23, wob * 0.45))),
        stroke: dark,
        'stroke-width': f1(w),
        'stroke-linejoin': 'round',
      }),
      node('path', {
        d: remember(ring, `marker-b${wob}`, () => openCurve(overshoot(ring, 29, wob))),
        stroke: dark,
        'stroke-width': f1(w * 0.55),
        'stroke-linecap': 'round',
        'stroke-opacity': 0.5,
        transform: 'translate(2.4 -2)',
      }),
    ];
  },

  /**
   * Crayon: a waxy fill with a ragged edge and a heavier rim where the crayon
   * was pressed along the outline. The fill is grained, and the rim catches
   * and skips the way wax does.
   */
  crayon(piece, ctx) {
    const { ring } = piece;
    const wob = ctx.wobble;
    const d = remember(ring, `crayon${wob}`, () => {
      const wave = handWave(31);
      const rand = mulberry32(37);
      const dense = densified(ring);
      const n = dense.length;
      return closedCurve(displaced(dense, (i) => wob * 0.4 * wave(i / n) + wob * 0.45 * (rand() * 2 - 1)));
    });
    return [
      node('path', { d, fill: ctx.fill(piece) }),
      node('path', {
        d,
        stroke: edgeFor('crayon', piece, ctx),
        'stroke-width': 3.6,
        'stroke-linejoin': 'round',
        'stroke-dasharray': ctx.dash,
        'stroke-opacity': 0.75,
      }),
    ];
  },

  /**
   * Watercolour: a wash lighter than the ink, pigment pooled in a blot and a
   * bloom with a ragged edge, granulation in the paper's hollows, and the
   * darker edge a wash leaves where it dried.
   */
  watercolor(piece, ctx) {
    const { ring, color } = piece;
    const wob = ctx.wobble;
    const dark = edgeFor('watercolor', piece, ctx);
    const wash = remember(ring, `wash${wob}`, () => wobbleClosed(ring, 41, wob * 0.6));
    const washD = remember(ring, `wash-d${wob}`, () => closedCurve(wash));
    const out: SceneNode[] = [
      node('path', {
        d: washD,
        fill: ctx.fill(piece, mixPaint(color, '#fff', WASH_WHITE)),
        'fill-opacity': color.startsWith('url(') ? 0.78 : 0.94,
      }),
    ];
    // The first blot is pigment pooled where the wash lay longest; the second a bloom, where
    // wetter water pushed the pigment out to a darker ragged edge.
    remember(ring, `pools${wob}`, () => pools(ring, wash)).forEach((blot, k) => {
      out.push(
        node('path', {
          d: blot,
          fill: k === 0 ? color : '#fff',
          'fill-opacity': k === 0 ? 0.2 : 0.09,
          stroke: dark,
          'stroke-width': 0.9,
          'stroke-opacity': k === 0 ? 0.2 : 0.26,
        }),
      );
    });
    out.push(
      node('path', {
        d: remember(ring, `wash-band${wob}`, () => closedCurve(displaced(wash, () => -2.6))),
        stroke: dark,
        'stroke-width': 5.2,
        'stroke-opacity': 0.2,
      }),
      node('path', { d: washD, stroke: dark, 'stroke-width': 1.5, 'stroke-opacity': 0.6 }),
    );
    return out;
  },

  /**
   * Neon: a tube of the ink with a core shifted towards the page's contrast —
   * white-hot on a dark page, deep on a light one. The glow is the body
   * group's filter, so the face, whatever its style, glows with it.
   */
  neon(piece, ctx) {
    const { ring } = piece;
    const d = remember(ring, 'curve', () => closedCurve(ring));
    const w = ctx.width;
    return [
      node('path', { d, fill: piece.color, 'fill-opacity': tintOf(piece, 0.05) }),
      node('path', { d, stroke: piece.color, 'stroke-width': f1(w), 'stroke-linejoin': 'round' }),
      node('path', { d, stroke: ctx.line, 'stroke-width': f1(w * 0.36), 'stroke-linejoin': 'round' }),
    ];
  },

  /**
   * Chalk: a dusty haze along the line, diagonal strokes for the fill, the
   * line itself and a fainter retrace beside it, every stroke crumbling.
   */
  chalk(piece, ctx) {
    const { ring } = piece;
    const line = ctx.line;
    const w = ctx.width;
    const wob = ctx.wobble;
    const curve = remember(ring, 'curve', () => closedCurve(ring));
    const out: SceneNode[] = [
      node('path', { d: curve, stroke: line, 'stroke-width': f1(w * 2.6), 'stroke-opacity': 0.07 }),
      node('path', { d: curve, fill: piece.color, 'fill-opacity': tintOf(piece, 0.05) }),
    ];
    if (ctx.params.hatching) {
      const d = remember(ring, 'chalk-fill', () =>
        strokesPath(hatch(ring, { angle: -55, gap: 7.5, ragged: 4, seed: 43 })),
      );
      out.push(
        node('path', {
          d,
          stroke: line,
          'stroke-width': f1(w * 0.36),
          'stroke-dasharray': ctx.dash,
          'stroke-opacity': piece.tone === 'hair' ? 0.8 : 0.5,
        }),
      );
    }
    out.push(
      node('path', {
        d: remember(ring, `chalk-a${wob}`, () => closedCurve(wobbleClosed(ring, 47, wob * 0.6))),
        stroke: line,
        'stroke-width': f1(w),
        'stroke-linejoin': 'round',
        'stroke-dasharray': ctx.dash,
      }),
      node('path', {
        d: remember(ring, `chalk-b${wob}`, () => openCurve(overshoot(ring, 53, wob * 1.1))),
        stroke: line,
        'stroke-width': f1(w * 0.6),
        'stroke-opacity': 0.45,
        'stroke-dasharray': ctx.dash,
        'stroke-dashoffset': 5,
      }),
    );
    return out;
  },

  /**
   * Origami: each piece a sheet of its own, crumpled and pressed flat again —
   * the outline kept round, the inside broken into many soft, low facets,
   * each lit by how it faces the light — and laid a little above the page on
   * a small shadow, so the pieces of a figure read as separate sheets fitted
   * together. The light is laid over the colour in white and black, so a
   * token or a gradient folds as well.
   */
  origami(piece, ctx) {
    const { ring, color } = piece;
    const sheet = remember(ring, 'origami', () => {
      const { polygon, facets } = fold(ring);
      const shades = new Map<number, string>();
      for (const facet of facets) {
        const level = Math.round(facet.light * ORIGAMI.levels) / ORIGAMI.levels;
        if (level === 0) continue;
        shades.set(level, (shades.get(level) ?? '') + polygonPath(facet.ring));
      }
      return {
        outline: polygonPath(polygon),
        shades: [...shades].sort(([a], [b]) => a - b),
        creases: facets.map((facet) => polygonPath(facet.ring)).join(''),
      };
    });
    const out: SceneNode[] = [
      node('path', {
        d: sheet.outline,
        fill: '#000',
        'fill-opacity': ORIGAMI.shadow,
        transform: `translate(${ORIGAMI.lift[0]} ${ORIGAMI.lift[1]})`,
      }),
      node('path', { d: sheet.outline, fill: ctx.fill(piece) }),
    ];
    for (const [level, d] of sheet.shades) {
      out.push(
        node('path', {
          d,
          fill: level > 0 ? '#fff' : '#000',
          'fill-opacity': pct(level > 0 ? level * ORIGAMI.light : -level * ORIGAMI.dark),
        }),
      );
    }
    if (sheet.creases) {
      out.push(
        node('path', {
          d: sheet.creases,
          stroke: '#fff',
          'stroke-width': ORIGAMI.crease,
          'stroke-opacity': ORIGAMI.creaseOpacity,
          'stroke-linejoin': 'round',
        }),
      );
    }
    out.push(
      node('path', {
        d: sheet.outline,
        stroke: mixPaint(color === ctx.paint.ink ? ctx.paint.solid : color, '#000', ORIGAMI.edge),
        'stroke-width': ORIGAMI.edgeWidth,
        'stroke-linejoin': 'round',
      }),
    );
    return out;
  },

  /**
   * Relief: each piece one thick card pressed up from behind — a lit rim up
   * and to the left, a shaded one down and to the right, both inside the
   * piece — standing off the page on a soft shadow. The rims are white and
   * black over the colour, so a token or a gradient embosses as well.
   */
  relief(piece, ctx) {
    const { ring, color } = piece;
    const d = remember(ring, 'curve', () => closedCurve(ring));
    const k = reliefScale(extentOf(ring).size);
    const clip = `${ctx.prefix ?? 'aora'}-relief-${fnv1a32(d).toString(36)}`;
    const rim = (spec: typeof RELIEF.lit | typeof RELIEF.shade, paint: string) =>
      node('path', {
        d,
        stroke: paint,
        'stroke-opacity': spec.opacity,
        'stroke-width': f1(spec.width * k),
        transform: `translate(${f1(spec.shift[0] * k)} ${f1(spec.shift[1] * k)})`,
      });
    return [
      node('clipPath', { id: clip }, [node('path', { d })]),
      node('path', {
        d,
        fill: '#000',
        'fill-opacity': RELIEF.shadow,
        transform: `translate(${f1(RELIEF.lift[0] * k)} ${f1(RELIEF.lift[1] * k)})`,
      }),
      node('path', { d, fill: ctx.fill(piece) }),
      node('g', { 'clip-path': `url(#${clip})` }, [rim(RELIEF.shade, '#000'), rim(RELIEF.lit, '#fff')]),
      node('path', {
        d,
        stroke: mixPaint(color === ctx.paint.ink ? ctx.paint.solid : color, '#000', RELIEF.edge),
        'stroke-width': RELIEF.edgeWidth,
      }),
    ];
  },

  gothic: paintGothic,
};

const painterOf = (variant: string): ((piece: Piece, ctx: DrawContext) => SceneNode[]) =>
  isBuiltin(variant) ? PAINTERS[variant] : DEFINED.get(variant)!.paint;

const ringsPath = (rings: readonly Ring[]): string => rings.map((ring) => closedCurve(ring)).join('');

// ---------------------------------------------------------- defined media

/** One outline a medium draws, as a medium defined outside the core sees it. */
export type MediumPiece = Piece;
/** What a medium draws a piece with, as a medium defined outside the core sees it. */
export type MediumContext = DrawContext;

/**
 * The drawing functions the core lends a medium defined outside it, so a
 * theme's entry draws with the core's own geometry and caches without
 * importing any of the core: the entry stays data and painters, and installs
 * into whichever copy of the engine loaded it.
 */
export interface MediumKit {
  node: typeof node;
  /** Geometry worked out from an outline, kept for as long as the outline is. */
  remember: typeof remember;
  /** A smooth closed path through a ring. */
  closedCurve: (ring: readonly (readonly [number, number])[]) => string;
  /** Smooth closed paths through several rings, as one path. */
  ringsPath: (rings: readonly Ring[]) => string;
  /** A ring's centre and larger side. */
  extentOf: (ring: Ring) => { cx: number; cy: number; size: number };
  /** Parallel strokes across a ring (`HatchSpec`), as one path of separate segments. */
  hatchPath: (ring: Ring, spec: HatchSpec) => string;
  /** A colour mixed with another in OKLab, or a gradient as it is. */
  mixPaint: (color: string, into: string, percent: number) => string;
  /** A number to one decimal. */
  f1: (n: number) => number;
}

const KIT: MediumKit = {
  node,
  remember,
  closedCurve,
  ringsPath,
  extentOf,
  hatchPath: (ring, spec) => strokesPath(hatch(ring, spec)),
  mixPaint,
  f1,
};

/**
 * A drawing medium defined outside the core, by a theme (`installTheme`):
 * the same machinery as the built-in ones, described as data and painters.
 */
export interface MediumDefinition {
  /** Paper grain, in shape units. `body` is ignored: a defined medium grains its fills, not its face. */
  grain?: GrainSpec;
  /** Whether the fills carry the grain, as a pattern of each colour with the specks cut out. */
  grainedFills?: boolean;
  /** Whether darker specks of pooled pigment are laid over the grained fills. */
  pigment?: boolean;
  /** Whether the face is the painted variants' dark face (`wearsDarkFace`). */
  darkFace?: boolean;
  /**
   * Whether its accent follows the state's mood (`moodOf`): `ctx.accent` then leans the colour it is given
   * into the mood, and a live scene eases it there.
   */
  followsMood?: boolean;
  /** How vivid the mood accent is (`MoodAccent`); `MOOD_LEAN` as it is when absent. */
  moodAccent?: MoodAccent;
  /** Draws one piece: the body, or one of its parts. */
  paint: (piece: MediumPiece, ctx: MediumContext) => SceneNode[];
  /** Defs of its own (a dot screen, a gradient), each id beginning with `prefix`; written once with the rest. */
  defs?: (prefix: string, paint: MediumPaint, params: VectorParams) => SceneNode[];
  /** Draws under every piece at once, before any of them. */
  underlay?: (frame: FrameSnapshot, pieces: readonly MediumPiece[], ctx: MediumContext) => SceneNode[];
  /**
   * A signature motion the underlay plays in a live scene, by the id its
   * theme declares (`ThemePackage.motions`), or `undefined` for none: a halo
   * that breathes. It plays about the figure's box (the motion's `origin`),
   * and a layered scene draws it in a layer of its own behind the skin, so
   * keep it to transform and opacity. Static output, reduced motion and a
   * still character draw the underlay at rest.
   */
  underlayMotion?: (frame: FrameSnapshot) => string | undefined;
  /**
   * How far its underlay may reach past the drawing box, as a share of the
   * box (as `DecorSpec.reach`): the box, the layout size and the viewBox do
   * not change, and a static document of the skin may overflow. Default 0.
   */
  reach?: number;
  /**
   * What uncoloured hair is shaded towards, as a CSS colour of the ink, in
   * place of the face rule's shade; the grained hair fill follows it.
   */
  hairShade?: (paint: MediumPaint) => string;
  /** What uncoloured leaf parts are painted, as a CSS colour of `paint.leaf`; the grained leaf fill follows it. */
  leaf?: (paint: MediumPaint) => string;
  /**
   * The face's ink, opted into (`FaceInk`): the cute face and a drawn face's
   * whites. Absent, the face rule is untouched.
   */
  faceInk?: FaceInk;
}

/** The face colour a skin paints over `face` (what the rule chose) on a body of `ink`; `face` itself without an opt-in. */
export function faceInkOf(variant: string, face: string, ink: string): string {
  const own = DEFINED.get(variant)?.faceInk;
  const extras = own ? themeExtras() : null;
  return own && extras ? extras.faceInk(face, ink, own) : face;
}

const DEFINED = new Map<string, MediumDefinition>();

/** Whether a medium's underlay may reach past the drawing box (`MediumDefinition.reach`). */
export const mediumReaches = (variant: string): boolean => (DEFINED.get(variant)?.reach ?? 0) > 0;

/** A medium's paint, with the hair shade and the leaf a medium defined outside the core chooses for itself. */
function paintFor(variant: string, paint: MediumPaint): MediumPaint {
  const defined = DEFINED.get(variant);
  if (!defined?.hairShade && !defined?.leaf) return paint;
  return {
    ...paint,
    ...(defined.hairShade ? { hairShade: defined.hairShade(paint) } : null),
    ...(defined.leaf ? { leaf: defined.leaf(paint) } : null),
  };
}

/** Define a medium of the vector series under `id`, or replace one. A built-in medium cannot be replaced. */
export function defineMedium(id: string, definition: MediumDefinition): void {
  if (isBuiltin(id)) throw new Error(`"${id}" is a built-in medium`);
  DEFINED.set(id, { ...definition, grain: definition.grain && { ...definition.grain, body: 0 } });
}

/**
 * The least chroma a lean leaves: the tint's own share of colour. An accent
 * across the hue wheel from the tint cancels it in an OKLab mix, which would
 * otherwise come out grey.
 */
const LEAN_CHROMA = new Map(
  STATE_MOODS.map((mood) => {
    const lean = MOOD_LEAN[mood];
    return [mood, lean ? Math.round(chromaHex(lean.tint) * lean.share * 10) / 1000 : 0] as const;
  }),
);

/** A colour leaned into a mood (`MOOD_LEAN`); a gradient is left as it is. */
function leanInto(color: string, mood: StateMood): string {
  const lean = MOOD_LEAN[mood];
  if (!lean || color.startsWith('url(')) return color;
  return `oklch(from ${mixPaint(color, lean.tint, lean.share)} l max(c, ${LEAN_CHROMA.get(mood)}) h / alpha)`;
}
