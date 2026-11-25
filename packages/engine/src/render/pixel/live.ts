import { VIEWBOX_STR } from '../../core/types.js';
import { fnv1a32 } from '../../math/hash.js';
import type { FrameSnapshot } from '../../sim/snapshot.js';
import { createSvgElement, syncElement } from '../dom.js';
import type { LiveRenderer, LiveRendererContext } from '../renderer.js';
import { liveLook, liveLookKey } from './colours.js';
import { emit } from './emit.js';
import { pixelGrid, type PixelGrid } from './grid.js';
import { readOptions, variantOf } from './options.js';
import { createPaintTable } from './paints.js';
import { createScratch, rasterise, type RasterSettings, type Scratch } from './rasterise.js';

/** Keeps ids unique across characters that share a seed. */
let idSerial = 0;

/**
 * Mount a pixel character into `host`.
 *
 * A frame is rasterised into a grid of paint ids and compared with the last
 * one. Nothing is built or written to the DOM unless a cell changed, which is
 * most frames when `fps` quantises motion and many even when it does not: a
 * body has to move a whole cell before anything shows.
 */
export function createPixelRenderer(host: Element, context: LiveRendererContext): LiveRenderer {
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

  const seed = `${fnv1a32(context.seed).toString(36)}-${(idSerial++).toString(36)}`;
  const ids = { pattern: `aora-px-${seed}`, glow: `aora-pg-${seed}` };

  let options = readOptions(context.styleOptions);
  const table = createPaintTable();

  let grid: PixelGrid = pixelGrid(options.grid);
  let scratch: Scratch = createScratch(grid.size);
  let paint = new Uint16Array(grid.size * grid.size);
  let previous = new Uint16Array(grid.size * grid.size);

  let last: FrameSnapshot | null = null;
  let lastTime = Number.NaN;
  let lastBucket = Number.NaN;
  /** What the paint ids mean. A change in it invalidates the table, and so the comparison. */
  let signature = '';
  /** Set when something other than the frame changed, so the next draw writes even if no cell did. */
  let dirty = true;

  function resize(): void {
    grid = pixelGrid(options.grid);
    scratch = createScratch(grid.size);
    paint = new Uint16Array(grid.size * grid.size);
    previous = new Uint16Array(grid.size * grid.size);
  }

  function draw(frame: FrameSnapshot): void {
    last = frame;
    const variant = variantOf(frame.variant);
    const look = liveLook(frame.ink, variant, options.shades);
    const next = liveLookKey(frame.ink, variant);
    if (next !== signature) {
      signature = next;
      table.clear();
      previous.fill(0);
      dirty = true;
    }

    // Motion is sampled on a clock: `fps` times a second the body, the eyes
    // and the belts are allowed to land on a new set of cells. A frame at the
    // same simulated time as the last one is a repaint, not a tick, and
    // always goes through.
    const bucket = options.fps > 0 ? Math.floor(frame.time * options.fps) : Number.NaN;
    const sameBucket = !dirty && frame.time !== lastTime && bucket === lastBucket;
    lastTime = frame.time;
    if (sameBucket) return;
    lastBucket = bucket;

    const settings: RasterSettings = {
      grid,
      shades: options.shades,
      outline: options.outline,
      variant,
      gradient: look.gradient,
      eye: look.eye,
      face: look.face,
    };
    rasterise(frame, settings, table, scratch, paint);

    if (!dirty) {
      let same = true;
      for (let i = 0; i < paint.length; i++) {
        if (paint[i] !== previous[i]) {
          same = false;
          break;
        }
      }
      if (same) return;
    }
    previous.set(paint);
    dirty = false;

    const { scene } = emit(paint, table, {
      grid,
      variant,
      gap: options.gap,
      glow: options.glow,
      colour: look.colour,
      ids,
    });
    syncElement(root, {
      tag: 'g',
      attrs: { id: context.sourceId || undefined },
      children: [scene],
    });
  }

  return {
    element: svg,

    draw,

    configure(styleOptions) {
      const before = options.grid;
      options = readOptions(styleOptions);
      if (options.grid !== before) resize();
      table.clear();
      previous.fill(0);
      dirty = true;
      // A new grid or gap changes the picture of the frame already on screen.
      if (last) draw(last);
    },

    destroy() {
      svg.remove();
    },
  };
}
