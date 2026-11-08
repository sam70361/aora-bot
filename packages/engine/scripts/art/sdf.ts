/**
 * Signed distance fields for drawing a character in a 100 x 100 box, and the
 * contours that turn a field into outlines.
 *
 * This is the drawing kit of the theme art. It runs only in the generator
 * (`generate-faces.ts`), which bakes every outline into static points; nothing
 * here is part of the engine's runtime.
 */

/** A field: negative inside, positive outside, in box units. */
export type Field = (x: number, y: number) => number;
export type Pt = readonly [number, number];

export const circle =
  (cx: number, cy: number, r: number): Field =>
  (x, y) =>
    Math.hypot(x - cx, y - cy) - r;

/** Close to exact near the edge, which is all the contour and the blends read. */
export function ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0): Field {
  const c = Math.cos((rot * Math.PI) / 180);
  const s = Math.sin((rot * Math.PI) / 180);
  return (x, y) => {
    const u = (x - cx) * c + (y - cy) * s;
    const v = -(x - cx) * s + (y - cy) * c;
    const k0 = Math.hypot(u / rx, v / ry);
    const k1 = Math.hypot(u / (rx * rx), v / (ry * ry));
    return k1 === 0 ? -Math.min(rx, ry) : (k0 * (k0 - 1)) / k1;
  };
}

export function box(cx: number, cy: number, hw: number, hh: number, r = 0): Field {
  return (x, y) => {
    const qx = Math.abs(x - cx) - hw + r;
    const qy = Math.abs(y - cy) - hh + r;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  };
}

/** A stroke from a to b, its radius going from r1 to r2. */
export function stroke(ax: number, ay: number, bx: number, by: number, r1: number, r2 = r1): Field {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  return (x, y) => {
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / len2));
    return Math.hypot(x - ax - dx * t, y - ay - dy * t) - (r1 + (r2 - r1) * t);
  };
}

/** A chain of strokes through `pts`, the radius easing from r1 at the first point to r2 at the last. */
export function chain(pts: readonly Pt[], r1: number, r2 = r1): Field {
  const n = pts.length - 1;
  const segs = pts.slice(1).map((p, i) => {
    const q = pts[i]!;
    return stroke(q[0], q[1], p[0], p[1], r1 + ((r2 - r1) * i) / n, r1 + ((r2 - r1) * (i + 1)) / n);
  });
  return union(...segs);
}

/** A polygon grown by r, which is also what rounds its corners. */
export function poly(pts: readonly Pt[], r = 0): Field {
  return (x, y) => {
    let best = Infinity;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [ax, ay] = pts[j]!;
      const [bx, by] = pts[i]!;
      const ex = bx - ax;
      const ey = by - ay;
      const t = Math.min(1, Math.max(0, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey)));
      best = Math.min(best, Math.hypot(x - ax - ex * t, y - ay - ey * t));
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
    }
    return (inside ? -best : best) - r;
  };
}

export const above =
  (y0: number): Field =>
  (_x, y) =>
    y - y0;
export const below =
  (y0: number): Field =>
  (_x, y) =>
    y0 - y;
export const leftOf =
  (x0: number): Field =>
  (x) =>
    x - x0;
export const rightOf =
  (x0: number): Field =>
  (x) =>
    x0 - x;
export const grow =
  (f: Field, r: number): Field =>
  (x, y) =>
    f(x, y) - r;
export const shell =
  (f: Field, half: number): Field =>
  (x, y) =>
    Math.abs(f(x, y)) - half;
export const union =
  (...fs: Field[]): Field =>
  (x, y) => {
    let d = Infinity;
    for (const f of fs) d = Math.min(d, f(x, y));
    return d;
  };
export const meet =
  (...fs: Field[]): Field =>
  (x, y) => {
    let d = -Infinity;
    for (const f of fs) d = Math.max(d, f(x, y));
    return d;
  };
export const minus =
  (a: Field, b: Field): Field =>
  (x, y) =>
    Math.max(a(x, y), -b(x, y));

function smin(k: number, a: number, b: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Intersection with the corners it makes rounded off by about k. */
export const smeet =
  (k: number, a: Field, b: Field): Field =>
  (x, y) =>
    -smin(k, -a(x, y), -b(x, y));

/** Union with a fillet of about k where the pieces meet: one mass, no seam. */
export const blend =
  (k: number, ...fs: Field[]): Field =>
  (x, y) =>
    fs.reduce((d, f) => smin(k, d, f(x, y)), Infinity);

// ---------------------------------------------------------------- contours

const STEP = 0.5;
const LO = -8;
const N = Math.round((108 - LO) / STEP) + 1;

export type Grid = Float32Array;

export function sampleGrid(f: Field): Grid {
  const g = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) g[j * N + i] = f(LO + i * STEP, LO + j * STEP);
  return g;
}

function signedArea(pts: readonly Pt[]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum / 2;
}

