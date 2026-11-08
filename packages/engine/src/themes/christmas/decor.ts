/**
 * The Christmas mood doodles, as the lab drew them round its felt cards:
 * three or four glyphs per mood (and per state where the lab grouped states
 * the engine files under one mood), each in the sheet's gold, red, pine or
 * ice, placed in the zone the lab put it in and moving as it moved.
 */
import type { CharacterState } from '../../motion/states.js';
import type { DecorGlyph, DecorItem, DecorPaint, DecorSpec } from '../extras/index.js';

/** The lab's line weight, in the glyphs' 24-unit box. */
const W = 2.6;

const f2 = (n: number): string => (Math.round(n * 100) / 100).toString();

/** A circle as a path. */
const circle = (cx: number, cy: number, r: number): string =>
  `M${f2(cx - r)} ${f2(cy)}a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0Z`;

/** An ellipse as a path. */
const ellipse = (cx: number, cy: number, rx: number, ry: number): string =>
  `M${f2(cx - rx)} ${f2(cy)}a${f2(rx)} ${f2(ry)} 0 1 0 ${f2(2 * rx)} 0a${f2(rx)} ${f2(ry)} 0 1 0 ${f2(-2 * rx)} 0Z`;

function starPath(cx: number, cy: number, outer: number, inner: number): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? inner : outer;
    d += `${i ? 'L' : 'M'}${f2(cx + k * Math.cos(a))} ${f2(cy + k * Math.sin(a))}`;
  }
  return `${d}Z`;
}

/** Six arms, each with a V of two barbs. */
function flakePath(): string {
  let d = '';
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const at = (r: number, s: number) =>
      `${f2(12 + r * Math.cos(a) + s * Math.cos(a + Math.PI / 2))} ${f2(12 + r * Math.sin(a) + s * Math.sin(a + Math.PI / 2))}`;
    d += `M12 12L${at(9.5, 0)}M${at(4.5, 0)}L${at(7.4, 2.6)}M${at(4.5, 0)}L${at(7.4, -2.6)}`;
  }
  return d;
}

/** The sheet's colours, each read on both pages: gold, red, and pine and ice held in a band. */
const GOLD: DecorPaint = { color: 'yellow' };
const RED: DecorPaint = { color: 'crimson' };
const PINE: DecorPaint = { from: { color: 'pine' }, lightness: [0.55, 0.62], chroma: 0.1 };
const ICE: DecorPaint = { from: { color: 'sky' }, lightness: [0.68, 0.74], chroma: 0.08 };

const SPARKLE =
  'M12 1.5C12.8 8.4 15.6 11.2 22.5 12C15.6 12.8 12.8 15.6 12 22.5C11.2 15.6 8.4 12.8 1.5 12C8.4 11.2 11.2 8.4 12 1.5Z';
const STAR = starPath(12, 12.8, 9.6, 4.4);

const GLYPHS: Record<string, DecorGlyph> = {
  sparkle: { layers: [{ d: SPARKLE }] },
  star: { layers: [{ d: STAR }, { d: STAR, stroke: 2.4 }] },
  flake: { layers: [{ d: flakePath(), stroke: W * 0.8 }] },
  holly: {
    layers: [
      {
        d: 'M11 13C8 8 3.5 7.5 1.5 9.5C3.5 10.2 3.2 12 4.5 13C3.5 14.5 5 15.5 7 15.2C7.5 17 9.5 17 11 13Z',
        paint: PINE,
      },
      {
        d: 'M13 13C16 8 20.5 7.5 22.5 9.5C20.5 10.2 20.8 12 19.5 13C20.5 14.5 19 15.5 17 15.2C16.5 17 14.5 17 13 13Z',
        paint: PINE,
      },
      { d: circle(9.6, 10.4, 2.6) + circle(14.4, 10.4, 2.6) + circle(12, 14.2, 2.6) },
    ],
  },
  bell: {
    layers: [
      {
        d: `M12 3.5C16 3.5 17.5 7 17.5 11C17.5 14.5 19.5 16 20.5 17.5H3.5C4.5 16 6.5 14.5 6.5 11C6.5 7 8 3.5 12 3.5Z${circle(12, 19.5, 2.3)}`,
      },
    ],
  },
  moon: { layers: [{ d: 'M15.5 2.5A9.8 9.8 0 1 0 21.5 16 7.8 7.8 0 0 1 15.5 2.5Z' }] },
  zz: { layers: [{ d: 'M3 4.5h7.5l-7.5 8h7.5M14 12.5h6.5l-6.5 7h6.5', stroke: W }] },
  dot: { layers: [{ d: circle(12, 12, 5.5) }] },
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
  bang: { layers: [{ d: 'M12 3.5v10', stroke: W * 1.5 }, { d: circle(12, 20, W * 0.85) }] },
  question: {
    layers: [
      { d: 'M7.5 8a4.5 4.5 0 1 1 6.6 4c-1.5.8-2.1 1.8-2.1 3.3', stroke: W },
      { d: circle(12, 20.5, W * 0.7) },
    ],
  },
  note: {
    layers: [
      { d: 'M9 18V5l10-2v13', stroke: W },
      { d: ellipse(6.5, 18, 3.2, 2.6) + ellipse(16.5, 16, 3.2, 2.6) },
    ],
  },
  wave: { layers: [{ d: 'M2 12q2.5-5 5 0t5 0 5 0 5 0', stroke: W }] },
  steam: { layers: [{ d: 'M12 23C7 19 17 15 12 11S17 4 12 1', stroke: 3.6 }] },
};

