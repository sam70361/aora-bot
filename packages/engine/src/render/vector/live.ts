import { fnv1a32 } from '../../math/hash.js';
import { createSvgElement, syncElement } from '../dom.js';
import type { LiveRenderer, LiveRendererContext } from '../renderer.js';
import { VIEWBOX_STR } from '../../core/types.js';
import { createVectorScene, readVectorParams } from './build.js';

/** Module-wide counter that keeps ids unique across same-seed characters. */
let idSerial = 0;

/**
 * Mount a vector character into `host`.
 *
 * React is not involved past mount. The host is an empty element and from
 * then on every frame is a reconcile of the scene against a DOM tree this
 * module owns: only attributes whose value changed are written. Going
 * through React's reconciler sixty times a second for a dozen attributes
 * would cost far more than the animation itself.
 */
export function createVectorRenderer(host: Element, context: LiveRendererContext): LiveRenderer {
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

  // Seed-derived so the DOM is reproducible for a given seed; the counter keeps
  // two characters with the same seed on one page from sharing an id.
  const seedHash = fnv1a32(context.seed);
  const clipId = `aora-clip-${seedHash.toString(36)}-${(idSerial++).toString(36)}`;
  const inkId = `aora-ink-${seedHash.toString(36)}-${(idSerial++).toString(36)}`;

  const shadowId = inkId.replace('aora-ink-', 'aora-shadow-');

  let params = readVectorParams(context.styleOptions);
  const scene = createVectorScene({
    mode: 'live',
    sourceId: context.sourceId,
    clipId,
    inkId,
    shadowId,
    softId: inkId.replace('aora-ink-', 'aora-soft-'),
    halftoneId: inkId.replace('aora-ink-', 'aora-halftone-'),
    glossId: inkId.replace('aora-ink-', 'aora-gloss-'),
    get params() {
      return params;
    },
  });

  return {
    element: svg,

    draw(frame) {
      syncElement(root, scene.build(frame));
    },

    configure(styleOptions) {
      params = readVectorParams(styleOptions);
    },

    destroy() {
      svg.remove();
    },
  };
}
