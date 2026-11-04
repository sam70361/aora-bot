import { CHARACTER_STATES, STATE_GROUPS, type CharacterState } from '@aora-bot/react';

export interface StateGroup {
  id: string;
  /** The engine's own English caption, or `Other` for the leftovers. */
  label: string;
  states: CharacterState[];
}

/**
 * Every animation state, grouped as the engine groups them.
 *
 * `STATE_GROUPS` is the source; each group is intersected with
 * `CHARACTER_STATES` and anything no group claims is appended as "more", so a
 * state added to or renamed in the engine shows up without this file — or the
 * three surfaces that call it — being touched.
 *
 * Group ids double as locale keys (`state.group.<id>` in the kit's own table),
 * which is why the id travels alongside the caption.
 */
export function buildStateGroups(): StateGroup[] {
  const groups: StateGroup[] = STATE_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    states: group.states.filter((state) => (CHARACTER_STATES as readonly string[]).includes(state)),
  }));

  const claimed = new Set(groups.flatMap((g) => g.states));
  const rest = CHARACTER_STATES.filter((state) => !claimed.has(state));
  if (rest.length > 0) groups.push({ id: 'more', label: 'Other', states: [...rest] });
  return groups.filter((group) => group.states.length > 0);
}
