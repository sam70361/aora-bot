/**
 * How a paint id becomes a colour, for the series that rasterise with the pixel
 * grid: `pixel` itself and `ascii`.
 *
 * A live scene writes CSS the browser resolves against the page (`var()`,
 * `color-mix()`); static output resolves everything to hex and names the colours
 * that change with the colour scheme. The two resolvers read the same tints, so
 * a series that rasterises once can be dressed either way.
 */
import { getLeafColor } from '../../core/leaf.js';
import type { InkPaint } from '../../core/options.js';
import {
  effectInks,
  eyeToken,
  FACE_TOKEN,
  faceInks,
  FEATURE_TOKEN,
  FX_TOKEN,
  getInkColor,
  getInkGradientFor,
  GLINT_TOKEN,
  HAIR_SHADE_TOKEN,
  hairShade,
  INK_TOKEN,
  isLightInk,
  LINE_TOKEN,
  lineInks,
  PUPIL_TOKEN,
  type FaceInks,
} from '../../core/palette.js';
import type { ColorId } from '../../core/types.js';
import { partColorCss, partColorPair, partRimCss, partRimPair } from '../part-color.js';
import { PLATE_COLOUR, type ResolvedColour } from './emit.js';
import { LED_EYE, LED_EYE_TOKEN } from './options.js';
import type { PaintDef, Tint } from './paints.js';
import { HAIR_MIX, PIXEL_LEAF_TOKEN } from './parts.js';
import type { PixelVariant } from './rasterise.js';
import { blendCss, mixHex, shadeCss, shadeHex } from './shade.js';

/** Direction of a live gradient ink when it does not say, in degrees. */
const DEFAULT_ANGLE = 135;

/**
 * Direction of the static gradient, in degrees: top-left to bottom-right,
 * which is what the vector style's static gradient does.
 */
const STATIC_ANGLE = 45;

/** What the rasteriser needs besides geometry, and what its paint ids resolve to. */
export interface PixelLook {
  /** Direction of the ink gradient in degrees, or `null` when the ink is one colour. */
  gradient: number | null;
  /** Bands the gradient is cut into: 1 for a flat ink. */
  bands: number;
  /** What the features are drawn in. */
  eye: Tint;
  /** What a drawn face's whites are drawn in. */
  face: Tint;
  colour(def: PaintDef): ResolvedColour;
}

export interface LiveLook extends PixelLook {
  /** The ink at `band`, as CSS. */
  base(band: number): string;
}

/** Stands for what the paint ids mean in a live scene: when it changes, the ids no longer do. */
export function liveLookKey(ink: InkPaint | null, variant: PixelVariant): string {
  const inkKey = !ink ? '' : 'flat' in ink ? `f${ink.flat}` : `g${ink.from}|${ink.to}`;
  return `${variant}|${inkKey}|${ink && 'from' in ink ? (ink.angle ?? DEFAULT_ANGLE) : null}`;
}

/** The colours of a live scene, which are CSS the page resolves: the ink is a `var()` unless a host set one. */
export function liveLook(ink: InkPaint | null, variant: PixelVariant, shades: number): LiveLook {
  const gradient = ink && 'from' in ink ? (ink.angle ?? DEFAULT_ANGLE) : null;
  const bands = gradient === null ? 1 : Math.max(1, Math.round(shades));
  const base = (band: number): string => {
    if (!ink) return variant === 'dot' ? LINE_TOKEN : INK_TOKEN;
    if ('flat' in ink) return ink.flat;
    return blendCss(ink.from, ink.to, (band + 0.5) / bands);
  };
  const colour = (def: PaintDef): ResolvedColour => {
    const tint = def.tint;
    switch (tint.kind) {
      case 'css':
        return { value: tint.value };
      case 'hair':
        return { value: `color-mix(in oklab, ${base(tint.band)}, ${HAIR_SHADE_TOKEN} ${HAIR_MIX * 100}%)` };
      case 'fx':
        return { value: ink ? base(tint.band) : FX_TOKEN };
      case 'part':
        return { value: shadeCss(tint.rim ? partRimCss(tint.color) : partColorCss(tint.color), tint.tone) };
      default:
        return { value: shadeCss(base(tint.band), tint.tone) };
    }
  };
  return {
    gradient,
    bands,
    eye: { kind: 'css', value: variant === 'dot' ? LED_EYE_TOKEN : eyeToken(FEATURE_TOKEN) },
    face: { kind: 'css', value: variant === 'dot' ? LED_EYE_TOKEN : FACE_TOKEN },
    colour,
    base,
  };
}

