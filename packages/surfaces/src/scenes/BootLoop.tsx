import type { CharacterState, ColorId, FaceStyle, NoseId, ShapeId } from '@aora-bot/engine';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useSurfaceLocale } from '../locale/index.js';
import { CharacterMark, cx } from '@aora-bot/react';
import { DeviceBezel } from './DeviceBezel.js';

export interface BootLoopProps {
  title?: string;
  body?: string;
  /** Time on each state. The pair makes one full cycle. */
  durationMs?: number;
  /** Called at the end of every cycle, for a host counting how long this has gone on. */
  onCycle?: (cycle: number) => void;
  /** The character stands in front of the screen rather than behind it. */
  inFront?: boolean;
  shape?: ShapeId;
  color?: ColorId;
  face?: FaceStyle;
  nose?: NoseId | null;
  lineWeight?: number;
  widthPx?: number;
  sizePx?: number;
  className?: string;
  style?: CSSProperties;
}

/** The two states the loop alternates between; their belts do the rest. */
const CYCLE: CharacterState[] = ['working', 'thinking'];

/**
 * Something is starting up and nobody knows how long it will take.
 *
 * An indeterminate wait is the one case where a progress bar lies, so this
 * shows activity instead of progress: the character alternates between
 * working and thinking, which under the hood swaps the plain working face
 * for the three travelling beads of the thinking belt, and a scanline
 * crosses the screen behind it.
 *
 * `onCycle` exists so the host can escalate. Two cycles is a slow start;
 * twelve is a problem worth saying something about, and only the host knows
 * which message that is.
 */
export function BootLoop({
  title,
  body,
  durationMs = 2600,
  onCycle,
  inFront = false,
  shape,
  color,
  face,
  nose,
  lineWeight,
  widthPx = 280,
  sizePx,
  className,
  style,
}: BootLoopProps) {
  const markSize = sizePx ?? 88;
  const { t } = useSurfaceLocale();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (durationMs <= 0) return;
    const timer = setInterval(() => setStep((current) => current + 1), durationMs);
    return () => clearInterval(timer);
  }, [durationMs]);

  // Reported from an effect rather than from the interval, so a host that
  // re-renders on the callback cannot make the timer restart mid-cycle.
  const cycle = Math.floor(step / CYCLE.length);
  const onCycleRef = useRef(onCycle);
  useEffect(() => {
    onCycleRef.current = onCycle;
  });
  useEffect(() => {
    if (cycle > 0) onCycleRef.current?.(cycle);
  }, [cycle]);

  const state = CYCLE[step % CYCLE.length]!;

  return (
    <div className={cx('aora-s-boot', className)} style={style}>
      <DeviceBezel widthPx={widthPx} light="on">
        <div className="aora-s-boot__screen" data-front={inFront || undefined}>
          {/* The sweep is a CSS gradient on its own layer: one animated
              element for the whole scene, and the reduced-motion query in the
              stylesheet stops it. Deciding that in JavaScript instead would
              render a different tree on the server than in the browser. */}
          <span className="aora-s-boot__scan" aria-hidden="true" />
          <CharacterMark
            shape={shape}
            color={color}
            face={face}
            nose={nose}
            lineWeight={lineWeight}
            state={state}
            sizePx={markSize}
            className="aora-s-boot__mark"
          />
        </div>
      </DeviceBezel>

      <div className="aora-s-boot__text" role="status" aria-live="polite">
        <span className="aora-s-boot__title">{title ?? t('boot.title')}</span>
        <span className="aora-s-boot__body">{body ?? t('boot.body')}</span>
      </div>
    </div>
  );
}
