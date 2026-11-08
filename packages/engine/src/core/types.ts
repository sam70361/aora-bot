import {
  THEME_MANIFEST,
  type BuiltinThemeId,
  type ThemeColorId,
  type ThemeShapeId,
} from '../themes/manifest.js';

/** Shape space is a square of this size; every generated path is normalised into it. */
export const SHAPE_SPACE = 240;

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
 * The core roster on its shelves.
 *
 * This is the one place a core character is filed, so it is in exactly one
 * family by construction. A family marked `listed: false` is drawn and
 * accepted by id everywhere but left out of the default lists. Themes add
 * characters of their own (`THEME_MANIFEST`), which load with their theme.
 */ export const ALL_SHAPE_FAMILIES = [
  {
    id: 'round',
    label: { en: 'Round', zh: '圆润' },
    shapes: ['circle', 'mochi', 'blob', 'pebble', 'egg', 'bun'],
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
    shapes: ['sprout', 'mushroom', 'acorn', 'cactus', 'eggplant'],
  },
  {
    id: 'fruit',
    label: { en: 'Fruit', zh: '水果' },
    shapes: ['pear', 'apple', 'strawberry', 'cherry', 'avocado', 'melon'],
  },
  {
    id: 'treat',
    label: { en: 'Treats', zh: '美食' },
    shapes: ['pudding', 'toast', 'icecream', 'cupcake', 'fries', 'candy', 'burger'],
  },
  {
    id: 'figure',
    label: { en: 'Figure', zh: '造型' },
    shapes: ['star', 'heart', 'flame', 'bell', 'ghost', 'bot', 'crescent', 'boba', 'planet'],
  },
  {
    id: 'object',
    label: { en: 'Objects', zh: '物件' },
    shapes: ['cottage', 'chat', 'gift', 'bulb'],
  },
  { id: 'sea', label: { en: 'Sea', zh: '海洋' }, shapes: ['fish', 'octopus', 'seal', 'puffer'] },
  {
    id: 'critter',
    label: { en: 'Critter', zh: '小动物' },
    shapes: [
      'cat',
      'bunny',
      'bear',
      'chick',
      'penguin',
      'pig',
      'fox',
      'lion',
      'hamster',
      'hedgehog',
      'koala',
      'bat',
    ],
  },
  {
    id: 'people',
    label: { en: 'People', zh: '人物' },
    shapes: ['bob', 'topknot', 'spiky', 'curly', 'twinbuns'],
  },
] as const satisfies readonly FamilyEntry[];

interface FamilyEntry {
  readonly id: string;
  readonly label: { readonly en: string; readonly zh: string };
  readonly listed?: boolean;
  readonly shapes: readonly string[];
}

type CoreFamily = (typeof ALL_SHAPE_FAMILIES)[number];
/** A character the core draws. */
export type CoreShapeId = CoreFamily['shapes'][number];
/** Any character the engine knows: the core's, and those of the shipped themes, which draw once their theme is installed. */
export type ShapeId = CoreShapeId | ThemeShapeId;
/** A family of the core roster, listed or not. */
export type AnyShapeFamily = CoreFamily;
export type AnyShapeFamilyId = AnyShapeFamily['id'];
/** The id of a family the default lists can show: a listed core family, or a theme with listed characters. */
export type ShapeFamilyId = Exclude<CoreFamily, { listed: false }>['id'] | BuiltinThemeId;

/** A family the default lists show. */
export interface ShapeFamily {
  readonly id: ShapeFamilyId;
  readonly label: { readonly en: string; readonly zh: string };
  readonly shapes: readonly ShapeId[];
}

const isListed = (family: FamilyEntry): boolean => family.listed !== false;

/**
 * The listed families: what pickers, the console and the docs show. A
 * theme's listed characters (`ThemeManifestEntry.listedShapes`) follow the
 * core's as a family of their own, and draw once their theme is loaded.
 */
export const SHAPE_FAMILIES: readonly ShapeFamily[] = [
  ...(ALL_SHAPE_FAMILIES as readonly FamilyEntry[]).filter(isListed).map((family) => family as ShapeFamily),
  ...THEME_MANIFEST.filter((theme) => theme.listedShapes.length > 0).map((theme): ShapeFamily => ({
    id: theme.id,
    label: theme.name,
    shapes: theme.listedShapes,
  })),
];

