import {
  getInkVars,
  getLeafColor,
  VIEWBOX_STR,
  type CharacterState,
  type ColorId,
  type FaceStyle,
  type NoseId,
  type StyleId,
  type StyleVariant,
} from '@aora-bot/engine';
import type { CSSProperties, ReactNode } from 'react';
import { optionsKey } from '../appearance/AppearanceProvider.js';
import { cx } from '../utils/cx.js';

export interface CharacterMarkMirrorProps {
  /** Id of a mounted `CharacterMark`'s root group. */
  sourceId: string;
  color?: ColorId;
  state?: CharacterState;
  /** Face style of the source, echoed as `data-face`. The geometry itself comes from the source. */
  face?: FaceStyle;
  /** Nose of the source, echoed as `data-nose`. `null` means the source draws none. */
  nose?: NoseId | null;
  /** Stroke weight of the source, echoed as `data-line-weight`. */
  lineWeight?: number;
  /** Style series of the source, echoed as `data-style`. */
  styleId?: StyleId;
  /** Variant of the source, echoed as `data-variant`. */
  variant?: StyleVariant;
  /** Style parameters of the source, echoed as `data-style-options`. */
  styleOptions?: Record<string, unknown>;
  /*
   * `face`, `nose`, `lineWeight` and the three style fields describe the
   * source rather than this mirror, and there is deliberately no `hud`, `ink`
   * gradient or `eyeScale` at all.
   *
   * A mirror is a `<use>` of the source's geometry, so anything that changes
   * the geometry — the weight of the pen, the dial in the ring, the size of
   * the eyes, the grid of a pixel body — is a source-level trait and has to
   * be set on the `CharacterMark` being mirrored. Only what resolves at the
   * point of use (the ink custom property, the size of the box) can vary per
   * mirror. The ones that are accepted are accepted so that a mirror can be
   * inspected and styled by the same attribute selectors as the real thing;
   * passing a value the source was not built with mislabels the mirror
   * rather than redrawing it, which is why `StagedMark` keys its sources on
   * all of them.
   */
  sizePx?: number;
  sizeCss?: string | number;
  eyeColor?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * Draw an already-running character again, somewhere else.
 *
 * `<use href>` points at a live SVG group, so the mirror costs one element and
 * no animation work — the browser reuses whatever the source is rendering this
 * frame. Colour still varies per mirror because the ink is a CSS custom
 * property, and inherited properties resolve at the point of use rather than
 * at the point of definition.
 *
 * This is what makes a list of two hundred avatars affordable: a handful of
 * real engines, and mirrors for everything else.
 */
export function CharacterMarkMirror({
  sourceId,
  color = 'black',
  state = 'idle',
  face,
  nose,
  lineWeight,
  styleId,
  variant,
  styleOptions,
  sizePx,
  sizeCss,
  eyeColor,
  className,
  style,
  children,
}: CharacterMarkMirrorProps) {
  const size = sizeCss ?? (sizePx != null ? `${sizePx}px` : undefined);

  return (
    <span
      className={cx('aora-mark', 'aora-mark--mirror', className)}
      data-state={state}
      data-face={face}
      data-nose={nose ?? undefined}
      data-line-weight={lineWeight}
      data-style={styleId}
      data-variant={variant}
      data-style-options={optionsKey(styleOptions) || undefined}
      style={
        {
          ...getInkVars(color),
          '--aora-leaf': getLeafColor(color),
          ...(eyeColor ? { '--aora-eye': eyeColor } : null),
          width: size,
          ...style,
        } as CSSProperties
      }
    >
      <svg viewBox={VIEWBOX_STR} aria-hidden="true">
        <use href={`#${sourceId}`} />
      </svg>
      {children}
    </span>
  );
}
