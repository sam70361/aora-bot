// Types and constants
export {
  SHAPE_SPACE,
  CENTER,
  VIEWBOX,
  VIEWBOX_STR,
  SHAPE_IDS,
  SHAPE_FAMILIES,
  ALL_SHAPE_IDS,
  ALL_SHAPE_FAMILIES,
  CORE_SHAPE_IDS,
  ALL_COLOR_IDS,
  CORE_COLOR_IDS,
  UNLISTED_COLOR_IDS,
  isListedShape,
  PART_TONES,
  COLOR_IDS,
  ASSIGNABLE_COLOR_IDS,
  AUTO_SHAPE_POOL,
  DEFAULT_FACE_TUNE,
  DEFAULT_POSE,
  DEFAULT_POSE_HOME,
  FACE_STYLES,
  DRAWN_FACE_STYLES,
  isDrawnFace,
  isFaceStyle,
  isCuteFamily,
  NOSE_IDS,
  MOUTH_IDS,
  CUTE_MOUTH_IDS,
  FX_KINDS,
} from './core/types.js';
export type {
  Point,
  Ring,
  ShapeId,
  ShapeFamily,
  ShapeFamilyId,
  AnyShapeFamily,
  AnyShapeFamilyId,
  CoreShapeId,
  CoreColorId,
  PartTone,
  PartColor,
  PartMotionRef,
  ShapePart,
  ColorId,
  Pose,
  PoseHome,
  FaceTune,
  FaceBox,
  ShapeDef,
  FaceStyle,
  DrawnFaceStyle,
  NoseId,
  MouthId,
  CuteMouthId,
  FxKind,
  MouthSpec,
} from './core/types.js';

// Shapes
export {
  getShape,
  allShapes,
  defineShape,
  defineShapeWithProps,
  getShapeScale,
  getEyeScaleForShape,
} from './shapes/registry.js';
export type { PropPart } from './shapes/registry.js';
export { fitFace } from './shapes/fit-face.js';
export * as shapeGenerators from './shapes/generators.js';

// Cast
export { CAST, CAST_IDS, ALL_CAST_IDS, CORE_CAST_IDS, allCast, castMember, isCastId } from './core/cast.js';

// Themes
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

// Palette
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
  INK_GRADIENT_ANGLE,
} from './core/palette.js';
export type { Swatch, InkGradient } from './core/palette.js';
export { LEAF_COLOR, LEAF_COLOR_ON_GREEN, getLeafColor } from './core/leaf.js';

// Face
export {
  EYE_TOPOLOGIES,
  EYE_TOPOLOGY_IDS,
  CUTE_EYE_TOPOLOGIES,
  CUTE_EYE_IDS,
  eyePairFor,
} from './face/topologies.js';
export type {
  EyeSpec,
  EyePair,
  EyeExtra,
  EyeTopologyId,
  CuteEyeId,
  ExpressionId,
} from './face/topologies.js';
export { morphEye, morphEyePair, eyeOutline } from './face/morph.js';
export { computeEyePlacement, computeFacePlacement, computeFaceGeometry } from './face/placement.js';
export type {
  EyeShape,
  FeatureShape,
  FaceGeometry,
  EyePlacement,
  FacePlacement,
  PlacedEye,
  PlacedFeature,
  PlacementOptions,
} from './face/placement.js';
export {
  FACE_DESIGNS,
  getFaceDesign,
  defineFace,
  definedFaces,
  definedFaceLabel,
  drawnPairFor,
  drawnFaceText,
  morphDrawnPair,
  EYE_CLASSES,
  CUTE_EYE_CLASSES,
  FACE_PAINTS,
  FACE_ACCENTS,
} from './face/drawn/index.js';
export type {
  AnyFaceDesign,
  FaceDesign,
  DrawnEye,
  DrawnPair,
  EyeClass,
  FaceLayer,
  FacePaint,
  FaceAccent,
  DrawnFaceGeometry,
  DrawnShape,
} from './face/drawn/index.js';
export { FACE_KIT } from './face/drawn/kit.js';
export type { FaceKit } from './face/drawn/kit.js';
export type { EyeContext, DrawnLayout } from './face/drawn/types.js';
export {
  MOUTHS,
  NOSES,
  LINE_WEIGHT,
  LINE_WEIGHT_RANGE,
  LINE_FACE_TUNE,
  NOSE_DROP,
  MOUTH_DROP,
  getMouth,
  CUTE_MOUTHS,
  getCuteMouth,
  mouthSpecFor,
  morphMouth,
  mouthOutline,
  nosePolyline,
  resolveLineWeight,
  isMouthId,
  isNoseId,
} from './face/features.js';

