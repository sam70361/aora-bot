/**
 * The pixel grid and the transforms that feed it.
 *
 * The grid is a fixed lattice over shape space, `n` cells across the 229-unit
 * square the shapes are built in. It is anchored at the centre of shape space
 * rather than its corner: a symmetric body then rasterises to a symmetric set
 * of cells whatever `n` is, odd or even. Cells are addressed in "buffer
 * coordinates", where one unit is one cell and the lattice starts at 0 in the
 * first margin column.
 */
import { CENTER, SHAPE_SPACE, VIEWBOX_MARGIN } from '../../core/types.js';

export interface PixelGrid {
  /** Cells across shape space. */
  readonly n: number;
  /** One cell, in shape units. */
  readonly cell: number;
  /**
   * Whole cells that fit in the viewBox margin on each side. Bodies hop and
   * rings sit out there, so the buffer is larger than `n`.
   */
  readonly margin: number;
  /** Cells across the buffer: `n` plus a margin each side. */
  readonly size: number;
}

const cache = new Map<number, PixelGrid>();

export function pixelGrid(n: number): PixelGrid {
  let grid = cache.get(n);
  if (!grid) {
    const cell = SHAPE_SPACE / n;
    const margin = Math.floor(VIEWBOX_MARGIN / cell);
    grid = { n, cell, margin, size: n + margin * 2 };
    cache.set(n, grid);
  }
  return grid;
}

/** SVG-order affine: `x' = a·x + c·y + e`, `y' = b·x + d·y + f`. */
export type Affine = readonly [number, number, number, number, number, number];

/** `outer ∘ inner`: the result applies `inner` first. */
export function compose(outer: Affine, inner: Affine): Affine {
  const [a1, b1, c1, d1, e1, f1] = outer;
  const [a2, b2, c2, d2, e2, f2] = inner;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

export const translation = (x: number, y: number): Affine => [1, 0, 0, 1, x, y];

/** Scale about the centre of shape space. */
export function scaleAboutCentre(sx: number, sy: number): Affine {
  return [sx, 0, 0, sy, CENTER * (1 - sx), CENTER * (1 - sy)];
}

/** Rotate by `degrees` about the centre of shape space. */
export function rotateAboutCentre(degrees: number): Affine {
  const r = (degrees * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return [cos, sin, -sin, cos, CENTER - cos * CENTER + sin * CENTER, CENTER - sin * CENTER - cos * CENTER];
}

/** Shape space to buffer coordinates. */
export function toBuffer(grid: PixelGrid): Affine {
  const k = 1 / grid.cell;
  return [k, 0, 0, k, grid.margin, grid.margin];
}

/** Mean linear scale of a transform, for carrying a stroke width across it. */
export const meanScale = (m: Affine): number => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));

export function apply(m: Affine, x: number, y: number, out: Float64Array, at: number): void {
  out[at] = m[0] * x + m[2] * y + m[4];
  out[at + 1] = m[1] * x + m[3] * y + m[5];
}
