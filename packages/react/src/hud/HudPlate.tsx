import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

/** How urgent the reading is. Drives the plate's ink and rule, nothing else. */
export type HudLevel = 'info' | 'ok' | 'warn' | 'alert';

/** Where the text sits relative to the character. */
export type HudPlacement = 'top' | 'bottom' | 'right';

export interface HudPlateProps {
  /** What the figure is. */
  title?: string;
  /** The figure itself, already formatted — this component does no rounding. */
  value?: string | number;
  /** Unit for `value`, set smaller and dimmer beside it. */
  unit?: string;
  level?: HudLevel;
  /** Supporting lines under the figure: a caption, an arbiter tip, a log tail. */
  lines?: readonly string[];
  placement?: HudPlacement;
  /** Size of the character slot. The plate sizes its own text from this. */
  sizePx?: number;
  className?: string;
  style?: CSSProperties;
  /** The character. Rendered in the slot the placement leaves for it. */
  children?: ReactNode;
}

/**
 * The words around a dial.
 *
 * A HUD drawn inside the character is a shape: a track that is four-fifths
 * full, a needle two-thirds round. At chip sizes that is all it can be —
 * type in the ring would be noise. At stage sizes the ring also prints the
 * figure `formatHud` would put on a status bar. The plate is still the
 * accessible half: it inherits the page's type and can be announced.
 *
 * `role="status"` with a polite live region is the whole accessibility story
 * for a HUD: the dial itself is `aria-hidden`, and this is what actually
 * tells someone the upload reached 83%.
 */
export function HudPlate({
  title,
  value,
  unit,
  level = 'info',
  lines,
  placement = 'bottom',
  sizePx = 72,
  className,
  style,
  children,
}: HudPlateProps) {
  const hasText = title != null || value != null || (lines?.length ?? 0) > 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cx('aora-hud-plate', className)}
      data-level={level}
      data-placement={placement}
      style={{ '--aora-hud-size': `${sizePx}px`, ...style } as CSSProperties}
    >
      {children != null && <div className="aora-hud-plate__mark">{children}</div>}

      {hasText && (
        <div className="aora-hud-plate__text">
          {title != null && <span className="aora-hud-plate__title">{title}</span>}
          {value != null && (
            <span className="aora-hud-plate__value">
              {value}
              {unit != null && <span className="aora-hud-plate__unit">{unit}</span>}
            </span>
          )}
          {lines?.map((line) => (
            <span key={line} className="aora-hud-plate__line">
              {line}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
