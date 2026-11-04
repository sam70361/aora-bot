import { DEFAULT_TOOL_STATE, TOOL_STATES, type CharacterState } from '@aora-bot/engine';
import type { LocaleKey } from '../locale/index.js';

/**
 * Tools an agent might be running, and how the character should react.
 *
 * The point of the indirection is that applications speak in tools ("the model
 * called `web_search`") while the character speaks in states. The tool → state
 * table lives in the engine (`TOOL_STATES`) so a Node relay and this
 * component agree; this layer only adds the label to show beside the mark.
 */
export interface ActivityDescriptor {
  /** Short verb shown next to the character. */
  labelKey: LocaleKey;
  /** Animation state to adopt. */
  state: CharacterState;
}

/** The verb to show for each state a tool can put the character in. */
export const ACTIVITY_LABELS: Partial<Record<CharacterState, LocaleKey>> = {
  thinking: 'activity.thinking',
  working: 'activity.working',
  searching: 'activity.searching',
  reading: 'activity.reading',
  writing: 'activity.writing',
  uploading: 'activity.uploading',
  waiting: 'activity.waiting',
  listening: 'activity.listening',
  composing: 'activity.typing',
  sending: 'activity.sending',
  loading: 'activity.loading',
  alerting: 'activity.error',
  refusing: 'activity.refusing',
  celebrate: 'activity.done',
};

const labelFor = (state: CharacterState): LocaleKey => ACTIVITY_LABELS[state] ?? 'activity.working';

export const TOOL_ACTIVITIES: Record<string, ActivityDescriptor> = Object.fromEntries(
  Object.entries(TOOL_STATES).map(([tool, state]) => [tool, { labelKey: labelFor(state), state }]),
);

export const DEFAULT_ACTIVITY: ActivityDescriptor = {
  labelKey: labelFor(DEFAULT_TOOL_STATE),
  state: DEFAULT_TOOL_STATE,
};

/**
 * Whether the catalogue recognises a verb, rather than falling back to work.
 *
 * `characterStateForActivity` always answers, which is right at the point of
 * rendering and useless to a caller deciding whether the verb is worth
 * preferring over the facts it already has. `hasOwn` because the verb arrives
 * off the wire and `"constructor"` would otherwise find a function.
 */
export const isKnownActivity = (tool: string | null | undefined): boolean =>
  tool != null && tool !== '' && Object.hasOwn(TOOL_ACTIVITIES, tool);

export const activityFromTool = (tool: string | null | undefined): ActivityDescriptor =>
  (isKnownActivity(tool) ? TOOL_ACTIVITIES[tool!] : undefined) ?? DEFAULT_ACTIVITY;

export const characterStateForActivity = (tool: string | null | undefined): CharacterState =>
  activityFromTool(tool).state;

/** The label for a state, for hosts that already know the state and only need the words. */
export const activityLabelForState = (state: CharacterState): LocaleKey => labelFor(state);
