import { useCallback, useMemo, useState, type ComponentType } from 'react';
import { useLocationSearch } from '../shared/location.js';
import { usePreference } from '../shared/preference.js';
import { DEFAULT_PRESET, decodeShare, type Preset } from '../shared/share.js';
import { Console } from './Console.js';
import { DepthFilter } from './Depth.js';
import { Exhibit } from './Exhibit.js';
import { buildRegistry } from './registry.js';
import { ViewBar } from './ViewBar.js';
import {
  BACKDROP_KEY,
  BACKDROPS,
  HOME_VIEWS,
  VIEW_KEY,
  VIEW_PARAM,
  type HomeView,
  type ViewProps,
} from './views.js';

const VIEWS: Record<HomeView, ComponentType<ViewProps>> = {
  console: Console,
  exhibit: Exhibit,
};

const isView = (value: string | null): value is HomeView =>
  (HOME_VIEWS as readonly string[]).includes(value ?? '');

/**
 * The home page: one screen, one character, two ways to lay it out.
 *
 * The page owns one preset. Whichever view is showing writes to it, the
 * character, the snippet and the share link read from it, and a `?s=` link
 * opens on it, so switching views keeps the character. The view and the
 * backdrop are the reader's to choose and are remembered; a `?view=` link
 * opens a view without changing what is remembered.
 */
export function Home() {
  const registry = useMemo(() => buildRegistry(), []);

  // A share link wins over the default.
  const query = useLocationSearch();
  const params = useMemo(() => new URLSearchParams(query), [query]);
  const shared = useMemo(() => decodeShare(params.get('s')), [params]);
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

  const [storedView, storeView] = usePreference(VIEW_KEY, HOME_VIEWS, HOME_VIEWS[0]);
  const [chosenView, setChosenView] = useState<HomeView | null>(null);
  const linkedView = params.get(VIEW_PARAM);
  const view = chosenView ?? (isView(linkedView) ? linkedView : storedView);
  const [backdrop, setBackdrop] = usePreference(BACKDROP_KEY, BACKDROPS, BACKDROPS[0]);

  const onView = useCallback(
    (next: HomeView) => {
      setChosenView(next);
      storeView(next);
    },
    [storeView],
  );

  const View = VIEWS[view];
  return (
    <div className="site-home" data-view={view}>
      <DepthFilter />
      <View
        registry={registry}
        preset={preset}
        patch={patch}
        replace={replace}
        backdrop={backdrop}
        bar={<ViewBar view={view} onView={onView} backdrop={backdrop} onBackdrop={setBackdrop} />}
      />
    </div>
  );
}
