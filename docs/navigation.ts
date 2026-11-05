import type { Nav, Sidebar, SidebarItem, SidebarSectionHeader } from '@rspress/core';

/*
 * Navigation and sidebar, defined once for both languages.
 *
 * Rspress can derive these from `_nav.json` and `_meta.json`, but that gives a
 * sidebar scoped to one top-level directory: standing in the guide you cannot
 * see that a components section exists. This file declares a single
 * sidebar listing every section at once, the way a component library's docs
 * do — the table of contents is the map of the project, not of the folder you
 * happen to be in.
 *
 * Declaring `themeConfig.sidebar` switches the automatic generation off
 * entirely, nav included, so the nav is declared here too and the `_nav.json`
 * and `_meta.json` files are gone.
 *
 * Links are written without a language prefix. Rspress normalises them per
 * locale, leaving Chinese at the root and prefixing English with `/en/`, so a
 * page appears in exactly one place below and cannot drift between languages.
 */

interface Entry {
  link: string;
  /**
   * Sentence case, and identical to the page's H1. A title that disagrees with
   * the heading it leads to makes the sidebar read as a different document.
   */
  en: string;
  /**
   * The translation alone. The Chinese sidebar shows it after the `en` label
   * (`entryLabel`): `shape="mochi"` is what you type, and a reader hunting for
   * a component usually knows its export name before they know what we called
   * it in Chinese. The English half is composed, not copied, so the two
   * sidebars cannot describe a page differently.
   *
   * Rspress renders sidebar and prev / next text as inline Markdown, so the
   * translation goes in as emphasis and the stylesheet sets it as a quieter
   * second voice that never breaks across lines.
   */
  zh: string;
}

const entryLabel = (entry: Entry, lang: Lang): string =>
  lang === 'en' ? entry.en : `${entry.en} *${entry.zh}*`;

interface Section {
  en: string;
  zh: string;
  items: Entry[];
}

