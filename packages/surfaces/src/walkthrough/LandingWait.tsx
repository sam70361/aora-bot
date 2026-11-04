import type { ColorId, FaceStyle, HudSpec, NoseId, ShapeId } from '@aora-bot/engine';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { HudPlate, CharacterMark, cx } from '@aora-bot/react';
import { useSurfaceLocale } from '../locale/index.js';

export interface LandingWaitProps {
  title?: string;
  body?: string;
  /**
   * A deadline. With one the character shows a countdown dial and the plate
   * counts down; without one it shows how long it has been waiting.
   */
  waitMs?: number;
  /** Start the clock from a moment the host already knows about. */
  since?: number;
  /** Buttons under the copy. */
  action?: ReactNode;
  sizePx?: number;
  shape?: ShapeId;
  color?: ColorId;
  face?: FaceStyle;
  nose?: NoseId | null;
  lineWeight?: number;
  className?: string;
  style?: CSSProperties;
}

const TICK_MS = 1000;

/**
 * The screen before anything has happened.
 *
 * A blank state with a waiting character says the product is ready and not
 * broken, which is the one thing an empty screen otherwise fails to say. The
 * clock is on the plate rather than in the dial because a number is a number:
 * the ring outside the character can show *that* time is passing, but only
 * text can say how much.
 */
export function LandingWait({
  title,
  body,
  waitMs,
  since,
  action,
  sizePx,
  shape,
  color,
  face,
  nose,
  lineWeight,
  className,
  style,
}: LandingWaitProps) {
  const markSize = sizePx ?? 88;
  const { t } = useSurfaceLocale();
  const [start] = useState(() => since ?? Date.now());
  const [now, setNow] = useState(start);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const elapsed = Math.max(0, now - start);
  const remaining = waitMs != null ? Math.max(0, waitMs - elapsed) : null;
  const hud: HudSpec | null =
    waitMs != null && remaining != null ? { kind: 'timer', remainingMs: remaining, totalMs: waitMs } : null;

  return (
    <div className={cx('aora-s-landing', className)} style={style}>
      <HudPlate
        title={t('walkthrough.landing.elapsed')}
        value={clock(remaining ?? elapsed)}
        level={remaining === 0 ? 'warn' : 'info'}
        sizePx={markSize}
      >
        <CharacterMark
          shape={shape}
          color={color}
          face={face}
          nose={nose}
          lineWeight={lineWeight}
          state="waiting"
          hud={hud}
          sizePx={markSize}
        />
      </HudPlate>

      <div className="aora-s-landing__text">
        <h2 className="aora-s-landing__title">{title ?? t('walkthrough.landing.title')}</h2>
        <p className="aora-s-landing__body">{body ?? t('walkthrough.landing.body')}</p>
        {action && <div className="aora-s-landing__action">{action}</div>}
      </div>
    </div>
  );
}

/** `m:ss`, which is what a wait of this length wants to be read as. */
function clock(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
