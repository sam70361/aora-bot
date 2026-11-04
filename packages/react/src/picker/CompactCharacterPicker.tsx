import {
  ASSIGNABLE_COLOR_IDS,
  AUTO_SHAPE_POOL,
  type ColorId,
  type FaceStyle,
  type NoseId,
  type ShapeId,
} from '@aora-bot/engine';
import type { CSSProperties } from 'react';
import { CharacterPicker } from './CharacterPicker.js';
import { cx } from '../utils/cx.js';

export interface CompactCharacterPickerProps {
  shape: ShapeId;
  color: ColorId;
  onSelectShape?: (shape: ShapeId) => void;
  onSelectColor?: (color: ColorId) => void;
  /**
   * Face style. Passing it adds the face toggle, and the nose row
   * when the line face is chosen — the same behaviour as the full picker.
   */
  face?: FaceStyle;
  onSelectFace?: (face: FaceStyle) => void;
  /** Nose for the line face. Defaults to the first nose while `face` is `line`. */
  nose?: NoseId | null;
  onSelectNose?: (nose: NoseId) => void;
  lineWeight?: number;
  /** Size of each preview. Defaults to `PICKER_MARK_PX`. */
  sizePx?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * The picker cut down to what fits beside a sign-up form.
 *
 * A subset rather than the full palette and roster: the shapes are
 * `AUTO_SHAPE_POOL`, the ones that still read as a character at 16px, and
 * the missing colour is `black`, which is reserved as the default ink and so
 * is not a choice anyone makes. Someone deciding what their first agent looks
 * like wants a handful of obvious options, not the whole catalogue — the full
 * grid belongs in the editor they can open later.
 *
 * The face controls are still offered, because they are a toggle and a row of
 * six rather than another grid, and a line face is the one choice that
 * changes the character more than its colour does.
 */
export function CompactCharacterPicker({
  shape,
  color,
  onSelectShape,
  onSelectColor,
  face,
  onSelectFace,
  nose,
  onSelectNose,
  lineWeight,
  sizePx,
  className,
  style,
}: CompactCharacterPickerProps) {
  return (
    <CharacterPicker
      shape={shape}
      color={color}
      onSelectShape={onSelectShape}
      onSelectColor={onSelectColor}
      face={face}
      onSelectFace={onSelectFace}
      nose={nose}
      onSelectNose={onSelectNose}
      lineWeight={lineWeight}
      sizePx={sizePx}
      shapes={AUTO_SHAPE_POOL}
      colors={ASSIGNABLE_COLOR_IDS}
      className={cx('aora-picker--compact', className)}
      style={style}
    />
  );
}