// Motion
export {
  CHARACTER_STATES,
  STATE_GROUPS,
  STATE_GROUP_IDS,
  STATE_EYE_TOPOLOGIES,
  STATE_EYE_SWITCH_MS,
  STATE_BLINK_MS,
  STATE_FACE_TUNE,
  STATE_GAZE,
  STATE_ENTRY_EFFECTS,
  STATE_MOUTH,
  STATE_CUTE_EYES,
  STATE_CUTE_MOUTH,
  STATE_BLUSH,
  STATE_FX,
  STATE_MOUTH_TALK,
  STATE_SETTLE_TO,
  ANTIC_STATES,
  IDLE_STATE,
  faceTuneForState,
  gazeForState,
  mouthForState,
  settleForState,
  isCharacterState,
} from './motion/states.js';
export type { CharacterState, StateGroup, StateGroupId, EntryEffect } from './motion/states.js';
export {
  BELT_KINDS,
  STATE_BELT,
  BELT_CORE_SIZE,
  BELT_GLYPH_SIZE,
  beltForState,
  blendBeltFrames,
  evaluateBelt,
  beltBodyRing,
} from './motion/belts.js';
export type { BeltKind, BeltFrame, BeltDot, BeltRing, BeltGlyph } from './motion/belts.js';
export { pencilGlyphPath, bangGlyphPath } from './motion/glyphs.js';
export { FX_COLORS, evaluateFx } from './motion/fx.js';
export type { FxFrame, FxItem, FxAnchor } from './motion/fx.js';
export { behaviourFor, createImpulseBehaviour } from './motion/behaviours.js';
export type { Behaviour, BodyTargets, BehaviourContext } from './motion/behaviours.js';

// Maths
export { PathBuilder, smoothClosedPath } from './math/path-builder.js';
export {
  spring,
  stepSpring,
  settleSpring,
  springSettleTime,
  springPosition,
  springToLinearEasing,
} from './math/spring.js';
export type { Spring } from './math/spring.js';
export { projectOnSphere, poseMatrix, tangentTransform, tangentTransformString } from './math/pose.js';
export type { Mat3, ProjectedPoint, TangentTransform } from './math/pose.js';
export { roundTo } from './math/round.js';
export { polylinePath, polylinesPath } from './math/polyline.js';
export { fnv1a32, mulberry32, autoColorForKey, autoShapeForKey, autoNoseForKey } from './math/hash.js';
export {
  clamp,
  lerp,
  frameLerp,
  easeInOutCubic,
  easeOutCubic,
  easeOutQuart,
  smoothstep,
} from './math/easing.js';

// HUD
export { HUD_KINDS, HUD_KIND_LABELS, isHudKind, isHudSpec } from './hud/spec.js';
export type { HudKind, HudSpec, SyncState, VoiceMode } from './hud/spec.js';
export { evaluateHud, evaluateHudPrimitives, HUD_PRINT_MIN_PX, HUD_FONT } from './hud/dials.js';
export type {
  HudStroke,
  HudPrimitives,
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

// Particles
export {
  createParticleSystem,
  particleOpacity,
  particleSize,
  ribbonColor,
  ribbonRuns,
  CONFETTI_COLORS,
} from './particles.js';
export type { Particle, ParticleSystem, Trail, TrailPoint, ParticleUpdate } from './particles.js';
export { createConfettiController } from './effects/confetti-controller.js';
export type { ConfettiController, ConfettiControllerOptions } from './effects/confetti-controller.js';

// Simulation: what a character is doing, with no DOM and no markup
export { createSimulation } from './sim/simulation.js';
export type { Simulation, SimulationOptions, Gaze, Scheduler, StillOptions } from './sim/simulation.js';
export { particleFrames, trailFrames } from './sim/particle-frames.js';
export type {
  FrameSnapshot,
  BodyFrame,
  PartFrame,
  FaceFrame,
  BeltSnapshot,
  BeltRingFrame,
  HudSnapshot,
  BadgeFrame,
  ParticleFrame,
  TrailFrame,
} from './sim/snapshot.js';

// Renderers and style series
export type {
  LiveRenderer,
  LiveRendererContext,
  LiveRendererFactory,
  StaticRenderContext,
  StaticRenderer,
} from './render/renderer.js';
export {
  DEFAULT_STYLE_ID,
  STYLE_IDS,
  defineStyle,
  defineVectorMedium,
  getStyle,
  hasStyle,
  listStyles,
  allVariants,
  acceptsVariant,
  paramsForVariant,
  resolveStyleOptions,
  validateStyleOptions,
} from './styles/index.js';
export type {
  BuiltinStyleId,
  StyleDefinition,
  StyleId,
  StyleOptionIssue,
  StyleParam,
} from './styles/index.js';
export type { StyleVariant } from './core/options.js';

// The kaomoji series' plain-text form
export {
  kaomoji,
  faceText,
  wrapperFor,
  STATE_FACES,
  STATE_TAILS,
  SHAPE_WRAPPERS,
} from './render/kaomoji/table.js';
export type { Wrapper } from './render/kaomoji/table.js';

// Agent integration (also available from the `/agent` subpath with no runtime)
export * from './agent.js';

// Runtime
export { createCharacter, mapPointerToGaze } from './render/character.js';
export type {
  CharacterController,
  CharacterOptions,
  CharacterVariant,
  InkPaint,
} from './render/character.js';
export { ticker, prefersReducedMotion, onReducedMotionChange } from './ticker.js';
export type { TickHandler } from './ticker.js';
export { autoPause } from './auto-pause.js';
export type { AutoPauseOptions, AutoPauseHandle, AutoPauseTarget } from './auto-pause.js';

// Static rendering (also available from the `/static` subpath with no runtime)
export {
  renderStaticSvg,
  renderStaticSvgDataUrl,
  renderAvatarDataUrl,
  shapeMaskImage,
  shapeRingMaskImage,
} from './render/static-svg.js';
export type { StaticColorScheme, StaticOptions } from './render/static-svg.js';
