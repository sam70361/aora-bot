/**
 * `screen`: eyes that are small glowing displays behind a dark visor.
 *
 * Each eye is a rounded panel of light. In the feeling states it changes
 * shape with the expression — a tall bar, a smiling arch, a slit, a slanted
 * cut — and its light warms or cools with the mood. In the busy states the
 * panels show what the character is doing: a scan, a spinner, a filling
 * bar, an equaliser, packets going up or out, a radar sweep. Each of those is
 * an expression with an amount, so one hands over to the next by blending.
 */
import type { Point } from '../../../core/types.js';
import { lerp } from '../../../math/easing.js';
import { STATE_CUTE_EYES, STATE_CUTE_MOUTH } from '../../../motion/states.js';
import { CUTE_MOUTHS } from '../../features.js';
import {
  arcPoints,
  bandRing,
  circleRing,
  convexBand,
  meet,
  ribbon,
  roundedRectBand,
  type Band,
} from '../geometry.js';
import { CUTE_MOUTH_GLYPHS } from '../glyphs.js';
import { clockOf, LayerList, noise, pulse, smooth, unit, vocabulary } from '../reading.js';
import type { DrawnEye, EyeClass, EyeContext, FaceDesign, FaceLayer, Rgb } from '../types.js';

/** The resting panel: half-width, half-height and corner radius, in dot radii. */
const PANEL = { w: 1.35, h: 1.8, r: 0.95 } as const;
/** The visor: its half-height, and how far it reaches past each eye's centre. */
const VISOR = { half: 2.6, pad: 2.5, corner: 1.7 } as const;
const LIFT = 0.3;
const SEPARATION = 5.4;
const MOUTH_GAP = 1.15;
const MOUTH_SCALE = 0.88;
/** The halo round a lit panel: how much larger, and how strong. */
const HALO = { grow: 0.22, opacity: 0.35 } as const;
/** Pixel glyphs: a cell's size and pitch, in dot radii. */
const PIXEL = { cell: 0.46, pitch: 0.5 } as const;

/** The panel colours by mood: a bright core and the deeper colour its halo glows in. */
const TINTS = {
  calm: { core: [217, 252, 255], halo: [48, 214, 255] },
  mint: { core: [214, 255, 236], halo: [52, 232, 164] },
  warm: { core: [255, 228, 196], halo: [255, 132, 56] },
  coral: { core: [255, 214, 200], halo: [255, 92, 72] },
  blue: { core: [204, 218, 255], halo: [96, 126, 255] },
} as const satisfies Record<string, { core: Rgb; halo: Rgb }>;

type Field =
  | 'w'
  | 'h'
  | 'r'
  | 'cut'
  | 'tilt'
  | 'bend'
  | 'cx'
  | 'cy'
  | 'core'
  | 'sc'
  | 'dim'
  | 'glow'
  | 'cr'
  | 'cg'
  | 'cb'
  | 'hr'
  | 'hg'
  | 'hb'
  // What the panel shows besides its own shape.
  | 'pixStar'
  | 'pixX'
  | 'ring'
  | 'bars'
  | 'dots'
  | 'seek'
  | 'orbit'
  | 'radar'
  | 'fill'
  | 'packet'
  | 'scan'
  // How it moves: each an amount of one loop.
  | 'sweep'
  | 'read'
  | 'eqFast'
  | 'eqWave'
  | 'up'
  | 'recv'
  | 'send'
  | 'wait'
  | 'ping'
  | 'alarm'
  | 'breathe'
  | 'off'
  | 'tremble'
  | 'boot';

const tint = (name: keyof typeof TINTS): Record<'cr' | 'cg' | 'cb' | 'hr' | 'hg' | 'hb', number> => {
  const { core, halo } = TINTS[name];
  return { cr: core[0], cg: core[1], cb: core[2], hr: halo[0], hg: halo[1], hb: halo[2] };
};

