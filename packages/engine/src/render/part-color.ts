/**
 * A part's own colour (`ShapePart.color`) as paint.
 *
 * A palette colour is the swatch's ink, a light and a dark value, so a black
 * hat turns with the page as a black body does. Any other colour is used as
 * it is. Every part with its own colour is ringed in a line derived from it,
 * lighter for a dark colour and darker for a light one: a black hat on a
 * black cat, or a violet bow on a violet body, keeps its edge.
 */
import { ALL_COLOR_IDS, type ColorId, type PartColor } from '../core/types.js';
import { getInkColor } from '../core/palette.js';
import { mixHex } from './pixel/shade.js';

const isPalette = (color: PartColor): color is ColorId =>
  (ALL_COLOR_IDS as readonly string[]).includes(color);
const HEX = /^#[0-9a-f]{6}$/i;

/** A colour that is a value per page: two hexes, or `null` for a CSS colour the browser has to resolve. */
export function partColorPair(color: PartColor): { light: string; dark: string } | null {
  if (isPalette(color)) return { light: getInkColor(color, 'light'), dark: getInkColor(color, 'dark') };
  return HEX.test(color) ? { light: color, dark: color } : null;
}

/** How far the ring is mixed away from the part's own colour. */
const RIM_SHIFT = 0.45;

function luminance(hex: string): number {
  const channel = (i: number): number => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** The ring of a part of this colour: towards white for a dark colour, towards black for any other. */
export const rimHex = (hex: string): string =>
  mixHex(hex, luminance(hex) < 0.12 ? '#FFFFFF' : '#000000', RIM_SHIFT);

/** The ring of a part's colour as a value per page, or `null` where it is a CSS colour. */
export function partRimPair(color: PartColor): { light: string; dark: string } | null {
  const pair = partColorPair(color);
  return pair && { light: rimHex(pair.light), dark: rimHex(pair.dark) };
}

/** The part's colour in a live scene, which follows the page through `light-dark()`. */
export function partColorCss(color: PartColor): string {
  const pair = partColorPair(color);
  if (!pair) return color;
  return pair.light === pair.dark ? pair.light : `light-dark(${pair.light}, ${pair.dark})`;
}

/** The part's ring in a live scene. */
export function partRimCss(color: PartColor): string {
  const pair = partRimPair(color);
  if (!pair) return `color-mix(in oklab, ${color}, #000 ${RIM_SHIFT * 100}%)`;
  return pair.light === pair.dark ? pair.light : `light-dark(${pair.light}, ${pair.dark})`;
}

/** A part's paints as a renderer resolved them. */
export interface PartColorPaint {
  fill: string;
  rim: string;
}

/** A live scene's part paints. */
export const livePartPaint = (color: PartColor): PartColorPaint => ({
  fill: partColorCss(color),
  rim: partRimCss(color),
});
