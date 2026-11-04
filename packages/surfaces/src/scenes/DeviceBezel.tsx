import { cx } from '@aora-bot/react';
import type { CSSProperties, ReactNode } from 'react';

/** Status light states. `alert` is the only one that draws attention. */
export type BezelLight = 'off' | 'on' | 'alert';

export interface DeviceBezelProps {
  /** Outer width. Defaults to 280, which is what both scenes in the kit use. */
  widthPx?: number;
  /** Height as a fraction of the width. Just short of 3:4, like a small display. */
  aspect?: number;
  light?: BezelLight;
  /** Drawn on the screen, clipped to it. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/*
 * The frame, in a 100-unit-wide coordinate space.
 *
 * Numbers rather than a drawing: the same four values place the SVG rects and
 * the DOM layer the children live in, so the screen the character sits on is
 * exactly the screen that was painted. Two independent sets — one in the
 * path, one in a stylesheet — drift the moment either is tuned.
 */
const FRAME = { pad: 5.5, radius: 9, screenRadius: 5, lightR: 1.5, chin: 4 } as const;

/**
 * A device around a character: rounded shell, inset screen, status light.
 *
 * Procedural, because the whole kit is. It is also the cheaper choice at
 * these sizes — a screenshot of a window would need three variants for dark
 * mode, high density and a narrow column, and would pin the surface to
 * whatever operating system was on screen when it was taken.
 */
export function DeviceBezel({
  widthPx = 280,
  aspect = 0.74,
  light = 'on',
  children,
  className,
  style,
}: DeviceBezelProps) {
  const height = 100 * aspect;
  const screen = {
    x: FRAME.pad,
    y: FRAME.pad,
    width: 100 - FRAME.pad * 2,
    height: height - FRAME.pad - FRAME.chin,
  };

  return (
    <div
      className={cx('aora-s-bezel', className)}
      data-light={light}
      style={{ width: widthPx, aspectRatio: `100 / ${height}`, ...style }}
    >
      <svg viewBox={`0 0 100 ${height}`} aria-hidden="true" className="aora-s-bezel__frame">
        <rect
          x={0.5}
          y={0.5}
          width={99}
          height={height - 1}
          rx={FRAME.radius}
          className="aora-s-bezel__shell"
        />
        <rect {...screen} rx={FRAME.screenRadius} className="aora-s-bezel__screen" />
        <circle cx={50} cy={height - FRAME.chin / 2} r={FRAME.lightR} className="aora-s-bezel__light" />
      </svg>

      <div
        className="aora-s-bezel__stage"
        style={{
          left: `${screen.x}%`,
          top: `${(screen.y / height) * 100}%`,
          width: `${screen.width}%`,
          height: `${(screen.height / height) * 100}%`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
