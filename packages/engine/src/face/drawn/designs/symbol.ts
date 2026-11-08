/**
 * `symbol`: round eyes at rest that turn into symbols.
 *
 * In the feeling states the eyes are dots, arcs, lidded dots and the cute
 * face's x and star, and a few feelings get a symbol of their own: hearts,
 * sparkles, a question mark, a spiral. In the busy states the eyes become
 * what the character is busy with — a progress ring, a magnifier, a gear, a
 * clock, a speech bubble, a radar. Every symbol is an amount on the eye, so
 * one grows out of the place where the last one shrinks away.
 *
 * Symbols that are read (a question mark, a note) are drawn the same way
 * round on both sides; the rest mirror like eyes.
 */
import type { Point } from '../../../core/types.js';
import { lerp } from '../../../math/easing.js';
import { STATE_CUTE_EYES, STATE_CUTE_MOUTH } from '../../../motion/states.js';
import { CUTE_MOUTHS } from '../../features.js';
import {
  arcPoints,
  bandRing,
  circleRing,
  ellipseBand,
  ellipseRing,
  heartRing,
  lidBand,
  meet,
  quad,
  ribbon,
  sparkleRing,
  starRing,
  dropRing,
} from '../geometry.js';
import { CUTE_MOUTH_GLYPHS } from '../glyphs.js';
import { clockOf, LayerList, pulse, smooth, unit, vocabulary } from '../reading.js';
import type { DrawnEye, EyeClass, EyeContext, FaceDesign, FaceLayer, FacePaint } from '../types.js';

/** Symbols are drawn in a unit circle and grown by this, in dot radii. */
const SCALE = 1.4;
const LIFT = 0.2;
const SEPARATION = 6;
const MOUTH_GAP = 1.05;
/** A symbol's line weight, in its own units. */
const STROKE = 0.21;
/** How much of the gaze a symbol follows unless it says otherwise. */
const GAZE = 0.3;

const SYMBOLS = [
  'dot',
  'arcUp',
  'arcDown',
  'mad',
  'anger',
  'sad',
  'heart',
  'spark',
  'star',
  'question',
  'exclaim',
  'spiral',
  'dots',
  'bubble',
  'ringLoad',
  'ringProgress',
  'ringUp',
  'ringDown',
  'ringSend',
  'magnifier',
  'clock',
  'orbit',
  'radar',
  'gear',
  'ping',
  'power',
  'listen',
  'listenFast',
  'note',
  'sleepz',
  'scared',
  'sweat',
  'cross',
] as const;
type SymbolId = (typeof SYMBOLS)[number];
type Field = SymbolId | 'size' | 'open' | 'offX' | 'offY';

const REST = {
  ...(Object.fromEntries(SYMBOLS.map((id) => [id, 0])) as Record<SymbolId, number>),
  size: 1,
  open: 1,
  offX: 0,
  offY: 0,
} satisfies DrawnEye<Field>;

/** One symbol, drawn about the origin in its own units. */
interface SymbolArt {
  /** Share of the gaze it follows. */
  gaze?: number;
  /** Drawn the same way round on both sides. */
  natural?: boolean;
  /** Whether a blink squashes it with the eye. */
  blinks?: boolean;
  draw(c: SymbolContext): void;
}

interface SymbolContext {
  out: Pen;
  t: number;
  order: number;
  spec: DrawnEye<Field>;
}

type PieceFlags = Pick<FaceLayer, 'detail' | 'holes' | 'loose'>;

/**
 * Collects a symbol's pieces in its own units, with the symbol's own motion
 * (`dx`, `dy`, `rot`, `sx`, `sy`), and lays them onto the eye once drawn.
 */
class Pen {
  dx = 0;
  dy = 0;
  rot = 0;
  sx = 1;
  sy = 1;
  private readonly pieces: { paint: FacePaint; rings: Point[][]; opacity: number; flags: PieceFlags }[] = [];
  constructor(private readonly weight: number) {}

  fill(paint: FacePaint, rings: (Point[] | null)[], opacity = 1, flags: PieceFlags = {}): void {
    this.pieces.push({ paint, rings: rings.filter((r): r is Point[] => !!r), opacity, flags });
  }

