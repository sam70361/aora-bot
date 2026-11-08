import { autoColorForKey, autoNoseForKey, autoShapeForKey } from '../math/hash.js';
import type { StaticColorScheme, StaticOptions } from '../core/options.js';
import type { ExpressionId } from '../face/topologies.js';
import {
  IDLE_STATE,
  mouthForState,
  STATE_CUTE_EYES,
  STATE_EYE_TOPOLOGIES,
  type CharacterState,
} from '../motion/states.js';
import { getShape, getShapeScale } from '../shapes/registry.js';
import { createSimulation } from '../sim/simulation.js';
import { requireTheme } from '../themes/state.js';
import { DEFAULT_STYLE_ID, getStyle, resolveStyleOptions } from '../styles/index.js';
import { getFaceDesign } from '../face/drawn/index.js';
import {
  CENTER,
  isCuteFamily,
  isDrawnFace,
  VIEWBOX,
  VIEWBOX_STR,
  type CuteMouthId,
  type FaceStyle,
  type MouthId,
  type NoseId,
  type ShapeId,
} from '../core/types.js';

export type { StaticColorScheme, StaticOptions };

/** First expression each state adopts on entry, per face's table. */
const firstOf = (table: Record<CharacterState, string[]>): Partial<Record<CharacterState, string>> =>
  Object.fromEntries(Object.entries(table).map(([state, list]) => [state, list[0]]));
const STATE_EXPRESSION = firstOf(STATE_EYE_TOPOLOGIES);
const STATE_CUTE_EXPRESSION = firstOf(STATE_CUTE_EYES);

function resolveExpression(options: StaticOptions, face: FaceStyle): string {
  if (options.expression) return options.expression;
  // A drawn face has its own table, and its own names for what it shows.
  if (isDrawnFace(face)) return getFaceDesign(face).states[options.state ?? IDLE_STATE][0] ?? 'dot';
  const table = face === 'cute' ? STATE_CUTE_EXPRESSION : STATE_EXPRESSION;
  if (options.state) return table[options.state] ?? 'neutral';
  return 'neutral';
}

/**
 * Sampled part-way into the cycle rather than at zero, where several belts are
 * still in their entry animation and have nothing visible to show.
 */
const BELT_SAMPLE_TIME = 0.62;

/**
 * Render a character to an SVG string.
 *
 * A still simulation, settled, handed to the chosen style's static renderer —
 * the live character's own pipeline with the time taken out. No DOM, no
 * timers, so it is safe during server rendering and static site generation,
 * and the output is deterministic.
 *
 * A theme's character, skin or colour draws once its theme is installed:
 * `await loadTheme(id)` (or `installTheme`) first, or this throws
 * `ThemeNotInstalledError`. `themesNeeded` says which themes a set of ids needs.
 */
export function renderStaticSvg(options: StaticOptions = {}): string {
  const shapeId = options.shape ?? 'mochi';
  const colorId = options.color ?? 'black';
  const style = getStyle(options.style ?? DEFAULT_STYLE_ID);
  requireTheme('color', colorId);
  if (options.variant !== undefined) requireTheme('variant', options.variant, style.id);
  const colorScheme = options.colorScheme ?? 'system';

  const face: FaceStyle = options.face ?? 'cute';
  const expressionId = resolveExpression(options, face);
  const noseId: NoseId | null =
    face !== 'line'
      ? null
      : options.nose === undefined
        ? autoNoseForKey(`${shapeId}:${colorId}`)
        : options.nose;
  const mouthId: MouthId | CuteMouthId | null =
    face === 'line'
      ? (options.mouth ?? (options.state ? mouthForState(options.state) : 'soft'))
      : isCuteFamily(face)
        ? (options.mouth ?? null)
        : null;

  const sim = createSimulation({
    shape: shapeId,
    state: options.state,
    variant: options.variant ?? style.defaultVariant,
    face,
    nose: noseId,
    faceTune: options.faceTune,
    pose: options.pose,
    poseHome: options.poseHome,
    lineWeight: options.lineWeight,
    ink: options.ink,
    hud: options.hud,
    seed: 'static',
    reducedMotion: true,
    still: {
      beltTime: BELT_SAMPLE_TIME,
      expression: expressionId as ExpressionId,
      mouth: mouthId ?? undefined,
    },
    // Static output has never counter-scaled the eyes for the shape; keeping
    // it that way keeps every existing document byte-for-byte.
    compensateEyes: false,
    // The dial prints its figure only at a size that can show it.
    displaySizePx: Math.max(1, options.sizePx ?? 240),
  });
  sim.settle();
  const frame = sim.snapshot();
  sim.dispose();

  // The default face hashes exactly as before so existing output is unchanged.
  const faceKey =
    face === 'line'
      ? `line${noseId ?? ''}${mouthId ?? ''}`
      : face === 'cute'
        ? 'cute'
        : isDrawnFace(face)
          ? `${face}${mouthId ?? ''}`
          : '';
  // A paint override changes what the ids refer to, so it is part of the key.
  const inkKey = options.ink ? JSON.stringify(options.ink) : '';
  // The inline `<style>` is document-global, so the two schemes must not share class names.
  const schemeKey = colorScheme === 'page' ? 'page' : '';
  const uid = `a${hashString(`${shapeId}${colorId}${expressionId}${faceKey}${inkKey}${schemeKey}`)}`;

  return style.renderStatic(frame, {
    color: colorId,
    uid,
    flat: options.flat,
    colorScheme,
    eyeColor: options.eyeColor,
    sizePx: options.sizePx,
    styleOptions: resolveStyleOptions(style, options.styleOptions),
  });
}
/** Percent-encoded data URL. Smaller and more readable than base64 for SVG. */
export function renderStaticSvgDataUrl(options: StaticOptions = {}): string {
  return `data:image/svg+xml,${encodeURIComponent(renderStaticSvg(options))}`;
}

