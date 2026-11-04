import type { CSSProperties, ReactNode } from 'react';
import { cx } from '@aora-bot/react';
import { useSurfaceLocale } from '../locale/index.js';

export interface DemoDesktopProps {
  /** Text in the window's title bar. */
  title?: string;
  widthPx?: number;
  /** Content of the window. */
  children?: ReactNode;
  /** Small chrome below the title bar — tabs, a toolbar, a fake URL. */
  toolbar?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * A window frame to put a demo inside.
 *
 * Onboarding has to show software without being the software, and a plain
 * card does not read as an application — the window bar is what tells someone
 * "this is a picture of a thing happening elsewhere" in no words at all. The
 * frame is presentational: `aria-hidden` chrome around whatever the host puts
 * in it, so the content keeps its own semantics.
 */
export function DemoDesktop({ title, widthPx = 420, children, toolbar, className, style }: DemoDesktopProps) {
  const { t } = useSurfaceLocale();

  return (
    <div className={cx('aora-s-desktop', className)} style={{ width: widthPx, ...style }}>
      <div className="aora-s-desktop__bar">
        <span className="aora-s-desktop__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="aora-s-desktop__title">{title ?? t('walkthrough.window')}</span>
      </div>
      {toolbar && <div className="aora-s-desktop__toolbar">{toolbar}</div>}
      <div className="aora-s-desktop__body">{children}</div>
    </div>
  );
}
