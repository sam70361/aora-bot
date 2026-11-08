import type { ThemeMember, ThemeSource } from '../types.js';
import { CAST, MEMBERS } from './cast.generated.js';

/** Listed members the theme shows, with the shapes they wear and the sheet colour each is shown in. */
const BORROWED = [
  ['luna', 'crescent', 'yellow'],
  ['lumi', 'bulb', 'yellow'],
  ['orbi', 'planet', 'indigo'],
] as const;

const ALL: readonly ThemeMember[] = [
  ...MEMBERS,
  ...BORROWED.map(([id, , color]): ThemeMember => ({ id, kind: 'borrowed', color })),
];

export const DEFINITION: ThemeSource = {
  id: 'mid-autumn',
  name: { en: 'Mid-Autumn', zh: '中秋节' },
  cast: ALL.map((member) => member.id),
  members: ALL,
  shape: { open: [...CAST.map((member) => member.shape), ...BORROWED.map(([, shape]) => shape)] },
  color: {
    open: ['ivory', 'cream', 'yellow', 'orange', 'red', 'crust', 'jade', 'peel', 'blush', 'indigo', 'night'],
  },
  style: {
    open: [
      { style: 'vector', variant: 'lantern' },
      { style: 'vector', variant: 'solid' },
      { style: 'vector', variant: 'soft' },
    ],
  },
  face: { open: ['cute', 'button', 'glossy', 'sparkle'] },
  /** Every state the engine has, starting from a happy one. */
  state: { start: 'happy' },
};
