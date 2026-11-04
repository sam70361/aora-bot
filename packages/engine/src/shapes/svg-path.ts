/**
 * Turning hand-drawn art into outlines.
 *
 * The roster is drawn the way a designer draws it — SVG path strings in a
 * 100 x 100 box — and the engine works on point lists, so this module bridges
 * the two. It is deliberately not a general SVG parser: one closed subpath,
 * the commands the roster uses, no implicit repeats beyond what the grammar
 * says.
 */
import type { Point } from '../core/types.js';

/** Distance between samples along a curve, in the units of the source art. */
const DEFAULT_STEP = 1.6;

const ARG_COUNT: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, Q: 4, A: 7, Z: 0 };

/** Points of an elliptical arc, from the endpoint form SVG paths use (SVG 1.1 appendix F.6). */
function arcPoints(
  [x0, y0]: Point,
  [rx0, ry0, rotation, large, sweep, x, y]: readonly number[],
  step: number,
): Point[] {
  let rx = Math.abs(rx0!);
  let ry = Math.abs(ry0!);
  if (rx === 0 || ry === 0) return [[x!, y!]];

  const phi = (rotation! * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x0 - x!) / 2;
  const dy = (y0 - y!) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;

  // Radii too small to span the endpoints are scaled up until they do.
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }

  const numerator = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const denominator = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const factor = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, numerator / denominator));
  const cx1 = (factor * rx * y1) / ry;
  const cy1 = (-factor * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (x0 + x!) / 2;
  const cy = sin * cx1 + cos * cy1 + (y0 + y!) / 2;

  const angle = (ux: number, uy: number, vx: number, vy: number): number =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const theta = angle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let delta = angle((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && delta > 0) delta -= Math.PI * 2;
  else if (sweep && delta < 0) delta += Math.PI * 2;

  const length = Math.abs(delta) * Math.max(rx, ry);
  const count = Math.max(2, Math.ceil(length / step));
  const out: Point[] = [];
  for (let i = 1; i <= count; i++) {
    const t = theta + (delta * i) / count;
    const px = rx * Math.cos(t);
    const py = ry * Math.sin(t);
    out.push([cos * px - sin * py + cx, sin * px + cos * py + cy]);
  }
  return out;
}

/**
 * Sample one closed SVG path into a polygon.
 *
 * Corners stay corners — every vertex of the path is in the output — and
 * curves are sampled about `step` units apart. Absolute and relative
 * `M L H V C Q A Z` are understood.
 */
export function samplePath(d: string, step = DEFAULT_STEP): Point[] {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const points: Point[] = [];
  let i = 0;
  let command = '';
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let started = false;

  const take = (n: number): number[] => {
    const out = tokens.slice(i, i + n).map(Number);
    if (out.length < n || out.some((v) => Number.isNaN(v))) throw new Error(`Bad path data: ${d}`);
    i += n;
    return out;
  };
  const push = (px: number, py: number): void => {
    points.push([px, py]);
    x = px;
    y = py;
  };

  while (i < tokens.length) {
    const token = tokens[i]!;
    if (/[A-Za-z]/.test(token)) {
      command = token;
      i++;
      if (command === 'Z' || command === 'z') {
        x = startX;
        y = startY;
        continue;
      }
    } else if (command === '') {
      throw new Error(`Bad path data: ${d}`);
    }

    const upper = command.toUpperCase();
    const relative = command !== upper;
    const args = take(ARG_COUNT[upper] ?? Number.NaN);
    const ox = relative ? x : 0;
    const oy = relative ? y : 0;

    switch (upper) {
      case 'M':
        if (started) throw new Error('Only one subpath is supported');
        started = true;
        push(args[0]! + ox, args[1]! + oy);
        startX = x;
        startY = y;
        // Further pairs after a move are implicit line-tos.
        command = relative ? 'l' : 'L';
        break;
      case 'L':
        push(args[0]! + ox, args[1]! + oy);
        break;
      case 'H':
        push(args[0]! + ox, y);
        break;
      case 'V':
        push(x, args[0]! + oy);
        break;
      case 'C': {
        const p0: Point = [x, y];
        const p1: Point = [args[0]! + ox, args[1]! + oy];
        const p2: Point = [args[2]! + ox, args[3]! + oy];
        const p3: Point = [args[4]! + ox, args[5]! + oy];
        const length = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        const count = Math.max(2, Math.ceil((length + Math.hypot(p3[0] - p2[0], p3[1] - p2[1])) / step));
        for (let s = 1; s <= count; s++) {
          const t = s / count;
          const u = 1 - t;
          points.push([
            u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
            u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
          ]);
        }
        x = p3[0];
        y = p3[1];
        break;
      }
      case 'Q': {
        const p0: Point = [x, y];
        const p1: Point = [args[0]! + ox, args[1]! + oy];
        const p2: Point = [args[2]! + ox, args[3]! + oy];
        const length = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        const count = Math.max(2, Math.ceil(length / step));
        for (let s = 1; s <= count; s++) {
          const t = s / count;
          const u = 1 - t;
          points.push([
            u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
            u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
          ]);
        }
        x = p2[0];
        y = p2[1];
        break;
      }
      case 'A': {
        const end: Point = [args[5]! + ox, args[6]! + oy];
        const arc = arcPoints(
          [x, y],
          [args[0]!, args[1]!, args[2]!, args[3]!, args[4]!, end[0], end[1]],
          step,
        );
        points.push(...arc);
        x = end[0];
        y = end[1];
        break;
      }
      default:
        throw new Error(`Unsupported path command ${command}`);
    }
  }

  return dropRepeats(points);
}

/** Remove consecutive duplicates, including the point that closes the loop. */
function dropRepeats(points: readonly Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 1e-6) out.push(p);
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (out.length > 1 && first && last && Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-6) out.pop();
  return out;
}

/**
 * A smooth closed loop through sparse points, sampled `step` units apart.
 *
 * The point-loop bodies (`loops.ts`) are sixty to a hundred on-curve points each.
 * Centripetal Catmull-Rom, the same parameterisation `smoothClosedPath` uses,
 * passes through every one of them; joining them with straight chords instead
 * would leave a visible polygon at large sizes.
 */
export function smoothLoop(flat: readonly number[], step = DEFAULT_STEP): Point[] {
  const raw: Point[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) raw.push([flat[i]!, flat[i + 1]!]);
  const pts = dropRepeats(raw);
  const n = pts.length;
  if (n < 3) return pts;

  const at = (k: number): Point => pts[((k % n) + n) % n]!;
  const out: Point[] = [];
  for (let k = 0; k < n; k++) {
    const p0 = at(k - 1);
    const p1 = at(k);
    const p2 = at(k + 1);
    const p3 = at(k + 2);
    const t1 = Math.pow(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), 0.5);
    const t2 = t1 + Math.pow(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), 0.5);
    const t3 = t2 + Math.pow(Math.hypot(p3[0] - p2[0], p3[1] - p2[1]), 0.5);
    const count = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));

    for (let s = 0; s < count; s++) {
      const t = t1 + ((t2 - t1) * s) / count;
      const lerp = (a: Point, b: Point, ta: number, tb: number): Point => {
        const w = tb === ta ? 0 : (t - ta) / (tb - ta);
        return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w];
      };
      const a1 = lerp(p0, p1, 0, t1);
      const a2 = lerp(p1, p2, t1, t2);
      const a3 = lerp(p2, p3, t2, t3);
      const b1 = lerp(a1, a2, 0, t2);
      const b2 = lerp(a2, a3, t1, t3);
      out.push(lerp(b1, b2, t1, t2));
    }
  }
  return out;
}