/**
 * One doodle: `[glyph, colour, left %, top %, width %, turn, motion]`, with its place as a zone and its
 * width in shape units (the figure is `SHAPE_SPACE` across).
 */
const item = (
  glyph: string,
  paint: DecorPaint,
  zone: DecorItem['zone'],
  width: number,
  turn: number,
  kind: NonNullable<DecorItem['animation']>['kind'],
): DecorItem => ({ glyph, paint, zone, size: Math.round(width * 2.29), turn, animation: { kind } });

/** The lab's sets. */
const SETS = {
  joy: [
    item('sparkle', GOLD, 'top-left', 18, 0, 'twinkle'),
    item('holly', RED, 'top-right', 22, 10, 'bob'),
    item('star', GOLD, 'right', 12, 14, 'spin'),
    item('flake', ICE, 'bottom-left', 12, 0, 'float'),
  ],
  hum: [
    item('note', PINE, 'top-right', 18, 8, 'rise'),
    item('note', RED, 'top-left', 13, -10, 'bob'),
    item('sparkle', GOLD, 'right', 10, 0, 'twinkle'),
  ],
  sleep: [
    item('moon', GOLD, 'top-left', 18, -12, 'float'),
    item('zz', ICE, 'top-right', 18, 0, 'rise'),
    item('flake', ICE, 'right', 10, 0, 'twinkle'),
    item('dot', ICE, 'bottom-left', 5, 0, 'twinkle'),
  ],
  think: [
    item('question', PINE, 'top-right', 17, 10, 'bob'),
    item('flake', ICE, 'top-left', 15, 0, 'spin'),
    item('dot', PINE, 'right', 5, 0, 'float'),
    item('dot', RED, 'right', 4, 0, 'float'),
  ],
  mad: [
    item('anger', RED, 'top-right', 17, 0, 'throb'),
    item('wave', RED, 'top-left', 17, -20, 'wiggle'),
    item('dot', RED, 'bottom-left', 5, 0, 'float'),
  ],
  startle: [
    item('bang', RED, 'top-right', 15, 12, 'throb'),
    item('bell', GOLD, 'top-left', 16, -16, 'wiggle'),
    item('drop', ICE, 'right', 8, 20, 'float'),
  ],
  sad: [
    item('drop', ICE, 'top-left', 10, -10, 'float'),
    item('flake', ICE, 'top-right', 15, 0, 'float'),
    item('dot', ICE, 'right', 5, 0, 'float'),
  ],
  shy: [
    item('heart', RED, 'top-right', 15, 12, 'throb'),
    item('heart', RED, 'top-left', 9, -14, 'float'),
    item('sparkle', GOLD, 'right', 9, 0, 'twinkle'),
  ],
  idle: [
    item('flake', ICE, 'top-left', 13, -10, 'spin'),
    item('sparkle', GOLD, 'top-right', 12, 0, 'twinkle'),
    item('dot', RED, 'right', 5, 0, 'float'),
  ],
} as const satisfies Record<string, readonly DecorItem[]>;

/** The lab's mood groups by state; a state in none of them shows its engine mood's set. */
const GROUPS: Record<Exclude<keyof typeof SETS, 'idle'>, readonly CharacterState[]> = {
  joy: ['happy', 'excited', 'laughing', 'playful', 'proud', 'celebrate', 'bouncing'],
  hum: ['humming'],
  sleep: ['sleeping', 'drowsy', 'bored', 'powering-down', 'waking'],
  think: [
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
  mad: ['angry', 'refusing'],
  startle: ['surprised', 'scared', 'alerting', 'notifying'],
  sad: ['sad'],
  shy: ['shy'],
};

/**
 * The doodles stand in for the engine's own state effects wherever a set shows, as the lab's did: the sleep set
 * has its own Zz, the shy set its hearts, the startled set its bang.
 */
export const DECOR: DecorSpec = {
  glyphs: GLYPHS,
  moods: {
    calm: SETS.idle,
    bright: SETS.joy,
    heated: SETS.mad,
    tense: SETS.startle,
    low: SETS.sad,
    drowsy: SETS.sleep,
  },
  states: Object.fromEntries(
    Object.entries(GROUPS).flatMap(([group, states]) =>
      states.map((state) => [state, SETS[group as keyof typeof GROUPS]]),
    ),
  ),
  fx: 'replace',
};
