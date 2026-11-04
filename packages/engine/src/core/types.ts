/** Shape space is a square of this size; every generated path is normalised into it. */
export const SHAPE_SPACE = 229;

/** Centre of shape space. All generators build around this point. */
export const CENTER = SHAPE_SPACE / 2;

/**
 * Headroom around shape space, in shape units.
 *
 * The body sits at rest inside `SHAPE_SPACE`; everything it does — hopping
 * 20 units in `bounce`, squashing 6% in `excited`, tilting 9° — happens in
 * this margin. Sized so the largest excursion any behaviour produces stays
 * inside the SVG's own box, because the alternative is relying on
 * `overflow: visible`, and the first `overflow: hidden` ancestor (an avatar
 * circle, a card, a list row) then slices the top off every jump.
 */
export const VIEWBOX_MARGIN = 24;

export const VIEWBOX = {
  minX: -VIEWBOX_MARGIN,
  minY: -VIEWBOX_MARGIN,
  width: SHAPE_SPACE + VIEWBOX_MARGIN * 2,
  height: SHAPE_SPACE + VIEWBOX_MARGIN * 2,
} as const;
export const VIEWBOX_STR = `${VIEWBOX.minX} ${VIEWBOX.minY} ${VIEWBOX.width} ${VIEWBOX.height}`;

export type Point = readonly [number, number];

/** A closed ring of points sampled around a centre. */
export type Ring = Point[];

/**
 * The roster on its shelves.
 *
 * This is the one place a character is filed. `SHAPE_IDS` is these shelves
 * laid end to end, so a character is in exactly one family by construction;
 * pickers and docs read the shelves for their captions.
 */
export const SHAPE_FAMILIES = [
  {
    id: 'round',
    label: { en: 'Round', zh: '圆润' },
    shapes: ['mochi', 'circle', 'blob', 'pebble', 'egg', 'bun'],
  },
  { id: 'rect', label: { en: 'Rounded rectangle', zh: '方圆' }, shapes: ['tofu', 'pill'] },
  { id: 'polygon', label: { en: 'Polygon', zh: '多边' }, shapes: ['hex', 'onigiri', 'gem'] },
  {
    id: 'petal',
    label: { en: 'Petal', zh: '花叶' },
    shapes: ['cloud', 'drop', 'leaf', 'flower', 'clover'],
  },
  {
    id: 'garden',
    label: { en: 'Garden', zh: '田园' },
    shapes: ['sprout', 'mushroom', 'acorn', 'cactus'],
  },
  {
    id: 'fruit',
    label: { en: 'Fruit', zh: '水果' },
    shapes: ['pear', 'apple', 'strawberry', 'cherry'],
  },
  {
    id: 'figure',
    label: { en: 'Figure', zh: '造型' },
    shapes: ['star', 'heart', 'flame', 'bell', 'ghost', 'bot', 'crescent', 'boba'],
  },
  { id: 'sea', label: { en: 'Sea', zh: '海洋' }, shapes: ['fish', 'octopus'] },
  {
    id: 'critter',
    label: { en: 'Critter', zh: '小动物' },
    shapes: ['cat', 'bunny', 'bear', 'chick', 'penguin', 'pig', 'fox'],
  },
  {
    id: 'people',
    label: { en: 'People', zh: '人物' },
    shapes: ['bob', 'topknot', 'spiky', 'curly', 'twinbuns'],
  },
] as const;

export type ShapeFamily = (typeof SHAPE_FAMILIES)[number];
export type ShapeFamilyId = (typeof SHAPE_FAMILIES)[number]['id'];
export type ShapeId = (typeof SHAPE_FAMILIES)[number]['shapes'][number];

/** The roster in catalogue order, `mochi` (the default shape) first. */
export const SHAPE_IDS: readonly ShapeId[] = SHAPE_FAMILIES.flatMap((family) => family.shapes);

