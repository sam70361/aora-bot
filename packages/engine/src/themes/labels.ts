/**
 * The names installed themes give their ids. Reads only the shared theme
 * state, so the light `labels` entry carries it without any renderer.
 */
import { sharedThemes } from './state.js';
import type { ThemePackage } from './types.js';

/** The name an installed theme gives one of its characters, skins or colours, or `null`. */
export function themeLabel(
  kind: 'shape' | 'variant' | 'color',
  id: string,
): { en: string; zh: string } | null {
  for (const theme of sharedThemes() as ThemePackage[]) {
    const names =
      kind === 'shape'
        ? theme.labels.shapes
        : kind === 'variant'
          ? theme.labels.variants
          : theme.labels.colors;
    const label = names?.[id];
    if (label) return label;
  }
  return null;
}
