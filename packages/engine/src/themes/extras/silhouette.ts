/**
 * How far a point is from a figure drawn as several rings (a body and its
 * parts): positive outside every ring, negative inside one. What the effect
 * anchor and the mood decorations read to keep clear of a figure's props.
 */
import type { Point, Ring } from '../../core/types.js';

function inside(ring: readonly Point[], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

/** A figure's rings with their boxes, so a far point skips a ring's edges. */
export interface Silhouette {
  rings: readonly Ring[];
  boxes: readonly (readonly [number, number, number, number])[];
}

export function silhouetteOf(rings: readonly Ring[]): Silhouette {
  return {
    rings,
    boxes: rings.map((ring) => {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const [x, y] of ring) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      return [x0, y0, x1, y1] as const;
    }),
  };
}

/**
 * Signed distance from (x, y) to the figure: the distance to the nearest edge
 * of any ring, negative when the point lies inside one. Exact up to `reach`;
 * beyond it, `reach`.
 */
export function clearance(figure: Silhouette, x: number, y: number, reach = 64): number {
  let best = reach * reach;
  let within = false;
  for (let r = 0; r < figure.rings.length; r++) {
    const [x0, y0, x1, y1] = figure.boxes[r]!;
    const ring = figure.rings[r]!;
    const inBox = x >= x0 && x <= x1 && y >= y0 && y <= y1;
    if (inBox && !within && inside(ring, x, y)) within = true;
    const dx = x < x0 ? x0 - x : x > x1 ? x - x1 : 0;
    const dy = y < y0 ? y0 - y : y > y1 ? y - y1 : 0;
    if (dx * dx + dy * dy >= best) continue;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]!;
      const b = ring[(i + 1) % ring.length]!;
      const ex = b[0] - a[0];
      const ey = b[1] - a[1];
      const len2 = ex * ex + ey * ey;
      let t = len2 > 0 ? ((x - a[0]) * ex + (y - a[1]) * ey) / len2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = x - a[0] - ex * t;
      const py = y - a[1] - ey * t;
      const d2 = px * px + py * py;
      if (d2 < best) best = d2;
    }
  }
  const d = Math.sqrt(best);
  return within ? -d : d;
}
