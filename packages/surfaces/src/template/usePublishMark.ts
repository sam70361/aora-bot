import type { CharacterState } from '@aora-bot/engine';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { type ConfettiHandle } from '@aora-bot/react';

export type PublishPhase = 'idle' | 'publishing' | 'celebrate';

export interface PublishMark {
  /** Where the publish is up to. */
  state: PublishPhase;
  /** The character state that goes with it. */
  characterState: CharacterState;
  begin(): void;
  succeed(): void;
  fail(): void;
}

export interface UsePublishMarkOptions {
  /**
   * A `CelebrationLayer` over the mark. The burst is fired on success, so the
   * host never has to notice the moment itself.
   *
   * Supplied by the caller rather than returned from here: the ref belongs to
   * the element it is attached to, and a hook handing one out invites reading
   * `.current` during render.
   */
  confetti?: RefObject<ConfettiHandle | null>;
  /** How long the celebration holds before returning to rest. */
  celebrateMs?: number;
  /** Pieces of confetti thrown on success. */
  burst?: number;
  /** Called when the celebration has finished — a good place to close a dialog. */
  onSettled?: () => void;
}

/**
 * Three states for the one moment a form is worth animating.
 *
 * Publishing is the rare interaction where a character earns its keep: there
 * is a real wait, a real outcome, and the outcome is good news. So the mark
 * works while the request is out and celebrates when it lands, then puts
 * itself away — a celebration that has to be dismissed stops being one.
 *
 * Failure returns straight to rest rather than to a sad face. The form is
 * about to show a message saying what went wrong, and a character pulling an
 * expression next to it reads as the library editorialising.
 */
export function usePublishMark({
  confetti,
  celebrateMs = 1600,
  burst = 20,
  onSettled,
}: UsePublishMarkOptions = {}): PublishMark {
  const [state, setState] = useState<PublishPhase>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledRef = useRef(onSettled);
  useEffect(() => {
    settledRef.current = onSettled;
  }, [onSettled]);

  const clear = useCallback(() => {
    if (timer.current != null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  // A celebration in flight when the dialog unmounts must not fire a state
  // update into a component that has gone.
  useEffect(() => clear, [clear]);

  // The three transitions are plain functions rather than memoised ones:
  // they are called from event handlers, never compared, and the confetti
  // handle they reach for belongs to the caller.
  const begin = () => {
    clear();
    setState('publishing');
  };

  const succeed = () => {
    clear();
    setState('celebrate');
    confetti?.current?.burst(burst);
    timer.current = setTimeout(() => {
      timer.current = null;
      setState('idle');
      settledRef.current?.();
    }, celebrateMs);
  };

  const fail = () => {
    clear();
    setState('idle');
  };

  return { state, characterState: CHARACTER_STATE[state], begin, succeed, fail };
}

const CHARACTER_STATE: Record<PublishPhase, CharacterState> = {
  idle: 'idle',
  publishing: 'working',
  celebrate: 'celebrate',
};
