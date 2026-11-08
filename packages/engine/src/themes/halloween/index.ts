/**
 * The Halloween theme: `installTheme(HALLOWEEN)`, or `await loadTheme('halloween')`.
 *
 * Plain data and painters with no import of the engine at run time, so this
 * entry installs into whichever copy of the engine is handed it.
 */
import { EXTRAS } from '../extras/index.js';
import type { ThemePackage } from '../types.js';
import { ART } from './art.generated.js';
import { CAST } from './cast.js';
import { DECOR } from './decor.js';
import { DEFINITION } from './definition.js';
import { FACES } from './faces.generated.js';
import { LABELS } from './labels.js';
import { MOTIONS } from './motions.js';
import { SKINS } from './skins.js';

export const HALLOWEEN: ThemePackage = {
  definition: DEFINITION,
  art: ART,
  faces: FACES,
  cast: CAST,
  variants: SKINS,
  motions: MOTIONS,
  decor: DECOR,
  colors: [],
  labels: LABELS,
  extras: EXTRAS,
};
