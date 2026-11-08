/**
 * Server-safe subset.
 *
 * Re-exports only what can run without a DOM, so a React Server Component or a
 * static build can generate avatars and masks without pulling in the animation
 * runtime — and without the `'use client'` banner the rest of this package
 * carries.
 */
export {
  renderStaticSvg,
  renderStaticSvgDataUrl,
  renderAvatarDataUrl,
  shapeMaskImage,
  shapeRingMaskImage,
  autoColorForKey,
  autoShapeForKey,
  autoNoseForKey,
  getSwatchHex,
  getInkColorCss,
  haloBackground,
  SHAPE_IDS,
  SHAPE_FAMILIES,
  ALL_SHAPE_IDS,
  ALL_SHAPE_FAMILIES,
  isListedShape,
  getLeafColor,
  COLOR_IDS,
  FACE_STYLES,
  DEFAULT_FACE,
  DEFAULT_SHAPE,
  NOSE_IDS,
  CAST,
  CAST_IDS,
  ALL_CAST_IDS,
  ALL_COLOR_IDS,
  allCast,
  castMember,
  THEME_IDS,
  THEME_MANIFEST,
  ThemeNotInstalledError,
  getTheme,
  installTheme,
  isThemeInstalled,
  listThemes,
  loadTheme,
  loadThemes,
  themeChoices,
  themeDefault,
  themeLabel,
  themeLook,
  themesNeeded,
  isFixed,
} from '@aora-bot/engine/static';
export type {
  ShapeId,
  ShapeFamily,
  ShapeFamilyId,
  ColorId,
  FaceStyle,
  NoseId,
  CharacterPreset,
  CastId,
  ThemeDefinition,
  ThemeDimension,
  ThemeLook,
  ThemePackage,
  ThemeSource,
  StyleChoice,
} from '@aora-bot/engine/static';

/*
 * The crop maths lets a route compute the same crop the browser would without
 * opening a canvas. It is plain functions over plain data, so it runs in either
 * place and cannot disagree with the client about what a legal pan is.
 *
 * `cropToDataUrl`, `loadImage` and `readImageFile` are deliberately absent:
 * they need a canvas, an `Image` or a `FileReader`, and re-exporting them
 * here would put a module that cannot run on a server behind an entry point
 * that promises it can.
 */
export {
  fitImage,
  coverScale,
  clampPan,
  clampZoom,
  panLimit,
  exportPlacement,
  MAX_UPLOAD_BYTES,
  MAX_SOURCE_PX,
  CROP_STAGE_PX,
  EXPORT_PX,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP,
} from './editor/crop.js';
export type { Size, Pan, CropView, CropRequest } from './editor/crop.js';
export { enUS } from './locale/en-US.js';
export { zhCN } from './locale/zh-CN.js';
