import {
  haloBackground,
  renderAvatarDataUrl,
  stateForEmotion,
  type CharacterState,
  type EmotionId,
  type FaceStyle,
  type NoseId,
} from '@aora-bot/engine';
import type { CSSProperties } from 'react';
import { SETTLE_MS, useMarkSettle } from '../stage/hooks.js';
import { StagedMark } from '../stage/MarkStage.js';
import { cx } from '../utils/cx.js';
import { AvatarStack } from './AvatarStack.js';
import {
  agentColor,
  agentFace,
  agentNose,
  agentShape,
  AVATAR_SIZES,
  hasPicture,
  isGroup,
  type AgentLike,
  type AvatarSize,
} from './identity.js';

export interface AgentAvatarProps {
  agent: AgentLike;
  size?: AvatarSize;
  /** Exact pixel size, overriding `size`. */
  sizePx?: number;
  /**
   * Size of the character inside the circle. Smaller than the circle leaves a
   * margin; larger crops it. Defaults to filling the circle exactly.
   */
  fillPx?: number;
  /** Face style, overriding whatever the agent identity resolves to. */
  face?: FaceStyle;
  /** Nose, overriding the identity. `null` draws no nose. */
  nose?: NoseId | null;
  /** Stroke width multiplier. Not part of an identity, so always explicit. */
  lineWeight?: number;
  state?: CharacterState;
  /** Protocol id, for hosts that speak the wire format. Ignored when `state` is given. */
  emotionId?: EmotionId;
  /**
   * The shape is being changed under the character right now.
   *
   * Holds the last settled state for the settle window, so a morph is one
   * change rather than two. A body that changes shape and expression in the
   * same frame does not read as the same character having a new outline; it
   * reads as a different character appearing.
   */
  isMorphingShape?: boolean;
  /** Render a still image instead of an animation. */
  still?: boolean;
  /** Soft colour wash behind the character. */
  halo?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * The avatar an application actually drops into a list.
 *
 * Picks between three representations in order: an uploaded picture, a group
 * cluster, or the character itself. Animated characters go through the shared
 * stage, so a hundred rows cost a handful of engines.
 */
export function AgentAvatar({
  agent,
  size = 'md',
  sizePx,
  fillPx,
  face: faceProp,
  nose: noseProp,
  lineWeight,
  state: stateProp,
  emotionId,
  isMorphingShape = false,
  still = false,
  halo = false,
  className,
  style,
}: AgentAvatarProps) {
  const px = sizePx ?? AVATAR_SIZES[size];
  const color = agentColor(agent);
  const face = faceProp ?? agentFace(agent);
  // `=== undefined`, because `null` is the caller asking for no nose at all.
  // The identity is asked with the face the caller settled on, so overriding
  // the face to `line` still gets the agent's own nose rather than none.
  const nose =
    noseProp !== undefined ? noseProp : agentNose(face === agentFace(agent) ? agent : { ...agent, face });
  const wanted = stateProp ?? (emotionId != null ? stateForEmotion(emotionId) : 'idle');
  const state = useMarkSettle(wanted, { settleMs: isMorphingShape ? SETTLE_MS : 0 });

  // The circle keeps its size; only what is drawn inside it shrinks. A custom
  // property rather than a width on the child, because the child is an `img`
  // in two of the three branches and the stylesheet already sizes those.
  const fill = fillPx ?? px;
  const wrapperStyle = {
    width: px,
    height: px,
    '--aora-avatar-fill': `${fill}px`,
    ...(halo ? { background: haloBackground(color) } : null),
    ...style,
  } as CSSProperties;

  if (hasPicture(agent)) {
    return (
      <span className={cx('aora-avatar', 'aora-avatar--picture', className)} style={wrapperStyle}>
        <img src={agent.pictureUrl} alt={agent.name ?? ''} width={px} height={px} />
      </span>
    );
  }

  if (isGroup(agent)) {
    return (
      <span className={cx('aora-avatar', 'aora-avatar--group', className)} style={wrapperStyle}>
        <AvatarStack
          members={agent.members ?? []}
          sizePx={fill}
          face={faceProp}
          nose={noseProp}
          lineWeight={lineWeight}
        />
      </span>
    );
  }

  if (still) {
    return (
      <span className={cx('aora-avatar', className)} style={wrapperStyle}>
        <img
          src={renderAvatarDataUrl(agent.id, {
            shape: agentShape(agent),
            color,
            face,
            nose,
            state,
            lineWeight,
          })}
          alt={agent.name ?? ''}
          width={fill}
          height={fill}
        />
      </span>
    );
  }

  return (
    <span className={cx('aora-avatar', className)} style={wrapperStyle}>
      <StagedMark
        shape={agentShape(agent)}
        state={state}
        color={color}
        face={face}
        nose={nose}
        lineWeight={lineWeight}
        sizePx={fill}
      />
    </span>
  );
}
