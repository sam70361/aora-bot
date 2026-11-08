import type { CastId } from '../../core/cast.js';
import type { ThemeMember, ThemeSource } from '../types.js';
import { CAST } from './cast.js';

/** The members built on a member of the roster, by the member they wear their props over. */
const COMBOS: Readonly<Record<string, CastId>> = {
  witchmochi: 'mochi',
  lanternmiso: 'miso',
  nightcapluna: 'luna',
};

/** Listed members the theme shows besides its own, with the shapes they wear. */
const BORROWED = [
  ['jelly', 'ghost'],
  ['flap', 'bat'],
  ['luna', 'crescent'],
] as const;

const MEMBERS: readonly ThemeMember[] = [
  ...CAST.map(({ id }): ThemeMember =>
    COMBOS[id] ? { id, kind: 'combo', base: COMBOS[id] } : { id, kind: 'new' },
  ),
  ...BORROWED.map(([id]): ThemeMember => ({ id, kind: 'borrowed' })),
];

export const DEFINITION: ThemeSource = {
  id: 'halloween',
  name: { en: 'Halloween', zh: '万圣节' },
  cast: MEMBERS.map((member) => member.id),
  members: MEMBERS,
  shape: { open: [...CAST.map((member) => member.shape), ...BORROWED.map(([, shape]) => shape)] },
  color: {
    open: [
      'orange',
      'violet',
      'night',
      'cream',
      'lilac',
      'green',
      'yellow',
      'cyan',
      'blue',
      'brown',
      'pink',
      'black',
      'gray',
    ],
  },
  style: {
    open: [
      { style: 'vector', variant: 'doodle' },
      { style: 'vector', variant: 'grainy' },
      { style: 'vector', variant: 'solid' },
    ],
  },
  face: { open: ['cute', 'glossy', 'button', 'droopy', 'bigmouth'] },
  state: { start: 'happy' },
};
