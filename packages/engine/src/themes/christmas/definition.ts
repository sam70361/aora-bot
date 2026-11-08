import type { ThemeMember, ThemeSource } from '../types.js';
import { CAST, MEMBERS } from './cast.generated.js';

/** Listed members the theme shows, with the shapes they wear and the sheet colour each is shown in. */
const BORROWED = [
  ['twinkle', 'star', 'yellow'],
  ['joy', 'gift', 'crimson'],
  ['nimbo', 'cloud', 'sky'],
] as const;

const ALL: readonly ThemeMember[] = [
  ...MEMBERS,
  ...BORROWED.map(([id, , color]): ThemeMember => ({ id, kind: 'borrowed', color })),
];

export const DEFINITION: ThemeSource = {
  id: 'christmas',
  name: { en: 'Christmas', zh: '圣诞节' },
  cast: ALL.map((member) => member.id),
  members: ALL,
  shape: { open: [...CAST.map((member) => member.shape), ...BORROWED.map(([, shape]) => shape)] },
  color: {
    open: ['crimson', 'pine', 'snow', 'peach', 'yellow', 'sky', 'cocoa', 'brown', 'night'],
  },
  style: {
    open: [
      { style: 'vector', variant: 'felt' },
      { style: 'vector', variant: 'solid' },
      { style: 'vector', variant: 'soft' },
    ],
  },
  face: { open: ['cute', 'button', 'glossy', 'sparkle'] },
  /** Every state the engine has, starting from a happy one. */
  state: { start: 'happy' },
};
