/**
 * The mood effects and the confetti, as literal glyphs.
 *
 * A heart drawn out of sub-cells is a smudge, so these are not rasterised:
 * each piece is a character laid on the cell its centre falls in, over
 * whatever the body put there.
 */
import { meanScale, type Affine, type PixelGrid } from '../pixel/grid.js';
import { alphaLevel, type PaintTable, type Tint } from '../pixel/paints.js';
import { frameTransforms } from '../pixel/rasterise.js';
import type { FrameSnapshot } from '../../sim/snapshot.js';
import { CELL, type CharGrid } from './cells.js';

/** A `z` this big, in shape units, is drawn `Z`: the last of the three of a sleeper's Zz. */
const Z_BIG = 16;
/** A dot this wide in sub-cells, as a radius, is an `o`; smaller is a `.`. */
const DOT_BIG = 1.6;
/** Below this an arc is a spinner's leading mark, not a stroked curve. */
const SHORT_ARC = 60;

/** The stroke character that runs along direction (`dx`, `dy`), `y` down. */
export function strokeGlyph(dx: number, dy: number): string {
  const d = ((((Math.atan2(dy, dx) * 180) / Math.PI) % 180) + 180) % 180;
  if (d < 22.5 || d >= 157.5) return '-';
  if (d < 67.5) return '\\';
  if (d < 112.5) return '|';
  return '/';
}

/**
 * Stamp the frame's effects and particles onto `cells`.
 *
 * `grid` is the sub-grid the picture was rasterised on and `band` the ink band
 * effects without a colour of their own are drawn in, as in the pixel series.
 */
export function stampFx(
  cells: CharGrid,
  frame: FrameSnapshot,
  grid: PixelGrid,
  table: PaintTable,
  band: number,
): void {
  const { root, body } = frameTransforms(frame, grid);

  const put = (x: number, y: number, glyph: string, id: number): void => {
    const col = Math.floor(x / 2);
    const row = Math.floor(y / 4);
    if (col < 0 || row < 0 || col >= cells.cols || row >= cells.rows) return;
    const i = row * cells.cols + col;
    cells.glyph[i] = glyph;
    cells.paint[i] = id;
    cells.kind[i] = CELL.fx;
  };

  /** A glyph at every cell the segment from `a` to `b` passes through. */
  const along = (ax: number, ay: number, bx: number, by: number, glyph: string, id: number): void => {
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let s = 0; s <= steps; s++) {
      put(ax + ((bx - ax) * s) / steps, ay + ((by - ay) * s) / steps, glyph, id);
    }
  };

  const fx = frame.fx;
  if (fx) {
    const m: Affine = fx.space === 'face' ? body : root;
    const tint: Tint = fx.color ? { kind: 'css', value: fx.color } : { kind: 'fx', band };
    const at = (x: number, y: number): [number, number] => [
      m[0] * x + m[2] * y + m[4],
      m[1] * x + m[3] * y + m[5],
    ];
    const scale = meanScale(m);

    for (const item of fx.items) {
      const alpha = alphaLevel(item.opacity);
      if (alpha <= 0) continue;
      const id = table.id(tint, alpha);
      const [x, y] = at(item.x, item.y);
      const reach = item.size * scale;
      switch (item.shape) {
        case 'z':
          put(x, y, reach * grid.cell >= Z_BIG ? 'Z' : 'z', id);
          break;
        case 'star':
          put(x, y, '*', id);
          break;
        case 'heart':
          put(x, y, '♥', id);
          break;
        case 'drop':
          put(x, y, "'", id);
          break;
        case 'bang':
          // The item's point is the top of the mark; the stem is below it.
          put(x, y + 3, '!', id);
          break;
        case 'dot':
          put(x, y, reach >= DOT_BIG ? 'o' : '.', id);
          break;
        case 'pencil':
          put(x, y, '/', id);
          break;
        case 'line': {
          const [x2, y2] = at(item.x2 ?? item.x, item.y2 ?? item.y);
          along(x, y, x2, y2, strokeGlyph(x2 - x, y2 - y), id);
          break;
        }
        case 'arc': {
          const sweep = item.sweep ?? 0;
          const start = ((item.start ?? 0) - 90) * (Math.PI / 180);
          if (sweep < SHORT_ARC) {
            const end = start + sweep * (Math.PI / 180);
            put(
              x + Math.cos(end) * reach,
              y + Math.sin(end) * reach,
              strokeGlyph(-Math.sin(end), Math.cos(end)),
              id,
            );
          } else {
            const steps = Math.max(2, Math.ceil((sweep * (Math.PI / 180) * reach) / 0.75));
            for (let s = 0; s <= steps; s++) {
              const a = start + (sweep * (Math.PI / 180) * s) / steps;
              put(
                x + Math.cos(a) * reach,
                y + Math.sin(a) * reach,
                strokeGlyph(-Math.sin(a), Math.cos(a)),
                id,
              );
            }
          }
          break;
        }
      }
    }
  }

  const k = meanScale(root);
  for (const p of frame.particles) {
    const alpha = alphaLevel(p.opacity);
    if (alpha <= 0) continue;
    const id = table.id({ kind: 'css', value: p.color }, alpha);
    const x = root[0] * p.x + root[2] * p.y + root[4];
    const y = root[1] * p.x + root[3] * p.y + root[5];
    if (p.kind === 'star') put(x, y, '*', id);
    else if (p.kind === 'strip') put(x, y, strokeGlyph(Math.cos(p.rotation), Math.sin(p.rotation)), id);
    else put(x, y, p.size * k >= 2 ? 'o' : '.', id);
  }
}
