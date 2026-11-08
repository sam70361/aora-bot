/**
 * Drawn faces as cells.
 *
 * Each layer is measured by coverage, like a cute eye, and lit or left out
 * whole: a cell holds one paint, so a layer that is mostly faded is not
 * drawn and one that is mostly there is drawn solid. The two eyes are
 * rasterised from their own outlines but through one shared, mirrored
 * projection at anchors snapped symmetric about the face's axis — so a
 * symmetric expression comes out symmetric to the cell, while a wink, a
 * glance or a one-sided tear keep the difference they mean.
 */
import type { DrawnFaceGeometry, DrawnShape, FaceLayer } from '../../face/drawn/index.js';
import type { Point } from '../../core/types.js';
import { glyph } from './face.js';
import { apply, compose, type Affine } from './grid.js';
import { addCoverage } from './raster.js';

/** Samples per cell along y when measuring a layer's coverage. */
const SUBSAMPLES = 6;
/**
 * A detail layer only lights cells it covers at least this much; it is never
 * rounded up to a cell of its own, so a glint smaller than a cell leaves the
 * pupil whole rather than punching a hole in it.
 */
const DETAIL = 0.75;
/** A layer, or a whole design, at least this opaque is drawn; anything fainter is not. */
export const PIXEL_SHOWN = 0.5;

/** Round to the nearest half cell. */
const half = (v: number): number => Math.round(v * 2) / 2;

/** A layer's paint id, or `null` to leave it out. */
export type LayerPaint = (layer: FaceLayer) => number | null;

interface Placed {
  /** Linear part, buffer units per shape unit. */
  linear: [number, number, number, number];
  /** Where the shape's pivot lands in the buffer. */
  anchor: [number, number];
  pivot: Point;
}

function placedOf(shape: Pick<DrawnShape, 'transform'>, bodyM: Affine): Placed {
  const t = shape.transform;
  const [a, b, c, d] = t.matrix;
  const m = compose(bodyM, [a, b, c, d, 0, 0]);
  const at = new Float64Array(2);
  apply(bodyM, t.x, t.y, at, 0);
  return { linear: [m[0], m[1], m[2], m[3]], anchor: [at[0]!, at[1]!], pivot: [t.pivotX, t.pivotY] };
}

/** The mirror image of a linear map across the vertical axis: S A S with S = diag(-1, 1). */
const mirrored = ([a, b, c, d]: Placed['linear']): Placed['linear'] => [a, -b, -c, d];

const average = (p: Placed['linear'], q: Placed['linear']): Placed['linear'] => [
  (p[0] + q[0]) / 2,
  (p[1] + q[1]) / 2,
  (p[2] + q[2]) / 2,
  (p[3] + q[3]) / 2,
];

/** Coverage maps for one grid size, reused from call to call. */
let scratch = { size: 0, cover: new Float32Array(0), holes: new Float32Array(0) };

function maps(size: number): typeof scratch {
  if (scratch.size !== size) {
    scratch = { size, cover: new Float32Array(size * size), holes: new Float32Array(size * size) };
  }
  return scratch;
}

/** Rasterise one layer through `linear` about `pivot`, landing at `anchor`. */
function drawLayer(
  layer: FaceLayer,
  linear: Placed['linear'],
  pivot: Point,
  anchor: Point,
  size: number,
  put: (col: number, row: number, id: number) => void,
  paint: LayerPaint,
): void {
  if (layer.opacity < PIXEL_SHOWN) return;
  const id = paint(layer);
  if (id === null) return;
  const { cover, holes } = maps(size);
  cover.fill(0);
  if (layer.holes) holes.fill(0);
  const [a, b, c, d] = linear;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  layer.rings.forEach((ring, i) => {
    const xy = new Float64Array(ring.length * 2);
    ring.forEach(([px, py], k) => {
      const dx = px - pivot[0];
      const dy = py - pivot[1];
      const x = anchor[0] + a * dx + c * dy;
      const y = anchor[1] + b * dx + d * dy;
      xy[k * 2] = x;
      xy[k * 2 + 1] = y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    });
    addCoverage(xy, ring.length, size, layer.holes && i > 0 ? holes : cover, SUBSAMPLES);
  });
  if (layer.holes) for (let i = 0; i < cover.length; i++) cover[i] = Math.max(0, cover[i]! - holes[i]!);
  if (layer.detail) {
    for (let i = 0; i < cover.length; i++) if (cover[i]! >= DETAIL) put(i % size, Math.floor(i / size), id);
    return;
  }
  let best = 0;
  for (let i = 0; i < cover.length; i++) best = Math.max(best, cover[i]!);
  const cells =
    best > 0 && best < THIN
      ? thinCells(cover, size)
      : glyph(cover, size, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0 >= y1 - y0);
  for (const [col, row] of cells) put(col, row, id);
}

