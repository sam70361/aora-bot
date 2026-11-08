import { pencilGlyphPath, type FaceStyle, type NoseId } from '@aora-bot/engine';
import { useState, type CSSProperties } from 'react';
import { useLocale } from '../locale/index.js';
import { CharacterMark } from '../mark/CharacterMark.js';
import { AvatarStudio, type AvatarDraft, type AvatarStudioProps } from './AvatarStudio.js';
import { cx } from '../utils/cx.js';

export interface AvatarFieldProps {
  value: AvatarDraft;
  onCommit?: (next: AvatarDraft) => void;
  generateImage?: AvatarStudioProps['generateImage'];
  characterTab?: boolean;
  sizePx?: number;
  face?: FaceStyle;
  nose?: NoseId | null;
  lineWeight?: number;
  className?: string;
  style?: CSSProperties;
}

/** Side of the pencil's own box, in the glyph's units. */
const GLYPH_SIZE = 24;

/**
 * An avatar that says it can be edited, and opens the editor when pressed.
 *
 * The pencil is the engine's `pencilGlyphPath` — the same outline the
 * `writing` state orbits a character with — at a size and a stroke that suit
 * an overlay rather than a belt. Drawing it from the generator instead of
 * from an icon set is the point: there is one pencil in this library, and a
 * second one from elsewhere would sit at a different weight and a different
 * corner radius next to a character that is already carrying the first.
 */
export function AvatarField({
  value,
  onCommit,
  generateImage,
  characterTab,
  sizePx = 72,
  face,
  nose,
  lineWeight,
  className,
  style,
}: AvatarFieldProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <span className={cx('aora-editable', className)} style={style}>
      <button
        type="button"
        className="aora-editable__button"
        aria-label={t('avatar.edit')}
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        style={{ width: sizePx, height: sizePx }}
      >
        {value.pictureUrl ? (
          <img src={value.pictureUrl} alt="" width={sizePx} height={sizePx} />
        ) : (
          <CharacterMark
            shape={value.shape}
            color={value.color}
            face={face ?? value.face}
            nose={nose !== undefined ? nose : value.nose}
            lineWeight={lineWeight}
            sizePx={sizePx}
          />
        )}

        <span className="aora-editable__overlay" aria-hidden="true">
          {/* The glyph is built around the origin, so the box is centred too. */}
          <svg
            viewBox={`${-GLYPH_SIZE / 2} ${-GLYPH_SIZE / 2} ${GLYPH_SIZE} ${GLYPH_SIZE}`}
            width="38%"
            height="38%"
          >
            <path d={pencilGlyphPath(GLYPH_SIZE)} fill="currentColor" />
          </svg>
        </span>
      </button>

      {open && (
        <AvatarStudio
          value={value}
          onCommit={onCommit}
          onClose={() => setOpen(false)}
          generateImage={generateImage}
          characterTab={characterTab}
          face={face}
          nose={nose}
          lineWeight={lineWeight}
          className="aora-editable__editor"
        />
      )}
    </span>
  );
}
