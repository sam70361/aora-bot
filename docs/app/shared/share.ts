import {
  CHARACTER_STATES,
  ALL_COLOR_IDS,
  DEFAULT_STYLE_ID,
  FACE_STYLES,
  ALL_SHAPE_IDS,
  allVariants,
  themeOwning,
  getStyle,
  hasStyle,
  resolveStyleOptions,
  type CharacterState,
  type ColorId,
  type FaceStyle,
  type ShapeId,
} from '@aora-bot/engine';

/** A series parameter's value: what a slider, a switch or a choice sets. */
export type ParamValue = number | boolean | string;

/**
 * Everything the console can set, and so the payload of a share link: a flat,
 * closed shape that decodes with validation rather than trust.
 *
 * `style` and `variant` are plain strings because the series are a registry,
 * not a union; a series registered later is selectable the day it exists.
 * `params` holds only what differs from the series' defaults, and belongs to
 * the series: choosing another series starts it from its own defaults.
 */
export interface Preset {
  shape: ShapeId;
  color: ColorId;
  style: string;
  variant: string;
  state: CharacterState;
  face: FaceStyle;
  params: Readonly<Record<string, ParamValue>>;
}

const NO_PARAMS: Preset['params'] = Object.freeze({});

export const DEFAULT_FACE: FaceStyle = 'cute';

export const DEFAULT_PRESET: Preset = {
  shape: 'mochi',
  color: 'blue',
  style: DEFAULT_STYLE_ID,
  variant: getStyle(DEFAULT_STYLE_ID).defaultVariant,
  state: 'happy',
  face: DEFAULT_FACE,
  params: NO_PARAMS,
};

/**
 * The parameters that are valid for `style` and differ from its defaults.
 *
 * Values are clamped and snapped by the engine's own resolver, so what is kept
 * is exactly what the character will be drawn with.
 */
export function cleanParams(style: string, input: unknown): Preset['params'] {
  if (!input || typeof input !== 'object') return NO_PARAMS;
  const series = getStyle(style);
  const resolved = resolveStyleOptions(series, input as Record<string, unknown>);
  const defaults = series.defaults as Record<string, unknown>;
  const kept = Object.entries(resolved).filter(
    ([key, value]) => key in (input as object) && value !== defaults[key],
  ) as [string, ParamValue][];
  return kept.length > 0 ? Object.fromEntries(kept) : NO_PARAMS;
}

/**
 * Version-pinned prefix, so a later wire format can sit beside this one and
 * links already sent keep opening.
 */
const SHARE_PREFIX = 'aorabot1.';

const toBase64Url = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const fromBase64Url = (s: string) => {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

/** Compact wire form: short keys, defaults omitted. Unknown keys are ignored. */
interface Wire {
  s: string;
  c: string;
  y?: string;
  v?: string;
  st?: string;
  f?: string;
  p?: Record<string, ParamValue>;
}

function encodeShare(preset: Preset): string {
  const wire: Wire = { s: preset.shape, c: preset.color };
  if (preset.style !== DEFAULT_STYLE_ID) wire.y = preset.style;
  if (preset.variant !== getStyle(preset.style).defaultVariant) wire.v = preset.variant;
  if (preset.state !== 'idle') wire.st = preset.state;
  if (preset.face !== DEFAULT_FACE) wire.f = preset.face;
  if (Object.keys(preset.params).length > 0) wire.p = { ...preset.params };
  return SHARE_PREFIX + toBase64Url(JSON.stringify(wire));
}

const oneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value);

/**
 * Decode a share string. Returns `null` for anything that is not a valid
 * `aorabot1.` payload; a field the registries do not know falls back to the
 * default, since a slightly different character is better than a broken link.
 */
export function decodeShare(input: string | null | undefined): Preset | null {
  if (!input || !input.startsWith(SHARE_PREFIX)) return null;
  let wire: unknown;
  try {
    wire = JSON.parse(fromBase64Url(input.slice(SHARE_PREFIX.length)));
  } catch {
    return null;
  }
  if (!wire || typeof wire !== 'object') return null;
  const w = wire as Partial<Wire>;

  const style = typeof w.y === 'string' && hasStyle(w.y) ? w.y : DEFAULT_STYLE_ID;
  const series = getStyle(style);
  // A link may name a theme's character, skin or colour: the marks load the theme, though no rail lists it.
  return {
    shape: oneOf(ALL_SHAPE_IDS, w.s) ? w.s : DEFAULT_PRESET.shape,
    color: oneOf(ALL_COLOR_IDS, w.c) ? w.c : DEFAULT_PRESET.color,
    style,
    variant:
      oneOf(allVariants(series), w.v) || (typeof w.v === 'string' && themeOwning('variant', w.v, style))
        ? (w.v as string)
        : series.defaultVariant,
    state: oneOf(CHARACTER_STATES, w.st) ? w.st : 'idle',
    face: oneOf(FACE_STYLES, w.f) ? w.f : DEFAULT_FACE,
    params: cleanParams(style, w.p),
  };
}

export function shareUrl(preset: Preset): string {
  const url = new URL(window.location.href);
  url.searchParams.set('s', encodeShare(preset));
  url.hash = '';
  return url.toString();
}
