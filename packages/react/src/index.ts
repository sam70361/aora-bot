// Core
export { CharacterMark, mapPointerToGaze } from './mark/CharacterMark.js';
export type { CharacterMarkProps, CharacterHandle } from './mark/CharacterMark.js';
export { CharacterMarkMirror } from './mark/CharacterMarkMirror.js';
export type { CharacterMarkMirrorProps } from './mark/CharacterMarkMirror.js';

// Appearance defaults
export { AppearanceProvider, useAppearance } from './appearance/AppearanceProvider.js';
export type { AppearanceProviderProps, MarkAppearance } from './appearance/AppearanceProvider.js';

// Shared stage
export {
  CharacterStageProvider,
  StagedMark,
  useCharacterStage,
  STAGE_SOURCE_PX,
} from './stage/CharacterStage.js';
export type {
  CharacterStageProviderProps,
  StagedMarkProps,
  Appearance,
  StageStatus,
  StageContextValue,
} from './stage/CharacterStage.js';
export {
  useMarkSettle,
  useTapCycle,
  useDeadline,
  useReducedMotion,
  SETTLE_MS,
  POKE_COOLDOWN_MS,
} from './stage/hooks.js';
export type { MarkSettleOptions } from './stage/hooks.js';
export {
  useMarkCommands,
  useMarkCommand,
  createMarkCommandRegistry,
  MarkCommandContext,
} from './stage/commands.js';
export type {
  MarkCommands,
  MarkCommandRegistry,
  MarkCommandSnapshot,
  HoldStateOptions,
} from './stage/commands.js';

// Avatars and identity
export { AgentPortrait } from './avatar/AgentPortrait.js';
export type { AgentPortraitProps } from './avatar/AgentPortrait.js';
export {
  AvatarGroup,
  GroupAvatar,
  GROUP_MAX_VISIBLE,
  STACK_OVERLAP,
  layoutAvatarGroup,
  groupMetrics,
  groupMetricsForPx,
  participantsFromMembers,
} from './avatar/AvatarGroup.js';
export type {
  AvatarGroupProps,
  GroupAvatarProps,
  StackLayout,
  StackLayoutOptions,
  StackMetrics,
  Participants,
} from './avatar/AvatarGroup.js';
export { UnreadBadge, AvatarStatusDot, WorkingBadge, UNREAD_BADGE_CAP } from './avatar/AvatarFrame.js';
export type {
  UnreadBadgeProps,
  AvatarStatusDotProps,
  WorkingBadgeProps,
  StatusTone,
} from './avatar/AvatarFrame.js';
export {
  agentShape,
  agentColor,
  agentFace,
  agentNose,
  hasPicture,
  isGroup,
  characterStateForAgent,
  AVATAR_SIZES,
} from './avatar/identity.js';
export type { AgentLike, AgentActivity, AvatarSize } from './avatar/identity.js';

// Pickers
export { CharacterSelector, SELECTOR_MARK_PX } from './picker/CharacterSelector.js';
export type { CharacterSelectorProps } from './picker/CharacterSelector.js';
export { AgentCharacterSelector } from './picker/AgentCharacterSelector.js';
export type { AgentCharacterSelectorProps, CharacterChoice } from './picker/AgentCharacterSelector.js';
export { CompactCharacterSelector } from './picker/CompactCharacterSelector.js';
export type { CompactCharacterSelectorProps } from './picker/CompactCharacterSelector.js';

// HUD
export { HudPlate } from './hud/HudPlate.js';
export type { HudPlateProps, HudLevel, HudPlacement } from './hud/HudPlate.js';
export { AgentHud } from './hud/AgentHud.js';
export type { AgentHudProps } from './hud/AgentHud.js';
export { useHudSpec, useAgentHud } from './hud/useHudSpec.js';

// Avatar studio
export { AvatarStudio, AVATAR_PREVIEW_PX } from './editor/AvatarStudio.js';
export type { AvatarStudioProps, AvatarDraft, AvatarStudioTab } from './editor/AvatarStudio.js';
export { AvatarButton } from './editor/AvatarButton.js';
export type { AvatarButtonProps } from './editor/AvatarButton.js';
export { AvatarField } from './editor/AvatarField.js';
export type { AvatarFieldProps } from './editor/AvatarField.js';
export {
  fitImage,
  coverScale,
  clampPan,
  clampZoom,
  panLimit,
  exportPlacement,
  cropToDataUrl,
  readImageFile,
  loadImage,
  MAX_UPLOAD_BYTES,
  MAX_SOURCE_PX,
  CROP_STAGE_PX,
  EXPORT_PX,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP,
} from './editor/crop.js';
export type { CropView, CropRequest, ImageSource, ReadResult, LoadedImage } from './editor/crop.js';