const SECTIONS: Section[] = [
  {
    en: 'Start',
    zh: '开始',
    items: [
      { link: '/guide/getting-started', en: 'Getting started', zh: '开始使用' },
      { link: '/guide/without-react', en: 'Without React', zh: '不用 React' },
      { link: '/guide/theming', en: 'Theming', zh: '主题' },
      { link: '/guide/custom-shapes', en: 'Custom shapes', zh: '自定义形状' },
      { link: '/guide/avatar-api', en: 'Avatar API', zh: '头像接口' },
      { link: '/guide/license', en: 'License', zh: '授权' },
      { link: '/guide/copyright', en: 'Copyright', zh: '版权声明' },
    ],
  },
  {
    /* The design pages, in the order a reader meets a character: body, face, ink, painting, then the named cast. */
    en: 'Characters and styles',
    zh: '角色与画风',
    items: [
      { link: '/design/shapes', en: 'Shapes', zh: '形状' },
      { link: '/design/expressions', en: 'Expressions', zh: '表情' },
      { link: '/design/states', en: 'States', zh: '状态' },
      { link: '/design/palette', en: 'Palette', zh: '配色' },
      { link: '/design/face', en: 'Faces', zh: '五官' },
      { link: '/design/styles/vector', en: 'Vector styles', zh: '矢量风格' },
      { link: '/design/styles/pixel', en: 'Pixel style', zh: '像素风格' },
      { link: '/design/styles/kaomoji', en: 'Kaomoji style', zh: '颜文字风格' },
      { link: '/design/cast', en: 'Cast', zh: '角色阵容' },
    ],
  },
  {
    en: 'Components',
    zh: '组件',
    items: [
      { link: '/components/overview', en: 'Components', zh: '组件' },
      { link: '/components/character-mark', en: 'CharacterMark', zh: '角色' },
      {
        link: '/components/character-mark-mirror',
        en: 'CharacterMarkMirror',
        zh: '角色镜像',
      },
      { link: '/components/mark-stage', en: 'MarkStageProvider', zh: '共享舞台' },
      { link: '/components/mark-commands', en: 'Mark commands', zh: '角色指令' },
      { link: '/components/hud-plate', en: 'HudPlate', zh: 'HUD 底盘' },
      { link: '/components/agent-avatar', en: 'AgentAvatar', zh: '头像' },
      { link: '/components/avatar-stack', en: 'AvatarStack', zh: '头像组' },
      { link: '/components/avatar-chrome', en: 'Badges and status', zh: '徽标与状态' },
      { link: '/components/working-badge', en: 'WorkingBadge', zh: '忙碌徽标' },
      { link: '/components/character-picker', en: 'CharacterPicker', zh: '角色选择器' },
      {
        link: '/components/agent-character-picker',
        en: 'AgentCharacterPicker',
        zh: '暂存选择器',
      },
      {
        link: '/components/compact-character-picker',
        en: 'CompactCharacterPicker',
        zh: '紧凑选择器',
      },
      { link: '/components/avatar-editor', en: 'AvatarEditor', zh: '头像编辑器' },
      { link: '/components/template-dialog', en: 'TemplateDialog', zh: '模板对话框' },
      { link: '/components/use-publish-mark', en: 'usePublishMark', zh: '发布状态' },
      { link: '/components/activity-mark', en: 'ActivityMark', zh: '活动标记' },
      { link: '/components/activity-ticker', en: 'ActivityTicker', zh: '活动跑马' },
      { link: '/components/occupancy-list', en: 'OccupancyList', zh: '占用列表' },
      { link: '/components/restricted-scene', en: 'RestrictedScene', zh: '受限场景' },
      { link: '/components/boot-loop', en: 'BootLoop', zh: '启动序列' },
      { link: '/components/cast-stage', en: 'CastStage', zh: '群像舞台' },
      {
        link: '/components/walkthrough',
        en: 'Walkthrough surfaces',
        zh: '引导页组件',
      },
      { link: '/components/confetti-layer', en: 'ConfettiLayer', zh: '彩纸层' },
      { link: '/components/locale-provider', en: 'LocaleProvider', zh: '多语言' },
      { link: '/components/api-index', en: 'API index', zh: '索引' },
    ],
  },
  {
    /*
     * Cross-cutting: these pages live in the guide, design and components
     * spaces and are gathered here as one path through them. The navbar's
     * Docs item covers all three spaces, so it stays lit on each of them.
     */
    en: 'Agents',
    zh: '智能体',
    items: [
      { link: '/guide/agent-integration', en: 'Agent integration', zh: '智能体集成' },
      { link: '/design/protocol', en: 'Emotion protocol', zh: '情绪协议' },
      { link: '/components/agent-state', en: 'AgentStateProvider', zh: '智能体状态' },
      { link: '/components/agent-hud', en: 'AgentHud', zh: '智能体 HUD' },
      { link: '/components/use-idle-sleep', en: 'useIdleSleep', zh: '空闲入睡' },
      { link: '/components/sprite-mark', en: 'SpriteMark', zh: '精灵图' },
    ],
  },
  {
    en: 'Scenarios',
    zh: '场景',
    items: [
      { link: '/scenarios/', en: 'Overview', zh: '总览' },
      { link: '/scenarios/chat-stream', en: 'Chat stream', zh: '对话流' },
      { link: '/scenarios/agent-roster', en: 'Agent roster', zh: '智能体名册' },
      { link: '/scenarios/character-setup', en: 'Character setup', zh: '角色设置' },
      { link: '/scenarios/onboarding', en: 'Onboarding', zh: '新手引导' },
      {
        link: '/scenarios/desktop-companion',
        en: 'Desktop companion',
        zh: '桌面伙伴',
      },
      { link: '/scenarios/progress-hud', en: 'Progress HUD', zh: '进度 HUD' },
      { link: '/scenarios/voice', en: 'Voice', zh: '语音' },
      { link: '/scenarios/restricted', en: 'Refusals and limits', zh: '拒绝与限制' },
      { link: '/scenarios/boot-loading', en: 'Boot and loading', zh: '启动与加载' },
      { link: '/scenarios/celebration', en: 'Celebration', zh: '庆祝' },
    ],
  },
  {
    en: 'Going further',
    zh: '进阶',
    items: [
      { link: '/guide/performance', en: 'Performance', zh: '性能' },
      { link: '/guide/server-rendering', en: 'Server rendering', zh: '服务端渲染' },
      {
        link: '/guide/internationalisation',
        en: 'Internationalisation',
        zh: '国际化',
      },
      { link: '/guide/accessibility', en: 'Accessibility', zh: '无障碍' },
      { link: '/guide/browser-support', en: 'Browser support', zh: '浏览器支持' },
    ],
  },
  {
    en: 'Internals',
    zh: '深入原理',
    items: [
      { link: '/internals/rendering', en: 'Rendering structure', zh: '渲染结构' },
      { link: '/internals/shape-derivation', en: 'Shape derivation', zh: '形状推导' },
      {
        link: '/internals/face-and-pose',
        en: 'Face and pose',
        zh: '面部与姿态投影',
      },
      {
        link: '/internals/springs',
        en: 'Springs and states',
        zh: '弹簧与状态机',
      },
      { link: '/internals/belts', en: 'Belts and particles', zh: '腰带与粒子' },
    ],
  },
];

type Lang = 'en' | 'zh';

/*
 * `sectionHeaderText` renders a plain heading rather than a collapsible group,
 * which is the point: with one sidebar for the whole site, collapsing is the
 * behaviour we are trying to get rid of.
 */
export const sidebarFor = (lang: Lang): Sidebar => ({
  '/': SECTIONS.flatMap<SidebarSectionHeader | SidebarItem>((section) => [
    { sectionHeaderText: section[lang] },
    ...section.items.map((entry) => ({ text: entryLabel(entry, lang), link: entry.link })),
  ]),
});

/*
 * Five items, and only five: the console (the home page, where a character is
 * built by clicking), the docs, the scenarios, the sponsor page, and the
 * classic Emotion Ball, which keeps its own site and license. The docs
 * item stands for every space the one sidebar draws from, so the bar does not
 * need an edit when a page is added, and the sidebar is the map.
 *
 * `activeMatch` is a regular expression tested against the pathname, so one
 * unprefixed pattern highlights correctly under `/en/` as well. The console
 * matches the root and `/en/` exactly, because a bare `/` would match
 * everything.
 */
export const navFor = (lang: Lang): Nav => {
  const t = (en: string, zh: string) => (lang === 'en' ? en : zh);

  return [
    { text: t('Console', '控制台'), link: '/', activeMatch: '^/(en/?)?(index(\\.html)?)?$' },
    {
      text: t('Docs', '文档'),
      link: '/guide/getting-started',
      activeMatch: '/(guide|components|design|internals)/',
    },
    { text: t('Scenarios', '场景'), link: '/scenarios/', activeMatch: '/scenarios/' },
    { text: t('Sponsor', '打赏作者'), link: '/sponsor', activeMatch: '/sponsor' },
    { text: t('Emotion Ball', '表情馆'), link: 'https://sam70361.github.io/aora-bot/' },
  ];
};