  line(paint: FacePaint, points: Point[], half = STROKE, opacity = 1, flags: PieceFlags = {}): void {
    this.fill(paint, [ribbon(points, half * this.weight)], opacity, flags);
  }

  ring(paint: FacePaint, points: Point[], half = STROKE, opacity = 1): void {
    this.fill(paint, [ribbon(points, half * this.weight, true)], opacity);
  }

  /**
   * Lay the pieces into `out`: through the symbol's motion, grown by `pop`
   * and squashed by `squash` about its centre, turned the right way round by
   * `flip`, moved by the eye's offset and scaled into dot radii.
   */
  finish(
    out: LayerList,
    flip: number,
    pop: number,
    squash: number,
    ox: number,
    oy: number,
    alpha: number,
  ): void {
    const c = Math.cos(this.rot);
    const s = Math.sin(this.rot);
    const map = ([x, y]: Point): Point => {
      const px = x * this.sx;
      const py = y * this.sy;
      const rx = this.dx + px * c - py * s;
      const ry = this.dy + px * s + py * c;
      return [(rx * pop * flip + ox) * SCALE, (ry * pop * squash + oy) * SCALE];
    };
    for (const p of this.pieces)
      out.add(
        p.paint,
        p.rings.map((points) => points.map(map)),
        p.opacity * alpha,
        p.flags,
      );
  }
}

/** A disc with a lid cut straight across its top: `y = m x + c`. */
const lidded = (r: number, m: number, c: number): Point[] | null =>
  bandRing(
    meet(
      ellipseBand(0, 0, r, r),
      lidBand(
        (x) => m * x + c,
        () => Infinity,
      ),
    ),
  );

const cubic = (p0: Point, p1: Point, p2: Point, p3: Point, n = 12): Point[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ] as Point;
  });

/** A full ring of `r` with `on` of its turn lit from `start` (radians), as a line. */
const arcLine = (r: number, start: number, on: number): Point[] =>
  arcPoints(0, 0, r, start, start + Math.PI * 2 * Math.max(0.02, on), Math.max(4, Math.round(24 * on)));

const glints = (pen: Pen): void => {
  pen.fill('glint', [circleRing(-0.34, -0.38, 0.3, 12)]);
  pen.fill('glint', [circleRing(0.36, 0.4, 0.13, 10)], 0.55, { detail: true });
};

/** A progress ring, its arc lit `len` of the way, turned to `turn`, with an arrow pointing `arrow` (radians) when it moves something. */
function ring(pen: Pen, len: number, turn: number, mirror: boolean, arrow: number | null, t: number): void {
  pen.ring('feature', circleRing(0, 0, 1, 28), 0.23, 0.26);
  const arc = arcLine(1, turn, len).map(([x, y]) => [mirror ? -x : x, y] as Point);
  pen.line('feature', arc, 0.23);
  if (arrow === null) return;
  const bob = Math.sin(t * 5) * 0.08;
  const c = Math.cos(arrow);
  const s = Math.sin(arrow);
  const head = (
    [
      [-0.24, -0.4],
      [0.2, 0],
      [-0.24, 0.4],
    ] as Point[]
  ).map(([x, y]) => [(x + bob) * c - y * s, (x + bob) * s + y * c] as Point);
  pen.line('feature', head, 0.15);
}

const progress = (t: number, speed: number): number => unit((t * speed) % 1.2);