export interface StaticLookOptions {
  color: ColorId;
  flat: boolean | undefined;
  variant: PixelVariant;
  shades: number;
  /** Colour of the features in place of the one the face rule chose. */
  eyeColor: string | undefined;
}

export interface StaticLook extends PixelLook {
  /** The ink at `band` for one colour scheme, as hex. */
  base(band: number, scheme: 'light' | 'dark'): string;
  /** Whether the picture is on the LED panel, a dark plate on either page. */
  panel: boolean;
}

/**
 * The colours of a static document, which are hex, with the dark scheme's
 * where a colour changes with it. The LED panel is dark on either page, so it
 * is lit in the dark page's ink and carries no override.
 */
export function staticLook({ color, flat, variant, shades, eyeColor }: StaticLookOptions): StaticLook {
  const panel = variant === 'dot';
  // The panel's eyes are lit unless that ink is light, where they are left unlit.
  const ledEye = isLightInk(getInkColor(color, 'dark')) ? PLATE_COLOUR : LED_EYE;
  const eyeColour = eyeColor ?? (panel ? ledEye : FEATURE_TOKEN);
  const faceColour = panel ? ledEye : FACE_TOKEN;

  const bands = flat ? 1 : Math.max(1, Math.round(shades));
  const light = getInkGradientFor(color, 'light');
  const dark = getInkGradientFor(color, 'dark');
  const lifted = panel ? lineInks(color).dark : null;
  const base = (band: number, scheme: 'light' | 'dark'): string => {
    if (lifted) return lifted;
    if (flat) return getInkColor(color, panel ? 'dark' : 'light');
    const g = scheme === 'light' ? light : dark;
    return mixHex(g.from, g.to, (band + 0.5) / bands);
  };
  const effects = effectInks(color);
  // The face's tokens resolved by the face rule (`faceInks`), switched with the page where the colour turns
  // and there is a page to switch with; the LED panel is always on a dark one.
  const rule = faceInks(color);
  const ruled = (key: keyof FaceInks): ResolvedColour =>
    rule.turns && (!flat || panel)
      ? { value: rule.light[key], dark: rule.dark[key] }
      : { value: rule.light[key] };
  const faceColours: Record<string, ResolvedColour> = {
    [FACE_TOKEN]: ruled('face'),
    [FEATURE_TOKEN]: ruled('feature'),
    [PUPIL_TOKEN]: ruled('pupil'),
    [GLINT_TOKEN]: ruled('glint'),
  };
  const paintOf = (def: PaintDef): ResolvedColour => {
    const tint = def.tint;
    if (tint.kind === 'css' && faceColours[tint.value]) return faceColours[tint.value]!;
    if (tint.kind === 'css')
      return { value: tint.value === PIXEL_LEAF_TOKEN ? getLeafColor(color) : tint.value };
    if (tint.kind === 'part') {
      const pair = tint.rim ? partRimPair(tint.color) : partColorPair(tint.color);
      if (!pair) return { value: tint.color };
      const onLight = shadeHex(pair.light, tint.tone);
      const onDark = shadeHex(pair.dark, tint.tone);
      return onLight === onDark || flat ? { value: onLight } : { value: onLight, dark: onDark };
    }
    if (tint.kind === 'hair') {
      const shade = hairShade(color);
      return {
        value: mixHex(base(tint.band, 'light'), shade.light, HAIR_MIX),
        dark: flat ? undefined : mixHex(base(tint.band, 'dark'), shade.dark, HAIR_MIX),
      };
    }
    if (tint.kind === 'fx') {
      return {
        value: effects.light ?? base(tint.band, 'light'),
        dark: flat ? undefined : (effects.dark ?? base(tint.band, 'dark')),
      };
    }
    return {
      value: shadeHex(base(tint.band, 'light'), tint.tone),
      dark: flat ? undefined : shadeHex(base(tint.band, 'dark'), tint.tone),
    };
  };
  const colour = (def: PaintDef): ResolvedColour => {
    const both = paintOf(def);
    return panel ? { value: both.dark ?? both.value } : both;
  };

  return {
    gradient: flat ? null : STATIC_ANGLE,
    bands,
    eye: { kind: 'css', value: eyeColour },
    face: { kind: 'css', value: faceColour },
    colour,
    base,
    panel,
  };
}
