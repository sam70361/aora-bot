import { acceptsVariant, getStyle, hasStyle, type StyleId, type StyleVariant } from '@aora-bot/engine';

/**
 * The variant a series will actually draw, given what the caller asked for.
 *
 * A name the series does not have, or none at all, resolves to the series'
 * default. Marks report this as `data-variant` and push it to the engine, so
 * the attribute, the stage's key and the picture always agree — and so
 * dropping a `variant` prop returns the mark to the default rather than
 * leaving the last one in place.
 */
export function resolveVariant(styleId: StyleId, variant: StyleVariant | undefined): string | undefined {
  if (!hasStyle(styleId)) return variant;
  const style = getStyle(styleId);
  return variant !== undefined && acceptsVariant(style, variant) ? variant : style.defaultVariant;
}
