import { HAIR_SHADE_TOKEN } from '../../core/palette.js';
import { VIEWBOX_STR } from '../../core/types.js';
import { fnv1a32 } from '../../math/hash.js';
import type { FrameSnapshot } from '../../sim/snapshot.js';
import { createSvgElement, syncElement } from '../dom.js';
import { partColorCss, partRimCss } from '../part-color.js';
import type { LiveRenderer, LiveRendererContext } from '../renderer.js';
import { emit } from './emit.js';
import { pixelGrid, type PixelGrid } from './grid.js';
import {
  CUT_TOKEN,
  FACE_TOKEN,
  FX_TOKEN,
  INK_TOKEN,
  LED_EYE_TOKEN,
  LINE_TOKEN,
  readOptions,
  variantOf,
} from './options.js';
import { createPaintTable, type PaintDef, type Tint } from './paints.js';
import { HAIR_MIX } from './parts.js';
import { createScratch, rasterise, type RasterSettings, type Scratch } from './rasterise.js';
import { blendCss, shadeCss } from './shade.js';

/** Keeps ids unique across characters that share a seed. */
let idSerial = 0;

/** Ink angle used when a gradient does not say. */
const DEFAULT_ANGLE = 135;

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
    const ink = frame.ink;
    const gradient = ink && 'from' in ink ? (ink.angle ?? DEFAULT_ANGLE) : null;
    const eye: Tint = { kind: 'css', value: variant === 'dot' ? LED_EYE_TOKEN : CUT_TOKEN };
    const face: Tint = { kind: 'css', value: variant === 'dot' ? LED_EYE_TOKEN : FACE_TOKEN };
    const inkKey = !ink ? '' : 'flat' in ink ? `f${ink.flat}` : `g${ink.from}|${ink.to}`;
    const next = `${variant}|${inkKey}|${gradient}`;
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
      gradient,
      eye,
      face,
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

    const bands = gradient === null ? 1 : Math.max(1, Math.round(options.shades));
    const base = (band: number): string => {
      if (!ink) return variant === 'dot' ? LINE_TOKEN : INK_TOKEN;
      if ('flat' in ink) return ink.flat;
      return blendCss(ink.from, ink.to, (band + 0.5) / bands);
    };
    const colour = (def: PaintDef): { value: string } => {
      const tint = def.tint;
      switch (tint.kind) {
        case 'css':
          return { value: tint.value };
        case 'hair':
          return { value: `color-mix(in oklab, ${base(tint.band)}, ${HAIR_SHADE_TOKEN} ${HAIR_MIX * 100}%)` };
        case 'fx':
          return { value: ink ? base(tint.band) : FX_TOKEN };
        case 'part':
          return { value: shadeCss(tint.rim ? partRimCss(tint.color) : partColorCss(tint.color), tint.tone) };
        default:
          return { value: shadeCss(base(tint.band), tint.tone) };
      }
    };

    const { scene } = emit(paint, table, {
      grid,
      variant,
      gap: options.gap,
      glow: options.glow,
      colour,
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
