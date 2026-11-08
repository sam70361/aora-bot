/**
 * Outlines worked out on a grid of signed distances: a figure grown by a
 * width, and the crescent a piece leaves when it is moved off itself.
 *
 * Both are drawn as fills. A thick round-joined stroke is tessellated again
 * every frame the body squashes, and a sticker edge and an ink line on twenty
 * characters cost more than everything else they draw; a filled outline is
 * worked out once per outline (the caller caches it by the outline's
 * identity) and costs a fill.
 */
import type { Point, Ring } from '../core/types.js';

/** Grid spacing, in shape units. The contour is interpolated across a smooth distance, so it is far finer than this. */
const STEP = 2;
/** Side of a bucket of edges, in shape units. */
const BUCKET = 8;
/** Grid points per side of a cell of the coarse pass that bounds the distances. */
const COARSE = 4;

interface Edges {
  rings: readonly Ring[];
  /** Edge indices by bucket, as `ring * 65536 + edge`. */
  buckets: Map<number, number[]>;
}

const bucketKey = (bx: number, by: number): number => (bx + 1024) * 4096 + (by + 1024);

function edgesOf(rings: readonly Ring[]): Edges {
  const buckets = new Map<number, number[]>();
  rings.forEach((ring, r) => {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]!;
      const b = ring[(i + 1) % ring.length]!;
      const x0 = Math.floor(Math.min(a[0], b[0]) / BUCKET);
      const x1 = Math.floor(Math.max(a[0], b[0]) / BUCKET);
      const y0 = Math.floor(Math.min(a[1], b[1]) / BUCKET);
      const y1 = Math.floor(Math.max(a[1], b[1]) / BUCKET);
      for (let bx = x0; bx <= x1; bx++) {
        for (let by = y0; by <= y1; by++) {
          const key = bucketKey(bx, by);
          let list = buckets.get(key);
          if (!list) buckets.set(key, (list = []));
          list.push(r * 65536 + i);
        }
      }
    }
  });
  return { rings, buckets };
}

/**
 * Distance from (x, y) to the nearest edge, or `reach` when none is that
 * close. Buckets are searched in widening rings, and the search stops once
 * the nearest edge found is closer than any bucket of the next ring can be.
 */
function distance(edges: Edges, x: number, y: number, reach: number): number {
  let best = reach * reach;
  const span = Math.ceil(reach / BUCKET);
  const cx = Math.floor(x / BUCKET);
  const cy = Math.floor(y / BUCKET);
  const check = (bx: number, by: number): void => {
    const list = edges.buckets.get(bucketKey(bx, by));
    if (!list) return;
    for (const code of list) {
      const ring = edges.rings[Math.floor(code / 65536)]!;
      const i = code % 65536;
      const a = ring[i]!;
      const b = ring[(i + 1) % ring.length]!;
      const ex = b[0] - a[0];
      const ey = b[1] - a[1];
      const len2 = ex * ex + ey * ey;
      let t = len2 > 0 ? ((x - a[0]) * ex + (y - a[1]) * ey) / len2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = x - a[0] - ex * t;
      const dy = y - a[1] - ey * t;
      const d2 = dx * dx + dy * dy;
      if (d2 < best) best = d2;
    }
  };
  for (let r = 0; r <= span; r++) {
    if (r > 0 && best <= ((r - 1) * BUCKET) ** 2) break;
    for (let bx = cx - r; bx <= cx + r; bx++) {
      check(bx, cy - r);
      if (r > 0) check(bx, cy + r);
    }
    for (let by = cy - r + 1; by <= cy + r - 1; by++) {
      check(cx - r, by);
      check(cx + r, by);
    }
  }
  return Math.sqrt(best);
}
function insideRing(ring: Ring, x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

interface Grid {
  x0: number;
  y0: number;
  cols: number;
  rows: number;
  values: Float32Array;
}

function boundsOf(rings: readonly Ring[], pad: number): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const ring of rings) {
    for (const [x, y] of ring) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}

