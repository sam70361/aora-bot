import {
  getInkColorCss,
  type FaceStyle,
  type NoseId,
  type RosterFacts,
  type RosterSurface,
} from '@aora-bot/engine';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocale } from '../locale/index.js';
import type { CharacterHandle } from '../mark/CharacterMark.js';
import { useMarkCommand, useMarkCommands } from '../stage/commands.js';
import { usePokeCycle } from '../stage/hooks.js';
import { StagedMark } from '../stage/MarkStage.js';
import {
  agentColor,
  agentFace,
  agentNose,
  agentShape,
  hasPicture,
  type AgentLike,
} from '../avatar/identity.js';
import { activityFromTool, activityLabelForState } from './catalog.js';
import { ActivityTicker } from './ActivityTicker.js';
import { useActivityPresence, useSpawnEntrance } from './presence.js';
import { cx } from '../utils/cx.js';
import { useStable } from '../utils/hooks.js';

/**
 * Facts are keyed by value. A caller writing `facts={{ running }}` inline hands
 * us a new object every render; re-running the effect on identity would release
 * and re-hold on each one, and the notification that follows would re-render the
 * caller, which produces another new object.
 */
const factsKey = (facts: RosterFacts | undefined): string =>
  facts ? `${facts.running ? 1 : 0}${facts.composing ? 1 : 0}.${facts.activity ?? ''}` : '';

export const ACTIVITY_MARK_PX = 28;
export const GROUP_MARK_PX = 22;
export const GROUP_CYCLE_MS = 2000;

/** Ink crossfade when the group rotates. Slower, because the rotation itself is abrupt. */
export const GROUP_INK_MS = 700;

/** How long the wrapper hop lasts when the mark itself cannot be animated. */
export const POKE_HOP_MS = 420;

/** Where the label comes from, and whether it is always worth the space. */
export type ActivityLabelMode = 'always' | 'hover' | 'never';

/**
 * Where the state comes from.
 *
 * `tool` is the default: the caller names a
 * tool and both halves of the row follow from it. `facts` reads the shared
 * registry instead, so a row and the roster avatar for the same agent cannot
 * disagree about what it is doing.
 */
export type ActivityMode = 'facts' | 'tool';

export interface ActivityMarkProps {
  agent: AgentLike;
  /** Tool the agent is running. Drives both the label and the animation. */
  tool?: string | null;
  /** Override the label text. */
  text?: string;
  /** Play the arrival animation. */
  entering?: boolean;
  sizePx?: number;
  /** Face style, overriding what the agent identity resolves to. */
  face?: FaceStyle;
  /** Nose, overriding the identity. `null` draws no nose. */
  nose?: NoseId | null;
  /** Stroke width multiplier for the character. */
  lineWeight?: number;
  className?: string;
  /** Applied to the row, not to the character. */
  style?: CSSProperties;
  /** Where the animation state comes from. Defaults to `tool`. */
  activityMode?: ActivityMode;
  /**
   * Facts to publish for this agent while the row is mounted, so every other
   * mark for it follows along. Compared by value, not identity.
   */
  facts?: RosterFacts;
  /** Surface used to derive the state from facts. A conversation row is `chat`. */
  surface?: RosterSurface;
  /** Show the label always, only while the row is hovered, or never. */
  showLabel?: ActivityLabelMode;
  /** Draw the label as a speech bubble rather than as bare text. */
  bubble?: boolean;
  /** Unmount with the exit animation rather than instantly. */
  visible?: boolean;
  /** Called when the character is clicked. Its presence also makes the mark a real button. */
  onPoke?(agent: AgentLike): void;
  /** Accessible name for the poke control. */
  pokeLabel?: string;
  /** CSS colour for the mark's ink, instead of the agent's palette colour. */
  inkCss?: string;
}

/**
 * The "an agent is doing something" line in a conversation.
 *
 * Both halves come from the same source: the tool name (or the shared facts)
 * picks an animation state and a label at once, so the character and the words
 * can never disagree about what is happening.
 *
 * The interactions are the point of the component rather than decoration on
 * it. A row that arrives, reacts to a hover and answers a click is how a
 * status line stops reading as a spinner with extra steps.
 */
