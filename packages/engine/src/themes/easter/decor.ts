/**
 * The Easter mood decorations: the lab sheet's crayon doodles round the
 * figure (flowers, eggs, sprigs, sparkles and the usual mood marks), in the
 * sheet's pink, mint, butter, lilac, sky, carrot and leaf, each a palette
 * colour so it turns with the page. Glyphs are the lab's, in a 24-unit box
 * with lines 2.6 wide, every path made rough (`rough`) where the lab ran
 * them through a rough-edge filter.
 *
 * The lab grouped the states in nine sets; the engine's moods are six, so
 * every state the lab named takes its lab set (`states`), and the moods
 * carry the same sets for the states the lab left to its idle set.
 */
import type { CharacterState } from '../../motion/states.js';
import type { DecorGlyph, DecorItem, DecorPaint, DecorSpec } from '../extras/index.js';
import { rough } from './rough.js';

const W = 2.6;

const PINK: DecorPaint = { color: 'blush' };
const MINT: DecorPaint = { color: 'mint' };
const BUTTER: DecorPaint = { color: 'butter' };
const LILAC: DecorPaint = { color: 'lilac' };
const SKY: DecorPaint = { color: 'sky' };
const CARROT: DecorPaint = { color: 'carrot' };
const LEAF: DecorPaint = { color: 'meadow' };
const CREAM: DecorPaint = { color: 'ivory' };
/** The sheet's anger red, a soft coral: red held at the sheet's lightness. */
const ANGER: DecorPaint = { from: { color: 'red' }, lightness: [0.68, 0.72], chroma: 0.15 };

const f2 = (n: number) => Math.round(n * 100) / 100;

const disc = (cx: number, cy: number, r: number) =>
  `M${f2(cx - r)} ${f2(cy)}a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0Z`;

/** `n` discs of radius `pr` on a ring `r` round (cx, cy), the first straight up: the lab's `petalsPath`. */
function petals(cx: number, cy: number, n: number, r: number, pr: number): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    d += disc(cx + r * Math.cos(a), cy + r * Math.sin(a), pr);
  }
  return d;
}

/** A glyph whose layers are made rough, each with a seed of its own. */
function crayon(seed: number, layers: DecorGlyph['layers']): DecorGlyph {
  return { layers: layers.map((layer, i) => ({ ...layer, d: rough(layer.d, seed * 7 + i) })) };
}

