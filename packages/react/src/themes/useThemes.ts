import { loadThemes, themesNeeded } from '@aora-bot/engine';
import { useEffect, useReducer } from 'react';

/** The ids a mark names that a theme may own. */
export interface ThemedIds {
  shape?: string | null;
  preset?: string | null;
  variant?: string | null;
  style?: string | null;
  color?: string | null;
}

/**
 * Whether every theme the ids need is installed, loading the ones that are
 * not. A mark that names a theme's character, member, skin or colour holds
 * its box open until this turns true, then draws; a mark that names none is
 * ready at once and never loads anything.
 */
export function useThemesReady(ids: ThemedIds): boolean {
  const needed = themesNeeded(ids);
  const key = needed.join(',');
  const [, loaded] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!key) return;
    let live = true;
    loadThemes(key.split(',')).then(
      () => live && loaded(),
      (error: unknown) => console.error(error),
    );
    return () => {
      live = false;
    };
  }, [key]);
  return needed.length === 0;
}
