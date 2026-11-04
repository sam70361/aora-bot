import { useEffect, useRef, useState, type RefObject } from 'react';

/** A key for any JSON-able value; `null` and `undefined` share the empty key. */
export const jsonKey = (value: unknown): string => (value == null ? '' : JSON.stringify(value));

/**
 * The same reference for as long as the value's key stays the same.
 *
 * Props that arrive as objects (`hud={{ kind, value }}`, `styleOptions={{ … }}`)
 * are a fresh literal on every render, so keying an effect or a memo on them
 * runs it on every render. Keyed on the returned reference instead, it runs
 * only when the value actually changed.
 */
export function useStable<T>(value: T, keyOf: (value: T) => string = jsonKey): T {
  const key = keyOf(value);
  const [held, setHeld] = useState({ key, value });
  if (held.key === key) return held.value;
  // Adjusting state during render: React restarts this render before anything commits.
  setHeld({ key, value });
  return value;
}

/**
 * A ref that always holds the latest value.
 *
 * For callbacks read from a long-lived effect (a timer, a message channel, a
 * frame loop) that must not be torn down and rebuilt each time the host passes
 * a new closure. Written in an effect, so declare it before the effects that read it.
 */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
