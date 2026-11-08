/**
 * The Summer mood decorations: the lab soda sheet's doodles round the figure
 * (a spinning sun, speed dashes, sparkles, soap bubbles, music notes, a moon,
 * a swirl, a question mark, an anger mark, a tear, a wave, hearts), each in
 * one of the sheet's colours as a palette colour, so it turns with the page.
 * Glyphs are the lab's, in a 24-unit box with lines 2.8 wide; every filled
 * glyph is edged in the figure's own deep ink, as the print's ink line is.
 *
 * The engine's own effects stay (the Zz and the `!`), so a set leaves out the
 * lab doodle that would repeat one, and the rest keep clear of it.
 */
import { VIEWBOX } from '../../core/types.js';
import type { CharacterState } from '../../motion/states.js';
import type { DecorGlyph, DecorItem, DecorLayer, DecorPaint, DecorSpec } from '../extras/index.js';

const TEAL: DecorPaint = { color: 'aqua' };
const CORAL: DecorPaint = { color: 'orange' };
const LEMON: DecorPaint = { color: 'lemon' };
const ICE: DecorPaint = { color: 'sky' };
const MELON: DecorPaint = { color: 'pink' };
const RED: DecorPaint = { color: 'red' };
const FOAM: DecorPaint = { color: 'ivory' };
/** The print's ink line, a deep tone of the figure's own ink. */
const EDGE: DecorPaint = { from: 'ink', lightness: [0.18, 0.28] };

/** The doodles' line width, in the glyph's box. */
const LINE = 2.8;

const f2 = (n: number) => Math.round(n * 100) / 100;

const disc = (cx: number, cy: number, r: number) =>
  `M${f2(cx - r)} ${f2(cy)}a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0Z`;

