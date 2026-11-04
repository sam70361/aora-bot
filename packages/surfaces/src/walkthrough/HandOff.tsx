import type { CharacterState, FaceStyle, NoseId } from '@aora-bot/engine';
import { useEffect, useState, type CSSProperties } from 'react';
import {
  agentColor,
  agentFace,
  agentNose,
  agentShape,
  type AgentLike,
  CharacterMark,
  cx,
} from '@aora-bot/react';
import { useSurfaceLocale } from '../locale/index.js';

export interface HandOffProps {
  /** Who is passing the work on. */
  from: AgentLike;
  /** Who is picking it up. */
  to: AgentLike;
  /** What is being handed over, shown between the two. */
  label?: string;
  /** Length of each beat. The full cycle is three of them. */
  beatMs?: number;
  /** Run the beats on a loop. A single pass by default. */
  loop?: boolean;
  sizePx?: number;
  face?: FaceStyle;
  nose?: NoseId | null;
  lineWeight?: number;
  className?: string;
  style?: CSSProperties;
}

/** The three beats, as the pair of states held during each. */
const BEATS: [CharacterState, CharacterState][] = [
  ['idle', 'idle'],
  ['sending', 'receiving'],
  ['happy', 'working'],
];

/**
 * One agent handing work to another.
 *
 * `sending` and `receiving` are a matched pair in the engine — one leans away
 * as the other catches — so the hand-off does not need a travelling object
 * between the two characters to read: the bodies already describe the
 * direction. The label is text because what is being passed is usually a
 * name, not a shape.
 *
 * Three beats rather than a continuous animation, because the sequence has a
 * meaning and an end: before, during, after. Looping it is opt-in, for a
 * marketing page where nobody is waiting for it to finish.
 */
export function HandOff({
  from,
  to,
  label,
  beatMs = 1400,
  loop = false,
  sizePx,
  face,
  nose,
  lineWeight,
  className,
  style,
}: HandOffProps) {
  const markSize = sizePx ?? 72;
  const { t } = useSurfaceLocale();
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (beatMs <= 0) return;
    const timer = setInterval(() => {
      setBeat((current) => {
        if (current >= BEATS.length - 1) return loop ? 0 : current;
        return current + 1;
      });
    }, beatMs);
    return () => clearInterval(timer);
  }, [beatMs, loop]);

  const [fromState, toState] = BEATS[beat] ?? BEATS[0]!;

  return (
    <div
      className={cx('aora-s-handoff', className)}
      role="group"
      aria-label={t('walkthrough.handoff.title')}
      data-beat={beat}
      style={style}
    >
      <figure className="aora-s-handoff__side">
        <CharacterMark
          shape={agentShape(from)}
          color={agentColor(from)}
          face={face ?? agentFace(from)}
          nose={nose !== undefined ? nose : agentNose(from)}
          lineWeight={lineWeight}
          state={fromState}
          sizePx={markSize}
          seed={from.id}
        />
        <figcaption>{from.name ?? t('walkthrough.handoff.from')}</figcaption>
      </figure>

      <span className="aora-s-handoff__label">{label ?? t('walkthrough.handoff.title')}</span>

      <figure className="aora-s-handoff__side">
        <CharacterMark
          shape={agentShape(to)}
          color={agentColor(to)}
          face={face ?? agentFace(to)}
          nose={nose !== undefined ? nose : agentNose(to)}
          lineWeight={lineWeight}
          state={toState}
          sizePx={markSize}
          seed={to.id}
        />
        <figcaption>{to.name ?? t('walkthrough.handoff.to')}</figcaption>
      </figure>
    </div>
  );
}
