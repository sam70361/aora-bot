// The static entry, not the main one: these tables travel with the locale,
// and the locale is re-exported from `static.ts`, which must not drag the
// animation runtime onto a server.
import {
  HUD_KIND_LABELS,
  HUD_KINDS,
  SHAPE_FAMILIES,
  STATE_GROUPS,
  type HudKind,
  type ShapeFamilyId,
  type StateGroupId,
} from '@aora-bot/engine/static';

/**
 * Prefix every id in a table with a family name, keeping the key literals.
 *
 * The id-driven families are large — every shape, every state, every
 * description — and writing `'shape.hex'` in full twice per locale would triple the size
 * of these files for no extra safety. Spelling the table as
 * `Record<ShapeId, string>` instead is *stronger*: the compiler rejects a
 * locale that forgets a shape, which a hand-written list of string keys
 * cannot do.
 *
 * The return type is a mapped type rather than an index signature, so
 * `keyof typeof enUS` still enumerates every key and `LocaleKey` stays a
 * closed union.
 */
export function family<P extends string, K extends string>(
  prefix: P,
  table: Record<K, string>,
): { [Id in K as `${P}.${Id}`]: string } {
  const out: Record<string, string> = {};
  for (const [id, label] of Object.entries<string>(table)) out[`${prefix}.${id}`] = label;
  return out as { [Id in K as `${P}.${Id}`]: string };
}

/**
 * HUD names come from the engine, which already carries both languages.
 *
 * A second copy here would be a second thing to update when a kind is added,
 * and the engine's table is the one the protocol documentation quotes.
 */
export const hudLabels = (lang: 'en' | 'zh'): Record<HudKind, string> =>
  Object.fromEntries(HUD_KINDS.map((kind) => [kind, HUD_KIND_LABELS[kind][lang]])) as Record<HudKind, string>;

/**
 * State group names, for the same reason: the groups are an engine table.
 *
 * Read from the engine rather than written out here, so there is one source.
 */
export const stateGroupLabels = (lang: 'en' | 'zh'): Record<StateGroupId, string> =>
  Object.fromEntries(
    STATE_GROUPS.map((group) => [group.id, lang === 'zh' ? group.labelZh : group.label]),
  ) as Record<StateGroupId, string>;

/** Shape family names: the engine's `SHAPE_FAMILIES` carries both languages, like the HUD table. */
export const shapeFamilyLabels = (lang: 'en' | 'zh'): Record<ShapeFamilyId, string> =>
  Object.fromEntries(SHAPE_FAMILIES.map((group) => [group.id, group.label[lang]])) as Record<
    ShapeFamilyId,
    string
  >;
