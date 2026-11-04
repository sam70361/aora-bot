import { lerp } from '../math/easing.js';
import type { Point } from '../core/types.js';
import type { EyeExtra, EyePair, EyeSpec } from './topologies.js';

/** Blend two eye specs. Every field is independent, so the result is always a valid eye. */
export function morphEye(a: EyeSpec, b: EyeSpec, t: number): EyeSpec {
  const out: EyeSpec = {
    dx: lerp(a.dx, b.dx, t),
    dy: lerp(a.dy, b.dy, t),
    len: lerp(a.len, b.len, t),
    width: lerp(a.width, b.width, t),
    // Take the shorter way around so a +40 degree slant never blends through
    // horizontal to reach -40.
    angle: lerp(a.angle, shortestAngle(a.angle, b.angle), t),
    bend: lerp(a.bend, b.bend, t),
  };
  if (a.extra || b.extra) out.extra = morphExtra(a.extra, b.extra, t);
  if (a.star || b.star) out.star = lerp(a.star ?? 0, b.star ?? 0, t);
  return out;
}

/**
 * Blend two second strokes. One that exists only on one side keeps its own
 * geometry and has its amount faded, so it grows or shrinks in place.
 */
function morphExtra(a: EyeExtra | undefined, b: EyeExtra | undefined, t: number): EyeExtra {
  const from = a ?? { ...b!, amount: 0 };
  const to = b ?? { ...a!, amount: 0 };
  return {
    dx: lerp(from.dx, to.dx, t),
    dy: lerp(from.dy, to.dy, t),
    len: lerp(from.len, to.len, t),
    width: lerp(from.width, to.width, t),
    angle: lerp(from.angle, shortestAngle(from.angle, to.angle), t),
    bend: lerp(from.bend, to.bend, t),
    amount: lerp(from.amount, to.amount, t),
  };
}

function shortestAngle(from: number, to: number): number {
  let d = to - from;
  while (d > Math.PI / 2) d -= Math.PI;
  while (d < -Math.PI / 2) d += Math.PI;
  return from + d;
}

export function morphEyePair(a: EyePair, b: EyePair, t: number): EyePair {
  return [morphEye(a[0], b[0], t), morphEye(a[1], b[1], t)];
}

/**
 * Convert a spec into a closed outline.
 *
 * The stroke is offset to both sides of its centreline and closed with
 * semicircular caps.
 *
 * The result is consumed as a polyline rather than a spline. Fitting a
 * Catmull-Rom curve through these points looks correct for a fat oval but
 * blows up for a thin one: where the two offset sides nearly touch, the
 * control points a spline derives from neighbouring samples point in almost
 * opposite directions and the curve loops outward. A closed eye is exactly
 * that degenerate case, so splining it produced a balloon instead of a line.
 */
export function eyeOutline(spec: EyeSpec, radius: number, samples = 28, minWidth = 0.012): Point[] {
  const { len, width, angle, bend } = spec;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // A star takes the stroke's place: the stroke shrinks away as the star grows.
  const keep = 1 - Math.min(1, spec.star ?? 0);
  const L = len * keep * radius;
  // Floor the thickness relative to the eye, not in absolute units. An
  // absolute floor silently thickened every thin expression to the same
  // minimum, which made all seventeen render identically. The line face
  // raises the floor to its shared stroke weight, so thin expressions match
  // the nose and mouth; the length still tells them apart.
  const W = Math.max(radius * minWidth, width * keep * radius);
  const B = bend * keep * radius;

  // Centreline as a parabola bowed by B towards the perpendicular.
  const centre = (t: number): [number, number] => {
    const along = t * L;
    const across = B * (1 - t * t);
    return [cos * along - sin * across, sin * along + cos * across];
  };

  // Analytic tangent of the parabola, used to keep the offset perpendicular.
  const normal = (t: number): [number, number] => {
    const dAlong = L;
    const dAcross = -2 * B * t;
    const tx = cos * dAlong - sin * dAcross;
    const ty = sin * dAlong + cos * dAcross;
    const l = Math.hypot(tx, ty) || 1;
    return [-ty / l, tx / l];
  };

  const points: Point[] = [];

  for (let i = 0; i <= samples; i++) {
    const t = -1 + (2 * i) / samples;
    const [cx, cy] = centre(t);
    const [nx, ny] = normal(t);
    points.push([cx + nx * W, cy + ny * W]);
  }

  // Round cap at the far end.
  const capSteps = Math.max(6, Math.round(samples / 2));
  const [ex, ey] = centre(1);
  const [enx, eny] = normal(1);
  const endAngle = Math.atan2(eny, enx);
  for (let i = 1; i < capSteps; i++) {
    const a = endAngle - (Math.PI * i) / capSteps;
    points.push([ex + Math.cos(a) * W, ey + Math.sin(a) * W]);
  }

  for (let i = samples; i >= 0; i--) {
    const t = -1 + (2 * i) / samples;
    const [cx, cy] = centre(t);
    const [nx, ny] = normal(t);
    points.push([cx - nx * W, cy - ny * W]);
  }

  // Round cap at the near end.
  const [sx, sy] = centre(-1);
  const [snx, sny] = normal(-1);
  const startAngle = Math.atan2(-sny, -snx);
  for (let i = 1; i < capSteps; i++) {
    const a = startAngle - (Math.PI * i) / capSteps;
    points.push([sx + Math.cos(a) * W, sy + Math.sin(a) * W]);
  }

  return points;
}

/** Reach of a full star from its centre, in eye radii: 6.4 over a 4.6 dot. */
const STAR_REACH = 1.39;

/**
 * A four-pointed star with concave sides: each side is a quadratic curve
 * pulled through the centre, which is what makes the points sharp.
 */
function starOutline(reach: number, steps = 8): Point[] {
  const tips: Point[] = [
    [0, -reach],
    [reach, 0],
    [0, reach],
    [-reach, 0],
  ];
  const points: Point[] = [];
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = tips[i]!;
    const [x1, y1] = tips[(i + 1) % 4]!;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const u = 1 - t;
      points.push([u * u * x0 + t * t * x1, u * u * y0 + t * t * y1]);
    }
  }
  return points;
}

/**
 * The shapes an eye draws besides its main stroke: the second stroke (an x's
 * other bar, a brow) and the star. Positioned and sized like `eyeOutline`'s
 * result, so the caller stretches and moves them with it.
 */
export function eyeExtras(spec: EyeSpec, radius: number, samples = 28, minWidth = 0.012): Point[][] {
  const out: Point[][] = [];
  const e = spec.extra;
  if (e && e.amount > 0.02) {
    const grown: EyeSpec = {
      dx: 0,
      dy: 0,
      len: e.len * e.amount,
      width: e.width * e.amount,
      angle: e.angle,
      bend: e.bend * e.amount,
    };
    const ox = e.dx * radius;
    const oy = e.dy * radius;
    out.push(eyeOutline(grown, radius, samples, minWidth).map(([x, y]) => [x + ox, y + oy] as Point));
  }
  const star = Math.min(1, spec.star ?? 0);
  if (star > 0.02) out.push(starOutline(radius * STAR_REACH * star));
  return out;
}
