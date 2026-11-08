import { getLeafColor } from '../../core/leaf.js';
import {
  cutFaceInk,
  effectInks,
  faceInks,
  getInkColor,
  getInkGradientFor,
  hairShade,
  inkTone,
  lineInks,
  type FaceInks,
} from '../../core/palette.js';
import { VIEWBOX_STR } from '../../core/types.js';
import type { StaticRenderer } from '../renderer.js';
import { serializeNode } from '../scene.js';
import { partColorPair, partRimPair } from '../part-color.js';
import { schemeStyle } from '../scheme.js';
import { emit, PLATE_COLOUR } from './emit.js';
import { pixelGrid } from './grid.js';
import {
  EYE_TOKEN,
  FEATURE_TOKEN,
  GLINT_TOKEN,
  LED_EYE,
  PUPIL_TOKEN,
  readOptions,
  variantOf,
} from './options.js';
import { createPaintTable, type PaintDef } from './paints.js';
import { HAIR_MIX, PIXEL_LEAF_TOKEN } from './parts.js';
import { createScratch, rasterise } from './rasterise.js';
import { mixHex, shadeHex } from './shade.js';

/**
 * Direction of the static gradient, in degrees: top-left to bottom-right,
 * which is what the vector style's static gradient does.
 */
const STATIC_ANGLE = 45;

/**
 * One snapshot as an SVG document.
 *
 * No DOM and no timers, like the vector one. Colours are resolved to hex here
 * rather than left to `color-mix()`: static output ends up in `<img>` tags,
 * data URLs and renderers that have never heard of CSS colour functions. The
 * dark-mode ink is a colour-scheme override, as it is in the vector style
 * (see `schemeStyle`).
 */
export const renderPixelStatic: StaticRenderer = (frame, context) => {
  const { color, uid, flat } = context;
  const options = readOptions(context.styleOptions);
  const variant = variantOf(frame.variant);
  const grid = pixelGrid(options.grid);
  const table = createPaintTable();
  const paint = new Uint16Array(grid.size * grid.size);

  // The LED panel is dark on either page, so it is lit in the dark page's ink, and its eyes are lit unless
  // that ink is light, where they are left unlit.
  const panel = variant === 'dot';
  const ledEye = inkTone(getInkColor(color, 'dark')) === 'light' ? PLATE_COLOUR : LED_EYE;
  const eyeColour = context.eyeColor ?? (panel ? ledEye : (cutFaceInk(color) ?? EYE_TOKEN));
  // The face rule (`faceInks`); a colour that turns with the page has its face cut out of it.
  const rule = faceInks(color);
  const faceColour = context.eyeColor ?? (panel ? ledEye : rule.cutOut ? EYE_TOKEN : rule.light.face);
  rasterise(
    frame,
    {
      grid,
      shades: options.shades,
      outline: options.outline,
      variant,
      gradient: flat ? null : STATIC_ANGLE,
      eye: { kind: 'css', value: eyeColour },
      face: { kind: 'css', value: faceColour },
    },
    table,
    createScratch(grid.size),
    paint,
  );

  const bands = flat ? 1 : Math.max(1, Math.round(options.shades));
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
  // A drawn face's tokens resolved by the face rule, switched with the page where the colour turns.
  const ruled = (key: keyof FaceInks): { value: string; dark?: string } =>
    rule.cutOut ? { value: rule.light[key], dark: rule.dark[key] } : { value: rule.light[key] };
  const drawnColours: Record<string, { value: string; dark?: string }> = {
    [PUPIL_TOKEN]: ruled('pupil'),
    [FEATURE_TOKEN]: ruled('soft'),
    [GLINT_TOKEN]: ruled('glint'),
  };
  const colour = (def: PaintDef): { value: string; dark?: string } => {
    const both = paintOf(def);
    return panel ? { value: both.dark ?? both.value } : both;
  };
  const paintOf = (def: PaintDef): { value: string; dark?: string } => {
    const tint = def.tint;
    if (tint.kind === 'css' && drawnColours[tint.value]) return drawnColours[tint.value]!;
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

  const { scene, overrides, stroked } = emit(paint, table, {
    grid,
    variant,
    gap: options.gap,
    glow: options.glow,
    colour,
    ids: { pattern: `${uid}-px`, glow: `${uid}-glow` },
    classPrefix: `${uid}-`,
  });

  const property = stroked ? 'stroke' : 'fill';
  const css = schemeStyle(
    context.colorScheme ?? 'system',
    overrides.map((r) => ({
      selector: `.${r.className}`,
      decls: [{ prop: property, light: r.light, dark: r.dark }],
    })),
    false,
  );
  const style = css && `\n  ${css}`;
  const size = context.sizePx ? ` width="${context.sizePx}" height="${context.sizePx}"` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX_STR}"${size} fill="none" aria-hidden="true">${style}
  ${serializeNode(scene, 2)}
</svg>`;
};
