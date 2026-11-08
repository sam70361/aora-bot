/**
 * The cute expressions as readings, and the helpers designs are written with.
 *
 * Every drawn face draws the nineteen cute expressions by name, so the state
 * tables can be shared where a face moves through states the way the cute
 * face does. What each name means is read off the cute eye itself — a dot of
 * some size looking some way, a half-lidded pill, a smiling or a closed arc,
 * a dot under a slanted brow, an x, a star — and a design says what its own
 * eye looks like for each reading. The table is built once, at load.
 */
import type { Point } from '../../core/types.js';
import { CUTE_EYE_IDS, CUTE_EYE_TOPOLOGIES, type CuteEyeId, type EyeSpec } from '../topologies.js';
import { dropRing, ellipseRing, place } from './geometry.js';
import type { DrawnEye, DrawnPair, FaceLayer, FacePaint } from './types.js';

export type EyeKind = 'open' | 'smile' | 'closed' | 'mad' | 'sad' | 'cross' | 'star';

/**
 * One cute eye, read: what kind of eye it is, and for an open eye how open
 * (1 round, 0.5 half-lidded) and how large (1 the resting dot, 1.35
 * startled, 0.62 frightened). `off` is where it looks, in dot radii, with x
 * towards the nose.
 */
export interface EyeReading {
  kind: EyeKind;
  open: number;
  size: number;
  off: Point;
}

/** A cute stroke longer than this (in dot radii) is an arc or a pill rather than a dot. */
const DOT_LENGTH = 0.1;

/** Read one cute eye. `nose` is +1 for the left eye and -1 for the right. */
export function readCuteEye(spec: EyeSpec, nose: 1 | -1): EyeReading {
  const off: Point = [spec.dx * nose, spec.dy];
  const base = { open: 1, size: 1, off };
  if ((spec.star ?? 0) > 0.5) return { ...base, kind: 'star' };
  const extra = spec.extra;
  if (extra && extra.amount > 0.5) {
    if (Math.abs(Math.abs(extra.angle) - Math.PI / 4) < 0.1) return { ...base, kind: 'cross' };
    // A brow dropping towards the nose is anger; one falling away from it is sorrow.
    return { ...base, kind: extra.angle * nose > 0 ? 'mad' : 'sad' };
  }
  if (spec.len > DOT_LENGTH && spec.bend !== 0) return { ...base, kind: spec.bend < 0 ? 'smile' : 'closed' };
  if (spec.len > DOT_LENGTH) {
    // A pill: as tall as twice its width, as long as its length and width together.
    const tall = spec.width;
    const long = spec.len + spec.width;
    return { kind: 'open', open: tall / long, size: long, off };
  }
  return { kind: 'open', open: 1, size: spec.width, off };
}

/** Both eyes of every cute expression, read. */
export const CUTE_EYE_READINGS = Object.fromEntries(
  CUTE_EYE_IDS.map((id) => {
    const [left, right] = CUTE_EYE_TOPOLOGIES[id];
    return [id, [readCuteEye(left, 1), readCuteEye(right, -1)] as const];
  }),
) as Record<CuteEyeId, readonly [EyeReading, EyeReading]>;

/**
 * A design's eye for every cute expression: `rest` overlaid with what `form`
 * says for each eye's reading.
 */
export function vocabulary<F extends string>(
  rest: DrawnEye<F>,
  form: (reading: EyeReading) => Partial<Record<F, number>>,
): Record<CuteEyeId, DrawnPair<F>> {
  const out = {} as Record<CuteEyeId, DrawnPair<F>>;
  for (const id of CUTE_EYE_IDS) {
    const [l, r] = CUTE_EYE_READINGS[id];
    out[id] = [
      { ...rest, ...form(l) },
      { ...rest, ...form(r) },
    ];
  }
  return out;
}

/** A reading's offset scaled by `k` and held within `limit`: how far an eye's contents look. */
export const looking = (off: Point, k: number, limit: number): Point => {
  const x = off[0] * k;
  const y = off[1] * k;
  const len = Math.hypot(x, y);
  const s = len > limit ? limit / len : 1;
  return [x * s, y * s];
};

