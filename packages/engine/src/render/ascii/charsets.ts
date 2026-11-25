/**
 * The glyph sets the ascii style writes with.
 *
 * A character cell is 2 sub-cells wide and 4 tall, so a mask of which of its
 * sub-cells are covered fits in a byte: bit `row * 2 + col`, row 0 at the top.
 * A charset turns that byte into the one glyph that looks most like it.
 */
import type { AsciiCharset } from './options.js';

/** Which side of a hollow body's interior a wall cell faces. */
export type WallSide = 'left' | 'right' | 'top' | 'bottom';

export interface Charset {
  /** Glyph for a partial cell: `mask` has bit (row*2 + col) set for each covered sub-cell, row 0 at top. */
  edge(mask: number): string;
  /** Glyph for a fully covered body cell at lightness 0 (deep) .. 1 (lit). */
  fill(level: number, col: number, row: number): string;
  /** Glyph for a facial feature or mark cell (eyes, mouth, badge, other non-body paints). */
  mark(mask: number): string;
  /** Whether a partial cell is drawn as interior, as if it were full. Absent: only a full cell is. */
  solid?(mask: number): boolean;
  /** The outline cell of a hollow body, on the side that faces the empty space. */
  wall(side: WallSide): string;
  /** Glyphs the decode and glitch effects scramble through. Every one is a single UTF-16 unit. */
  noise: string;
}

const bit = (row: number, col: number): number => 1 << (row * 2 + col);

function popcount(mask: number): number {
  let n = 0;
  for (let m = mask & 255; m; m &= m - 1) n++;
  return n;
}

/** The glyph for each of the 256 masks, built once. */
const table = (glyph: (mask: number) => string): readonly string[] =>
  Array.from({ length: 256 }, (_, mask) => glyph(mask));

/** Masks of one half of the cell. */
const HALF: Record<WallSide, number> = {
  left: 0x55,
  right: 0xaa,
  top: 0x0f,
  bottom: 0xf0,
};

/** A step down a ramp of glyphs that runs from lit to deep. */
const ramp = (glyphs: string, level: number): string =>
  glyphs[Math.round((1 - Math.min(1, Math.max(0, level))) * (glyphs.length - 1))]!;

/** No glyph an edge, a feature or an effect is written with, so the body never reads as a stroke. */
const ASCII_RAMP = ';=+xX#%@';

/** Coverage and where the ink sits, from -1 to 1 across the cell with +x right and +y down. */
function inkOf(mask: number): { f: number; cx: number; cy: number } {
  let x = 0;
  let y = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      if (!(mask & bit(row, col))) continue;
      x += col - 0.5;
      y += (row - 1.5) / 2;
    }
  }
  const n = popcount(mask);
  return { f: n / 8, cx: x / n, cy: y / n };
}

/** Whether ink with this centre meets the empty part of its cell along a level line, or an upright one. */
const isLevel = (cx: number, cy: number): boolean => Math.abs(cy) >= 1.5 * Math.abs(cx);
const isUpright = (cx: number, cy: number): boolean => Math.abs(cx) >= 1.5 * Math.abs(cy);

/**
 * A boundary drawn the way it would be by hand: `_` and `-` and `'` for a
 * level edge by how high in the cell it sits, `(` `)` `|` for an upright one,
 * `/` and `\` for a slanted one.
 */
function asciiEdge(mask: number): string {
  if (mask === 0) return ' ';
  if (mask === 255) return ramp(ASCII_RAMP, 0.5);
  const { f, cx, cy } = inkOf(mask);
  const bottom = cy > 0;
  if (isLevel(cx, cy)) {
    if (f <= 0.25 && bottom) return '_';
    if (f <= 0.625 || bottom) return '-';
    return '_';
  }
  if (isUpright(cx, cy)) {
    if (f >= 0.75) return '|';
    return cx > 0 ? '(' : ')';
  }
  if (f <= 0.25) return bottom ? '.' : "'";
  const right = cx > 0;
  return bottom === right ? '/' : '\\';
}

/**
 * A cell the body all but fills, missing only a sliver along its top, its
 * bottom or a corner: drawn as interior, or a level edge would show as a
 * second, broken outline just inside the first.
 */
function asciiSolid(mask: number): boolean {
  if (popcount(mask) < 6) return false;
  const { cx, cy } = inkOf(mask);
  return !isUpright(cx, cy);
}

/**
 * A feature, drawn as the stroke it is where it is thin: `-` and `_` for a
 * level line (a closed eye, a flat mouth), `|` for an upright one, `/` and `\`
 * for a slanted one (the sides of a smiling eye), and otherwise `O`, `o`, `.`
 * by how much of the cell it covers.
 */