/** The listed roster in catalogue order, `mochi` (the default shape) first. */
export const SHAPE_IDS: readonly ShapeId[] = SHAPE_FAMILIES.flatMap((family) => family.shapes);

/** Every character the core draws, listed or not: what the core's generator and stored data cover. */
export const CORE_SHAPE_IDS: readonly CoreShapeId[] = ALL_SHAPE_FAMILIES.flatMap((family) => family.shapes);

/**
 * Every character the engine knows, listed ones first: the core's, then the
 * shipped themes'. A theme's characters draw once the theme is installed
 * (`themeOwning`, `loadTheme`); this list is for checking an id.
 */
export const ALL_SHAPE_IDS: readonly ShapeId[] = [
  ...new Set<ShapeId>([...SHAPE_IDS, ...CORE_SHAPE_IDS, ...THEME_MANIFEST.flatMap((theme) => theme.shapes)]),
];

/** Whether a character is in the default lists. */
export const isListedShape = (id: string): boolean => (SHAPE_IDS as readonly string[]).includes(id);

/**
 * The palette, every colour the engine paints. The default lists (`COLOR_IDS`)
 * leave out the ones in `UNLISTED_COLOR_IDS`, which are accepted by id
 * everywhere and offered by themes; taking an id out of that list lists it.
 * A colour only one theme paints with is that theme's own
 * (`ThemeManifestEntry.colors`), drawn once it is installed and never listed.
 */
export const CORE_COLOR_IDS = [
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
  'night',
  'cocoa',
  'sky',
  'blush',
  'lilac',
  'cream',
  'butter',
  'ivory',
  'meadow',
] as const;

/** Colours drawn everywhere but left out of the default lists: those more than one theme paints with. */
export const UNLISTED_COLOR_IDS: readonly CoreColorId[] = [
  'night',
  'cocoa',
  'sky',
  'blush',
  'lilac',
  'cream',
  'butter',
  'ivory',
  'meadow',
];

export type CoreColorId = (typeof CORE_COLOR_IDS)[number];
export type ColorId = CoreColorId | ThemeColorId;

/** The listed palette: what pickers and the console show. */
export const COLOR_IDS: readonly ColorId[] = CORE_COLOR_IDS.filter((id) => !UNLISTED_COLOR_IDS.includes(id));

/** Every colour the engine knows, listed ones first. */
export const ALL_COLOR_IDS: readonly ColorId[] = [
  ...CORE_COLOR_IDS,
  ...THEME_MANIFEST.flatMap((theme): readonly ColorId[] => theme.colors),
];
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
 *
 * The rest are drawn faces (`DRAWN_FACE_STYLES`): faces of the cute family
 * whose eyes are built from several painted layers — whites, pupils, lids,
 * brows, lenses, screens, symbols — each with its own expression and mouth
 * tables (`face/drawn/designs/`). They keep the cute face's layout,
 * cheeks and effects, and differ from it as data.
 *
 * `FACE_STYLES` is the order pickers list them in: the first drawn face,
 * `capsule`, leads, then the three base faces, then the other drawn faces.
 */
export const DRAWN_FACE_STYLES = [
  'capsule',
  'brow',
  'glossy',
  'sparkle',
  'button',
  'shades',
  'droopy',
  'bigmouth',
  'pie',
  'screen',
  'symbol',
  'teardrop',
  'specs',
] as const;
export type DrawnFaceStyle = (typeof DRAWN_FACE_STYLES)[number];

const [LEAD_FACE, ...LATER_FACES] = DRAWN_FACE_STYLES;
export const FACE_STYLES = [LEAD_FACE, 'cute', 'eyes', 'line', ...LATER_FACES] as const;
export type FaceStyle = (typeof FACE_STYLES)[number];

/** Drawn faces a host or a theme defined (`defineFace`), by id. */
const DEFINED_FACES = new Set<string>();

/** File a face `defineFace` registered, so every check of a face id knows it. */
export const markDefinedFace = (id: string): void => {
  DEFINED_FACES.add(id);
};