const REST: DrawnEye<Field> = {
  w: PANEL.w,
  h: PANEL.h,
  r: PANEL.r,
  cut: 0,
  tilt: 0,
  bend: 0,
  cx: 0,
  cy: 0,
  core: 1,
  sc: 1,
  dim: 1,
  glow: 1,
  ...tint('calm'),
  pixStar: 0,
  pixX: 0,
  ring: 0,
  bars: 0,
  dots: 0,
  seek: 0,
  orbit: 0,
  radar: 0,
  fill: 0,
  packet: 0,
  scan: 0,
  sweep: 0,
  read: 0,
  eqFast: 0,
  eqWave: 0,
  up: 0,
  recv: 0,
  send: 0,
  wait: 0,
  ping: 0,
  alarm: 0,
  breathe: 0,
  off: 0,
  tremble: 0,
  boot: 0,
};

const KINDS = vocabulary<Field>(REST, (read) => {
  const [gx, gy] = read.off;
  switch (read.kind) {
    case 'open': {
      const open = Math.min(1, Math.max(0.06, read.open));
      const grow = read.size > 1 ? 1 + (read.size - 1) * 0.6 : read.size;
      return {
        h: PANEL.h * grow * open,
        w: PANEL.w * Math.sqrt(grow) * (1 + (1 - open) * 0.25),
        cy: -PANEL.h * Math.max(0, grow - 1) * 0.5 + gy * 0.5,
        cx: gx * 0.5,
      };
    }
    case 'smile':
      return { h: 0.34, w: 1.45, r: 0.34, bend: 0.85, cx: gx * 0.4, cy: 0.35 + gy * 0.3, ...tint('mint') };
    case 'closed':
      return { h: 0.17, w: 1.4, r: 0.17, cx: gx * 0.4, cy: 0.2 + gy * 0.3 };
    case 'mad':
      return { h: 1.35, w: 1.3, cut: 0.6, tilt: 0.95, cy: 0.2, cx: gx * 0.3, ...tint('coral') };
    case 'sad':
      return { h: 1.4, w: 1.25, cut: 0.55, tilt: -0.85, cy: 0.3, cx: gx * 0.3, ...tint('blue') };
    case 'cross':
      return { core: 0, pixX: 1 };
    case 'star':
      return { core: 0, pixStar: 1 };
  }
});

const mode = (fields: Partial<Record<Field, number>>): readonly [DrawnEye<Field>, DrawnEye<Field>] => {
  const both = { ...KINDS.dot[0], ...fields };
  return [both, both];
};

/** The busy states' panels. */
const MODES = {
  scan: mode({ h: 0.7, w: 1.25, r: 0.7, cy: -0.2, sweep: 1 }),
  read: mode({ h: 0.8, w: 1, r: 0.8, cy: 0.1, read: 1 }),
  seek: mode({ w: 1.25, h: 1.7, r: 0.9, core: 0.24, seek: 1 }),
  orbit: mode({ w: 1.25, h: 1.25, r: 1.25, core: 0.24, orbit: 1 }),
  radar: mode({ w: 1.25, h: 1.25, r: 1.25, core: 0.3, radar: 1 }),
  scanline: mode({ core: 0.4, scan: 1 }),
  spin: mode({ core: 0, ring: 1 }),
  bar: mode({ w: 1.5, h: 0.55, r: 0.55, core: 0.26, fill: 1 }),
  up: mode({ w: 0.65, h: 1.75, r: 0.65, core: 0.26, packet: 1, up: 1 }),
  recv: mode({ w: 1.5, h: 0.55, r: 0.55, core: 0.26, packet: 1, recv: 1 }),
  send: mode({ w: 1.5, h: 0.55, r: 0.55, core: 0.26, packet: 1, send: 1 }),
  eq: mode({ core: 0, bars: 1 }),
  eqFast: mode({ core: 0, bars: 1, eqFast: 1 }),
  eqWave: mode({ core: 0, bars: 1, eqWave: 1 }),
  typing: mode({ core: 0, dots: 1 }),
  wait: mode({ wait: 1 }),
  ping: mode({ ping: 1 }),
  alarm: mode({ h: PANEL.h * 1.15, alarm: 1, ...tint('warm') }),
  sleep: mode({ h: 0.17, w: 1.4, r: 0.17, bend: -0.12, cy: 0.3, breathe: 1, ...tint('blue') }),
  off: mode({ off: 1 }),
  tremble: mode({ ...KINDS.dotWide[0], tremble: 1 }),
  drowsy: mode({ dim: 0.78, glow: 0.6 }),
  boot: mode({ boot: 1 }),
};
type Mode = keyof typeof MODES;

