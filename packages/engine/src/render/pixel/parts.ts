/**
 * The figure's other pieces, in the pixel series.
 *
 * Same split as the vector style: pieces that are more of the body's ink
 * (ears, an antenna) join the body's mask, so they are shaded and edged with
 * it and the grid sees one silhouette; accessories (`leaf`, `inner`, `hair`) are
 * painted over the finished body in their own tone.
 */
import { LEAF_COLOR } from '../../core/leaf.js';
import type { PartColor } from '../../core/types.js';
import type { FrameSnapshot, PartFrame } from '../../sim/snapshot.js';
import { apply, type Affine } from './grid.js';
import { alphaLevel, type PaintTable } from './paints.js';
import { fillCentres } from './raster.js';

/** The leaf's paint in a live pixel scene: a token, as in the vector style. */
export const PIXEL_LEAF_TOKEN = `var(--aora-leaf, ${LEAF_COLOR})`;

/** How far an ear's inside is lightened towards white: the tone step `shade.ts` understands. */
const INNER_TONE = 0.45;
/** How far hair is mixed towards the hair shade (`hairShade` in the palette). */
export const HAIR_MIX = 0.4;

/** A piece fainter than this is not drawn: a cell is lit or it is not. */
const MIN_OPACITY = 0.5;

function mapped(part: PartFrame, m: Affine): { xy: Float64Array; n: number } {
  const n = part.outline.length;
  const xy = new Float64Array(n * 2);
  for (let i = 0; i < n; i++) apply(m, part.outline[i]![0], part.outline[i]![1], xy, i * 2);
  return { xy, n };
}

/** Add the same-ink pieces to the body's mask. */
export function fillBodyParts(frame: FrameSnapshot, m: Affine, size: number, mask: Uint8Array): void {
  for (const part of frame.body.parts) {
    if (part.tone !== 'body' || part.color !== undefined || part.opacity < MIN_OPACITY) continue;
    const poly = mapped(part, m);
    fillCentres(poly.xy, poly.n, size, mask);
  }
}

/** Paint the accessories over the finished body. `scratch` is a size x size buffer that is theirs to dirty. */
export function paintAccessories(
  frame: FrameSnapshot,
  m: Affine,
  size: number,
  paint: Uint16Array,
  table: PaintTable,
  scratch: Uint8Array,
  band: number,
): void {
  const core = frame.body.coreOpacity ?? 1;
  for (const part of frame.body.parts) {
    if (part.tone === 'body' && part.color === undefined) continue;
    const alpha = alphaLevel(part.opacity * core);
    if (alpha <= 0 || part.opacity < MIN_OPACITY) continue;

    scratch.fill(0);
    const poly = mapped(part, m);
    fillCentres(poly.xy, poly.n, size, scratch);

    if (part.color !== undefined) {
      paintOwnColour(part.color, scratch, size, paint, table, alpha);
      continue;
    }
    const id =
      part.tone === 'leaf'
        ? table.id({ kind: 'css', value: PIXEL_LEAF_TOKEN }, alpha)
        : part.tone === 'hair'
          ? table.id({ kind: 'hair', band }, alpha)
          : table.id({ kind: 'ink', band, tone: INNER_TONE }, alpha);
    for (let i = 0; i < scratch.length; i++) if (scratch[i]) paint[i] = id;
  }
}

/**
 * Below this many cells a part keeps every cell in its colour, since a ring
 * of its own edge cells would leave nothing inside it, and is ringed from
 * outside instead: the drawn cells touching it take the ring.
 */
const RIM_MIN_CELLS = 12;

/**
 * A part in its own colour, laid flat whatever its tone, ringed in its
 * derived line so it keeps its outline on a body of the same colour: on its
 * own edge cells, or round it when it is small.
 */
function paintOwnColour(
  color: PartColor,
  cells: Uint8Array,
  size: number,
  paint: Uint16Array,
  table: PaintTable,
  alpha: number,
): void {
  const fill = table.id({ kind: 'part', color, tone: 0, rim: false }, alpha);
  const rim = table.id({ kind: 'part', color, tone: 0, rim: true }, alpha);
  let count = 0;
  for (let i = 0; i < cells.length; i++) count += cells[i]!;
  const at = (col: number, row: number): number =>
    col < 0 || row < 0 || col >= size || row >= size ? 0 : cells[row * size + col]!;
  const small = count < RIM_MIN_CELLS;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const i = row * size + col;
      const touching = at(col - 1, row) || at(col + 1, row) || at(col, row - 1) || at(col, row + 1);
      if (!cells[i]) {
        if (small && touching && paint[i]) paint[i] = rim;
        continue;
      }
      const edge = !small && !(at(col - 1, row) && at(col + 1, row) && at(col, row - 1) && at(col, row + 1));
      paint[i] = edge ? rim : fill;
    }
  }
}
