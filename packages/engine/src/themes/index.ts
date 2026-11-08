/**
 * Themes: named selections over the engine for an exhibition or a season.
 *
 * The core holds the mechanism and the manifest (`THEME_MANIFEST`): every
 * shipped theme's names, the ids it owns and a loader. A theme's art, skins,
 * cast and stored face data live in its own entry,
 * `@aora-bot/engine/themes/<id>`, and reach the engine through
 * `installTheme(entry)` or `await loadTheme(id)`. Until then a synchronous
 * call that names one of its ids throws `ThemeNotInstalledError`.
 */
import { castMember, registerCast } from '../core/cast.js';
import { registerSwatch } from '../core/palette.js';
import { ALL_COLOR_IDS, ALL_SHAPE_IDS, isFaceStyle } from '../core/types.js';
import { defineFace } from '../face/drawn/index.js';
import { registerFits } from '../face/drawn/place.js';
import { fnv1a32 } from '../math/hash.js';
import { CHARACTER_STATES, isCharacterState, type CharacterState } from '../motion/states.js';
import { defineMedium } from '../render/vector/media.js';
import { installExtras, themeExtras } from './extras-hook.js';
import { registerArt } from '../shapes/registry.js';
import { acceptsVariant, getStyle, hasStyle } from '../styles/index.js';
import { addVariant } from '../styles/registry.js';
import { THEME_MANIFEST, type ThemeManifestEntry } from './manifest.js';
import { adoptAll, isThemeInstalled, markInstalled, requireTheme, setInstaller } from './state.js';
import type { ThemeDefinition, ThemeDimension, ThemeLook, ThemePackage, ThemeSource } from './types.js';

export { THEME_MEMBER_KINDS } from './types.js';
export type {
  StyleChoice,
  ThemeDefinition,
  ThemeDimension,
  ThemeLook,
  ThemeMember,
  ThemeMemberKind,
  ThemePackage,
  ThemeSource,
  ThemeVariant,
} from './types.js';
export {
  THEME_IDS,
  THEME_MANIFEST,
  type BuiltinThemeId,
  type ListedThemeShapeId,
  type ThemeCastId,
  type ThemeColorId,
  type ThemeManifestEntry,
  type ThemeShapeId,
} from './manifest.js';
export {
  ThemeNotInstalledError,
  isThemeInstalled,
  themeOwning,
  themesNeeded,
  type ThemeOwnedKind,
} from './state.js';

const definitions = new Map<string, ThemeDefinition>();
const packages = new Map<string, ThemePackage>();

/** The values a dimension offers: its open list, or its one fixed value. */
export const themeChoices = <T>(dimension: ThemeDimension<T>): readonly T[] =>
  'fixed' in dimension ? [dimension.fixed] : dimension.open;

/** Where a dimension starts: its fixed value, or the first of its list. */
export const themeDefault = <T>(dimension: ThemeDimension<T>): T => themeChoices(dimension)[0]!;

/** Whether a dimension holds one value rather than offering a list. */
export const isFixed = <T>(dimension: ThemeDimension<T>): dimension is { readonly fixed: T } =>
  'fixed' in dimension;

/** Every engine state, from `start`. */
const allStates = (start: CharacterState): ThemeDimension<CharacterState> => ({
  open: [start, ...CHARACTER_STATES.filter((state) => state !== start)],
});

/** A theme's states as the definition holds them: every one, from `idle`, unless the source says otherwise. */
function statesOf(source: ThemeSource): ThemeDimension<CharacterState> {
  const { state } = source;
  if (state === undefined) return allStates('idle');
  if ('start' in state) return allStates(state.start);
  return state;
}

/**
 * Register a theme definition, or replace one with the same id. Throws for
 * anything it names that the engine does not know, and for an empty
 * dimension. Ids of a theme that is not installed are known (the manifest
 * names them); they draw once it is. A source that leaves its states out,
 * or names only where they start, opens every engine state.
 */
