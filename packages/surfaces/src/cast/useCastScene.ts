import type { CharacterState } from '@aora-bot/engine';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Where a member stands during a step, in pixels from the stage's centre. */
export interface CastPosition {
  x: number;
  y: number;
  /** 1 is the member's own size. */
  scale?: number;
  /** State to adopt for this step. Falls back to the member's own. */
  state?: CharacterState;
}

export interface CastStep {
  id: string;
  /** Keyed by member id. A member left out of the map is off stage for this step. */
  positions: Record<string, CastPosition>;
  /** How long this step holds before the scene moves on. */
  durationMs: number;
}

export interface UseCastSceneOptions {
  autoplay?: boolean;
  /** Return to the first step after the last one. Off by default. */
  loop?: boolean;
  onStep?: (index: number, step: CastStep) => void;
}

export interface CastScene {
  stepIndex: number;
  step: CastStep | undefined;
  playing: boolean;
  next(): void;
  prev(): void;
  play(): void;
  pause(): void;
  /** Jump straight to a step. Clamped to the script. */
  goTo(index: number): void;
}

/**
 * Walk a scripted scene, one step at a time.
 *
 * The script is data — a list of steps and where everybody stands — so a host
 * can write its own choreography without touching this hook, and an
 * onboarding flow can reorder its scenes without any of the movement logic
 * knowing. The hook only decides *when*; the stage decides how it looks
 * getting there.
 *
 * Stepping manually pauses. Someone who has reached for the arrow keys is
 * driving, and an autoplay timer that keeps firing underneath them would take
 * the scene away again a second later.
 */
export function useCastScene(
  steps: readonly CastStep[],
  { autoplay = false, loop = false, onStep }: UseCastSceneOptions = {},
): CastScene {
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(autoplay);

  const onStepRef = useRef(onStep);
  useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  const last = steps.length - 1;

  useEffect(() => {
    const step = steps[stepIndex];
    if (step) onStepRef.current?.(stepIndex, step);
  }, [stepIndex, steps]);

  // The last step of a one-shot scene is a resting place, not a beat. Derived
  // rather than stored, so reaching the end does not need a state update from
  // inside an effect — and a Play button still reads "stopped".
  const running = playing && (loop || stepIndex < last);

  useEffect(() => {
    if (!running) return;
    const step = steps[stepIndex];
    if (!step || step.durationMs <= 0) return;

    const timer = setTimeout(() => {
      setStepIndex((current) => (current >= last ? 0 : current + 1));
    }, step.durationMs);
    return () => clearTimeout(timer);
  }, [running, stepIndex, steps, last]);

  const next = useCallback(() => {
    setPlaying(false);
    setStepIndex((current) => (current >= last ? (loop ? 0 : current) : current + 1));
  }, [last, loop]);

  const prev = useCallback(() => {
    setPlaying(false);
    setStepIndex((current) => (current <= 0 ? (loop ? Math.max(0, last) : 0) : current - 1));
  }, [last, loop]);

  const goTo = useCallback(
    (index: number) => {
      setPlaying(false);
      setStepIndex(Math.min(Math.max(index, 0), Math.max(0, last)));
    },
    [last],
  );

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);

  return { stepIndex, step: steps[stepIndex], playing: running, next, prev, play, pause, goTo };
}
