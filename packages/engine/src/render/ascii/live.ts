import { VIEWBOX_STR } from '../../core/types.js';
import { fnv1a32 } from '../../math/hash.js';
import type { FrameSnapshot } from '../../sim/snapshot.js';
import { createSvgElement, syncElement } from '../dom.js';
import { liveLook, liveLookKey } from '../pixel/colours.js';
import type { PixelGrid } from '../pixel/grid.js';
import { createPaintTable } from '../pixel/paints.js';
import { createScratch, type Scratch } from '../pixel/rasterise.js';
import type { LiveRenderer, LiveRendererContext } from '../renderer.js';
import type { CharGrid } from './cells.js';
import { CHARSETS } from './charsets.js';
import { composeCells, subGrid } from './compose.js';
import { applyEffect } from './effects.js';
import { emitAscii } from './emit.js';
import { ASCII_SHADES, asciiVariantOf, pixelVariantOf, readAsciiOptions } from './options.js';

/** Keeps ids unique across characters that share a seed. */
let idSerial = 0;

function sameCells(a: CharGrid, b: CharGrid): boolean {
  if (a.glyph.length !== b.glyph.length) return false;
  for (let i = 0; i < a.glyph.length; i++) {
    if (a.glyph[i] !== b.glyph[i] || a.paint[i] !== b.paint[i]) return false;
  }
  return true;
}

/**
 * Mount an ascii character into `host`.
 *
 * Each frame is rasterised, grouped into character cells and given its
 * effect, then compared with the last: nothing is built or written to the DOM
 * unless a glyph or its paint changed.
 */
export function createAsciiRenderer(host: Element, context: LiveRendererContext): LiveRenderer {
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
  const ids = { glow: `aora-ag-${seed}`, scanlines: `aora-as-${seed}` };

  let options = readAsciiOptions(context.styleOptions);
  const table = createPaintTable();

  let grid: PixelGrid = subGrid(options.cols);
  let scratch: Scratch = createScratch(grid.size);
  let paint = new Uint16Array(grid.size * grid.size);
  let previous: CharGrid | null = null;

  let last: FrameSnapshot | null = null;
  let lastTime = Number.NaN;
  let lastBucket = Number.NaN;
  let lastState: string | null = null;
  /** When the state last changed, or the renderer first drew: where the entry effect starts. */
  let stateSince = 0;
  /** What the paint ids mean. A change in it invalidates the table, and so the comparison. */
  let signature = '';
  /** Set when something other than the frame changed, so the next draw writes even if no cell did. */
  let dirty = true;

  function resize(): void {
    grid = subGrid(options.cols);
    scratch = createScratch(grid.size);
    paint = new Uint16Array(grid.size * grid.size);
  }

  function draw(frame: FrameSnapshot): void {
    last = frame;
    if (frame.state !== lastState) {
      lastState = frame.state;
      stateSince = frame.time;
    }

    const variant = asciiVariantOf(frame.variant);
    const pixelVariant = pixelVariantOf(variant);
    const look = liveLook(frame.ink, pixelVariant, ASCII_SHADES);
    const next = `${variant}|${liveLookKey(frame.ink, pixelVariant)}`;
    if (next !== signature) {
      signature = next;
      table.clear();
      previous = null;
      dirty = true;
    }

    // Motion is sampled on a clock, as in the pixel series: a frame at the
    // same simulated time as the last one is a repaint, not a tick, and
    // always goes through.
    const bucket = options.fps > 0 ? Math.floor(frame.time * options.fps) : Number.NaN;
    const sameBucket = !dirty && frame.time !== lastTime && bucket === lastBucket;
    lastTime = frame.time;
    if (sameBucket) return;
    lastBucket = bucket;

    const cells = composeCells(frame, look, variant, options, grid, table, scratch, paint);
    applyEffect(cells, options.effect, {
      time: frame.time,
      fps: options.fps,
      seed: context.seed,
      stateSince,
      charset: CHARSETS[options.charset],
      settled: frame.settled === true,
    });

    if (!dirty && previous && sameCells(cells, previous)) return;
    previous = cells;
    dirty = false;

    const { scene } = emitAscii(cells, table, {
      grid,
      variant,
      glow: options.glow,
      colour: variant === 'mono' ? () => ({ value: look.base(Math.floor(look.bands / 2)) }) : look.colour,
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
      const before = options.cols;
      options = readAsciiOptions(styleOptions);
      if (options.cols !== before) resize();
      table.clear();
      previous = null;
      dirty = true;
      // A new charset or fill changes the picture of the frame already on screen.
      if (last) draw(last);
    },

    destroy() {
      svg.remove();
    },
  };
}