// Activity
export {
  ActivityBadge,
  GroupActivityBadge,
  useCycle,
  ACTIVITY_BADGE_PX,
  GROUP_BADGE_PX,
  GROUP_CYCLE_MS,
  GROUP_INK_MS,
} from './activity/ActivityBadge.js';
export type {
  ActivityBadgeProps,
  GroupActivityBadgeProps,
  ActivityLabelMode,
  ActivityMode,
} from './activity/ActivityBadge.js';
export {
  useActivityStatus,
  useArrival,
  resetSpawnEntrances,
  ACTIVITY_EXIT_MS,
  SPAWN_STATE,
} from './activity/presence.js';
export type { ActivityPresence, SpawnEntrance } from './activity/presence.js';
export { ActivityLine } from './activity/ActivityLine.js';
export type { ActivityLineProps } from './activity/ActivityLine.js';
export {
  TOOL_ACTIVITIES,
  ACTIVITY_LABELS,
  DEFAULT_ACTIVITY,
  activityForTool,
  activityLabelForState,
  characterStateForActivity,
  isKnownActivity,
} from './activity/catalog.js';
export type { ActivityDescriptor } from './activity/catalog.js';

// Class name joiner, shared with `@aora-bot/surfaces`
export { cx } from './utils/cx.js';

// Effects
export { CelebrationLayer } from './effects/CelebrationLayer.js';
export type { CelebrationLayerProps, ConfettiHandle } from './effects/CelebrationLayer.js';

// Agent integration
export { AgentStateProvider, useArbiter, useAgentState, useOptionalAgentState } from './agent/AgentState.js';
export type { AgentStateProviderProps, AgentStateValue, UseArbiterOptions } from './agent/AgentState.js';
export { useStateChannel, useEventSourceChannel } from './agent/channels.js';
export type {
  UseStateChannelOptions,
  UseEventSourceChannelOptions,
  EventSourceStatus,
} from './agent/channels.js';
export { useIdleSleep } from './agent/useIdleSleep.js';
export type { UseIdleSleepOptions, IdleSleep, IdlePhase } from './agent/useIdleSleep.js';

// Sprites
export { SpriteMark, loadSpriteManifest, useSpriteManifest } from './sprite/SpriteMark.js';
export type { SpriteMarkProps, SpriteFallback, SpriteManifestStatus } from './sprite/SpriteMark.js';

// Themes
export { useThemesReady } from './themes/useThemes.js';
export type { ThemedIds } from './themes/useThemes.js';

// Locale
export { LocaleProvider, useLocale, useLabel, LOCALES, enUS, zhCN } from './locale/index.js';
export type { LocaleProviderProps, Locale, LocaleId, LocaleKey, Labels } from './locale/index.js';