const CLASSES: Record<Mode, readonly [EyeClass, EyeClass]> = {
  scan: ['look', 'look'],
  read: ['look', 'look'],
  seek: ['look', 'look'],
  orbit: ['open', 'open'],
  radar: ['open', 'open'],
  scanline: ['open', 'open'],
  spin: ['open', 'open'],
  bar: ['half', 'half'],
  up: ['open', 'open'],
  recv: ['half', 'half'],
  send: ['half', 'half'],
  eq: ['open', 'open'],
  eqFast: ['open', 'open'],
  eqWave: ['open', 'open'],
  typing: ['open', 'open'],
  wait: ['open', 'open'],
  ping: ['wide', 'wide'],
  alarm: ['wide', 'wide'],
  sleep: ['closed', 'closed'],
  off: ['closed', 'closed'],
  tremble: ['wide', 'wide'],
  drowsy: ['half', 'half'],
  boot: ['open', 'open'],
};

/** The cells of a 5 by 5 pixel glyph, `#` lit, as squares centred on the glyph. */
function pixelCells(rows: readonly string[], scale: number): Point[][] {
  const cells: Point[][] = [];
  const half = (PIXEL.cell / 2) * scale;
  rows.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c !== '#') return;
      const cx = (x - 2) * PIXEL.pitch * scale;
      const cy = (y - 2) * PIXEL.pitch * scale;
      cells.push([
        [cx - half, cy - half],
        [cx + half, cy - half],
        [cx + half, cy + half],
        [cx - half, cy + half],
      ]);
    });
  });
  return cells;
}
const PIXEL_STAR = ['..#..', '.###.', '#####', '.###.', '.#.#.'];
const PIXEL_X = ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'];

