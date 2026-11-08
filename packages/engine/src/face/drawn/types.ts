/**
 * The vocabulary every drawn face is written in.
 *
 * A drawn face is a complete face of the cute family: its own eye forms for
 * every state, its own mouths or the cute ones shared by name, its own
 * layout, its own blink and gaze, and its own text rendition. What it draws
 * is a list of layers — closed outlines with a paint role — built from a
 * handful of numbers per eye. Expressions are those numbers, so a state
 * change morphs by interpolating them, exactly as the cute and line eyes do:
 * a part never pops in or out, it grows or fades.
 */
import type { CuteMouthId, DrawnFaceStyle, FxKind, MouthSpec, Point } from '../../core/types.js';
import type { CharacterState } from '../../motion/states.js';
import type { CuteEyeId } from '../topologies.js';

/**
 * What a layer is painted with. Roles, not colours: each renderer resolves
 * them per variant and per palette colour, so a drawn face follows the body
 * the way the cute face does.
 *
 * - `face`: the face colour — eye whites, the light on a pupil, and a
 *   sparkle beside a smiling eye.
 * - `pupil`: whatever reads on `face` (dark on the white face; on a black
 *   body it turns light with the page, as the face does).
 * - `feature`: whatever reads on the body — brows, lashes, lids, stitches,
 *   eyes drawn straight onto the body, as the cute face's are.
 * - `glint`: whatever reads on `feature`, for the light on a body-drawn eye.
 * - `iris`: the body's own ink, deepened.
 * - `gold`, `tear`, `tongue`, `rose`, `flame`, `thread`, `bone`, `glass`:
 *   fixed accents — a star, a tear, a tongue, a heart, an anger mark, a
 *   button's thread and face, dark glass.
 * - `light`: a lit display colour, carried on the layer as `light`.
 */
export const FACE_PAINTS = [
  'face',
  'pupil',
  'feature',
  'glint',
  'iris',
  'gold',
  'tear',
  'tongue',
  'rose',
  'flame',
  'thread',
  'bone',
  'glass',
  'light',
] as const;
export type FacePaint = (typeof FACE_PAINTS)[number];

/** The paints that are one fixed colour everywhere. */
export type FaceAccent = 'gold' | 'tear' | 'tongue' | 'rose' | 'flame' | 'thread' | 'bone' | 'glass';

/** The fixed accents' colours, shared by every series. */
export const FACE_ACCENTS: Record<FaceAccent, string> = {
  gold: '#FFC531',
  tear: '#6EC1FF',
  tongue: '#EE6B7C',
  rose: '#FF5A7A',
  flame: '#FF6A3D',
  thread: '#8A4B2A',
  bone: '#F6EAD2',
  glass: '#17141F',
};

export const isFaceAccent = (paint: FacePaint): paint is FaceAccent => paint in FACE_ACCENTS;

/** An RGB triple, 0..255 per channel. */
export type Rgb = readonly [number, number, number];

/**
 * One painted piece of a drawn face: one or more closed outlines filled with
 * one paint. Thick lines arrive already outlined, so every renderer only
 * ever fills.
 */
export interface FaceLayer {
  paint: FacePaint;
  rings: Point[][];
  opacity: number;
  /** The colour of a `light` layer. */
  light?: Rgb;
  /**
   * Fine detail — a glint, a highlight, a sheen — that a coarse renderer may
   * leave out rather than round up to a whole cell.
   */
  detail?: boolean;
  /** Rings after the first cut holes in it rather than adding to it. */
  holes?: boolean;
  /**
   * A plate the eye sits in (a white, a lens, a screen). Variants whose body
   * is a line give it a rim, since the plate itself may be the page colour.
   */
  plate?: boolean;
  /**
   * Drifts free of the face (a falling tear, a rising Z): not part of the
   * extent the face is fitted to its body by, so it may leave the face.
   */
  loose?: boolean;
}

/** An eye's numbers. Each design names its own fields; every expression carries all of them. */
export type DrawnEye<F extends string = string> = Readonly<Record<F, number>>;

/** Left eye first, as `EyePair`. Fields read with +x pointing at the nose on both sides. */
export type DrawnPair<F extends string = string> = readonly [DrawnEye<F>, DrawnEye<F>];

/**
 * How a design reads an eye for text: eleven kinds of eye, each written with
 * one glyph per face.
 */
export const EYE_CLASSES = [
  'open',
  'wide',
  'small',
  'half',
  'look',
  'smile',
  'closed',
  'mad',
  'sad',
  'cross',
  'star',
] as const;
export type EyeClass = (typeof EYE_CLASSES)[number];

