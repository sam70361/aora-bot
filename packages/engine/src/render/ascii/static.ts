import { VIEWBOX_STR } from '../../core/types.js';
import type { StaticRenderer } from '../renderer.js';
import { serializeNode } from '../scene.js';
import { schemeStyle } from '../scheme.js';
import { composeStatic, monoInk } from './compose.js';
import { emitAscii } from './emit.js';

/**
 * One snapshot as an SVG document.
 *
 * No DOM, no timers and no effects: a static frame is settled, so the same
 * snapshot is the same bytes. Colours are hex, with the dark scheme's value
 * where one changes with it, as in the pixel series.
 */
export const renderAsciiStatic: StaticRenderer = (frame, context) => {
  const { uid } = context;
  const { cells, table, grid, options, variant, look } = composeStatic(frame, context);

  const ink = monoInk(look, context.flat);
  const { scene, overrides } = emitAscii(cells, table, {
    grid,
    variant,
    glow: options.glow,
    colour: variant === 'mono' ? () => ink : look.colour,
    ids: { glow: `${uid}-glow`, scanlines: `${uid}-scan` },
    classPrefix: `${uid}-`,
  });

  const css = schemeStyle(
    context.colorScheme ?? 'system',
    overrides.map((r) => ({
      selector: `.${r.className}`,
      decls: [{ prop: 'fill', light: r.light, dark: r.dark }],
    })),
    false,
  );
  const style = css && `\n  ${css}`;
  const size = context.sizePx ? ` width="${context.sizePx}" height="${context.sizePx}"` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX_STR}"${size} fill="none" aria-hidden="true">${style}
  ${serializeNode(scene, 2)}
</svg>`;
};