/**
 * Signed distance to the union of `rings` at every grid point, negative
 * inside, exact where it is within `margin` of `level` and only bounded
 * elsewhere: the contour at `level` is all a caller reads, and its
 * interpolation reads the points either side of it. Inside is found a row at
 * a time from where the rings cross it, so a point costs a few edges, not
 * every edge.
 */
function signedGrid(
  rings: readonly Ring[],
  box: { x0: number; y0: number; x1: number; y1: number },
  level: number,
): Grid {
  const cols = Math.ceil((box.x1 - box.x0) / STEP) + 1;
  const rows = Math.ceil((box.y1 - box.y0) / STEP) + 1;
  const values = new Float32Array(cols * rows);
  const edges = edgesOf(rings);
  const margin = STEP * 2;
  /*
   * A distance moves by at most the distance moved, so a coarse grid of exact
   * distances bounds every point between its nodes from below and above. A
   * point whose bounds keep it clear of `level` is given the near end of the
   * band without measuring; only the band round the contour is measured.
   */
  const span = COARSE * STEP;
  const slack = span * Math.SQRT2;
  const reach = Math.abs(level) + margin + 1;
  const far = reach + slack;
  const coarseCols = Math.ceil(cols / COARSE) + 1;
  const coarseRows = Math.ceil(rows / COARSE) + 1;
  const coarse = new Float32Array(coarseCols * coarseRows);
  for (let cj = 0; cj < coarseRows; cj++) {
    for (let ci = 0; ci < coarseCols; ci++) {
      coarse[cj * coarseCols + ci] = distance(edges, box.x0 + ci * span, box.y0 + cj * span, far);
    }
  }
  const node = (a: number, b: number): number =>
    coarse[Math.min(coarseRows - 1, b) * coarseCols + Math.min(coarseCols - 1, a)]!;
  const near = Math.abs(level);
  const measure = (i: number, j: number, x: number, y: number): number => {
    const ci = Math.floor(i / COARSE);
    const cj = Math.floor(j / COARSE);
    const corners = [node(ci, cj), node(ci + 1, cj), node(ci, cj + 1), node(ci + 1, cj + 1)];
    const low = Math.min(...corners) - slack;
    const high = Math.max(...corners) + slack;
    if (low > near + margin) return near + margin;
    if (high < near - margin) return Math.max(0, near - margin);
    return distance(edges, x, y, reach);
  };
  const inside = new Uint8Array(cols);
  for (let j = 0; j < rows; j++) {
    const y = box.y0 + j * STEP;
    inside.fill(0);
    for (const ring of rings) {
      const xs: number[] = [];
      for (let i = 0, k = ring.length - 1; i < ring.length; k = i++) {
        const a = ring[i]!;
        const b = ring[k]!;
        if (a[1] > y !== b[1] > y) xs.push(((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]);
      }
      xs.sort((p, q) => p - q);
      for (let n = 0; n + 1 < xs.length; n += 2) {
        const from = Math.max(0, Math.ceil((xs[n]! - box.x0) / STEP));
        const to = Math.min(cols - 1, Math.floor((xs[n + 1]! - box.x0) / STEP));
        for (let i = from; i <= to; i++) inside[i] = 1;
      }
    }
    for (let i = 0; i < cols; i++) {
      // A grown outline's level lies outside, so a point inside needs only its sign.
      if (inside[i] && level > 0) {
        values[j * cols + i] = -near;
        continue;
      }
      const d = measure(i, j, box.x0 + i * STEP, y);
      values[j * cols + i] = inside[i] ? -d : d;
    }
  }
  return { x0: box.x0, y0: box.y0, cols, rows, values };
}
/** The zero contours of a grid, as closed rings. */
function contours(grid: Grid): Ring[] {
  const { cols, rows, values: g } = grid;
  const adj = new Map<number, number[]>();
  const at = (id: number): Point => {
    const cell = id >> 1;
    const i = cell % cols;
    const j = (cell - i) / cols;
    const a = g[cell]!;
    const b = id & 1 ? g[cell + cols]! : g[cell + 1]!;
    const t = a / (a - b);
    return id & 1
      ? [grid.x0 + i * STEP, grid.y0 + (j + t) * STEP]
      : [grid.x0 + (i + t) * STEP, grid.y0 + j * STEP];
  };
  const link = (a: number, b: number): void => {
    let la = adj.get(a);
    if (!la) adj.set(a, (la = []));
    let lb = adj.get(b);
    if (!lb) adj.set(b, (lb = []));
    la.push(b);
    lb.push(a);
  };
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = g[j * cols + i]! < 0;
      const b = g[j * cols + i + 1]! < 0;
      const c = g[(j + 1) * cols + i + 1]! < 0;
      const d = g[(j + 1) * cols + i]! < 0;
      if (a === b && b === c && c === d) continue;
      const T = (j * cols + i) * 2;
      const B = ((j + 1) * cols + i) * 2;
      const L = (j * cols + i) * 2 + 1;
      const R = (j * cols + i + 1) * 2 + 1;
      const crossed: number[] = [];
      if (a !== b) crossed.push(T);
      if (b !== c) crossed.push(R);
      if (c !== d) crossed.push(B);
      if (d !== a) crossed.push(L);
      if (crossed.length === 2) {
        link(crossed[0]!, crossed[1]!);
        continue;
      }
      const mid =
        g[j * cols + i]! + g[j * cols + i + 1]! + g[(j + 1) * cols + i + 1]! + g[(j + 1) * cols + i]! < 0;
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
  const rings: Ring[] = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const pts: Point[] = [];
    let prev = -1;
    let cur = start;
    do {
      seen.add(cur);
      pts.push(at(cur));
      const [n0, n1] = adj.get(cur)!;
      const next = n0 !== prev ? n0! : n1!;
      prev = cur;
      cur = next;
    } while (cur !== start && pts.length < 100000);
    if (pts.length >= 4) rings.push(pts);
  }
  return rings;
}