const ART: Record<SymbolId, SymbolArt> = {
  dot: {
    gaze: 0.6,
    blinks: true,
    draw({ out, spec }) {
      out.sx = spec.size;
      out.sy = spec.size * Math.max(0.06, spec.open);
      out.fill('feature', [circleRing(0, 0, 1, 24)]);
      glints(out);
    },
  },
  arcUp: {
    gaze: 0.4,
    draw({ out }) {
      out.dy = -0.1;
      out.line('feature', quad([-1.05, 0.5], [0, -1.05], [1.05, 0.5]), 0.25);
    },
  },
  arcDown: {
    gaze: 0.4,
    draw({ out }) {
      out.line('feature', quad([-1, -0.25], [0, 0.75], [1, -0.25]), 0.25);
    },
  },
  mad: {
    blinks: true,
    draw({ out }) {
      out.fill('feature', [lidded(1.05, 0.6, -0.2)]);
      out.fill('glint', [circleRing(-0.25, 0.3, 0.2, 10)]);
    },
  },
  anger: {
    natural: true,
    draw({ out, t }) {
      out.dx = 1.15;
      out.dy = -1.45;
      const k = 0.62 * (1 + 0.12 * pulse(t * 9));
      out.sx = out.sy = k;
      for (const [sx, sy] of [
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ] as const) {
        out.line(
          'flame',
          quad([sx * 0.12, sy * 0.62], [sx * 0.2, sy * 0.2], [sx * 0.62, sy * 0.12], 6),
          0.18,
        );
      }
    },
  },
  sad: {
    blinks: true,
    draw({ out, t, order }) {
      out.fill('feature', [lidded(1.05, -0.45, -0.35)]);
      out.fill('glint', [circleRing(-0.2, 0.28, 0.2, 10)]);
      const u = (t * 0.55 + order * 0.5) % 1;
      const grow = 0.15 + 0.85 * smooth(u / 0.35);
      const fall = unit((u - 0.4) / 0.6);
      const y = 1.15 + fall * fall * 2.2;
      const drop = dropRing(0.45 * grow).map(([x, yy]) => [x + 0.1, yy + y] as Point);
      out.fill('tear', [drop], 1 - unit((fall - 0.55) / 0.45), { loose: true });
    },
  },
  heart: {
    natural: true,
    draw({ out, t, order }) {
      out.sx = out.sy = 1 + 0.1 * pulse(t * 6.5 + order * 0.6);
      out.dy = -0.05;
      out.fill('rose', [heartRing(1.2)]);
      out.fill('glint', [circleRing(-0.62, -0.5, 0.17, 10)], 0.75, { detail: true });
    },
  },
  spark: {
    natural: true,
    draw({ out, t, order }) {
      out.rot = (Math.sin(t * 2 + order) * 8 * Math.PI) / 180;
      out.fill('gold', [sparkleRing(1.3, 0.12)]);
      const twinkle = 0.5 + 0.5 * Math.sin(t * 5 + order * 2);
      const small = sparkleRing(1.3 * (0.2 + 0.18 * twinkle), 0.12).map(
        ([x, y]) => [x + 0.95, y - 0.95] as Point,
      );
      out.fill('gold', [small]);
    },
  },
  star: {
    natural: true,
    draw({ out, t, order }) {
      out.rot = (Math.sin(t * 3 + order) * 12 * Math.PI) / 180;
      out.sx = out.sy = 1 + 0.08 * pulse(t * 6);
      out.fill('gold', [starRing(1.3, 0.446)]);
      out.fill('glint', [circleRing(-0.3, -0.4, 0.13, 10)], 0.7, { detail: true });
    },
  },
  question: {
    natural: true,
    draw({ out, t, order }) {
      out.rot = (Math.sin(t * 3 + order * 1.3) * 9 * Math.PI) / 180;
      out.dy = -0.1;
      out.line(
        'feature',
        cubic([-0.58, -0.6], [-0.58, -1.4], [0.72, -1.4], [0.72, -0.6]).concat(
          cubic([0.72, -0.6], [0.72, 0.05], [0, 0.1], [0, 0.58]).slice(1),
        ),
      );
      out.fill('feature', [circleRing(0, 1.08, 0.27, 12)]);
    },
  },
  exclaim: {
    natural: true,
    draw({ out, t }) {
      out.sx = out.sy = 1 + 0.1 * pulse(t * 8);
      out.fill('feature', [
        [
          ...quad([-0.4, -1.2], [0, -1.38], [0.4, -1.2], 6),
          [0.2, 0.4],
          ...quad([0.2, 0.4], [0, 0.55], [-0.2, 0.4], 4).slice(1),
        ],
      ]);
      out.fill('feature', [circleRing(0, 1.05, 0.3, 12)]);
    },
  },
  spiral: {
    natural: true,
    draw({ out, t }) {
      out.rot = (((t * 260) % 360) * Math.PI) / 180;
      const turns = Array.from({ length: 49 }, (_, i) => {
        const u = i / 48;
        const a = u * Math.PI * 3.4;
        return [Math.cos(a) * (0.12 + u), Math.sin(a) * (0.12 + u)] as Point;
      });
      out.line('feature', turns, 0.17);
    },
  },
  dots: {
    natural: true,
    draw({ out, t, order }) {
      out.fill(
        'feature',
        [-0.85, 0, 0.85].map((x, i) =>
          circleRing(x, 0.2 - 0.6 * pulse(t * 6 - i * 0.9 - order * 1.4), 0.33, 12),
        ),
      );
    },
  },
  bubble: {
    natural: true,
    draw({ out, t }) {
      out.dy = -0.1;
      const corner = (cx: number, cy: number, from: number): Point[] =>
        arcPoints(cx, cy, 0.55, from, from + Math.PI / 2, 5);
      out.fill('feature', [
        [
          ...corner(-0.65, -0.45, Math.PI),
          ...corner(0.65, -0.45, -Math.PI / 2),
          ...corner(0.65, 0.15, 0),
          [0.05, 0.7],
          [-0.95, 1.3],
          [-0.6, 0.7],
          ...corner(-0.65, 0.15, Math.PI / 2),
        ],
      ]);
      out.fill(
        'glint',
        [-0.62, 0, 0.62].map((x, i) => circleRing(x, -0.15 - 0.22 * pulse(t * 6 - i * 0.9), 0.15, 10)),
      );
    },
  },
  ringLoad: {
    natural: true,
    draw({ out, t }) {
      ring(out, 0.28, ((t * 330) % 360) * (Math.PI / 180), false, null, t);
    },
  },
  ringProgress: {
    natural: true,
    draw({ out, t }) {
      ring(out, progress(t, 0.36), -Math.PI / 2, false, null, t);
    },
  },
  ringUp: {
    natural: true,
    draw({ out, t }) {
      ring(out, progress(t, 0.5), -Math.PI / 2, false, -Math.PI / 2, t);
    },
  },
  ringDown: {
    natural: true,
    draw({ out, t }) {
      ring(out, 1 - progress(t, 0.36), -Math.PI / 2, true, Math.PI / 2, t);
    },
  },
  ringSend: {
    natural: true,
    draw({ out, t }) {
      ring(out, progress(t, 0.8), -Math.PI / 2, false, 0, t);
    },
  },
  magnifier: {
    natural: true,
    draw({ out, t }) {
      out.dx = Math.sin(t * 1.8) * 0.3 - 0.1;
      out.dy = Math.cos(t * 2.3) * 0.25 - 0.1;
      out.ring('feature', circleRing(-0.2, -0.2, 0.8, 24));
      out.line(
        'feature',
        [
          [0.4, 0.4],
          [1.1, 1.1],
        ],
        0.25,
      );
      out.fill('glint', [ribbon(arcPoints(-0.2, -0.2, 0.5, Math.PI * 1.05, Math.PI * 1.45, 6), 0.09)], 0.7, {
        detail: true,
      });
    },
  },
  clock: {
    natural: true,
    draw({ out, t }) {
      out.ring('feature', circleRing(0, 0, 1, 28), 0.19);
      const hand = (len: number, turns: number): Point[] => {
        const a = turns * Math.PI * 2 - Math.PI / 2;
        return [
          [0, 0],
          [Math.cos(a) * len, Math.sin(a) * len],
        ];
      };
      out.line('feature', hand(0.68, (t * 240) / 360), 0.14);
      out.line('feature', hand(0.42, (t * 20) / 360), 0.14);
    },
  },
  orbit: {
    natural: true,
    draw({ out, t }) {
      out.ring('feature', circleRing(0, 0, 0.95, 28), 0.1, 0.25);
      const a = t * 3.4;
      out.fill('feature', [
        circleRing(0, 0, 0.26, 12),
        circleRing(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0.27, 12),
      ]);
    },
  },
  radar: {
    natural: true,
    draw({ out, t }) {
      out.ring('feature', circleRing(0, 0, 1, 28), 0.17);
      const a = (((t * 220) % 360) * Math.PI) / 180;
      const fan: Point[] = [[0, 0], ...arcPoints(0, 0, 0.9, a - (50 * Math.PI) / 180, a, 8)];
      out.fill('feature', [fan], 0.35);
      out.line(
        'feature',
        [
          [0, 0],
          [Math.cos(a) * 0.9, Math.sin(a) * 0.9],
        ],
        0.12,
      );
      out.fill('feature', [circleRing(0, 0, 0.16, 10)]);
    },
  },
  gear: {
    natural: true,
    draw({ out, t, order }) {
      out.rot = (((t * 70 * (order ? -1 : 1)) % 360) * Math.PI) / 180;
      const teeth: Point[] = [];
      for (let i = 0; i < 8; i++) {
        const base = (i * Math.PI) / 4;
        for (const [da, r] of [
          [-0.2, 0.86],
          [-0.13, 1.22],
          [0.13, 1.22],
          [0.2, 0.86],
        ] as const) {
          teeth.push([Math.cos(base + da) * r, Math.sin(base + da) * r]);
        }
      }
      out.fill('feature', [teeth, circleRing(0, 0, 0.38, 14)], 1, { holes: true });
    },
  },
  ping: {
    gaze: 0.5,
    blinks: true,
    draw({ out, t }) {
      out.fill('feature', [circleRing(0, 0, 1, 24)]);
      glints(out);
      for (const i of [0, 1]) {
        const u = (t * 0.9 + i * 0.5) % 1;
        out.ring('feature', circleRing(0, 0, 1.15 + u * 0.9, 28), 0.1, 0.8 * (1 - u));
      }
    },
  },
  power: {
    natural: true,
    draw({ out, t, order }) {
      out.sx = out.sy = 1 + 0.07 * Math.sin(t * 4 + order);
      // An open circle round the bottom, from upper left to upper right, under a stem.
      const from = Math.atan2(-0.66, -0.62);
      const to = Math.atan2(-0.66, 0.62) - Math.PI * 2;
      out.line('feature', arcPoints(0, 0, 0.95, from, to, 20));
      out.line('feature', [
        [0, -1.12],
        [0, -0.05],
      ]);
    },
  },
  listen: {
    gaze: 0.5,
    blinks: true,
    draw: (c) => listening(c, 5),
  },
  listenFast: {
    gaze: 0.5,
    blinks: true,
    draw: (c) => listening(c, 9),
  },
  note: {
    natural: true,
    draw({ out, t, order }) {
      const swing = Math.sin(t * 4 + order * 1.5);
      out.rot = (swing * 10 * Math.PI) / 180;
      out.dy = -Math.abs(swing) * 0.18;
      const head = ellipseRing(0, 0, 0.5, 0.36, 16).map(([x, y]) => {
        const a = (-20 * Math.PI) / 180;
        return [-0.3 + x * Math.cos(a) - y * Math.sin(a), 0.75 + x * Math.sin(a) + y * Math.cos(a)] as Point;
      });
      out.fill('feature', [head]);
      out.line(
        'feature',
        [[0.12, 0.65], ...cubic([0.12, -1.05], [0.2, -0.5], [0.9, -0.5], [0.9, 0.1], 8)],
        0.16,
      );
    },
  },
  sleepz: {
    natural: true,
    draw({ out, t }) {
      out.line('feature', quad([-1, -0.25], [0, 0.75], [1, -0.25]), 0.25);
      for (const i of [0, 1]) {
        const u = (t * 0.42 + i * 0.5) % 1;
        const k = 0.3 + 0.32 * u;
        const x = lerp(0.7, 2.1, u);
        const y = lerp(-0.9, -2.7, u);
        const z = (
          [
            [-0.7, -0.7],
            [0.7, -0.7],
            [-0.7, 0.7],
            [0.7, 0.7],
          ] as Point[]
        ).map(([zx, zy]) => [x + zx * k, y + zy * k] as Point);
        out.line('feature', z, 0.3 * k, Math.min(1, u / 0.15) * (1 - unit((u - 0.7) / 0.3)), { loose: true });
      }
    },
  },
  scared: {
    draw({ out, t }) {
      out.dx = Math.sin(t * 38) * 0.05;
      out.dy = Math.cos(t * 31) * 0.04;
      out.fill('feature', [circleRing(0, 0, 0.5, 16)]);
      out.fill('glint', [circleRing(-0.15, -0.17, 0.16, 10)]);
    },
  },
  sweat: {
    draw({ out, t }) {
      const u = (t * 0.8) % 1;
      out.fill(
        'tear',
        [dropRing(0.32).map(([x, y]) => [x - 1.45, y - 0.9 + u * 1.2] as Point)],
        1 - unit((u - 0.6) / 0.4),
        { loose: true },
      );
    },
  },
  cross: {
    natural: true,
    draw({ out }) {
      out.line(
        'feature',
        [
          [-0.8, -0.8],
          [0.8, 0.8],
        ],
        0.25,
      );
      out.line(
        'feature',
        [
          [0.8, -0.8],
          [-0.8, 0.8],
        ],
        0.25,
      );
    },
  },
};

