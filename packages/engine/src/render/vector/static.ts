import type { InkPaint, StaticColorScheme } from '../../core/options.js';
import { getLeafColor } from '../../core/leaf.js';
import {
  FACE_INK,
  getInkColor,
  getInkGradientFor,
  HAIR_SHADE,
  hairShade,
  RISO_INK_ON_PINK,
  stickerFace,
} from '../../core/palette.js';
import { VIEWBOX_STR } from '../../core/types.js';
import type { StaticRenderer } from '../renderer.js';
import { paletteInk, schemeStyle } from '../scheme.js';
import { serializeNode } from '../scene.js';
import { createVectorScene, inkGradientVector, readVectorParams } from './build.js';

/** The palette's own gradient, with the dark-mode stops switched by `schemeStyle`. */
function paletteGradient(
  scheme: StaticColorScheme,
  uid: string,
  light: { from: string; to: string },
  dark: { from: string; to: string },
): string {
  const style = schemeStyle(
    scheme,
    [
      { selector: `.${uid}-from`, decls: [{ prop: 'stop-color', light: light.from, dark: dark.from }] },
      { selector: `.${uid}-to`, decls: [{ prop: 'stop-color', light: light.to, dark: dark.to }] },
    ],
    false,
  );
  return `<defs>
    <linearGradient id="${uid}-ink" x1="0" y1="0" x2="1" y2="1">
      <stop class="${uid}-from" offset="0%" stop-color="${light.from}"/>
      <stop class="${uid}-to" offset="100%" stop-color="${light.to}"/>
    </linearGradient>
  </defs>
  ${style}`;
}

/** A caller's two-colour ink. It has no dark-mode stops: the caller chose these. */
function ownGradient(uid: string, ink: Extract<InkPaint, { from: string }>): string {
  const { x1, y1, x2, y2 } = inkGradientVector(ink.angle);
  return `<defs>
    <linearGradient id="${uid}-ink" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
      <stop offset="0%" stop-color="${ink.from}"/>
      <stop offset="100%" stop-color="${ink.to}"/>
    </linearGradient>
  </defs>`;
}

/**
 * One snapshot as an SVG document.
 *
 * No DOM, no timers — safe to call during server rendering and static site
 * generation. The output is deterministic, which is what makes it usable both
 * as an avatar data URL and as the frozen fallback for off-screen characters.
 */
export const renderVectorStatic: StaticRenderer = (frame, context) => {
  const { color, uid, flat } = context;
  const own = frame.ink;
  const scheme = context.colorScheme ?? 'system';

  // The body is flat in every variant but `glass`, which keeps the palette's gradient.
  const light = getInkColor(color, 'light');
  const dark = getInkColor(color, 'dark');
  const blackSoft = color === 'black' && frame.variant === 'soft';
  const blackSticker = color === 'black' && frame.variant === 'sticker';
  const hollow = frame.variant === 'outline' || frame.variant === 'glass';
  const blackHair = color === 'black' && !hollow && frame.body.parts.some((part) => part.tone === 'hair');

  let fill: string;
  let solid: string;
  let defs = '';
  let root = '';
  if (own && 'flat' in own) {
    fill = solid = own.flat;
  } else if (own) {
    fill = `url(#${uid}-ink)`;
    solid = own.from;
    defs = ownGradient(uid, own);
  } else if (flat) {
    fill = solid = light;
  } else {
    solid = `var(--${uid}-ink, ${light})`;
    defs = paletteInk(scheme, uid, light, dark, blackSoft, [
      ...(hollow ? [{ prop: `--${uid}-shift`, light: '#000', dark: '#fff' }] : []),
      ...(blackSticker ? [{ prop: `--${uid}-sticker`, ...stickerFace() }] : []),
      ...(blackHair ? [{ prop: `--${uid}-hair`, ...hairShade(color) }] : []),
    ]);
    root = ` class="${uid}"`;
    fill = solid;
    if (frame.variant === 'glass') {
      fill = `url(#${uid}-ink)`;
      defs += `\n  ${paletteGradient(scheme, uid, getInkGradientFor(color, 'light'), getInkGradientFor(color, 'dark'))}`;
    }
  }

  // White on every hue; on black the face is a cut-out, which needs no colour of its own.
  const faceFill = context.eyeColor ?? (color === 'black' ? undefined : FACE_INK);
  const softFaceFill =
    blackSoft && root ? `var(--${uid}-soft, ${FACE_INK})` : blackSoft ? FACE_INK : undefined;

  const scene = createVectorScene({
    mode: 'static',
    ink: fill,
    solidInk: solid,
    eyeFill: context.eyeColor,
    faceFill,
    softFaceFill,
    stickerFaceFill: blackSticker && root ? `var(--${uid}-sticker, ${FACE_INK})` : undefined,
    faceShift: hollow && root ? `var(--${uid}-shift, #000)` : undefined,
    hairShade: own
      ? HAIR_SHADE
      : blackHair && root
        ? `var(--${uid}-hair, ${HAIR_SHADE})`
        : hairShade(color).light,
    leaf: getLeafColor(color),
    beltPaint: fill,
    shadowId: `${uid}-shadow`,
    softId: `${uid}-soft`,
    halftoneId: `${uid}-halftone`,
    glossId: `${uid}-gloss`,
    params: readVectorParams(context.styleOptions),
  });
  // Pink's second ink would vanish into its own body, so the riso variant swaps it.
  const second =
    color === 'pink' && frame.variant === 'riso' ? ` style="--aora-ink2:${RISO_INK_ON_PINK}"` : '';
  const size = context.sizePx ? ` width="${context.sizePx}" height="${context.sizePx}"` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg"${root} viewBox="${VIEWBOX_STR}"${size} fill="none" aria-hidden="true"${second}>${defs}
  ${serializeNode(scene.build(frame), 2)}
</svg>`;
};