const area = (ring: Ring): number => {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
};

/**
 * The rings that are not inside another one: outlines with their holes
 * filled, islands kept. A hole of more than `opening` square units is kept,
 * to be painted even-odd.
 */
function outer(rings: Ring[], opening = Infinity): Ring[] {
  const sorted = rings.filter((ring) => area(ring) > STEP * STEP).sort((a, b) => area(b) - area(a));
  return sorted.filter(
    (ring, i) =>
      area(ring) > opening || !sorted.slice(0, i).some((big) => insideRing(big, ring[0]![0], ring[0]![1])),
  );
}

/** How far, in shape units, a point may lie from the chord between its kept neighbours and still be dropped. */
const THIN = 0.2;

/** Squared distance from `p` to the segment from `a` to `b`. */
function segmentDistance2(p: Point, a: Point, b: Point): number {
  const ex = b[0] - a[0];
  const ey = b[1] - a[1];
  const len2 = ex * ex + ey * ey;
  let t = len2 > 0 ? ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = p[0] - a[0] - ex * t;
  const dy = p[1] - a[1] - ey * t;
  return dx * dx + dy * dy;
}

/**
 * A contour with the points that lie within `THIN` of the chord between their
 * kept neighbours dropped (Ramer-Douglas-Peucker on the closed ring): a
 * contour has a point for every grid cell it crosses, which a smooth outline
 * does not need, and each point is a segment of the path drawn through it.
 */
