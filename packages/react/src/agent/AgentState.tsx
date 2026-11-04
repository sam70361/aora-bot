import {
  createArbiter,
  type Arbiter,
  type ArbiterOptions,
  type ArbiterResult,
  type ArbiterUpdate,
  type CharacterState,
  type EmotionId,
  type HudSpec,
} from '@aora-bot/engine';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/** What a component gets back from the arbiter: the displayed state and the means to feed it. */
export interface AgentStateValue {
  arbiter: Arbiter;
  /** The result currently on screen. */
  current: ArbiterResult;
  state: CharacterState;
  emotionId: EmotionId;
  tips: string | undefined;
  /** The winning session's HUD, if it sent one. Travels with `tips`. */
  hud: HudSpec | undefined;
  /** Report a session's state. Shorthand for `arbiter.update`. */
  update: (update: ArbiterUpdate) => void;
  /** Forget a session. Shorthand for `arbiter.remove`. */
  remove: (sessionId: string) => void;
}

export interface UseArbiterOptions extends ArbiterOptions {
  /** How often to expire silent sessions. Default 15 s; 0 disables. */
  tickMs?: number;
}

/**
 * Run an arbiter for the lifetime of a component.
 *
 * The arbiter is created once and disposed on unmount. Options are read at
 * creation; changing them later has no effect, which is the same contract as
 * `createCharacter`. Renders when the displayed state or caption changes,
 * and not when sessions come and go underneath without changing the result.
 */
export function useArbiter(options: UseArbiterOptions = {}): AgentStateValue {
  const { tickMs = 15_000, ...arbiterOptions } = options;
  const [arbiter] = useState(() => createArbiter(arbiterOptions));
  const [current, setCurrent] = useState<ArbiterResult>(() => arbiter.current() ?? arbiter.resolve());

  useEffect(() => {
    const off = arbiter.subscribe(setCurrent);
    const timer = tickMs > 0 ? setInterval(() => arbiter.tick(), tickMs) : null;
    return () => {
      off();
      if (timer) clearInterval(timer);
    };
  }, [arbiter, tickMs]);

  useEffect(() => () => arbiter.dispose(), [arbiter]);

  return useMemo<AgentStateValue>(
    () => ({
      arbiter,
      current,
      state: current.state,
      emotionId: current.emotionId,
      tips: current.tips,
      hud: current.hud,
      update: arbiter.update,
      remove: arbiter.remove,
    }),
    [arbiter, current],
  );
}

const AgentStateContext = createContext<AgentStateValue | null>(null);

export interface AgentStateProviderProps extends UseArbiterOptions {
  children: ReactNode;
}

/**
 * Share one arbiter across a subtree.
 *
 * Put this above the part of the page that shows the agent, feed it from
 * wherever the events arrive — a WebSocket handler, `useStateChannel`, a
 * hook script — and read the result with `useAgentState` in the component
 * that renders the character.
 */
export function AgentStateProvider({ children, ...options }: AgentStateProviderProps) {
  const value = useArbiter(options);
  return <AgentStateContext.Provider value={value}>{children}</AgentStateContext.Provider>;
}

/** The nearest `AgentStateProvider`. Throws outside one, because there is no sensible default to fall back to. */
export function useAgentState(): AgentStateValue {
  const value = useContext(AgentStateContext);
  if (!value) throw new Error('useAgentState must be used inside an <AgentStateProvider>');
  return value;
}

/** The nearest provider, or `null`. For components that work either way. */
export const useOptionalAgentState = (): AgentStateValue | null => useContext(AgentStateContext);
