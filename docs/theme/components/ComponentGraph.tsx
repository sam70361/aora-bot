import { useI18n } from '../../app/shared/i18n.js';
import { Link } from '@rspress/core/theme-original';
import { useComponentName } from '../labels.js';
import { useLocalePath } from '../../app/shared/locale-path.js';

interface Node {
  name: string;
  link: string;
  /** What this piece is composed from, shown as a small caption. */
  uses?: string[];
}

interface Tier {
  id: 'engine' | 'core' | 'agent' | 'surface';
  titleKey: 'graph.engine' | 'graph.core' | 'graph.agent' | 'graph.surface';
  noteKey: 'graph.engine.note' | 'graph.core.note' | 'graph.agent.note' | 'graph.surface.note';
  nodes: Node[];
}

const TIERS: Tier[] = [
  {
    id: 'engine',
    titleKey: 'graph.engine',
    noteKey: 'graph.engine.note',
    nodes: [{ name: '@aora-bot/engine', link: '/guide/without-react' }],
  },
  {
    id: 'core',
    titleKey: 'graph.core',
    noteKey: 'graph.core.note',
    nodes: [
      { name: 'CharacterMark', link: '/components/character-mark', uses: ['createCharacter'] },
      { name: 'CharacterMarkMirror', link: '/components/character-mark-mirror', uses: ['<use href>'] },
      {
        name: 'CharacterStageProvider',
        link: '/components/character-stage',
        uses: ['CharacterMark', 'CharacterMarkMirror'],
      },
      { name: 'StagedMark', link: '/components/character-stage', uses: ['CharacterStageProvider'] },
      { name: 'useMarkCommands', link: '/components/mark-commands', uses: ['CharacterStageProvider'] },
    ],
  },
  {
    id: 'agent',
    titleKey: 'graph.agent',
    noteKey: 'graph.agent.note',
    nodes: [
      { name: 'AgentStateProvider', link: '/components/agent-state', uses: ['createArbiter'] },
      { name: 'AgentHud', link: '/components/agent-hud', uses: ['AgentStateProvider', 'HudPlate'] },
      { name: 'useIdleSleep', link: '/components/use-idle-sleep', uses: ['AgentStateProvider'] },
      { name: 'usePublishMark', link: '/components/use-publish-mark', uses: ['CelebrationLayer'] },
      { name: 'SpriteMark', link: '/components/sprite-mark', uses: ['resolveSpriteFrames'] },
    ],
  },
  {
    id: 'surface',
    titleKey: 'graph.surface',
    noteKey: 'graph.surface.note',
    nodes: [
      { name: 'HudPlate', link: '/components/hud-plate', uses: ['evaluateHud'] },
      { name: 'AgentPortrait', link: '/components/agent-portrait', uses: ['StagedMark'] },
      { name: 'AvatarGroup', link: '/components/avatar-group', uses: ['AgentPortrait'] },
      { name: 'UnreadBadge', link: '/components/avatar-frame', uses: ['AgentPortrait'] },
      { name: 'WorkingBadge', link: '/components/working-badge', uses: ['AgentPortrait'] },
      {
        name: 'AvatarStudio',
        link: '/components/avatar-studio',
        uses: ['AgentPortrait', 'CharacterSelector'],
      },
      { name: 'CharacterSelector', link: '/components/character-selector', uses: ['CharacterMark'] },
      {
        name: 'AgentCharacterSelector',
        link: '/components/agent-character-selector',
        uses: ['CharacterSelector'],
      },
      {
        name: 'CompactCharacterSelector',
        link: '/components/compact-character-selector',
        uses: ['CharacterSelector'],
      },
      {
        name: 'TemplateDialog',
        link: '/components/template-dialog',
        uses: ['AgentPortrait', 'usePublishMark'],
      },
      { name: 'ActivityBadge', link: '/components/activity-badge', uses: ['StagedMark', 'ActivityLine'] },
      { name: 'ActivityLine', link: '/components/activity-line' },
      { name: 'OccupancyList', link: '/components/occupancy-list', uses: ['StagedMark'] },
      { name: 'CelebrationLayer', link: '/components/celebration-layer', uses: ['ticker'] },
      {
        name: 'RestrictedScene',
        link: '/components/restricted-scene',
        uses: ['CharacterMark', 'DeviceBezel'],
      },
      { name: 'BootLoop', link: '/components/boot-loop', uses: ['CharacterMark'] },
      { name: 'CastLineup', link: '/components/cast-lineup', uses: ['StagedMark', 'useCastScene'] },
      { name: 'DemoDesktop', link: '/components/walkthrough', uses: ['StagedMark', 'ActivityBadge'] },
    ],
  },
];

/**
 * How the component layer is stacked, as three tiers with the composition
 * relationship written on each node.
 *
 * Plain HTML and CSS rather than a diagram runtime: the relationships are few
 * enough to read as a list, every node is a real link, and the text follows
 * the site language for free.
 *
 * A `<nav>` and not `role="img"`: every node is a link to a component page, and
 * labelling the whole thing as one image would hide thirty real destinations
 * from a screen reader in exchange for a one-line description of the layout.
 */
export function ComponentGraph() {
  const t = useI18n();
  const componentName = useComponentName();
  const localePath = useLocalePath();

  return (
    <nav className="site-graph" aria-label={t('graph.aria')}>
      {TIERS.map((tier, index) => (
        <div className={`site-graph__tier site-graph__tier--${tier.id}`} key={tier.id}>
          <div className="site-graph__side">
            <span className="site-graph__step">{index + 1}</span>
            <span className="site-graph__title">{t(tier.titleKey)}</span>
            <span className="site-graph__note">{t(tier.noteKey)}</span>
          </div>
          <ul className="site-graph__nodes">
            {tier.nodes.map((node) => {
              const name = componentName(node.name);
              return (
                <li key={node.name}>
                  <Link className="site-graph__node" href={localePath(node.link)}>
                    <span className="site-graph__name">
                      <code>{node.name}</code>
                      {name && <em>{name}</em>}
                    </span>
                    {node.uses && (
                      <span className="site-graph__uses">
                        {node.uses.map((u) => (
                          <code key={u}>{u}</code>
                        ))}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="site-graph__foot">
        <code>LocaleProvider</code> {t('graph.locale')}
      </p>
    </nav>
  );
}
