import { createVectorRenderer } from '../render/vector/live.js';
import { renderVectorStatic } from '../render/vector/static.js';
import { defineStyle } from './registry.js';

/**
 * The default series: smooth SVG paths, with the body filled, outlined,
 * glassy, stuck on as a sticker, cut out of paper, rounded off as a soft toy
 * or printed in two inks. Everything else in the engine was written against
 * this series, so it is the one every other is measured against.
 *
 * Parameters are shared by the whole series and each variant reads only its
 * own; `params[key].variants` says which (see `paramsForVariant`).
 */
export const vectorStyle = defineStyle({
  id: 'vector',
  label: 'Vector',
  variants: ['solid', 'outline', 'glass', 'sticker', 'paper', 'soft', 'riso'],
  defaultVariant: 'solid',
  defaults: {
    /**
     * Stroke width of the outlined variants, in shape-space units. Constant
     * in shape space rather than in pixels, so the line scales with the
     * character: a stroke pinned to device pixels looks spindly on a large
     * character and swamps a small one.
     */
    strokeWidth: 10,
    /**
     * How far the sticker's white border reaches beyond the body. The viewBox
     * leaves 24 units of margin round the shape and the shadow needs some of
     * it, so the range stops short of that.
     */
    stickerWidth: 12,
    /** Whether the sticker casts a small soft shadow. */
    stickerShadow: true,
    /** Distance of the paper variant's hard shadow from the body, in shape units. */
    paperOffset: 9,
    /** Direction of that shadow in degrees, clockwise from +x: 90 is straight down. */
    paperAngle: 55,
    /** Tilt of the paper figure, in degrees: a sheet laid down by hand is never quite square. */
    paperTilt: -3,
    /** Whether the soft variant stands on a shadow on the ground. */
    softShadow: true,
    /** Whether the soft variant carries a small gloss highlight. Off by default: it sits where a high face puts its eye. */
    softGloss: false,
    /** Distance between the riso variant's two inks, in shape units. */
    risoOffset: 10,
    /** Whether the riso variant is screened with halftone dots. */
    risoHalftone: true,
  },
  params: {
    strokeWidth: {
      type: 'number',
      min: 4,
      max: 28,
      step: 1,
      label: 'Line width',
      variants: ['outline', 'glass'],
    },
    stickerWidth: { type: 'number', min: 4, max: 20, step: 1, label: 'Sticker edge', variants: ['sticker'] },
    stickerShadow: { type: 'boolean', label: 'Sticker shadow', variants: ['sticker'] },
    paperOffset: {
      type: 'number',
      min: 0,
      max: 20,
      step: 1,
      label: 'Paper shadow offset',
      variants: ['paper'],
    },
    paperAngle: {
      type: 'number',
      min: 0,
      max: 360,
      step: 5,
      label: 'Paper shadow angle',
      variants: ['paper'],
    },
    paperTilt: { type: 'number', min: -8, max: 8, step: 1, label: 'Paper tilt', variants: ['paper'] },
    softShadow: { type: 'boolean', label: 'Soft ground shadow', variants: ['soft'] },
    softGloss: { type: 'boolean', label: 'Soft gloss', variants: ['soft'] },
    risoOffset: {
      type: 'number',
      min: 0,
      max: 20,
      step: 1,
      label: 'Riso misregistration',
      variants: ['riso'],
    },
    risoHalftone: { type: 'boolean', label: 'Riso halftone', variants: ['riso'] },
  },
  createRenderer: createVectorRenderer,
  renderStatic: renderVectorStatic,
});
