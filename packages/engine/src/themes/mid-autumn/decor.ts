/**
 * The Mid-Autumn mood decorations: the lab's doodles round the figure, in the
 * sheet's lamplight colours (gold, lantern orange, red, jade, pink and a pale
 * moon gold held where it still reads on a light page). Glyphs are in a
 * 24-unit box, lines 2.6 wide.
 */
import { SHAPE_SPACE } from '../../core/types.js';
import type { CharacterState } from '../../motion/states.js';
import type { DecorItem, DecorPaint, DecorSpec } from '../extras/index.js';

const W = 2.6;

const GOLD: DecorPaint = { color: 'yellow' };
const LANTERN: DecorPaint = { color: 'orange' };
const RED: DecorPaint = { color: 'red' };
const JADE: DecorPaint = { color: 'jade' };
const PINK: DecorPaint = { color: 'pink' };
/** Moonlight: a pale gold, light enough to glow on a night page and still seen on a light one. */
const MOON: DecorPaint = { from: { color: 'butter' }, lightness: [0.8, 0.86], chroma: 0.11 };

const f2 = (n: number) => Math.round(n * 100) / 100;

const disc = (cx: number, cy: number, r: number) =>
  `M${f2(cx - r)} ${f2(cy)}a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0Z`;

/** An ellipse centred on (cx, cy), `ry` along an axis turned `turn` degrees from upright. */
function ellipse(cx: number, cy: number, rx: number, ry: number, turn: number): string {
  const a = (turn * Math.PI) / 180;
  const ux = -Math.sin(a) * ry;
  const uy = Math.cos(a) * ry;
  return (
    `M${f2(cx + ux)} ${f2(cy + uy)}A${f2(rx)} ${f2(ry)} ${f2(turn)} 1 0 ${f2(cx - ux)} ${f2(cy - uy)}` +
    `A${f2(rx)} ${f2(ry)} ${f2(turn)} 1 0 ${f2(cx + ux)} ${f2(cy + uy)}Z`
  );
}

/** A rounded rectangle from (x, y), `w` by `h`, corners `r`. */
const pill = (x: number, y: number, w: number, h: number, r: number) =>
  `M${f2(x + r)} ${f2(y)}h${f2(w - 2 * r)}a${f2(r)} ${f2(r)} 0 0 1 ${f2(r)} ${f2(r)}v${f2(h - 2 * r)}` +
  `a${f2(r)} ${f2(r)} 0 0 1 ${f2(-r)} ${f2(r)}h${f2(2 * r - w)}a${f2(r)} ${f2(r)} 0 0 1 ${f2(-r)} ${f2(-r)}` +
  `v${f2(2 * r - h)}a${f2(r)} ${f2(r)} 0 0 1 ${f2(r)} ${f2(-r)}Z`;

