import type { PartTone, Point, ShapeFamily, ShapeFamilyId } from '../../core/types.js';
import { LOOPS } from '../loops.js';

/** One character as a designer draws it, in a 100 x 100 box. */
export interface CharacterArt {
  body: string | { loop: readonly number[] };
  parts?: readonly { tone: PartTone; d: string }[];
  face: Point;
  /** Horizontal nudge for the left eye, as `ShapeSource.leftDX`. */
  leftDX?: number;
}

/** The art of one family: exactly the ids `SHAPE_FAMILIES` lists for it, no more and no fewer. */
export type FamilyArt<F extends ShapeFamilyId> = Record<
  Extract<ShapeFamily, { id: F }>['shapes'][number],
  CharacterArt
>;

/** A body drawn as a point loop in `loops.ts`. */
export const loop = (id: keyof typeof LOOPS): Pick<CharacterArt, 'body' | 'face'> => ({
  body: { loop: LOOPS[id].points },
  face: LOOPS[id].face,
});
