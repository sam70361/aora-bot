/**
 * Character cells to a scene.
 *
 * One `<text>` per paint, one `<tspan>` per row of it. Every glyph has its own
 * `x`, the centre of its cell, so the columns line up in whatever monospace
 * font the viewer ends up with, and a space is never written: the gaps are in
 * the coordinates. Like the pixel scene, coordinates are in sub-cell units and
 * the whole picture hangs off one `scale()`.
 */
import { roundTo } from '../../math/round.js';
import { PLATE_COLOUR, plateRect, type PaintOverride, type ResolvedColour } from '../pixel/emit.js';
import type { PixelGrid } from '../pixel/grid.js';
import type { PaintDef, PaintTable } from '../pixel/paints.js';
import { node, r2, type AttrValue, type SceneNode } from '../scene.js';
import type { CharGrid } from './cells.js';
import type { AsciiVariant } from './options.js';

export const ASCII_FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

/** A glyph is drawn at this share of its cell's height, which makes a monospace advance fill the cell's width. */
const FONT_FILL = 1 / 1.2;

/** A character cell in sub-cell units. */
const CELL_W = 2;
const CELL_H = 4;

/** The glow of the `crt` variant, in sub-cell units. */
const GLOW_BLUR = 0.4;
/** Share of white in the scanlines. */
const SCANLINE_LIGHT = 0.06;

export interface AsciiEmitContext {
  grid: PixelGrid;
  variant: AsciiVariant;
  /** The glow of the `crt` variant. */
  glow: boolean;
  colour(def: PaintDef): ResolvedColour;
  /** Ids for the filter and the pattern the `crt` variant defines. */
  ids: { glow: string; scanlines: string };
  /** Prefix for the class names that carry dark-mode overrides. Static output only. */
  classPrefix?: string;
}

export interface AsciiEmitted {
  scene: SceneNode;
  /** Paints that change with the colour scheme; the caller puts them in a stylesheet. */
  overrides: PaintOverride[];
}

interface Group {
  /** The first paint of the group, which stands for the colour of all of them. */
  index: number;
  rows: { row: number; xs: number[]; text: string }[];
}

const blank = (glyph: string): boolean => glyph === '' || glyph === ' ' || glyph === '\u2800';

export function emitAscii(cells: CharGrid, table: PaintTable, ctx: AsciiEmitContext): AsciiEmitted {
  const { grid, variant } = ctx;
  // One ink means one element, but for glyphs that are drawn fainter than the rest.
  const keyOf = (id: number): number => (variant === 'mono' ? -table.defs[id - 1]!.alpha : id);

  const groups = new Map<number, Group>();
  for (let row = 0; row < cells.rows; row++) {
    for (let col = 0; col < cells.cols; col++) {
      const i = row * cells.cols + col;
      const glyph = cells.glyph[i]!;
      if (blank(glyph)) continue;
      const id = cells.paint[i]!;
      const key = keyOf(id);
      let group = groups.get(key);
      if (!group) groups.set(key, (group = { index: id - 1, rows: [] }));
      let line = group.rows[group.rows.length - 1];
      if (line?.row !== row) group.rows.push((line = { row, xs: [], text: '' }));
      line!.xs.push(col * CELL_W + CELL_W / 2);
      line!.text += glyph;
    }
  }

  const overrides: PaintOverride[] = [];
  const texts: SceneNode[] = [];
  for (const [, group] of [...groups].sort((a, b) => a[0] - b[0])) {
    const def = table.defs[group.index]!;
    const colour = ctx.colour(def);
    const attrs: Record<string, AttrValue> = {};
    if (colour.dark !== undefined && ctx.classPrefix !== undefined) {
      const className = `${ctx.classPrefix}${group.index}`;
      attrs.class = className;
      overrides.push({ className, light: colour.value, dark: colour.dark });
    }
    attrs.fill = colour.value;
    if (def.alpha < 1) attrs.opacity = def.alpha;
    texts.push(
      node(
        'text',
        attrs,
        group.rows.map((line) =>
          node('tspan', { x: line.xs.join(' '), y: line.row * CELL_H + CELL_H / 2 }, undefined, {
            text: line.text,
          }),
        ),
      ),
    );
  }

  const offset = roundTo(-grid.margin * grid.cell, 3);
  const transform = `translate(${offset} ${offset}) scale(${roundTo(grid.cell, 3)})`;
  const lettering = {
    'font-family': ASCII_FONT,
    'font-size': r2(CELL_H * FONT_FILL),
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
  };

  if (variant !== 'crt') {
    return {
      scene: node('g', { transform, ...lettering }, texts, { layout: 'block' }),
      overrides,
    };
  }

  // The panel is a dark plate with faint scanlines, lit by the glyphs on it, and dark on either page.
  const plate = plateRect(grid);
  const children: SceneNode[] = [
    node('defs', undefined, [
      node('pattern', { id: ctx.ids.scanlines, width: 1, height: 2, patternUnits: 'userSpaceOnUse' }, [
        node('rect', { width: 1, height: 1, fill: '#fff', 'fill-opacity': SCANLINE_LIGHT }),
      ]),
      ...(ctx.glow
        ? [
            node('filter', { id: ctx.ids.glow, 'color-interpolation-filters': 'sRGB' }, [
              node('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: GLOW_BLUR, result: 'glow' }),
              node('feMerge', undefined, [
                node('feMergeNode', { in: 'glow' }),
                node('feMergeNode', { in: 'SourceGraphic' }),
              ]),
            ]),
          ]
        : []),
    ]),
    node('rect', { ...plate, fill: PLATE_COLOUR }),
    node('rect', { ...plate, fill: `url(#${ctx.ids.scanlines})` }),
    node('g', { ...lettering, filter: ctx.glow ? `url(#${ctx.ids.glow})` : undefined }, texts, {
      layout: 'block',
    }),
  ];
  return {
    scene: node('g', { transform, style: 'color-scheme:dark' }, children, { layout: 'block' }),
    overrides,
  };
}