/** A ten-point star from the top, outer radius `R`, inner `r`. */
function star(cx: number, cy: number, R: number, r: number): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${f2(cx + k * Math.cos(a))} ${f2(cy + k * Math.sin(a))}`;
  }
  return `${d}Z`;
}

/** Four petals round the middle, each turned 45 degrees off the axes. */
const PETALS = [0, 90, 180, 270]
  .map((turn) => {
    const a = ((turn + 45) * Math.PI) / 180;
    return ellipse(12 + 5.4 * Math.sin(a), 12 - 5.4 * Math.cos(a), 4.4, 5.4, turn + 45);
  })
  .join('');

const STAR = star(12, 12.8, 9.6, 4.4);

const GLYPHS: DecorSpec['glyphs'] = {
  sparkle: {
    layers: [
      {
        d: 'M12 1.5C12.8 8.4 15.6 11.2 22.5 12C15.6 12.8 12.8 15.6 12 22.5C11.2 15.6 8.4 12.8 1.5 12C8.4 11.2 11.2 8.4 12 1.5Z',
      },
    ],
  },
  star: { layers: [{ d: STAR }, { d: STAR, stroke: 2.4 }] },
  floret: { layers: [{ d: PETALS }, { d: disc(12, 12, 2.6), paint: LANTERN }] },
  lantern: {
    layers: [
      { d: 'M12 1.5v3M12 20.8v2.4', stroke: 1.6, paint: GOLD },
      { d: `${pill(8.5, 4, 7, 2.4, 1)}${pill(8.5, 18.4, 7, 2.4, 1)}`, paint: GOLD },
      { d: ellipse(12, 12.5, 6.8, 8, 90) },
    ],
  },
  moon: { layers: [{ d: 'M15.5 2.5A9.8 9.8 0 1 0 21.5 16 7.8 7.8 0 0 1 15.5 2.5Z' }] },
  cloud: {
    layers: [{ d: 'M2.5 15.5h13.2a3.6 3.6 0 1 0-3.4-4.8M5.5 19.5h11M8 11.5a3 3 0 1 1 3-3', stroke: W }],
  },
  zz: { layers: [{ d: 'M3 4.5h7.5l-7.5 8h7.5M14 12.5h6.5l-6.5 7h6.5', stroke: W }] },
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
  item('floret', GOLD, 'top-left', 17, 0, 'twinkle'),
  item('lantern', RED, 'top-right', 17, 6, 'bob'),
  item('sparkle', MOON, 'right', 11, 0, 'twinkle'),
];
const SLEEP = [
  item('moon', MOON, 'top-left', 19, -12, 'float'),
  item('zz', MOON, 'top-right', 19, 0, 'rise'),
  item('star', GOLD, 'right', 8, 0, 'twinkle'),
];
const THINK = [
  item('cloud', MOON, 'top-left', 20, 0, 'drift'),
  item('question', GOLD, 'top-right', 17, 10, 'bob'),
  item('dot', GOLD, 'right', 6, 0, 'float'),
];
const MAD = [
  item('anger', RED, 'top-right', 18, 0, 'throb'),
  item('wave', LANTERN, 'top-left', 18, -20, 'wiggle'),
  item('dot', RED, 'bottom-left', 6, 0, 'float'),
];
const STARTLE = [
  item('bang', GOLD, 'top-right', 16, 12, 'throb'),
  item('sparkle', MOON, 'top-left', 14, 0, 'twinkle'),
  item('drop', JADE, 'right', 9, 20, 'float'),
];
const SAD = [
  item('drop', JADE, 'top-left', 11, -10, 'float'),
  item('cloud', MOON, 'top-right', 19, 0, 'drift'),
  item('dot', JADE, 'right', 5, 0, 'float'),
];
const SHY = [
  item('heart', PINK, 'top-right', 16, 12, 'throb'),
  item('heart', PINK, 'top-left', 10, -14, 'float'),
  item('floret', GOLD, 'right', 10, 0, 'twinkle'),
];
const IDLE = [
  item('star', GOLD, 'top-left', 11, -10, 'twinkle'),
  item('sparkle', MOON, 'top-right', 12, 0, 'twinkle'),
  item('dot', LANTERN, 'right', 5, 0, 'float'),
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
 * Every set carries the lab's own version of the state's effect (its Zz, anger
 * mark, `!`, `?`, tear and heart), drawn where the engine's would be, so the
 * sets take the place of the engine's effects rather than doubling them. The
 * lab placed them up to 12 % of the box past its edge, in the card's margin.
 * Sets keep three doodles each: the lab's fourth, a small dot, is left out, as
 * every animated doodle costs a live wall of characters a share of its frame.
 */
export const DECOR: DecorSpec = {
  glyphs: GLYPHS,
  fx: 'replace',
  reach: 0.12,
  moods: { calm: IDLE, bright: JOY, heated: MAD, low: SAD, tense: STARTLE, drowsy: SLEEP },
  states: Object.fromEntries(GROUPS.flatMap(([states, set]) => states.map((state) => [state, set]))),
};
