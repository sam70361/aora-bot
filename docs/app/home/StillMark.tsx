import {
  getInkColorCss,
  renderStaticSvg,
  type CharacterState,
  type ColorId,
  type FaceStyle,
  type ShapeId,
} from '@aora-bot/react';
import { memo, type CSSProperties } from 'react';

export interface StillMarkProps {
  shape: ShapeId;
  color: ColorId;
  state?: CharacterState;
  style: string;
  variant: string;
  face?: FaceStyle;
  /** Series parameters. Pass the same object while they are unchanged: a new one redraws. */
  styleOptions?: Readonly<Record<string, unknown>>;
  sizePx: number;
}

/**
 * One frame of a character, inlined.
 *
 * Inlined rather than an `<img>` data URL because the eye cut-outs and the ink
 * read the page's custom properties, and an SVG document inside an `<img>`
 * cannot see them — it would draw light holes into a dark page. The ink follows
 * the page's `color-scheme` (`colorScheme: 'page'`), not the OS, so the site's
 * own theme switch recolours it. Static output has no engine and no timer
 * behind it, which is what lets a screen of them cost nothing per frame.
 */
export const StillMark = memo(function StillMark({
  shape,
  color,
  state = 'idle',
  style,
  variant,
  face,
  styleOptions,
  sizePx,
}: StillMarkProps) {
  return (
    <span
      className="aora-mark aora-mark--still"
      data-shape={shape}
      data-color={color}
      data-state={state}
      style={{ '--aora-fg': getInkColorCss(color), width: sizePx, height: sizePx } as CSSProperties}
      dangerouslySetInnerHTML={{
        __html: renderStaticSvg({
          shape,
          color,
          state,
          style,
          variant,
          face,
          styleOptions,
          sizePx,
          eyeColor: 'var(--aora-bg-base)',
          colorScheme: 'page',
        }),
      }}
    />
  );
});