export const COLOR_IDS = [
  'black',
  'brown',
  'red',
  'orange',
  'yellow',
  'green',
  'cyan',
  'blue',
  'violet',
  'magenta',
  'pink',
  'gray',
] as const;

export type ColorId = (typeof COLOR_IDS)[number];

/** Colours that deterministic assignment may pick. `black` is reserved for defaults. */
export const ASSIGNABLE_COLOR_IDS = COLOR_IDS.filter((c) => c !== 'black') as Exclude<ColorId, 'black'>[];

/** Shapes that deterministic assignment may pick — the eight that read well at 16px. */
export const AUTO_SHAPE_POOL: ShapeId[] = [
  'blob',
  'pebble',
  'mochi',
  'tofu',
  'onigiri',
  'hex',
  'cloud',
  'drop',
];

/**
 * How the face is drawn.
 *
 * `cute` is the default: small round eyes, a small mouth and pink blush,
 * painted in a face colour on the body. `eyes` is two cut-out eyes and
 * nothing else — the silhouette does the rest. `line` adds a stroked nose and
 * a parametric mouth at the same line weight as the eyes, and moves the three
 * as one plate. All styles share every state and pose; only the feature set
 * and the expression tables differ.
 */
export const FACE_STYLES = ['cute', 'eyes', 'line'] as const;
export type FaceStyle = (typeof FACE_STYLES)[number];

/**
 * Nose shapes for the line face. A trait, not an expression: chosen once per
 * character and never morphed.
 */
export const NOSE_IDS = ['slant', 'angular', 'hook', 'long', 'curve', 'bow'] as const;
export type NoseId = (typeof NOSE_IDS)[number];

/** Named mouths for the line face. Every state wears one; see `STATE_MOUTH`. */
export const MOUTH_IDS = [
  'flat',
  'soft',
  'smile',
  'grin',
  'smirk',
  'o',
  'open',
  'dot',
  'wavy',
  'frown',
  'pout',
  'hum',
  'tight',
] as const;
export type MouthId = (typeof MOUTH_IDS)[number];

/** Named mouths for the cute face. Every state wears one; see `STATE_CUTE_MOUTH`. */
export const CUTE_MOUTH_IDS = [
  'none',
  'smile',
  'cat',
  'grin',
  'laugh',
  'flat',
  'frown',
  'o',
  'dot',
  'wavy',
  'smirk',
  'pout',
] as const;
export type CuteMouthId = (typeof CUTE_MOUTH_IDS)[number];

/** The mood effects of the cute face: what a character throws off besides its expression. */
export const FX_KINDS = [
  // Moods.
  'zz',
  'sparkle',
  'bang',
  'strokes',
  'heart',
  'tear',
  'arc',
  // Activities, which the belt states show on the cute face instead of shrinking the body.
  'dots',
  'ellipsis',
  'orbit',
  'bubbles',
  'spinner',
  'progress',
  'ripple',
  'waves',
  'rise',
  'fall',
  'send',
  'gather',
  'pencil',
] as const;
export type FxKind = (typeof FX_KINDS)[number];

/**
 * A mouth as a handful of numbers, in units of the fitted eye radius.
 *
 * Any two mouths morph by interpolating these fields, for the same reason the
 * eyes are parameters rather than outlines: the shape half-way between a
 * frown and an "o" is always a valid mouth.
 */
export interface MouthSpec {
  /** Half-width of the mouth. */
  width: number;
  /** Bow of the lip line. Positive curves the corners up (a smile). */
  bend: number;
  /** Height of the opening at the centre. 0 is closed. */
  open: number;
  /** Amplitude of one sine ripple along the lip line. */
  wave: number;
  /** Shift of the bow's apex towards one corner, -1..1. */
  skew: number;
  /** Vertical offset from the mouth anchor. */
  dy: number;
  /**
   * Two bumps along the lip line (the cat mouth). Positive hangs them below
   * the corners, negative lifts them above. Absent means none.
   */
  cat?: number;
  /** Share of the opening above the lip line, 0..1. Defaults to 0.38; 0 gives a flat-topped D. */
  upper?: number;
  /** Opacity of the whole mouth, 0..1. Defaults to 1; 0 is the cute face's "no mouth". */
  show?: number;
}

