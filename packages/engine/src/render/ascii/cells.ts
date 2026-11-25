/**
 * The pixel rasteriser's paint ids, regrouped into character cells.
 *
 * The picture is rasterised on a sub-grid twice as wide as the character grid
 * (`cols * 2`), so one character cell holds 2 x 4 sub-cells, the 1:2 shape of a
 * monospace glyph. Each cell is then written with the one glyph, in the one
 * paint, that best stands for what is in it.
 */
import { clamp01 } from '../../math/easing.js';
import type { PixelGrid } from '../pixel/grid.js';
import type { PaintDef, PaintTable } from '../pixel/paints.js';
import { PIXEL_BLUSH } from '../pixel/rasterise.js';
import { CHARSETS, type WallSide } from './charsets.js';
import type { AsciiOptions } from './options.js';

/** What a character cell was made of: body fill, a body edge, a mark, or an effect stamped over the picture. */
export const CELL = { empty: 0, fill: 1, edge: 2, mark: 3, fx: 4 } as const;

export interface CharGrid {
  cols: number;
  rows: number;
  /** One glyph per cell, row by row; `''` is an empty cell. */
  glyph: string[];
  /** The paint id of each glyph; 0 where there is none. */
  paint: Uint16Array;
  /** A `CELL` value per cell. */
  kind: Uint8Array;
}

export function createCharGrid(cols: number, rows: number): CharGrid {
  const n = cols * rows;
  return {
    cols,
    rows,
    glyph: new Array<string>(n).fill(''),
    paint: new Uint16Array(n),
    kind: new Uint8Array(n),
  };
}

/** The character grid that covers a pixel grid: sub-cells past its edge count as empty. */
export function charGridFor(grid: PixelGrid): CharGrid {
  return createCharGrid(Math.ceil(grid.size / 2), Math.ceil(grid.size / 4));
}

export type CellRole = 'body' | 'mark';

/** How the paints of a picture split into a body and the marks on it. */
export interface CellRoles {
  of(def: PaintDef): CellRole;
  /** Marks on the body are cut out of it instead of drawn (the one-ink look). */
  cutout: boolean;
}

/**
 * The body is the ink, its hair and parts, and the cheeks, which are a flat
 * pink only because a cell holds one paint; anything else is a mark: the
 * features, a badge, a trail.
 */
export function paintRole(def: PaintDef): CellRole {
  const tint = def.tint;
  if (tint.kind === 'css') return tint.value === PIXEL_BLUSH ? 'body' : 'mark';
  return tint.kind === 'fx' ? 'mark' : 'body';
}

export const COLOUR_ROLES: CellRoles = { of: paintRole, cutout: false };
export const CUTOUT_ROLES: CellRoles = { of: paintRole, cutout: true };

/** Light falls from the upper left: how much lighter than the middle the corner it comes from is. */
const LIGHT_SPAN = 0.5;
/** Where a cell with no slope to the light sits on the scale from deep (0) to lit (1). */
const LIGHT_CORE = 0.58;
/**
 * How much deeper the ring of cells just inside the edge is, so a body reads
 * as a rounded volume: all of it on the side away from the light, and a part
 * of it on the side facing it, where the edge catches the light.
 */
const RIM_SHADE = 0.25;
const RIM_LIT_SHARE = 0.45;

const NEIGHBOURS_4: readonly (readonly [number, number, WallSide])[] = [
  [-1, 0, 'left'],
  [1, 0, 'right'],
  [0, -1, 'top'],
  [0, 1, 'bottom'],
];

/**
 * Whether a cell with marks in it sits inside the body: the body lies beyond
 * it on at least three of the four sides. A mark on the body's edge, like a
 * badge, or off it, like a trail, has the body on fewer.
 */
function enclosed(has: Uint8Array, cols: number, rows: number, col: number, row: number): boolean {
  let sides = 0;
  for (const [dx, dy] of NEIGHBOURS_4) {
    let c = col + dx;
    let r = row + dy;
    while (c >= 0 && r >= 0 && c < cols && r < rows) {
      if (has[r * cols + c]) {
        sides++;
        break;
      }
      c += dx;
      r += dy;
    }
  }
  return sides >= 3;
}

/**
 * Write every character cell from the sub-cells under it.
 *
 * A cell with a mark in it shows the mark that covers most of it. Otherwise
 * the body decides: a full cell is interior, drawn by `options.fill`, and a
 * partial one is an edge. Paints are those the rasteriser gave the sub-cells.
 */
