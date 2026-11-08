import type { CSSProperties, ReactNode } from 'react';
import { cx } from '@aora-bot/react';
import { useSurfaceLocale } from '../locale/index.js';

export interface AvatarSlotProps {
  /** The member has landed: the outline fades out and `children` fade in. */
  arrived?: boolean;
  sizePx?: number;
  /** What the slot holds once something has landed in it. */
  children?: ReactNode;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * The empty circle a character flies into at the end of a scene.
 *
 * Two layers rather than a swap, so the landing is one cross-fade: the dashed
 * outline says "something belongs here" while the scene is still running, and
 * the avatar takes its place without the box ever being empty. Position it on
 * the stage with ordinary CSS — the slot does not know where it is, which is
 * what lets a host put it in a form beside the scene rather than inside it.
 */
export function PortraitSlot({
  arrived = false,
  sizePx = 64,
  children,
  label,
  className,
  style,
}: AvatarSlotProps) {
  const { t } = useSurfaceLocale();

  return (
    <span
      className={cx('aora-s-slot', className)}
      data-arrived={arrived || undefined}
      aria-label={label ?? t('cast.slot')}
      role="img"
      style={{ width: sizePx, height: sizePx, ...style }}
    >
      <span className="aora-s-slot__ring" aria-hidden="true" />
      <span className="aora-s-slot__content">{children}</span>
    </span>
  );
}
