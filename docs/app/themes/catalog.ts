import {
  THEME_MANIFEST,
  castMember,
  getTheme,
  loadTheme,
  themeChoices,
  themeDefault,
  themeLook,
  type CastId,
  type CharacterState,
  type ColorId,
  type NoseId,
  type ThemeDefinition,
} from '@aora-bot/engine';
import { useEffect, useState } from 'react';
import type { Bilingual } from '../shared/i18n.js';
import type { Preset } from '../shared/share.js';
import { buildStateGroups, type StateGroup } from '../shared/state-groups.js';

/*
 * What the exhibition shows, read from the engine's theme manifest and the
 * definitions its entries install. Nothing here names a theme, a character, a
 * colour or a skin: a theme in the manifest has an album, its `cards` are the
 * album's pockets in order, and the engine's `themeLook` draws each one.
 */

export interface AlbumEntry {
  id: string;
  name: Bilingual;
  /** Its place in the manifest, from 1: the volume number on its cover. */
  volume: number;
  /** Every card it shows, in order, borrowed members included: one pocket each, known before it loads. */
  cards: readonly CastId[];
}

/** Every shipped theme, in manifest order. Known before any theme loads, so the page shell is static. */
export const ALBUMS: readonly AlbumEntry[] = THEME_MANIFEST.map((entry, i) => ({
  id: entry.id,
  name: entry.name,
  volume: i + 1,
  cards: entry.cards as readonly CastId[],
}));

export const albumEntry = (id: string): AlbumEntry | undefined => ALBUMS.find((album) => album.id === id);

export interface ThemeCard {
  id: CastId;
  name: Bilingual;
  desc: Bilingual;
  /** The member as the theme draws it, in the theme's resting state. */
  preset: Preset;
  nose?: NoseId;
}

export interface Album {
  id: string;
  name: Bilingual;
  cards: ThemeCard[];
  /** The theme's states, in the engine's groups. */
  stateGroups: StateGroup[];
  defaultState: CharacterState;
  /** The inks the theme offers, in its own order. */
  colors: readonly ColorId[];
}

/** A card's preset as the props a still or a live mark takes. */
export const markOf = ({ shape, color, state, style, variant, face }: Preset, nose?: NoseId) => ({
  shape,
  color,
  state,
  style,
  variant,
  face,
  nose,
});

/** A card as the theme draws it, by the engine's own rule, so it matches the card's avatar link. */
function cardOf(theme: ThemeDefinition, id: CastId): ThemeCard | null {
  const member = castMember(id);
  const look = themeLook(theme, id);
  if (!member || !look) return null;
  const { nose, ...preset } = look;
  return { id, name: member.name, desc: member.desc, preset: { ...preset, params: {} }, nose };
}

export function buildAlbum(theme: ThemeDefinition): Album {
  const states = new Set<string>(themeChoices(theme.state));
  const order = albumEntry(theme.id)?.cards ?? theme.cast;
  return {
    id: theme.id,
    name: theme.name,
    cards: order.flatMap((id) => cardOf(theme, id) ?? []),
    stateGroups: buildStateGroups()
      .map((group) => ({ ...group, states: group.states.filter((state) => states.has(state)) }))
      .filter((group) => group.states.length > 0),
    defaultState: themeDefault(theme.state),
    colors: themeChoices(theme.color),
  };
}

/**
 * A theme's album, once its entry is installed; `null` until then. Loading
 * starts when `enabled` turns true, so a booklet below the fold costs nothing
 * until it nears the screen.
 */
export function useAlbum(id: string, enabled = true): Album | null {
  const [album, setAlbum] = useState<Album | null>(() => {
    const theme = getTheme(id);
    return theme ? buildAlbum(theme) : null;
  });
  useEffect(() => {
    if (!enabled || album?.id === id) return;
    let live = true;
    loadTheme(id).then(
      (theme) => live && setAlbum(buildAlbum(theme)),
      (error: unknown) => console.error(error),
    );
    return () => {
      live = false;
    };
  }, [id, enabled, album]);
  return album?.id === id ? album : null;
}
