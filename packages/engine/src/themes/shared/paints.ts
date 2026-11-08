/**
 * Colours a theme skin derives from the ink, shared so two skins that need
 * the same relation spell it once. Each is CSS relative colour over the ink
 * as the scene resolves it (a token, a colour), so it follows the page and
 * works for every palette colour; a gradient ink stands in with its first stop.
 */

/** A pale colour across the hue wheel from `solid`, at lightness `l` and chroma `c`. */
export const across = (solid: string, l = 0.88, c = 0.1): string =>
  solid.startsWith('url(') ? '#fff' : `oklch(from ${solid} ${l} ${c} calc(h + 180))`;

/**
 * A thread or a line that reads on `solid`: near-white on a dark colour and
 * a deep shade of it on a light one, the switch falling at mid lightness.
 */
export const contrastOn = (solid: string, chroma = 0.4): string =>
  solid.startsWith('url(')
    ? '#fff'
    : `oklch(from ${solid} clamp(0.3, (0.62 - l) * 100, 0.96) calc(c * ${chroma}) h)`;

/** A deep shade of `solid`, at `share` of its lightness: a cut line, an ink rim. */
export const deepOf = (solid: string, share = 0.5): string =>
  solid.startsWith('url(') ? '#000' : `oklch(from ${solid} calc(l * ${share}) calc(c * 0.9 + 0.03) h)`;

/** `solid` washed towards white by `share` percent: a pastel of the ink. */
export const pastel = (solid: string, share: number): string =>
  solid.startsWith('url(') ? solid : `color-mix(in oklab, ${solid}, #fff ${share}%)`;
