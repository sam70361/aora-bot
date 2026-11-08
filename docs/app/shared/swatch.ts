import { getInkColorCss, getInkVars, getSwatch, type ColorId } from '@aora-bot/react';
import type { CSSProperties } from 'react';

/**
 * The OKLCH lightness text in a colour keeps to on each page: no lighter than
 * this on a light page, no darker on a dark one, about 4.5:1 against either
 * paper (`--site-paper`) whatever the hue.
 */
const TEXT_LIGHTNESS = { light: 0.55, dark: 0.72 } as const;

/**
 * A colour as the site paints with it, all four always written so an inner
 * element never inherits another colour's: `--site-swatch` the body as it is
 * on this page, for fills and tints; `--site-swatch-line` the ink as a line,
 * which still reads on the page (`--aora-ink-line`), for rings and controls;
 * `--site-swatch-text` the ink at the lightness text reads at on this page,
 * for words; `--site-swatch-edge` the hairline a fill takes where it all but
 * matches the page (`--aora-rim`).
 */
export function swatchVars(color: ColorId): CSSProperties {
  const ink = getInkColorCss(color);
  const vars = getInkVars(color);
  const { light, dark } = getSwatch(color).ink;
  return {
    '--site-swatch': ink,
    '--site-swatch-line': vars['--aora-ink-line'] ?? ink,
    '--site-swatch-text': `light-dark(oklch(from ${light} min(l, ${TEXT_LIGHTNESS.light}) c h), oklch(from ${dark} max(l, ${TEXT_LIGHTNESS.dark}) c h))`,
    '--site-swatch-edge': vars['--aora-rim'] ?? 'transparent',
  } as CSSProperties;
}
