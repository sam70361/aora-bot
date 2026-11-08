/**
 * The Valentine mood decorations: the lab candy sheet's doodles round the
 * figure (hearts, sparkles, a moon, a swirl, anger marks, a broken heart, a
 * tear), each in one of the sheet's colours as a palette colour, so it turns
 * with the page. Glyphs are the lab's, in a 24-unit box with lines 2.6 wide.
 *
 * The engine's own effects stay (the Zz, the `!` and the sweat strokes), so
 * a set leaves out the lab doodle that would repeat one, and the rest keep
 * clear of it.
 */
import { VIEWBOX } from '../../core/types.js';
import type { CharacterState } from '../../motion/states.js';
import type { DecorGlyph, DecorItem, DecorPaint, DecorSpec } from '../extras/index.js';

const ROSE: DecorPaint = { color: 'red' };
const WINE: DecorPaint = { color: 'wine' };
const BLUSH: DecorPaint = { color: 'blush' };
const GOLD: DecorPaint = { color: 'yellow' };
const LILAC: DecorPaint = { color: 'lilac' };
const PLUM: DecorPaint = { color: 'plum' };

/** The doodles' line width, in the glyph's box. */
const LINE = 2.6;

const f2 = (n: number) => Math.round(n * 100) / 100;

const disc = (cx: number, cy: number, r: number) =>
  `M${f2(cx - r)} ${f2(cy)}a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0Z`;

/** A spiral out from the middle, a little under two turns of it. */
function spiral(): string {
  let d = '';
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * 3.4 * Math.PI;
    const r = 0.6 + 1.5 * t;
    d += `${i ? 'L' : 'M'}${f2(12 + r * Math.cos(t))} ${f2(12 + r * Math.sin(t))}`;
  }
  return d;
}

const HEART =
  'M12 21C5 16 2.5 12.5 2.5 8.6 2.5 5.6 4.8 3.5 7.4 3.5 9.4 3.5 11 4.6 12 6.4 13 4.6 14.6 3.5 16.6 3.5 19.2 3.5 21.5 5.6 21.5 8.6 21.5 12.5 19 16 12 21Z';

const GLYPHS: Readonly<Record<string, DecorGlyph>> = {
  sparkle: {
    layers: [
      {
        d: 'M12 1.5C12.8 8.4 15.6 11.2 22.5 12C15.6 12.8 12.8 15.6 12 22.5C11.2 15.6 8.4 12.8 1.5 12C8.4 11.2 11.2 8.4 12 1.5Z',
      },
    ],
  },
  heart: { layers: [{ d: HEART }] },
  heartline: { layers: [{ d: HEART, stroke: LINE }] },
  /** A heart with a crack through it, the crack showing the page. */
  broken: {
    layers: [{ d: HEART }, { d: 'M12 6.4 10 10.5 13.6 13 11.2 17.5', stroke: LINE * 0.8, paint: 'page' }],
  },
  dashes: { layers: [{ d: 'M2.5 16 8.5 17M5 7.5 10 11.2M13.8 2.5 14.6 8.6', stroke: LINE }] },
  swirl: { layers: [{ d: spiral(), stroke: LINE }] },
  moon: { layers: [{ d: 'M15.5 2.5A9.8 9.8 0 1 0 21.5 16 7.8 7.8 0 0 1 15.5 2.5Z' }] },
  dot: { layers: [{ d: disc(12, 12, 5.5) }] },
  anger: {
    layers: [
      {
        d: 'M9.5 3v4.5q0 2-2 2H3M14.5 3v4.5q0 2 2 2H21M9.5 21v-4.5q0-2-2-2H3M14.5 21v-4.5q0-2 2-2H21',
        stroke: LINE,
      },
    ],
  },
  drop: { layers: [{ d: 'M12 2.5C12 2.5 5 11 5 15.2A7 7 0 0 0 19 15.2C19 11 12 2.5 12 2.5Z' }] },
  question: {
    layers: [
      { d: 'M7.5 8a4.5 4.5 0 1 1 6.6 4c-1.5.8-2.1 1.8-2.1 3.3', stroke: LINE },
      { d: disc(12, 20.5, LINE * 0.7) },
    ],
  },
  plus: { layers: [{ d: 'M12 3v18M3 12h18', stroke: LINE }] },
};

/** Widths are percentages of the character's whole drawing box, its margin included (`VIEWBOX`), not of the figure. */
const across = (percent: number) => f2((percent * VIEWBOX.width) / 100);

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
  item('heart', ROSE, 'top-left', 16, -14, 'float'),
  item('sparkle', GOLD, 'top-right', 18, 0, 'twinkle'),
  item('heart', BLUSH, 'right', 11, 16, 'throb'),
  item('dot', LILAC, 'bottom-left', 6, 0, 'float'),
];
/** The lab's rising Zz is the engine's own here; a twinkling dot takes its place in the set. */
const SLEEP = [
  item('moon', GOLD, 'top-left', 18, -12, 'float'),
  item('heartline', BLUSH, 'right', 10, 10, 'twinkle'),
  item('dot', LILAC, 'bottom-left', 5, 0, 'twinkle'),
];
const THINK = [
  item('swirl', PLUM, 'top-left', 18, 0, 'spin'),
  item('question', ROSE, 'top-right', 18, 10, 'bob'),
  item('dot', BLUSH, 'right', 6, 0, 'float'),
  item('dot', LILAC, 'right', 4.5, 0, 'float'),
];
const MAD = [
  item('anger', WINE, 'top-right', 18, 0, 'throb'),
  item('broken', ROSE, 'top-left', 15, -14, 'wiggle'),
  item('dashes', WINE, 'right', 15, 80, 'flick'),
];
/** The lab's bang is the engine's `!` or sweat strokes here. */
const STARTLE = [
  item('dashes', GOLD, 'top-left', 22, -80, 'flick'),
  item('heart', BLUSH, 'right', 9, 20, 'float'),
  item('plus', GOLD, 'bottom-left', 9, 0, 'twinkle'),
];
const SAD = [
  item('drop', LILAC, 'top-left', 11, -10, 'float'),
  item('broken', BLUSH, 'top-right', 16, 8, 'wiggle'),
  item('dot', LILAC, 'right', 5, 0, 'float'),
];
const SHY = [
  item('heart', ROSE, 'top-right', 16, 12, 'throb'),
  item('heart', BLUSH, 'top-left', 11, -14, 'float'),
  item('sparkle', GOLD, 'right', 10, 0, 'twinkle'),
];
const IDLE = [
  item('sparkle', GOLD, 'top-left', 13, 0, 'twinkle'),
  item('heartline', ROSE, 'top-right', 13, 10, 'float'),
  item('dot', BLUSH, 'right', 5, 0, 'float'),
];

/**
 * The lab sorted states into its own groups, which the engine's moods only
 * partly follow (it files thinking under calm, shy and bouncing under bright
 * or calm, curiosity under tense): each listed state keeps its lab group.
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

export const DECOR: DecorSpec = {
  glyphs: GLYPHS,
  moods: { calm: IDLE, bright: JOY, heated: MAD, low: SAD, tense: STARTLE, drowsy: SLEEP },
  states: Object.fromEntries(GROUPS.flatMap(([states, set]) => states.map((state) => [state, set]))),
};