/**
 * Whether a face is a drawn one: a cute-family face with its own layered
 * eyes, built in or defined with `defineFace`. A defined face's id passes as
 * a `DrawnFaceStyle`, as a `defineShape` id passes as a `ShapeId`.
 */
export const isDrawnFace = (face: string | undefined): face is DrawnFaceStyle =>
  (DRAWN_FACE_STYLES as readonly string[]).includes(face ?? '') || DEFINED_FACES.has(face ?? '');

/** Whether the engine draws a face: one of `FACE_STYLES`, or one defined with `defineFace`. */
export const isFaceStyle = (face: string | undefined): face is FaceStyle =>
  (FACE_STYLES as readonly string[]).includes(face ?? '') || DEFINED_FACES.has(face ?? '');

/**
 * Whether a face is of the cute family: the cute face itself or a drawn one.
 * These share the cute layout, cheeks and mood effects, and keep the body
 * whole in the belt states.
 */
export const isCuteFamily = (face: string | undefined): boolean => face === 'cute' || isDrawnFace(face);

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
 * Five multipliers applied on top of a shape's fitted face box, all 1 by
 * default. `size` scales the whole face, `gap` the distance between eyes,
 * `height` the vertical offset, and the last two the eye dimensions. A
 * state's own adjustments multiply into them.
 */
export interface FaceTune {
  size: number;
  gap: number;
  height: number;
  eyeWidth: number;
  eyeHeight: number;
}

export const DEFAULT_FACE_TUNE: FaceTune = {
  size: 1,
  gap: 1,
  height: 1,
  eyeWidth: 1,
  eyeHeight: 1,
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
 *
 * A part with a `color` of its own is laid flat in that colour on a filled
 * body, whatever its tone, and keeps every other rule of its tone: the face
 * keeps off a hair part, and an outlined body draws it as its tone's line.
 */
export const PART_TONES = ['body', 'leaf', 'inner', 'hair'] as const;
export type PartTone = (typeof PART_TONES)[number];

/**
 * A part's own colour: a palette colour, painted in that swatch's ink and so
 * following the page between light and dark as a body of that colour does,
 * or any CSS colour, used as it is. A part with its own colour is ringed in a
 * line derived from that colour, so it reads on a body of the same colour.
 */
export type PartColor = ColorId | (string & Record<never, never>);

/**
 * A piece of the figure that is not the body ring: another outline in shape
 * space, normalised with the body's own transform. Parts never morph or fit
 * the face — they ride the body's pose, and fade while it changes.
 */
export interface ShapePart {
  tone: PartTone;
  outline: Ring;
  /** The part's own colour, in place of the ink its tone derives from. */
  color?: PartColor;
  /**
   * A prop laid over the figure (a hat, a lantern) rather than a piece of it.
   * Where it covers the body the face keeps off it, as it does off hair.
   */
  prop?: boolean;
  /** The smallest width, in CSS pixels across the character, at which the part is drawn: fine detail. */
  minPx?: number;
  /** A trim a skin leaves undecorated: no stitches, hatching or marks of its own. */
  plain?: boolean;
  /** A prop drawn under the face (make-up, a painted mark): the face fit does not keep off it. */
  underFace?: boolean;
  /** The signature motion it plays (a motion its theme declares), with its pivot in shape space. */
  motion?: PartMotionRef;
}

/**
 * Where a signature motion meets the figure, in shape space: the pivot the
 * art gives, if it gives one, and the art's own units (`unit` shape units
 * each, its origin at `offset`), so a move or a point written in the art's
 * units lands where it was drawn.
 */
export interface MotionAnchor {
  readonly pivot?: Point;
  readonly unit: number;
  readonly offset: Point;
}

/** The motion a part names: the id its theme declares it under, and where it meets the part. */
export interface PartMotionRef extends MotionAnchor {
  readonly id: string;
}

/** The motions a whole figure plays (`DrawnArt.motion`), and where they meet it. */
export interface FigureMotionRef extends MotionAnchor {
  readonly ids: readonly string[];
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
  /** The signature motions the whole figure plays, as its theme's art names them. */
  motion?: FigureMotionRef;
  /** What uncoloured hair is shaded towards, as a share of the ink's lightness (`DrawnArt.hairDeep`). */
  hairDeep?: number;
}
