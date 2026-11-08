/**
 * Light and dark steps for the body.
 *
 * Shading is a classification of cells, not a colour: each body cell is one
 * of a few tones, signed numbers where negative mixes towards black and
 * positive towards white. The renderer turns a tone and a base colour into
 * paint — a CSS `color-mix()` for a live character, whose ink is a `var()` the
 * browser resolves, and a precomputed hex for static output, which has to
 * survive tools that do not know `color-mix()`.
 */
import { clamp01 } from '../../math/easing.js';

/** How strongly each tone mixes, by the number of shades asked for. */
export interface ToneLadder {
  edge: number;
  shadow: number;
  light: number;
  glint: number;
}

const LADDERS: readonly ToneLadder[] = [
  { edge: 0, shadow: 0, light: 0, glint: 0 },
  { edge: -0.3, shadow: 0, light: 0, glint: 0 },
  { edge: -0.3, shadow: 0, light: 0.3, glint: 0.3 },
  { edge: -0.34, shadow: -0.15, light: 0.3, glint: 0.3 },
  { edge: -0.38, shadow: -0.18, light: 0.26, glint: 0.5 },
];

/** Tones for `shades` steps, 1 (flat) to 5. */
export function ladderFor(shades: number): ToneLadder {
  return LADDERS[Math.min(LADDERS.length, Math.max(1, Math.round(shades))) - 1]!;
}

export const CELL_BODY = 1;
export const CELL_EDGE = 2;
export const CELL_LIGHT = 3;
export const CELL_GLINT = 4;
export const CELL_SHADOW = 5;

/**
 * Classify every body cell: on the edge, just inside the upper-left edge
 * (lit), at the corner where two lit edges meet, just inside the lower-right
 * edge (shadow), or plain body. The sun is up and to the left.
 */
export function classify(mask: Uint8Array, size: number, out: Uint8Array): void {
  let sum = 0;
  let count = 0;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (mask[row * size + col]) {
        sum += col + row;
        count++;
      }
    }
  }
  const middle = count ? sum / count : 0;
  const at = (col: number, row: number): number =>
    col < 0 || row < 0 || col >= size || row >= size ? 0 : mask[row * size + col]!;
  const edge = (col: number, row: number): boolean =>
    at(col, row) === 1 && !(at(col - 1, row) && at(col + 1, row) && at(col, row - 1) && at(col, row + 1));

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const i = row * size + col;
      if (!mask[i]) {
        out[i] = 0;
        continue;
      }
      if (edge(col, row)) {
        out[i] = CELL_EDGE;
        continue;
      }
      const upper = col + row < middle;
      const n = edge(col, row - 1);
      const w = edge(col - 1, row);
      if (upper && (n || w)) out[i] = n && w ? CELL_GLINT : CELL_LIGHT;
      else if (!upper && (edge(col, row + 1) || edge(col + 1, row))) out[i] = CELL_SHADOW;
      else out[i] = CELL_BODY;
    }
  }
}

type Rgb = readonly [number, number, number];
type Lab = readonly [number, number, number];

function parseHex(hex: string): Rgb {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6);
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toLinear = (v: number): number => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number): number => {
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(clamp01(s) * 255);
};

function toOklab([r, g, b]: Rgb): Lab {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, a, b]: Lab): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const hex = ([r, g, b]: Rgb): string =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();

/** A hex colour's OKLCH chroma. */
export function chromaHex(color: string): number {
  const [, a, b] = toOklab(parseHex(color));
  return Math.hypot(a, b);
}

/** `a` mixed with `b` by `t` in OKLab: what `color-mix(in oklab, a, b t)` computes. */
export function mixHex(a: string, b: string, t: number): string {
  const x = toOklab(parseHex(a));
  const y = toOklab(parseHex(b));
  return hex(fromOklab([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]));
}

/** A hex colour moved `tone` of the way towards black (negative) or white (positive). */
export function shadeHex(base: string, tone: number): string {
  if (tone === 0) return base.toUpperCase();
  return mixHex(base, tone < 0 ? '#000000' : '#FFFFFF', Math.abs(tone));
}

/** The CSS for the same operation on a colour the browser has to resolve itself. */
export function shadeCss(base: string, tone: number): string {
  if (tone === 0) return base;
  const pct = Math.round(Math.abs(tone) * 100);
  return `color-mix(in oklab, ${base}, ${tone < 0 ? 'black' : 'white'} ${pct}%)`;
}

/** The CSS for a point `t` of the way from `from` to `to`. */
export function blendCss(from: string, to: string, t: number): string {
  const pct = Math.round(t * 100);
  if (pct <= 0) return from;
  if (pct >= 100) return to;
  return `color-mix(in oklab, ${from}, ${to} ${pct}%)`;
}
