import { getInkColorCss, renderStaticSvg } from '@aora-bot/react';
import type { ShapeId, ColorId, CharacterState, FaceStyle } from '@aora-bot/react';
import { useI18n } from '../../app/shared/i18n.js';
import { Link } from '@rspress/core/theme-original';
import type { CSSProperties } from 'react';
import { useComponentName } from '../labels.js';
import { useLocalePath } from '../../app/shared/locale-path.js';

type DescriptionKey =
  | 'overview.characterMark'
  | 'overview.characterMarkMirror'
  | 'overview.characterStage'
  | 'overview.markCommands'
  | 'overview.agentPortrait'
  | 'overview.avatarGroup'
  | 'overview.unreadBadge'
  | 'overview.workingBadge'
  | 'overview.avatarStudio'
  | 'overview.characterSelector'
  | 'overview.agentCharacterSelector'
  | 'overview.compactCharacterSelector'
  | 'overview.templateDialog'
  | 'overview.usePublishMark'
  | 'overview.activityBadge'
  | 'overview.activityLine'
  | 'overview.celebrationLayer'
  | 'overview.occupancyList'
  | 'overview.localeProvider'
  | 'overview.agentState'
  | 'overview.idleSleep'
  | 'overview.spriteMark'
  | 'overview.hudPlate'
  | 'overview.agentHud'
  | 'overview.restrictedScene'
  | 'overview.bootLoop'
  | 'overview.castStage'
  | 'overview.walkthrough';

interface Entry {
  title: string;
  link: string;
  descriptionKey: DescriptionKey;
  preview: { shape: ShapeId; color: ColorId; state: CharacterState; face?: FaceStyle };
}

interface Group {
  titleKey:
    | 'overview.group.core'
    | 'overview.group.avatar'
    | 'overview.group.activity'
    | 'overview.group.agent'
    | 'overview.group.hud'
    | 'overview.group.editor'
    | 'overview.group.scenes'
    | 'overview.group.other';
  entries: Entry[];
}

/*
 * Grouped by what you reach for, not by how the code is layered.
 *
 * A flat list of thirty components makes the reader compare everything with
 * everything. Grouping answers the actual question — "I need an avatar" —
 * before they have to read a single description.
 */
