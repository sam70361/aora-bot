/**
 * Style series: how a character is drawn.
 *
 * Add one by writing its renderers under `render/<id>/`, calling `defineStyle`
 * in `styles/<id>.ts`, and listing it in `BUILTIN_STYLES` below.
 *
 * The built-ins are installed on first lookup rather than as an import side
 * effect. The package declares `sideEffects: false`, so a bundler is free to
 * drop a module-level `defineStyle(...)` call whose result nothing reads,
 * which leaves a consumer of the `/static` entry with an empty registry.
 */
import { kaomojiStyle } from './kaomoji.js';
import { pixelStyle } from './pixel.js';
import * as registry from './registry.js';
import { STYLE_IDS } from './ids.js';
import type { StyleDefinition, StyleId } from './types.js';
import { vectorStyle } from './vector.js';

export { DEFAULT_STYLE_ID, STYLE_IDS, type BuiltinStyleId } from './ids.js';
export type { StyleDefinition, StyleId, StyleOptionIssue, StyleParam } from './types.js';
export { defineStyle, paramsForVariant, resolveStyleOptions, validateStyleOptions } from './registry.js';
export { vectorStyle };
export { pixelStyle };
export { kaomojiStyle };

/** The series that ship with the engine, in the order of `STYLE_IDS`. */
const BUILTIN_STYLES: readonly StyleDefinition[] = [vectorStyle, pixelStyle, kaomojiStyle];

/** A caller's own definition of a built-in id wins: it is only installed if the id is free. */
function installBuiltins(): void {
  for (const style of BUILTIN_STYLES) {
    if (!registry.hasStyle(style.id)) registry.defineStyle(style);
  }
}

export function hasStyle(id: string): boolean {
  installBuiltins();
  return registry.hasStyle(id);
}

/** Look a series up. Throws for an id nobody registered, naming the ones that exist. */
export function getStyle(id: StyleId): StyleDefinition {
  installBuiltins();
  return registry.getStyle(id);
}

/**
 * Every registered series: the built-ins in the order of `STYLE_IDS`, then the
 * rest in registration order. A built-in registers when its module loads, so
 * the registry's own order depends on how a bundler sorted the imports.
 */
export function listStyles(): StyleDefinition[] {
  installBuiltins();
  const builtIn = (id: StyleId): number => (STYLE_IDS as readonly string[]).indexOf(id);
  const rank = (style: StyleDefinition): number =>
    builtIn(style.id) < 0 ? STYLE_IDS.length : builtIn(style.id);
  return registry.listStyles().sort((a, b) => rank(a) - rank(b));
}
