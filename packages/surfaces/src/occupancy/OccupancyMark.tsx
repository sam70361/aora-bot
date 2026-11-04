import type { CharacterState, FaceStyle, NoseId } from '@aora-bot/engine';
import type { CSSProperties } from 'react';
import {
  agentColor,
  agentFace,
  agentNose,
  agentShape,
  hasPicture,
  type AgentLike,
  CharacterMark,
  StagedMark,
  cx,
} from '@aora-bot/react';
import { useSurfaceLocale } from '../locale/index.js';

export interface OccupancyMarkProps {
  agent: AgentLike;
  state?: CharacterState;
  sizePx?: number;
  face?: FaceStyle;
  nose?: NoseId | null;
  /**
   * Heavier or lighter line. Setting this opts out of the shared stage.
   *
   * The stage can carry a line weight — it is part of the appearance key, so
   * a heavier pen gets its own source — but a weight set on one row of a list
   * is a one-off by nature, and minting a whole engine to be mirrored once is
   * worse than just running it here.
   */
  lineWeight?: number;
  /** Makes the mark a button. Without it the mark is presentational. */
  onSelect?: (agent: AgentLike) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * One agent, small, in a list of who is using something.
 *
 * Shared through `StagedMark` rather than drawn per row. A resource list is
 * the shape of page that has forty of these on it, most of them in the same
 * state at the same time, and that is exactly the case the stage collapses to
 * a single animation.
 */
export function OccupancyMark({
  agent,
  state = 'working',
  sizePx = 22,
  face,
  nose,
  lineWeight,
  onSelect,
  className,
  style,
}: OccupancyMarkProps) {
  const { t } = useSurfaceLocale();
  const picture = hasPicture(agent);
  const label = agent.name ?? agent.id;

  const mark = picture ? (
    <img className="aora-s-occupancy__picture" src={agent.pictureUrl} alt="" width={sizePx} height={sizePx} />
  ) : lineWeight != null ? (
    <CharacterMark
      shape={agentShape(agent)}
      color={agentColor(agent)}
      face={face ?? agentFace(agent)}
      nose={nose !== undefined ? nose : agentNose(agent)}
      lineWeight={lineWeight}
      state={state}
      sizePx={sizePx}
      seed={agent.id}
    />
  ) : (
    <StagedMark
      shape={agentShape(agent)}
      color={agentColor(agent)}
      face={face ?? agentFace(agent)}
      nose={nose !== undefined ? nose : agentNose(agent)}
      state={state}
      sizePx={sizePx}
    />
  );

  if (!onSelect) {
    return (
      <span className={cx('aora-s-occupancy__mark', className)} title={label} style={style}>
        {mark}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={cx('aora-s-occupancy__mark', 'aora-s-occupancy__mark--button', className)}
      aria-label={`${t('occupancy.select')}: ${label}`}
      title={label}
      style={style}
      onClick={() => onSelect(agent)}
    >
      {mark}
    </button>
  );
}
