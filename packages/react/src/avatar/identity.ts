import {
  autoColorForKey,
  autoNoseForKey,
  autoShapeForKey,
  castMember,
  type CastId,
  type CharacterState,
  type ColorId,
  type FaceStyle,
  type NoseId,
  type ShapeId,
} from '@aora-bot/engine';
import { characterStateForActivity, isKnownActivity } from '../activity/catalog.js';

/** The minimum an application has to tell the kit about a character. */
export interface AgentLike {
  id: string;
  name?: string;
  /** Explicit shape. Derived from `preset`, then from `id`, when absent. */
  shape?: ShapeId;
  /** Explicit colour. Derived from `preset`, then from `id`, when absent. */
  color?: ColorId;
  /** Face style. Derived from `preset` when absent; defaults to `cute`. */
  face?: FaceStyle;
  /** Nose for the line face. Derived from `preset`, then from `id`, when absent. */
  nose?: NoseId | null;
  /** A named character from the cast, supplying shape and colour together. */
  preset?: CastId;
  /** A user-supplied picture, which takes precedence over the character. */
  pictureUrl?: string;
  /** Members, when this represents a group rather than an individual. */
  members?: AgentLike[];
}

/**
 * Resolve an agent's appearance.
 *
 * Explicit fields win, then the cast preset, then a deterministic hash of the
 * id. The fallback is deterministic rather than random, so an application
 * can show a consistent character for every user without storing a single
 * byte of avatar state. Two clients, two sessions and a server render all
 * agree.
 */
export const agentShape = (agent: AgentLike): ShapeId =>
  agent.shape ?? castMember(agent.preset)?.shape ?? autoShapeForKey(agent.id);
export const agentColor = (agent: AgentLike): ColorId =>
  agent.color ?? castMember(agent.preset)?.color ?? autoColorForKey(agent.id);
export const agentFace = (agent: AgentLike): FaceStyle =>
  agent.face ?? castMember(agent.preset)?.face ?? 'cute';
/** The agent's nose, or `null` unless its face is the line face. */
export const agentNose = (agent: AgentLike): NoseId | null => {
  if (agentFace(agent) !== 'line') return null;
  if (agent.nose !== undefined) return agent.nose;
  return castMember(agent.preset)?.nose ?? autoNoseForKey(agent.id);
};
export const hasPicture = (agent: AgentLike): boolean => Boolean(agent.pictureUrl);
export const isGroup = (agent: AgentLike): boolean => (agent.members?.length ?? 0) > 0;

export const AVATAR_SIZES = { xs: 16, sm: 22, md: 28, lg: 36, xl: 72 } as const;
export type AvatarSize = keyof typeof AVATAR_SIZES;

/** Runtime facts an application already tracks, mapped to a character state. */
export interface AgentActivity {
  running?: boolean;
  composing?: boolean;
  awaitingUser?: boolean;
  /** Free-form verb, matched against the activity catalogue. */
  activity?: string;
}

/**
 * Resolve what an agent is doing to a state.
 *
 * `awaitingUser` wins outright: everything else describes the agent working,
 * and an agent that is blocked on a person is not working whatever else is
 * still running. After that a recognised verb beats the booleans, because it
 * is strictly more specific — `running: true` says "busy" while
 * `activity: 'search'` says what it is busy with. An unrecognised verb is
 * ignored rather than treated as generic work, so a host that sends its own
 * vocabulary still gets the answer its booleans imply.
 */
export function characterStateForAgent(activity: AgentActivity = {}): CharacterState {
  if (activity.awaitingUser) return 'waiting';
  if (isKnownActivity(activity.activity)) return characterStateForActivity(activity.activity);
  if (activity.composing) return 'writing';
  if (activity.running) return 'working';
  return 'idle';
}
