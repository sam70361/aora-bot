import { useSyncExternalStore } from 'react';

function watchLocation(notify: () => void) {
  window.addEventListener('popstate', notify);
  return () => window.removeEventListener('popstate', notify);
}

/**
 * The page's query string.
 *
 * The server has no URL, so the query is read through an external-store
 * subscription: the hydrating render sees an empty one and agrees with the
 * HTML, and the client then re-renders with the real one.
 */
export const useLocationSearch = (): string =>
  useSyncExternalStore(
    watchLocation,
    () => window.location.search,
    () => '',
  );
