import type { ReactNode } from 'react';
import type { Preset } from '../shared/share.js';
import type { Registry } from './registry.js';

/**
 * The ways the home page can lay out the one character it is about: the
 * console, with every choice in a capsule on its own edge, and the exhibit,
 * an album page with the cast, the states in order and the character's
 * properties beside it. The first is the one a first visit opens on.
 *
 * A view is a component taking `ViewProps`; adding one is an id here, its
 * component in `Home`'s table and its name in `i18n.json`.
 */
export const HOME_VIEWS = ['console', 'exhibit'] as const;
export type HomeView = (typeof HOME_VIEWS)[number];

/**
 * How the wall behind the character is drawn: every tile as one line in the
 * page's ink, or each row in its own style and colour. The first is the
 * default.
 */
export const BACKDROPS = ['lineart', 'wall'] as const;
export type Backdrop = (typeof BACKDROPS)[number];

/** `localStorage` keys, and the `?view=` parameter a link can open a view with. */
export const VIEW_KEY = 'aora-bot:home-view';
export const BACKDROP_KEY = 'aora-bot:home-backdrop';
export const VIEW_PARAM = 'view';

export interface ViewProps {
  registry: Registry;
  preset: Preset;
  patch: (changes: Partial<Preset> | ((preset: Preset) => Partial<Preset>)) => void;
  replace: (preset: Preset) => void;
  backdrop: Backdrop;
  /** The view switch and the backdrop switch, placed where the view keeps its own controls. */
  bar: ReactNode;
}