const GLYPHS: Readonly<Record<string, DecorGlyph>> = {
  sparkle: crayon(1, [
    {
      d: 'M12 1.5C12.8 8.4 15.6 11.2 22.5 12C15.6 12.8 12.8 15.6 12 22.5C11.2 15.6 8.4 12.8 1.5 12C8.4 11.2 11.2 8.4 12 1.5Z',
    },
  ]),
  flower: crayon(2, [
    { d: petals(12, 12, 5, 5.6, 4.4) },
    { d: disc(12, 12, 3.4), paint: BUTTER },
    { d: disc(12, 12, 3.4), stroke: 1, paint: CREAM },
  ]),
  egg: crayon(3, [
    { d: 'M12 2C7.6 2 4.6 9 4.6 14.2A7.4 7.4 0 0 0 19.4 14.2C19.4 9 16.4 2 12 2Z' },
    { d: 'M5.4 12.5 8 10.6 10.6 12.5 13.2 10.6 15.8 12.5 18.5 10.6', stroke: 1.6, paint: CREAM },
  ]),
  heart: crayon(4, [
    {
      d: 'M12 21C5 16 2.5 12.5 2.5 8.6 2.5 5.6 4.8 3.5 7.4 3.5 9.4 3.5 11 4.6 12 6.4 13 4.6 14.6 3.5 16.6 3.5 19.2 3.5 21.5 5.6 21.5 8.6 21.5 12.5 19 16 12 21Z',
    },
  ]),
  sprig: crayon(5, [
    { d: 'M5 21C9 15 12 10 19 3', stroke: W },
    {
      d: 'M9.5 14.5C6 14 4 11.5 4 9 7.5 9.5 9.5 11.5 9.5 14.5ZM13.5 9.5C13 6 14.5 3.5 17 2.5 17.5 6 16 8.5 13.5 9.5ZM13.4 11.6C16 9.8 19 10 21 11.5 18.8 13.4 15.8 13.4 13.4 11.6Z',
    },
  ]),
  note: crayon(6, [{ d: 'M9 18V5l10-2v13', stroke: W }, { d: disc(6.5, 18, 3) + disc(16.5, 16, 3) }]),
  dashes: crayon(7, [{ d: 'M2.5 16 8.5 17M5 7.5 10 11.2M13.8 2.5 14.6 8.6', stroke: W }]),
  swirl: crayon(8, [
    {
      d: 'M12 12.5a1.6 1.6 0 1 1 1.8-2 3.6 3.6 0 1 1-4.6 4.4 5.8 5.8 0 1 1 7.6-7.4 8 8 0 1 1-12.4 2.6',
      stroke: W,
    },
  ]),
  zz: crayon(9, [{ d: 'M3 4.5h7.5l-7.5 8h7.5M14 12.5h6.5l-6.5 7h6.5', stroke: W }]),
  cloud: crayon(10, [{ d: 'M6.5 18.5A4.5 4.5 0 0 1 6 9.6 6 6 0 0 1 17.4 8.4 5 5 0 0 1 18 18.5Z' }]),
  dot: crayon(11, [{ d: disc(12, 12, 5.5) }]),
  anger: crayon(12, [
    {
      d: 'M9.5 3v4.5q0 2-2 2H3M14.5 3v4.5q0 2 2 2H21M9.5 21v-4.5q0-2-2-2H3M14.5 21v-4.5q0-2 2-2H21',
      stroke: W,
    },
  ]),
  drop: crayon(13, [{ d: 'M12 2.5C12 2.5 5 11 5 15.2A7 7 0 0 0 19 15.2C19 11 12 2.5 12 2.5Z' }]),
  bang: crayon(14, [{ d: 'M12 3.5v10', stroke: W * 1.5 }, { d: disc(12, 20, W * 0.85) }]),
  question: crayon(15, [
    { d: 'M7.5 8a4.5 4.5 0 1 1 6.6 4c-1.5.8-2.1 1.8-2.1 3.3', stroke: W },
    { d: disc(12, 20.5, W * 0.7) },
  ]),
  plus: crayon(16, [{ d: 'M12 3v18M3 12h18', stroke: W }]),
  wave: crayon(17, [{ d: 'M2 12q2.5-5 5 0t5 0 5 0 5 0', stroke: W }]),
};

/** The lab's figure-box width, in percent, as shape units across. */
const size = (percent: number) => f2(percent * 2.29);

/*
 * The lab's sets, each doodle at the zone its position falls in, its width,
 * resting turn and animation as the lab had them.
 */
const JOY: readonly DecorItem[] = [
  { glyph: 'flower', paint: PINK, size: size(18), zone: 'top-left', animation: { kind: 'spin' } },
  { glyph: 'sparkle', paint: BUTTER, size: size(18), zone: 'top-right', animation: { kind: 'twinkle' } },
  { glyph: 'egg', paint: SKY, size: size(13), zone: 'right', turn: 14, animation: { kind: 'bob' } },
  { glyph: 'dot', paint: LILAC, size: size(7), zone: 'bottom-left', animation: { kind: 'float' } },
];

const HUM: readonly DecorItem[] = [
  { glyph: 'note', paint: LILAC, size: size(18), zone: 'top-right', turn: 10, animation: { kind: 'rise' } },
  { glyph: 'note', paint: PINK, size: size(12), zone: 'top-left', turn: -12, animation: { kind: 'float' } },
  { glyph: 'sprig', paint: LEAF, size: size(13), zone: 'right', animation: { kind: 'wiggle' } },
];

const SLEEP: readonly DecorItem[] = [
  { glyph: 'cloud', paint: SKY, size: size(20), zone: 'top-left', animation: { kind: 'float' } },
  { glyph: 'zz', paint: LILAC, size: size(20), zone: 'top-right', animation: { kind: 'rise' } },
  { glyph: 'plus', paint: BUTTER, size: size(9), zone: 'right', animation: { kind: 'twinkle' } },
  { glyph: 'dot', paint: LILAC, size: size(6), zone: 'bottom-left', animation: { kind: 'twinkle' } },
];

