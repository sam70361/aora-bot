import { onReducedMotionChange, prefersReducedMotion, type CharacterState } from '@aora-bot/engine';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import type { CharacterHandle } from '../mark/CharacterMark.js';

/**
 * How long a state has to hold still before a roster believes it.
 *
 * Long enough to cover a tool call that finishes almost immediately, short
 * enough that a genuine change still feels like a reaction to it.
 */
export const SETTLE_MS = 1400;

const serverFalse = () => false;

/** Reduced motion, as a subscription so a mid-session change is picked up. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(onReducedMotionChange, prefersReducedMotion, serverFalse);
}

export interface MarkSettleOptions {
  /** Stability window. `0` disables settling entirely. */
  settleMs?: number;
}

/**
 * Hold a state until it has stopped changing.
 *
 * Facts churn: a tool starts, returns in 80 ms, and another starts 40 ms
 * later. Rendering each of those is a roster of characters flicking between
 * faces, which reads as a fault rather than as activity. Waiting for the
 * churn to stop costs a little latency on a real change and removes all of
 * the flicker on a fake one.
 *
 * Under reduced motion the window collapses to a tick: someone who has asked
 * for less movement is not helped by a delayed change, only by fewer of them,
 * and the engine already answers that half.
 */
export function useMarkSettle(
  state: CharacterState,
  { settleMs = SETTLE_MS }: MarkSettleOptions = {},
): CharacterState {
  const reduced = useReducedMotion();
  const delay = settleMs <= 0 ? 0 : reduced ? 1 : settleMs;
  const [settled, setSettled] = useState(state);

  // Adjusting during render rather than in an effect: with settling switched
  // off there is no window to wait for, and a one-frame stale state would show
  // up as exactly the flicker this hook exists to remove.
  if (delay === 0 && settled !== state) setSettled(state);

  useEffect(() => {
    if (delay === 0 || state === settled) return;
    const timer = setTimeout(() => setSettled(state), delay);
    return () => clearTimeout(timer);
  }, [state, settled, delay]);

  return delay === 0 ? state : settled;
}

/**
 * A deadline that restarts whenever its dependencies change.
 *
 * `false` until `ms` has passed, then `true`. Used for one-off windows — an
 * arrival animation, a morph that must not also change the face — where the
 * alternative is a `setTimeout` and a ref in every caller.
 */
export function useDeadline(ms: number, deps: readonly unknown[]): boolean {
  const [passed, setPassed] = useState(ms <= 0);
  const [run, setRun] = useState({ ms, deps });

  // A new window starts on the render whose dependencies differ, so a restarted
  // deadline never shows the previous one's `true` for a frame.
  if (run.ms !== ms || run.deps.length !== deps.length || run.deps.some((d, i) => !Object.is(d, deps[i]))) {
    setRun({ ms, deps });
    setPassed(ms <= 0);
  }

  useEffect(() => {
    if (run.ms <= 0) return;
    const timer = setTimeout(() => setPassed(true), run.ms);
    return () => clearTimeout(timer);
  }, [run]);

  return passed;
}

/** Ignore a second poke inside this window, so a rapid click cannot stack flourishes. */
export const POKE_COOLDOWN_MS = 340;

const POKE_BURST = 14;

/** Monotonic enough for a cooldown, and faked by test timers alongside `setTimeout`. */
const now = (): number => (typeof performance === 'undefined' ? Date.now() : performance.now());

/**
 * Cycle a character through its three flourishes, one per call.
 *
 * Always spinning is a trick that stops being fun on the second click, so the
 * response changes every time: spin, hop, confetti, spin again.
 *
 * Returns `false` when there is no engine attached — a mirrored mark shares
 * its animation with everyone else of the same appearance, so it cannot move
 * on its own and the caller should fall back to something element-level.
 */
export function useTapCycle(ref: RefObject<CharacterHandle | null>): () => boolean {
  const step = useRef(0);
  const last = useRef(Number.NEGATIVE_INFINITY);

  return useCallback(() => {
    const handle = ref.current;
    if (!handle) return false;

    const at = now();
    if (at - last.current < POKE_COOLDOWN_MS) return true;
    last.current = at;

    const phase = step.current++ % 3;
    if (phase === 0) handle.spin(1);
    else if (phase === 1) handle.bounce(1);
    else handle.burst(POKE_BURST);
    return true;
  }, [ref]);
}
