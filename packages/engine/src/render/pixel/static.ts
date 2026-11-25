import { VIEWBOX_STR } from '../../core/types.js';
import type { StaticRenderer } from '../renderer.js';
import { serializeNode } from '../scene.js';
import { schemeStyle } from '../scheme.js';
import { staticLook } from './colours.js';
import { emit } from './emit.js';
import { pixelGrid } from './grid.js';
import { readOptions, variantOf } from './options.js';
import { createPaintTable } from './paints.js';
import { createScratch, rasterise } from './rasterise.js';

/**
 * One snapshot as an SVG document.
 *
 * No DOM and no timers, like the vector one. Colours are resolved to hex here
 * rather than left to `color-mix()`: static output ends up in `<img>` tags,
 * data URLs and renderers that have never heard of CSS colour functions. The
 * dark-mode ink is a colour-scheme override, as it is in the vector style
 * (see `schemeStyle`).
 */
export const renderPixelStatic: StaticRenderer = (frame, context) => {
  const { color, uid, flat } = context;
  const options = readOptions(context.styleOptions);
  const variant = variantOf(frame.variant);
  const grid = pixelGrid(options.grid);
  const table = createPaintTable();
  const paint = new Uint16Array(grid.size * grid.size);

  const look = staticLook({ color, flat, variant, shades: options.shades, eyeColor: context.eyeColor });
  rasterise(
    frame,
    {
      grid,
      shades: options.shades,
      outline: options.outline,
      variant,
      gradient: look.gradient,
      eye: look.eye,
      face: look.face,
    },
    table,
    createScratch(grid.size),
    paint,
  );

  const { scene, overrides, stroked } = emit(paint, table, {
    grid,
    variant,
    gap: options.gap,
    glow: options.glow,
    colour: look.colour,
    ids: { pattern: `${uid}-px`, glow: `${uid}-glow` },
    classPrefix: `${uid}-`,
  });

  const property = stroked ? 'stroke' : 'fill';
  const css = schemeStyle(
    context.colorScheme ?? 'system',
    overrides.map((r) => ({
      selector: `.${r.className}`,
      decls: [{ prop: property, light: r.light, dark: r.dark }],
    })),
    false,
  );
  const style = css && `\n  ${css}`;
  const size = context.sizePx ? ` width="${context.sizePx}" height="${context.sizePx}"` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX_STR}"${size} fill="none" aria-hidden="true">${style}
  ${serializeNode(scene, 2)}
</svg>`;
};
