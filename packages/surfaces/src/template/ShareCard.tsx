import type { ColorId, FaceStyle, NoseId, ShapeId } from '@aora-bot/engine';
import { useState, type CSSProperties } from 'react';
import { useSurfaceLocale } from '../locale/index.js';
import { CharacterMark, cx } from '@aora-bot/react';

export interface ShareCardProps {
  name: string;
  /** The link to hand out. Shown in full and copied verbatim. */
  url: string;
  shape?: ShapeId;
  color?: ColorId;
  pictureUrl?: string | null;
  face?: FaceStyle;
  nose?: NoseId | null;
  lineWeight?: number;
  sizePx?: number;
  /** Called after a successful copy, for a host that wants its own toast. */
  onCopy?: (url: string) => void;
  className?: string;
  style?: CSSProperties;
}

/** How long the button keeps saying "Copied" before returning to its label. */
const CONFIRM_MS = 1600;

/**
 * A template as something you can hand to someone: face, name, link.
 *
 * The link is shown rather than hidden behind the button. A copy button that
 * reveals nothing leaves the person unsure what landed on their clipboard,
 * and this is a URL they are about to paste into a message to a colleague.
 */
export function ShareCard({
  name,
  url,
  shape,
  color,
  pictureUrl,
  face,
  nose,
  lineWeight,
  sizePx = 36,
  onCopy,
  className,
  style,
}: ShareCardProps) {
  const { t } = useSurfaceLocale();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(url);
      onCopy?.(url);
      setCopied(true);
      setTimeout(() => setCopied(false), CONFIRM_MS);
    } catch {
      // A denied clipboard permission is not worth an error state: the URL is
      // on screen and selectable, which is the fallback either way.
      setCopied(false);
    }
  };

  return (
    <div className={cx('aora-s-share', className)} style={style}>
      <span className="aora-s-share__mark">
        {pictureUrl ? (
          <img src={pictureUrl} alt="" width={sizePx} height={sizePx} />
        ) : (
          <CharacterMark
            shape={shape}
            color={color}
            face={face}
            nose={nose}
            lineWeight={lineWeight}
            sizePx={sizePx}
            seed={name}
            state="proud"
          />
        )}
      </span>

      <span className="aora-s-share__body">
        <span className="aora-s-share__name">{name}</span>
        <span className="aora-s-share__url">{url}</span>
      </span>

      <button
        type="button"
        className="aora-button"
        aria-label={t('template.copyLink')}
        onClick={() => void copy()}
      >
        {t(copied ? 'template.copied' : 'template.copyLink')}
      </button>
    </div>
  );
}
