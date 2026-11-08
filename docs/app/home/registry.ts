import { DEFAULT_STYLE_ID, listStyles } from '@aora-bot/engine';
import {
  CAST,
  FACE_STYLES,
  SHAPE_FAMILIES,
  type CharacterPreset,
  type FaceStyle,
  type ShapeFamily,
} from '@aora-bot/react';
import { buildStateGroups, type StateGroup } from '../shared/state-groups.js';

/*
 * What the home page offers, read from the engine's registries and nowhere else.
 *
 * Nothing in this file names a shape, a colour, a state or a series: the rails
 * are drawn from these lists, so a roster, a palette or a style registered by
 * the engine shows up on the home page without this being edited. The only
 * words below are display names, and those fall back to the engine's own id.
 */

export interface StyleChoice {
  style: string;
  variant: string;
}

export interface StyleGroup {
  id: string;
  /** The engine's own English name, the fallback when there is no translation. */
  label: string;
  /** A series with one variant is one option; its caption is the series name. */
  choices: StyleChoice[];
}

/** Every series with every one of its variants: the default series first, the rest in registration order. */
function buildStyleGroups(): StyleGroup[] {
  const all = listStyles();
  all.sort((a, b) => Number(b.id === DEFAULT_STYLE_ID) - Number(a.id === DEFAULT_STYLE_ID));
  return all.map((series) => ({
    id: series.id,
    label: series.label,
    choices: series.variants.map((variant) => ({ style: series.id, variant })),
  }));
}

export interface Registry {
  styles: StyleGroup[];
  families: readonly ShapeFamily[];
  faces: readonly FaceStyle[];
  stateGroups: StateGroup[];
  /** The listed cast, lead first: the exhibit's cards. */
  cast: readonly CharacterPreset[];
}

export const buildRegistry = (): Registry => ({
  styles: buildStyleGroups(),
  families: SHAPE_FAMILIES,
  faces: FACE_STYLES,
  stateGroups: buildStateGroups(),
  cast: CAST,
});
