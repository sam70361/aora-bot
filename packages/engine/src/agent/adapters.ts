import type { CharacterState } from '../motion/states.js';
import { emotionIdForState, stateForEmotion, type EmotionId } from './protocol.js';

/**
 * An adapter maps one tool's event vocabulary onto the protocol.
 *
 * Pure data. Adding support for another agent is a new object here, not new
 * logic anywhere: the channel looks the adapter up by `id`, translates the
 * event name through `events`, and the arbiter takes it from there. Values
 * are protocol ids rather than state names so the tables read the same as
 * the wire format they produce.
 */
export interface AgentAdapter {
  id: string;
  name: string;
  /** Tool event name → protocol id. */
  events: Record<string, EmotionId>;
  /** What the tool can be relied on to send. The arbiter degrades gracefully without `sessionEnd`. */
  capabilities: { sessionEnd: boolean; subagent: boolean };
}

/** Claude Code hook events. */
export const claudeCode: AgentAdapter = {
  id: 'claude-code',
  name: 'Claude Code',
  events: {
    SessionStart: '02',
    UserPromptSubmit: '30',
    PreToolUse: '40',
    PostToolUse: '32',
    PostToolUseFailure: '34',
    Notification: '38',
    Stop: '33',
    SessionEnd: '00',
  },
  capabilities: { sessionEnd: true, subagent: true },
};

/** Cursor agent hook events. */
export const cursor: AgentAdapter = {
  id: 'cursor',
  name: 'Cursor',
  events: {
    sessionStart: '02',
    userMessage: '30',
    planning: '30',
    toolCall: '40',
    fileEdit: '32',
    shellCommand: '32',
    webSearch: '36',
    error: '34',
    awaitingApproval: '38',
    responding: '39',
    taskComplete: '33',
    sessionEnd: '00',
  },
  capabilities: { sessionEnd: true, subagent: false },
};

/**
 * Generic tool names, for hosts that report which tool is running rather
 * than which lifecycle event fired. This is the table `ActivityBadge` reads.
 */
export const TOOL_STATES: Record<string, CharacterState> = {
  search: 'searching',
  web_search: 'searching',
  grep: 'searching',
  glob: 'searching',
  browse: 'reading',
  fetch: 'reading',
  read_file: 'reading',
  read: 'reading',
  write_file: 'writing',
  write: 'writing',
  edit: 'writing',
  str_replace: 'writing',
  run: 'working',
  shell: 'working',
  bash: 'working',
  terminal: 'working',
  upload: 'uploading',
  think: 'thinking',
  plan: 'thinking',
  ask: 'listening',
  wait: 'waiting',
};

export const DEFAULT_TOOL_STATE: CharacterState = 'working';

/** State for a tool name; unknown tools are "working". */
export const stateForTool = (tool: string | null | undefined): CharacterState =>
  (tool ? TOOL_STATES[tool] : undefined) ?? DEFAULT_TOOL_STATE;

export const emotionIdForTool = (tool: string | null | undefined): EmotionId =>
  emotionIdForState(stateForTool(tool));

/**
 * The verbs a product surface uses to say what an agent is doing.
 *
 * `TOOL_STATES` answers "which tool is running"; this answers "what would
 * you tell the user it is doing", which is the label already on screen next
 * to the character. Keeping the two tables separate means a host that
 * renames a tool does not have to touch the character, and a host that has
 * only the sentence — "Running commands…" — can still drive one.
 */
export const ACTIVITY_VERB_IDS = [
  'thinking',
  'searching',
  'browsing',
  'reading',
  'connecting',
  'writing',
  'coding',
  'running-commands',
  'using-computer',
  'working',
  'generating',
  'messaging',
  'waiting',
  'sending',
  'uploading',
  'dictating',
] as const;

export type ActivityVerb = (typeof ACTIVITY_VERB_IDS)[number];

export const ACTIVITY_VERBS: Record<ActivityVerb, CharacterState> = {
  thinking: 'thinking',
  searching: 'searching',
  // Browsing is searching with a page in front of it; the scanning eyes read
  // better than the reading ones, which look settled.
  browsing: 'searching',
  reading: 'reading',
  connecting: 'loading',
  writing: 'writing',
  coding: 'writing',
  'running-commands': 'working',
  'using-computer': 'working',
  working: 'working',
  generating: 'loading',
  messaging: 'messaging',
  waiting: 'waiting',
  sending: 'sending',
  uploading: 'uploading',
  dictating: 'dictating',
};

/**
 * State for an activity verb; anything unrecognised is generic work.
 *
 * `hasOwn` rather than a plain lookup: the verb comes off the wire, and
 * `"constructor"` would otherwise find something on `Object.prototype` and
 * hand back a function where a state was expected.
 */
export const stateForActivity = (verb: string | null | undefined): CharacterState =>
  verb && Object.hasOwn(ACTIVITY_VERBS, verb) ? ACTIVITY_VERBS[verb as ActivityVerb] : DEFAULT_TOOL_STATE;

/** What a roster row knows about one agent. */
export interface RosterFacts {
  running?: boolean;
  composing?: boolean;
  activity?: string | null;
}

/** Where the character is being drawn. */
export type RosterSurface = 'list' | 'chat' | 'avatar';

/**
 * Resolve a roster row to a state.
 *
 * The surface matters because the same facts want different answers in
 * different places. In a chat the composing state is the point — the reply
 * is being written in front of you. In a list of twenty agents, composing
 * comes and goes every few hundred milliseconds, and twenty characters
 * flicking between two faces is noise, so an avatar stays idle until there
 * is something worth showing.
 */
export function characterStateForRoster(facts: RosterFacts, surface: RosterSurface): CharacterState {
  if (facts.composing && surface !== 'avatar') return 'composing';
  if (facts.running) return facts.activity ? stateForActivity(facts.activity) : DEFAULT_TOOL_STATE;
  return 'idle';
}

export const AGENT_ADAPTERS: readonly AgentAdapter[] = [claudeCode, cursor];

const BY_ID = new Map(AGENT_ADAPTERS.map((a) => [a.id, a]));

export const getAdapter = (id: string | null | undefined): AgentAdapter | null =>
  id ? (BY_ID.get(id) ?? null) : null;

/** Translate a tool event through its adapter. `null` when either is unknown. */
export function stateForAgentEvent(adapterId: string, event: string): CharacterState | null {
  const id = getAdapter(adapterId)?.events[event];
  return id ? stateForEmotion(id) : null;
}