/** A rectangle as a ring. */
const rect = (x: number, y: number, w: number, h: number): Point[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

function eye(spec: DrawnEye<Field>, ctx: EyeContext): FaceLayer[] {
  const t = clockOf(ctx);
  const n = ctx.nose;
  const o = ctx.order;
  const s = { ...spec };
  let flash = 1;

  // The loops, each weighed by its amount so a panel eases into and out of it.
  s.cx += s.sweep * n * Math.sin(t * 1.7);
  const u = (t * 0.9) % 1;
  s.cx += s.read * n * (u < 0.88 ? (u / 0.88) * 2 - 1 : lerp(1, -1, (u - 0.88) / 0.12)) * 0.95;
  s.cx += s.tremble * Math.sin(t * 38 + o) * 0.07;
  flash *= lerp(1, 0.35 + 0.65 * smooth(0.5 + 0.5 * Math.sin(t * 3 + o * Math.PI)), s.wait);
  flash *= lerp(1, Math.floor(t * 4) % 2 ? 0.55 : 1, s.alarm);
  const ping = t % 1.3 < 0.35 ? Math.sin(((t % 1.3) / 0.35) * Math.PI) : 0;
  s.sc *= 1 + 0.2 * ping * s.ping;
  s.glow *= 1 + 0.6 * ping * s.ping;
  const breath = 0.5 + 0.5 * Math.sin(t * 1.3);
  s.dim *= lerp(1, 0.5 + 0.22 * breath, s.breathe);
  s.glow *= lerp(1, 0.6 + 0.6 * breath, s.breathe);
  if (s.off > 0.004) {
    const v = (t % 3.4) / 3.4;
    const line = smooth(v / 0.45);
    const dot = smooth((v - 0.5) / 0.3);
    s.h = lerp(s.h, lerp(PANEL.h, 0.17, line), s.off);
    s.r = lerp(s.r, lerp(PANEL.r, 0.17, line), s.off);
    s.w = lerp(s.w, lerp(lerp(PANEL.w, 1.4, line), 0.2, dot), s.off);
    s.cy += 0.1 * line * s.off;
    s.dim *= lerp(1, 1 - smooth((v - 0.62) / 0.3), s.off);
    s.glow *= lerp(1, 0.8 + line * 0.4, s.off);
  }
  if (s.boot > 0.004 && !ctx.settled && t < 1.2) {
    const v = t / 1.2;
    flash *= lerp(1, v < 0.7 ? (noise(Math.floor(t * 20) + o * 5) > 0.4 ? 1 : 0.12) : 1, s.boot);
    const grow = smooth((v - 0.3) / 0.5);
    s.h = lerp(s.h, lerp(0.15, PANEL.h, grow), s.boot);
    s.w = lerp(s.w, lerp(1.7, PANEL.w, grow), s.boot);
    s.r = lerp(s.r, lerp(0.15, PANEL.r, grow), s.boot);
  }
  s.h *= Math.max(0.06, Math.min(1, ctx.blink));

  const light: Rgb = [s.cr, s.cg, s.cb];
  const halo: Rgb = [s.hr, s.hg, s.hb];
  const lit = unit(s.dim) * flash;
  // The panel's own outline: a rounded rectangle, bent into an arch for a smile and cut by a slanted lid in
  // anger and sorrow, then moved to `(cx, cy)` and grown by `sc`.
  const shape = (grow: number): Band => {
    const w = s.w * grow;
    const h = s.h * grow;
    const box = roundedRectBand(0, 0, w, h, Math.min(s.r, s.w, s.h) * grow);
    const bow = (x: number): number => -s.bend * (1 - Math.min(1, (x / Math.max(w, 1e-3)) ** 2));
    const lid = (x: number): number =>
      s.cut > 0.001 ? -h + s.cut * h * 1.1 + x * s.tilt * s.cut : -Infinity;
    const top = (x: number): number => Math.max(box.top(x) + bow(x), lid(x));
    const bottom = (x: number): number => Math.max(box.bottom(x) + bow(x), top(x));
    const local = (x: number): number => (x - s.cx) / s.sc;
    return {
      x0: s.cx + box.x0 * s.sc,
      x1: s.cx + box.x1 * s.sc,
      top: (x) => s.cy + s.sc * top(local(x)),
      bottom: (x) => s.cy + s.sc * bottom(local(x)),
    };
  };
  const panel = shape(1);
  const move = (ring: Point[]): Point[] => ring.map(([x, y]) => [s.cx + x * s.sc, s.cy + y * s.sc] as Point);
  const inPanel = (ring: Point[]): Point[] | null => {
    const xs = ring.map(([x]) => x);
    const ys = ring.map(([, y]) => y);
    const band = meet(panel, {
      x0: Math.min(...xs),
      x1: Math.max(...xs),
      top: () => Math.min(...ys),
      bottom: () => Math.max(...ys),
    });
    return bandRing(band, 8);
  };

  const out = new LayerList();
  const add = (rings: (Point[] | null)[], opacity: number, detail = false): void =>
    out.add('light', rings, opacity * lit, { light, detail });
  out.add('light', [bandRing(shape(1 + HALO.grow))], HALO.opacity * s.glow * lit * Math.max(s.core, 0.3), {
    light: halo,
    detail: true,
  });
  add([bandRing(panel)], unit(s.core));

  add(pixelCells(PIXEL_STAR, 0.7 + 0.3 * s.pixStar).map(move), s.pixStar);
  add(pixelCells(PIXEL_X, 0.7 + 0.3 * s.pixX).map(move), s.pixX);
  if (s.ring > 0.004) {
    const turn = (t * 340 * n * Math.PI) / 180;
    add(
      [
        ribbon(
          circleRing(0, 0, 0.95, 28).map(([x, y]) => [x + s.cx, y + s.cy] as Point),
          0.25,
          true,
        ),
      ],
      s.ring * 0.3,
    );
    add([ribbon(arcPoints(s.cx, s.cy, 0.95, turn, turn + Math.PI * 2 * 0.28, 10), 0.25)], s.ring);
  }
  if (s.bars > 0.004) {
    const bars = [0, 1, 2].map((i) => {
      const steady = 0.5 + 0.25 * Math.sin(t * 4.3 + i * 1.9 + o) + 0.25 * Math.sin(t * 7.1 + i * 3.1);
      const fast = noise(Math.floor(t * 11) + i * 7 + o * 13);
      const wave = 0.5 + 0.5 * Math.sin(t * 3 - i * 0.9 - o * 2.7);
      const v = 0.3 + (steady * (1 - s.eqFast - s.eqWave) + fast * s.eqFast + wave * s.eqWave) * 1.4;
      return roundedRectBand(s.cx + (i - 1) * 0.82, s.cy, 0.28, v, 0.28);
    });
    add(
      bars.map((b) => bandRing(b, 10)),
      s.bars,
    );
  }
  if (s.dots > 0.004) {
    add(
      [0, 1, 2].map((i) =>
        circleRing(s.cx + (i - 1) * 0.92, s.cy - 0.8 * pulse(t * 6 - (i + o * 3) * 0.9), 0.36, 12),
      ),
      s.dots,
    );
  }
  if (s.seek > 0.004)
    add(
      [circleRing(s.cx + n * Math.sin(t * 1.9) * 0.55, s.cy + Math.sin(t * 2.9 + 1) * 0.8, 0.4, 12)],
      s.seek,
    );
  if (s.orbit > 0.004) {
    const a = t * 3.4 * n;
    const trail = [0.3, 0.22, 0.15].map((r, i) => {
      const b = a - i * 0.45 * Math.sign(n);
      return circleRing(s.cx + Math.cos(b) * 0.85, s.cy + Math.sin(b) * 0.85, r, 10);
    });
    add([trail[0]!, circleRing(s.cx, s.cy, 0.18, 8)], s.orbit);
    add([trail[1]!], s.orbit * 0.5);
    add([trail[2]!], s.orbit * 0.28);
  }
  if (s.radar > 0.004) {
    const turn = (t * 200 * n * Math.PI) / 180;
    const fan: Point[] = [[s.cx, s.cy], ...arcPoints(s.cx, s.cy, 1.2, turn - (50 * Math.PI) / 180, turn, 8)];
    add([bandRing(meet(panel, convexBand(fan)))], s.radar * 0.7);
  }
  if (s.fill > 0.004) {
    const p = (t * 0.32) % 1.25;
    const len = unit(p * 2 - o) * 2 * s.w;
    const x = n === 1 ? -s.w : s.w - len;
    add([inPanel(move(rect(x, -s.h, len, s.h * 2)))], s.fill);
  }
  if (s.packet > 0.004) {
    const rings: (Point[] | null)[] = [];
    if (s.up > 0.004) {
      const v = (t * 0.85 + o * 0.18) % 1;
      const y = lerp(s.h + 0.8, -s.h - 0.8, v);
      rings.push(inPanel(move(rect(-3, y - 0.55, 6, 1.1))));
    }
    for (const [amount, dir] of [
      [s.recv, -1],
      [s.send, 1],
    ] as const) {
      if (amount < 0.004) continue;
      const v = (t * 1.1 + o * 0.2) % 1;
      const x = n * dir * lerp(-1, 1, v) * (s.w + 0.8);
      rings.push(inPanel(move(rect(x - 0.55, -3, 1.1, 6))));
    }
    add(rings, s.packet);
  }
  if (s.scan > 0.004)
    add([inPanel(move(rect(-s.w, Math.sin(t * 2.6) * s.h * 0.85 - 0.18, s.w * 2, 0.36)))], s.scan);
  return out.layers;
}

/** The visor behind both eyes. */
function plate(_left: DrawnEye<Field>, _right: DrawnEye<Field>, ctx: EyeContext): FaceLayer[] {
  const half = ctx.mid + VISOR.pad;
  const visor = bandRing(roundedRectBand(0, 0, half, VISOR.half, VISOR.corner));
  const out = new LayerList();
  out.add('glass', [visor], 1, { plate: true });
  out.add('feature', [visor && ribbon(visor, 0.06 * ctx.weight, true)], 0.6);
  out.add(
    'glint',
    [
      ribbon(
        [
          [-half + 1.5, -VISOR.half + 0.35],
          [-half + 3.2, -VISOR.half + 0.35],
        ],
        0.06,
      ),
    ],
    0.3,
    { detail: true },
  );
  return out.layers;
}

export const SCREEN: FaceDesign<Field, Mode> = {
  id: 'screen',
  layout: {
    lift: LIFT,
    separation: SEPARATION,
    minSeparation: 4,
    mouthDrop: VISOR.half + MOUTH_GAP - LIFT,
    mouthScale: MOUTH_SCALE,
    mouthWeight: 1,
    blush: { x: 4.4, y: 2.95 },
    gazeShift: 0.3,
  },
  expressions: { ...KINDS, ...MODES },
  classes: CLASSES,
  states: {
    ...STATE_CUTE_EYES,
    thinking: ['scan'],
    composing: ['scan'],
    reading: ['read'],
    writing: ['read'],
    searching: ['seek'],
    orbit: ['orbit'],
    radar: ['radar'],
    working: ['scanline'],
    loading: ['spin'],
    progress: ['bar'],
    uploading: ['up'],
    receiving: ['recv'],
    sending: ['send'],
    listening: ['eq'],
    dictating: ['eqFast'],
    humming: ['eqWave'],
    messaging: ['typing'],
    waiting: ['wait'],
    notifying: ['ping'],
    alerting: ['alarm'],
    sleeping: ['sleep'],
    'powering-down': ['off'],
    drowsy: ['drowsy'],
    bored: ['drowsy'],
    waking: ['boot'],
    spawning: ['boot'],
    scared: ['tremble', 'dotSmall'],
  },
  mouths: CUTE_MOUTHS,
  stateMouth: STATE_CUTE_MOUTH,
  mouthPaint: 'feature',
  // The panels show what the activity effects would.
  quietFx: [
    'dots',
    'ellipsis',
    'spinner',
    'progress',
    'ripple',
    'orbit',
    'waves',
    'rise',
    'fall',
    'send',
    'bubbles',
  ],
  kaomoji: {
    eyes: {
      open: '▮',
      wide: '█',
      small: '▪',
      half: '▬',
      look: '▮',
      smile: '◠',
      closed: '▁',
      mad: ['◣', '◢'],
      sad: ['◥', '◤'],
      cross: '⊠',
      star: '✦',
    },
    special: {
      scan: '▬',
      read: '▭',
      seek: '◎',
      orbit: '◌',
      radar: '◴',
      scanline: '▤',
      spin: '◷',
      bar: '▰',
      up: '▴',
      recv: '◂',
      send: '▸',
      eq: '▥',
      eqFast: '▥',
      eqWave: '▥',
      typing: '…',
      ping: '◉',
      alarm: '▲',
      off: '▫',
      boot: '▯',
    },
    mouths: CUTE_MOUTH_GLYPHS,
  },
  eye,
  plate,
};