export function ActivityMark({
  agent,
  tool,
  text,
  entering = false,
  sizePx = ACTIVITY_MARK_PX,
  face,
  nose,
  lineWeight,
  className,
  style,
  activityMode = 'tool',
  facts,
  surface = 'chat',
  showLabel = 'always',
  bubble = false,
  visible = true,
  onPoke,
  pokeLabel,
  inkCss,
}: ActivityMarkProps) {
  const { t } = useLocale();
  const pokeName = pokeLabel ?? t('activity.poke');
  const commands = useMarkCommands();
  const snapshot = useMarkCommand(agent.id, surface);
  const presence = useActivityPresence(visible);
  const spawn = useSpawnEntrance(agent.id);

  const markRef = useRef<CharacterHandle>(null);
  const pokeCycle = usePokeCycle(markRef);
  const [hopping, setHopping] = useState(false);

  const agentId = agent.id;

  const heldFacts = useStable(facts, factsKey);

  useEffect(() => {
    if (!heldFacts) return;
    return commands.holdFacts(agentId, heldFacts);
  }, [commands, agentId, heldFacts]);

  // A row torn down mid-hover would otherwise leave the agent emphasised
  // everywhere else on the page, with nothing left to clear it.
  useEffect(() => () => commands.setEmphasis(agentId, false), [commands, agentId]);

  useEffect(() => {
    if (!hopping) return;
    const timer = setTimeout(() => setHopping(false), POKE_HOP_MS);
    return () => clearTimeout(timer);
  }, [hopping]);

  /*
   * The flourish is driven by the registry's counter rather than by the click
   * handler, so `commands.poke(id)` from anywhere else in the application —
   * a keyboard shortcut, a message off a socket — moves this character the
   * same way a click does. The counter is what changed, not its value.
   */
  const { pokeSeq } = snapshot;
  const seenPoke = useRef(pokeSeq);
  useEffect(() => {
    if (pokeSeq === seenPoke.current) return;
    seenPoke.current = pokeSeq;
    // A mirrored mark shares its animation with every other mark of the same
    // appearance, so it cannot move alone. The wrapper hops in its place.
    // oxlint-disable-next-line react/set-state-in-effect -- an animation trigger: the counter is an external event, not state to derive from
    if (!pokeCycle()) setHopping(true);
  }, [pokeSeq, pokeCycle]);

  const handlePoke = useCallback(() => {
    commands.poke(agentId);
    onPoke?.(agent);
  }, [commands, agentId, onPoke, agent]);

  if (!presence.mounted) return null;

  const descriptor = activityFromTool(tool);
  const activity = activityMode === 'facts' ? snapshot.state : descriptor.state;
  const state = spawn.state ?? activity;
  const label = text ?? t(activityMode === 'facts' ? activityLabelForState(activity) : descriptor.labelKey);

  const rootClass = cx(
    'aora-activity',
    (entering || spawn.isFirst) && 'aora-activity--entering',
    spawn.state != null && 'aora-activity--spawning',
    presence.leaving && 'aora-activity--leaving',
    snapshot.emphasis && 'aora-activity--emphasis',
    className,
  );

  const markClass = cx('aora-activity__mark', hopping && 'aora-activity__mark--poked');

  const handlers = {
    onClick: handlePoke,
    onPointerEnter: () => commands.setEmphasis(agentId, true),
    onPointerLeave: () => commands.setEmphasis(agentId, false),
  };

  const mark = (
    <StagedMark
      ref={markRef}
      shape={agentShape(agent)}
      state={state}
      color={agentColor(agent)}
      face={face ?? agentFace(agent)}
      // `=== undefined`: `null` is a request for no nose at all.
      nose={nose !== undefined ? nose : agentNose(face ? { ...agent, face } : agent)}
      lineWeight={lineWeight}
      sizePx={sizePx}
      style={inkCss ? ({ '--aora-fg': inkCss } as CSSProperties) : undefined}
    />
  );

  return (
    <span className={rootClass} style={style}>
      {/*
       * A control only when the host asked for one. Poking is a flourish; a
       * button in every row of a transcript would be a tab stop per row for
       * something a screen-reader user cannot see the result of anyway.
       */}
      {onPoke ? (
        <button type="button" className={markClass} aria-label={pokeName} {...handlers}>
          {mark}
        </button>
      ) : (
        <span className={markClass} {...handlers}>
          {mark}
        </span>
      )}

      {showLabel === 'never' ? (
        // Still in the accessibility tree: the label is the only part of the
        // row a screen reader can use, and hiding it visually is a layout
        // decision rather than a decision to say less.
        <span className="aora-visually-hidden">{label}</span>
      ) : (
        <ActivityTicker text={label} className={labelClass(showLabel, bubble)} />
      )}
    </span>
  );
}

