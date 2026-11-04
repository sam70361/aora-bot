import {
  AUTO_SHAPE_POOL,
  type CharacterState,
  type ColorId,
  type FaceStyle,
  type NoseId,
  type ShapeId,
} from '@aora-bot/engine';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useSurfaceLocale, type SurfaceLocaleKey } from '../locale/index.js';
import { CharacterMark, useReducedMotion, cx } from '@aora-bot/react';
import { DeviceBezel, type BezelLight } from './DeviceBezel.js';

/** Which flavour of "no" this is. Picks the default copy. */
export type RestrictedTone = 'restricted' | 'offline' | 'unauthorised';

export interface RestrictedSceneProps {
  tone?: RestrictedTone;
  /** Override the copy the tone would supply. */
  title?: string;
  body?: string;
  /** Buttons, links — whatever the way out of here is. */
  action?: ReactNode;
  state?: CharacterState;
  /**
   * One fixed shape. Wins over `shapePool` and stops the rotation, for a host
   * that wants its own character on the screen rather than a parade.
   */
  shape?: ShapeId;
  /** Shapes the character rotates through, when `shape` is not given. */
  shapePool?: readonly ShapeId[];
  /** Time on each shape. 0 holds the first one. */
  rotateMs?: number;
  color?: ColorId;
  face?: FaceStyle;
  nose?: NoseId | null;
  lineWeight?: number;
  widthPx?: number;
  sizePx?: number;
  className?: string;
  style?: CSSProperties;
}

const TONE_COPY: Record<
  RestrictedTone,
  { title: SurfaceLocaleKey; body: SurfaceLocaleKey; light: BezelLight }
> = {
  restricted: { title: 'restricted.title', body: 'restricted.body', light: 'alert' },
  offline: { title: 'restricted.offline.title', body: 'restricted.offline.body', light: 'off' },
  unauthorised: {
    title: 'restricted.unauthorised.title',
    body: 'restricted.unauthorised.body',
    light: 'alert',
  },
};

/**
 * The page you land on when something says no.
 *
 * A dead end is where a character is worth the most and costs the least:
 * nobody is trying to get work done on this screen, and a face that is
 * clearly declining rather than broken is the difference between "I am not
 * allowed to do that" and "this product is failing".
 *
 * The shape changes every so often because these screens get stared at. The
 * interval is long enough that it reads as the character shifting position
 * rather than as an animation demanding attention, and it stops entirely
 * under reduced motion — a silhouette morph is motion even when nothing
 * moves across the screen.
 */
export function RestrictedScene({
  tone = 'restricted',
  title,
  body,
  action,
  state = 'refusing',
  shape: shapeProp,
  shapePool = AUTO_SHAPE_POOL,
  rotateMs = 12_000,
  color,
  face,
  nose,
  lineWeight,
  widthPx = 280,
  sizePx,
  className,
  style,
}: RestrictedSceneProps) {
  const markSize = sizePx ?? 96;
  const { t } = useSurfaceLocale();
  const copy = TONE_COPY[tone];
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const rotating = shapeProp === undefined && rotateMs > 0 && shapePool.length > 1 && !reduced;

  // The hook rather than a one-off read at mount, so turning the preference on
  // mid-session stops the rotation instead of leaving it running until a
  // remount that this screen will probably never get.
  useEffect(() => {
    if (!rotating) return;
    const timer = setInterval(() => setIndex((current) => current + 1), rotateMs);
    return () => clearInterval(timer);
  }, [rotating, rotateMs]);

  const shape = shapeProp ?? shapePool[index % shapePool.length] ?? shapePool[0];

  return (
    <div className={cx('aora-s-scene', className)} style={style}>
      <DeviceBezel widthPx={widthPx} light={copy.light}>
        <CharacterMark
          shape={shape}
          color={color}
          face={face}
          nose={nose}
          lineWeight={lineWeight}
          state={state}
          sizePx={markSize}
          className="aora-s-scene__mark"
        />
      </DeviceBezel>

      <div className="aora-s-scene__text">
        <h2 className="aora-s-scene__title">{title ?? t(copy.title)}</h2>
        <p className="aora-s-scene__body">{body ?? t(copy.body)}</p>
        {action && <div className="aora-s-scene__action">{action}</div>}
      </div>
    </div>
  );
}
