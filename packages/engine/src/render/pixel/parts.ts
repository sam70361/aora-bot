/**
 * The figure's other pieces, in the pixel series.
 *
 * Same split as the vector style: pieces that are more of the body's ink
 * (ears, an antenna) join the body's mask, so they are shaded and edged with
 * it and the grid sees one silhouette; accessories (`leaf`, `inner`, `hair`) are
 * painted over the finished body in their own tone.
 */
import { LEAF_COLOR } from '../../core/leaf.js';
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
    if (part.tone !== 'body' || part.opacity < MIN_OPACITY) continue;
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
    if (part.tone === 'body') continue;
    const alpha = alphaLevel(part.opacity * core);
    if (alpha <= 0 || part.opacity < MIN_OPACITY) continue;

    const id =
      part.tone === 'leaf'
        ? table.id({ kind: 'css', value: PIXEL_LEAF_TOKEN }, alpha)
        : part.tone === 'hair'
          ? table.id({ kind: 'hair', band }, alpha)
          : table.id({ kind: 'ink', band, tone: INNER_TONE }, alpha);

    scratch.fill(0);
    const poly = mapped(part, m);
    fillCentres(poly.xy, poly.n, size, scratch);
    for (let i = 0; i < scratch.length; i++) if (scratch[i]) paint[i] = id;
  }
}