// Re-exported engine surface, so consumers need only one dependency
export {
  // Identifiers and tables
  SHAPE_IDS,
  SHAPE_FAMILIES,
  ALL_SHAPE_IDS,
  ALL_SHAPE_FAMILIES,
  CORE_SHAPE_IDS,
  ALL_COLOR_IDS,
  UNLISTED_COLOR_IDS,
  isListedShape,
  getLeafColor,
  COLOR_IDS,
  ASSIGNABLE_COLOR_IDS,
  AUTO_SHAPE_POOL,
  DEFAULT_FACE_TUNE,
  DEFAULT_POSE,
  DEFAULT_POSE_HOME,
  VIEWBOX,
  VIEWBOX_STR,
  FACE_STYLES,
  NOSE_IDS,
  MOUTH_IDS,
  MOUTHS,
  NOSES,
  STATE_MOUTH,
  mouthForState,
  autoNoseForKey,
  COLOR_SWATCHES,
  CHARACTER_STATES,
  STATE_GROUPS,
  STATE_EYE_TOPOLOGIES,
  STATE_EYE_SWITCH_MS,
  STATE_BLINK_MS,
  STATE_FACE_TUNE,
  EYE_TOPOLOGIES,
  EYE_TOPOLOGY_IDS,
  BELT_KINDS,
  BELT_CORE_SIZE,
  STATE_BELT,
  STATE_ENTRY_EFFECTS,
  STATE_SETTLE_TO,
  settleForState,
  IDLE_STATE,
  BELT_GLYPH_SIZE,
  blendBeltFrames,
  pencilGlyphPath,
  bangGlyphPath,
  LINE_WEIGHT,
  LINE_WEIGHT_RANGE,
  resolveLineWeight,
  // HUD
  HUD_KINDS,
  HUD_KIND_LABELS,
  isHudKind,
  isHudSpec,
  evaluateHud,
  formatHud,
  HUD_PRINT_MIN_PX,
  HUD_FONT,
  // Cast
  CAST,
  CAST_IDS,
  ALL_CAST_IDS,
  allCast,
  castMember,
  isCastId,
  // Themes
  THEME_IDS,
  THEME_MANIFEST,
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
  // Protocol
  EMOTIONS,
  EMOTION_IDS,
  EMOTION_SEGMENTS,
  SEGMENT_FALLBACK,
  IDLE_EMOTION_ID,
  emotionSegment,
  getEmotion,
  isOneshotEmotion,
  normaliseId,
  stateForEmotion,
  emotionIdForState,
  resolveEmotionId,
  parseAgentMessage,
  createArbiter,
  DEFAULT_PRIORITY,
  AGENT_ADAPTERS,
  claudeCode,
  cursor,
  TOOL_STATES,
  DEFAULT_TOOL_STATE,
  getAdapter,
  stateForTool,
  emotionIdForTool,
  stateForAgentEvent,
  ACTIVITY_VERB_IDS,
  ACTIVITY_VERBS,
  stateForActivity,
  characterStateForRoster,
  normalize,
  normalizeLine,
  openMessageChannel,
  MESSAGE_TYPE,
  isSpriteManifest,
  resolveSpriteFrames,
  spriteCoverage,
  autoPause,
  // Shapes
  getShape,
  allShapes,
  defineShape,
  defineShapeWithProps,
  getShapeScale,
  shapeGenerators,
  // Palette
  getSwatch,
  getSwatchHex,
  getInkColor,
  getInkColorCss,
  getInkGradient,
  haloBackground,
  // Hashing
  fnv1a32,
  autoColorForKey,
  autoShapeForKey,
  // Static rendering
  renderStaticSvg,
  renderStaticSvgDataUrl,
  renderAvatarDataUrl,
  shapeMaskImage,
  shapeRingMaskImage,
  // Motion primitives
  spring,
  stepSpring,
  springPosition,
  springToLinearEasing,
  evaluateBelt,
  beltForState,
  ticker,
  prefersReducedMotion,
  onReducedMotionChange,
  // Runtime, for hosts that drive a character without the component
  createCharacter,
  createConfettiController,
} from '@aora-bot/engine';
export type {
  ShapeId,
  ShapeFamily,
  ShapeFamilyId,
  InkPaint,
  HudKind,
  HudSpec,
  HudContext,
  HudFrame,
  HudArc,
  HudBar,
  HudTick,
  HudPip,
  HudPath,
  HudGlyph,
  HudReading,
  SyncState,
  VoiceMode,
  BeltGlyph,
  ActivityVerb,
  RosterFacts,
  RosterSurface,
  ConfettiController,
  ConfettiControllerOptions,
  ColorId,
  FaceStyle,
  NoseId,
  MouthId,
  MouthSpec,
  CharacterState,
  CharacterVariant,
  CharacterController,
  CharacterOptions,
  PoseHome,
  StaticOptions,
  StaticColorScheme,
  EyeTopologyId,
  EyeSpec,
  EyePair,
  BeltKind,
  BeltFrame,
  ShapeDef,
  Swatch,
  Spring,
  Pose,
  FaceTune,
  CastId,
  CharacterPreset,
  PartColor,
  PropPart,
  ThemeDefinition,
  ThemeDimension,
  ThemeLook,
  ThemeManifestEntry,
  ThemePackage,
  ThemeSource,
  StyleChoice,
  EmotionId,
  EmotionDef,
  EmotionSegmentId,
  EntryEffect,
  Arbiter,
  ArbiterOptions,
  ArbiterUpdate,
  ArbiterResult,
  ArbiterSession,
  AgentAdapter,
  AgentMessage,
  NormalizeResult,
  MessageChannelOptions,
  AutoPauseOptions,
  AutoPauseHandle,
  SpriteManifest,
  SpriteClip,
  SpriteCoverage,
  Ring,
  FaceBox,
  InkGradient,
  StateGroup,
  StateGroupId,
  BeltDot,
  BeltRing,
} from '@aora-bot/engine';
