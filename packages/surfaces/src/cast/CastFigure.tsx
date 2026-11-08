import {
  fnv1a32,
  type CastId,
  type CharacterState,
  type ColorId,
  type FaceStyle,
  type NoseId,
  type ShapeId,
} from '@aora-bot/engine';
import type { CSSProperties, TransitionEvent } from 'react';
import { CharacterMark, cx } from '@aora-bot/react';
import type { CastPosition } from './useCastScene.js';

/** A member of the ensemble, independent of where it happens to stand. */
export interface CastMemberSpec {
  id: string;
  shape?: ShapeId;
  color?: ColorId;
  preset?: CastId;
  /** Default state, used by steps that do not name one. */
  state?: CharacterState;
  sizePx?: number;
  /** Bob amplitude in pixels. 0 holds still. */
  bobPx?: number;
  /** Period of the bob. Varying it per member stops the group breathing in unison. */
  bobMs?: number;
}

export interface CastMemberProps {
  member: CastMemberSpec;
  /** Where to stand. `null` takes the member off stage. */
  position: CastPosition | null;
  /** Easing for the move, as a `linear()` function from the engine's spring. */
  easing: string;
  durationMs: number;
  sizePx?: number;
  face?: FaceStyle;
  nose?: NoseId | null;
  lineWeight?: number;
  /** Called when this member finishes moving. */
  onArrive?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * One character in a scripted scene, in two nested boxes.
 *
 * The outer box owns the journey — position, scale and opacity, all under one
 * transition — and the inner box owns the idle bob. They have to be separate
 * elements: a CSS animation and a transition on the same `transform` do not
 * compose, the animation simply wins, and a member gliding across the stage
 * would snap back to its start on every keyframe.
 */
export function CastFigure({
  member,
  position,
  easing,
  durationMs,
  sizePx,
  face,
  nose,
  lineWeight,
  onArrive,
  className,
  style,
}: CastMemberProps) {
  const size = position?.scale ?? 1;
  const bob = member.bobPx ?? 0;

  const onTransitionEnd = (event: TransitionEvent<HTMLSpanElement>) => {
    // Only the transform: opacity and the scale finish at the same moment and
    // would report the same arrival three times.
    if (event.propertyName === 'transform') onArrive?.(member.id);
  };

  return (
    <span
      className={cx('aora-s-cast-lineup__member', className)}
      data-member={member.id}
      data-off={position ? undefined : true}
      onTransitionEnd={onTransitionEnd}
      style={
        {
          transform: `translate(calc(-50% + ${position?.x ?? 0}px), calc(-50% + ${position?.y ?? 0}px)) scale(${position ? size : 0.6})`,
          opacity: position ? 1 : 0,
          transitionDuration: `${durationMs}ms`,
          transitionTimingFunction: easing,
          ...style,
        } as CSSProperties
      }
    >
      <span
        className={bob > 0 ? 'aora-s-cast-lineup__bob' : undefined}
        style={
          bob > 0
            ? ({
                '--aora-s-cast-bob-amp': `${bob}px`,
                '--aora-s-cast-bob-ms': `${member.bobMs ?? 5200}ms`,
                // Members given the same period still need to be out of step,
                // or an ensemble breathes as one animal.
                '--aora-s-cast-bob-delay': `${-(fnv1a32(member.id) % 2000)}ms`,
              } as CSSProperties)
            : undefined
        }
      >
        <CharacterMark
          shape={member.shape}
          color={member.color}
          preset={member.preset}
          face={face}
          nose={nose}
          lineWeight={lineWeight}
          state={position?.state ?? member.state ?? 'idle'}
          sizePx={member.sizePx ?? sizePx ?? 80}
          seed={member.id}
        />
      </span>
    </span>
  );
}
