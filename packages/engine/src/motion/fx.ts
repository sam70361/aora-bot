/**
 * The cute face's mood effects, as pure functions of time.
 *
 * A mood throws something off besides an expression: a sleeper's Zz, a
 * thinker's rising dots, a happy character's heart. They are laid out in a
 * 100-unit canvas, placed in shape space, and animated as functions of time,
 * so a snapshot carries the frame and every renderer draws the same one.
 *
 * Positions are written in canvas units and converted once by `at`. The
 * figure is drawn at 0.86 scale inset by (7, 10), and the effects sit in the
 * margin that leaves above and to the right of it.
 */
import type { FxKind } from '../core/types.js';
import { evaluateActivity } from './fx-activity.js';
import { clamp01, lerp } from '../math/easing.js';
import { atX, atY, CORNER_X, CORNER_Y, easeIn, easeOut, FX_COLORS, K, loop, wave } from './fx-units.js';

export { FX_COLORS };

/** One drawn piece of an effect. Which fields matter depends on `shape`. */
export interface FxItem {
  shape: 'z' | 'star' | 'heart' | 'drop' | 'bang' | 'line' | 'arc' | 'dot' | 'pencil';
  /** Centre (an arc's centre; a bang's top). */
  x: number;
  y: number;
  /** Edge of a z, reach of a star, scale of a heart, bang, drop or pencil, radius of an arc or dot. */
  size: number;
  /** Stroke width, for the pieces that are strokes. */
  width?: number;
  /** A line's far end. */
  x2?: number;
  y2?: number;
  /** A pencil's lean in degrees, clockwise. */
  rotation?: number;
  /** An arc's start and sweep in degrees, clockwise from twelve o'clock. */
  start?: number;
  sweep?: number;
  opacity: number;
}

export interface FxFrame {
  kind: FxKind;
  /** A fixed colour, or `null` for the body's own ink. */
  color: string | null;
  /** `scene` is fixed in the margin; `face` rides the body, under the eye it belongs to. */
  space: 'scene' | 'face';
  items: FxItem[];
}

/** Where the left eye is, which is where a tear starts: its centre and the dot radius. */
export interface FxAnchor {
  x: number;
  y: number;
  r: number;
}

/** Rises and fades, the Zz. */
function floatZ(x: number, y: number, s: number, t: number, delay: number, settled: boolean): FxItem {
  const p = settled ? 0.3 : loop(t, 2.4, delay);
  const k = Math.max(0, p);
  const opacity = p < 0 ? 0 : k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7;
  const rise = easeOut(k);
  const scale = lerp(0.6, 1, rise);
  return {
    shape: 'z',
    x: atX(x + s / 2 + 4 * rise),
    y: atY(y + s / 2 + lerp(4, -8, rise)),
    size: s * K * scale,
    width: 2.4 * K * scale,
    opacity,
  };
}

/** Swells and dims. */
function twinkle(t: number, delay: number, settled: boolean): { scale: number; opacity: number } {
  const p = settled ? 0.5 : loop(t, 1.4, delay);
  const w = p < 0 ? 0 : wave(p);
  return { scale: lerp(0.45, 1, w), opacity: lerp(0.35, 1, w) };
}

/** A short hop-and-swell at the start of each period, then still. */
function pop(t: number, period: number, settled: boolean): { lift: number; scale: number } {
  const p = settled ? 1 : loop(t, period);
  const b = p < 0.08 ? easeOut(p / 0.08) : p < 0.2 ? 1 - easeOut((p - 0.08) / 0.12) : 0;
  return { lift: -6 * b * K, scale: 1 + 0.06 * b };
}

/**
 * The effect `kind` at time `t`, in seconds.
 *
 * `settled` is the frame to show when nothing may move — reduced motion and
 * static output: every piece present, none mid-flight.
 *
 * `ring` is the radius about the body that gathering sparkles start from, `anchor` the tear's eye.
 */
export function evaluateFx(
  kind: FxKind,
  t: number,
  options: { settled?: boolean; ring?: number; anchor?: FxAnchor } = {},
): FxFrame {
  const settled = options.settled ?? false;
  switch (kind) {
    case 'zz':
      return {
        kind,
        color: null,
        space: 'scene',
        items: [
          floatZ(74, 24, 5, t, 0, settled),
          floatZ(82, 13, 6.5, t, 0.8, settled),
          floatZ(90, 2, 8, t, 1.6, settled),
        ],
      };

    case 'sparkle':
      return {
        kind,
        color: FX_COLORS.gold,
        space: 'scene',
        items: (
          [
            [14, 26, 6.5, 0],
            [88, 30, 4.8, 0.45],
            [80, 9, 3.6, 0.9],
          ] as const
        ).map(([x, y, r, delay]): FxItem => {
          const k = twinkle(t, delay, settled);
          return { shape: 'star', x: atX(x), y: atY(y), size: r * K * k.scale, opacity: k.opacity };
        }),
      };

    case 'heart': {
      const k = twinkle(t, 0, settled);
      return {
        kind,
        color: FX_COLORS.heart,
        space: 'scene',
        items: [{ shape: 'heart', x: atX(87), y: atY(20), size: 4.6 * K * k.scale, opacity: k.opacity }],
      };
    }

    case 'bang': {
      const k = pop(t, 1.8, settled);
      return {
        kind,
        color: FX_COLORS.alert,
        space: 'scene',
        items: [{ shape: 'bang', x: atX(88.3), y: atY(6) + k.lift, size: K * k.scale, opacity: 1 }],
      };
    }

    case 'strokes': {
      const k = pop(t, 1.8, settled);
      // Three short strokes fanning off the top right, nudged together by the pop.
      const cx = 83.5;
      const cy = 19;
      const at = (x: number, y: number): [number, number] => [
        atX(cx + (x - cx) * k.scale),
        atY(cy + (y - cy) * k.scale) + k.lift,
      ];
      return {
        kind,
        color: null,
        space: 'scene',
        items: (
          [
            [74, 16, 76, 8],
            [82, 21, 89, 15],
            [85, 30, 93, 29],
          ] as const
        ).map(([x1, y1, x2, y2]): FxItem => {
          const [ax, ay] = at(x1, y1);
          const [bx, by] = at(x2, y2);
          return { shape: 'line', x: ax, y: ay, x2: bx, y2: by, size: 0, width: 2.8 * K, opacity: 1 };
        }),
      };
    }

    case 'tear': {
      const a = options.anchor;
      if (!a) return { kind, color: FX_COLORS.tear, space: 'face', items: [] };
      const p = settled ? 0.35 : loop(t, 2.2);
      // Fades in over the first fifth, then falls and fades out.
      const opacity = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8;
      return {
        kind,
        color: FX_COLORS.tear,
        space: 'face',
        items: [
          {
            shape: 'drop',
            x: a.x,
            y: a.y + a.r * (9 / 4.6) + easeIn(p) * a.r * (9 / 4.6),
            size: a.r * (2.8 / 4.6),
            opacity: clamp01(opacity),
          },
        ],
      };
    }

    case 'arc': {
      // A small arc at the top right: a third of a turn chasing round, once every 1.1 s.
      const turn = settled ? 0 : ((t % 1.1) / 1.1) * 360;
      return {
        kind,
        color: null,
        space: 'scene',
        items: [
          {
            shape: 'arc',
            x: CORNER_X,
            y: CORNER_Y,
            size: 7.5 * K,
            width: 3 * K,
            start: turn,
            sweep: 120,
            opacity: 1,
          },
        ],
      };
    }

    default:
      return evaluateActivity(kind, t, { settled, ring: options.ring });
  }
}
