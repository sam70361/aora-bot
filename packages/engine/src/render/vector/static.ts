import type { InkPaint, StaticColorScheme } from '../../core/options.js';
import { getLeafColor } from '../../core/leaf.js';
import {
  effectInks,
  faceInks,
  getInkColor,
  getInkGradientFor,
  HAIR_SHADE,
  lineInks,
  rimInks,
  RISO_INK,
  risoSecondInk,
  type FaceInks,
} from '../../core/palette.js';
import { isCuteFamily, isDrawnFace, VIEWBOX_STR, type PartColor } from '../../core/types.js';
import { fnv1a32 } from '../../math/hash.js';
import { livePartPaint, partColorPair, partRimPair, type PartColorPaint } from '../part-color.js';
import type { StaticRenderer } from '../renderer.js';
import { paletteInk, schemeStyle } from '../scheme.js';
import { serializeNode } from '../scene.js';
import { createVectorScene, FACE_SHIFT, inkGradientVector, readVectorParams } from './build.js';
import { themeExtras } from '../../themes/extras-hook.js';
import { isLineVariant, mediumReaches, wearsDarkFace } from './media.js';

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
  // The face rule (`faceInks`): a hue in the middle of the range keeps the tokens' defaults; a dark or a
  // light ink sets every face paint, and one that changes tone with the page (black) switches them with it.
  const rule = faceInks(color);
  const special = !rule.plain;
  const turns = rule.turns;
  const hollow = isLineVariant(frame.variant);
  const style = frame.face.style;
  const filled = !hollow;
  // The rule's paints this face uses (`facePalette`): the face colour for the cute face and a drawn face's
  // whites; the features' colour for the `eyes` and `line` faces, a drawn face's features and the painted
  // variants' face; a drawn face's pupils and glints. A hue in the middle of the range leaves all but the
  // face colour to the tokens.
  const sticker = frame.variant === 'sticker';
  const painted = wearsDarkFace(frame.variant);
  const uses: Record<keyof FaceInks, boolean> = {
    face: filled && !sticker && (isDrawnFace(style) || (style === 'cute' && !painted)),
    feature: special && filled && (!isCuteFamily(style) || isDrawnFace(style) || painted),
    pupil: special && filled && isDrawnFace(style),
    glint: special && filled && isDrawnFace(style),
    sticker: special && sticker,
    hair: special && filled && frame.body.parts.some((part) => part.tone === 'hair'),
  };
  // The ones that switch with the page, each through a custom property on the root.
  const turned = turns ? (Object.keys(uses) as (keyof FaceInks)[]).filter((key) => uses[key]) : [];

  // A part's own palette colour turns with the page through a custom property, as the ink does.
  const turning = [
    ...new Set(
      frame.body.parts.flatMap((part) => {
        const pair = part.color === undefined ? null : partColorPair(part.color);
        return pair && pair.light !== pair.dark ? [part.color!] : [];
      }),
    ),
  ];
  const partVar = (part: string, kind: 'fill' | 'rim'): string =>
    `--${uid}-${kind === 'fill' ? 'pc' : 'pr'}-${fnv1a32(part).toString(36)}`;

  // State effects in an ink lost on one of the pages take the face's colour there (`effectInks`), and so do
  // the decorations a skin paints in the effects' colour.
  const effects = frame.fx || themeExtras()?.decorates(frame.variant) ? effectInks(color) : null;
  const fxPair =
    effects && (effects.light || effects.dark)
      ? { light: effects.light ?? light, dark: effects.dark ?? dark }
      : null;

  // A line variant draws its lines in an ink too faint on one of the pages a step towards that page's contrast.
  const lines = hollow ? lineInks(color) : null;
  const linePair =
    lines && (lines.light || lines.dark) ? { light: lines.light ?? light, dark: lines.dark ?? dark } : null;
  // A filled body on a page it all but matches takes a hairline edge there (`rimInks`).
  const rims = hollow ? null : rimInks(color);
  const rimPair =
    rims && (rims.light || rims.dark)
      ? { light: rims.light ?? 'transparent', dark: rims.dark ?? 'transparent' }
      : null;
  const seconds = frame.variant === 'riso' ? risoSecondInk(color) : null;
  const secondPair =
    seconds && (seconds.light || seconds.dark)
      ? { light: seconds.light ?? RISO_INK, dark: seconds.dark ?? RISO_INK }
      : null;

  let fill: string;
  let solid: string;
  let fxFill: string | undefined;
  let lineInk: string | undefined;
  let rimInk: string | null = null;
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
    fxFill = fxPair?.light;
    lineInk = linePair?.light;
    rimInk = rims?.light ?? null;
  } else {
    solid = `var(--${uid}-ink, ${light})`;
    fxFill = fxPair ? `var(--${uid}-fx, ${fxPair.light})` : undefined;
    lineInk = linePair ? `var(--${uid}-line, ${linePair.light})` : undefined;
    rimInk = rimPair ? `var(--${uid}-rim, ${rimPair.light})` : null;
    defs = paletteInk(scheme, uid, light, dark, [
      ...(hollow ? [{ prop: `--${uid}-shift`, ...FACE_SHIFT }] : []),
      ...turned.map((key) => ({ prop: `--${uid}-${key}`, light: rule.light[key], dark: rule.dark[key] })),
      ...turning.flatMap((part) => [
        { prop: partVar(part, 'fill'), ...partColorPair(part)! },
        { prop: partVar(part, 'rim'), ...partRimPair(part)! },
      ]),
      ...(fxPair ? [{ prop: `--${uid}-fx`, ...fxPair }] : []),
      ...(linePair ? [{ prop: `--${uid}-line`, ...linePair }] : []),
      ...(rimPair ? [{ prop: `--${uid}-rim`, ...rimPair }] : []),
      ...(secondPair ? [{ prop: '--aora-ink2', ...secondPair }] : []),
    ]);
    root = ` class="${uid}"`;
    fill = solid;
    if (frame.variant === 'glass') {
      fill = `url(#${uid}-ink)`;
      defs += `\n  ${paletteGradient(scheme, uid, getInkGradientFor(color, 'light'), getInkGradientFor(color, 'dark'))}`;
    }
  }

  /*
   * A face paint of the rule, where this face uses it: the colour itself where it is one colour on both
   * pages, a custom property switched with the page where it turns, and its light value where there is no
   * root to switch.
   */
  const paint = (key: keyof FaceInks): string | undefined =>
    !uses[key]
      ? undefined
      : root && turned.includes(key)
        ? `var(--${uid}-${key}, ${rule.light[key]})`
        : rule.light[key];

  const partColor = (part: PartColor): PartColorPaint => {
    const pair = partColorPair(part);
    const rim = partRimPair(part);
    if (!pair || !rim) return livePartPaint(part);
    if (root && turning.includes(part)) {
      return {
        fill: `var(${partVar(part, 'fill')}, ${pair.light})`,
        rim: `var(${partVar(part, 'rim')}, ${rim.light})`,
      };
    }
    return { fill: pair.light, rim: rim.light };
  };

  const scene = createVectorScene({
    mode: 'static',
    ink: fill,
    solidInk: solid,
    fxFill,
    lineInk,
    rimInk,
    partColor,
    eyeFill: context.eyeColor,
    faceFill: paint('face'),
    featureFill: paint('feature'),
    pupilFill: paint('pupil'),
    glintFill: paint('glint'),
    stickerFaceFill: paint('sticker'),
    faceShift: hollow && root ? `var(--${uid}-shift, ${FACE_SHIFT.light})` : undefined,
    hairShade: own ? HAIR_SHADE : (paint('hair') ?? rule.light.hair),
    leaf: getLeafColor(color),
    beltPaint: fill,
    shadowId: `${uid}-shadow`,
    softId: `${uid}-soft`,
    halftoneId: `${uid}-halftone`,
    glossId: `${uid}-gloss`,
    mediaId: `${uid}-${frame.variant}`,
    displaySizePx: context.sizePx,
    params: readVectorParams(context.styleOptions),
  });
  // Pink and the light inks would vanish into, or print as, the default pink, so the riso variant swaps it;
  // where the ink switches with the page, so does the second ink, in the root's rule.
  const second = secondPair && !root ? ` style="--aora-ink2:${secondPair.light}"` : '';
  const size = context.sizePx ? ` width="${context.sizePx}" height="${context.sizePx}"` : '';
  // Decorations or an underlay that reach past the box show where the page lets the SVG overflow.
  const bleed =
    themeExtras()?.bleeds(frame.variant) || mediumReaches(frame.variant) ? ' overflow="visible"' : '';

  return `<svg xmlns="http://www.w3.org/2000/svg"${root} viewBox="${VIEWBOX_STR}"${size}${bleed} fill="none" aria-hidden="true"${second}>${defs}
  ${serializeNode(scene.build(frame), 2)}
</svg>`;
};
