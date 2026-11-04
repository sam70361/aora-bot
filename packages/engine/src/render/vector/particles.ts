import { ribbonColor, ribbonRuns, type TrailPoint } from '../../particles.js';
import type { ParticleFrame, TrailFrame } from '../../sim/snapshot.js';
import { node, r2, type SceneNode } from '../scene.js';

/** A four-pointed star of radius 1, scaled into place by its transform. */
const STAR = 'M0-1C.16-.16.16-.16 1 0C.16.16.16.16 0 1C-.16.16-.16.16-1 0C-.16-.16-.16-.16 0-1Z';

/** Confetti: dots round, strips longer than they are tall, stars as gold sparkles. */
export function paperNodes(paper: readonly ParticleFrame[]): SceneNode[] {
  return paper.map((p) => {
    const deg = r2((p.rotation * 180) / Math.PI);
    if (p.kind === 'star') {
      return node('path', {
        d: STAR,
        fill: p.color,
        opacity: r2(p.opacity),
        transform: `translate(${r2(p.x)} ${r2(p.y)}) rotate(${deg}) scale(${r2(p.size / 2)})`,
      });
    }
    const w = p.kind === 'strip' ? p.size * 1.9 : p.size;
    return node('rect', {
      x: r2(p.x - w / 2),
      y: r2(p.y - p.size / 2),
      width: r2(w),
      height: r2(p.size),
      rx: r2(p.kind === 'dot' ? p.size / 2 : p.size * 0.24),
      fill: p.color,
      opacity: r2(p.opacity),
      transform: `rotate(${deg} ${r2(p.x)} ${r2(p.y)})`,
    });
  });
}

/**
 * One side of a ribbon as a filled outline: as wide as `size` at the head,
 * half that at the tail, round at both ends.
 */
function ribbonPath(points: readonly TrailPoint[], size: number, side: 'back' | 'front'): string {
  const n = points.length;
  const nx: number[] = [];
  const ny: number[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[Math.max(i - 1, 0)]!;
    const p1 = points[Math.min(i + 1, n - 1)]!;
    const len = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    const half = (size * (0.5 + (i / (n - 1)) * 0.5)) / 2;
    nx.push((-(p1.y - p0.y) / len) * half);
    ny.push(((p1.x - p0.x) / len) * half);
  }
  const cap = (i: number): string => {
    const r = r2(Math.max(Math.hypot(nx[i]!, ny[i]!), 0.2));
    return `A${r} ${r} 0 0 0 `;
  };
  let d = '';
  for (const [a, b] of ribbonRuns(points, side)) {
    for (let i = a; i <= b; i++)
      d += `${i === a ? 'M' : 'L'}${r2(points[i]!.x + nx[i]!)} ${r2(points[i]!.y + ny[i]!)}`;
    d += b === n - 1 ? cap(b) : 'L';
    for (let i = b; i >= a; i--)
      d += `${i === b ? '' : 'L'}${r2(points[i]!.x - nx[i]!)} ${r2(points[i]!.y - ny[i]!)}`;
    if (a === 0) d += `${cap(0)}${r2(points[0]!.x + nx[0]!)} ${r2(points[0]!.y + ny[0]!)}`;
    d += 'Z';
  }
  return d;
}

/**
 * One path per ribbon, for its stretches behind the body or in front of it.
 * A ribbon with nothing on this side keeps its node, hidden, so the two groups
 * stay index-aligned.
 */
export function trailNodes(
  trails: readonly TrailFrame[],
  side: 'back' | 'front',
  sizeScale = 1,
): SceneNode[] {
  return trails.map((trail) => {
    const d = ribbonPath(trail.points, trail.size * sizeScale, side);
    if (!d) return node('path', { d: '', opacity: 0 });
    return node('path', { d, fill: ribbonColor(trail.hue), opacity: r2(trail.opacity) });
  });
}
