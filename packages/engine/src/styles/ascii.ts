import { createAsciiRenderer } from '../render/ascii/live.js';
import { ASCII_DEFAULTS } from '../render/ascii/options.js';
import { renderAsciiStatic } from '../render/ascii/static.js';
import { defineStyle } from './registry.js';

/**
 * The character drawn in text: `.:-=+*#` for its body, `O` for its eyes.
 *
 * The body, face, belts, dials and confetti are rasterised onto a fine grid
 * like the pixel series', then every block of 2 x 4 sub-cells is written with
 * the one glyph that looks most like it, so the 1:2 shape of a monospace cell
 * costs the picture no detail. `ansi` colours each glyph as the pixel series
 * colours its cells, `mono` writes it all in one ink with the face cut out of
 * the body, and `crt` sets it glowing on a dark screen. The `charset` picks
 * plain ASCII, quadrant blocks or braille dots; `effect` is what the glyphs
 * do when a state changes. The same picture is available as plain text from
 * `renderAsciiText`.
 */
export const asciiStyle = defineStyle({
  id: 'ascii',
  label: 'ASCII',
  variants: ['ansi', 'mono', 'crt'],
  defaultVariant: 'ansi',
  defaults: { ...ASCII_DEFAULTS },
  params: {
    cols: { type: 'number', min: 12, max: 64, step: 1, label: 'Columns' },
    charset: { type: 'enum', options: ['ascii', 'block', 'braille'], label: 'Charset' },
    fill: { type: 'enum', options: ['shade', 'solid', 'hollow'], label: 'Fill' },
    effect: { type: 'enum', options: ['none', 'decode', 'shimmer', 'glitch'], label: 'Effect' },
    fps: { type: 'number', min: 0, max: 60, step: 1, label: 'Motion fps' },
    glow: { type: 'boolean', label: 'Glow', variants: ['crt'] },
  },
  createRenderer: createAsciiRenderer,
  renderStatic: renderAsciiStatic,
});