function resample(pts: readonly Pt[], spacing: number): Pt[] {
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i % pts.length]!;
    cum.push(cum[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[pts.length]!;
  const count = Math.max(24, Math.round(total / spacing));
  const out: Pt[] = [];
  let k = 0;
  for (let n = 0; n < count; n++) {
    const s = (total * n) / count;
    while (cum[k + 1]! < s) k++;
    const a = pts[k]!;
    const b = pts[(k + 1) % pts.length]!;
    const seg = cum[k + 1]! - cum[k]!;
    const t = seg > 0 ? (s - cum[k]!) / seg : 0;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

/*
 * Marching squares over the grid, every loop wound the same way, largest first. Each crossing is keyed by the
 * grid edge it lies on, so neighbouring cells meet at the very same point and the loops close exactly.
 */
export function contours(field: Field | Grid, spacing = 0.8): Pt[][] {
  const g = typeof field === 'function' ? sampleGrid(field) : field;
  const adj = new Map<number, number[]>();
  const at = new Map<number, Pt>();
  const point = (id: number): Pt => {
    let p = at.get(id);
    if (p) return p;
    const cell = id >> 1;
    const i = cell % N;
    const j = (cell - i) / N;
    const a = g[cell]!;
    const b = id & 1 ? g[cell + N]! : g[cell + 1]!;
    const t = a / (a - b);
    p = id & 1 ? [LO + i * STEP, LO + (j + t) * STEP] : [LO + (i + t) * STEP, LO + j * STEP];
    at.set(id, p);
    return p;
  };
  const link = (a: number, b: number): void => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  };
  for (let j = 0; j < N - 1; j++) {
    for (let i = 0; i < N - 1; i++) {
      const a = g[j * N + i]! < 0;
      const b = g[j * N + i + 1]! < 0;
      const c = g[(j + 1) * N + i + 1]! < 0;
      const d = g[(j + 1) * N + i]! < 0;
      if (a === b && b === c && c === d) continue;
      const T = (j * N + i) * 2;
      const B = ((j + 1) * N + i) * 2;
      const L = (j * N + i) * 2 + 1;
      const R = (j * N + i + 1) * 2 + 1;
      const crossed: number[] = [];
      if (a !== b) crossed.push(T);
      if (b !== c) crossed.push(R);
      if (c !== d) crossed.push(B);
      if (d !== a) crossed.push(L);
      if (crossed.length === 2) {
        link(crossed[0]!, crossed[1]!);
        continue;
      }
      const mid = g[j * N + i]! + g[j * N + i + 1]! + g[(j + 1) * N + i + 1]! + g[(j + 1) * N + i]! < 0;
      if (a === mid) {
        link(T, R);
        link(L, B);
      } else {
        link(L, T);
        link(R, B);
      }
    }
  }
  const seen = new Set<number>();
  const loops: { area: number; pts: Pt[] }[] = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const pts: Pt[] = [];
    let prev = -1;
    let cur = start;
    do {
      seen.add(cur);
      pts.push(point(cur));
      const [n0, n1] = adj.get(cur)!;
      const next = n0 !== prev ? n0! : n1!;
      prev = cur;
      cur = next;
    } while (cur !== start && pts.length < 100000);
    if (pts.length < 6) continue;
    const signed = signedArea(pts);
    if (Math.abs(signed) < 1.5) continue;
    loops.push({
      area: Math.abs(signed),
      pts: resample(signed < 0 ? pts.map((_, i) => pts[pts.length - 1 - i]!) : pts, spacing),
    });
  }
  return loops.sort((x, y) => y.area - x.area).map((l) => l.pts);
}

/** The grid of `zone` cut to the body's field, as a part that shares the body's edge or sits `inset` inside it. */
export function cutTo(zone: Field, body: Grid, inset = 0): Grid {
  const g = sampleGrid(zone);
  for (let i = 0; i < g.length; i++) g[i] = Math.max(g[i]!, body[i]! + inset);
  return g;
}

// ---------------------------------------------------------------- baking

/** Perpendicular distance from p to the line through a and b. */
function offLine(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / len;
}

/** Douglas-Peucker on an open run of points, keeping both ends. */
function simplifyRun(pts: readonly Pt[], tolerance: number): Pt[] {
  if (pts.length < 3) return [...pts];
  let worst = 0;
  let at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = offLine(pts[i]!, pts[0]!, pts[pts.length - 1]!);
    if (d > worst) {
      worst = d;
      at = i;
    }
  }
  if (worst <= tolerance) return [pts[0]!, pts[pts.length - 1]!];
  const head = simplifyRun(pts.slice(0, at + 1), tolerance);
  return [...head.slice(0, -1), ...simplifyRun(pts.slice(at), tolerance)];
}

/**
 * A closed contour as the flat on-curve points of a loop (`smoothLoop`): only
 * the points a Catmull-Rom spline needs to pass within `tolerance` of the
 * contour, never fewer than one every `gap` units, at two decimals.
 */
export function bakeLoop(ring: readonly Pt[], tolerance = 0.08, gap = 6): number[] {
  const n = ring.length;
  const quarter = Math.max(1, Math.floor(n / 4));
  const runs: Pt[] = [];
  for (let q = 0; q < 4; q++) {
    const run = ring.slice(q * quarter, q === 3 ? n : (q + 1) * quarter + 1);
    if (q === 3) run.push(ring[0]!);
    runs.push(...simplifyRun(run, tolerance).slice(0, -1));
  }
  const dense: Pt[] = [];
  for (let i = 0; i < runs.length; i++) {
    const a = runs[i]!;
    const b = runs[(i + 1) % runs.length]!;
    dense.push(a);
    const steps = Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / gap);
    for (let s = 1; s <= steps; s++) {
      const t = s / (steps + 1);
      dense.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return dense.flatMap(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
}
