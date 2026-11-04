import type { CSSProperties } from 'react';
import { cx } from '@aora-bot/react';
import { useSurfaceLocale, type SurfaceLocaleKey } from '../locale/index.js';
import type { TemplateVisibility } from './normalizeTemplateDraft.js';

export interface VisibilityControlsProps {
  value: TemplateVisibility;
  onSelect?: (value: TemplateVisibility) => void;
  /** Read-only display, for a card that shows a template someone else owns. */
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

const OPTIONS: { id: TemplateVisibility; label: SurfaceLocaleKey; hint: SurfaceLocaleKey }[] = [
  { id: 'private', label: 'template.visibility.private', hint: 'template.visibility.privateHint' },
  { id: 'team', label: 'template.visibility.team', hint: 'template.visibility.teamHint' },
];

/**
 * Who can use a template, as two labelled choices rather than a switch.
 *
 * A switch would need a label that stays true in both positions, and the
 * honest labels here are not opposites: "private" and "team" both describe an
 * audience. Spelling both out with their consequence underneath also means
 * the person reading it never has to work out what the off position does.
 */
export function VisibilityControls({
  value,
  onSelect,
  disabled = false,
  className,
  style,
}: VisibilityControlsProps) {
  const { t } = useSurfaceLocale();

  return (
    <div
      className={cx('aora-s-visibility', className)}
      role="radiogroup"
      aria-label={t('template.visibility')}
      style={style}
    >
      {OPTIONS.map(({ id, label, hint }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          disabled={disabled}
          tabIndex={value === id ? 0 : -1}
          className="aora-s-visibility__option"
          data-selected={value === id || undefined}
          onClick={() => onSelect?.(id)}
        >
          <span className="aora-s-visibility__label">{t(label)}</span>
          <span className="aora-s-visibility__hint">{t(hint)}</span>
        </button>
      ))}
    </div>
  );
}
