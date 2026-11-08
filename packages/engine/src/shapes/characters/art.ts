import type {
  AnyShapeFamily,
  AnyShapeFamilyId,
  PartColor,
  PartTone,
  Point,
  ShapeId,
} from '../../core/types.js';
import { LOOPS } from '../loops.js';

/**
 * On-curve points of a loop, flat as `x, y, x, y`: an array, or the same
 * numbers in one space-separated string, which is how baked art is stored so
 * a bundler does not spread thousands of numbers over a line each.
 */
export type LoopPoints = readonly number[] | string;

/**
 * A piece of a character besides its body: an SVG path, or a loop of on-curve points as a body may be.
 * `minPx` is the smallest width, in CSS pixels across the character, at which the piece is drawn; `plain` asks a
 * skin to leave its marks (stitches, hatching) off it. `motion` names a signature motion its theme declares
 * (`ThemePackage.motions`), played about `pivot` (in the same box as the art; the piece's centre by default).
 */
export type ArtPart = {
  tone: PartTone;
  color?: PartColor;
  minPx?: number;
  plain?: boolean;
  /** A prop drawn under the face (make-up, a painted mark): the face fit does not keep off it. */
  underFace?: boolean;
  motion?: string;
  pivot?: Point;
} & ({ d: string } | { loop: LoopPoints });

/**
 * A whole figure's signature motions (`ThemePackage.motions`), played about
 * `pivot` in the art's box (where each motion's `origin` puts it in the
 * figure's box by default), inside the state's own motion.
 */
export interface FigureMotion {
  motion?: string | readonly string[];
  pivot?: Point;
  /**
   * The face box as the designer placed it (centre and half-extents, in the
   * art's box), taken as it is instead of fitting one.
   */
  faceBox?: { x: number; y: number; sx: number; sy: number };
  /**
   * What its uncoloured hair is shaded towards, as a share of the ink's
   * lightness (`0.5` is a tone half as light), in place of the palette's hair
   * shade; a skin's own `hairShade` still has the last word.
   */
  hairDeep?: number;
}

/** One character as a designer draws it, in a 100 x 100 box. */
export interface DrawnArt extends FigureMotion {
  body: string | { loop: LoopPoints };
  parts?: readonly ArtPart[];
  face: Point;
  /** Horizontal nudge for the left eye, as `ShapeSource.leftDX`. */
  leftDX?: number;
}

/**
 * A member of the roster wearing props: the `base` body with its parts and
 * face, scaled by `scale` about `at` in the 100 x 100 box, and `props` drawn
 * in front of it in the same box.
 */
export interface PropArt extends FigureMotion {
  base: ShapeId;
  at: Point;
  scale: number;
  props: readonly ArtPart[];
  /** The base's parts a prop takes the place of, by index: left out. */
  drop?: readonly number[];
  /** Colours given to the base's own parts, by index. */
  tint?: Readonly<Record<number, PartColor>>;
  /** The base's parts a skin leaves undecorated (`ArtPart.plain`), by index. */
  plain?: readonly number[];
}

export type CharacterArt = DrawnArt | PropArt;

/** The art of one family: exactly the ids `ALL_SHAPE_FAMILIES` lists for it, no more and no fewer. */
export type FamilyArt<F extends AnyShapeFamilyId> = Record<
  Extract<AnyShapeFamily, { id: F }>['shapes'][number],
  CharacterArt
>;

/** A loop's points as numbers. */
export const loopPoints = (points: LoopPoints): readonly number[] =>
  typeof points === 'string' ? points.split(' ').map(Number) : points;

/** A body drawn as a point loop in `loops.ts`. */
export const loop = (id: keyof typeof LOOPS): Pick<DrawnArt, 'body' | 'face'> => ({
  body: { loop: LOOPS[id].points },
  face: LOOPS[id].face,
});
