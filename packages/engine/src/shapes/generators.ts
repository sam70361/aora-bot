/**
 * Generic outline helpers for custom shapes.
 *
 * The built-in roster is drawn by hand in `characters.ts`; what is left here
 * is what a host needs to build an outline for `defineShape`: rounded
 * polygons, superellipses, unions of circles and a way to soften cusps. Every
 * helper returns a dense closed outline centred on the origin. The registry
 * normalises and re-centres afterwards, so only the proportions matter.
 */

type Pt = [number, number];

const TAU = Math.PI * 2;

/** Sample a polar radius function. */
function polar(radiusAt: (theta: number) => number, samples = 160): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * TAU;
    const r = radiusAt(t);
    out.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  return out;
}

/** Sample a parametric outline. */
function parametric(at: (t: number) => Pt, samples = 160): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < samples; i++) out.push(at((i / samples) * TAU));
  return out;
}

/**
 * Outline of a polygon with rounded corners.
 *
 * Each radius is clipped to whatever the two adjacent edges can accommodate,
 * so an over-large radius degrades into a circle rather than producing
 * self-intersecting geometry. Straight runs are subdivided to roughly the same
 * spacing as the corner arcs: a spline through a dense fan of corner points
 * followed by one long jump down a flat edge bows outward across the gap.
 */
export function roundedPolygon(vertices: readonly Pt[], radii: readonly number[], arcSamples = 16): Pt[] {
  const n = vertices.length;
  const out: Pt[] = [];

  const pushEdge = (from: Pt, to: Pt) => {
    const distance = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const steps = Math.max(1, Math.round(distance / EDGE_SPACING));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      out.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]);
    }
  };

  for (let i = 0; i < n; i++) {
    const prev = vertices[(i - 1 + n) % n]!;
    const cur = vertices[i]!;
    const next = vertices[(i + 1) % n]!;

    const v1x = prev[0] - cur[0];
    const v1y = prev[1] - cur[1];
    const v2x = next[0] - cur[0];
    const v2y = next[1] - cur[1];

    const l1 = Math.hypot(v1x, v1y);
    const l2 = Math.hypot(v2x, v2y);
    if (l1 < 1e-6 || l2 < 1e-6) {
      pushEdge(out[out.length - 1] ?? cur, cur);
      out.push(cur);
      continue;
    }

    const u1x = v1x / l1;
    const u1y = v1y / l1;
    const u2x = v2x / l2;
    const u2y = v2y / l2;

    const dot = Math.max(-1, Math.min(1, u1x * u2x + u1y * u2y));
    const angle = Math.acos(dot);
    if (angle < 1e-4 || Math.abs(Math.PI - angle) < 1e-4) {
      pushEdge(out[out.length - 1] ?? cur, cur);
      out.push(cur);
      continue;
    }

    const half = angle / 2;
    const maxOffset = Math.min(l1, l2) / 2;
    const radius = Math.min(radii[i] ?? 0, maxOffset * Math.tan(half));
    const offset = radius / Math.tan(half);

    const t1: Pt = [cur[0] + u1x * offset, cur[1] + u1y * offset];
    const t2: Pt = [cur[0] + u2x * offset, cur[1] + u2y * offset];

    const bx = u1x + u2x;
    const by = u1y + u2y;
    const bl = Math.hypot(bx, by) || 1;
    const dist = radius / Math.sin(half);
    const cx = cur[0] + (bx / bl) * dist;
    const cy = cur[1] + (by / bl) * dist;

    const a1 = Math.atan2(t1[1] - cy, t1[0] - cx);
    const a2 = Math.atan2(t2[1] - cy, t2[0] - cx);
    let sweep = a2 - a1;
    while (sweep > Math.PI) sweep -= TAU;
    while (sweep < -Math.PI) sweep += TAU;

    pushEdge(out[out.length - 1] ?? t1, t1);

    const arcLength = Math.abs(sweep) * radius;
    const steps = Math.max(4, Math.min(arcSamples * 2, Math.round(arcLength / EDGE_SPACING)));

    for (let s = 0; s <= steps; s++) {
      const a = a1 + (sweep * s) / steps;
      out.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
    }
  }

  const firstPoint = out[0];
  const lastPoint = out[out.length - 1];
  if (firstPoint && lastPoint) pushEdge(lastPoint, firstPoint);

  return out;
}

