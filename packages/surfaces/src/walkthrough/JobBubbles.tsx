import type { CharacterState, ColorId, FaceStyle, NoseId, ShapeId } from '@aora-bot/engine';
import type { CSSProperties } from 'react';
import { useSurfaceLocale, type SurfaceLocaleKey } from '../locale/index.js';
import { CharacterMark, cx } from '@aora-bot/react';

export interface JobBubblesProps {
  /** Short task strings. Defaults to four from the locale. */
  jobs?: readonly string[];
  /** Radius of the ring the bubbles sit on. */
  radiusPx?: number;
  sizePx?: number;
  state?: CharacterState;
  shape?: ShapeId;
  color?: ColorId;
  face?: FaceStyle;
  nose?: NoseId | null;
  lineWeight?: number;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_JOBS: SurfaceLocaleKey[] = [
  'walkthrough.job.research',
  'walkthrough.job.draft',
  'walkthrough.job.review',
  'walkthrough.job.ship',
];

/** Where the first bubble sits, in radians. Just past the top, so the ring reads as turning. */
const START_ANGLE = -Math.PI / 2 + 0.35;

/**
 * Work in flight, as words around a character.
 *
 * Bubbles rather than a list, because the claim being made is "several things
 * at once" and a list reads as a queue. Each one drifts on its own period
 * with a negative delay, so they are never in phase — a ring of labels
 * bobbing in unison looks like one object rotating, which is the opposite of
 * the point.
 *
 * The ring is laid out with real angles rather than a rotating container: a
 * container that turns takes its text with it, and labels rotating past
 * upside-down are unreadable.
 */
export function JobBubbles({
  jobs,
  radiusPx = 96,
  sizePx,
  state = 'working',
  shape,
  color,
  face,
  nose,
  lineWeight,
  className,
  style,
}: JobBubblesProps) {
  const markSize = sizePx ?? 72;
  const { t } = useSurfaceLocale();
  const labels = jobs ?? DEFAULT_JOBS.map((key) => t(key));
  const box = radiusPx * 2 + markSize;

  return (
    <div className={cx('aora-s-jobs', className)} style={{ width: box, height: box, ...style }}>
      <CharacterMark
        shape={shape}
        color={color}
        face={face}
        nose={nose}
        lineWeight={lineWeight}
        state={state}
        sizePx={markSize}
        className="aora-s-jobs__mark"
      />

      <ul className="aora-s-jobs__list" aria-label={t('walkthrough.jobs')}>
        {labels.map((label, index) => {
          const angle = START_ANGLE + (index / Math.max(1, labels.length)) * Math.PI * 2;
          return (
            <li
              key={label}
              className="aora-s-jobs__bubble"
              style={
                {
                  left: `calc(50% + ${Math.round(Math.cos(angle) * radiusPx)}px)`,
                  top: `calc(50% + ${Math.round(Math.sin(angle) * radiusPx)}px)`,
                  animationDuration: `${4200 + index * 730}ms`,
                  animationDelay: `${index * -1100}ms`,
                } as CSSProperties
              }
            >
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
