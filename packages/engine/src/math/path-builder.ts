/**
 * Minimal SVG path writer. Every generator in `shapes/` emits through this so
 * numbers are rounded consistently and paths stay diffable in snapshot tests.
 */

import { roundTo } from './round.js';

const round = (n: number): number => roundTo(n, 3);

export class PathBuilder {
  private parts: string[] = [];

  moveTo(x: number, y: number): this {
    this.parts.push(`M${round(x)} ${round(y)}`);
    return this;
  }

  lineTo(x: number, y: number): this {
    this.parts.push(`L${round(x)} ${round(y)}`);
    return this;
  }

  curveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): this {
    this.parts.push(`C${round(x1)} ${round(y1)} ${round(x2)} ${round(y2)} ${round(x)} ${round(y)}`);
    return this;
  }

  quadTo(x1: number, y1: number, x: number, y: number): this {
    this.parts.push(`Q${round(x1)} ${round(y1)} ${round(x)} ${round(y)}`);
    return this;
  }

  /**
   * Circular arc approximated with cubic Béziers, split so no segment exceeds
   * 90 degrees (the point past which a single cubic drifts visibly).
   */
  arcTo(cx: number, cy: number, r: number, from: number, to: number): this {
    const sweep = to - from;
    const segments = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2)));
    const step = sweep / segments;
    // Control-point offset for a cubic approximating a circular arc of `step`.
    const k = (4 / 3) * Math.tan(step / 4);

    for (let i = 0; i < segments; i++) {
      const a0 = from + step * i;
      const a1 = a0 + step;
      const x0 = cx + r * Math.cos(a0);
      const y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1);
      const y1 = cy + r * Math.sin(a1);

      if (i === 0 && this.parts.length === 0) this.moveTo(x0, y0);

      this.curveTo(
        x0 - k * r * Math.sin(a0),
        y0 + k * r * Math.cos(a0),
        x1 + k * r * Math.sin(a1),
        y1 - k * r * Math.cos(a1),
        x1,
        y1,
      );
    }
    return this;
  }

  close(): this {
    this.parts.push('Z');
    return this;
  }

  toString(): string {
    return this.parts.join('');
  }
}

/** Drop points closer together than `epsilon`, including the wrap-around pair. */
function dedupePoints(points: readonly (readonly [number, number])[], epsilon = 1e-4): [number, number][] {
  const out: [number, number][] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < epsilon) continue;
    out.push([p[0], p[1]]);
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (out.length > 1 && first && last && Math.hypot(first[0] - last[0], first[1] - last[1]) < epsilon) {
    out.pop();
  }
  return out;
}

/**
 * Subdivide any segment longer than `maxLength` so spacing is roughly even.
 *
 * Interpolating a spline through unevenly spaced points is the classic way to
 * get a lumpy outline: a long segment next to a cluster makes the curve bulge
 * outward across the gap. Rounded polygons are exactly that shape of problem —
 * a dense fan of points around each corner, then one long jump down a straight
 * edge.
 */
function resampleEvenly(points: readonly (readonly [number, number])[], maxLength = 5): [number, number][] {
  const n = points.length;
  if (n < 2) return points.map((p) => [p[0], p[1]]);

  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % n]!;
    out.push([a[0], a[1]]);

    const distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.floor(distance / maxLength);
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/**
 * Closed Catmull-Rom spline through `points`, converted to cubic Béziers.
 *
 * Uses centripetal parameterisation (alpha = 0.5) rather than uniform. With
 * uniform knots the curve overshoots wherever point spacing changes abruptly,
 * and can loop back on itself; centripetal parameterisation is provably free
 * of cusps and self-intersections for any input spacing. Since outlines here
 * come from generators with very different sampling densities, that guarantee
 * is what keeps a rounded hexagon from bulging between its corners.
 *
 * Points are deduplicated and evenly resampled first, which removes the worst
 * of the spacing variation before the spline ever sees it.
 */
export function smoothClosedPath(
  points: readonly (readonly [number, number])[],
  { alpha = 0.5, resample = 5 }: { alpha?: number; resample?: number } = {},
): string {
  const prepared =
    resample > 0 ? dedupePoints(resampleEvenly(dedupePoints(points), resample)) : dedupePoints(points);

  const n = prepared.length;
  if (n < 3) return '';

  const p = (i: number) => prepared[((i % n) + n) % n]!;
  const knot = (a: readonly [number, number], b: readonly [number, number]) =>
    Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), alpha) || 1e-6;

  const b = new PathBuilder();
  const first = p(0);
  b.moveTo(first[0], first[1]);

  for (let i = 0; i < n; i++) {
    const p0 = p(i - 1);
    const p1 = p(i);
    const p2 = p(i + 1);
    const p3 = p(i + 2);

    const d1 = knot(p0, p1);
    const d2 = knot(p1, p2);
    const d3 = knot(p2, p3);

    // Tangents scaled by the non-uniform knot spacing, then converted from
    // Hermite to Bézier control points.
    const m1x = ((p2[0] - p0[0]) / (d1 + d2)) * d2;
    const m1y = ((p2[1] - p0[1]) / (d1 + d2)) * d2;
    const m2x = ((p3[0] - p1[0]) / (d2 + d3)) * d2;
    const m2y = ((p3[1] - p1[1]) / (d2 + d3)) * d2;

    b.curveTo(p1[0] + m1x / 3, p1[1] + m1y / 3, p2[0] - m2x / 3, p2[1] - m2y / 3, p2[0], p2[1]);
  }

  b.close();
  return b.toString();
}
