import { fnv1a32 } from '../../math/hash.js';
import { createSvgElement, syncElement } from '../dom.js';
import type { LiveRenderer, LiveRendererContext } from '../renderer.js';
import { VIEWBOX_STR } from '../../core/types.js';
import type { FrameSnapshot } from '../../sim/snapshot.js';
import { createVectorScene, drawsInLayers, readVectorParams } from './build.js';
import { themeExtras, type ExtrasStage } from '../../themes/extras-hook.js';
import { isMedium } from './media.js';

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
 *
 * A character that wears a theme's skin or plays a theme's decorations or
 * motions is drawn in layers (`drawsInLayers`), which the theme's extras
 * keep in the DOM over the root's group (`ThemeExtras.stage`), so the
 * browser composites its motion instead of painting the skin again.
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
  /*
   * The width the character is shown at, for the drawing media's small-size
   * rule. Observed rather than read while drawing: a read between one
   * character's writes and the next one's draw forces a style recalculation
   * per character per frame.
   */
  let shownPx = 0;
  let last: FrameSnapshot | null = null;
  /** The layers, once a frame has wanted them; kept while frames draw in one tree, out of the DOM. */
  let stage: ExtrasStage | null = null;
  const scene = createVectorScene({
    mode: 'live',
    sourceId: context.sourceId,
    clipId,
    inkId,
    shadowId,
    softId: inkId.replace('aora-ink-', 'aora-soft-'),
    halftoneId: inkId.replace('aora-ink-', 'aora-halftone-'),
    glossId: inkId.replace('aora-ink-', 'aora-gloss-'),
    mediaId: inkId.replace('aora-ink-', 'aora-media-'),
    phaseSeed: context.seed,
    get params() {
      return params;
    },
    get displaySizePx() {
      return shownPx;
    },
  });

  /*
   * Off screen, a frame is kept and not drawn, and the CSS animations hold:
   * the simulation runs on, and the frame it is at is drawn as the
   * character comes back into view. A mirrored character is always drawn,
   * since its mirrors may be on screen when it is not.
   */
  let visible = true;
  let held = false;
  const play = () => {
    if (held || !visible) svg.style.setProperty('--aora-play', 'paused');
    else svg.style.removeProperty('--aora-play');
  };
  const sight =
    context.sourceId || typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(
          (entries) => {
            const now = entries[entries.length - 1]!.isIntersecting;
            if (now === visible) return;
            visible = now;
            play();
            if (visible && last) draw(last);
          },
          { rootMargin: '64px' },
        );
  sight?.observe(svg);

  function draw(frame: FrameSnapshot): void {
    const extras = themeExtras();
    if (extras && drawsInLayers(frame, context.sourceId)) {
      const layers = scene.layers(frame);
      syncElement(root, layers.back);
      stage ??= extras.stage(svg);
      stage.draw(frame, layers, shownPx);
    } else {
      stage?.remove();
      syncElement(root, scene.build(frame));
    }
    if (extras && !context.sourceId) extras.share(svg, scene.rules());
  }

  const resize =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver((entries) => {
          const width = entries[entries.length - 1]!.contentRect.width;
          if (width === shownPx) return;
          shownPx = width;
          // A held frame is drawn again at its new size; a running one would wait for its next tick.
          if (
            last &&
            (stage?.shown ||
              isMedium(last.variant) ||
              themeExtras()?.decorates(last.variant) ||
              last.body.parts.some((part) => part.minPx !== undefined))
          )
            draw(last);
        });
  resize?.observe(svg);

  return {
    element: svg,

    draw(frame, ticking) {
      last = frame;
      if (visible || !ticking) draw(frame);
    },

    configure(styleOptions) {
      params = readVectorParams(styleOptions);
    },

    hold(next) {
      held = next;
      play();
    },

    destroy() {
      resize?.disconnect();
      sight?.disconnect();
      last = null;
      stage = null;
      svg.remove();
    },
  };
}
