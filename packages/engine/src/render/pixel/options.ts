import { FACE_INK } from '../../core/palette.js';
import { PLATE_COLOUR } from './emit.js';
import type { PixelVariant } from './rasterise.js';

/** The pixel style's parameters, as `resolveStyleOptions` hands them over. */
export interface PixelOptions {
  grid: number;
  gap: number;
  shades: number;
  fps: number;
  outline: boolean;
  glow: boolean;
}

export const PIXEL_DEFAULTS: Readonly<PixelOptions> = {
  grid: 24,
  gap: 0.16,
  shades: 3,
  fps: 12,
  outline: true,
  glow: true,
};

/**
 * The parameters from a resolved options bag. The registry has already
 * clamped and defaulted them, but a renderer can be handed any record by
 * someone calling its factory directly, so a missing key falls back too.
 */
export function readOptions(raw: Record<string, unknown>): PixelOptions {
  const num = (key: 'grid' | 'gap' | 'shades' | 'fps'): number => {
    const v = raw[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : PIXEL_DEFAULTS[key];
  };
  const flag = (key: 'outline' | 'glow'): boolean => {
    const v = raw[key];
    return typeof v === 'boolean' ? v : PIXEL_DEFAULTS[key];
  };
  return {
    grid: num('grid'),
    gap: num('gap'),
    shades: num('shades'),
    fps: num('fps'),
    outline: flag('outline'),
    glow: flag('glow'),
  };
}

/** A snapshot's variant as this style understands it; another series' names fall back to `crisp`. */
export function variantOf(variant: string): PixelVariant {
  return variant === 'dot' || variant === 'block' ? variant : 'crisp';
}

/** What an eye is on a dark LED panel: lit. */
export const LED_EYE = FACE_INK;

/**
 * An eye on the LED panel in a live scene, where the panel resolves the
 * tokens as a dark page does: the face rule's face there (`--aora-face`), lit
 * on most inks and unlit on a light one, else unlit, the plate's own colour.
 */
export const LED_EYE_TOKEN = `var(--aora-face, ${PLATE_COLOUR})`;
