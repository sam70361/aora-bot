import type { LiveRendererFactory, StaticRenderer } from '../render/renderer.js';
import type { BuiltinStyleId } from './ids.js';

/** A style series id. Built-ins autocomplete; `defineStyle` accepts any other string. */
export type StyleId = BuiltinStyleId | (string & Record<never, never>);

/** What every parameter says about itself, whatever its type. */
interface StyleParamBase {
  /** Short display name for a control. */
  label?: string;
  /**
   * The variants this parameter changes. Omitted means every variant reads it.
   * A control can hide a parameter the current variant ignores; the value
   * still resolves and round-trips, it just draws nothing there.
   */
  variants?: readonly string[];
}

/**
 * Range metadata for one style parameter.
 *
 * Declared next to the default so a tool can build a control for it and a
 * caller can validate a value without knowing what the parameter means.
 */
export type StyleParam = StyleParamBase &
  (
    | { type: 'number'; min: number; max: number; step: number }
    | { type: 'enum'; options: readonly string[] }
    | { type: 'boolean' }
  );

export interface StyleDefinition<Options extends Record<string, unknown> = Record<string, unknown>> {
  id: StyleId;
  /** Human-readable name. */
  label: string;
  /** The `variant` values this series lists: what a style rail or a picker shows. */
  variants: readonly string[];
  /**
   * Variants the series draws but does not list, such as a theme's skins
   * (`THEMES`). Every entry point accepts them by id; `allVariants` and
   * `acceptsVariant` read both lists. Moving an id to `variants` lists it.
   */
  unlistedVariants?: readonly string[];
  /** The variant used when none is named. */
  defaultVariant: string;
  /** Parameter defaults. Every key must have a matching entry in `params`. */
  defaults: Readonly<Options>;
  /** Ranges for every key of `defaults`. */
  params: { readonly [K in keyof Options]: StyleParam };
  /** Mount into a host and draw snapshots on demand. */
  createRenderer: LiveRendererFactory;
  /** Draw one snapshot as an SVG string. */
  renderStatic: StaticRenderer;
}

/** A problem found by `validateStyleOptions`. */
export interface StyleOptionIssue {
  key: string;
  message: string;
}