const THINK: readonly DecorItem[] = [
  { glyph: 'swirl', paint: LILAC, size: size(18), zone: 'top-left', animation: { kind: 'spin' } },
  {
    glyph: 'question',
    paint: CARROT,
    size: size(18),
    zone: 'top-right',
    turn: 10,
    animation: { kind: 'bob' },
  },
  { glyph: 'dot', paint: MINT, size: size(6), zone: 'right', animation: { kind: 'float' } },
  { glyph: 'dot', paint: PINK, size: size(4.5), zone: 'right', animation: { kind: 'float' } },
];

const MAD: readonly DecorItem[] = [
  { glyph: 'anger', paint: ANGER, size: size(18), zone: 'top-right', animation: { kind: 'throb' } },
  {
    glyph: 'wave',
    paint: CARROT,
    size: size(18),
    zone: 'top-left',
    turn: -20,
    animation: { kind: 'wiggle' },
  },
  { glyph: 'dashes', paint: CARROT, size: size(16), zone: 'right', turn: 80, animation: { kind: 'flick' } },
  { glyph: 'dot', paint: ANGER, size: size(6), zone: 'bottom-left', animation: { kind: 'float' } },
];

const STARTLE: readonly DecorItem[] = [
  { glyph: 'bang', paint: CARROT, size: size(16), zone: 'top-right', turn: 12, animation: { kind: 'throb' } },
  {
    glyph: 'dashes',
    paint: BUTTER,
    size: size(22),
    zone: 'top-left',
    turn: -80,
    animation: { kind: 'flick' },
  },
  { glyph: 'drop', paint: SKY, size: size(9), zone: 'right', turn: 20, animation: { kind: 'float' } },
  { glyph: 'plus', paint: PINK, size: size(9), zone: 'bottom-left', animation: { kind: 'twinkle' } },
];

const SAD: readonly DecorItem[] = [
  { glyph: 'drop', paint: SKY, size: size(11), zone: 'top-left', turn: -10, animation: { kind: 'float' } },
  { glyph: 'cloud', paint: LILAC, size: size(18), zone: 'top-right', animation: { kind: 'float' } },
  { glyph: 'dot', paint: SKY, size: size(5), zone: 'right', animation: { kind: 'float' } },
];

const SHY: readonly DecorItem[] = [
  { glyph: 'heart', paint: PINK, size: size(16), zone: 'top-right', turn: 12, animation: { kind: 'throb' } },
  { glyph: 'heart', paint: PINK, size: size(10), zone: 'top-left', turn: -14, animation: { kind: 'float' } },
  { glyph: 'flower', paint: LILAC, size: size(11), zone: 'right', animation: { kind: 'spin' } },
];

const IDLE: readonly DecorItem[] = [
  { glyph: 'sprig', paint: LEAF, size: size(15), zone: 'top-left', turn: -10, animation: { kind: 'wiggle' } },
  { glyph: 'sparkle', paint: BUTTER, size: size(13), zone: 'top-right', animation: { kind: 'twinkle' } },
  { glyph: 'dot', paint: PINK, size: size(5), zone: 'right', animation: { kind: 'float' } },
];

/** The lab's state groups, each with its set. */
const GROUPS: readonly [readonly CharacterState[], readonly DecorItem[]][] = [
  [['happy', 'excited', 'laughing', 'playful', 'proud', 'celebrate', 'bouncing'], JOY],
  [['humming'], HUM],
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
  /** Clear of the pastel skin's paper margin (8.5 units, wandering 2.6 either way) rather than only the outline. */
  gap: 11,
  /** The lab placed its doodles up to 12 % of the box past its edge, in the card's margin. */
  reach: 0.12,
  /** Below this the doodles are specks a few pixels across, as the lab's small-size wall, which drew none, showed. */
  minPx: 96,
  moods: { calm: IDLE, bright: JOY, heated: MAD, low: SAD, tense: STARTLE, drowsy: SLEEP },
  states: Object.fromEntries(GROUPS.flatMap(([states, set]) => states.map((state) => [state, set]))),
};
