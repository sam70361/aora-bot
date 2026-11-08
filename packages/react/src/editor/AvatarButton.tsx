import type { FaceStyle, NoseId } from '@aora-bot/engine';
import { useState, type CSSProperties } from 'react';
import { useLocale } from '../locale/index.js';
import { CharacterMark } from '../mark/CharacterMark.js';
import { AvatarStudio, type AvatarDraft, type AvatarStudioProps } from './AvatarStudio.js';
import { cx } from '../utils/cx.js';

export interface AvatarButtonProps {
  /** The current avatar, shown on the button and edited in the dialog. */
  value: AvatarDraft;
  onCommit?: (next: AvatarDraft) => void;
  /** Passed straight to the editor. Without it the Generate tab is hidden. */
  generateImage?: AvatarStudioProps['generateImage'];
  characterTab?: boolean;
  sizePx?: number;
  face?: FaceStyle;
  nose?: NoseId | null;
  lineWeight?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * The button that opens the avatar studio, showing what it would edit.
 *
 * A `CharacterMark` rather than an `AgentPortrait`: this is a live preview of a
 * choice being made, and the character reacts to hovering the button it sits
 * on. An avatar in a roster is a still identity; an avatar in a settings page
 * is a thing you are about to change, and it helps to look like one.
 */
export function AvatarButton({
  value,
  onCommit,
  generateImage,
  characterTab,
  sizePx = 64,
  face,
  nose,
  lineWeight,
  className,
  style,
}: AvatarButtonProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);

  return (
    <span className={cx('aora-avatar-button', className)} style={style}>
      <button
        type="button"
        className="aora-avatar-button__button"
        aria-label={t('avatar.edit')}
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
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
            emphasis={hover}
            sizePx={sizePx}
            state={hover ? 'curious' : 'idle'}
          />
        )}
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
          className="aora-avatar-button__editor"
        />
      )}
    </span>
  );
}