const labelClass = (mode: ActivityLabelMode, bubble: boolean): string | undefined =>
  cx(mode === 'hover' && 'aora-activity__label--hover', bubble && 'aora-bubble') || undefined;

export interface GroupActivityMarkProps {
  members: AgentLike[];
  tool?: string | null;
  cycleMs?: number;
  sizePx?: number;
  /** Face style for whichever member is showing, overriding their identity. */
  face?: FaceStyle;
  /** Nose for whichever member is showing. `null` draws no nose. */
  nose?: NoseId | null;
  /** Stroke width multiplier for the character. */
  lineWeight?: number;
  className?: string;
  /**
   * Merged over the ink custom properties the rotation animates, so a host
   * can position the cluster without losing the crossfade.
   */
  style?: CSSProperties;
  showLabel?: ActivityLabelMode;
  onPoke?(agent: AgentLike): void;
}

/**
 * Group equivalent, rotating through the members.
 *
 * Showing every member at once turns a four-person group into a wall of
 * characters; cycling keeps the row one character wide while still telling you
 * who is involved.
 *
 * The rotation is a colour transition rather than a cut. Ink is a registered
 * custom property, so it can interpolate — an unregistered one is a string to
 * the engine and would snap from red to blue with nothing in between, which
 * looks like a render bug rather than a rotation.
 */
export function GroupActivityMark({
  members,
  tool,
  cycleMs = GROUP_CYCLE_MS,
  sizePx = GROUP_MARK_PX,
  face,
  nose,
  lineWeight,
  className,
  style,
  showLabel,
  onPoke,
}: GroupActivityMarkProps) {
  const index = useCycle(members.length, cycleMs);
  useActivityInk();

  const current = members[index];
  if (!current) return null;

  const rootStyle = {
    '--aora-activity-ink': getInkColorCss(agentColor(current)),
    '--aora-activity-ink-ms': `${GROUP_INK_MS}ms`,
    ...style,
  } as CSSProperties;

  return (
    <span className={cx('aora-activity-group', className)} style={rootStyle}>
      {hasPicture(current) ? (
        /*
         * A member with an uploaded picture has no ink to fade, so the swap
         * itself carries the transition: keyed on the id so the animation
         * restarts, rather than the image changing under a static element.
         */
        <img
          key={current.id}
          className="aora-activity-group__picture"
          src={current.pictureUrl}
          alt={current.name ?? ''}
          width={sizePx}
          height={sizePx}
        />
      ) : (
        <ActivityMark
          agent={current}
          tool={tool}
          sizePx={sizePx}
          face={face}
          nose={nose}
          lineWeight={lineWeight}
          showLabel={showLabel}
          onPoke={onPoke}
          inkCss="var(--aora-activity-ink)"
        />
      )}
    </span>
  );
}

let inkRegistered = false;

/**
 * Register the ink property once per document.
 *
 * Guarded three ways: a module flag for repeat mounts, a feature check for
 * browsers without the Properties and Values API, and a catch for a second
 * copy of the kit that already registered it — a duplicate registration
 * throws, and it would take the whole row down with it.
 */
function useActivityInk(): void {
  useEffect(() => {
    if (inkRegistered) return;
    inkRegistered = true;

    const api = globalThis.CSS as { registerProperty?: (definition: object) => void } | undefined;
    if (typeof api?.registerProperty !== 'function') return;

    try {
      api.registerProperty({
        name: '--aora-activity-ink',
        syntax: '<color>',
        inherits: true,
        initialValue: 'currentColor',
      });
    } catch {
      // Already registered. Nothing to do, and nothing worth reporting.
    }
  }, []);
}

/** Shared rotation counter. */
export function useCycle(length: number, everyMs: number): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (length <= 1) return;
    const id = setInterval(() => setTick((n) => n + 1), everyMs);
    return () => clearInterval(id);
  }, [length, everyMs]);

  // Derived at render time rather than reset in the effect, so a roster that
  // shrinks never points past its end and a roster of one never re-renders.
  return length > 0 ? tick % length : 0;
}
