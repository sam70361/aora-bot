/**
 * The Spring Festival mood decorations: small paper-cut motifs and the usual
 * mood marks round the figure, in the festival's colours (red, gold,
 * tangerine, jade and peach), never cream or ink, so each reads on either
 * page. Glyphs are in a 24-unit box, lines 2.6 wide.
 */
import { SHAPE_SPACE } from '../../core/types.js';
import type { CharacterState } from '../../motion/states.js';
import type { DecorItem, DecorPaint, DecorSpec } from '../extras/index.js';

const W = 2.6;

const RED: DecorPaint = { color: 'red' };
const GOLD: DecorPaint = { color: 'yellow' };
const TANGERINE: DecorPaint = { color: 'orange' };
const JADE: DecorPaint = { color: 'green' };
/** Peach: blush turned towards orange and held at its own lightness. */
const PEACH: DecorPaint = { from: { color: 'blush' }, hue: 19, lightness: [0.78, 0.8] };

const f2 = (n: number) => Math.round(n * 100) / 100;

const disc = (cx: number, cy: number, r: number) =>
  `M${f2(cx - r)} ${f2(cy)}a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0Z`;

/** `n` discs of radius `r` at `dist` round the middle, the first straight up. */
function petals(n: number, dist: number, r: number): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    d += disc(12 + dist * Math.cos(a), 12 + dist * Math.sin(a), r);
  }
  return d;
}

/** `n` spokes from `r0` to `r1` round the middle. */
function rays(n: number, r0: number, r1: number): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    d += `M${f2(12 + r0 * Math.cos(a))} ${f2(12 + r0 * Math.sin(a))}L${f2(12 + r1 * Math.cos(a))} ${f2(12 + r1 * Math.sin(a))}`;
  }
  return d;
}

const GLYPHS: DecorSpec['glyphs'] = {
  plum: { layers: [{ d: petals(5, 6.3, 3.7) }, { d: disc(12, 12, 2.3), paint: GOLD }] },
  sparkle: {
    layers: [
      {
        d: 'M12 1.5C12.8 8.4 15.6 11.2 22.5 12C15.6 12.8 12.8 15.6 12 22.5C11.2 15.6 8.4 12.8 1.5 12C8.4 11.2 11.2 8.4 12 1.5Z',
      },
    ],
  },
  coin: { layers: [{ d: 'M12 2.5a9.5 9.5 0 1 1 0 19a9.5 9.5 0 1 1 0-19zM9.3 9.3h5.4v5.4h-5.4z' }] },
  cloud: {
    layers: [
      { d: 'M4.5 17.5h14a3.6 3.6 0 0 0 0-7.2 5.2 5.2 0 0 0-9.8-1.6A4.4 4.4 0 0 0 4.5 17.5z' },
      { d: 'M9 13.6a2 2 0 1 1 2.6 1.9', stroke: W * 0.55, paint: { color: 'cream' } },
    ],
  },
  burst: { layers: [{ d: rays(8, 4.4, 10.5), stroke: W }, { d: disc(12, 12, 2.2) }] },
  zz: { layers: [{ d: 'M3 4.5h7.5l-7.5 8h7.5M14 12.5h6.5l-6.5 7h6.5', stroke: W }] },
  moon: { layers: [{ d: 'M15.5 2.5A9.8 9.8 0 1 0 21.5 16 7.8 7.8 0 0 1 15.5 2.5Z' }] },
  dot: { layers: [{ d: disc(12, 12, 5.5) }] },
  heart: {
    layers: [
      {
        d: 'M12 21C5 16 2.5 12.5 2.5 8.6 2.5 5.6 4.8 3.5 7.4 3.5 9.4 3.5 11 4.6 12 6.4 13 4.6 14.6 3.5 16.6 3.5 19.2 3.5 21.5 5.6 21.5 8.6 21.5 12.5 19 16 12 21Z',
      },
    ],
  },
  anger: {
    layers: [
      {
        d: 'M9.5 3v4.5q0 2-2 2H3M14.5 3v4.5q0 2 2 2H21M9.5 21v-4.5q0-2-2-2H3M14.5 21v-4.5q0-2 2-2H21',
        stroke: W,
      },
    ],
  },
  drop: { layers: [{ d: 'M12 2.5C12 2.5 5 11 5 15.2A7 7 0 0 0 19 15.2C19 11 12 2.5 12 2.5Z' }] },
  bang: { layers: [{ d: 'M12 3.5v10', stroke: W * 1.5 }, { d: disc(12, 20, W * 0.85) }] },
  question: {
    layers: [
      { d: 'M7.5 8a4.5 4.5 0 1 1 6.6 4c-1.5.8-2.1 1.8-2.1 3.3', stroke: W },
      { d: disc(12, 20.5, W * 0.7) },
    ],
  },
  wave: { layers: [{ d: 'M2 12q2.5-5 5 0t5 0 5 0 5 0', stroke: W }] },
};

