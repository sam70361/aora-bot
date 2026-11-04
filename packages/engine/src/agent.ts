/**
 * Agent integration: the emotion protocol, the arbiter, adapters and the
 * state channel.
 *
 * Nothing here touches the DOM or the animation runtime, so it loads in a
 * Node relay script as readily as in the browser. Also re-exported from the
 * main entry.
 */
export {
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
} from './agent/protocol.js';
export type { EmotionDef, EmotionId, EmotionSegmentId, AgentMessage } from './agent/protocol.js';

export { createArbiter, DEFAULT_PRIORITY } from './agent/arbiter.js';
export type {
  Arbiter,
  ArbiterOptions,
  ArbiterUpdate,
  ArbiterResult,
  ArbiterSession,
} from './agent/arbiter.js';

export {
  claudeCode,
  cursor,
  AGENT_ADAPTERS,
  TOOL_STATES,
  DEFAULT_TOOL_STATE,
  ACTIVITY_VERBS,
  ACTIVITY_VERB_IDS,
  getAdapter,
  stateForTool,
  stateForActivity,
  characterStateForRoster,
  emotionIdForTool,
  stateForAgentEvent,
} from './agent/adapters.js';
export type { AgentAdapter, ActivityVerb, RosterFacts, RosterSurface } from './agent/adapters.js';

/**
 * The HUD contract, but not the dials.
 *
 * A relay script needs to be able to say `{ kind: 'progress', value }` and to
 * check that what it received is valid; it has no use for the geometry.
 */
export { HUD_KINDS, HUD_KIND_LABELS, isHudKind, isHudSpec } from './hud/spec.js';
export type { HudKind, HudSpec, SyncState, VoiceMode } from './hud/spec.js';

export {
  normalize,
  normalizeLine,
  openMessageChannel,
  readLineStream,
  streamChunks,
  MESSAGE_TYPE,
} from './agent/channel.js';
export type {
  NormalizeResult,
  NormalizeOptions,
  LineResult,
  ChannelHandlers,
  MessageChannelOptions,
} from './agent/channel.js';

export {
  isSpriteManifest,
  resolveSpriteFrames,
  spriteCoverage,
  SPRITE_FALLBACK_HOPS,
} from './agent/sprite.js';
export type { SpriteManifest, SpriteClip, SpriteCoverage, SpriteCoverageKind } from './agent/sprite.js';