/** One-line deterministic avatar for an arbitrary key. */
export function renderAvatarDataUrl(
  key: string,
  overrides: Pick<
    StaticOptions,
    'shape' | 'color' | 'sizePx' | 'eyeColor' | 'face' | 'nose' | 'state' | 'lineWeight'
  > = {},
): string {
  return renderStaticSvgDataUrl({
    shape: overrides.shape ?? autoShapeForKey(key),
    color: overrides.color ?? autoColorForKey(key),
    sizePx: overrides.sizePx,
    eyeColor: overrides.eyeColor,
    face: overrides.face,
    lineWeight: overrides.lineWeight,
    nose: overrides.face === 'line' && overrides.nose === undefined ? autoNoseForKey(key) : overrides.nose,
    state: overrides.state ?? IDLE_STATE,
  });
}

/** Silhouette-only SVG, for use as a CSS `mask-image`. */
export function shapeMaskImage(
  options: { shape?: ShapeId; sizePx?: number; inflatePx?: number } = {},
): string {
  const shapeId = options.shape ?? 'mochi';
  const shape = getShape(shapeId);
  const scale = getShapeScale(shapeId) * (1 + (options.inflatePx ?? 0) / 100);
  const size = options.sizePx ?? 64;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX_STR}" width="${size}" height="${size}"><g transform="translate(${CENTER} ${CENTER}) scale(${scale}) translate(${-CENTER} ${-CENTER})"><path d="${shape.path}" fill="#000"/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Hollow ring version of the silhouette, for selection indicators. */
export function shapeRingMaskImage(
  options: { shape?: ShapeId; sizePx?: number; inflatePx?: number; gapPx?: number } = {},
): string {
  const shapeId = options.shape ?? 'mochi';
  const shape = getShape(shapeId);
  const size = options.sizePx ?? 64;
  const base = getShapeScale(shapeId);
  const outer = base * (1 + (options.inflatePx ?? 1) / 30);
  const inner = base * (1 + ((options.inflatePx ?? 1) - (options.gapPx ?? 3)) / 30);

  /*
   * The hole is cut with an SVG `<mask>`, not a blend mode: `destination-out`
   * is a canvas compositing operation, and as a CSS `mix-blend-mode` value it
   * is ignored, which left the inner silhouette painted over the outer one and
   * the "ring" a solid disc. A luminance mask — white outer path, black inner
   * path — applied to a full-box rect leaves alpha only in the band between
   * them, which is what `mask-image` reads.
   */
  const box = `x="${VIEWBOX.minX}" y="${VIEWBOX.minY}" width="${VIEWBOX.width}" height="${VIEWBOX.height}"`;
  const at = (scale: number) =>
    `translate(${CENTER} ${CENTER}) scale(${scale}) translate(${-CENTER} ${-CENTER})`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX_STR}" width="${size}" height="${size}"><defs><mask id="r" maskUnits="userSpaceOnUse" ${box}><g transform="${at(outer)}"><path d="${shape.path}" fill="#fff"/></g><g transform="${at(inner)}"><path d="${shape.path}" fill="#000"/></g></mask></defs><rect ${box} fill="#000" mask="url(#r)"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
