import {
  CAST,
  DEFAULT_STYLE_ID,
  STYLE_IDS,
  castMember,
  fnv1a32,
  getStyle,
  isCharacterState,
  mulberry32,
  renderStaticSvg,
} from '@aora-bot/engine/static';
import type { CharacterPreset, CharacterState } from '@aora-bot/engine/static';

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

  const sizeParam = params.get('size');
  if (sizeParam !== null && !/^-?\d+$/.test(sizeParam)) return fail('size must be an integer');
  const size = sizeParam === null ? DEFAULT_SIZE : Math.min(MAX_SIZE, Math.max(MIN_SIZE, Number(sizeParam)));

  const member = memberFor(id);
  const svg = renderStaticSvg({
    shape: member.shape,
    color: member.color,
    face: member.face,
    nose: member.nose,
    style: styleId,
    variant,
    state,
    sizePx: size,
  });
  return { ok: true, svg };
}
