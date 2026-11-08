import { settleForState, type CharacterState } from '@aora-bot/engine';
import { useEffect, useState } from 'react';
import { useDeadline, useReducedMotion } from '../stage/hooks.js';

/**
 * How long the row stays in the DOM after it has been told to go.
 *
 * Just past the exit animation. Unmounting on the same tick as the flag flips
 * means the row vanishes instead of leaving, which reads as a glitch in a
 * conversation that is otherwise continuous.
 */
export const ACTIVITY_EXIT_MS = 140;

export interface ActivityPresence {
  /** Keep rendering. Stays true through the exit animation. */
  mounted: boolean;
  /** The exit animation is playing; apply the leaving class. */
  leaving: boolean;
}

/** Mount on show, play the exit animation, then unmount. */
export function useActivityStatus(
  visible: boolean,
  { exitMs = ACTIVITY_EXIT_MS }: { exitMs?: number } = {},
): ActivityPresence {
  const reduced = useReducedMotion();
  const delay = reduced ? 0 : exitMs;
  const [shown, setShown] = useState(visible);
  const [lingering, setLingering] = useState(false);

  /*
   * Adjusted during render rather than in an effect. The exit has to be on
   * screen for the frame that hides the row — starting it an effect later
   * means one frame of the row already gone, then an animation of it leaving.
   */
  if (shown !== visible) {
    setShown(visible);
    setLingering(!visible);
  }

  useEffect(() => {
    if (!lingering) return;
    const timer = setTimeout(() => setLingering(false), delay);
    return () => clearTimeout(timer);
  }, [lingering, delay]);

  return { mounted: visible || lingering, leaving: !visible && lingering };
}

/** The state an agent wears on its way in. */
export const SPAWN_STATE: CharacterState = 'spawning';

/**
 * Agents that have already been introduced.
 *
 * Module level rather than context, because "have I seen this agent before"
 * is a fact about the session, not about a subtree. A row that unmounts when
 * you scroll past it and remounts when you scroll back should not re-run the
 * arrival — the agent did not arrive twice.
 */
const introduced = new Set<string>();

/** Forget every introduction. Exists for tests and for host-side session resets. */
export const resetSpawnEntrances = (): void => introduced.clear();

export interface SpawnEntrance {
  /** This is the agent's first appearance this session. */
  isFirst: boolean;
  /**
   * `'spawning'` while the arrival is playing, then `null` so the caller falls
   * back to its real state. The engine settles `spawning` on its own clock;
   * this mirrors that clock so the prop stops fighting it.
   */
  state: CharacterState | null;
}

/**
 * Play an arrival the first time an agent shows up, and never again.
 *
 * The first read happens in a state initialiser rather than an effect: the
 * decision has to be made on the render that first draws the character, or the
 * arrival would start a frame late and jump.
 */
export function useArrival(agentId: string): SpawnEntrance {
  const [isFirst] = useState(() => !introduced.has(agentId));

  useEffect(() => {
    introduced.add(agentId);
  }, [agentId]);

  const settle = settleForState(SPAWN_STATE);
  const done = useDeadline(isFirst ? (settle?.afterMs ?? 0) : 0, [agentId]);

  return { isFirst, state: isFirst && !done ? SPAWN_STATE : null };
}
