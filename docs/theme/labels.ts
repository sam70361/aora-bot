import { useLang } from '@rspress/core/runtime';

/*
 * Chinese display names for this site's component pages.
 *
 * Every id-driven family (shapes, colours, states, expressions, mouths, noses,
 * face styles, state groups) comes from the kit's own locale table through
 * `useLabel()` / `useLocale()` in `@aora-bot/react`. Component names are not
 * engine identifiers and the kit has no table for them, so this one family
 * lives here. They are display-only:
 * the identifier is always shown, the name beside it, the way a component
 * library lists "Avatar 头像".
 */
const COMPONENTS: Record<string, string> = {
  CharacterMark: '角色',
  CharacterMarkMirror: '角色镜像',
  CharacterStageProvider: '共享舞台',
  StagedMark: '舞台角色',
  AgentPortrait: '头像',
  AvatarGroup: '头像组',
  UnreadBadge: '徽标与状态',
  WorkingBadge: '忙碌徽标',
  CharacterSelector: '角色选择器',
  AgentCharacterSelector: '暂存选择器',
  CompactCharacterSelector: '紧凑选择器',
  ActivityBadge: '活动标记',
  ActivityLine: '活动跑马',
  CelebrationLayer: '彩纸层',
  LocaleProvider: '多语言',
  AgentStateProvider: '智能体状态',
  useIdleSleep: '空闲入睡',
  SpriteMark: '精灵图',
  HudPlate: 'HUD 底盘',
  AgentHud: '智能体 HUD',
  useMarkCommands: '角色指令',
  AvatarStudio: '头像编辑器',
  TemplateDialog: '模板对话框',
  usePublishMark: '发布状态',
  OccupancyList: '占用列表',
  RestrictedScene: '受限场景',
  BootLoop: '启动序列',
  CastLineup: '群像舞台',
  DemoDesktop: '引导页组件',
};

/**
 * Returns the Chinese display name for a component, or `null` on any other
 * language. Callers render the identifier either way, so a `null` simply means
 * the identifier stands alone.
 */
export function useComponentName(): (name: string) => string | null {
  const lang = useLang();
  if (lang !== 'zh') return () => null;
  return (name) => COMPONENTS[name] ?? null;
}
