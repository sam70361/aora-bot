import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { DEFAULT_PRESET, decodeShare, type Preset } from '../shared/share.js';
import { Console } from './Console.js';
import { buildRegistry } from './registry.js';

function watchLocation(notify: () => void) {
  window.addEventListener('popstate', notify);
  return () => window.removeEventListener('popstate', notify);
}

/**
 * The home page: one screen, a console.
 *
 * The page owns one preset. The four capsules around the console write to it,
 * the character, the wall's style list and the snippet read from it, and a
 * `?s=` link opens on it.
 */
export function Home() {
  const registry = useMemo(() => buildRegistry(), []);

  /*
   * A share link wins over the default. The server has no URL, so the query is
   * read through an external-store subscription: the hydrating render sees an
   * empty one and agrees with the HTML, and the client then re-renders with the
   * real one.
   */
  const query = useSyncExternalStore(
    watchLocation,
    () => window.location.search,
    () => '',
  );
  const shared = useMemo(() => decodeShare(new URLSearchParams(query).get('s')), [query]);
  const [picked, setPicked] = useState<Preset | null>(null);
  const preset = picked ?? shared ?? DEFAULT_PRESET;

  const replace = setPicked;
  const patch = useCallback(
    (changes: Partial<Preset>) =>
      setPicked((current) => ({ ...(current ?? shared ?? DEFAULT_PRESET), ...changes })),
    [shared],
  );
  return (
    <div className="site-home">
      <Console registry={registry} preset={preset} patch={patch} replace={replace} />
    </div>
  );
}
