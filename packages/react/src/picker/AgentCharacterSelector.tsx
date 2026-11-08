import type { ColorId, FaceStyle, NoseId, ShapeId } from '@aora-bot/engine';
import { useState, type CSSProperties } from 'react';
import { useLocale } from '../locale/index.js';
import { CharacterSelector } from './CharacterSelector.js';
import { cx } from '../utils/cx.js';
import { useStable } from '../utils/hooks.js';

/** The part of an agent's appearance this picker owns. */
export interface CharacterChoice {
  shape: ShapeId;
  color: ColorId;
  face?: FaceStyle;
  nose?: NoseId | null;
}

const choiceKey = (value: CharacterChoice): string =>
  `${value.shape}.${value.color}.${value.face ?? '-'}.${value.nose ?? '-'}`;

export interface AgentCharacterSelectorProps {
  /** The committed appearance. Staged edits start from here and reset to it on cancel. */
  value: CharacterChoice;
  /** Called with the staged appearance when it is confirmed. */
  onCommit?: (choice: CharacterChoice) => void;
  /** Called when the staged appearance is discarded. */
  onCancel?: () => void;
  /**
   * The agent has a picture of its own.
   *
   * The grid then shows no selection ring, because the character underneath
   * is not what is on screen — highlighting a shape would claim the avatar is
   * something it is not. Picking still stages a choice, so confirming swaps
   * the picture out for the character.
   */
  hasPicture?: boolean;
  /** Commit on every pick instead of waiting for confirmation. */
  immediate?: boolean;
  /** Show the confirm and discard buttons. Off when a host supplies its own. */
  actions?: boolean;
  lineWeight?: number;
  layout?: 'grid' | 'row';
  shapes?: readonly ShapeId[];
  colors?: readonly ColorId[];
  className?: string;
  style?: CSSProperties;
}

/**
 * A `CharacterSelector` that holds its edits until they are confirmed.
 *
 * The plain picker is controlled: every click is the host's to apply. That is
 * right inside a settings form, and wrong inside a dialog, where a click is a
 * proposal and Cancel has to mean something. This component keeps the
 * proposal locally and hands over one value, so the host writes to its store
 * once per dialog rather than once per click.
 */
export function AgentCharacterSelector({
  value,
  onCommit,
  onCancel,
  hasPicture = false,
  immediate = false,
  actions = true,
  lineWeight,
  layout = 'grid',
  shapes,
  colors,
  className,
  style,
}: AgentCharacterSelectorProps) {
  const { t } = useLocale();
  const [staged, setStaged] = useState<CharacterChoice>(value);

  // Follow the committed value when the host changes it from elsewhere — a
  // second editor, an undo — but not when the host merely re-renders with an
  // equal literal, which would wipe the staged edit on every keystroke
  // somewhere else in the dialog.
  const committed = useStable(value, choiceKey);
  const [seen, setSeen] = useState(committed);
  if (seen !== committed) {
    setSeen(committed);
    setStaged(committed);
  }

  const stage = (next: CharacterChoice) => {
    setStaged(next);
    if (immediate) onCommit?.(next);
  };

  return (
    <div className={cx('aora-staged-picker', className)} style={style}>
      <CharacterSelector
        shape={staged.shape}
        color={staged.color}
        face={staged.face}
        nose={staged.nose}
        lineWeight={lineWeight}
        layout={layout}
        shapes={shapes}
        colors={colors}
        showSelection={!hasPicture}
        onSelectShape={(shape) => stage({ ...staged, shape })}
        onSelectColor={(color) => stage({ ...staged, color })}
        onSelectFace={(face) => stage({ ...staged, face })}
        onSelectNose={(nose) => stage({ ...staged, nose })}
      />

      {actions && !immediate && (
        <div className="aora-staged-picker__actions">
          <button
            type="button"
            className="aora-button"
            onClick={() => {
              setStaged(value);
              onCancel?.();
            }}
          >
            {t('editor.cancel')}
          </button>
          <button
            type="button"
            className="aora-button aora-button--primary"
            onClick={() => onCommit?.(staged)}
          >
            {t('editor.save')}
          </button>
        </div>
      )}
    </div>
  );
}