function listening({ out, t, order }: SymbolContext, speed: number): void {
  out.fill('feature', [circleRing(0, 0, 1, 24)]);
  glints(out);
  for (const i of [0, 1]) {
    const x = -1.55 - i * 0.5;
    const y = 0.5 + i * 0.35;
    out.line(
      'feature',
      quad([x, -y], [-1.95 - i * 0.6, 0], [x, y], 8),
      0.13,
      0.25 + 0.75 * pulse(t * speed - i * 1.1 + order),
    );
  }
}

/** A symbol fades in faster than it grows, so it is legible while still popping out. */
const FADE_IN = 2.2;

function eye(spec: DrawnEye<Field>, ctx: EyeContext): FaceLayer[] {
  const t = clockOf(ctx);
  const out = new LayerList();
  const squash = Math.max(0.06, Math.min(1, ctx.blink * 1.4));
  for (const id of SYMBOLS) {
    const amount = spec[id];
    if (amount < 0.004) continue;
    const art = ART[id];
    const pen = new Pen(ctx.weight);
    art.draw({ out: pen, t, order: ctx.order, spec });
    const gaze = art.gaze ?? GAZE;
    pen.finish(
      out,
      art.natural ? ctx.nose : 1,
      amount,
      art.blinks ? squash : 1,
      (spec.offX + ctx.look[0]) * gaze,
      (spec.offY + ctx.look[1]) * gaze,
      unit(amount * FADE_IN),
    );
  }
  return out.layers;
}

