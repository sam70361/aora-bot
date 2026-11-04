/**
 * Server-safe subset.
 *
 * Template normalisation validates a submitted form on a server with the same
 * function the dialog runs in the browser, so the two cannot disagree about
 * what a valid draft is. It is a plain function over plain data, which is why
 * it can sit behind an entry point with no `'use client'` banner. The surface
 * copy tables travel with it because `TEMPLATE_ERROR_KEYS` points into them.
 */
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
export { surfaceEnUS } from './locale/en-US.js';
export { surfaceZhCN } from './locale/zh-CN.js';
