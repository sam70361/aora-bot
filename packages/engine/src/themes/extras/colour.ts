/**
 * Colour helpers the extras need and the core does not: a hex colour in
 * OKLCH, and the opt-in face ink (`MediumDefinition.faceInk`).
 */

/**
 * A skin's own face ink (`MediumDefinition.faceInk`), as hex colours. `light`
 * takes the place of the face wherever the face rule paints it light (on a
 * dark body), `dark` wherever it paints it dark (on a light one). With
 * `split`, an OKLCH lightness, the skin decides instead of the rule: an ink
 * at least that light wears `dark`, a darker one `light` (both are then
 * needed). Worked out in CSS from the ink or the face colour, so it holds in
 * live and static output alike.
 */
export interface FaceInk {
  light?: string;
  dark?: string;
  split?: number;
}

const toLinear = (v: number): number => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** A hex colour (`#rgb` or `#rrggbb`) in OKLCH: lightness 0 to 1, chroma, hue in degrees. */
export function oklch(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => toLinear(parseInt(full.slice(i, i + 2), 16)));
  const l = Math.cbrt(0.4122214708 * r! + 0.5363325363 * g! + 0.0514459929 * b!);
  const m = Math.cbrt(0.2119034982 * r! + 0.6806995451 * g! + 0.1073969566 * b!);
  const s = Math.cbrt(0.0883024619 * r! + 0.2817188376 * g! + 0.6299787005 * b!);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const hue = (Math.atan2(B, A) * 180) / Math.PI;
  return [L, Math.hypot(A, B), hue < 0 ? hue + 360 : hue];
}

const n3 = (n: number): number => Math.round(n * 1000) / 1000;

/** A colour that is `to` where `step` (a CSS number expression, 0 or 1) is 1, and `from`'s own channels elsewhere. */
function toward(from: string, to: string, step: string): string {
  const [l, c, h] = oklch(to);
  return `oklch(from ${from} calc(l + (${n3(l)} - l) * ${step}) calc(c + (${n3(c)} - c) * ${step}) calc(h + (${n3(h)} - h) * ${step}))`;
}

/** Between two colours by `step` on `origin`'s channels: `a` at 0, `b` at 1. */
function between(origin: string, a: string, b: string, step: string): string {
  const [la, ca, ha] = oklch(a);
  const [lb, cb, hb] = oklch(b);
  const dh = ((((hb - ha) % 360) + 540) % 360) - 180;
  const at = (x: number, d: number) => `calc(${n3(x)} + ${n3(d)} * ${step})`;
  return `oklch(from ${origin} ${at(la, lb - la)} ${at(ca, cb - ca)} ${at(ha, dh)})`;
}

/** The face colour a skin's `own` ink paints over `face` (what the rule chose) on a body of `ink`. */
export function faceInk(face: string, ink: string, own: FaceInk): string {
  if (own.split !== undefined && own.light && own.dark && !ink.startsWith('url(')) {
    return between(ink, own.dark, own.light, `clamp(0, (${n3(own.split)} - l) * 1000, 1)`);
  }
  let out = face;
  if (own.light) out = toward(out, own.light, 'clamp(0, (l - 0.6) * 1000, 1)');
  if (own.dark) out = toward(out, own.dark, 'clamp(0, (0.6 - l) * 1000, 1)');
  return out;
}