function thinned(ring: Ring): Ring {
  const n = ring.length;
  if (n < 8) return ring;
  let far = 0;
  let farthest = 0;
  for (let i = 1; i < n; i++) {
    const dx = ring[i]![0] - ring[0]![0];
    const dy = ring[i]![1] - ring[0]![1];
    if (dx * dx + dy * dy > farthest) {
      farthest = dx * dx + dy * dy;
      far = i;
    }
  }
  const keep = new Uint8Array(n);
  keep[0] = keep[far] = 1;
  const spans: [number, number][] = [
    [0, far],
    [far, n],
  ];
  const limit = THIN * THIN;
  while (spans.length > 0) {
    const [from, to] = spans.pop()!;
    const a = ring[from]!;
    const b = ring[to % n]!;
    let worst = -1;
    let at = -1;
    for (let i = from + 1; i < to; i++) {
      const d = segmentDistance2(ring[i]!, a, b);
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (at < 0 || worst <= limit) continue;
    keep[at] = 1;
    spans.push([from, at], [at, to]);
  }
  return ring.filter((_, i) => keep[i] === 1);
}

/** How many times its growth across a hole must be for a grown outline to keep it open. */
const OPENING = 6;

/**
 * The outline of everything in `rings` grown by `by`, its islands kept and
 * its holes filled, except an opening wide enough that a cut-out would keep
 * it (a handle's), which is left as a hole to paint even-odd: one of more
 * than `opening` square units, by default `OPENING` times the growth across.
 */
export function grownRings(rings: readonly Ring[], by: number, opening?: number): Ring[] {
  const grid = signedGrid(rings, boundsOf(rings, by + STEP * 2), by);
  for (let i = 0; i < grid.values.length; i++) grid.values[i] = grid.values[i]! - by;
  return outer(contours(grid), opening ?? (OPENING * Math.max(by, STEP)) ** 2).map(thinned);
}

/** The outline of everything in `rings` shrunk by `by`: what is left at least that far inside. */
export function insetRings(rings: readonly Ring[], by: number): Ring[] {
  const grid = signedGrid(rings, boundsOf(rings, STEP * 2), -by);
  for (let i = 0; i < grid.values.length; i++) grid.values[i] = grid.values[i]! + by;
  return outer(contours(grid)).map(thinned);
}

/** A ring's own signed grid, kept for every shift a crescent of it is cut with. */
const ownGrids = new WeakMap<Ring, { pad: number; grid: Grid }>();

/** The signed grid of `ring` alone, over its box grown by at least `pad`. */
function ownGrid(ring: Ring, pad: number): Grid {
  const kept = ownGrids.get(ring);
  if (kept && kept.pad >= pad) return kept.grid;
  const grid = signedGrid([ring], boundsOf([ring], pad), 0);
  ownGrids.set(ring, { pad, grid });
  return grid;
}

/** A grid's value at (x, y), read bilinearly; a point beyond the grid is outside, as far as the grid tells apart. */
function sampleGrid(grid: Grid, x: number, y: number): number {
  const u = (x - grid.x0) / STEP;
  const v = (y - grid.y0) / STEP;
  const i = Math.floor(u);
  const j = Math.floor(v);
  if (i < 0 || j < 0 || i >= grid.cols - 1 || j >= grid.rows - 1) return STEP * 2;
  const fu = u - i;
  const fv = v - j;
  const g = grid.values;
  const at = j * grid.cols + i;
  const top = g[at]! + (g[at + 1]! - g[at]!) * fu;
  const bottom = g[at + grid.cols]! + (g[at + grid.cols + 1]! - g[at + grid.cols]!) * fu;
  return top + (bottom - top) * fv;
}

/**
 * What of `ring` the ring moved by (dx, dy) does not cover: a crescent on the
 * side away from the move. The moved ring's distance at a point is the ring's
 * own distance a shift back, so every crescent of a ring reads one grid.
 */
export function crescentRings(ring: Ring, dx: number, dy: number): Ring[] {
  const own = ownGrid(ring, STEP * 2 + Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4) * 4);
  const values = new Float32Array(own.values.length);
  for (let j = 0; j < own.rows; j++) {
    for (let i = 0; i < own.cols; i++) {
      const at = j * own.cols + i;
      const moved = sampleGrid(own, own.x0 + i * STEP - dx, own.y0 + j * STEP - dy);
      values[at] = Math.max(own.values[at]!, -moved);
    }
  }
  return contours({ ...own, values })
    .filter((r) => area(r) > STEP * STEP)
    .map(thinned);
}
