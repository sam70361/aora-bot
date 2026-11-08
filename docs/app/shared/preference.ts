import { useCallback, useSyncExternalStore } from 'react';

/** Fired on this window when a preference changes; `storage` only reaches the other tabs. */
const CHANGED = 'site-preference';

function watch(notify: () => void) {
  window.addEventListener('storage', notify);
  window.addEventListener(CHANGED, notify);
  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener(CHANGED, notify);
  };
}

/**
 * A choice the reader made once and expects the site to remember, kept in
 * `localStorage` under `key`.
 *
 * Read through an external store, so the server and the hydrating render use
 * `fallback` and agree with the HTML; the stored choice arrives in the render
 * after. A stored value outside `choices` (an older build, a hand edit) reads
 * as `fallback`, and storage that is unavailable only stops it persisting.
 */
export function usePreference<T extends string>(
  key: string,
  choices: readonly T[],
  fallback: T,
): [T, (value: T) => void] {
  const read = () => {
    try {
      const stored = localStorage.getItem(key);
      return (choices as readonly string[]).includes(stored ?? '') ? (stored as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const value = useSyncExternalStore(watch, read, () => fallback);
  const set = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, next);
      } catch {
        // Private mode or a full quota: the choice holds for this page only.
      }
      window.dispatchEvent(new Event(CHANGED));
    },
    [key],
  );
  return [value, set];
}