const GROUPS: Group[] = [
  {
    titleKey: 'overview.group.core',
    entries: [
      {
        title: 'CharacterMark',
        link: '/components/character-mark',
        descriptionKey: 'overview.characterMark',
        preview: { shape: 'blob', color: 'blue', state: 'happy' },
      },
      {
        title: 'CharacterMarkMirror',
        link: '/components/character-mark-mirror',
        descriptionKey: 'overview.characterMarkMirror',
        preview: { shape: 'pebble', color: 'cyan', state: 'idle' },
      },
      {
        title: 'CharacterStageProvider',
        link: '/components/character-stage',
        descriptionKey: 'overview.characterStage',
        preview: { shape: 'tofu', color: 'violet', state: 'orbit' },
      },
      {
        title: 'useMarkCommands',
        link: '/components/mark-commands',
        descriptionKey: 'overview.markCommands',
        preview: { shape: 'hex', color: 'cyan', state: 'alerting' },
      },
    ],
  },
  {
    titleKey: 'overview.group.avatar',
    entries: [
      {
        title: 'AgentPortrait',
        link: '/components/agent-portrait',
        descriptionKey: 'overview.agentPortrait',
        preview: { shape: 'egg', color: 'green', state: 'idle' },
      },
      {
        title: 'AvatarGroup',
        link: '/components/avatar-group',
        descriptionKey: 'overview.avatarGroup',
        preview: { shape: 'hex', color: 'orange', state: 'idle' },
      },
      {
        title: 'UnreadBadge',
        link: '/components/avatar-frame',
        descriptionKey: 'overview.unreadBadge',
        preview: { shape: 'tofu', color: 'red', state: 'notifying' },
      },
      {
        title: 'WorkingBadge',
        link: '/components/working-badge',
        descriptionKey: 'overview.workingBadge',
        preview: { shape: 'bun', color: 'blue', state: 'working' },
      },
      {
        title: 'AvatarStudio',
        link: '/components/avatar-studio',
        descriptionKey: 'overview.avatarStudio',
        preview: { shape: 'blob', color: 'magenta', state: 'curious', face: 'line' },
      },
    ],
  },
  {
    titleKey: 'overview.group.activity',
    entries: [
      {
        title: 'ActivityBadge',
        link: '/components/activity-badge',
        descriptionKey: 'overview.activityBadge',
        preview: { shape: 'cloud', color: 'blue', state: 'thinking' },
      },
      {
        title: 'ActivityLine',
        link: '/components/activity-line',
        descriptionKey: 'overview.activityLine',
        preview: { shape: 'pill', color: 'gray', state: 'dictating' },
      },
      {
        title: 'CelebrationLayer',
        link: '/components/celebration-layer',
        descriptionKey: 'overview.celebrationLayer',
        preview: { shape: 'drop', color: 'yellow', state: 'celebrate' },
      },
      {
        title: 'OccupancyList',
        link: '/components/occupancy-list',
        descriptionKey: 'overview.occupancyList',
        preview: { shape: 'tofu', color: 'brown', state: 'working' },
      },
    ],
  },
  {
    titleKey: 'overview.group.hud',
    entries: [
      {
        title: 'HudPlate',
        link: '/components/hud-plate',
        descriptionKey: 'overview.hudPlate',
        preview: { shape: 'hex', color: 'blue', state: 'progress', face: 'line' },
      },
      {
        title: 'AgentHud',
        link: '/components/agent-hud',
        descriptionKey: 'overview.agentHud',
        preview: { shape: 'ghost', color: 'green', state: 'radar', face: 'line' },
      },
    ],
  },
  {
    titleKey: 'overview.group.agent',
    entries: [
      {
        title: 'AgentStateProvider',
        link: '/components/agent-state',
        descriptionKey: 'overview.agentState',
        preview: { shape: 'star', color: 'yellow', state: 'thinking' },
      },
      {
        title: 'useIdleSleep',
        link: '/components/use-idle-sleep',
        descriptionKey: 'overview.idleSleep',
        preview: { shape: 'blob', color: 'violet', state: 'drowsy' },
      },
      {
        title: 'SpriteMark',
        link: '/components/sprite-mark',
        descriptionKey: 'overview.spriteMark',
        preview: { shape: 'bun', color: 'orange', state: 'happy' },
      },
    ],
  },
  {
    titleKey: 'overview.group.editor',
    entries: [
      {
        title: 'CharacterSelector',
        link: '/components/character-selector',
        descriptionKey: 'overview.characterSelector',
        preview: { shape: 'hex', color: 'magenta', state: 'idle' },
      },
      {
        title: 'AgentCharacterSelector',
        link: '/components/agent-character-selector',
        descriptionKey: 'overview.agentCharacterSelector',
        preview: { shape: 'heart', color: 'violet', state: 'listening', face: 'line' },
      },
      {
        title: 'CompactCharacterSelector',
        link: '/components/compact-character-selector',
        descriptionKey: 'overview.compactCharacterSelector',
        preview: { shape: 'hex', color: 'cyan', state: 'idle', face: 'line' },
      },
      {
        title: 'TemplateDialog',
        link: '/components/template-dialog',
        descriptionKey: 'overview.templateDialog',
        preview: { shape: 'tofu', color: 'gray', state: 'writing' },
      },
      {
        title: 'usePublishMark',
        link: '/components/use-publish-mark',
        descriptionKey: 'overview.usePublishMark',
        preview: { shape: 'star', color: 'orange', state: 'celebrate' },
      },
    ],
  },
  {
    titleKey: 'overview.group.scenes',
    entries: [
      {
        title: 'RestrictedScene',
        link: '/components/restricted-scene',
        descriptionKey: 'overview.restrictedScene',
        preview: { shape: 'onigiri', color: 'red', state: 'refusing' },
      },
      {
        title: 'BootLoop',
        link: '/components/boot-loop',
        descriptionKey: 'overview.bootLoop',
        preview: { shape: 'pill', color: 'blue', state: 'loading' },
      },
      {
        title: 'CastLineup',
        link: '/components/cast-lineup',
        descriptionKey: 'overview.castStage',
        preview: { shape: 'ghost', color: 'violet', state: 'playful' },
      },
      {
        title: 'DemoDesktop',
        link: '/components/walkthrough',
        descriptionKey: 'overview.walkthrough',
        preview: { shape: 'flame', color: 'orange', state: 'excited' },
      },
    ],
  },
  {
    titleKey: 'overview.group.other',
    entries: [
      {
        title: 'LocaleProvider',
        link: '/components/locale-provider',
        descriptionKey: 'overview.localeProvider',
        preview: { shape: 'leaf', color: 'green', state: 'reading' },
      },
    ],
  },
];

/** Thumbnail index of the component layer, grouped by purpose. */
export function ComponentOverview() {
  const t = useI18n();
  const componentName = useComponentName();
  const localePath = useLocalePath();

  return (
    <div className="site-overview">
      {GROUPS.map((group) => (
        <section className="site-overview__group" key={group.titleKey}>
          <h3 className="site-overview__heading">{t(group.titleKey)}</h3>
          <div className="site-overview__grid">
            {group.entries.map((entry) => {
              const name = componentName(entry.title);
              return (
                // The theme `Link` gives client-side navigation and route
                // preloading on hover, which a plain <a> does not.
                <Link className="site-overview__card" href={localePath(entry.link)} key={entry.title}>
                  <span
                    className="site-overview__preview aora-mark"
                    style={{ '--aora-fg': getInkColorCss(entry.preview.color) } as CSSProperties}
                    // Inline so the eye cut-outs resolve to the card colour in
                    // both themes; an <img> cannot see the page's variables.
                    dangerouslySetInnerHTML={{
                      __html: renderStaticSvg({
                        ...entry.preview,
                        eyeColor: 'var(--aora-bg)',
                        colorScheme: 'page',
                      }),
                    }}
                  />
                  <span className="site-overview__title">
                    {entry.title}
                    {name && <em className="site-overview__name">{name}</em>}
                  </span>
                  <span className="site-overview__desc">{t(entry.descriptionKey)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
