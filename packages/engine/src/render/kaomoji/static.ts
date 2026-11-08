import { getInkColor } from '../../core/palette.js';
import { VIEWBOX_STR } from '../../core/types.js';
import type { StaticRenderer } from '../renderer.js';
import { serializeNode } from '../scene.js';
import { paletteInk } from '../scheme.js';
import { buildKaomojiScene, readKaomojiOptions } from './build.js';

/**
 * One snapshot as an SVG document.
 *
 * No DOM and no timers, like the other series. The text takes the palette ink
 * through a custom property whose dark-mode value follows `colorScheme`: the
 * OS for a data URL, the page's own `color-scheme` for an inlined document.
 */
export const renderKaomojiStatic: StaticRenderer = (frame, context) => {
  const { color, uid, flat } = context;
  const own = frame.ink;
  const light = getInkColor(color, 'light');

  let ink: string;
  let defs = '';
  let root = '';
  if (own) {
    ink = 'flat' in own ? own.flat : own.from;
  } else if (flat) {
    ink = light;
  } else {
    ink = `var(--${uid}-ink, ${light})`;
    defs = paletteInk(context.colorScheme ?? 'system', uid, light, getInkColor(color, 'dark'), null);
    root = ` class="${uid}"`;
  }

  const scene = buildKaomojiScene(frame, ink, readKaomojiOptions(context.styleOptions));
  const size = context.sizePx ? ` width="${context.sizePx}" height="${context.sizePx}"` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg"${root} viewBox="${VIEWBOX_STR}"${size} fill="none" aria-hidden="true">${defs}
  ${serializeNode(scene, 2)}
</svg>`;
};
