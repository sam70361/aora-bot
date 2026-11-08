import { clamp } from '../math/easing.js';
import type { ShapeDef } from '../core/types.js';

/**
 * The room a face on midline `x` has at height `y`: the stretch of the
 * body's outline there that `x` is on, not the body's whole width, which
 * across a candy's wrappers or a crab's claws has gaps a cheek must not sit
 * over. Where `x` falls in a gap (the eye of a cane's crook) the face bridges
 * it, from the stretch on its left to the one on its right.
 */
export function stretchAt(shape: ShapeDef, y: number, x: number): readonly [number, number] {
  const at = clamp(y, shape.top + 1, shape.bottom - 1);
  const crossings: number[] = [];
  const { outline } = shape;
  for (let i = 0; i < outline.length; i++) {
    const [x0, y0] = outline[i]!;
    const [x1, y1] = outline[(i + 1) % outline.length]!;
    if (y0 <= at !== y1 <= at) crossings.push(x0 + ((x1 - x0) * (at - y0)) / (y1 - y0));
  }
  if (crossings.length < 2) return shape.spanAt(at);
  crossings.sort((p, q) => p - q);
  let lo: number | undefined;
  let hi: number | undefined;
  for (let i = 0; i + 1 < crossings.length; i += 2) {
    const start = crossings[i]!;
    const end = crossings[i + 1]!;
    if (start <= x && x <= end) return [start, end];
    if (end < x) lo = start;
    else if (hi === undefined) hi = end;
  }
  return [lo ?? crossings[0]!, hi ?? crossings[crossings.length - 1]!];
}
