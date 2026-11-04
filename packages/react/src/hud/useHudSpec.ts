import { isHudSpec, type HudKind, type HudSpec } from '@aora-bot/engine';
import { useMemo } from 'react';
import { useOptionalAgentState } from '../agent/AgentState.js';
import { useStable } from '../utils/hooks.js';

/**
 * Build a HUD spec from live numbers, or `null` if it does not hold up.
 *
 * Hosts assemble a dial out of whatever they happen to have: a fraction that
 * is still `undefined` on the first render, a token count that arrives as a
 * string from an API. Handing that straight to a character would either draw
 * a wrong dial or throw in the middle of a render, so this validates with the
 * protocol's own guard and returns `null` instead — and `hud={null}` is a
 * character with no dial, which is exactly what "we do not know yet" means.
 *
 * The result is memoised on the values, so a host can call this with a fresh
 * literal every render without the engine seeing a new object each time.
 */
export function useHudSpec(kind: HudKind, values: Record<string, unknown> = {}): HudSpec | null {
  const held = useStable(values, stableKey);
  return useMemo(() => {
    const candidate = { ...held, kind };
    return isHudSpec(candidate) ? candidate : null;
  }, [kind, held]);
}

/**
 * The HUD the arbiter is currently showing, if there is an arbiter at all.
 *
 * Reads the dial off the winning result, so it stays correct even if a host
 * builds the context value by hand and forgets the `hud` field that
 * `AgentStateValue` also carries. Null outside a provider, so a `HudPlate`
 * can sit in a layout that sometimes has no agent behind it.
 */
export function useAgentHud(): HudSpec | null {
  return useOptionalAgentState()?.current.hud ?? null;
}

/** Key on the entries in name order, so `{ a, b }` and `{ b, a }` agree. */
function stableKey(values: Record<string, unknown>): string {
  return Object.keys(values)
    .sort()
    .map((name) => `${name}:${JSON.stringify(values[name])}`)
    .join(',');
}
