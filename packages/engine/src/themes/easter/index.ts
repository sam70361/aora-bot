/**
 * The Easter theme: `installTheme(EASTER)`, or `await loadTheme('easter')`.
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

export const EASTER: ThemePackage = {
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
      id: 'mint',
      value: '#9FDDBF',
      ink: { light: '#A8E4C8', dark: '#9AD9BB' },
      gradient: { lightFrom: '#C4EEDA', lightTo: '#86CDAB', darkFrom: '#B6E6CF', darkTo: '#7EC2A2' },
    },
    {
      id: 'carrot',
      value: '#F7944C',
      ink: { light: '#FF9C55', dark: '#F5964F' },
      gradient: { lightFrom: '#FFB680', lightTo: '#EC8236', darkFrom: '#FBAE76', darkTo: '#E07B33' },
    },
    {
      id: 'caramel',
      value: '#C4A065',
      ink: { light: '#CCA86C', dark: '#C9A66A' },
      gradient: { lightFrom: '#DDBF8C', lightTo: '#B48F54', darkFrom: '#D8BA87', darkTo: '#AD8A50' },
    },
  ],
  labels: {
    shapes: SHAPE_LABELS,
    variants: { pastel: { en: 'Pastel Crayon', zh: '粉彩蜡笔' } },
    colors: {
      mint: { en: 'Mint', zh: '薄荷' },
      carrot: { en: 'Carrot', zh: '胡萝卜' },
      caramel: { en: 'Caramel', zh: '焦糖' },
    },
  },
};