/** Widths are percentages of the figure box (`SHAPE_SPACE`). */
const across = (percent: number) => f2((percent * SHAPE_SPACE) / 100);

const item = (
  glyph: string,
  paint: DecorPaint,
  zone: DecorItem['zone'],
  width: number,
  turn: number,
  kind: NonNullable<DecorItem['animation']>['kind'],
): DecorItem => ({
  glyph,
  paint,
  zone,
  size: across(width),
  ...(turn ? { turn } : null),
  animation: { kind },
});

const JOY = [
  item('burst', GOLD, 'top-left', 20, 0, 'twinkle'),
  item('plum', RED, 'top-right', 18, 10, 'spin'),
  item('coin', GOLD, 'right', 12, 14, 'float'),
  item('sparkle', TANGERINE, 'bottom-left', 9, 0, 'twinkle'),
];
const SLEEP = [
  item('moon', GOLD, 'top-left', 18, -12, 'float'),
  item('zz', PEACH, 'top-right', 20, 0, 'rise'),
  item('cloud', JADE, 'right', 16, 0, 'float'),
];
const THINK = [
  item('cloud', JADE, 'top-left', 20, 0, 'float'),
  item('question', RED, 'top-right', 18, 10, 'bob'),
  item('dot', GOLD, 'right', 6, 0, 'float'),
  item('dot', TANGERINE, 'right', 4.5, 0, 'float'),
];
const MAD = [
  item('anger', RED, 'top-right', 18, 0, 'throb'),
  item('burst', TANGERINE, 'top-left', 18, 0, 'throb'),
  item('wave', RED, 'right', 16, 0, 'wiggle'),
];
const STARTLE = [
  item('bang', RED, 'top-right', 16, 12, 'throb'),
  item('burst', GOLD, 'top-left', 20, 0, 'twinkle'),
  item('drop', JADE, 'right', 9, 20, 'float'),
];
const SAD = [
  item('drop', JADE, 'top-left', 11, -10, 'float'),
  item('wave', PEACH, 'top-right', 18, 0, 'wiggle'),
  item('dot', JADE, 'right', 5, 0, 'float'),
];
const SHY = [
  item('heart', RED, 'top-right', 15, 12, 'throb'),
  item('plum', PEACH, 'top-left', 13, -14, 'float'),
  item('sparkle', GOLD, 'right', 10, 0, 'twinkle'),
];
const IDLE = [
  item('plum', RED, 'top-left', 14, -10, 'spin'),
  item('sparkle', GOLD, 'top-right', 12, 0, 'twinkle'),
  item('coin', GOLD, 'right', 8, 0, 'float'),
];

/**
 * The lab sorted states into its own groups, which the engine's moods only
 * partly follow (it files thinking under calm, shy under bright, boredom
 * apart from sleep): each listed state keeps its lab group.
 */
const GROUPS: readonly (readonly [readonly CharacterState[], readonly DecorItem[]])[] = [
  [['happy', 'excited', 'laughing', 'playful', 'proud', 'celebrate', 'bouncing', 'humming'], JOY],
  [['sleeping', 'drowsy', 'bored', 'powering-down', 'waking'], SLEEP],
  [
    [
      'thinking',
      'curious',
      'confused',
      'searching',
      'reading',
      'writing',
      'working',
      'loading',
      'waiting',
      'suspicious',
    ],
    THINK,
  ],
  [['angry', 'refusing'], MAD],
  [['surprised', 'scared', 'alerting', 'notifying'], STARTLE],
  [['sad'], SAD],
  [['shy'], SHY],
];

/**
 * The sets carry the lab's own Zz, question mark and drops, so they take the
 * place of the engine's effects rather than crowding in beside them, and they
 * keep clear of the paper sheet, which reaches about 15 units past the figure.
 * The lab placed them up to 12 % of the box past its edge, in the card's margin.
 */
export const DECOR: DecorSpec = {
  glyphs: GLYPHS,
  fx: 'replace',
  gap: 15,
  reach: 0.12,
  moods: { calm: IDLE, bright: JOY, heated: MAD, low: SAD, tense: STARTLE, drowsy: SLEEP },
  states: Object.fromEntries(GROUPS.flatMap(([states, set]) => states.map((state) => [state, set]))),
};
