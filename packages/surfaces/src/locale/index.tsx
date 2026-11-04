import { useLocale, type LocaleId } from '@aora-bot/react';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { surfaceEnUS } from './en-US.js';
import { surfaceZhCN } from './zh-CN.js';

export type SurfaceLocaleKey = keyof typeof surfaceEnUS;
export type SurfaceLocale = Record<SurfaceLocaleKey, string>;

// Keyed by the react package's `LocaleId`, so adding a language there fails
// this table until the surfaces have it too.
export const SURFACE_LOCALES = {
  'en-US': surfaceEnUS,
  'zh-CN': surfaceZhCN,
} satisfies Record<LocaleId, SurfaceLocale>;

interface SurfaceLocaleValue {
  id: LocaleId;
  t: (key: SurfaceLocaleKey) => string;
}

const OverridesContext = createContext<Partial<SurfaceLocale> | undefined>(undefined);

export interface SurfaceLocaleProviderProps {
  /** Override individual strings without replacing the whole table. Merged over any outer provider's. */
  overrides?: Partial<SurfaceLocale>;
  children: ReactNode;
}

/**
 * Copy overrides for the surfaces.
 *
 * The language is not chosen here: it follows the `LocaleProvider` from
 * `@aora-bot/react`, so a surface and the primitives inside it cannot end up
 * in different languages. This provider only carries overrides, because the
 * react provider's `overrides` are typed to its own keys.
 */
export function SurfaceLocaleProvider({ overrides, children }: SurfaceLocaleProviderProps) {
  const outer = useContext(OverridesContext);
  const merged = useMemo(
    () => (outer && overrides ? { ...outer, ...overrides } : (overrides ?? outer)),
    [outer, overrides],
  );

  return <OverridesContext.Provider value={merged}>{children}</OverridesContext.Provider>;
}

/** Translate a surface key in the language of the surrounding `LocaleProvider`; English outside one. */
export function useSurfaceLocale(): SurfaceLocaleValue {
  const { id } = useLocale();
  const overrides = useContext(OverridesContext);

  return useMemo<SurfaceLocaleValue>(() => {
    const table = { ...(SURFACE_LOCALES[id] ?? surfaceEnUS), ...overrides };
    return { id, t: (key) => table[key] ?? surfaceEnUS[key] ?? key };
  }, [id, overrides]);
}

export { surfaceEnUS, surfaceZhCN };
