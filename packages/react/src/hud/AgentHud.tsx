import { formatHud, type CharacterState, type FaceStyle, type NoseId } from '@aora-bot/engine';
import type { CSSProperties } from 'react';
import { useOptionalAgentState } from '../agent/AgentState.js';
import { agentColor, agentFace, agentNose, agentShape, type AgentLike } from '../avatar/identity.js';
import { CharacterMark } from '../mark/CharacterMark.js';
import { HudPlate, type HudLevel, type HudPlacement } from './HudPlate.js';
import { useAgentHud } from './useHudSpec.js';

export interface AgentHudProps {
  /** Whose face to draw. Without one the character falls back to the default blob. */
  agent?: AgentLike;
  sizePx?: number;
  placement?: HudPlacement;
  face?: FaceStyle;
  nose?: NoseId | null;
  lineWeight?: number;
  /** Override the level the state implies. */
  level?: HudLevel;
  /** Heading on the plate. Defaults to the agent's name. */
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * The arbiter's current reading, as a character and a plate.
 *
 * Everything on screen comes from one place: the winning session's HUD
 * prints the figure, and the caption is that session's tip. The face is
 * the arbiter's state, not the HUD's — a HUD is data around the body,
 * not a second expression. Wiring those two up separately is where hosts
 * get it wrong: a dial from one session beside a face from another says
 * two different things about the same agent at the same time.
 *
 * Outside an `AgentStateProvider` it draws an idle character and no dial,
 * rather than throwing: a HUD is a decoration on a page that has to render
 * whether or not an agent has connected yet.
 */
export function AgentHud({
  agent,
  sizePx = 72,
  placement = 'bottom',
  face,
  nose,
  lineWeight,
  level,
  title,
  className,
  style,
}: AgentHudProps) {
  const agentState = useOptionalAgentState();
  const hud = useAgentHud();
  const reading = hud ? formatHud(hud) : null;
  const state = agentState?.state ?? 'idle';
  const tips = agentState?.tips;

  return (
    <HudPlate
      title={title ?? agent?.name}
      value={reading?.value}
      unit={reading?.unit}
      lines={tips ? [tips] : undefined}
      level={level ?? reading?.level ?? levelForState(state)}
      placement={placement}
      sizePx={sizePx}
      className={className}
      style={style}
    >
      <CharacterMark
        shape={agent ? agentShape(agent) : undefined}
        color={agent ? agentColor(agent) : undefined}
        face={face ?? (agent ? agentFace(agent) : undefined)}
        nose={nose !== undefined ? nose : agent ? agentNose(agent) : undefined}
        lineWeight={lineWeight}
        state={state}
        hud={hud}
        sizePx={sizePx}
        seed={agent?.id}
      />
    </HudPlate>
  );
}

/**
 * States that mean "look at this" colour the plate.
 *
 * Deliberately a short list. A plate that changes tone on every state would
 * flicker through four colours during one ordinary turn, and the point of the
 * warn and alert levels is that they are rare enough to be worth noticing.
 */
function levelForState(state: CharacterState): HudLevel {
  if (state === 'alerting' || state === 'refusing') return 'alert';
  if (state === 'waiting' || state === 'suspicious') return 'warn';
  if (state === 'celebrate' || state === 'proud' || state === 'happy') return 'ok';
  return 'info';
}
