/**
 * The Mid-Autumn theme: `installTheme(MID_AUTUMN)`, or `await loadTheme('mid-autumn')`.
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

export const MID_AUTUMN: ThemePackage = {
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
      // Dark enough on either page for the white face and the lightened hair of the dark face rule.
      id: 'indigo',
      value: '#2A2F74',
      ink: { light: '#2A2F74', dark: '#292E72' },
      gradient: { lightFrom: '#3A3F8C', lightTo: '#1F2360', darkFrom: '#363B86', darkTo: '#1D205A' },
    },
    {
      id: 'crust',
      value: '#C98A45',
      ink: { light: '#D4914A', dark: '#C98845' },
      gradient: { lightFrom: '#E2A562', lightTo: '#B9773A', darkFrom: '#D39A58', darkTo: '#A86F35' },
    },
    {
      // Light enough on either page to keep the dark face, as the sheet's jade did.
      id: 'jade',
      value: '#3DB98C',
      ink: { light: '#55C79E', dark: '#4FC29A' },
      gradient: { lightFrom: '#74D6B2', lightTo: '#38A67F', darkFrom: '#66CCA6', darkTo: '#349873' },
    },
    {
      id: 'peel',
      value: '#A6CC45',
      ink: { light: '#B6D65C', dark: '#ADCD57' },
      gradient: { lightFrom: '#CBE586', lightTo: '#97BC3E', darkFrom: '#BEDB76', darkTo: '#8DAF39' },
    },
  ],
  labels: {
    shapes: SHAPE_LABELS,
    variants: { lantern: { en: 'Lantern Glow', zh: '夜灯暖光' } },
    colors: {
      indigo: { en: 'Indigo', zh: '夜蓝' },
      crust: { en: 'Crust', zh: '饼皮' },
      jade: { en: 'Jade', zh: '玉绿' },
      peel: { en: 'Pomelo Peel', zh: '柚皮绿' },
    },
  },
};
