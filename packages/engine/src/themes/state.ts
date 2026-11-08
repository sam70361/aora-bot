/**
 * Which themes are installed, and which theme owns an id.
 *
 * The core's registries read this before they give up on an id: an id a
 * shipped theme owns is not unknown, it is waiting for its theme, and the
 * error says which one to load. Imports only the manifest, so any module of
 * the core can read it.
 */
import { THEME_MANIFEST, type ThemeManifestEntry } from './manifest.js';

/** What kind of id a theme owns; `theme` is the theme's own id. */
export type ThemeOwnedKind = 'shape' | 'cast' | 'variant' | 'color' | 'theme';

/**
 * Thrown by a synchronous call that names an id owned by a theme that is not
 * installed. `await loadTheme(error.theme)` (or `installTheme` with the
 * theme's entry) and call again.
 */
export class ThemeNotInstalledError extends Error {
  override readonly name = 'ThemeNotInstalledError';
  constructor(
    /** The theme that owns the id. */
    readonly theme: string,
    readonly kind: ThemeOwnedKind,
    readonly id: string,
  ) {
    super(
      (kind === 'theme'
        ? `The "${theme}" theme is not installed. `
        : `The ${kind} "${id}" belongs to the "${theme}" theme, which is not installed. `) +
        `Call \`await loadTheme('${theme}')\`, or \`installTheme\` with the \`@aora-bot/engine/themes/${theme}\` entry, first.`,
    );
  }
}

const installed = new Set<string>();

/*
 * The main entry and `/static` are separate bundles, each with its own
 * registries, and a page may load both. A theme installed into one is
 * shared here, on the global object under a registered symbol, and another
 * copy adopts it the first time it meets one of the theme's ids, so one
 * `loadTheme` serves every copy on the page.
 */
const SHARED = Symbol.for('@aora-bot/engine/themes');
const shared: Map<string, unknown> = ((
  globalThis as unknown as Record<symbol, Map<string, unknown> | undefined>
)[SHARED] ??= new Map());

/** How this copy installs a theme's entry; set by the theme module of the same copy. */
let installer: ((theme: unknown) => void) | null = null;

export function setInstaller(install: (theme: unknown) => void): void {
  installer = install;
}

export function markInstalled(id: string, theme: unknown): void {
  installed.add(id);
  shared.set(id, theme);
}

/** Install a theme another copy of the engine has installed. Whether the theme is installed here now. */
function adopt(id: string): boolean {
  if (installed.has(id)) return true;
  const theme = shared.get(id);
  if (theme === undefined || !installer) return false;
  installer(theme);
  return installed.has(id);
}

/** Whether a theme is installed in this copy of the engine, adopting it from another copy on the page. */
export const isThemeInstalled = (id: string): boolean => adopt(id);

/** Every theme entry installed in any copy of the engine on the page. */
export const sharedThemes = (): unknown[] => [...shared.values()];

/** Install here every theme another copy of the engine on the page has installed. */
export function adoptAll(): void {
  for (const id of shared.keys()) adopt(id);
}

/** The shipped theme that owns an id of this kind, or `null` when the core owns it or nobody does. */
export function themeOwning(kind: ThemeOwnedKind, id: string, style?: string): ThemeManifestEntry | null {
  for (const entry of THEME_MANIFEST as readonly ThemeManifestEntry[]) {
    const owns =
      kind === 'theme'
        ? entry.id === id
        : kind === 'shape'
          ? entry.shapes.includes(id)
          : kind === 'cast'
            ? entry.cast.includes(id)
            : kind === 'color'
              ? entry.colors.includes(id)
              : entry.variants.some((v) => v.variant === id && (style === undefined || v.style === style));
    if (owns) return entry;
  }
  return null;
}

/** Throw `ThemeNotInstalledError` when the id is owned by a theme that is not installed. */
export function requireTheme(kind: ThemeOwnedKind, id: string, style?: string): void {
  const owner = themeOwning(kind, id, style);
  if (owner && !adopt(owner.id)) throw new ThemeNotInstalledError(owner.id, kind, id);
}

/**
 * The themes a character needs before it can be drawn, by the ids it names:
 * none when everything is in the core or already installed. A host that
 * mounts by id calls this, reserves the character's box, loads what it names
 * and then draws.
 */
export function themesNeeded(ids: {
  shape?: string | null;
  preset?: string | null;
  variant?: string | null;
  style?: string | null;
  color?: string | null;
}): string[] {
  const out = new Set<string>();
  const add = (owner: ThemeManifestEntry | null): void => {
    if (owner && !adopt(owner.id)) out.add(owner.id);
  };
  if (ids.shape) add(themeOwning('shape', ids.shape));
  if (ids.preset) add(themeOwning('cast', ids.preset));
  if (ids.variant) add(themeOwning('variant', ids.variant, ids.style ?? undefined));
  if (ids.color) add(themeOwning('color', ids.color));
  return [...out];
}