/** A layer none of whose cells is more than this covered is thinner than a cell, and drawn as a line. */
const THIN = 0.55;

/**
 * The cells of a stroke thinner than a cell: in every column, and again in
 * every row, each separate run of coverage lights the one cell where its
 * weight sits. Taking runs rather than whole columns keeps the two sides of
 * a ring (a rim, a frame) as two lines instead of averaging them into one
 * through the middle, and taking both directions closes the ring at its top
 * and bottom as well as at its sides.
 */
function thinCells(cover: Float32Array, size: number): [number, number][] {
  const lit = new Set<number>();
  const scan = (byColumn: boolean): void => {
    const runs: { sum: number; weight: number; line: number }[] = [];
    for (let line = 0; line < size; line++) {
      let sum = 0;
      let weight = 0;
      for (let k = 0; k <= size; k++) {
        const v = k < size ? cover[byColumn ? k * size + line : line * size + k]! : 0;
        if (v > 0.02) {
          sum += v;
          weight += (k + 0.5) * v;
        } else if (sum > 0) {
          runs.push({ sum, weight, line });
          sum = 0;
          weight = 0;
        }
      }
    }
    const heaviest = Math.max(0, ...runs.map((r) => r.sum));
    for (const run of runs) {
      if (run.sum < Math.max(0.1, heaviest * 0.35)) continue;
      const at = Math.min(size - 1, Math.floor(run.weight / run.sum));
      lit.add(byColumn ? at * size + run.line : run.line * size + at);
    }
  };
  scan(true);
  scan(false);
  return [...lit].map((i) => [i % size, Math.floor(i / size)]);
}

/**
 * Rasterise the design that holds most of the face: its plate, then both
 * eyes. Returns that design and the face's axis in buffer columns (`null`
 * with one eye turned away), for the mouth to centre on; `null` when no
 * design holds most of the face.
 */
export function rasteriseDrawn(
  drawn: readonly DrawnFaceGeometry[],
  bodyM: Affine,
  size: number,
  put: (col: number, row: number, id: number) => void,
  paint: LayerPaint,
): { axis: number | null; design: DrawnFaceGeometry } | null {
  const design = drawn.reduce<DrawnFaceGeometry | null>(
    (best, d) => (!best || d.opacity > best.opacity ? d : best),
    null,
  );
  if (!design || design.opacity < PIXEL_SHOWN) return null;
  const { left, right, plate } = design;

  let axis: number | null = null;
  if (left.visible && right.visible) {
    const l = placedOf(left, bodyM);
    const r = placedOf(right, bodyM);
    const linear = average(l.linear, mirrored(r.linear));
    const dr = Math.round(r.anchor[1] - l.anchor[1]);
    axis = half((l.anchor[0] + r.anchor[0]) / 2);
    const reach = half((r.anchor[0] - l.anchor[0]) / 2);
    const row = half((l.anchor[1] + r.anchor[1] - dr) / 2);
    if (plate?.visible) {
      const p = placedOf(plate, bodyM);
      const symmetric = average(p.linear, mirrored(p.linear));
      for (const layer of plate.layers)
        drawLayer(layer, symmetric, p.pivot, [axis, row + dr / 2], size, put, paint);
    }
    for (const layer of left.layers) drawLayer(layer, linear, l.pivot, [axis - reach, row], size, put, paint);
    for (const layer of right.layers) {
      drawLayer(layer, mirrored(linear), r.pivot, [axis + reach, row + dr], size, put, paint);
    }
  } else {
    for (const shape of [left, right]) {
      if (!shape.visible) continue;
      const p = placedOf(shape, bodyM);
      const anchor: Point = [half(p.anchor[0]), half(p.anchor[1])];
      for (const layer of shape.layers) drawLayer(layer, p.linear, p.pivot, anchor, size, put, paint);
    }
  }
  return { axis, design };
}

/**
 * Rasterise what a design puts in its mouth, through the mouth's own
 * projection and moved by the same `(dx, dy)` the mouth glyph was.
 */
export function rasteriseInMouth(
  design: DrawnFaceGeometry,
  mouth: Pick<DrawnShape, 'transform' | 'visible'>,
  bodyM: Affine,
  shift: Point,
  size: number,
  put: (col: number, row: number, id: number) => void,
  paint: LayerPaint,
): void {
  if (!design.inMouth || !mouth.visible) return;
  const p = placedOf(mouth, bodyM);
  const anchor: Point = [p.anchor[0] + shift[0], p.anchor[1] + shift[1]];
  for (const layer of design.inMouth) drawLayer(layer, p.linear, p.pivot, anchor, size, put, paint);
}
