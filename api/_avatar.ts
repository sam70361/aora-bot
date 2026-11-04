import {
  CAST,
  COLOR_IDS,
  DEFAULT_STYLE_ID,
  FACE_STYLES,
  SHAPE_IDS,
  STYLE_IDS,
  castMember,
  fnv1a32,
  getStyle,
  isCharacterState,
  mulberry32,
  renderStaticSvg,
  validateStyleOptions,
} from '@aora-bot/engine/static';
import type {
  CharacterPreset,
  CharacterState,
  ColorId,
  FaceStyle,
  ShapeId,
  StyleParam,
} from '@aora-bot/engine/static';

const PUBLIC_PREFIX = '/avatar/';
const MAX_ID_LENGTH = 128;
const DEFAULT_SIZE = 128;
const MIN_SIZE = 16;
const MAX_SIZE = 1024;

export type AvatarResult = { ok: true; svg: string } | { ok: false; message: string };

const fail = (message: string): AvatarResult => ({ ok: false, message });

/** Behind the rewrite the id arrives as `?id=`; a request that still carries the public path is read from it. */
function readId(url: URL): string | null {
  if (!url.pathname.startsWith(PUBLIC_PREFIX)) return url.searchParams.get('id');
  try {
    return decodeURIComponent(url.pathname.slice(PUBLIC_PREFIX.length));
  } catch {
    return null;
  }
}

/** A cast id names its member; any other id picks one the way `autoColorForKey` picks a colour. */
function memberFor(id: string): CharacterPreset {
  return castMember(id) ?? CAST[Math.floor(mulberry32(fnv1a32(id))() * CAST.length)]!;
}

/** A query value read as its parameter's type; one that does not parse stays a string, for the validator to refuse. */
function parseParam(spec: StyleParam, raw: string): unknown {
  switch (spec.type) {
    case 'number':
      return raw.trim() === '' || !Number.isFinite(Number(raw)) ? raw : Number(raw);
    case 'boolean':
      return raw === 'true' || raw === '1' ? true : raw === 'false' || raw === '0' ? false : raw;
    case 'enum':
      return raw;
  }
}

/** Turn a request URL into the SVG it asks for, or say why it cannot. */
export function avatarFromUrl(url: URL): AvatarResult {
  const id = readId(url)?.replace(/\.svg$/i, '');
  if (!id) return fail('missing avatar id');
  if (id.length > MAX_ID_LENGTH) return fail(`avatar id must be at most ${MAX_ID_LENGTH} characters`);

  const params = url.searchParams;

  const styleParam = params.get('style');
  if (styleParam !== null && !(STYLE_IDS as readonly string[]).includes(styleParam)) {
    return fail(`style must be one of ${STYLE_IDS.join(', ')}`);
  }
  const styleId = styleParam ?? DEFAULT_STYLE_ID;

  const variant = params.get('variant') ?? undefined;
  const { variants } = getStyle(styleId);
  if (variant !== undefined && !variants.includes(variant)) {
    return fail(`variant for ${styleId} must be one of ${variants.join(', ')}`);
  }

  const stateParam = params.get('state');
  if (stateParam !== null && !isCharacterState(stateParam)) return fail('unknown state');
  const state = (stateParam ?? undefined) as CharacterState | undefined;

  const shapeParam = params.get('shape');
  if (shapeParam !== null && !(SHAPE_IDS as readonly string[]).includes(shapeParam)) {
    return fail('unknown shape');
  }
  const colorParam = params.get('color');
  if (colorParam !== null && !(COLOR_IDS as readonly string[]).includes(colorParam)) {
    return fail(`color must be one of ${COLOR_IDS.join(', ')}`);
  }
  const faceParam = params.get('face');
  if (faceParam !== null && !(FACE_STYLES as readonly string[]).includes(faceParam)) {
    return fail(`face must be one of ${FACE_STYLES.join(', ')}`);
  }

  const series = getStyle(styleId);
  const styleOptions: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(series.params) as [string, StyleParam][]) {
    const raw = params.get(key);
    if (raw !== null) styleOptions[key] = parseParam(spec, raw);
  }
  const [issue] = validateStyleOptions(series, styleOptions);
  if (issue) return fail(`${issue.key}: ${issue.message}`);

  const sizeParam = params.get('size');
  if (sizeParam !== null && !/^-?\d+$/.test(sizeParam)) return fail('size must be an integer');
  const size = sizeParam === null ? DEFAULT_SIZE : Math.min(MAX_SIZE, Math.max(MIN_SIZE, Number(sizeParam)));

  const member = memberFor(id);
  const svg = renderStaticSvg({
    shape: (shapeParam as ShapeId | null) ?? member.shape,
    color: (colorParam as ColorId | null) ?? member.color,
    face: (faceParam as FaceStyle | null) ?? member.face,
    nose: shapeParam !== null || colorParam !== null ? undefined : member.nose,
    style: styleId,
    styleOptions,
    variant,
    state,
    sizePx: size,
  });
  return { ok: true, svg };
}
