import { VIEWBOX_STR } from '../../core/types.js';
import { createSvgElement, syncElement } from '../dom.js';
import type { LiveRenderer, LiveRendererContext } from '../renderer.js';
import { buildKaomojiScene, inkOf, readKaomojiOptions } from './build.js';

/**
 * Mount a kaomoji character into `host`.
 *
 * A line of text in an SVG root, reconciled in place like the other series, so
 * mirrors, shared stages and static export need no special case for it.
 */
export function createKaomojiRenderer(host: Element, context: LiveRendererContext): LiveRenderer {
  const svg = createSvgElement('svg');
  svg.setAttribute('viewBox', VIEWBOX_STR);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.overflow = 'visible';
  svg.style.display = 'block';
  svg.style.width = '100%';
  svg.style.height = 'auto';

  const root = createSvgElement('g');
  svg.appendChild(root);
  host.appendChild(svg);

  let options = readKaomojiOptions(context.styleOptions);

  return {
    element: svg,

    draw(frame) {
      syncElement(root, buildKaomojiScene(frame, inkOf(frame), options, context.sourceId));
    },

    configure(styleOptions) {
      options = readKaomojiOptions(styleOptions);
    },

    destroy() {
      svg.remove();
    },
  };
}
