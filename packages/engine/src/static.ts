/**
 * Server-safe subset.
 *
 * Importing this entry point pulls in shape generation, palette and static SVG
 * rendering, but never the animation runtime. Nothing here touches `window`,
 * `document` or `requestAnimationFrame`, so it is safe in a React Server
 * Component, during static site generation, or in a worker.
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
  COLOR_IDS,
  AUTO_SHAPE_POOL,
  FACE_STYLES,
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
  PartTone,
  ShapePart,
  ColorId,
  ShapeDef,
  FaceStyle,
  NoseId,
  MouthId,
  CuteMouthId,
  FxKind,
  MouthSpec,
} from './core/types.js';
export { kaomoji } from './render/kaomoji/table.js';
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
export { CAST, CAST_IDS, castMember, isCastId } from './core/cast.js';
export type { CharacterPreset, CastId } from './core/cast.js';