export function defineTheme(source: ThemeSource): ThemeDefinition {
  const theme: ThemeDefinition = { ...source, state: statesOf(source) };
  const fail = (what: string): never => {
    throw new Error(`Theme "${theme.id}": ${what}`);
  };
  const check = <T>(name: string, dimension: ThemeDimension<T>, valid: (value: T) => boolean): void => {
    const values = themeChoices(dimension);
    if (values.length === 0) fail(`${name} offers nothing`);
    const bad = values.find((value) => !valid(value));
    if (bad !== undefined) fail(`${name} names ${JSON.stringify(bad)}, which the engine does not know`);
  };
  if (theme.cast.length === 0) fail('cast is empty');
  if (theme.members.map((member) => member.id).join() !== theme.cast.join())
    fail('members do not match the cast');
  for (const member of theme.members) {
    if (
      member.kind === 'borrowed' &&
      member.color &&
      !(ALL_COLOR_IDS as readonly string[]).includes(member.color)
    )
      fail(`${member.id} wears ${JSON.stringify(member.color)}, which the engine does not know`);
  }
  check('shape', theme.shape, (id) => (ALL_SHAPE_IDS as readonly string[]).includes(id));
  check('color', theme.color, (id) => (ALL_COLOR_IDS as readonly string[]).includes(id));
  check(
    'style',
    theme.style,
    ({ style, variant }) =>
      hasStyle(style) &&
      (acceptsVariant(getStyle(style), variant) ||
        THEME_MANIFEST.some((entry) =>
          entry.variants.some((v) => v.style === style && v.variant === variant),
        )),
  );
  check('face', theme.face, (id) => isFaceStyle(id));
  check('state', theme.state, (id) => isCharacterState(id));
  definitions.set(theme.id, theme);
  return theme;
}

/**
 * Install a theme's entry into this copy of the engine: its characters with
 * their stored face data, its cast, its colours and its skins, then its
 * definition. Installing the same theme again does nothing.
 */
export function installTheme(theme: ThemePackage): ThemeDefinition {
  const id = theme.definition.id;
  if (packages.has(id)) return definitions.get(id)!;
  const entry = (THEME_MANIFEST as readonly ThemeManifestEntry[]).find((known) => known.id === id);
  const missing = entry?.colors.find((color) => !theme.colors.some((swatch) => swatch.id === color));
  // Its art and cast read the palette while they register, before the theme counts as installed.
  if (missing)
    throw new Error(
      `Theme "${id}": the manifest gives it the colour "${missing}", which its entry has no swatch for`,
    );
  // A theme's decorations and motions are drawn by the extras it brings (`ThemePackage.extras`).
  (theme.extras ? installExtras(theme.extras) : themeExtras())?.register(theme);
  for (const swatch of theme.colors) registerSwatch(swatch);
  registerArt(theme.art, theme.faces.boxes);
  registerFits(theme.faces.fits);
  for (const design of theme.faces.designs ?? []) {
    defineFace(design, { label: theme.labels.faces?.[design.id] });
  }
  registerCast(theme.cast);
  for (const skin of theme.variants) {
    defineMedium(skin.variant, skin.medium);
    addVariant(skin.style, skin.variant, skin.reads);
  }
  packages.set(id, theme);
  markInstalled(id, theme);
  return defineTheme(theme.definition);
}

setInstaller((theme) => installTheme(theme as ThemePackage));

const loading = new Map<string, Promise<ThemeDefinition>>();

/** Whether a module is a theme's entry: what its loader resolves to. */
const entryOf = (module: unknown): ThemePackage | null => {
  const found = Object.values(module as Record<string, unknown>).find(
    (value) => !!value && typeof value === 'object' && 'definition' in value && 'art' in value,
  );
  return (found as ThemePackage | undefined) ?? null;
};

