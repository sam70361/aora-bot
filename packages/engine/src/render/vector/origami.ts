/**
 * The geometry of the origami medium: a sheet crumpled and pressed flat again.
 *
 * The outline is kept as it is, so the silhouette stays round. Inside it, a
 * jittered grid of points and a share of the outline's own points are
 * triangulated, and each triangle is one facet of the pressed sheet, clipped
 * to the outline so a notched piece never spills past its own edge. Every
 * facet is tipped a seeded little way and lit by how far it then faces the
 * light, so the sheet reads as many soft, low facets rather than a few sharp
 * folds. The seed is the outline itself, and a piece folds the same way every
 * time it is drawn.
 */
import type { Ring } from '../../core/types.js';
import { mulberry32 } from '../../math/hash.js';

type Vec = [number, number];

/** One facet: its outline and its light, -1 (in shadow) to 1 (facing the light). */
export interface Facet {
  ring: Vec[];
  light: number;
}

export interface Fold {
  /** The sheet's outline. */
  polygon: Vec[];
  facets: Facet[];
}

/** Above this size (in shape units) a piece is a body, crumpled finer than an ear or a leaf. */
const BODY_SIZE = 90;
/** Grid cells across a piece: a body's and a smaller part's. */
const CELLS = { body: 5, part: 3 } as const;
/** Outline points kept as facet corners across a piece, so the facets reach its edge. */
const RIM_POINTS = { body: 14, part: 7 } as const;
/** How far a grid point strays from its cell's middle, as a share of the cell. */
const JITTER = 0.8;
/** How far a facet tips, at most, as a slope either way. */
const TIP = 0.65;
/** How strongly the tip shows in the light. */
const CONTRAST = 1.6;
/** The direction the light comes from, in radians: up and to the left. */
const LIGHT = (-3 * Math.PI) / 4;

function extent(points: readonly Vec[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    size: Math.max(maxX - minX, maxY - minY),
  };
}

function signedArea(ring: readonly Vec[]): number {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area / 2;
}

function inside(ring: readonly Vec[], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

/** A seed from the outline's points, so the same outline crumples the same way. */
function seedOf(ring: readonly Vec[]): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < ring.length; i += 3) {
    h = Math.imul(h ^ Math.round(ring[i]![0] * 10), 0x01000193);
    h = Math.imul(h ^ Math.round(ring[i]![1] * 10), 0x01000193);
  }
  return h >>> 0;
}

/** Sutherland–Hodgman: the part of `subject` on the left of the directed line `a → b`. */
function clipHalf(subject: readonly Vec[], a: Vec, b: Vec): Vec[] {
  const side = (p: Vec): number => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const out: Vec[] = [];
  for (let i = 0; i < subject.length; i++) {
    const p = subject[i]!;
    const q = subject[(i + 1) % subject.length]!;
    const sp = side(p);
    const sq = side(q);
    if (sp >= 0) out.push(p);
    if (sp >= 0 !== sq >= 0) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

/** The outline clipped to a triangle, wound so its inside is on the left of every edge. */
function clipToTriangle(polygon: readonly Vec[], tri: readonly [Vec, Vec, Vec]): Vec[] {
  const [p, q, r] = signedArea(tri) >= 0 ? tri : ([tri[0], tri[2], tri[1]] as const);
  let out: Vec[] = [...polygon];
  for (const [a, b] of [
    [p, q],
    [q, r],
    [r, p],
  ] as const) {
    if (out.length < 3) return [];
    out = clipHalf(out, a, b);
  }
  return out.length >= 3 ? out : [];
}

/** Bowyer–Watson over a few dozen points: the triangles, as index triples into `points`. */
function triangulate(points: readonly Vec[]): [number, number, number][] {
  const { cx, cy, size } = extent(points);
  const far = size * 20;
  const all: Vec[] = [...points, [cx - far, cy - far], [cx + far, cy - far], [cx, cy + far]];
  const n = points.length;
  let triangles: [number, number, number][] = [[n, n + 1, n + 2]];
  const circle = ([a, b, c]: [number, number, number]) => {
    const [ax, ay] = all[a]!;
    const [bx, by] = all[b]!;
    const [qx, qy] = all[c]!;
    const d = 2 * (ax * (by - qy) + bx * (qy - ay) + qx * (ay - by));
    const a2 = ax * ax + ay * ay;
    const b2 = bx * bx + by * by;
    const q2 = qx * qx + qy * qy;
    const ux = (a2 * (by - qy) + b2 * (qy - ay) + q2 * (ay - by)) / d;
    const uy = (a2 * (qx - bx) + b2 * (ax - qx) + q2 * (bx - ax)) / d;
    return { ux, uy, r2: (ax - ux) ** 2 + (ay - uy) ** 2 };
  };
  for (let i = 0; i < n; i++) {
    const [px, py] = all[i]!;
    const kept: [number, number, number][] = [];
    const edges = new Map<string, [number, number] | null>();
    for (const t of triangles) {
      const { ux, uy, r2 } = circle(t);
      if ((px - ux) ** 2 + (py - uy) ** 2 >= r2) {
        kept.push(t);
        continue;
      }
      for (const [u, v] of [
        [t[0], t[1]],
        [t[1], t[2]],
        [t[2], t[0]],
      ] as const) {
        const key = u < v ? `${u},${v}` : `${v},${u}`;
        edges.set(key, edges.has(key) ? null : [u, v]);
      }
    }
    triangles = kept;
    for (const edge of edges.values()) if (edge) triangles.push([edge[0], edge[1], i]);
  }
  return triangles.filter((t) => t.every((k) => k < n));
}

/** A piece crumpled and pressed flat: its outline and its facets. */
export function fold(ring: Ring): Fold {
  const polygon = ring.map(([x, y]) => [x, y] as Vec);
  const e = extent(polygon);
  const body = e.size > BODY_SIZE;
  const rand = mulberry32(seedOf(polygon));
  const step = e.size / (body ? CELLS.body : CELLS.part);
  const seeds: Vec[] = [];
  for (let y = e.minY + step / 2; y < e.maxY; y += step) {
    for (let x = e.minX + step / 2; x < e.maxX; x += step) {
      const p: Vec = [x + (rand() - 0.5) * step * JITTER, y + (rand() - 0.5) * step * JITTER];
      if (inside(polygon, p[0], p[1])) seeds.push(p);
    }
  }
  const every = Math.max(1, Math.round(polygon.length / (body ? RIM_POINTS.body : RIM_POINTS.part)));
  for (let i = 0; i < polygon.length; i += every) seeds.push(polygon[i]!);

  const facets: Facet[] = [];
  for (const [a, b, c] of triangulate(seeds)) {
    const tri: [Vec, Vec, Vec] = [seeds[a]!, seeds[b]!, seeds[c]!];
    const mx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
    const my = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
    if (!inside(polygon, mx, my)) continue;
    const facet = clipToTriangle(polygon, tri);
    if (facet.length < 3) continue;
    const nx = (rand() * 2 - 1) * TIP;
    const ny = (rand() * 2 - 1) * TIP;
    const facing = (nx * Math.cos(LIGHT) + ny * Math.sin(LIGHT)) / Math.hypot(nx, ny, 1);
    facets.push({ ring: facet, light: Math.max(-1, Math.min(1, facing * CONTRAST)) });
  }
  return { polygon, facets };
}
