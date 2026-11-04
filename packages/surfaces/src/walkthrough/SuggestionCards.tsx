import {
  autoColorForKey,
  autoShapeForKey,
  type ColorId,
  type FaceStyle,
  type NoseId,
  type ShapeId,
} from '@aora-bot/engine';
import type { CSSProperties } from 'react';
import { useSurfaceLocale } from '../locale/index.js';
import { CharacterMark, cx } from '@aora-bot/react';

export interface SuggestionCard {
  id: string;
  title: string;
  body?: string;
  /** Appearance. Derived from the id when absent, so a card always has a face. */
  shape?: ShapeId;
  color?: ColorId;
}

export interface SuggestionCardsProps {
  /** Defaults to three examples from the locale. */
  cards?: readonly SuggestionCard[];
  onPick?: (card: SuggestionCard) => void;
  sizePx?: number;
  face?: FaceStyle;
  nose?: NoseId | null;
  lineWeight?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Three starting points, each with a face.
 *
 * The characters are derived from the card ids rather than chosen, which is
 * what makes this component generic: a host passing its own cards gets three
 * distinguishable agents without picking shapes, and the same card always
 * looks the same because the derivation is a hash and not a shuffle.
 */
export function SuggestionCards({
  cards,
  onPick,
  sizePx,
  face,
  nose,
  lineWeight,
  className,
  style,
}: SuggestionCardsProps) {
  const markSize = sizePx ?? 40;
  const { t } = useSurfaceLocale();

  const list: readonly SuggestionCard[] =
    cards ??
    (['planner', 'researcher', 'writer'] as const).map((id) => ({
      id,
      title: t(`walkthrough.card.${id}.title`),
      body: t(`walkthrough.card.${id}.body`),
    }));

  return (
    <ul
      className={cx('aora-s-suggestions', className)}
      aria-label={t('walkthrough.suggestions')}
      style={style}
    >
      {list.map((card) => (
        <li key={card.id} className="aora-s-suggestions__item">
          <button
            type="button"
            className="aora-s-suggestions__card"
            aria-label={`${t('walkthrough.suggest.pick')}: ${card.title}`}
            onClick={() => onPick?.(card)}
          >
            <CharacterMark
              shape={card.shape ?? autoShapeForKey(card.id)}
              color={card.color ?? autoColorForKey(card.id)}
              face={face}
              nose={nose}
              lineWeight={lineWeight}
              sizePx={markSize}
              seed={card.id}
              state="curious"
            />
            <span className="aora-s-suggestions__title">{card.title}</span>
            {card.body && <span className="aora-s-suggestions__body">{card.body}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
