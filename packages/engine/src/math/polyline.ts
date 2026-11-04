import type { Point } from '../core/types.js';
import { PathBuilder } from './path-builder.js';
import { roundTo } from './round.js';

/**
 * Straight-segment SVG path through a list of points.
 *
 * Open polylines need two points to say anything and closed ones three, which
 * is why a degenerate input gives an empty string rather than a stray `M`.
 * Coordinates are kept to two decimals, matching the attribute precision of
 * the renderers that consume it.
 */
export function polylinePath(points: readonly Point[], closed = true): string {
  if (points.length < (closed ? 3 : 2)) return '';
  const r = (n: number) => roundTo(n, 2);
  let d = `M${r(points[0]![0])} ${r(points[0]![1])}`;
  for (let i = 1; i < points.length; i++) d += `L${r(points[i]![0])} ${r(points[i]![1])}`;
  return closed ? `${d}Z` : d;
}

/**
 * Several open polylines as one path, each its own subpath.
 *
 * Written through `PathBuilder`, so it carries that writer's three-decimal
 * precision rather than the two of `polylinePath`.
 */
export function polylinesPath(lines: readonly (readonly Point[])[]): string {
  const path = new PathBuilder();
  for (const line of lines) {
    line.forEach(([x, y], i) => (i === 0 ? path.moveTo(x, y) : path.lineTo(x, y)));
  }
  return path.toString();
}