function asciiMark(mask: number): string {
  const n = popcount(mask);
  let rows = 0;
  let sumCol = 0;
  let sumRow = 0;
  for (let row = 0; row < 4; row++) {
    const pair = (mask >> (row * 2)) & 3;
    if (pair) rows++;
    sumCol += pair & 2 ? 1 : 0;
    sumRow += row * popcount(pair);
  }
  const meanCol = sumCol / n;
  const meanRow = sumRow / n;
  let lean = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      if (mask & bit(row, col)) lean += (col - meanCol) * (row - meanRow);
    }
  }
  if (rows === 1 && n === 2) return meanRow >= 2.5 ? '_' : '-';
  if (n <= 4 && rows >= 2) {
    if (meanCol === 0 || meanCol === 1) return '|';
    if (Math.abs(lean) >= 0.5) return lean > 0 ? '\\' : '/';
  }
  if (n >= 4) return 'O';
  if (n <= 2) return meanRow >= 1.5 ? '.' : "'";
  return 'o';
}

const ASCII_EDGE = table(asciiEdge);
const ASCII_MARK = table(asciiMark);
const ASCII_SOLID = Array.from({ length: 256 }, (_, mask) => asciiSolid(mask));

const ASCII: Charset = {
  edge: (mask) => ASCII_EDGE[mask & 255]!,
  fill: (level) => ramp(ASCII_RAMP, level),
  mark: (mask) => ASCII_MARK[mask & 255]!,
  solid: (mask) => ASCII_SOLID[mask & 255]!,
  wall: (side) => (side === 'left' || side === 'right' ? '|' : '-'),
  noise: '!#$%&*+=?@<>/\\',
};

/** Quadrant blocks by which quadrants are lit: top-left 1, top-right 2, bottom-left 4, bottom-right 8. */
const QUADRANTS = ' ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█';

/** A quadrant is lit when either of its two sub-cells is covered. */
function quadrants(mask: number): string {
  const lit = (a: number, b: number): number => (mask & (a | b) ? 1 : 0);
  const index =
    lit(bit(0, 0), bit(1, 0)) |
    (lit(bit(0, 1), bit(1, 1)) << 1) |
    (lit(bit(2, 0), bit(3, 0)) << 2) |
    (lit(bit(2, 1), bit(3, 1)) << 3);
  return QUADRANTS[index]!;
}

const BLOCK_EDGE = table(quadrants);

const BLOCK: Charset = {
  edge: (mask) => BLOCK_EDGE[mask & 255]!,
  fill: (level) => ramp('░▒▓█', level),
  mark: (mask) => BLOCK_EDGE[mask & 255]!,
  wall: (side) => BLOCK_EDGE[HALF[side]]!,
  noise: '░▒▓▚▞▖▗▘▝',
};

/** The braille dot for each sub-cell, by `row * 2 + col`. */
const DOTS = [0x01, 0x08, 0x02, 0x10, 0x04, 0x20, 0x40, 0x80] as const;

function brailleGlyph(mask: number): string {
  let dots = 0;
  for (let i = 0; i < 8; i++) if (mask & (1 << i)) dots |= DOTS[i]!;
  return String.fromCharCode(0x2800 + dots);
}

const BRAILLE_EDGE = table(brailleGlyph);

/**
 * The order dots come on in as a cell gets darker, by `row * 2 + col`. Each
 * step lands far from the last, so a half-lit cell is a checker and not a band.
 */
const DITHER = [0, 4, 6, 2, 1, 5, 7, 3] as const;

/** Dots lit at `level`: one at the lightest, all eight at the deepest. */
function brailleFill(level: number, col: number, row: number): string {
  const lit = 1 + Math.round((1 - Math.min(1, Math.max(0, level))) * 7);
  // Neighbouring cells start their order half a turn apart, so two lit cells never share a pattern.
  const shift = (col + row) & 1 ? 4 : 0;
  let mask = 0;
  for (let i = 0; i < 8; i++) if ((DITHER[i]! + shift) % 8 < lit) mask |= 1 << i;
  return BRAILLE_EDGE[mask]!;
}

const BRAILLE: Charset = {
  edge: (mask) => BRAILLE_EDGE[mask & 255]!,
  fill: brailleFill,
  mark: (mask) => BRAILLE_EDGE[mask & 255]!,
  wall: (side) => BRAILLE_EDGE[HALF[side]]!,
  noise: '⠿⡇⢸⣤⠛⣶⡿⢿⠶⣛',
};

/** Every charset, by the id the `charset` parameter takes. */
export const CHARSETS: Record<AsciiCharset, Charset> = {
  ascii: ASCII,
  block: BLOCK,
  braille: BRAILLE,
};
