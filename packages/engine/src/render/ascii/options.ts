import type { PixelVariant } from '../pixel/rasterise.js';

export const ASCII_VARIANT_IDS = ['ansi', 'mono', 'crt'] as const;
export const ASCII_CHARSET_IDS = ['ascii', 'block', 'braille'] as const;
export const ASCII_FILL_IDS = ['shade', 'solid', 'hollow'] as const;
export const ASCII_EFFECT_IDS = ['none', 'decode', 'shimmer', 'glitch'] as const;

export type AsciiVariant = (typeof ASCII_VARIANT_IDS)[number];
export type AsciiCharset = (typeof ASCII_CHARSET_IDS)[number];
export type AsciiFill = (typeof ASCII_FILL_IDS)[number];
export type AsciiEffect = (typeof ASCII_EFFECT_IDS)[number];

/** The ascii style's parameters, as `resolveStyleOptions` hands them over. */
export interface AsciiOptions {
  /** Character columns across shape space. The sub-grid under them is twice as wide. */
  cols: number;
  charset: AsciiCharset;
  fill: AsciiFill;
  effect: AsciiEffect;
  fps: number;
  glow: boolean;
}

export const ASCII_DEFAULTS: Readonly<AsciiOptions> = {
  cols: 28,
  charset: 'ascii',
  fill: 'shade',
  effect: 'decode',
  fps: 12,
  glow: true,
};

/**
 * Tone steps the pixel rasteriser is asked for. The glyph carries the body's
 * lightness, so the paint only needs the few tones that tell an edge from the
 * inside.
 */
export const ASCII_SHADES = 3;

function member<T extends string>(list: readonly T[], value: unknown, fallback: T): T {
  return typeof value === 'string' && (list as readonly string[]).includes(value) ? (value as T) : fallback;
}

/**
 * The parameters from a resolved options bag. The registry has already
 * clamped and defaulted them, but a renderer can be handed any record by
 * someone calling its factory directly, so a missing or foreign value falls
 * back too.
 */
export function readAsciiOptions(raw: Record<string, unknown>): AsciiOptions {
  const num = (key: 'cols' | 'fps'): number => {
    const v = raw[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : ASCII_DEFAULTS[key];
  };
  const glow = raw.glow;
  return {
    cols: Math.max(1, Math.round(num('cols'))),
    charset: member(ASCII_CHARSET_IDS, raw.charset, ASCII_DEFAULTS.charset),
    fill: member(ASCII_FILL_IDS, raw.fill, ASCII_DEFAULTS.fill),
    effect: member(ASCII_EFFECT_IDS, raw.effect, ASCII_DEFAULTS.effect),
    fps: num('fps'),
    glow: typeof glow === 'boolean' ? glow : ASCII_DEFAULTS.glow,
  };
}

/** A snapshot's variant as this style understands it; another series' names fall back to `ansi`. */
export function asciiVariantOf(variant: string): AsciiVariant {
  return member(ASCII_VARIANT_IDS, variant, 'ansi');
}

/** The pixel variant the picture is rasterised in: the LED panel's lit-dot rules for `crt`, the plain ones otherwise. */
export function pixelVariantOf(variant: AsciiVariant): PixelVariant {
  return variant === 'crt' ? 'dot' : 'crisp';
}
