import type { StyleDefinition, StyleId, StyleOptionIssue, StyleParam } from './types.js';

const registry = new Map<string, StyleDefinition>();

/**
 * Register a style series, or replace one with the same id.
 *
 * A series is what decides how a character is drawn: smooth vectors, a pixel
 * grid, something else. Everything above the renderer — the simulation, the
 * states, the shapes, the face — is shared, so registering a series makes
 * every state and shape available in it at once.
 */
export function defineStyle<Options extends Record<string, unknown>>(
  definition: StyleDefinition<Options>,
): StyleDefinition<Options> {
  for (const key of Object.keys(definition.defaults)) {
    if (!(key in definition.params)) {
      throw new Error(`Style "${definition.id}": default "${key}" has no entry in params`);
    }
  }
  for (const [key, spec] of Object.entries<StyleParam>(definition.params)) {
    const unknown = spec.variants?.find((variant) => !definition.variants.includes(variant));
    if (unknown !== undefined) {
      throw new Error(
        `Style "${definition.id}": param "${key}" names variant "${unknown}" which is not in variants`,
      );
    }
  }
  if (!definition.variants.includes(definition.defaultVariant)) {
    throw new Error(
      `Style "${definition.id}": defaultVariant "${definition.defaultVariant}" is not in variants`,
    );
  }
  registry.set(definition.id, definition);
  return definition;
}

export function hasStyle(id: string): boolean {
  return registry.has(id);
}

/** Look a series up. Throws for an id nobody registered, naming the ones that exist. */
export function getStyle(id: StyleId): StyleDefinition {
  const style = registry.get(id);
  if (!style) {
    throw new Error(`Unknown style "${id}". Registered styles: ${[...registry.keys()].join(', ')}`);
  }
  return style;
}

/** Every registered series, in registration order. */
export function listStyles(): StyleDefinition[] {
  return [...registry.values()];
}

/**
 * The parameters a variant actually reads, for a control panel that shows only those.
 *
 * A parameter with no `variants` list applies to every variant. Values for the
 * others still resolve; they just change nothing on screen.
 */
export function paramsForVariant(style: StyleDefinition, variant: string): Record<string, StyleParam> {
  return Object.fromEntries(
    Object.entries<StyleParam>(style.params).filter(
      ([, spec]) => !spec.variants || spec.variants.includes(variant),
    ),
  );
}

function clampParam(spec: StyleParam, value: unknown, fallback: unknown): unknown {
  switch (spec.type) {
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
      const clamped = Math.min(spec.max, Math.max(spec.min, value));
      // Snap to the step grid anchored at `min`, so a slider and a typed value agree.
      const snapped = spec.min + Math.round((clamped - spec.min) / spec.step) * spec.step;
      return Math.min(spec.max, Number(snapped.toFixed(6)));
    }
    case 'enum':
      return typeof value === 'string' && spec.options.includes(value) ? value : fallback;
    case 'boolean':
      return typeof value === 'boolean' ? value : fallback;
  }
}

/**
 * Merge caller parameters over a series' defaults.
 *
 * Out-of-range numbers are clamped and snapped to the step; wrong types and
 * unknown enum members fall back to the default; unknown keys are dropped. A
 * renderer can therefore read its options without checking them.
 */
export function resolveStyleOptions(
  style: StyleDefinition,
  input?: Record<string, unknown> | null,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, fallback] of Object.entries(style.defaults)) {
    const spec = (style.params as Record<string, StyleParam>)[key]!;
    out[key] = input && key in input ? clampParam(spec, input[key], fallback) : fallback;
  }
  return out;
}

/**
 * Report what `resolveStyleOptions` would silently fix.
 *
 * For callers that would rather refuse bad options than repair them.
 */
export function validateStyleOptions(
  style: StyleDefinition,
  input: Record<string, unknown> | null | undefined,
): StyleOptionIssue[] {
  const issues: StyleOptionIssue[] = [];
  for (const [key, value] of Object.entries(input ?? {})) {
    const spec = (style.params as Record<string, StyleParam | undefined>)[key];
    if (!spec) {
      issues.push({ key, message: `unknown parameter` });
      continue;
    }
    if (clampParam(spec, value, Symbol.for('invalid')) !== value) {
      issues.push({ key, message: describe(spec) });
    }
  }
  return issues;
}

function describe(spec: StyleParam): string {
  switch (spec.type) {
    case 'number':
      return `expected a number from ${spec.min} to ${spec.max} in steps of ${spec.step}`;
    case 'enum':
      return `expected one of ${spec.options.join(', ')}`;
    case 'boolean':
      return 'expected a boolean';
  }
}