const forms = vocabulary<Field>(REST, (read) => {
  switch (read.kind) {
    case 'open':
      return { dot: 1, size: read.size, open: read.open, offX: read.off[0], offY: read.off[1] };
    case 'smile':
      return { dot: 0, arcUp: 1 };
    case 'closed':
      return { dot: 0, arcDown: 1 };
    case 'mad':
      return { dot: 0, mad: 1 };
    case 'sad':
      return { dot: 0, sad: 1 };
    case 'cross':
      return { dot: 0, cross: 1 };
    case 'star':
      return { dot: 0, star: 1 };
  }
});

/** An eye showing one symbol. */
const show = (...ids: SymbolId[]): DrawnEye<Field> => ({
  ...REST,
  dot: 0,
  ...Object.fromEntries(ids.map((id) => [id, 1])),
});
const pair = (left: SymbolId[], right: SymbolId[] = left) => [show(...left), show(...right)] as const;

const OWN = {
  heart: pair(['heart']),
  spark: pair(['spark']),
  spiral: pair(['spiral']),
  question: pair(['question']),
  exclaim: pair(['exclaim']),
  /** The sweat runs down one side of the face, the anger mark sits on one side, the Zs rise from one. */
  scared: pair(['scared'], ['scared', 'sweat']),
  fuming: pair(['mad'], ['mad', 'anger']),
  asleep: pair(['arcDown'], ['sleepz']),
  ringLoad: pair(['ringLoad']),
  ringProgress: pair(['ringProgress']),
  ringUp: pair(['ringUp']),
  ringDown: pair(['ringDown']),
  ringSend: pair(['ringSend']),
  magnifier: pair(['magnifier']),
  dots: pair(['dots']),
  bubble: pair(['bubble']),
  clock: pair(['clock']),
  orbit: pair(['orbit']),
  radar: pair(['radar']),
  gear: pair(['gear']),
  ping: pair(['ping']),
  note: pair(['note']),
  listen: pair(['listen']),
  listenFast: pair(['listenFast']),
  power: pair(['power']),
};
type Own = keyof typeof OWN;

