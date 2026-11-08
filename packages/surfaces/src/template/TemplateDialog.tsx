import type { FaceStyle, NoseId } from '@aora-bot/engine';
import { useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  CelebrationLayer,
  type ConfettiHandle,
  AvatarButton,
  type AvatarDraft,
  type AvatarStudioProps,
  CharacterMark,
  cx,
} from '@aora-bot/react';
import { useSurfaceLocale } from '../locale/index.js';
import { ShareCard } from './ShareCard.js';
import { usePublishMark } from './usePublishMark.js';
import { VisibilityControls } from './VisibilityControls.js';
import {
  normalizeTemplateDraft,
  TEMPLATE_ERROR_KEYS,
  TEMPLATE_LIMITS,
  type TemplateDraft,
} from './normalizeTemplateDraft.js';

export interface TemplateDialogProps {
  /** The template being edited. Anything missing is filled in by normalisation. */
  value?: Partial<TemplateDraft>;
  /** Key for the derived appearance. Use the stored template's id. */
  seed?: string;
  /**
   * Save the template. An async result drives the mark: it works while the
   * promise is out and celebrates when it resolves.
   */
  onSave?: (draft: TemplateDraft) => void | Promise<void>;
  onCancel?: () => void;
  /** Passed to the avatar studio. Without it the Generate tab is hidden. */
  generateImage?: AvatarStudioProps['generateImage'];
  /** Show a share card under the form once the template has somewhere to live. */
  shareUrl?: string;
  face?: FaceStyle;
  nose?: NoseId | null;
  lineWeight?: number;
  /** Size of the character beside the name, and of the editor's trigger. Defaults to `TEMPLATE_MARK_PX`. */
  sizePx?: number;
  className?: string;
  style?: CSSProperties;
}

/** Default size of the template's character. */
export const TEMPLATE_MARK_PX = 64;

/**
 * Create or edit an agent template.
 *
 * The form is deliberately short — a name, what it should do, who can use it
 * — because the appearance is not a field anybody has to fill in. An
 * unconfigured template already has a shape and a colour derived from its
 * key, so the character beside the name is never a placeholder, and opening
 * the avatar studio is an optional flourish rather than a step.
 */
export function TemplateDialog({
  value,
  seed,
  onSave,
  onCancel,
  generateImage,
  shareUrl,
  face,
  nose,
  lineWeight,
  sizePx = TEMPLATE_MARK_PX,
  className,
  style,
}: TemplateDialogProps) {
  const { t } = useSurfaceLocale();
  const [input, setInput] = useState<Partial<TemplateDraft>>(() => value ?? {});
  const [submitted, setSubmitted] = useState(false);
  const [failed, setFailed] = useState(false);

  const { draft, errors, valid } = useMemo(() => normalizeTemplateDraft(input, { seed }), [input, seed]);

  const confetti = useRef<ConfettiHandle | null>(null);
  const publish = usePublishMark({ confetti });
  const busy = publish.state === 'publishing';

  const patch = (next: Partial<TemplateDraft>) => setInput((current) => ({ ...current, ...next }));

  const avatar: AvatarDraft = {
    shape: draft.shape,
    color: draft.color,
    face: face ?? draft.face,
    nose: nose !== undefined ? nose : draft.nose,
    pictureUrl: draft.pictureUrl,
  };

  const save = async () => {
    setSubmitted(true);
    if (!valid || busy) return;
    setFailed(false);
    publish.begin();
    try {
      await onSave?.(draft);
      publish.succeed();
    } catch {
      publish.fail();
      setFailed(true);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('template.title')}
      className={cx('aora-s-template', className)}
      style={style}
    >
      <div className="aora-s-template__head">
        <span className="aora-s-template__mark">
          {/* The confetti layer sits over the mark so a burst is not clipped
              by the character's own box. */}
          <CharacterMark
            shape={draft.shape}
            color={draft.color}
            face={avatar.face}
            nose={avatar.nose}
            lineWeight={lineWeight}
            state={publish.characterState}
            sizePx={sizePx}
            seed={seed ?? draft.name}
          />
          <CelebrationLayer ref={confetti} className="aora-s-template__confetti" />
        </span>

        <AvatarButton
          value={avatar}
          onCommit={(next) =>
            patch({
              shape: next.shape,
              color: next.color,
              face: next.face,
              nose: next.nose,
              pictureUrl: next.pictureUrl,
            })
          }
          generateImage={generateImage}
          lineWeight={lineWeight}
          sizePx={sizePx}
        />
      </div>

      <label className="aora-s-template__field">
        <span className="aora-s-template__label">{t('template.name')}</span>
        <input
          className="aora-field"
          value={input.name ?? ''}
          maxLength={TEMPLATE_LIMITS.name}
          placeholder={t('template.namePlaceholder')}
          onChange={(event) => patch({ name: event.target.value })}
        />
      </label>

      <label className="aora-s-template__field">
        <span className="aora-s-template__label">{t('template.instructions')}</span>
        <textarea
          className="aora-field"
          rows={4}
          value={input.instructions ?? ''}
          maxLength={TEMPLATE_LIMITS.instructions}
          placeholder={t('template.bodyPlaceholder')}
          onChange={(event) => patch({ instructions: event.target.value })}
        />
      </label>

      <div className="aora-s-template__field">
        <span className="aora-s-template__label">{t('template.visibility')}</span>
        <VisibilityControls value={draft.visibility} onSelect={(visibility) => patch({ visibility })} />
      </div>

      {shareUrl && (
        <ShareCard
          name={draft.name}
          url={shareUrl}
          shape={draft.shape}
          color={draft.color}
          pictureUrl={draft.pictureUrl}
          face={avatar.face}
          nose={avatar.nose}
          lineWeight={lineWeight}
        />
      )}

      {/* Errors appear after the first attempt, not while the first character
          is being typed: an empty name is not a mistake yet. */}
      {submitted && errors.length > 0 && (
        <p className="aora-s-template__error" role="alert">
          {t(TEMPLATE_ERROR_KEYS[errors[0]!])}
        </p>
      )}
      {failed && (
        <p className="aora-s-template__error" role="alert">
          {t('template.failed')}
        </p>
      )}

      <div className="aora-s-template__actions">
        <button type="button" className="aora-button" onClick={onCancel}>
          {t('template.cancel')}
        </button>
        <button
          type="button"
          className="aora-button aora-button--primary"
          disabled={busy}
          onClick={() => void save()}
        >
          {t(busy ? 'template.saving' : 'template.save')}
        </button>
      </div>
    </div>
  );
}
