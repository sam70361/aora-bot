/**
 * Server-safe subset.
 *
 * Importing this entry point pulls in shape generation, palette and static SVG
 * rendering, but never the animation runtime. Nothing here touches `window`,
 * `document` or `requestAnimationFrame`, so it is safe in a React Server
 * Component, during static site generation, or in a worker.
 *
 * A theme's characters, skins and colours are in the theme's own entry:
 * `await loadTheme(id)` (or `installTheme` with
 * `@aora-bot/engine/themes/<id>`) before rendering one, or the render throws
 * `ThemeNotInstalledError`.
 */

export {
  renderStaticSvg,
  renderStaticSvgDataUrl,
  renderAvatarDataUrl,
  shapeMaskImage,
  shapeRingMaskImage,
} from './render/static-svg.js';
export type { StaticColorScheme, StaticOptions } from './render/static-svg.js';

export {
  DEFAULT_STYLE_ID,
  STYLE_IDS,
  getStyle,
  hasStyle,
  listStyles,
  allVariants,
  acceptsVariant,
  resolveStyleOptions,
  validateStyleOptions,
} from './styles/index.js';
export type { StyleDefinition, StyleId, StyleOptionIssue, StyleParam } from './styles/index.js';
export type { FrameSnapshot } from './sim/snapshot.js';
export type { StaticRenderContext, StaticRenderer } from './render/renderer.js';

export { autoColorForKey, autoShapeForKey, autoNoseForKey, fnv1a32, mulberry32 } from './math/hash.js';
export {
  COLOR_SWATCHES,
  getSwatch,
  getSwatchCss,
  getSwatchHex,
  getInkColor,
  getInkColorCss,
  getInkVars,
  getInkGradient,
  getInkGradientFor,
  haloBackground,
} from './core/palette.js';
export { LEAF_COLOR, LEAF_COLOR_ON_GREEN, getLeafColor } from './core/leaf.js';
export { getShape, allShapes, getShapeScale, getEyeScaleForShape } from './shapes/registry.js';
export {
  SHAPE_IDS,
  SHAPE_FAMILIES,
  ALL_SHAPE_IDS,
  ALL_SHAPE_FAMILIES,
  CORE_SHAPE_IDS,
  ALL_COLOR_IDS,
  CORE_COLOR_IDS,
  UNLISTED_COLOR_IDS,
  isListedShape,
  COLOR_IDS,
  AUTO_SHAPE_POOL,
  FACE_STYLES,
  DRAWN_FACE_STYLES,
  DEFAULT_FACE,
  DEFAULT_SHAPE,
  isDrawnFace,
  isCuteFamily,
  NOSE_IDS,
  MOUTH_IDS,
  CUTE_MOUTH_IDS,
  FX_KINDS,
  VIEWBOX_STR,
  CENTER,
} from './core/types.js';
export type {
  ShapeId,
  ShapeFamily,
  ShapeFamilyId,
  AnyShapeFamily,
  AnyShapeFamilyId,
  CoreShapeId,
  CoreColorId,
  PartTone,
  PartColor,
  ShapePart,
  ColorId,
  ShapeDef,
  FaceStyle,
  DrawnFaceStyle,
  NoseId,
  MouthId,
  CuteMouthId,
  FxKind,
  MouthSpec,
} from './core/types.js';
export { kaomoji, faceText } from './render/kaomoji/table.js';
export {
  CHARACTER_STATES,
  isCharacterState,
  STATE_GROUPS,
  STATE_GROUP_IDS,
  STATE_MOUTH,
  STATE_SETTLE_TO,
  mouthForState,
  settleForState,
} from './motion/states.js';
export type { CharacterState, StateGroup, StateGroupId } from './motion/states.js';
export { LINE_WEIGHT, LINE_WEIGHT_RANGE, resolveLineWeight } from './face/features.js';
export { BELT_GLYPH_SIZE } from './motion/belts.js';
export { pencilGlyphPath, bangGlyphPath } from './motion/glyphs.js';
export { HUD_KINDS, HUD_KIND_LABELS, isHudKind, isHudSpec } from './hud/spec.js';
export type { HudKind, HudSpec, SyncState, VoiceMode } from './hud/spec.js';
export { evaluateHud, HUD_PRINT_MIN_PX, HUD_FONT } from './hud/dials.js';
export type {
  HudFrame,
  HudArc,
  HudBar,
  HudTick,
  HudPip,
  HudPath,
  HudGlyph,
  HudContext,
} from './hud/dials.js';
export { formatHud } from './hud/format.js';
export type { HudReading, HudLevel } from './hud/format.js';
export { CAST, CAST_IDS, ALL_CAST_IDS, CORE_CAST_IDS, allCast, castMember, isCastId } from './core/cast.js';
export {
  THEME_IDS,
  THEME_MANIFEST,
  THEME_MEMBER_KINDS,
  ThemeNotInstalledError,
  defineTheme,
  getTheme,
  installTheme,
  isFixed,
  isThemeInstalled,
  listThemes,
  loadTheme,
  loadThemes,
  themeChoices,
  themeDefault,
  themeLabel,
  themeLook,
  themeOwning,
  themesNeeded,
} from './themes/index.js';
export type {
  BuiltinThemeId,
  StyleChoice,
  ThemeDefinition,
  ThemeDimension,
  ThemeLook,
  ThemeManifestEntry,
  ThemeMember,
  ThemeMemberKind,
  ThemeOwnedKind,
  ThemePackage,
  ThemeShapeId,
  ThemeSource,
  ThemeVariant,
} from './themes/index.js';
export type {
  GrainSpec,
  HatchSpec,
  MediumContext,
  MediumDefinition,
  MediumKit,
  MediumPiece,
} from './render/vector/media.js';
export type {
  DecorAnimation,
  DecorGlyph,
  DecorItem,
  DecorLayer,
  DecorPaint,
  DecorSpec,
  DecorTone,
  DecorZone,
  LightnessBand,
  MoodAccent,
  MoodLean,
  MotionEasing,
  MotionGate,
  MotionKey,
  MotionWave,
  PartEmitter,
  PartKeys,
  PartMotion,
  PartSwing,
} from './themes/extras/index.js';
export type { ExtrasKit, ThemeExtras, ThemeExtrasFactory } from './themes/extras-hook.js';
export { MOOD_LEAN, STATE_MOODS, moodOf } from './motion/mood.js';
export type { StateMood } from './motion/mood.js';
export type { CharacterPreset, CastId, CoreCastId, ThemeCastMember } from './core/cast.js';
