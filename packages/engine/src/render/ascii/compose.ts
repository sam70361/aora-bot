/**
 * A frame snapshot to character cells: the one path the live renderer, the
 * static one and the plain-text form all take.
 */
import type { FrameSnapshot } from '../../sim/snapshot.js';
import { staticLook, type PixelLook, type StaticLook } from '../pixel/colours.js';
import type { ResolvedColour } from '../pixel/emit.js';
import { pixelGrid, type PixelGrid } from '../pixel/grid.js';
import { createPaintTable, type PaintTable } from '../pixel/paints.js';
import { createScratch, rasterise, type Scratch } from '../pixel/rasterise.js';
import type { StaticRenderContext } from '../renderer.js';
import { buildCells, COLOUR_ROLES, CUTOUT_ROLES, type CharGrid } from './cells.js';
import { stampFx } from './fx.js';
import {
  ASCII_SHADES,
  asciiVariantOf,
  pixelVariantOf,
  readAsciiOptions,
  type AsciiOptions,
  type AsciiVariant,
} from './options.js';

/** The sub-grid under `cols` character columns: twice as wide, so a cell is 2 sub-cells across and 4 down. */
export const subGrid = (cols: number): PixelGrid => pixelGrid(cols * 2);

/**
 * Rasterise `frame` and group it into cells, effects and particles stamped on
 * last. `paint` and `scratch` are the caller's, sized for `grid`; `table`
 * must already know what `look` means.
 */
export function composeCells(
  frame: FrameSnapshot,
  look: PixelLook,
  variant: AsciiVariant,
  options: AsciiOptions,
  grid: PixelGrid,
  table: PaintTable,
  scratch: Scratch,
  paint: Uint16Array,
): CharGrid {
  // Effects and confetti are glyphs of their own, not shapes to rasterise.
  const picture: FrameSnapshot = { ...frame, fx: null, particles: [] };
  rasterise(
    picture,
    {
      grid,
      shades: ASCII_SHADES,
      outline: true,
      variant: pixelVariantOf(variant),
      gradient: look.gradient,
      eye: look.eye,
      face: look.face,
    },
    table,
    scratch,
    paint,
  );
  const cells = buildCells(paint, table, grid, options, variant === 'mono' ? CUTOUT_ROLES : COLOUR_ROLES);
  stampFx(cells, frame, grid, table, Math.floor(look.bands / 2));
  return cells;
}

export interface StaticCells {
  cells: CharGrid;
  table: PaintTable;
  grid: PixelGrid;
  options: AsciiOptions;
  variant: AsciiVariant;
  look: StaticLook;
}

/** The one ink of the `mono` variant: the middle band of the palette's, whatever paint a glyph had. */
export function monoInk(look: StaticLook, flat: boolean | undefined): ResolvedColour {
  const middle = Math.floor(look.bands / 2);
  return { value: look.base(middle, 'light'), dark: flat ? undefined : look.base(middle, 'dark') };
}

/** The cells of a static render, with what they are drawn in. No effects: a static frame is settled. */
export function composeStatic(frame: FrameSnapshot, context: StaticRenderContext): StaticCells {
  const options = readAsciiOptions(context.styleOptions);
  const variant = asciiVariantOf(frame.variant);
  const grid = subGrid(options.cols);
  const table = createPaintTable();
  const look = staticLook({
    color: context.color,
    flat: context.flat,
    variant: pixelVariantOf(variant),
    shades: ASCII_SHADES,
    // One ink has no second colour to put in the eyes.
    eyeColor: variant === 'mono' ? undefined : context.eyeColor,
  });
  const cells = composeCells(
    frame,
    look,
    variant,
    options,
    grid,
    table,
    createScratch(grid.size),
    new Uint16Array(grid.size * grid.size),
  );
  return { cells, table, grid, options, variant, look };
}
