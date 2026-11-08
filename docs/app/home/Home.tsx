import { useCallback, useMemo, useState } from 'react';
import { useLocationSearch } from '../shared/location.js';
import { DEFAULT_PRESET, decodeShare, type Preset } from '../shared/share.js';
import { Console } from './Console.js';
import { buildRegistry } from './registry.js';

/**
 * The home page: one screen, a console.
 *
 * The page owns one preset. The four capsules around the console write to it,
 * the character, the wall's style list and the snippet read from it, and a
 * `?s=` link opens on it.
 */
export function Home() {
  const registry = useMemo(() => buildRegistry(), []);

  // A share link wins over the default.
  const query = useLocationSearch();
  const shared = useMemo(() => decodeShare(new URLSearchParams(query).get('s')), [query]);
  const [picked, setPicked] = useState<Preset | null>(null);
  const preset = picked ?? shared ?? DEFAULT_PRESET;

  const replace = setPicked;
  const patch = useCallback(
    (changes: Partial<Preset> | ((preset: Preset) => Partial<Preset>)) =>
      setPicked((current) => {
        const base = current ?? shared ?? DEFAULT_PRESET;
        return { ...base, ...(typeof changes === 'function' ? changes(base) : changes) };
      }),
    [shared],
  );
  return (
    <div className="site-home">
      <Console registry={registry} preset={preset} patch={patch} replace={replace} />
    </div>
  );
}
