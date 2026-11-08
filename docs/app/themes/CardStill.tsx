import { getInkColorCss, type CharacterState } from '@aora-bot/react';
import { memo, type CSSProperties } from 'react';
import type { ThemeCard } from './catalog.js';
import { stillOf } from './walls/still.js';

/**
 * A card's still, filling its box: `StillMark`'s markup, drawn through the
 * exhibition's shared cache, so the walls reuse what a booklet or a card has
 * already drawn instead of drawing it again.
 */
export const CardStill = memo(function CardStill({
  card,
  state,
  sizePx,
}: {
  card: ThemeCard;
  state: CharacterState;
  sizePx: number;
}) {
  const { shape, color } = card.preset;
  return (
    <span
      className="aora-mark aora-mark--still"
      data-shape={shape}
      data-color={color}
      data-state={state}
      style={{ '--aora-fg': getInkColorCss(color), width: '100%', height: '100%' } as CSSProperties}
      dangerouslySetInnerHTML={{ __html: stillOf(card, state, sizePx) }}
    />
  );
});
