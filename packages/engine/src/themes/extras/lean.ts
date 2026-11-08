/**
 * The vivid mood accent (`MediumDefinition.moodAccent`): how far a skin's
 * accent leans into each mood beyond the core's own `MOOD_LEAN`.
 */
import type { StateMood } from '../../motion/mood.js';
import { oklch } from './colour.js';
import { K } from './kit.js';

/** An OKLCH lightness band, 0 to 1: one for both pages, or one for each. */
export type LightnessBand =
  | readonly [number, number]
  | { readonly light: readonly [number, number]; readonly dark: readonly [number, number] };

/** How one mood leans a vivid accent, in place of `MOOD_LEAN` and the accent's own settings. */
export interface MoodLean {
  /** The colour mixed in. A `calm` entry with a tint leans the calm accent too. */
  tint?: string;
  /** How much of it, in percent. */
  share?: number;
  /** The least OKLCH chroma the leaned accent keeps. */
  chroma?: number;
  lightness?: LightnessBand;
  /** The most the lean may lighten the accent, in OKLCH lightness: a dark accent warms and stays dark. */
  lift?: number;
}

/**
 * How vivid a medium's mood accent is (`MediumDefinition.moodAccent`). The
 * accent stays the medium's own colour, derived from the ink, leaned into
 * each mood's tint: `share` scales every lean, `chroma` is the least chroma
 * the result keeps (vivid sticker colours rather than pastels), and
 * `lightness` holds it in a band so it keeps its contrast with the page; a
 * band per page is written as `light-dark()`. `lift` caps how much lighter
 * a lean may make it (the tint is mixed in at the accent's own lightness, or
 * at most `lift` above it). `moods` overrides any of it for one mood, the
 * tint included.
 */
export interface MoodAccent {
  share?: number;
  chroma?: number;
  lightness?: LightnessBand;
  lift?: number;
  moods?: Partial<Record<StateMood, MoodLean>>;
}

const n3 = (n: number): number => Math.round(n * 1000) / 1000;

/** `color` mixed with `into`, unless it is a gradient, which cannot be mixed and is used as it is. */
export const mixPaint = (color: string, into: string, percent: number): string =>
  color.startsWith('url(') ? color : `color-mix(in oklab, ${color}, ${into} ${percent}%)`;

/** The least chroma a lean leaves: the tint's own share of colour, so an accent opposite the tint keeps some. */
const leanChroma = (tint: string, share: number): number =>
  Math.round(K.chroma(tint) * Math.min(100, share) * 10) / 1000;

/** A relative OKLCH colour from `base`, held in `band` and above `floor` chroma. */
function held(base: string, floor: number, band: readonly [number, number] | undefined): string {
  const l = band ? `clamp(${n3(band[0])}, l, ${n3(band[1])})` : 'l';
  return `oklch(from ${base} ${l} max(c, ${n3(floor)}) h / alpha)`;
}

const leans = new Map<string, string>();

/** A colour leaned into a mood: `MOOD_LEAN`, made as vivid as `vivid` asks. A gradient is left as it is. */
export function leanInto(color: string, mood: StateMood, vivid?: MoodAccent): string {
  if (color.startsWith('url(')) return color;
  const own = vivid?.moods?.[mood];
  const base = K.moodLean[mood];
  const tint = own?.tint ?? base?.tint;
  if (!tint) return color;
  const key = vivid ? `${mood}|${color}|${JSON.stringify(vivid)}` : `${mood}|${color}`;
  let out = leans.get(key);
  if (out !== undefined) return out;
  const share = Math.min(100, own?.share ?? (base?.share ?? 40) * (vivid?.share ?? 1));
  const floor = Math.max(leanChroma(tint, share), own?.chroma ?? vivid?.chroma ?? 0);
  const band = own?.lightness ?? vivid?.lightness;
  const lift = own?.lift ?? vivid?.lift;
  // Mixed in OKLab, two colours of one lightness keep it: the tint at the accent's own lightness, or a little above.
  const [tl, tc, th] = lift === undefined ? [0, 0, 0] : oklch(tint);
  const into =
    lift === undefined
      ? tint
      : `oklch(from ${color} min(${n3(tl)}, calc(l + ${n3(lift)})) ${n3(tc)} ${n3(th)})`;
  const mixed = mixPaint(color, into, Math.round(share));
  out =
    band && !Array.isArray(band)
      ? `light-dark(${held(mixed, floor, (band as { light: readonly [number, number] }).light)}, ${held(mixed, floor, (band as { dark: readonly [number, number] }).dark)})`
      : held(mixed, floor, band as readonly [number, number] | undefined);
  if (leans.size > 512) leans.clear();
  leans.set(key, out);
  return out;
}