const CLASSES: Record<Own, readonly [EyeClass, EyeClass]> = {
  heart: ['star', 'star'],
  spark: ['star', 'star'],
  spiral: ['cross', 'cross'],
  question: ['open', 'open'],
  exclaim: ['wide', 'wide'],
  scared: ['small', 'small'],
  fuming: ['mad', 'mad'],
  asleep: ['closed', 'closed'],
  ringLoad: ['open', 'open'],
  ringProgress: ['open', 'open'],
  ringUp: ['open', 'open'],
  ringDown: ['open', 'open'],
  ringSend: ['open', 'open'],
  magnifier: ['look', 'look'],
  dots: ['look', 'look'],
  bubble: ['open', 'open'],
  clock: ['open', 'open'],
  orbit: ['open', 'open'],
  radar: ['open', 'open'],
  gear: ['open', 'open'],
  ping: ['wide', 'wide'],
  note: ['smile', 'smile'],
  listen: ['open', 'open'],
  listenFast: ['open', 'open'],
  power: ['open', 'open'],
};

export const SYMBOL: FaceDesign<Field, Own> = {
  id: 'symbol',
  layout: {
    lift: LIFT,
    separation: SEPARATION,
    minSeparation: 4,
    mouthDrop: 1.3 * SCALE + MOUTH_GAP - LIFT,
    mouthScale: 1,
    mouthWeight: 1,
    blush: { x: 4.7, y: 2.1 },
    gazeShift: 0.4,
  },
  expressions: { ...forms, ...OWN },
  classes: CLASSES,
  states: {
    ...STATE_CUTE_EYES,
    happy: ['heart'],
    excited: ['spark'],
    proud: ['spark'],
    composing: ['spark'],
    spawning: ['spark'],
    confused: ['spiral'],
    curious: ['question'],
    surprised: ['exclaim'],
    alerting: ['exclaim'],
    scared: ['scared'],
    angry: ['fuming'],
    sleeping: ['asleep'],
    'powering-down': ['curve'],
    loading: ['ringLoad'],
    progress: ['ringProgress'],
    uploading: ['ringUp'],
    receiving: ['ringDown'],
    sending: ['ringSend'],
    searching: ['magnifier'],
    thinking: ['dots'],
    messaging: ['bubble'],
    waiting: ['clock'],
    orbit: ['orbit'],
    radar: ['radar'],
    working: ['gear'],
    notifying: ['ping'],
    humming: ['note'],
    listening: ['listen'],
    dictating: ['listenFast'],
    waking: ['power'],
  },
  mouths: CUTE_MOUTHS,
  stateMouth: STATE_CUTE_MOUTH,
  mouthPaint: 'feature',
  // The eyes are the hearts, the tears, the Zs and the activities those effects would draw.
  quietFx: [
    'heart',
    'sparkle',
    'tear',
    'zz',
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
      open: '●',
      wide: '●',
      small: '•',
      half: '◒',
      look: '●',
      smile: '◠',
      closed: '◡',
      mad: ['◣', '◢'],
      sad: ['◥', '◤'],
      cross: ['＞', '＜'],
      star: '★',
    },
    special: {
      heart: '♥',
      spark: '✦',
      spiral: '@',
      question: '?',
      exclaim: '!',
      asleep: '－',
      ringLoad: '◌',
      ringProgress: '◔',
      ringUp: '↑',
      ringDown: '↓',
      ringSend: '→',
      magnifier: '⌕',
      dots: '・',
      bubble: '…',
      clock: '◷',
      orbit: '◎',
      radar: '◍',
      gear: '✻',
      ping: '◉',
      note: '♪',
      power: '⏻',
    },
    mouths: CUTE_MOUTH_GLYPHS,
  },
  eye,
};
