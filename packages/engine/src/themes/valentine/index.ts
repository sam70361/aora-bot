/**
 * The Valentine's Day theme: `installTheme(VALENTINE)`, or `await loadTheme('valentine')`.
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

export const VALENTINE: ThemePackage = {
  definition: DEFINITION,
  art: ART,
  faces: FACES,
  cast: CAST,
  variants: SKINS,
  motions: MOTIONS,
  decor: DECOR,
  extras: EXTRAS,
  colors: [
    {
      id: 'wine',
      value: '#A3203D',
      ink: { light: '#A3203D', dark: '#B42B4A' },
      gradient: { lightFrom: '#BE3554', lightTo: '#82162F', darkFrom: '#C94060', darkTo: '#901D38' },
    },
    {
      id: 'plum',
      value: '#8A62C4',
      // One ink on both pages, as the lab's sheet: a lighter dark-page ink would cross the candy face's split.
      ink: { light: '#8A62C4', dark: '#8A62C4' },
      gradient: { lightFrom: '#A27FD5', lightTo: '#6E4AA8', darkFrom: '#A27FD5', darkTo: '#6E4AA8' },
    },
  ],
  labels: {
    shapes: SHAPE_LABELS,
    variants: { candy: { en: 'Candy Gloss', zh: '糖果亮面' } },
    colors: { wine: { en: 'Wine', zh: '酒红' }, plum: { en: 'Plum', zh: '深紫' } },
  },
};
