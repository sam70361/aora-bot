/**
 * What a character is doing, shown beside it.
 *
 * Sixteen states keep the whole figure and put the meaning in the margin:
 * three dots rising for thinking, a bar that fills for progress, a pencil
 * scribbling beside the face. Shrinking the body to a bead with the meaning
 * orbiting it would be the wrong trade with the cute face, because the face is
 * the character. They are `FxFrame`s like the mood effects, so every renderer
 * already knows how to draw them.
 *
 * Nothing here is drawn round the body. A ring hugging the outline reads as a
 * selection frame rather than as something the character is doing, and on a
 * small mark it is the loudest thing on screen; the spinner, the progress
 * bar, the radar ping and the orbit are small instruments at the top right,
 * where the thinking dots and the Zz already are.
 *
 * Every function is a pure function of time. `settled` is the frame to show
 * when nothing may move: every piece present, none mid-flight.
 */
import { SHAPE_SPACE } from '../core/types.js';
import type { FxKind } from '../core/types.js';
import type { FxFrame, FxItem } from './fx.js';
import { clamp01, lerp } from '../math/easing.js';
import { atX, atY, CORNER_X, CORNER_Y, easeOut, FX_COLORS, K, loop, wave } from './fx-units.js';

/** The kinds this module draws; the rest are moods, in `fx.ts`. */
export type ActivityFxKind = Exclude<
  FxKind,
  'zz' | 'sparkle' | 'bang' | 'strokes' | 'heart' | 'tear' | 'arc'
>;

interface ActivityOptions {
  settled: boolean;
  /** Radius of the circle about the body that the gathering sparkles spiral in from. */
  ring?: number;
}

const C = SHAPE_SPACE / 2;
const TAU = Math.PI * 2;

/** A point on a circle about (cx, cy), `deg` clockwise from twelve o'clock. */
const around = (cx: number, cy: number, radius: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [cx + Math.sin(a) * radius, cy - Math.cos(a) * radius];
};

/** A point on a circle about the body. */
const onCircle = (radius: number, deg: number): [number, number] => around(C, C, radius, deg);

/** How strongly a piece that beats with period `period` is lit, 0..1; fully lit when settled. */
function beat(t: number, period: number, delay: number, settled: boolean): number {
  if (settled) return 1;
  const p = loop(t, period, delay);
  return p < 0 ? 0 : wave(p);
}

const dot = (x: number, y: number, r: number, opacity: number): FxItem => ({
  shape: 'dot',
  x,
  y,
  size: r,
  opacity,
});

const line = (x1: number, y1: number, x2: number, y2: number, width: number, opacity: number): FxItem => ({
  shape: 'line',
  x: x1,
  y: y1,
  x2,
  y2,
  size: 0,
  width,
  opacity,
});

const circle = (x: number, y: number, r: number, width: number, opacity: number): FxItem => ({
  shape: 'arc',
  x,
  y,
  size: r,
  width,
  start: 0,
  sweep: 360,
  opacity,
});

/** An arrow centred on (x, y), pointing up or down: a stem and the two strokes of its head. */
function arrow(x: number, y: number, s: number, dir: 1 | -1, width: number, opacity: number): FxItem[] {
  const tip = y - dir * s;
  const wing = s * 0.7;
  return [
    line(x, y + dir * s, x, tip, width, opacity),
    line(x - wing, tip + dir * wing, x, tip, width, opacity),
    line(x + wing, tip + dir * wing, x, tip, width, opacity),
  ];
}

/** Rises and fades: opacity swells to full mid-way and is gone at both ends. */
const lifetime = (p: number): number => Math.sin(clamp01(p) * Math.PI);

const frame = (kind: FxKind, items: FxItem[], color: string | null = null): FxFrame => ({
  kind,
  color,
  space: 'scene',
  items,
});

