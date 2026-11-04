import { createPixelRenderer } from '../render/pixel/live.js';
import { PIXEL_DEFAULTS } from '../render/pixel/options.js';
import { renderPixelStatic } from '../render/pixel/static.js';
import { defineStyle } from './registry.js';

/**
 * The character drawn on a grid of big pixels.
 *
 * The body, face, belts, dials and confetti are all rasterised onto one
 * lattice laid over shape space, so `grid` is a property of the character and
 * not of the size it is drawn at: a 16px chip and a 240px hero are the same
 * sprite. `crisp` is solid squares, `block` leaves a seam between them and
 * `dot` turns the picture into a panel of LEDs.
 */
export const pixelStyle = defineStyle({
  id: 'pixel',
  label: 'Pixel',
  variants: ['crisp', 'dot', 'block'],
  defaultVariant: 'crisp',
  defaults: { ...PIXEL_DEFAULTS },
  params: {
    grid: { type: 'number', min: 8, max: 64, step: 1, label: 'Grid' },
    gap: { type: 'number', min: 0, max: 0.5, step: 0.02, label: 'Gap', variants: ['block', 'dot'] },
    shades: { type: 'number', min: 1, max: 5, step: 1, label: 'Shades' },
    fps: { type: 'number', min: 0, max: 60, step: 1, label: 'Motion fps' },
    outline: { type: 'boolean', label: 'Outline', variants: ['crisp', 'block'] },
    glow: { type: 'boolean', label: 'Glow', variants: ['dot'] },
  },
  createRenderer: createPixelRenderer,
  renderStatic: renderPixelStatic,
});
