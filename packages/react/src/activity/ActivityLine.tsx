import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from '../stage/hooks.js';
import { cx } from '../utils/cx.js';

export interface ActivityLineProps {
  /** Current line. Changing it slides the old line out and the new one in. */
  text: string;
  /** Transition duration in milliseconds. */
  durationMs?: number;
  className?: string;
  /** Merged over the duration custom property the transition reads. */
  style?: CSSProperties;
}

/**
 * Single-line text that swaps rather than changes.
 *
 * Both the outgoing and incoming lines are in the DOM during the transition,
 * stacked in a grid cell so the row cannot change height mid-swap. Rewriting
 * the text in place would make a list of activity rows jitter every few
 * seconds as the words changed length; sliding the old line up and the new one
 * in from below also says *which way* the sequence is going, which a plain
 * crossfade does not.
 */
export function ActivityLine({ text, durationMs = 220, className, style }: ActivityLineProps) {
  const reduced = useReducedMotion();
  const [previous, setPrevious] = useState<string | null>(null);
  const shown = useRef(text);

  /*
   * The effect depends on `text` alone. Depending on the state it writes would
   * re-run it on its own update, and the cleanup of that re-run cancels the
   * timer that was meant to retire the outgoing line — leaving it in the DOM
   * indefinitely.
   */
  useEffect(() => {
    if (text === shown.current) return;
    const outgoing = shown.current;
    shown.current = text;

    setPrevious(outgoing);
    const timer = setTimeout(() => setPrevious(null), durationMs);
    return () => clearTimeout(timer);
  }, [text, durationMs]);

  return (
    <span
      className={cx('aora-ticker', className)}
      style={{ '--aora-ticker-duration': `${durationMs}ms`, ...style } as CSSProperties}
    >
      {/*
       * Under reduced motion the swap is the whole animation, so the outgoing
       * line is never drawn. The timing is left alone rather than switched
       * off: the preference decides what is shown, not how the component
       * keeps track of what it is showing.
       */}
      {!reduced && previous != null && (
        <span key={previous} className="aora-ticker__line aora-ticker__line--out" aria-hidden="true">
          {previous}
        </span>
      )}
      <span key={text} className="aora-ticker__line aora-ticker__line--in">
        {text}
      </span>
    </span>
  );
}
