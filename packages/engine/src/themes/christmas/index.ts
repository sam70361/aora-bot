/**
 * The Christmas theme: `installTheme(CHRISTMAS)`, or `await loadTheme('christmas')`.
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

export const CHRISTMAS: ThemePackage = {
  definition: DEFINITION,
  art: ART,
  faces: FACES,
  cast: CAST,
  variants: SKINS,
  colors: [
    {
      id: 'peach',
      value: '#F0BF99',
      ink: { light: '#F4C6A2', dark: '#EBBD99' },
      gradient: { lightFrom: '#F9DCC4', lightTo: '#E6AC82', darkFrom: '#F3D2B6', darkTo: '#DAA27A' },
    },
    {
      id: 'pine',
      value: '#2A6E4A',
      ink: { light: '#2F7650', dark: '#37845A' },
      gradient: { lightFrom: '#44946A', lightTo: '#255F41', darkFrom: '#4DA076', darkTo: '#2B6B4A' },
    },
    {
      id: 'crimson',
      value: '#C8353A',
      ink: { light: '#CF3A3F', dark: '#D8474C' },
      gradient: { lightFrom: '#E05A5E', lightTo: '#B02A30', darkFrom: '#E5666A', darkTo: '#BA3036' },
    },
    {
      id: 'snow',
      value: '#F3E6CA',
      ink: { light: '#FBF0DA', dark: '#F2E6CE' },
      gradient: { lightFrom: '#FFF9EC', lightTo: '#EFDFC0', darkFrom: '#FAF1E0', darkTo: '#E5D5B5' },
    },
  ],
  labels: {
    shapes: SHAPE_LABELS,
    variants: { felt: { en: 'Felt', zh: '毛毡' } },
    colors: {
      peach: { en: 'Peach', zh: '蜜桃' },
      pine: { en: 'Pine', zh: '松绿' },
      crimson: { en: 'Crimson', zh: '绯红' },
      snow: { en: 'Snow', zh: '雪白' },
    },
  },
  decor: DECOR,
  motions: MOTIONS,
  extras: EXTRAS,
};
