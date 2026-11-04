// Core
export { CharacterMark, mapPointerToGaze } from './mark/CharacterMark.js';
export type { CharacterMarkProps, CharacterHandle } from './mark/CharacterMark.js';
export { CharacterMarkMirror } from './mark/CharacterMarkMirror.js';
export type { CharacterMarkMirrorProps } from './mark/CharacterMarkMirror.js';

// Appearance defaults
export { AppearanceProvider, useAppearance } from './appearance/AppearanceProvider.js';
export type { AppearanceProviderProps, MarkAppearance } from './appearance/AppearanceProvider.js';

// Shared stage
export { MarkStageProvider, StagedMark, useMarkStage, STAGE_SOURCE_PX } from './stage/MarkStage.js';
export type {
  MarkStageProviderProps,
  StagedMarkProps,
  Appearance,
  StageStatus,
  StageContextValue,
} from './stage/MarkStage.js';
export {
  useMarkSettle,
  usePokeCycle,
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
export { AgentAvatar } from './avatar/AgentAvatar.js';
export type { AgentAvatarProps } from './avatar/AgentAvatar.js';
export {
  AvatarStack,
  GroupAvatar,
  STACK_MAX_VISIBLE,
  STACK_OVERLAP,
  layoutAvatarStack,
  stackMetrics,
  stackMetricsForPx,
  participantsFromMembers,
} from './avatar/AvatarStack.js';
export type {
  AvatarStackProps,
  GroupAvatarProps,
  StackLayout,
  StackLayoutOptions,
  StackMetrics,
  Participants,
} from './avatar/AvatarStack.js';
export { UnreadBadge, AvatarStatusDot, WorkingBadge, UNREAD_BADGE_CAP } from './avatar/AvatarChrome.js';
export type {
  UnreadBadgeProps,
  AvatarStatusDotProps,
  WorkingBadgeProps,
  StatusTone,
} from './avatar/AvatarChrome.js';
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
export { CharacterPicker, PICKER_MARK_PX } from './picker/CharacterPicker.js';
export type { CharacterPickerProps } from './picker/CharacterPicker.js';
export { AgentCharacterPicker } from './picker/AgentCharacterPicker.js';
export type { AgentCharacterPickerProps, CharacterChoice } from './picker/AgentCharacterPicker.js';
export { CompactCharacterPicker } from './picker/CompactCharacterPicker.js';
export type { CompactCharacterPickerProps } from './picker/CompactCharacterPicker.js';

// HUD
export { HudPlate } from './hud/HudPlate.js';
export type { HudPlateProps, HudLevel, HudPlacement } from './hud/HudPlate.js';
export { AgentHud } from './hud/AgentHud.js';
export type { AgentHudProps } from './hud/AgentHud.js';
export { useHudSpec, useAgentHud } from './hud/useHudSpec.js';

// Avatar editor
export { AvatarEditor, AVATAR_PREVIEW_PX } from './editor/AvatarEditor.js';
export type { AvatarEditorProps, AvatarDraft, AvatarEditorTab } from './editor/AvatarEditor.js';
export { AvatarTrigger } from './editor/AvatarTrigger.js';
export type { AvatarTriggerProps } from './editor/AvatarTrigger.js';
export { EditableAvatar } from './editor/EditableAvatar.js';
export type { EditableAvatarProps } from './editor/EditableAvatar.js';
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
  ActivityMark,
  GroupActivityMark,
  useCycle,
  ACTIVITY_MARK_PX,
  GROUP_MARK_PX,
  GROUP_CYCLE_MS,
  GROUP_INK_MS,
} from './activity/ActivityMark.js';
export type {
  ActivityMarkProps,
  GroupActivityMarkProps,
  ActivityLabelMode,
  ActivityMode,
} from './activity/ActivityMark.js';
export {
  useActivityPresence,
  useSpawnEntrance,
  resetSpawnEntrances,
  ACTIVITY_EXIT_MS,
  SPAWN_STATE,
} from './activity/presence.js';
export type { ActivityPresence, SpawnEntrance } from './activity/presence.js';
export { ActivityTicker } from './activity/ActivityTicker.js';
export type { ActivityTickerProps } from './activity/ActivityTicker.js';
export {
  TOOL_ACTIVITIES,
  ACTIVITY_LABELS,
  DEFAULT_ACTIVITY,
  activityFromTool,
  activityLabelForState,
  characterStateForActivity,
  isKnownActivity,
} from './activity/catalog.js';
export type { ActivityDescriptor } from './activity/catalog.js';

// Class name joiner, shared with `@aora-bot/surfaces`
export { cx } from './utils/cx.js';

// Effects
export { ConfettiLayer } from './effects/ConfettiLayer.js';
export type { ConfettiLayerProps, ConfettiHandle } from './effects/ConfettiLayer.js';

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

// Locale
export { LocaleProvider, useLocale, useLabel, LOCALES, enUS, zhCN } from './locale/index.js';
export type { LocaleProviderProps, Locale, LocaleId, LocaleKey, Labels } from './locale/index.js';

// Re-exported engine surface, so consumers need only one dependency
export {
  // Identifiers and tables
  SHAPE_IDS,
  SHAPE_FAMILIES,
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
  castMember,
  isCastId,
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
