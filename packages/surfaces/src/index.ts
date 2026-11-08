// Walkthrough
export { DemoDesktop } from './walkthrough/DemoDesktop.js';
export type { DemoDesktopProps } from './walkthrough/DemoDesktop.js';
export { JobBubbles } from './walkthrough/JobBubbles.js';
export type { JobBubblesProps } from './walkthrough/JobBubbles.js';
export { SuggestionCards } from './walkthrough/SuggestionCards.js';
export type { SuggestionCardsProps, SuggestionCard } from './walkthrough/SuggestionCards.js';
export { LandingWait } from './walkthrough/LandingWait.js';
export type { LandingWaitProps } from './walkthrough/LandingWait.js';
export { HandOff } from './walkthrough/HandOff.js';
export type { HandOffProps } from './walkthrough/HandOff.js';
export { Composer } from './walkthrough/Composer.js';
export type { ComposerProps } from './walkthrough/Composer.js';

// Scenes
export { RestrictedScene } from './scenes/RestrictedScene.js';
export type { RestrictedSceneProps, RestrictedTone } from './scenes/RestrictedScene.js';
export { DeviceBezel } from './scenes/DeviceBezel.js';
export type { DeviceBezelProps, BezelLight } from './scenes/DeviceBezel.js';
export { BootLoop } from './scenes/BootLoop.js';
export type { BootLoopProps } from './scenes/BootLoop.js';
export { LoadingCharacter } from './scenes/LoadingCharacter.js';
export type { LoadingCharacterProps } from './scenes/LoadingCharacter.js';

// Templates
export { TemplateDialog, TEMPLATE_MARK_PX } from './template/TemplateDialog.js';
export type { TemplateDialogProps } from './template/TemplateDialog.js';
export { VisibilityControls } from './template/VisibilityControls.js';
export type { VisibilityControlsProps } from './template/VisibilityControls.js';
export { ShareCard } from './template/ShareCard.js';
export type { ShareCardProps } from './template/ShareCard.js';
export { usePublishMark } from './template/usePublishMark.js';
export type { PublishMark, PublishPhase, UsePublishMarkOptions } from './template/usePublishMark.js';
export {
  normalizeTemplateDraft,
  TEMPLATE_LIMITS,
  TEMPLATE_ERROR_KEYS,
} from './template/normalizeTemplateDraft.js';
export type {
  TemplateDraft,
  TemplateVisibility,
  TemplateError,
  NormalizedTemplate,
  NormalizeOptions,
} from './template/normalizeTemplateDraft.js';

// Occupancy
export { OccupancyList } from './occupancy/OccupancyList.js';
export type { OccupancyListProps, OccupancyRow } from './occupancy/OccupancyList.js';
export { OccupancyMark } from './occupancy/OccupancyMark.js';
export type { OccupancyMarkProps } from './occupancy/OccupancyMark.js';

// Cast
export { CastLineup } from './cast/CastLineup.js';
export type { CastStageProps } from './cast/CastLineup.js';
export { CastFigure } from './cast/CastFigure.js';
export type { CastMemberProps, CastMemberSpec } from './cast/CastFigure.js';
export { PortraitSlot } from './cast/PortraitSlot.js';
export type { AvatarSlotProps } from './cast/PortraitSlot.js';
export { useCastScene } from './cast/useCastScene.js';
export type { CastScene, CastStep, CastPosition, UseCastSceneOptions } from './cast/useCastScene.js';

// Locale
export {
  SurfaceLocaleProvider,
  useSurfaceLocale,
  SURFACE_LOCALES,
  surfaceEnUS,
  surfaceZhCN,
} from './locale/index.js';
export type { SurfaceLocaleProviderProps, SurfaceLocale, SurfaceLocaleKey } from './locale/index.js';
