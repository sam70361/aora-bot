/**
 * A grid of paint ids to a scene.
 *
 * One `<path>` per paint, all cells of that paint merged into it. Path data is
 * in cell units, so a cell is one unit and the whole picture hangs off a
 * single `scale()`: the markup does not depend on how large the grid is drawn,
 * and two frames that rasterise the same differ in no byte.
 */
import { VIEWBOX } from '../../core/types.js';
import { r2, node, type AttrValue, type SceneNode } from '../scene.js';
import type { PaintDef, PaintTable } from './paints.js';
import type { PixelGrid } from './grid.js';
import type { PixelVariant } from './rasterise.js';

/** A resolved paint colour; `dark` is its colour in a dark colour scheme, when it has one. */
export interface ResolvedColour {
  value: string;
  dark?: string;
}

export interface EmitContext {
  grid: PixelGrid;
  variant: PixelVariant;
  /** Clear space between neighbouring marks, as a fraction of a cell. */
  gap: number;
  /** The LED glow of the `dot` variant. */
  glow: boolean;
  colour(def: PaintDef): ResolvedColour;
  /** Ids for the pattern and the filter the `dot` variant defines. */
  ids: { pattern: string; glow: string };
  /** Prefix for the class names that carry dark-mode overrides. Static output only. */
  classPrefix?: string;
}

export interface PaintOverride {
  className: string;
  light: string;
  dark: string;
}

export interface Emitted {
  scene: SceneNode;
  /** Paints that change with the colour scheme; the caller puts them in a stylesheet. */
  overrides: PaintOverride[];
  /** Whether the overrides set `stroke` (the `dot` variant) rather than `fill`. */
  stroked: boolean;
}

/** Cell-unit coordinates are fractions at most a few digits long. */
const r3 = (n: number): number => Math.round(n * 1000) / 1000;

/** The unlit LED plate's colour: fixed, because the plate is a dark panel on a light page too. */
export const PLATE_COLOUR = '#17181D';

/** The plate's corner radius as a share of its side: a half makes it a round badge. */
const PLATE_ROUNDING = 0.5;

export function emit(paint: Uint16Array, table: PaintTable, ctx: EmitContext): Emitted {
  const { grid, variant } = ctx;
  const size = grid.size;
  const parts: string[][] = table.defs.map(() => []);

  const gap = Math.min(0.5, Math.max(0, ctx.gap));
  const side = r3(1 - gap);
  const inset = r3(gap / 2);

  for (let row = 0; row < size; row++) {
    let col = 0;
    while (col < size) {
      const id = paint[row * size + col]!;
      if (id === 0) {
        col++;
        continue;
      }
      const list = parts[id - 1]!;
      if (variant === 'crisp') {
        let end = col + 1;
        while (end < size && paint[row * size + end] === id) end++;
        const run = end - col;
        list.push(`M${col} ${row}h${run}v1h${-run}z`);
        col = end;
      } else if (variant === 'block') {
        list.push(`M${r3(col + inset)} ${r3(row + inset)}h${side}v${side}h${-side}z`);
        col++;
      } else {
        list.push(`M${col + 0.5} ${row + 0.5}h0`);
        col++;
      }
    }
  }

  const overrides: PaintOverride[] = [];
  const stroked = variant === 'dot';
  const paths: SceneNode[] = [];
  table.defs.forEach((def, i) => {
    const list = parts[i]!;
    if (list.length === 0) return;
    const colour = ctx.colour(def);
    const attrs: Record<string, AttrValue> = {};
    if (colour.dark !== undefined && ctx.classPrefix !== undefined) {
      const className = `${ctx.classPrefix}${i}`;
      attrs.class = className;
      overrides.push({ className, light: colour.value, dark: colour.dark });
    }
    attrs[stroked ? 'stroke' : 'fill'] = colour.value;
    if (def.alpha < 1) attrs.opacity = def.alpha;
    attrs.d = list.join('');
    paths.push(node('path', attrs));
  });

  const offset = r3(-grid.margin * grid.cell);
  const transform = `translate(${offset} ${offset}) scale(${r3(grid.cell)})`;

  if (!stroked) {
    return {
      scene: node('g', { transform, 'shape-rendering': 'crispEdges' }, paths, { layout: 'block' }),
      overrides,
      stroked,
    };
  }

  // The dot variant is an LED panel: a dark plate, every cell's unlit dot, and
  // the lit ones on top. The unlit dots are one repeated tile, not a path, laid
  // over the plate's own shape so none shows past its edge. The plate is round:
  // a square panel is the one hard edge in a field of round characters, and on
  // a light page it reads as a black tile.
  const radius = r3(side / 2);
  const left = r3(grid.margin + VIEWBOX.minX / grid.cell + 0.1);
  const width = r3(VIEWBOX.width / grid.cell - 0.2);
  const plate = { x: left, y: left, width, height: width, rx: r2(width * PLATE_ROUNDING) };
  const children: SceneNode[] = [
    node('defs', undefined, [
      node('pattern', { id: ctx.ids.pattern, width: 1, height: 1, patternUnits: 'userSpaceOnUse' }, [
        node('circle', { cx: 0.5, cy: 0.5, r: radius, fill: '#fff', 'fill-opacity': 0.07 }),
      ]),
      ...(ctx.glow
        ? [
            node('filter', { id: ctx.ids.glow, 'color-interpolation-filters': 'sRGB' }, [
              node('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 0.28, result: 'glow' }),
              node('feMerge', undefined, [
                node('feMergeNode', { in: 'glow' }),
                node('feMergeNode', { in: 'SourceGraphic' }),
              ]),
            ]),
          ]
        : []),
    ]),
    node('rect', { ...plate, fill: PLATE_COLOUR }),
    node('rect', { ...plate, fill: `url(#${ctx.ids.pattern})` }),
    node(
      'g',
      {
        'stroke-width': side,
        'stroke-linecap': 'round',
        filter: ctx.glow ? `url(#${ctx.ids.glow})` : undefined,
      },
      paths,
      { layout: 'block' },
    ),
  ];
  // The panel is dark on either page, so its tokens resolve as a dark page's do: black lights it white.
  return {
    scene: node('g', { transform, style: 'color-scheme:dark' }, children, { layout: 'block' }),
    overrides,
    stroked,
  };
}
