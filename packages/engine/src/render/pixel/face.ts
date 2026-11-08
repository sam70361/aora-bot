/**
 * Eyes and features as cells.
 *
 * An eye is a few cells across, so rasterising it the way a body is
 * rasterised — one sample per cell — would give a different blob on every
 * frame. Instead the outline is measured by how much of each cell it covers,
 * the two eyes are measured together around a shared axis, and one glyph is
 * built from both and stamped mirrored. That is what makes them symmetric
 * whatever the head is doing, and it is why gaze moves them a whole cell at a
 * time instead of shimmering.
 */
import { addCoverage, strokePolyline, type Put } from './raster.js';

export interface Poly {
  xy: Float64Array;
  n: number;
  /** More outlines that make up the same glyph: an x's other bar, a brow, a star. */
  extras?: Poly[];
}

interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Bounding box of a glyph's outlines, extras included. */
function boxOf(p: Poly): Box {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const ring of [p, ...(p.extras ?? [])]) {
    for (let i = 0; i < ring.n; i++) {
      const x = ring.xy[i * 2]!;
      const y = ring.xy[i * 2 + 1]!;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { x0, x1, y0, y1 };
}

/** Add every outline of a glyph into a coverage map. */
function addGlyphCoverage(p: Poly, size: number, out: Float32Array): void {
  for (const ring of [p, ...(p.extras ?? [])]) addCoverage(ring.xy, ring.n, size, out, SUBSAMPLES);
}

/** Round to the nearest half cell: a glyph centred there is symmetric about its own centre. */
const half = (v: number): number => Math.round(v * 2) / 2;

function shifted(p: Poly, dx: number, dy: number): Poly {
  const xy = new Float64Array(p.n * 2);
  for (let i = 0; i < p.n; i++) {
    xy[i * 2] = p.xy[i * 2]! + dx;
    xy[i * 2 + 1] = p.xy[i * 2 + 1]! + dy;
  }
  return { xy, n: p.n, ...(p.extras ? { extras: p.extras.map((e) => shifted(e, dx, dy)) } : null) };
}

/** Coverage maps for one grid size, reused from call to call. */
let maps = { size: 0, left: new Float32Array(0), right: new Float32Array(0), glyph: new Float32Array(0) };

function coverageMaps(size: number): typeof maps {
  if (maps.size !== size) {
    const n = size * size;
    maps = { size, left: new Float32Array(n), right: new Float32Array(n), glyph: new Float32Array(n) };
  } else {
    maps.left.fill(0);
    maps.right.fill(0);
    maps.glyph.fill(0);
  }
  return maps;
}

/** Samples per cell along y when measuring coverage. */
const SUBSAMPLES = 6;

/**
 * An eye none of whose cells is more than this covered is a stroke thinner
 * than a cell: it has to be drawn as a line, not thresholded into nothing.
 */
const THIN = 0.55;

export interface EyeOptions {
  size: number;
  put: Put;
}

/**
 * Rasterise the eyes. With both visible: one glyph, mirrored about the face
 * axis, which is returned so the nose and mouth can join it. With one visible
 * (the head has turned far enough to hide the other): its own glyph, alone.
 */
export function rasteriseEyes(
  left: Poly | null,
  right: Poly | null,
  { size, put }: EyeOptions,
): number | null {
  const m = coverageMaps(size);

  if (left && right) {
    const bl = boxOf(left);
    const br = boxOf(right);
    const cxl = (bl.x0 + bl.x1) / 2;
    const cyl = (bl.y0 + bl.y1) / 2;
    const cxr = (br.x0 + br.x1) / 2;
    const cyr = (br.y0 + br.y1) / 2;

    // A head rolled far enough puts the eyes on different rows; a small
    // difference is noise and both take the same row.
    const dr = Math.round(cyr - cyl);
    const axis = half((cxl + cxr) / 2);
    const reach = half((cxr - cxl) / 2);
    const row = half((cyl + (cyr - dr)) / 2);
    const anchorL = axis - reach;
    const anchorR = axis + reach;

    const pl = shifted(left, anchorL - cxl, row - cyl);
    const pr = shifted(right, anchorR - cxr, row + dr - cyr);
    addGlyphCoverage(pl, size, m.left);
    addGlyphCoverage(pr, size, m.right);

    // The glyph is the left eye averaged with the mirrored right eye.
    const mirror = Math.round(axis * 2);
    for (let r = 0; r < size; r++) {
      const rr = r + dr;
      for (let c = 0; c < size; c++) {
        const mc = mirror - c - 1;
        const other = rr >= 0 && rr < size && mc >= 0 && mc < size ? m.right[rr * size + mc]! : 0;
        m.glyph[r * size + c] = (m.left[r * size + c]! + other) / 2;
      }
    }

    const cells = glyph(m.glyph, size, anchorL, row, bl.x1 - bl.x0 >= bl.y1 - bl.y0);
    // Two eyes that touch read as one bar. Trim the inner edge until a cell is left between them.
    let inner = Math.max(...cells.map(([c]) => c));
    while (mirror - 2 * inner - 2 < 1 && cells.some(([c]) => c < inner)) {
      for (let i = cells.length - 1; i >= 0; i--) if (cells[i]![0] === inner) cells.splice(i, 1);
      inner = Math.max(...cells.map(([c]) => c));
    }
    for (const [c, r] of cells) {
      put(c, r);
      put(mirror - c - 1, r + dr);
    }
    return axis;
  }

  const only = left ?? right;
  if (!only) return null;
  const b = boxOf(only);
  const ax = half((b.x0 + b.x1) / 2);
  const ay = half((b.y0 + b.y1) / 2);
  const p = shifted(only, ax - (b.x0 + b.x1) / 2, ay - (b.y0 + b.y1) / 2);
  addGlyphCoverage(p, size, m.glyph);
  for (const [c, r] of glyph(m.glyph, size, ax, ay, b.x1 - b.x0 >= b.y1 - b.y0)) put(c, r);
  return null;
}

/**
 * One filled outline as a glyph of its own: a cute mouth or a cheek. Like an
 * eye it is measured by coverage, so a stroke thinner than a cell stays a
 * connected line, and it is centred on the face axis when it is near it.
 */
export function rasteriseGlyph(poly: Poly, axis: number | null, { size, put }: EyeOptions): void {
  const m = coverageMaps(size);
  const b = boxOf(poly);
  const [dx, dy] = glyphShift(poly, axis);
  const ax = (b.x0 + b.x1) / 2 + dx;
  const ay = (b.y0 + b.y1) / 2 + dy;
  addGlyphCoverage(shifted(poly, dx, dy), size, m.glyph);
  for (const [c, r] of glyph(m.glyph, size, ax, ay, b.x1 - b.x0 >= b.y1 - b.y0)) put(c, r);
}

/**
 * How far `rasteriseGlyph` moves an outline: onto the face axis when it is
 * near it, else to the nearest half cell, so whatever rides with it (a
 * tongue in a mouth) can move the same way.
 */
export function glyphShift(poly: Poly, axis: number | null): [number, number] {
  const b = boxOf(poly);
  const middle = (b.x0 + b.x1) / 2;
  const ax = axis !== null && Math.abs(middle - axis) < 1.5 ? axis : half(middle);
  const cy = (b.y0 + b.y1) / 2;
  return [ax - middle, half(cy) - cy];
}

/**
 * Lit cells of one coverage map, with the guarantees that make a small eye
 * readable: a visible eye is never empty, and a stroke thinner than a cell
 * is still a connected line one cell thick.
 */
export function glyph(
  cover: Float32Array,
  size: number,
  anchorX: number,
  anchorY: number,
  wide: boolean,
): [number, number][] {
  const cells: [number, number][] = [];
  let best = 0;
  for (let i = 0; i < cover.length; i++) if (cover[i]! > best) best = cover[i]!;
  if (best <= 0) {
    // So thin that no cell saw any of it. One cell, where the eye is.
    return [[Math.floor(anchorX), Math.floor(anchorY)]];
  }

  if (best < THIN) {
    // Every column (row, for an upright stroke) takes one cell, where the
    // stroke's weight in that column sits. Thresholding would split a line
    // that straddles two rows into two halves and drop both.
    const sums = new Float32Array(size);
    for (let a = 0; a < size; a++) {
      for (let b = 0; b < size; b++) sums[a]! += cover[wide ? b * size + a : a * size + b]!;
    }
    const heaviest = Math.max(...sums);
    for (let a = 0; a < size; a++) {
      if (sums[a]! < Math.max(0.1, heaviest * 0.35)) continue;
      let weight = 0;
      for (let b = 0; b < size; b++) weight += (b + 0.5) * cover[wide ? b * size + a : a * size + b]!;
      const at = Math.min(size - 1, Math.floor(weight / sums[a]!));
      cells.push(wide ? [a, at] : [at, a]);
    }
    if (cells.length > 0) return cells;
  }

  const threshold = Math.min(0.45, Math.max(0.18, best * 0.5));
  for (let i = 0; i < cover.length; i++) {
    if (cover[i]! >= threshold) cells.push([i % size, Math.floor(i / size)]);
  }
  if (cells.length === 0) {
    let at = 0;
    for (let i = 1; i < cover.length; i++) if (cover[i]! > cover[at]!) at = i;
    cells.push([at % size, Math.floor(at / size)]);
  }
  return cells;
}

/**
 * Stroke a nose or mouth. Near the face axis it is centred on it; elsewhere
 * its centre goes to the nearest half cell. Either way a feature that is
 * symmetric about itself is symmetric in cells.
 */
export function rasteriseStroke(
  poly: Poly,
  closed: boolean,
  radius: number,
  axis: number | null,
  put: Put,
): void {
  const b = boxOf(poly);
  const middle = (b.x0 + b.x1) / 2;
  const target = axis !== null && Math.abs(middle - axis) < 1.5 ? axis : half(middle);
  const p = shifted(poly, target - middle, 0);
  strokePolyline(p.xy, p.n, closed, radius, put);
}