const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${f2(cx - rx)} ${f2(cy)}a${f2(rx)} ${f2(ry)} 0 1 0 ${f2(2 * rx)} 0a${f2(rx)} ${f2(ry)} 0 1 0 ${f2(-2 * rx)} 0Z`;

/** A filled shape edged in the ink line, `edge` units wide. */
const edged = (d: string, edge = 1.3): DecorLayer[] => [{ d }, { d, stroke: edge, paint: EDGE }];

/** Eight short rays round (12, 12), from 7.4 to 10.6 out. */
function rays(): string {
  let d = '';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    d += `M${f2(12 + 7.4 * Math.cos(a))} ${f2(12 + 7.4 * Math.sin(a))}L${f2(12 + 10.6 * Math.cos(a))} ${f2(12 + 10.6 * Math.sin(a))}`;
  }
  return d;
}

const SPARKLE =
  'M12 1.5C12.8 8.4 15.6 11.2 22.5 12C15.6 12.8 12.8 15.6 12 22.5C11.2 15.6 8.4 12.8 1.5 12C8.4 11.2 11.2 8.4 12 1.5Z';
const HEART =
  'M12 21C5 16 2.5 12.5 2.5 8.6 2.5 5.6 4.8 3.5 7.4 3.5 9.4 3.5 11 4.6 12 6.4 13 4.6 14.6 3.5 16.6 3.5 19.2 3.5 21.5 5.6 21.5 8.6 21.5 12.5 19 16 12 21Z';

const GLYPHS: Readonly<Record<string, DecorGlyph>> = {
  sparkle: { layers: edged(SPARKLE) },
  sun: { layers: [...edged(disc(12, 12, 5)), { d: rays(), stroke: LINE }] },
  /** A soap bubble: a see-through disc, its rim in the ink line, a white glint. */
  bubble: {
    layers: [
      { d: disc(12, 12, 8.5), opacity: 0.35 },
      { d: disc(12, 12, 8.5), stroke: 1.6, paint: EDGE },
      { d: 'M8 9.5a4.6 4.6 0 0 1 3.4-2.6', stroke: 2, paint: FOAM },
    ],
  },
  /** Two beamed notes: the stems in the ink line, the heads in the colour. */
  note: {
    layers: [
      { d: 'M9 18.2V5.2l10-2.2v12.4', stroke: 2, paint: EDGE },
      ...edged(ellipse(6.6, 18.4, 3.6, 2.8), 1.4),
      ...edged(ellipse(16.6, 15.8, 3.6, 2.8), 1.4),
    ],
  },
  dashes: { layers: [{ d: 'M2.5 16 8.5 17M5 7.5 10 11.2M13.8 2.5 14.6 8.6', stroke: LINE }] },
  moon: { layers: edged('M15.5 2.5A9.8 9.8 0 1 0 21.5 16 7.8 7.8 0 0 1 15.5 2.5Z') },
  dot: { layers: edged(disc(12, 12, 5.5), 1.6) },
  heart: { layers: edged(HEART) },
  anger: {
    layers: [
      {
        d: 'M9.5 3v4.5q0 2-2 2H3M14.5 3v4.5q0 2 2 2H21M9.5 21v-4.5q0-2-2-2H3M14.5 21v-4.5q0-2 2-2H21',
        stroke: LINE,
      },
    ],
  },
  drop: { layers: edged('M12 2.5C12 2.5 5 11 5 15.2A7 7 0 0 0 19 15.2C19 11 12 2.5 12 2.5Z') },
  question: {
    layers: [
      { d: 'M7.5 8a4.5 4.5 0 1 1 6.6 4c-1.5.8-2.1 1.8-2.1 3.3', stroke: LINE },
      { d: disc(12, 20.5, LINE * 0.7) },
    ],
  },
  plus: { layers: [{ d: 'M12 3v18M3 12h18', stroke: LINE }] },
  wave: { layers: [{ d: 'M2 12q2.5-5 5 0t5 0 5 0 5 0', stroke: LINE }] },
  swirl: {
    layers: [
      {
        d: 'M12 12m-1.5 0a1.5 1.5 0 1 1 3 0a3.5 3.5 0 1 1-7 0a5.5 5.5 0 1 1 11 0a7.5 7.5 0 1 1-15 0',
        stroke: LINE,
      },
    ],
  },
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
  item('sun', LEMON, 'top-left', 20, 0, 'spin'),
  item('dashes', CORAL, 'top-right', 20, 0, 'flick'),
  item('sparkle', TEAL, 'right', 13, 14, 'twinkle'),
  item('bubble', ICE, 'bottom-left', 9, 0, 'float'),
];
const HUM = [
  item('note', MELON, 'top-right', 18, 10, 'bob'),
  item('note', LEMON, 'top-left', 13, -12, 'float'),
  item('bubble', ICE, 'right', 8, 0, 'float'),
];
/** The lab's rising Zz is the engine's own here. */
const SLEEP = [
  item('moon', LEMON, 'top-left', 18, -12, 'float'),
  item('bubble', ICE, 'right', 9, 0, 'float'),
  item('dot', ICE, 'bottom-left', 5, 0, 'twinkle'),
];
const THINK = [
  item('swirl', TEAL, 'top-left', 17, 0, 'spin'),
  item('question', CORAL, 'top-right', 18, 10, 'bob'),
  item('bubble', ICE, 'right', 7, 0, 'float'),
  item('bubble', ICE, 'right', 5, 0, 'float'),
];
const MAD = [
  item('anger', RED, 'top-right', 18, 0, 'throb'),
  item('sun', CORAL, 'top-left', 18, -20, 'spin'),
  item('dashes', CORAL, 'right', 16, 80, 'flick'),
];
/** The lab's bang is the engine's `!` or sweat strokes here. */
const STARTLE = [
  item('dashes', LEMON, 'top-left', 22, -80, 'flick'),
  item('drop', ICE, 'right', 9, 20, 'float'),
  item('plus', TEAL, 'bottom-left', 9, 0, 'twinkle'),
];
const SAD = [
  item('drop', ICE, 'top-left', 11, -10, 'float'),
  item('wave', TEAL, 'top-right', 18, 0, 'wiggle'),
  item('bubble', ICE, 'right', 6, 0, 'float'),
];
const SHY = [
  item('heart', MELON, 'top-right', 16, 12, 'throb'),
  item('heart', CORAL, 'top-left', 10, -14, 'float'),
  item('sparkle', LEMON, 'right', 10, 0, 'twinkle'),
];
const IDLE = [
  item('sparkle', LEMON, 'top-left', 12, -10, 'twinkle'),
  item('bubble', ICE, 'top-right', 11, 0, 'float'),
  item('dot', CORAL, 'right', 5, 0, 'float'),
];

/**
 * The lab sorted states into its own groups, which the engine's moods only
 * partly follow (it files humming and shy under bright, listening, the busy
 * states and bouncing under calm, curiosity under tense): each listed state
 * keeps its lab group.
 */
const GROUPS: readonly (readonly [readonly CharacterState[], readonly DecorItem[]])[] = [
  [['happy', 'excited', 'laughing', 'playful', 'proud', 'celebrate', 'bouncing'], JOY],
  [['humming', 'listening', 'dictating'], HUM],
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
  [['shy'], SHY],
];

export const DECOR: DecorSpec = {
  glyphs: GLYPHS,
  /** Clear of the plate, which is printed about 14 units off the figure's lower right. */
  gap: 12,
  moods: { calm: IDLE, bright: JOY, heated: MAD, low: SAD, tense: STARTLE, drowsy: SLEEP },
  states: Object.fromEntries(GROUPS.flatMap(([states, set]) => states.map((state) => [state, set]))),
};
