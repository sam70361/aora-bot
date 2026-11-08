import {
  ALL_COLOR_IDS,
  ALL_SHAPE_IDS,
  DEFAULT_STYLE_ID,
  FACE_STYLES,
  STYLE_IDS,
  THEME_IDS,
  acceptsVariant,
  allVariants,
  castMember,
  fnv1a32,
  getStyle,
  installTheme,
  isCharacterState,
  mulberry32,
  renderStaticSvg,
  themeLook,
  validateStyleOptions,
} from '@aora-bot/engine/static';
import { CHRISTMAS } from '@aora-bot/engine/themes/christmas';
import { SPRING_FESTIVAL } from '@aora-bot/engine/themes/spring-festival';
import { MID_AUTUMN } from '@aora-bot/engine/themes/mid-autumn';
import { EASTER } from '@aora-bot/engine/themes/easter';
import { SUMMER } from '@aora-bot/engine/themes/summer';
import { VALENTINE } from '@aora-bot/engine/themes/valentine';
import { HALLOWEEN } from '@aora-bot/engine/themes/halloween';
import type {
  CastId,
  CharacterPreset,
  CharacterState,
  ColorId,
  FaceStyle,
  ShapeId,
  StyleParam,
  ThemeDefinition,
} from '@aora-bot/engine/static';

/**
 * Every shipped theme, installed up front: a server has no layout to hold while a theme loads,
 * and a request may name any theme's character, skin or colour.
 */
const THEMES = Object.fromEntries(
  [HALLOWEEN, CHRISTMAS, SPRING_FESTIVAL, MID_AUTUMN, EASTER, SUMMER, VALENTINE].map((theme) => [
    theme.definition.id,
    installTheme(theme),
  ]),
);

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

/**
 * Members an arbitrary id may land on, in the order they joined the cast. Append only: an id keeps its
 * member when the pool grows, and moves only onto a member added after it, so reordering or removing an
 * entry would reassign avatars that are already in use.
 */
export const AVATAR_POOL: readonly CastId[] = [
  'mochi',
  'dot',
  'pip',
  'byte',
  'momo',
  'bao',
  'teal',
  'tato',
  'hexa',
  'tri',
  'gemma',
  'nimbo',
  'dew',
  'leafy',
  'bloom',
  'lucky',
  'sprout',
  'shroom',
  'oak',
  'pokey',
  'nashi',
  'pomme',
  'berry',
  'cheri',
  'twinkle',
  'luv',
  'ember',
  'chime',
  'jelly',
  'beep',
  'luna',
  'boba',
  'finn',
  'inky',
  'miso',
  'hop',
  'bruno',
  'chirp',
  'waddle',
  'oink',
  'rusty',
  'kiki',
  'maru',
  'zip',
  'fuzz',
  'lulu',
  'pud',
  'avo',
  'toasty',
  'scoop',
  'leo',
  'melo',
  'aubie',
  'cuppy',
  'fry',
  'candy',
  'patty',
  'hammy',
  'prickle',
  'koko',
  'flap',
  'roly',
  'puff',
  'orbi',
  'nook',
  'chatty',
  'joy',
  'lumi',
];

/** Size of the pool before consistent growth, picked by a single uniform draw. */
export const AVATAR_POOL_BASE = 46;

/**
 * Each theme's pool is its cast (`ThemeDefinition.cast`, append only), grown from the size it had
 * when the theme first served avatars, as the default pool grows from `AVATAR_POOL_BASE`.
 */
export const THEME_POOL_BASE: Readonly<Record<(typeof THEME_IDS)[number], number>> = {
  halloween: 26,
  christmas: 21,
  'spring-festival': 21,
  'mid-autumn': 20,
  easter: 18,
  summer: 20,
  valentine: 17,
};

/**
 * Jump consistent hash over the first `size` pool members. The first draw places the id within the
 * base pool; each later draw gives the pool size at which the id next moves, so growing the pool from
 * n to m reassigns an expected (m − n) / m of ids, each onto one of the added members.
 */
export function poolIndex(id: string, size: number, base = AVATAR_POOL_BASE): number {
  const random = mulberry32(fnv1a32(id));
  let index = Math.floor(random() * base);
  let reached = base;
  for (;;) {
    const next = Math.floor(reached / (1 - random()));
    if (next >= size) return index;
    index = next;
    reached = next + 1;
  }
}

/** A cast id names its member; any other id lands on a member of the pool by `poolIndex`. */
function memberFor(id: string, pool: readonly CastId[], size: number, base: number): CharacterPreset {
  return castMember(id) ?? castMember(pool[poolIndex(id, size, base)]!)!;
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

  const themeParam = params.get('theme');
  const theme =
    themeParam === null ? null : (THEMES as Record<string, ThemeDefinition | undefined>)[themeParam];
  if (themeParam !== null && !theme) return fail(`theme must be one of ${THEME_IDS.join(', ')}`);
  const themed = theme
    ? themeLook(
        theme,
        memberFor(id, theme.cast, theme.cast.length, THEME_POOL_BASE[theme.id as (typeof THEME_IDS)[number]])
          .id,
        id,
      )
    : null;

  const styleParam = params.get('style');
  if (styleParam !== null && !(STYLE_IDS as readonly string[]).includes(styleParam)) {
    return fail(`style must be one of ${STYLE_IDS.join(', ')}`);
  }
  const styleId = styleParam ?? themed?.style ?? DEFAULT_STYLE_ID;

  const variantParam = params.get('variant');
  if (variantParam !== null && !acceptsVariant(getStyle(styleId), variantParam)) {
    return fail(`variant for ${styleId} must be one of ${allVariants(getStyle(styleId)).join(', ')}`);
  }
  // A theme's skin belongs to its series: asking for another series drops it.
  const variant = variantParam ?? (themed?.style === styleId ? themed.variant : undefined);

  const stateParam = params.get('state');
  if (stateParam !== null && !isCharacterState(stateParam)) return fail('unknown state');
  const state = (stateParam ?? themed?.state) as CharacterState | undefined;

  const shapeParam = params.get('shape');
  if (shapeParam !== null && !(ALL_SHAPE_IDS as readonly string[]).includes(shapeParam)) {
    return fail('unknown shape');
  }
  const colorParam = params.get('color');
  if (colorParam !== null && !(ALL_COLOR_IDS as readonly string[]).includes(colorParam)) {
    return fail(`color must be one of ${ALL_COLOR_IDS.join(', ')}`);
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

  const poolParam = params.get('pool');
  if (poolParam !== null && theme) return fail('pool applies to the default pool, not to a theme');
  if (poolParam !== null && !/^\d+$/.test(poolParam)) return fail('pool must be an integer');
  const pool = poolParam === null ? AVATAR_POOL.length : Number(poolParam);
  if (pool < AVATAR_POOL_BASE || pool > AVATAR_POOL.length) {
    return fail(`pool must be between ${AVATAR_POOL_BASE} and ${AVATAR_POOL.length}`);
  }

  const look = themed ?? memberFor(id, AVATAR_POOL, pool, AVATAR_POOL_BASE);
  const svg = renderStaticSvg({
    shape: (shapeParam as ShapeId | null) ?? look.shape,
    color: (colorParam as ColorId | null) ?? look.color,
    face: (faceParam as FaceStyle | null) ?? look.face,
    nose: shapeParam !== null || colorParam !== null ? undefined : look.nose,
    style: styleId,
    styleOptions,
    variant,
    state,
    sizePx: size,
  });
  return { ok: true, svg };
}
