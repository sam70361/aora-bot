import { VECTOR_VARIANTS } from '../core/options.js';
import { createVectorRenderer } from '../render/vector/live.js';
import { defineMedium, type MediumDefinition } from '../render/vector/media.js';
import { renderVectorStatic } from '../render/vector/static.js';
import { addVariant, defineStyle } from './registry.js';

/**
 * Add a drawing medium to the vector series under `id`, or replace one a
 * host defined before: drawn and accepted by id everywhere a variant is
 * (`variant: id`), and left out of `variants` until a host lists it.
 * `reads` are the series' parameters it reads (`paramsForVariant`).
 *
 * A medium is a painter over each piece's outline (`MediumDefinition.paint`)
 * and draws with the core's own geometry through `ctx.kit`, so it needs no
 * import of the engine beyond this call. The built-in media cannot be
 * replaced.
 */
export function defineVectorMedium(
  id: string,
  definition: MediumDefinition,
  reads: readonly string[] = [],
): void {
  defineMedium(id, definition);
  addVariant('vector', id, reads);
}

/**
 * The default series: smooth SVG paths, with the body filled, outlined,
 * glassy, stuck on as a sticker, cut out of paper, rounded off as a soft toy
 * or printed in two inks — or drawn by hand in pencil, marker, crayon,
 * watercolour, neon or chalk, or made of paper, crumpled as origami or pressed
 * up as relief.
 * Everything else in the engine was written
 * against this series, so it is the one every other is measured against.
 *
 * Parameters are shared by the whole series and each variant reads only its
 * own; `params[key].variants` says which (see `paramsForVariant`).
 */
export const vectorStyle = defineStyle({
  id: 'vector',
  label: 'Vector',
  variants: VECTOR_VARIANTS,
  defaultVariant: 'solid',
  defaults: {
    /**
     * Stroke width of the outlined variants, in shape-space units. Constant
     * in shape space rather than in pixels, so the line scales with the
     * character: a stroke pinned to device pixels looks spindly on a large
     * character and swamps a small one. Glass, pencil, marker, neon and chalk
     * draw their line at a fixed share of it, the width their tool has.
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
    /**
     * How far a hand-drawn line strays from the outline, in shape units, at
     * most: pencil's double line, marker's outline and pale pass, crayon's
     * ragged edge, watercolour's wash and chalk's line. A small piece such as
     * an ear takes a smaller share, so the wobble never swallows it.
     */
    wobble: 4,
    /**
     * Strength of the paper grain in pencil, crayon, watercolour and chalk, as
     * a share of each medium's own: 0 is a clean fill, 2 twice as rough. The
     * grain is in shape units, so it melts into the tone at avatar sizes.
     */
    grain: 1,
    /** Whether pencil shades the side away from the light, and chalk fills the body, with hatching. */
    hatching: true,
    /** Radius of the neon glow, in shape units; 0 leaves the bare tube. */
    neonGlow: 8,
  },
  params: {
    strokeWidth: {
      type: 'number',
      min: 4,
      max: 28,
      step: 1,
      label: 'Line width',
      variants: ['outline', 'glass', 'pencil', 'marker', 'neon', 'chalk'],
    },
    stickerWidth: {
      type: 'number',
      min: 4,
      max: 20,
      step: 1,
      label: 'Sticker edge',
      variants: ['sticker'],
    },
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
    wobble: {
      type: 'number',
      min: 0,
      max: 8,
      step: 1,
      label: 'Hand wobble',
      variants: ['pencil', 'marker', 'crayon', 'watercolor', 'chalk'],
    },
    grain: {
      type: 'number',
      min: 0,
      max: 2,
      step: 0.1,
      label: 'Paper grain',
      variants: ['pencil', 'crayon', 'watercolor', 'chalk'],
    },
    hatching: { type: 'boolean', label: 'Hatching', variants: ['pencil', 'chalk'] },
    neonGlow: { type: 'number', min: 0, max: 20, step: 1, label: 'Neon glow', variants: ['neon'] },
  },
  createRenderer: createVectorRenderer,
  renderStatic: renderVectorStatic,
});
