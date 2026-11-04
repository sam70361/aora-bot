import { CharacterMark } from '@aora-bot/react';
import type { CharacterState, ColorId, HudSpec, ShapeId } from '@aora-bot/react';
import { Link } from '@rspress/core/theme-original';
import { useI18n } from '../../app/shared/i18n.js';
import { useLocalePath } from '../../app/shared/locale-path.js';

type ScenarioKey =
  | 'chatStream'
  | 'agentRoster'
  | 'characterSetup'
  | 'onboarding'
  | 'desktopCompanion'
  | 'progressHud'
  | 'voice'
  | 'restricted'
  | 'bootLoading'
  | 'celebration';

interface Scenario {
  key: ScenarioKey;
  link: string;
  shape: ShapeId;
  color: ColorId;
  /** The state that best stands for the scenario, not the one it starts in. */
  state: CharacterState;
  hud?: HudSpec;
}

/** In the sidebar's order. */
const SCENARIOS: readonly Scenario[] = [
  { key: 'chatStream', link: '/scenarios/chat-stream', shape: 'blob', color: 'blue', state: 'composing' },
  {
    key: 'agentRoster',
    link: '/scenarios/agent-roster',
    shape: 'pebble',
    color: 'violet',
    state: 'notifying',
  },
  {
    key: 'characterSetup',
    link: '/scenarios/character-setup',
    shape: 'pear',
    color: 'green',
    state: 'curious',
  },
  { key: 'onboarding', link: '/scenarios/onboarding', shape: 'cloud', color: 'cyan', state: 'waking' },
  {
    key: 'desktopCompanion',
    link: '/scenarios/desktop-companion',
    shape: 'bun',
    color: 'orange',
    state: 'drowsy',
  },
  {
    key: 'progressHud',
    link: '/scenarios/progress-hud',
    shape: 'tofu',
    color: 'blue',
    state: 'working',
    hud: { kind: 'progress', value: 0.62 },
  },
  { key: 'voice', link: '/scenarios/voice', shape: 'pill', color: 'magenta', state: 'dictating' },
  { key: 'restricted', link: '/scenarios/restricted', shape: 'hex', color: 'orange', state: 'refusing' },
  { key: 'bootLoading', link: '/scenarios/boot-loading', shape: 'ghost', color: 'green', state: 'loading' },
  { key: 'celebration', link: '/scenarios/celebration', shape: 'star', color: 'yellow', state: 'celebrate' },
];

/**
 * The front door of the scenarios section: one card per page, each with a live
 * character in the state that best represents it.
 *
 * Every card is a different shape in a different state, so a shared stage
 * would host ten engines anyway. Each mark runs its own and pauses itself off
 * screen with `autoPause`, which a staged mark cannot do.
 */
export function ScenarioGrid() {
  const t = useI18n();
  const localePath = useLocalePath();

  return (
    <div className="site-scenarios">
      {SCENARIOS.map(({ key, link, shape, color, state, hud }) => (
        // The theme `Link` gives client-side navigation and route preloading on hover.
        <Link className="site-scenarios__card" href={localePath(link)} key={key}>
          <span className="site-scenarios__stage" aria-hidden="true">
            <CharacterMark shape={shape} color={color} state={state} hud={hud} sizePx={72} autoPause />
          </span>
          <span className="site-scenarios__title">{t(`scenarios.${key}.title`)}</span>
          <span className="site-scenarios__desc">{t(`scenarios.${key}.desc`)}</span>
        </Link>
      ))}
    </div>
  );
}
