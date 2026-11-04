import { getLeafColor } from '../../core/leaf.js';
import { FACE_INK, getInkColor, getInkGradientFor, hairShade } from '../../core/palette.js';
import { VIEWBOX_STR } from '../../core/types.js';
import type { StaticRenderer } from '../renderer.js';
import { serializeNode } from '../scene.js';
import { schemeStyle } from '../scheme.js';
import { emit } from './emit.js';
import { pixelGrid } from './grid.js';
import { EYE_TOKEN, LED_EYE, readOptions, variantOf } from './options.js';
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

  const eyeColour = context.eyeColor ?? (variant === 'dot' ? LED_EYE : EYE_TOKEN);
  // White on a hue; on black, the cut-out the page shows through.
  const faceColour =
    context.eyeColor ?? (variant === 'dot' ? LED_EYE : color === 'black' ? EYE_TOKEN : FACE_INK);
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
  const base = (band: number, scheme: 'light' | 'dark'): string => {
    if (flat) return getInkColor(color, 'light');
    const g = scheme === 'light' ? light : dark;
    return mixHex(g.from, g.to, (band + 0.5) / bands);
  };
  const colour = (def: PaintDef): { value: string; dark?: string } => {
    const tint = def.tint;
    if (tint.kind === 'css')
      return { value: tint.value === PIXEL_LEAF_TOKEN ? getLeafColor(color) : tint.value };
    if (tint.kind === 'hair') {
      const shade = hairShade(color);
      return {
        value: mixHex(base(tint.band, 'light'), shade.light, HAIR_MIX),
        dark: flat ? undefined : mixHex(base(tint.band, 'dark'), shade.dark, HAIR_MIX),
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