/** Target spacing between outline samples, in shape-space units. */
const EDGE_SPACING = 4;

/**
 * |x/a|^n + |y/b|^n = 1.
 *
 * n = 2 is an ellipse, n around 4 is a squircle, higher tends towards a
 * rectangle and lower towards a diamond. Curvature is continuous everywhere,
 * which is what makes these read as smooth at any size.
 */
export const superellipse = (a: number, b: number, n: number, samples = 180): Pt[] =>
  parametric((t) => {
    const c = Math.cos(t);
    const s = Math.sin(t);
    return [a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)];
  }, samples);

/**
 * Union of overlapping circles, resolved by taking the farthest surface hit
 * along each ray from the centroid. Cheap, and exact for a convex union.
 */
export const circleUnion = (circles: readonly { x: number; y: number; r: number }[]): Pt[] =>
  polar((t) => {
    const dx = Math.cos(t);
    const dy = Math.sin(t);
    let best = 0;
    for (const c of circles) {
      const b = c.x * dx + c.y * dy;
      const cc = c.x * c.x + c.y * c.y - c.r * c.r;
      const disc = b * b - cc;
      if (disc < 0) continue;
      const hit = b + Math.sqrt(disc);
      if (hit > best) best = hit;
    }
    return best;
  }, 200);

export function resampleClosed(points: readonly Pt[], count: number): Pt[] {
  const n = points.length;
  const cumulative: number[] = [0];
  for (let i = 1; i <= n; i++) {
    const a = points[i - 1]!;
    const b = points[i % n]!;
    cumulative.push(cumulative[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cumulative[n]!;
  const out: Pt[] = [];
  let seg = 0;
  for (let i = 0; i < count; i++) {
    const target = (total * i) / count;
    while (seg < n - 1 && cumulative[seg + 1]! < target) seg++;
    const span = cumulative[seg + 1]! - cumulative[seg]! || 1;
    const t = (target - cumulative[seg]!) / span;
    const a = points[seg]!;
    const b = points[(seg + 1) % n]!;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

/**
 * Low-pass a closed outline by keeping its first `harmonics` Fourier terms.
 *
 * A cusp — the point of an almond, the foot of a shield — is all high
 * frequency. Truncating the series rounds it into a soft point while leaving
 * the broad form untouched, which is a gentler operation than a corner radius
 * because it has no join. Expects evenly spaced input; run `resampleClosed`
 * first. Keeping every harmonic (`harmonics >= points.length / 2`) returns
 * the input unchanged, so the helper is safe to apply unconditionally.
 */
export function fourierSmooth(points: readonly Pt[], harmonics: number): Pt[] {
  const n = points.length;
  if (harmonics <= 0 || harmonics >= n / 2) return points.map((p) => [p[0], p[1]]);

  const coefficients: { a: number[]; b: number[] }[] = [];
  for (const axis of [0, 1] as const) {
    const a: number[] = [];
    const b: number[] = [];
    for (let k = 0; k <= harmonics; k++) {
      let ak = 0;
      let bk = 0;
      for (let i = 0; i < n; i++) {
        const t = (TAU * k * i) / n;
        ak += points[i]![axis] * Math.cos(t);
        bk += points[i]![axis] * Math.sin(t);
      }
      const norm = (k === 0 ? 1 : 2) / n;
      a.push(ak * norm);
      b.push(bk * norm);
    }
    coefficients.push({ a, b });
  }

  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p: Pt = [0, 0];
    for (const axis of [0, 1] as const) {
      const { a, b } = coefficients[axis]!;
      for (let k = 0; k <= harmonics; k++) {
        const t = (TAU * k * i) / n;
        p[axis] += a[k]! * Math.cos(t) + b[k]! * Math.sin(t);
      }
    }
    out.push(p);
  }
  return out;
}
