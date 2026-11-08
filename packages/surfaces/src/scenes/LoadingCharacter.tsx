import {
  shapeMaskImage,
  type CharacterState,
  type ColorId,
  type FaceStyle,
  type NoseId,
  type ShapeId,
} from '@aora-bot/engine';
import type { CSSProperties } from 'react';
import { useSurfaceLocale } from '../locale/index.js';
import { CharacterMark, cx } from '@aora-bot/react';

export interface LoadingCharacterProps {
  /** Swap the placeholder for the live character. */
  ready?: boolean;
  shape?: ShapeId;
  color?: ColorId;
  state?: CharacterState;
  face?: FaceStyle;
  nose?: NoseId | null;
  lineWeight?: number;
  sizePx?: number;
  className?: string;
  style?: CSSProperties;
  /**
   * Fires when a finite `state` (`spawning`, `celebrate`, …) has resolved to
   * its settle target. The inner mark is paused until `ready`, so the clock
   * starts at the cross-fade, not at mount.
   */
  onSettle?: (from: CharacterState, to: CharacterState) => void;
}

/**
 * A placeholder in the shape of the character that is coming.
 *
 * A grey circle where a hexagon will land is a layout shift waiting to
 * happen, and a spinner in an avatar slot is a second kind of motion beside
 * whatever the page is already doing. This is the silhouette itself — the
 * same generator, as a CSS mask — with a shimmer over it, so the placeholder
 * and the character occupy the identical outline and the swap is a cross-fade
 * rather than a replacement.
 *
 * Both layers stay mounted through the fade. Unmounting the placeholder on
 * `ready` would show the character's first animation frame against nothing
 * for a frame, which is the flicker this is meant to avoid.
 */
export function LoadingCharacter({
  ready = false,
  shape = 'blob',
  color,
  state,
  face,
  nose,
  lineWeight,
  sizePx = 32,
  className,
  style,
  onSettle,
}: LoadingCharacterProps) {
  const { t } = useSurfaceLocale();

  return (
    <span
      className={cx('aora-s-loading-character', className)}
      data-ready={ready || undefined}
      style={{ width: sizePx, height: sizePx, ...style }}
    >
      <span
        className="aora-s-loading-character__skeleton"
        role={ready ? undefined : 'status'}
        aria-label={ready ? undefined : t('loading.label')}
        style={{ '--aora-mask': shapeMaskImage({ shape, sizePx }) } as CSSProperties}
      />
      <span className="aora-s-loading-character__live" aria-hidden={!ready}>
        <CharacterMark
          shape={shape}
          color={color}
          state={state}
          face={face}
          nose={nose}
          lineWeight={lineWeight}
          sizePx={sizePx}
          paused={!ready}
          onSettle={onSettle}
        />
      </span>
    </span>
  );
}
