import { FACE_INK, PAGE_TOKEN, SOFT_FACE_INK } from '../../core/palette.js';
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

/** The eye cut-out colour, matching `render/vector/build.ts`'s `EYE_TOKEN`. */
export const EYE_TOKEN = PAGE_TOKEN;

/** The cute face's colour, matching `render/vector/build.ts`'s `FACE_TOKEN`. */
export const FACE_TOKEN = `var(--aora-face, ${PAGE_TOKEN})`;

/** A drawn face's pupils, brows and body-drawn light, matching the tokens of the same names in `render/vector/build.ts`. */
export const PUPIL_TOKEN = `var(--aora-face-pupil, ${SOFT_FACE_INK})`;
export const FEATURE_TOKEN = `var(--aora-face-soft, ${SOFT_FACE_INK})`;
export const GLINT_TOKEN = `var(--aora-face-glint, ${FACE_INK})`;

/** The default ink, matching `render/vector/build.ts`'s `INK_TOKEN`. */
export const INK_TOKEN = 'var(--aora-fg, currentColor)';

/** What state effects are drawn in, matching `render/vector/build.ts`'s `FX_TOKEN`. */
export const FX_TOKEN = `var(--aora-fx, ${INK_TOKEN})`;

/** What an eye is on a dark LED panel: lit. */
export const LED_EYE = '#FFFFFF';

/**
 * An eye on the LED panel in a live scene, where the panel resolves the
 * tokens as a dark page does: the face rule's face there (`--aora-face`), lit
 * on most inks and unlit on a light one, else unlit, the plate's own colour.
 */
export const LED_EYE_TOKEN = 'var(--aora-face, #17181D)';

/** A cut-out face's eyes, matching `render/vector/build.ts`'s `CUT_TOKEN`. */
export const CUT_TOKEN = `var(--aora-eye, ${EYE_TOKEN})`;

/** The ink as a line on the page, matching `render/vector/build.ts`'s `LINE_TOKEN`: what lights the LED panel. */
export const LINE_TOKEN = `var(--aora-ink-line, ${INK_TOKEN})`;
