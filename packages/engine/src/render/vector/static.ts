import type { InkPaint, StaticColorScheme } from '../../core/options.js';
import { getLeafColor } from '../../core/leaf.js';
import {
  cutFaceInk,
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
import { isDrawnFace, VIEWBOX_STR, type PartColor } from '../../core/types.js';
import { fnv1a32 } from '../../math/hash.js';
import { livePartPaint, partColorPair, partRimPair, type PartColorPaint } from '../part-color.js';
import type { StaticRenderer } from '../renderer.js';
import { paletteInk, schemeStyle } from '../scheme.js';
import { serializeNode } from '../scene.js';
import { createVectorScene, inkGradientVector, readVectorParams } from './build.js';
import { themeExtras } from '../../themes/extras-hook.js';
import { isLineVariant, isMedium, mediumReaches, wearsDarkFace } from './media.js';

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
  const turns = rule.cutOut;
  const hollow = isLineVariant(frame.variant);
  const ruleSoft = special && wearsDarkFace(frame.variant);
  const ruleSticker = special && frame.variant === 'sticker';
  const ruleHair = special && !hollow && frame.body.parts.some((part) => part.tone === 'hair');
  // A drawn face's brows and body-drawn eyes follow the soft face, their light the other way, and its
  // pupils what reads on its whites.
  const ruleFeatures = special && !hollow && isDrawnFace(frame.face.style);
  const pairOf = (key: keyof FaceInks) => ({ light: rule.light[key], dark: rule.dark[key] });

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
  const rims = hollow || isMedium(frame.variant) ? null : rimInks(color);
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
    defs = paletteInk(scheme, uid, light, dark, turns && (ruleSoft || ruleFeatures) ? pairOf('soft') : null, [
      ...(hollow ? [{ prop: `--${uid}-shift`, light: '#000', dark: '#fff' }] : []),
      ...(turns && ruleSticker ? [{ prop: `--${uid}-sticker`, ...pairOf('sticker') }] : []),
      ...(turns && ruleHair ? [{ prop: `--${uid}-hair`, ...pairOf('hair') }] : []),
      ...(turns && ruleFeatures
        ? [
            { prop: `--${uid}-glint`, ...pairOf('glint') },
            { prop: `--${uid}-pupil`, ...pairOf('pupil') },
          ]
        : []),
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
   * A face paint of the rule: the colour itself where it is one colour on both pages, a custom property
   * switched with the page where it turns, and its light value where there is no root to switch.
   */
  const paint = (key: keyof FaceInks, fallback = rule.light[key]): string =>
    turns && root ? `var(--${uid}-${key}, ${fallback})` : rule.light[key];

  // A cut-out face needs no colour of its own: it is the page.
  const faceFill = context.eyeColor ?? (turns ? undefined : rule.light.face);
  const softFaceFill = ruleSoft ? paint('soft') : undefined;

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
    cutFill: cutFaceInk(color) ?? undefined,
    faceFill,
    softFaceFill,
    stickerFaceFill: ruleSticker && (!turns || root) ? paint('sticker') : undefined,
    featureFill: ruleFeatures ? paint('soft') : undefined,
    glintFill: ruleFeatures ? paint('glint') : undefined,
    pupilFill: ruleFeatures && (!turns || root) ? paint('pupil') : undefined,
    faceShift: hollow && root ? `var(--${uid}-shift, #000)` : undefined,
    hairShade: own ? HAIR_SHADE : ruleHair && turns && root ? paint('hair', HAIR_SHADE) : rule.light.hair,
    leaf: getLeafColor(color),
    beltPaint: fill,
    shadowId: `${uid}-shadow`,
    softId: `${uid}-soft`,
    halftoneId: `${uid}-halftone`,
    glossId: `${uid}-gloss`,
    // The uid does not know the variant, and two media inlined side by side must not share a grain.
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