/** The kind of each cute expression, per eye. Shared by every drawn face, since they all name their expressions after the cute ones. */
export const CUTE_EYE_CLASSES: Record<CuteEyeId, readonly [EyeClass, EyeClass]> = {
  dot: ['open', 'open'],
  dotSmall: ['small', 'small'],
  dotWide: ['wide', 'wide'],
  dotLeft: ['look', 'look'],
  dotRight: ['look', 'look'],
  dotUp: ['look', 'look'],
  dotDown: ['look', 'look'],
  dotLook: ['look', 'look'],
  dotHalf: ['half', 'half'],
  dotSuspicious: ['half', 'open'],
  arch: ['smile', 'smile'],
  archWide: ['smile', 'smile'],
  curve: ['closed', 'closed'],
  curveSleepy: ['closed', 'closed'],
  cross: ['cross', 'cross'],
  star: ['star', 'star'],
  sad: ['sad', 'sad'],
  mad: ['mad', 'mad'],
  wink: ['smile', 'open'],
};

/** A glyph for both eyes, or one per eye (left first). */
export type Glyph = string | readonly [string, string];

/**
 * Layout, in cute dot radii measured from the cute face's eye line, like
 * the cute constants in `placement.ts`.
 */
export interface DrawnLayout {
  /** How far the eyes sit above the cute eye line. */
  lift: number;
  /** Distance between the two eye centres. */
  separation: number;
  /**
   * The closest the eye centres may be brought on a body too narrow for the
   * face as designed, before it has to shrink instead: the spacing at which
   * the face's parts (two whites, two lenses and their bridge, two panels)
   * would start to overlap in their widest state.
   */
  minSeparation: number;
  /** Eye line to mouth anchor. The cute face's is `CUTE_MOUTH_DROP`, 2.39. */
  mouthDrop: number;
  /** Size of the mouth against the cute mouth. */
  mouthScale: number;
  /** Line weight of the mouth against the cute mouth's. */
  mouthWeight: number;
  /** Where the cheeks sit: out from the middle and down from the eye line, as `CUTE_BLUSH`. */
  blush: { x: number; y: number };
  /** Share of the gaze offset that moves the whole eye; the rest is the design's to spend on pupils. */
  gazeShift: number;
}

/** What a design's builders are told about the eye they are drawing. */
export interface EyeContext {
  /** +1 for the left eye, -1 for the right: multiply an x by it to draw it the same way round on screen. */
  nose: 1 | -1;
  /** 0 for the left eye, 1 for the right, for animations that run out of step. */
  order: 0 | 1;
  /** Seconds in the current state. */
  time: number;
  /** Static output and reduced motion: show each animation at one representative moment. */
  settled: boolean;
  /** How open the eyelids are, 0 shut to 1 open; past 1 is a blink's overshoot. */
  blink: number;
  /** Gaze in dot radii, x towards the nose, already scaled by what is left after `gazeShift`. */
  look: Point;
  /** Multiplier on stroke weights: the character's `lineWeight` against the shared one. */
  weight: number;
  /** Distance from this eye's centre to the face's midline, in dot radii. */
  mid: number;
}

/** What a design's mouth builder is told: the mouth as drawn, in dot radii. */
export interface MouthContext {
  mouth: MouthSpec;
  /** Line weight of the mouth, in dot radii. */
  stroke: number;
}

/** Text for a face: one glyph per kind of eye, and the mouths. */
export interface DrawnKaomoji<E extends string = string> {
  eyes: Record<EyeClass, Glyph>;
  /** Glyphs for the design's own expressions that are more than their kind (a screen's spinner). */
  special?: Partial<Record<E, Glyph>>;
  mouths: Record<CuteMouthId, string>;
}

/**
 * A drawn face, complete. `F` names the eye's numbers, `E` the design's own
 * expressions beyond the nineteen cute names every design draws.
 */
export interface FaceDesign<F extends string = string, E extends string = never> {
  id: DrawnFaceStyle;
  layout: DrawnLayout;
  /** Every expression, by name: the cute names and the design's own. */
  expressions: Record<CuteEyeId | E, DrawnPair<F>>;
  /** What kind of eye each of the design's own expressions is, for text. */
  classes: Record<E, readonly [EyeClass, EyeClass]>;
  /** The expression sequence per state. A design that shares the cute sequence says so here. */
  states: Record<CharacterState, readonly (CuteEyeId | E)[]>;
  mouths: Record<CuteMouthId, MouthSpec>;
  stateMouth: Record<CharacterState, CuteMouthId>;
  /** What the mouth is painted with. */
  mouthPaint: FacePaint;
  /** Mood effects the eyes already carry (a design that cries its own tears quiets `tear`). */
  quietFx: readonly FxKind[];
  kaomoji: DrawnKaomoji<E>;
  /** One eye's layers, in dot radii about the eye's centre, +x towards the nose. */
  eye(spec: DrawnEye<F>, ctx: EyeContext): FaceLayer[];
  /** Layers between the eyes, about the midpoint, x to the right on screen: a bridge, a visor. */
  plate?(left: DrawnEye<F>, right: DrawnEye<F>, ctx: EyeContext): FaceLayer[];
  /** Layers inside the mouth, about the mouth's anchor: a tongue, teeth. */
  inMouth?(ctx: MouthContext): FaceLayer[];
}

/** Any design, as the registry and the renderers see it. */
export type AnyFaceDesign = FaceDesign<string, string>;
