import type { FaceStyle, NoseId, StyleId, StyleVariant } from '@aora-bot/engine';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useStable } from '../utils/hooks.js';

/**
 * Drawing defaults a subtree can share, so a host picks the style series once
 * instead of threading it through every mark.
 *
 * Only the fields a shared stage source can honour are here: each one is part
 * of the stage's appearance key, so a mirror never disagrees with its source.
 */
export interface MarkAppearance {
  /** Style series. The prop is `styleId` because `style` on a mark is already inline CSS. */
  styleId?: StyleId;
  /** Paint variant within the series. Left unset, the series picks its own default. */
  variant?: StyleVariant;
  /** Parameters of the series, merged over its defaults and clamped by the engine. */
  styleOptions?: Record<string, unknown>;
  face?: FaceStyle;
  /** `null` is a request for no nose; unset leaves the choice to the mark. */
  nose?: NoseId | null;
  lineWeight?: number;
}

export interface AppearanceProviderProps extends MarkAppearance {
  children?: ReactNode;
}

const EMPTY: MarkAppearance = Object.freeze({});

const AppearanceContext = createContext<MarkAppearance>(EMPTY);

/**
 * A stable string for a plain options record, whatever order its keys were
 * written in. Marks compare `styleOptions` by value with it, so a host that
 * passes a fresh literal on every render does not push an update each time.
 */
export function optionsKey(options: Record<string, unknown> | null | undefined): string {
  if (!options) return '';
  const keys = Object.keys(options)
    .filter((key) => options[key] !== undefined)
    .sort();
  return keys.length ? JSON.stringify(keys.map((key) => [key, options[key]])) : '';
}

/**
 * Set drawing defaults for every mark below.
 *
 * Nested providers merge: a field the inner one leaves unset is inherited, one
 * it sets replaces the outer value. A prop on the mark itself beats both.
 */
export function AppearanceProvider({
  styleId,
  variant,
  styleOptions,
  face,
  nose,
  lineWeight,
  children,
}: AppearanceProviderProps) {
  const parent = useContext(AppearanceContext);
  const heldOptions = useStable(styleOptions, optionsKey);

  const value = useMemo<MarkAppearance>(
    () => ({
      ...parent,
      ...(styleId !== undefined && { styleId }),
      ...(variant !== undefined && { variant }),
      ...(heldOptions !== undefined && { styleOptions: heldOptions }),
      ...(face !== undefined && { face }),
      ...(nose !== undefined && { nose }),
      ...(lineWeight !== undefined && { lineWeight }),
    }),
    [parent, styleId, variant, heldOptions, face, nose, lineWeight],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

/**
 * Clear the inherited defaults for everything below.
 *
 * The stage hosts its sources with this: a source is built from its own
 * appearance key and nothing else, so a provider that happens to wrap the
 * stage must not leak a line weight or a grid into it.
 */
export function AppearanceReset({ children }: { children?: ReactNode }) {
  return <AppearanceContext.Provider value={EMPTY}>{children}</AppearanceContext.Provider>;
}

/** The defaults in effect here. An empty record outside any provider. */
export function useAppearance(): MarkAppearance {
  return useContext(AppearanceContext);
}
