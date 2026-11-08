/**
 * Ids and names only (`@aora-bot/engine/labels`).
 *
 * For a page that shows names, not characters: a locale table, a menu, a
 * settings form. Nothing here reaches a shape, a renderer or a theme's art,
 * so it costs a few kilobytes (a test checks). The same exports are in the
 * main and `static` entries.
 */

export {
  SHAPE_IDS,
  SHAPE_FAMILIES,
  ALL_SHAPE_IDS,
  ALL_SHAPE_FAMILIES,
  CORE_SHAPE_IDS,
  ALL_COLOR_IDS,
  CORE_COLOR_IDS,
  UNLISTED_COLOR_IDS,
  COLOR_IDS,
  FACE_STYLES,
  DRAWN_FACE_STYLES,
  NOSE_IDS,
  MOUTH_IDS,
  CUTE_MOUTH_IDS,
  FX_KINDS,
} from './core/types.js';
export type {
  ShapeId,
  ShapeFamily,
  ShapeFamilyId,
  AnyShapeFamily,
  AnyShapeFamilyId,
  CoreShapeId,
  CoreColorId,
  ColorId,
  FaceStyle,
  DrawnFaceStyle,
  NoseId,
  MouthId,
  CuteMouthId,
  FxKind,
} from './core/types.js';
export { CHARACTER_STATES, isCharacterState, STATE_GROUPS, STATE_GROUP_IDS } from './motion/states.js';
export type { CharacterState, StateGroup, StateGroupId } from './motion/states.js';
export { HUD_KINDS, HUD_KIND_LABELS, isHudKind } from './hud/spec.js';
export type { HudKind } from './hud/spec.js';
export { THEME_IDS, THEME_MANIFEST } from './themes/manifest.js';
export type { BuiltinThemeId, ThemeManifestEntry, ThemeShapeId } from './themes/manifest.js';
export { themeLabel } from './themes/labels.js';