export function buildCells(
  paint: Uint16Array,
  table: PaintTable,
  grid: PixelGrid,
  options: AsciiOptions,
  roles: CellRoles,
): CharGrid {
  const out = charGridFor(grid);
  const { cols, rows } = out;
  const n = cols * rows;
  const size = grid.size;
  const charset = CHARSETS[options.charset];

  const roleOf = new Uint8Array(table.defs.length + 1);
  const isBody = (id: number): boolean => {
    let role = roleOf[id]!;
    if (role === 0) roleOf[id] = role = roles.of(table.defs[id - 1]!) === 'body' ? 1 : 2;
    return role === 1;
  };

  const bodyMask = new Uint8Array(n);
  const bodyPaint = new Uint16Array(n);
  const markMask = new Uint8Array(n);
  const markPaint = new Uint16Array(n);
  const ids = new Int32Array(8);
  const counts = new Int32Array(8);
  const masks = new Int32Array(8);

  /** The id seen most often among the first `used` entries, first seen winning a tie. */
  const winner = (used: number): number => {
    let best = 0;
    for (let i = 1; i < used; i++) if (counts[i]! > counts[best]!) best = i;
    return best;
  };

  let minCol = cols;
  let maxCol = -1;
  let minRow = rows;
  let maxRow = -1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      for (let pass = 0; pass < 2; pass++) {
        const wantBody = pass === 0;
        let used = 0;
        let bits = 0;
        for (let r = 0; r < 4; r++) {
          const y = row * 4 + r;
          if (y >= size) break;
          for (let c = 0; c < 2; c++) {
            const x = col * 2 + c;
            if (x >= size) break;
            const id = paint[y * size + x]!;
            if (id === 0 || isBody(id) !== wantBody) continue;
            const bit = 1 << (r * 2 + c);
            bits |= bit;
            let at = 0;
            while (at < used && ids[at] !== id) at++;
            if (at === used) {
              ids[used] = id;
              counts[used] = 0;
              masks[used] = 0;
              used++;
            }
            counts[at]!++;
            masks[at]! |= bit;
          }
        }
        const i = row * cols + col;
        if (used === 0) continue;
        const best = winner(used);
        if (wantBody) {
          bodyMask[i] = bits;
          bodyPaint[i] = ids[best]!;
          if (col < minCol) minCol = col;
          if (col > maxCol) maxCol = col;
          if (row < minRow) minRow = row;
          if (row > maxRow) maxRow = row;
        } else {
          markMask[i] = masks[best]!;
          markPaint[i] = ids[best]!;
        }
      }
    }
  }

  // Marks need to know whether they are on the body; that needs every cell's body mask first.
  const inside = new Uint8Array(n);
  const hasBody = new Uint8Array(n);
  for (let i = 0; i < n; i++) hasBody[i] = bodyMask[i] ? 1 : 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      if (markPaint[i] && enclosed(hasBody, cols, rows, col, row)) inside[i] = 1;
    }
  }

  // A cell is full when the body fills it or when a mark on the body does.
  const full = new Uint8Array(n);
  for (let i = 0; i < n; i++) full[i] = markPaint[i] ? inside[i]! : bodyMask[i] === 255 ? 1 : 0;
  const isFull = (col: number, row: number): boolean =>
    col >= 0 && row >= 0 && col < cols && row < rows && full[row * cols + col] === 1;
  const isOutside = (col: number, row: number): boolean =>
    col < 0 ||
    row < 0 ||
    col >= cols ||
    row >= rows ||
    (!bodyMask[row * cols + col] && !markPaint[row * cols + col]);

  const centreX = (minCol + maxCol + 1) / 2;
  const centreY = (minRow + maxRow + 1) / 2;
  const halfW = Math.max(1, (maxCol - minCol + 1) / 2);
  const halfH = Math.max(1, (maxRow - minRow + 1) / 2);

  const level = (col: number, row: number): number => {
    const nx = (col + 0.5 - centreX) / halfW;
    const ny = (row + 0.5 - centreY) / halfH;
    const slope = (nx + ny) / Math.SQRT2;
    const lit = LIGHT_CORE - LIGHT_SPAN * slope;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((dx !== 0 || dy !== 0) && !isFull(col + dx, row + dy)) {
          const away = clamp01(0.5 + slope / 2);
          return clamp01(lit - RIM_SHADE * (RIM_LIT_SHARE + (1 - RIM_LIT_SHARE) * away));
        }
      }
    }
    return clamp01(lit);
  };

  // A hollow body has no ink to cut a face out of, so there the face is drawn.
  const hollow = options.fill === 'hollow';
  const cutout = roles.cutout && !hollow;
  // Feature paints are picked to read against the body; a hollow face sits on the page instead, so it takes the body's own paint.
  let mainPaint = 0;
  if (hollow) {
    const tally = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      const id = bodyPaint[i]!;
      if (id) tally.set(id, (tally.get(id) ?? 0) + 1);
    }
    let most = 0;
    for (const [id, count] of tally) {
      if (count > most) {
        most = count;
        mainPaint = id;
      }
    }
  }
  const put = (i: number, glyph: string, id: number, kind: number): void => {
    out.glyph[i] = glyph;
    out.paint[i] = glyph === '' ? 0 : id;
    out.kind[i] = glyph === '' ? CELL.empty : kind;
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      if (markPaint[i]) {
        if (!(cutout && inside[i])) {
          const mark = markPaint[i]!;
          const onPage = hollow && inside[i] && table.defs[mark - 1]!.tint.kind !== 'fx';
          put(i, charset.mark(markMask[i]!), onPage ? bodyPaint[i] || mainPaint || mark : mark, CELL.mark);
        }
        continue;
      }
      const mask = bodyMask[i]!;
      if (mask === 0) continue;
      // A hollow body is all outline, so there every partial cell stays an edge.
      if (mask !== 255 && (options.fill === 'hollow' || !charset.solid?.(mask))) {
        put(i, charset.edge(mask), bodyPaint[i]!, CELL.edge);
        continue;
      }
      if (options.fill === 'solid') {
        put(i, charset.fill(0, col, row), bodyPaint[i]!, CELL.fill);
      } else if (options.fill === 'shade') {
        put(i, charset.fill(level(col, row), col, row), bodyPaint[i]!, CELL.fill);
      } else {
        // A partial neighbour already draws the outline; a wall is only needed where the body meets nothing.
        const side = NEIGHBOURS_4.find(([dx, dy]) => isOutside(col + dx, row + dy));
        if (side) put(i, charset.wall(side[2]), bodyPaint[i]!, CELL.edge);
      }
    }
  }
  return out;
}
