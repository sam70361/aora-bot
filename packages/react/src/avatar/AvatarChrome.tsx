import type { CSSProperties } from 'react';
import { useLocale } from '../locale/index.js';
import { cx } from '../utils/cx.js';

export const UNREAD_BADGE_CAP = 99;

export interface UnreadBadgeProps {
  count: number;
  className?: string;
  style?: CSSProperties;
}

/** Unread counter, capped so a runaway number cannot stretch the layout. */
export function UnreadBadge({ count, className, style }: UnreadBadgeProps) {
  const { t } = useLocale();
  if (count <= 0) return null;

  const label = count > UNREAD_BADGE_CAP ? `${UNREAD_BADGE_CAP}+` : String(count);

  return (
    <span className={cx('aora-badge', className)} style={style} aria-label={`${count} ${t('avatar.unread')}`}>
      {label}
    </span>
  );
}

/**
 * What the dot is saying.
 *
 * The first four are presence — whether the person or agent is reachable. The
 * last four are activity: what it is doing right now, or what it needs from
 * you. They share one component because they share one corner of the avatar,
 * and an avatar that showed both at once would have nowhere to put the second.
 */
export type StatusTone = 'online' | 'busy' | 'away' | 'offline' | 'working' | 'attention' | 'error' | 'info';

/** Tones that mean "look here", and so default to drawing the ring. */
const RINGED = new Set<StatusTone>(['working', 'attention']);

export interface AvatarStatusDotProps {
  tone?: StatusTone;
  /** Slow pulse, for states that mean "something is happening". */
  pulse?: boolean;
  /**
   * Expanding halo around the dot. Defaults to on for `working` and
   * `attention`, which are the two tones that are asking to be noticed.
   */
  ring?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/** Corner presence indicator. */
export function AvatarStatusDot({
  tone = 'offline',
  pulse = false,
  ring,
  label,
  className,
  style,
}: AvatarStatusDotProps) {
  const ringed = ring ?? RINGED.has(tone);

  return (
    <span
      className={cx('aora-status', pulse && 'aora-status--pulse', ringed && 'aora-status--ring', className)}
      data-tone={tone}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

/** Dots in the badge. Three reads as "a process"; two reads as a stutter. */
const WORKING_DOTS = 3;

export interface WorkingBadgeProps {
  /** Height of the badge. The dots and the gaps scale with it. */
  sizePx?: number;
  /** Accessible name. Defaults to the locale's `avatar.working`. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Three dots, pulsing out of phase.
 *
 * The staggered delay is what makes it read as work in progress rather than as
 * a single blinking element: the eye follows the travelling bright dot. In
 * phase, the same three dots look like a warning light.
 *
 * It is an `img` with a name rather than a live region — the state does not
 * change while it is on screen, so announcing it once when it appears is both
 * enough and all a reader wants.
 */
export function WorkingBadge({ sizePx = 8, label, className, style }: WorkingBadgeProps) {
  const { t } = useLocale();
  return (
    <span
      className={cx('aora-working', className)}
      role="img"
      aria-label={label ?? t('avatar.working')}
      style={{ '--aora-working-size': `${sizePx}px`, ...style } as CSSProperties}
    >
      {Array.from({ length: WORKING_DOTS }, (_, index) => (
        <span
          key={index}
          className="aora-working__dot"
          // Negative, so every dot is already mid-cycle on the first frame and
          // the badge does not start with all three at full brightness.
          style={{ animationDelay: `${-index * 0.18}s` }}
        />
      ))}
    </span>
  );
}