/** Euler angles in degrees plus a uniform scale. */
export interface Pose {
  turn: number;
  tilt: number;
  roll: number;
  scale: number;
}

export type PoseHome = Omit<Pose, 'scale'>;

/**
 * Five multipliers applied on top of a shape's fitted face box.
 * `size` scales the whole face, `gap` the distance between eyes,
 * `height` the vertical offset, and the last two the eye dimensions.
 */
export interface FaceTune {
  size: number;
  gap: number;
  height: number;
  eyeWidth: number;
  eyeHeight: number;
}

export const DEFAULT_FACE_TUNE: FaceTune = {
  size: 0.86,
  gap: 1.18,
  height: 1,
  eyeWidth: 0.96,
  eyeHeight: 0.92,
};

/**
 * Live pose, layered on top of the rest pose. Neutral by default — animation
 * states drive this, not the initial configuration.
 */
export const DEFAULT_POSE: Pose = { turn: 0, tilt: 0, roll: 0, scale: 1 };

/**
 * Rest pose: the slight three-quarter turn the character holds when it is not
 * doing anything. Just enough to imply a head with a front and a side; large
 * angles here compound with the live pose and throw the eyes off the face.
 */
export const DEFAULT_POSE_HOME: PoseHome = { turn: 13, tilt: -5, roll: 0 };

/** Result of fitting an ellipse into a body outline. */
export interface FaceBox {
  /** Face centre in shape space. */
  x: number;
  y: number;
  /** Half-extents of the fitted ellipse. */
  sx: number;
  sy: number;
  /** Eye size multiplier derived from how much room the ellipse has. */
  eye: number;
  /** Per-shape horizontal nudge for the left eye (triangular shapes need it). */
  leftDX: number;
}

/**
 * How a part of a figure is painted.
 * - `body`: the body's own ink, as if it were part of the silhouette (ears, an antenna).
 * - `leaf`: a green accessory.
 * - `inner`: the ink mixed with white, for the inside of an ear.
 * - `hair`: the ink a step darker on a filled body, and solid ink on an
 *   outlined one, as a line drawing fills in its hair.
 */
export const PART_TONES = ['body', 'leaf', 'inner', 'hair'] as const;
export type PartTone = (typeof PART_TONES)[number];

/**
 * A piece of the figure that is not the body ring: another outline in shape
 * space, normalised with the body's own transform. Parts never morph or fit
 * the face — they ride the body's pose, and fade while it changes.
 */
export interface ShapePart {
  tone: PartTone;
  outline: Ring;
}

/** A fully derived shape entry in the registry. */
export interface ShapeDef {
  id: ShapeId;
  /** Normalised SVG path data for the body. */
  path: string;
  /**
   * The normalised outline `path` was drawn through, in shape space. This is
   * what a renderer that does not speak SVG paths (a rasteriser, a canvas
   * polygon) should read; `ring` is a coarser resample kept for morphing.
   */
  outline: Ring;
  /** Maximum distance from centre to outline. */
  radius: number;
  /** Largest half-width across horizontal slices — the particle system's base radius. */
  beltRadius: number;
  /** Multiplier on body rotation; flat-bottomed shapes tilt less. */
  tiltScale: number;
  /** Vertical extent of the outline. */
  top: number;
  bottom: number;
  /** Left and right boundary at a given y. */
  spanAt(y: number): readonly [number, number];
  /** 96-point polar ring, used for shape-to-shape morphing and belt collapse. */
  ring: Ring;
  /** Fitted face box. */
  face: FaceBox;
  /** Extra pieces of the figure, drawn with the body: ears, antennas, leaves. Usually empty. */
  parts: readonly ShapePart[];
}
