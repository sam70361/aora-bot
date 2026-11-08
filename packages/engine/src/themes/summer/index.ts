/**
 * The Summer theme: `installTheme(SUMMER)`, or `await loadTheme('summer')`.
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

export const SUMMER: ThemePackage = {
  definition: DEFINITION,
  art: ART,
  faces: FACES,
  cast: CAST,
  variants: SKINS,
  colors: [
    {
      id: 'lagoon',
      value: '#1F5E6C',
      ink: { light: '#1F5E6C', dark: '#2A7383' },
      gradient: { lightFrom: '#2F7A8A', lightTo: '#164651', darkFrom: '#3A8999', darkTo: '#1F5866' },
    },
    {
      id: 'lemon',
      value: '#F7CC33',
      ink: { light: '#FFD84A', dark: '#F2CC45' },
      gradient: { lightFrom: '#FFE680', lightTo: '#EDBD1F', darkFrom: '#F2CC45', darkTo: '#C9A52E' },
    },
    {
      id: 'aqua',
      value: '#14B0A6',
      ink: { light: '#1FBFB4', dark: '#1DB0A6' },
      gradient: { lightFrom: '#45D0C6', lightTo: '#119A91', darkFrom: '#1DB0A6', darkTo: '#14857D' },
    },
    {
      id: 'sand',
      value: '#E8C68A',
      ink: { light: '#F2D39C', dark: '#E6C893' },
      gradient: { lightFrom: '#F8E2B8', lightTo: '#DDB874', darkFrom: '#E6C893', darkTo: '#C4A56E' },
    },
    {
      id: 'grass',
      value: '#3FB24B',
      ink: { light: '#4FC35A', dark: '#49B554' },
      gradient: { lightFrom: '#72D47B', lightTo: '#35A140', darkFrom: '#49B554', darkTo: '#378C40' },
    },
  ],
  labels: {
    shapes: SHAPE_LABELS,
    variants: { soda: { en: 'Soda Pop', zh: '汽水波普' } },
    colors: {
      lagoon: { en: 'Lagoon', zh: '潟湖' },
      lemon: { en: 'Lemon', zh: '柠檬黄' },
      aqua: { en: 'Aqua', zh: '海水青' },
      sand: { en: 'Sand', zh: '沙滩色' },
      grass: { en: 'Grass', zh: '叶绿' },
    },
  },
  motions: MOTIONS,
  decor: DECOR,
  extras: EXTRAS,
};