/** Startle and fright of an open eye, each 0..1: how far its size is past the resting dot either way. */
export const startle = (size: number): number => Math.min(1, Math.max(0, (size - 1.18) / 0.14));
export const fright = (size: number): number => Math.min(1, Math.max(0, (0.8 - size) / 0.1));

/** Below this a layer is not worth drawing. */
const VISIBLE = 0.004;

/**
 * Collects a design's layers, leaving out what is invisible or has no
 * outline, so a part that is not showing costs nothing downstream.
 */
export class LayerList {
  readonly layers: FaceLayer[] = [];

  add(
    paint: FacePaint,
    rings: readonly (Point[] | null | undefined)[],
    opacity = 1,
    extra: Omit<FaceLayer, 'paint' | 'rings' | 'opacity'> = {},
  ): void {
    if (opacity < VISIBLE) return;
    const kept = rings.filter((ring): ring is Point[] => !!ring && ring.length > 2);
    if (kept.length === 0) return;
    this.layers.push({ paint, rings: kept, opacity: Math.min(1, opacity), ...extra });
  }
}

/** Clamp to 0..1. */
export const unit = (v: number): number => Math.min(1, Math.max(0, v));

/** Hermite ease of a 0..1 value. */
export const smooth = (u: number): number => {
  const v = unit(u);
  return v * v * (3 - 2 * v);
};

/** The positive half of a sine: a beat that rests between pulses. */
export const pulse = (u: number): number => Math.max(0, Math.sin(u));

/** A repeatable 0..1 value per integer, for flicker that must be the same on every run. */
export const noise = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * The moment a settled frame shows of a looping animation: far enough into
 * every loop that each piece is present and none is at its start.
 */
export const SETTLED_TIME = 0.9;

/** The animation clock of a context: its own time, or the settled moment. */
export const clockOf = (ctx: { time: number; settled: boolean }): number =>
  ctx.settled ? SETTLED_TIME : ctx.time;

/** Half-width of a falling tear, in dot radii, and the share of a loop it spends welling up. */
const TEAR = { width: 0.52, well: 0.2 } as const;

/**
 * A tear that wells up at `(x, y0)`, slides to `y1` and fades, looping;
 * `seed` puts the two eyes out of step. Lays a drop and its highlight into
 * `out` at `weight` of its own opacity.
 */
export function fallingTear(
  out: LayerList,
  ctx: { time: number; settled: boolean; order: number },
  weight: number,
  x: number,
  y0: number,
  y1: number,
): void {
  if (weight < 0.004) return;
  const phase = (clockOf(ctx) * 0.42 + ctx.order * 0.37) % 1;
  const fade = Math.min(1, phase / TEAR.well) * Math.min(1, (1 - phase) * 4);
  const k = 0.55 + 0.45 * Math.min(1, phase * 3);
  const y = y0 + (y1 - y0) * phase;
  out.add('tear', [place(dropRing(TEAR.width), x, y, k)], weight * fade, { loose: true });
  out.add('glint', [place(ellipseRing(-0.18, 0.38, 0.12, 0.2, 12), x, y, k)], weight * fade * 0.9, {
    detail: true,
    loose: true,
  });
}

/** Distribute `a..b` over `n + 1` points. */
export const spread = (a: number, b: number, n: number): number[] =>
  Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

/**
 * The runs of a profile that lie inside an ellipse of half-size `rx` by
 * `ry` about the origin, as polylines: where a lid crosses the white.
 */
export function insideRuns(
  f: (x: number) => number,
  rx: number,
  ry: number,
  below: boolean,
  n = 30,
): Point[][] {
  const runs: Point[][] = [];
  let run: Point[] = [];
  for (const x of spread(-rx, rx, n)) {
    const edge = ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
    const v = f(x);
    if (below ? v < edge - 0.04 : v > -edge + 0.04) run.push([x, v]);
    else if (run.length > 0) {
      if (run.length > 1) runs.push(run);
      run = [];
    }
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

/** How shut an eye is from the gap between its lids at the middle: 0 open, 1 shut. */
export const shutness = (gap: number, span: number): number => unit((span - gap) / span);
