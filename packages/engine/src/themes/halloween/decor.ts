/**
 * The Halloween mood decorations: the lab sticker sheet's doodles round the
 * figure, in its pumpkin, purple, lime, gold, lilac, teal and pink, each a
 * palette colour (or one derived from it) so it turns with the page. Glyphs
 * are in a 24-unit box; lines are 2.6 wide on the doodle skin and 3.2 on the
 * grainy one, which also scatters confetti round every set.
 *
 * The engine's own effects stay (the Zz, the heart, the thinking dots, an
 * activity's arrows), so a set leaves out the lab doodle that would repeat
 * one, and the rest keep clear of it.
 */
import { SHAPE_SPACE } from '../../core/types.js';
import type { CharacterState } from '../../motion/states.js';
import type { DecorGlyph, DecorItem, DecorPaint, DecorSpec } from '../extras/index.js';

const GOLD: DecorPaint = { color: 'yellow' };
const PUMPKIN: DecorPaint = { color: 'orange' };
const PURPLE: DecorPaint = { color: 'violet' };
const RED: DecorPaint = { color: 'red' };
const PINK: DecorPaint = { color: 'pink' };
const TEAL: DecorPaint = { color: 'cyan' };
/** Lilac held deep enough to read on a light page. */
const LILAC: DecorPaint = { from: { color: 'lilac' }, lightness: [0.62, 0.78] };
/** The sheet's lime, which the palette lacks: green made light and vivid. */
const LIME: DecorPaint = { from: { color: 'green' }, lightness: [0.8, 0.88], chroma: 0.19 };
/** The sheet's cream, a near-white on a dark page that turns deep on a light one. */
const CREAM: DecorPaint = { from: 'contrast', mix: { with: { color: 'cream' }, share: 30 } };

const f2 = (n: number) => Math.round(n * 100) / 100;

const disc = (cx: number, cy: number, r: number) =>
  `M${f2(cx - r)} ${f2(cy)}a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0Z`;

