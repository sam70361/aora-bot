import type { CharacterState } from '@aora-bot/engine';
import { useEffect, useRef, useState } from 'react';

export interface UseIdleSleepOptions {
  /** Become drowsy after this long without input. Default 45 s. */
  drowsyAfterMs?: number;
  /** Fall asleep after this long without input. Default 120 s. */
  sleepAfterMs?: number;
  /** How long the wake-up animation plays before yielding. Default 1.2 s. */
  wakeMs?: number;
  /** Events that count as activity. */
  events?: readonly (keyof DocumentEventMap)[];
  /** Set false to disable without unmounting. */
  enabled?: boolean;
}

export type IdlePhase = 'awake' | 'drowsy' | 'asleep' | 'waking';

export interface IdleSleep {
  phase: IdlePhase;
  /**
   * State to show, or `null` when the visitor is active and the host's own
   * state should be used. Spread it last: `state={idle.state ?? agentState}`.
   */
  state: CharacterState | null;
  /** Force a wake, for example when a message arrives. */
  wake(): void;
}

const DEFAULT_EVENTS: readonly (keyof DocumentEventMap)[] = [
  'pointerdown',
  'pointermove',
  'keydown',
  'wheel',
  'touchstart',
];

/**
 * A character that nods off when the visitor does.
 *
 * Tracks input on the document. After `drowsyAfterMs` without any it returns
 * `drowsy`; after `sleepAfterMs`, `sleeping`. The first input afterwards
 * returns `waking` for `wakeMs` — long enough for the wake-up hop to land —
 * and then `null`. A hidden tab counts as inactivity, so a character left in
 * a background tab is asleep when the visitor comes back, which reads as
 * having waited rather than having been frozen.
 */
export function useIdleSleep(options: UseIdleSleepOptions = {}): IdleSleep {
  const {
    drowsyAfterMs = 45_000,
    sleepAfterMs = 120_000,
    wakeMs = 1200,
    events = DEFAULT_EVENTS,
    enabled = true,
  } = options;

  const [phase, setPhase] = useState<IdlePhase>('awake');
  const phaseRef = useRef<IdlePhase>('awake');
  const timers = useRef<{
    drowsy: ReturnType<typeof setTimeout> | null;
    sleep: ReturnType<typeof setTimeout> | null;
    wake: ReturnType<typeof setTimeout> | null;
  }>({
    drowsy: null,
    sleep: null,
    wake: null,
  });
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const set = (next: IdlePhase) => {
      if (phaseRef.current === next) return;
      phaseRef.current = next;
      setPhase(next);
    };

    const clearAll = () => {
      for (const key of ['drowsy', 'sleep', 'wake'] as const) {
        const t = timers.current[key];
        if (t) clearTimeout(t);
        timers.current[key] = null;
      }
    };

    const arm = () => {
      timers.current.drowsy = setTimeout(() => set('drowsy'), drowsyAfterMs);
      timers.current.sleep = setTimeout(() => set('asleep'), sleepAfterMs);
    };

    const activity = () => {
      const was = phaseRef.current;
      clearAll();
      if (was === 'drowsy' || was === 'asleep') {
        set('waking');
        timers.current.wake = setTimeout(() => {
          set('awake');
          arm();
        }, wakeMs);
      } else {
        if (was !== 'waking') set('awake');
        arm();
      }
    };
    wakeRef.current = activity;

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        clearAll();
        set('asleep');
      } else {
        activity();
      }
    };

    for (const name of events) document.addEventListener(name, activity, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    arm();

    return () => {
      clearAll();
      for (const name of events) document.removeEventListener(name, activity);
      document.removeEventListener('visibilitychange', onVisibility);
      wakeRef.current = () => {};
    };
  }, [enabled, drowsyAfterMs, sleepAfterMs, wakeMs, events]);

  const state: CharacterState | null =
    phase === 'drowsy' ? 'drowsy' : phase === 'asleep' ? 'sleeping' : phase === 'waking' ? 'waking' : null;

  return { phase, state, wake: () => wakeRef.current() };
}
