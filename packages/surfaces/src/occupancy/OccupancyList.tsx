import type { CharacterState, FaceStyle, NoseId } from '@aora-bot/engine';
import type { CSSProperties } from 'react';
import { type AgentLike, cx } from '@aora-bot/react';
import { useSurfaceLocale } from '../locale/index.js';
import { OccupancyMark } from './OccupancyMark.js';

export interface OccupancyRow {
  /** Stable key. A file path, a channel id, a device name. */
  id: string;
  /** What is being used, as the person reading it would name it. */
  label: string;
  /** Who is using it. An empty list renders as "not in use" rather than as a gap. */
  agents: readonly AgentLike[];
  /** State for this row's marks. `working` unless the host knows better. */
  state?: CharacterState;
}

export interface OccupancyListProps {
  rows: readonly OccupancyRow[];
  /** Marks shown before the overflow count. */
  maxVisible?: number;
  sizePx?: number;
  face?: FaceStyle;
  nose?: NoseId | null;
  lineWeight?: number;
  onSelect?: (agent: AgentLike, row: OccupancyRow) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Which agents are on which resource.
 *
 * Faces rather than names, because the question this list answers is "is
 * anything touching that right now", and a row of characters answers it at a
 * glance where a column of names has to be read. Names are still there on
 * hover and to a screen reader — the marks are a summary, not a replacement.
 *
 * Overflow is a count rather than a scroll: four faces and "+7" is a true
 * statement about a busy resource, and a row that grows with its occupants
 * makes the list jump every time one arrives.
 */
export function OccupancyList({
  rows,
  maxVisible = 4,
  sizePx = 22,
  face,
  nose,
  lineWeight,
  onSelect,
  className,
  style,
}: OccupancyListProps) {
  const { t } = useSurfaceLocale();

  return (
    <ul className={cx('aora-s-occupancy', className)} style={style}>
      {rows.map((row) => {
        const visible = row.agents.slice(0, Math.max(0, maxVisible));
        const overflow = row.agents.length - visible.length;

        return (
          <li key={row.id} className="aora-s-occupancy__row">
            <span className="aora-s-occupancy__label">{row.label}</span>

            {row.agents.length === 0 ? (
              <span className="aora-s-occupancy__idle">{t('occupancy.idle')}</span>
            ) : (
              <span
                className="aora-s-occupancy__marks"
                aria-label={`${t('occupancy.inUse')}: ${row.agents
                  .map((agent) => agent.name ?? agent.id)
                  .join(', ')}`}
              >
                {visible.map((agent) => (
                  <OccupancyMark
                    key={agent.id}
                    agent={agent}
                    state={row.state}
                    sizePx={sizePx}
                    face={face}
                    nose={nose}
                    lineWeight={lineWeight}
                    onSelect={onSelect ? (picked) => onSelect(picked, row) : undefined}
                  />
                ))}
                {overflow > 0 && (
                  <span className="aora-s-occupancy__overflow" style={{ width: sizePx, height: sizePx }}>
                    +{overflow}
                  </span>
                )}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
