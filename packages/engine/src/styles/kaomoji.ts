import { KAOMOJI_DEFAULTS } from '../render/kaomoji/build.js';
import { createKaomojiRenderer } from '../render/kaomoji/live.js';
import { renderKaomojiStatic } from '../render/kaomoji/static.js';
import { defineStyle } from './registry.js';

/**
 * The character written as text: `(・ω・)`, `☁(^▽^) ♪`.
 *
 * The shape chooses the brackets, the state the face and the mark after them.
 * It carries no body, so it is the lightest series and the one that reads in
 * a line of prose. `plain` is the text alone; `bubble` sets it on a pill
 * tinted with the ink.
 */
export const kaomojiStyle = defineStyle({
  id: 'kaomoji',
  label: 'Kaomoji',
  variants: ['plain', 'bubble'],
  defaultVariant: 'plain',
  defaults: { ...KAOMOJI_DEFAULTS },
  params: {
    weight: { type: 'number', min: 300, max: 800, step: 100, label: 'Weight' },
    tail: { type: 'boolean', label: 'Mood mark' },
  },
  createRenderer: createKaomojiRenderer,
  renderStatic: renderKaomojiStatic,
});
