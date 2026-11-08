/**
 * The core's helpers, as the first copy of the core to build the extras lent
 * them (`ExtrasKit`). They are pure, so whichever copy lent them draws the
 * same; nothing of a copy's state is read through them.
 */
import type { ExtrasKit } from '../extras-hook.js';

export let K: ExtrasKit;

export function useKit(kit: ExtrasKit): void {
  K ??= kit;
}