/** A five-pointed star, points `R` and dents `r` from (cx, cy), the first point straight up. */
function star(cx: number, cy: number, R: number, r: number): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${f2(cx + k * Math.cos(a))} ${f2(cy + k * Math.sin(a))}`;
  }
  return `${d}Z`;
}

/** A spiral out from the middle, three and a half turns of it. */
function spiral(): string {
  let d = '';
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * 3.4 * Math.PI;
    const r = 0.6 + 1.5 * t;
    d += `${i ? 'L' : 'M'}${f2(12 + r * Math.cos(t))} ${f2(12 + r * Math.sin(t))}`;
  }
  return d;
}

const STAR = star(12, 12.8, 9.6, 4.4);

/** The lab's doodles with lines `w` wide. */
function glyphs(w: number): Readonly<Record<string, DecorGlyph>> {
  return {
    sparkle: {
      layers: [
        {
          d: 'M12 1.5C12.8 8.4 15.6 11.2 22.5 12C15.6 12.8 12.8 15.6 12 22.5C11.2 15.6 8.4 12.8 1.5 12C8.4 11.2 11.2 8.4 12 1.5Z',
        },
      ],
    },
    star: { layers: [{ d: STAR }, { d: STAR, stroke: 2.4 }] },
    dashes: { layers: [{ d: 'M2.5 16 8.5 17M5 7.5 10 11.2M13.8 2.5 14.6 8.6', stroke: w }] },
    swirl: { layers: [{ d: spiral(), stroke: w }] },
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
          stroke: w,
        },
      ],
    },
    drop: { layers: [{ d: 'M12 2.5C12 2.5 5 11 5 15.2A7 7 0 0 0 19 15.2C19 11 12 2.5 12 2.5Z' }] },
    question: {
      layers: [
        { d: 'M7.5 8a4.5 4.5 0 1 1 6.6 4c-1.5.8-2.1 1.8-2.1 3.3', stroke: w },
        { d: disc(12, 20.5, w * 0.7) },
      ],
    },
    plus: { layers: [{ d: 'M12 3v18M3 12h18', stroke: w }] },
    wave: { layers: [{ d: 'M2 12q2.5-5 5 0t5 0 5 0 5 0', stroke: w }] },
    bat: {
      layers: [
        {
          d: 'M12 9.5 14.5 6.5 21.5 7.5 19.8 10.4 21 13.2 17 12.2 15 15 12 13 9 15 7 12.2 3 13.2 4.2 10.4 2.5 7.5 9.5 6.5Z',
        },
        {
          d: 'M12 9.5 14.5 6.5 21.5 7.5 19.8 10.4 21 13.2 17 12.2 15 15 12 13 9 15 7 12.2 3 13.2 4.2 10.4 2.5 7.5 9.5 6.5Z',
          stroke: 1.2,
        },
      ],
    },
    bubble: { layers: [{ d: disc(12, 12, 8), stroke: 3.2 }, { d: disc(9.2, 9.2, 2.2) }] },
  };
}

/** Widths are percentages of the figure box (`SHAPE_SPACE`). */
const across = (percent: number) => f2((percent * SHAPE_SPACE) / 100);

const item = (
  glyph: string,
  paint: DecorPaint,
  zone: DecorItem['zone'],
  width: number,
  turn: number,
  kind?: NonNullable<DecorItem['animation']>['kind'],
): DecorItem => ({
  glyph,
  paint,
  zone,
  size: across(width),
  ...(turn ? { turn } : null),
  ...(kind ? { animation: { kind } } : null),
});

const JOY = [
  item('sparkle', GOLD, 'top-left', 20, 0, 'twinkle'),
  item('dashes', GOLD, 'top-right', 22, 0, 'flick'),
  item('star', PUMPKIN, 'right', 13, 14, 'spin'),
  item('dot', PURPLE, 'bottom-left', 7, 0, 'float'),
];
/** The lab's Zz is the engine's own here. */
const SLEEP = [
  item('moon', GOLD, 'top-left', 20, -12, 'float'),
  item('plus', CREAM, 'right', 9, 0, 'twinkle'),
  item('dot', LILAC, 'bottom-left', 6, 0, 'twinkle'),
];
const THINK = [
  item('swirl', PUMPKIN, 'top-left', 18, 0, 'spin'),
  item('question', LIME, 'top', 18, 10, 'bob'),
  item('dot', LIME, 'right', 6, 0, 'float'),
  item('dot', PURPLE, 'right', 4.5, 0, 'float'),
];
const MAD = [
  item('anger', RED, 'top-right', 18, 0, 'throb'),
  item('wave', PUMPKIN, 'top-left', 18, -20, 'wiggle'),
  item('dashes', PUMPKIN, 'right', 16, 80, 'flick'),
  item('dot', RED, 'bottom-left', 6, 0, 'float'),
];
/** The lab's bang is the engine's strokes or `!` here. */
const STARTLE = [
  item('dashes', GOLD, 'top-left', 22, -80, 'flick'),
  item('drop', TEAL, 'right', 9, 20, 'float'),
  item('plus', PUMPKIN, 'bottom-left', 9, 0, 'twinkle'),
];
const SAD = [
  item('drop', TEAL, 'top-left', 11, -10, 'float'),
  item('wave', LILAC, 'top-right', 18, 0, 'wiggle'),
  item('dot', TEAL, 'right', 5, 0, 'float'),
];
const SHY = [
  item('heart', PINK, 'top-right', 16, 12, 'throb'),
  item('heart', PINK, 'top-left', 10, -14, 'float'),
  item('sparkle', CREAM, 'right', 10, 0, 'twinkle'),
];
const IDLE = [
  item('star', GOLD, 'top-left', 12, -10, 'twinkle'),
  item('sparkle', LILAC, 'top-right', 13, 0, 'twinkle'),
  item('dot', PUMPKIN, 'right', 5, 0, 'float'),
];

/** The grainy skin's confetti, held still so a set keeps to its few moving doodles. */
const CONFETTI = [
  item('bat', PURPLE, 'top', 13, -8),
  item('sparkle', LIME, 'bottom-right', 9, 0),
  item('moon', PUMPKIN, 'left', 9, 20),
  item('star', PINK, 'bottom', 8, 10),
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

const MOODS: DecorSpec['moods'] = {
  calm: IDLE,
  bright: JOY,
  heated: MAD,
  low: SAD,
  tense: STARTLE,
  drowsy: SLEEP,
};
const STATES: DecorSpec['states'] = Object.fromEntries(
  GROUPS.flatMap(([states, set]) => states.map((state) => [state, set])),
);

/**
 * The doodle skin's sets, kept off most of its die-cut edge (about 16 units
 * past the figure): further out, the large ones find no room in the box.
 */
export const DECOR: DecorSpec = { glyphs: glyphs(2.6), gap: 10, moods: MOODS, states: STATES };

/** The grainy skin's: heavier lines, closer in (it has no edge), and the confetti round every set. */
export const GRAINY_DECOR: DecorSpec = {
  glyphs: glyphs(3.2),
  gap: 8,
  moods: MOODS,
  states: STATES,
  always: CONFETTI,
};
