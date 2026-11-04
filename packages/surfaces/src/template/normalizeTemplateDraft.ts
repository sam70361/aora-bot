// The static entry: this module is re-exported from `static.ts` so a server
// action can validate the same draft the dialog does.
import { autoColorForKey, autoShapeForKey } from '@aora-bot/engine/static';
import type { ColorId, FaceStyle, NoseId, ShapeId } from '@aora-bot/engine';
import type { SurfaceLocaleKey } from '../locale/index.js';

/**
 * Ceilings on the two free-text fields.
 *
 * Both are generous enough that nobody writing in good faith meets them, and
 * low enough that a paste of a whole document does not become a template
 * nobody can load. The name is short because it has to fit in a list row.
 */
export const TEMPLATE_LIMITS = { name: 80, instructions: 4000 } as const;

export type TemplateVisibility = 'private' | 'team';

export interface TemplateDraft {
  name: string;
  instructions: string;
  visibility: TemplateVisibility;
  shape: ShapeId;
  color: ColorId;
  face?: FaceStyle;
  nose?: NoseId | null;
  pictureUrl?: string | null;
}

export type TemplateError = 'name-required' | 'name-too-long' | 'instructions-too-long';

export interface NormalizedTemplate {
  /** The draft as it should be stored: trimmed, truncated, with an appearance. */
  draft: TemplateDraft;
  errors: TemplateError[];
  valid: boolean;
}

/** Copy for each failure, so a host does not have to write its own. */
export const TEMPLATE_ERROR_KEYS: Record<TemplateError, SurfaceLocaleKey> = {
  'name-required': 'template.nameRequired',
  'name-too-long': 'template.nameTooLong',
  'instructions-too-long': 'template.bodyTooLong',
};

export interface NormalizeOptions {
  /**
   * Key for the derived appearance. A stored template's id is the right
   * choice: it does not change when the template is renamed, so an agent
   * someone recognises by its shape keeps that shape.
   */
  seed?: string;
}

/**
 * Clean a template up and say what is still wrong with it.
 *
 * Truncating *and* reporting looks redundant — but the two answer different
 * questions. The truncated draft is what a live preview should show, so the
 * character and the row next to the form behave while the field is still
 * over its limit; the errors are what the Save button should respect. A
 * function that only threw would leave the host with nothing to draw.
 *
 * Pure, so the same call runs in a server action validating a submission and
 * in the dialog validating a keystroke, and cannot disagree with itself.
 */
export function normalizeTemplateDraft(
  input: Partial<TemplateDraft>,
  { seed }: NormalizeOptions = {},
): NormalizedTemplate {
  const errors: TemplateError[] = [];

  // Collapsed, not just trimmed: a name pasted out of a document arrives with
  // a newline in it, and a list row would render that as a space anyway.
  const rawName = (input.name ?? '').replace(/\s+/g, ' ').trim();
  if (!rawName) errors.push('name-required');
  if (rawName.length > TEMPLATE_LIMITS.name) errors.push('name-too-long');

  // Only the trailing whitespace goes: leading indentation in instructions is
  // often deliberate, and the shape of a pasted list is part of its meaning.
  const rawInstructions = (input.instructions ?? '').replace(/\s+$/, '');
  if (rawInstructions.length > TEMPLATE_LIMITS.instructions) errors.push('instructions-too-long');

  const name = rawName.slice(0, TEMPLATE_LIMITS.name);
  const key = seed ?? name;

  return {
    draft: {
      name,
      instructions: rawInstructions.slice(0, TEMPLATE_LIMITS.instructions),
      visibility: input.visibility === 'team' ? 'team' : 'private',
      // A template with no appearance gets one from its key rather than a
      // default blob, so a list of ten unconfigured templates is still ten
      // distinguishable rows.
      shape: input.shape ?? autoShapeForKey(key),
      color: input.color ?? autoColorForKey(key),
      face: input.face,
      nose: input.nose,
      pictureUrl: input.pictureUrl ?? null,
    },
    errors,
    valid: errors.length === 0,
  };
}
