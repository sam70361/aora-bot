/**
 * The Spring Festival theme: `installTheme(SPRING_FESTIVAL)`, or
 * `await loadTheme('spring-festival')`.
 *
 * Plain data and painters with no state of the engine, so this entry installs
 * into whichever copy of the engine is handed it.
 */
import { EXTRAS } from '../extras/index.js';
import type { ThemePackage } from '../types.js';
import { ART } from './art.generated.js';
import { CAST, SHAPE_LABELS } from './cast.generated.js';
import { DECOR } from './decor.js';
import { DEFINITION } from './definition.js';
import { FACES } from './faces.generated.js';
import { MOTIONS } from './motions.js';
import { SKINS } from './skins.js';

export const SPRING_FESTIVAL: ThemePackage = {
  definition: DEFINITION,
  art: ART,
  faces: FACES,
  cast: CAST,
  variants: SKINS,
  motions: MOTIONS,
  decor: DECOR,
  extras: EXTRAS,
  colors: [],
  labels: { shapes: SHAPE_LABELS, variants: { papercut: { en: 'Paper Cut', zh: '剪纸' } } },
};