export function evaluateActivity(kind: ActivityFxKind, t: number, options: ActivityOptions): FxFrame {
  const { settled } = options;
  const ring = options.ring ?? 100;

  switch (kind) {
    case 'dots':
      // Thinking: three dots climbing out of the top right, each a beat behind the last.
      return frame(
        kind,
        (
          [
            [78, 25, 1.9, 0],
            [85, 17.5, 2.7, 0.2],
            [93, 9, 3.5, 0.4],
          ] as const
        ).map(([x, y, r, delay]) => {
          const w = beat(t, 1.2, delay, settled);
          return dot(atX(x), atY(y), r * K * lerp(0.7, 1, w), lerp(0.35, 1, w));
        }),
      );

    case 'ellipsis':
      // "...": the dots take turns lifting, as a chat does while the other side types.
      return frame(
        kind,
        [76, 84, 92].map((x, i) => {
          const w = beat(t, 1.2, i * 0.22, settled);
          return dot(atX(x), atY(18) - 4.5 * K * w, 2.6 * K, lerp(0.4, 1, w));
        }),
      );

    case 'orbit': {
      // A small planet at the top right with a moon and its trail on a tilted orbit: nearer is bigger and brighter.
      const lead = settled ? 2.2 : t * 2.6;
      return frame(kind, [
        dot(CORNER_X, CORNER_Y, 2.8 * K, 1),
        ...[0, 1, 2].map((i) => {
          const a = lead - i * 0.42;
          const near = (Math.cos(a) + 1) / 2;
          return dot(
            CORNER_X + Math.sin(a) * 11 * K,
            CORNER_Y + Math.cos(a) * 4 * K,
            (2 - i * 0.45) * K * lerp(0.8, 1.15, near),
            (1 - i * 0.3) * lerp(0.5, 1, near),
          );
        }),
      ]);
    }

    case 'bubbles':
      // Two speech bubbles floating up from the shoulder, one after the other.
      return frame(
        kind,
        [0, 1].map((i) => {
          const p = settled ? 0.4 + i * 0.3 : (t / 2.2 + i * 0.5) % 1;
          return circle(
            atX(80 + i * 10),
            atY(lerp(30, 4, easeOut(p))),
            (3 + i * 1.6) * K,
            2.2 * K,
            lifetime(p),
          );
        }),
      );

    case 'spinner': {
      // A loading wheel of eight dots at the top right: the lit one goes round, the ones behind it dim.
      const n = 8;
      const lead = settled ? 2 : ((t % 0.9) / 0.9) * n;
      return frame(
        kind,
        Array.from({ length: n }, (_, i) => {
          const [x, y] = around(CORNER_X, CORNER_Y, 7.5 * K, (i / n) * 360);
          const behind = (((lead - i) % n) + n) % n;
          return dot(x, y, 1.7 * K, lerp(1, 0.2, behind / n));
        }),
      );
    }

    case 'progress': {
      // A small bar at the top right over a faint track: it fills, holds, and starts again.
      const p = settled ? 0.65 : clamp01((t % 4) / 2.5);
      const from = CORNER_X - 11 * K;
      const to = CORNER_X + 11 * K;
      const width = 3.8 * K;
      return frame(kind, [
        line(from, CORNER_Y, to, CORNER_Y, width, 0.2),
        line(from, CORNER_Y, lerp(from, to, p), CORNER_Y, width, p > 0 ? 1 : 0),
      ]);
    }

    case 'ripple':
      // The radar's ping at the top right: a dot, and rings leaving it, each wider and fainter than the last.
      return frame(kind, [
        dot(CORNER_X, CORNER_Y, 2.2 * K, 1),
        ...[0, 1].map((i) => {
          const p = settled ? 0.3 + i * 0.4 : (t / 1.6 + i / 2) % 1;
          return circle(CORNER_X, CORNER_Y, lerp(3.5, 11, easeOut(p)) * K, 2.2 * K, (1 - p) * 0.85);
        }),
      ]);

    case 'waves': {
      // Sound leaving the top right, three arcs lighting outwards.
      const cx = atX(76);
      const cy = atY(28);
      return frame(
        kind,
        [7, 13, 19].map((r, i) => {
          const w = beat(t, 1.2, i * 0.2, settled);
          return { ...circle(cx, cy, r * K, 2.6 * K, lerp(0.25, 1, w)), start: 20, sweep: 70 };
        }),
      );
    }

    case 'rise':
    case 'fall': {
      // Two arrows crossing the top right, up for what leaves and down for what arrives.
      const dir = kind === 'rise' ? 1 : -1;
      return frame(
        kind,
        [0, 1].flatMap((i) => {
          const p = settled ? 0.4 + i * 0.35 : (t / 1.6 + i * 0.5) % 1;
          const y = atY(dir === 1 ? lerp(30, 4, p) : lerp(4, 30, p));
          return arrow(atX(82 + i * 8), y, 4.6 * K, dir, 2.6 * K, lifetime(p));
        }),
      );
    }

    case 'send': {
      // A dart leaving the shoulder for the top right corner, trailing a streak.
      const p = settled ? 0.45 : (t % 1.5) / 1.5;
      const from: [number, number] = [atX(76), atY(20)];
      const to: [number, number] = [atX(97), atY(3)];
      const at = (k: number): [number, number] => [lerp(from[0], to[0], k), lerp(from[1], to[1], k)];
      const head = at(easeOut(p));
      const tail = at(easeOut(p) * 0.45);
      const opacity = p < 0.12 ? p / 0.12 : 1 - (p - 0.12) / 0.88;
      return frame(kind, [
        line(tail[0], tail[1], head[0], head[1], 2.8 * K, opacity * 0.6),
        dot(head[0], head[1], 3.6 * K, opacity),
      ]);
    }

    case 'gather': {
      // Sparkles spiralling in towards the body, as if it were being assembled.
      const p = settled ? 0.5 : (t % 2) / 2;
      return frame(
        kind,
        [0, 1, 2, 3, 4].map((i) => {
          const [x, y] = onCircle(lerp(ring * 1.05, ring * 0.72, easeOut(p)), (i / 5) * 360 + p * 290);
          return { shape: 'star', x, y, size: 4.6 * K, opacity: lifetime(p) } satisfies FxItem;
        }),
        FX_COLORS.gold,
      );
    }

    case 'pencil': {
      // A pencil shading a line at the top right, on the belt's 2:1 Lissajous: two strokes across for every loop down.
      const phase = settled ? 0 : ((t % 1.1) / 1.1) * TAU;
      const across = Math.sin(phase);
      const down = Math.sin(phase * 2);
      const x = atX(84) + across * 7 * K;
      const y = atY(13) + down * 3.4 * K;
      return frame(kind, [
        { shape: 'pencil', x, y, size: 0.74, rotation: 26 + across * 8, opacity: 1 },
        ...[0, 1].map((i) => {
          const trail = settled ? -0.5 - i * 0.45 : Math.sin(phase - 0.5 - i * 0.45);
          return dot(atX(84) + trail * 7 * K, atY(13) + 7.5 * K, 1.6 * K, 0.5 - i * 0.2);
        }),
      ]);
    }
  }
}
