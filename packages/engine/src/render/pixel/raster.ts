/**
 * Geometry to cells, in pure arithmetic.
 *
 * Nothing here asks a canvas or a browser whether a point is inside a path,
 * so the same rasteriser runs in Node for static output. Everything is in
 * buffer coordinates (one unit per cell), points are interleaved `x, y`
 * pairs, and a cell `(col, row)` covers `[col, col + 1) × [row, row + 1)`.
 */

/** Crossings of one scanline, reused: rasterising a body allocates nothing. */
let crossings = new Float64Array(256);

/** x positions where the closed polygon crosses the horizontal line `y`, sorted. */
function scan(xy: Float64Array, n: number, y: number): number {
  if (crossings.length < n) crossings = new Float64Array(n * 2);
  let count = 0;
  let px = xy[(n - 1) * 2]!;
  let py = xy[(n - 1) * 2 + 1]!;
  for (let i = 0; i < n; i++) {
    const x = xy[i * 2]!;
    const yy = xy[i * 2 + 1]!;
    if (py <= y !== yy <= y) {
      const x0 = px + ((y - py) * (x - px)) / (yy - py);
      // Insertion keeps the list sorted; a row rarely has more than a few.
      let j = count++;
      while (j > 0 && crossings[j - 1]! > x0) {
        crossings[j] = crossings[j - 1]!;
        j--;
      }
      crossings[j] = x0;
    }
    px = x;
    py = yy;
  }
  return count;
}

function rows(xy: Float64Array, n: number, size: number): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < n; i++) {
    const y = xy[i * 2 + 1]!;
    if (y < lo) lo = y;
    if (y > hi) hi = y;
  }
  return [Math.max(0, Math.floor(lo)), Math.min(size - 1, Math.floor(hi))];
}

/** Set `mask` for every cell whose centre is inside the polygon. */
export function fillCentres(xy: Float64Array, n: number, size: number, mask: Uint8Array): void {
  if (n < 3) return;
  const [first, last] = rows(xy, n, size);
  for (let row = first; row <= last; row++) {
    const count = scan(xy, n, row + 0.5);
    for (let i = 0; i + 1 < count; i += 2) {
      // The centre `c + 0.5` is inside `[a, b)` exactly when `a - 0.5 <= c < b - 0.5`.
      const from = Math.max(0, Math.ceil(crossings[i]! - 0.5));
      const to = Math.min(size, Math.ceil(crossings[i + 1]! - 0.5));
      for (let col = from; col < to; col++) mask[row * size + col] = 1;
    }
  }
}

/**
 * Add each cell's covered fraction to `out`. Exact along x, sampled `sub`
 * times along y, so thin features keep a meaningful coverage instead of being
 * lost between sample points.
 */
export function addCoverage(xy: Float64Array, n: number, size: number, out: Float32Array, sub = 4): void {
  if (n < 3) return;
  const [first, last] = rows(xy, n, size);
  const weight = 1 / sub;
  for (let row = first; row <= last; row++) {
    for (let s = 0; s < sub; s++) {
      const count = scan(xy, n, row + (s + 0.5) * weight);
      for (let i = 0; i + 1 < count; i += 2) {
        const a = crossings[i]!;
        const b = crossings[i + 1]!;
        const from = Math.max(0, Math.floor(a));
        const to = Math.min(size - 1, Math.floor(b));
        for (let col = from; col <= to; col++) {
          const cover = Math.min(b, col + 1) - Math.max(a, col);
          if (cover > 0) out[row * size + col]! += cover * weight;
        }
      }
    }
  }
}

export type Put = (col: number, row: number) => void;

/**
 * Mark the cells a round pen of radius `r` touches at `(x, y)`.
 *
 * A pen thinner than a cell marks the one cell it is in. That is what keeps a
 * hairline from flickering between zero, one and two cells wide as it moves.
 */
export function stampDisc(x: number, y: number, r: number, put: Put): void {
  if (r <= 0.55) {
    put(Math.floor(x), Math.floor(y));
    return;
  }
  const r2 = r * r;
  const reach = Math.ceil(r);
  const col0 = Math.floor(x);
  const row0 = Math.floor(y);
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const cx = col0 + dx + 0.5 - x;
      const cy = row0 + dy + 0.5 - y;
      if (cx * cx + cy * cy <= r2) put(col0 + dx, row0 + dy);
    }
  }
}

/** Distance between pen stamps along a stroke, in cells. Small enough to leave no gaps. */
const STEP = 0.25;

/** Stroke an open or closed polyline with a round pen of radius `r`. */
export function strokePolyline(xy: Float64Array, n: number, closed: boolean, r: number, put: Put): void {
  if (n === 0) return;
  if (n === 1) {
    stampDisc(xy[0]!, xy[1]!, r, put);
    return;
  }
  const segments = closed ? n : n - 1;
  for (let i = 0; i < segments; i++) {
    const x0 = xy[i * 2]!;
    const y0 = xy[i * 2 + 1]!;
    const j = (i + 1) % n;
    const x1 = xy[j * 2]!;
    const y1 = xy[j * 2 + 1]!;
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / STEP));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      stampDisc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, put);
    }
  }
}

/**
 * Stroke a circular arc, clockwise from `start` to `end` (radians, 0 at three
 * o'clock). `dash` lights only `on` of every `period` cells of arc length,
 * counted from `start`.
 */
export function strokeArc(
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number,
  r: number,
  put: Put,
  dash?: { on: number; period: number },
): void {
  const sweep = end - start;
  const length = Math.abs(sweep) * radius;
  const steps = Math.max(2, Math.ceil(length / STEP));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    if (dash && (t * length) % dash.period >= dash.on) continue;
    const a = start + sweep * t;
    stampDisc(cx + radius * Math.cos(a), cy + radius * Math.sin(a), r, put);
  }
}

/** Mark the cells whose centres are inside a circle, and at least the cell the centre is in. */
export function fillDisc(x: number, y: number, r: number, put: Put): void {
  const r2 = r * r;
  const reach = Math.ceil(r);
  const col0 = Math.floor(x);
  const row0 = Math.floor(y);
  put(col0, row0);
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const cx = col0 + dx + 0.5 - x;
      const cy = row0 + dy + 0.5 - y;
      if (cx * cx + cy * cy <= r2) put(col0 + dx, row0 + dy);
    }
  }
}
