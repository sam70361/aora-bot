/**
 * The roster's art, one file per family of `SHAPE_FAMILIES`.
 *
 * Every character is drawn in a 100 x 100 box, as a designer draws it, and
 * the registry turns that into the points the rest of the engine works on.
 * They share one flat, round, friendly style: low, gradual curvature, no sharp
 * tips, and a calm patch in the middle for the face.
 *
 * - `body` is the one outline that morphs, fits the face and carries the
 *   belts. It is an SVG path, or a loop of on-curve points from `loops.ts`.
 * - `parts` are the rest of the figure, drawn over or behind the body: more of
 *   the same ink (`body` — ears, an antenna) and accessories in their own
 *   tone (`leaf`, `inner`, `hair`). They overlap the body slightly so the figure has
 *   no seam, and they are normalised with the body's own transform so they
 *   stay glued to it.
 * - `face` is where the middle of the face goes, which is where the face
 *   fitter starts looking.
 *
 * A character can also be another one wearing props (`PropArt`): its base's
 * body and face, with props drawn in front of them.
 *
 * A new character goes in its family's file; a new family gets a file and a
 * line below. `FamilyArt` and the `Record<CoreShapeId, …>` type make the
 * compiler reject a character that is listed in `ALL_SHAPE_FAMILIES` but not
 * drawn. A theme's characters are drawn in its own entry (`themes/<id>/`).
 */
import type { CoreShapeId } from '../../core/types.js';
import type { CharacterArt } from './art.js';
import { COAL } from './coal.js';
import { CRITTER } from './critter.js';
import { FIGURE } from './figure.js';
import { FRUIT } from './fruit.js';
import { GARDEN } from './garden.js';
import { OBJECT } from './object.js';
import { PEOPLE } from './people.js';
import { PETAL } from './petal.js';
import { POLYGON } from './polygon.js';
import { RECT } from './rect.js';
import { ROUND } from './round.js';
import { SEA } from './sea.js';
import { TREAT } from './treat.js';

export type { ArtPart, CharacterArt, DrawnArt, PropArt } from './art.js';

export const CHARACTERS: Record<CoreShapeId, CharacterArt> = {
  ...ROUND,
  ...RECT,
  ...POLYGON,
  ...PETAL,
  ...GARDEN,
  ...FRUIT,
  ...TREAT,
  ...FIGURE,
  ...OBJECT,
  ...SEA,
  ...CRITTER,
  ...PEOPLE,
  ...COAL,
};