/**
 * Load a shipped theme's entry through the manifest and install it. Resolves
 * with its definition; loading the same theme twice shares one request.
 * Rejects for an id the manifest does not name.
 */
export function loadTheme(id: string): Promise<ThemeDefinition> {
  const done = getTheme(id);
  if (done && isThemeInstalled(id)) return Promise.resolve(done);
  let pending = loading.get(id);
  if (!pending) {
    const entry = (THEME_MANIFEST as readonly ThemeManifestEntry[]).find((theme) => theme.id === id);
    if (!entry) return Promise.reject(new Error(`Unknown theme "${id}"`));
    pending = entry.load().then((module) => {
      const theme = entryOf(module);
      if (!theme) throw new Error(`The entry of theme "${id}" exports no theme`);
      return installTheme(theme);
    });
    pending.catch(() => loading.delete(id));
    loading.set(id, pending);
  }
  return pending;
}

/** Load every theme a set of ids needs (`themesNeeded`). */
export const loadThemes = (ids: readonly string[]): Promise<ThemeDefinition[]> =>
  Promise.all(ids.map(loadTheme));

/**
 * An installed theme's definition, or `null` while it is not installed. A
 * theme another copy of the engine on the page installed is adopted first.
 */
export function getTheme(id: string): ThemeDefinition | null {
  const found = definitions.get(id);
  if (found) return found;
  return isThemeInstalled(id) ? (definitions.get(id) ?? null) : null;
}

/**
 * How a cast member looks under a theme: the rule behind the avatar API's
 * `theme` parameter, for any host that shows a theme's members. A fixed
 * dimension wins. Otherwise the member keeps its own shape, its colour (the
 * one the theme gives a borrowed member, else its own) when the theme offers
 * it (else one of the theme's colours, picked by `seed`)
 * and its face when the theme offers it (else the theme's first); the skin
 * and the state are where the theme starts.
 *
 * `seed` defaults to the member's id; the avatar API passes the requested
 * id, so every id that lands on a member keeps its own colour. Returns
 * `null` for an unknown member. Throws `ThemeNotInstalledError` for a
 * shipped theme that is not installed, or a member of one, and an error
 * for a theme nobody defined.
 */
export function themeLook(
  theme: string | ThemeDefinition,
  memberId: string,
  seed: string = memberId,
): ThemeLook | null {
  const definition = typeof theme === 'string' ? requireDefinition(theme) : theme;
  const member = castMember(memberId);
  if (!member) return null;
  const given = definition.members.find((entry) => entry.id === memberId);
  const own = (given?.kind === 'borrowed' ? given.color : undefined) ?? member.color;
  const colors = themeChoices(definition.color);
  const faces = themeChoices(definition.face);
  const { style, variant } = themeDefault(definition.style);
  return {
    shape: isFixed(definition.shape) ? definition.shape.fixed : member.shape,
    color: isFixed(definition.color)
      ? definition.color.fixed
      : colors.includes(own)
        ? own
        : colors[fnv1a32(`${seed}:color`) % colors.length]!,
    face: isFixed(definition.face)
      ? definition.face.fixed
      : member.face && faces.includes(member.face)
        ? member.face
        : themeDefault(definition.face),
    ...(member.nose ? { nose: member.nose } : null),
    style,
    variant,
    state: themeDefault(definition.state),
  };
}

/** A theme's definition, adopting it from another copy of the engine on the page. */
function requireDefinition(id: string): ThemeDefinition {
  const found = getTheme(id);
  if (found) return found;
  requireTheme('theme', id);
  const adopted = getTheme(id);
  if (!adopted) throw new Error(`Unknown theme "${id}"`);
  return adopted;
}

/** Every theme definition registered in this copy of the engine, with those installed in another copy on the page. */
export function listThemes(): ThemeDefinition[] {
  adoptAll();
  return [...definitions.values()];
}

export { themeLabel } from './labels.js';
