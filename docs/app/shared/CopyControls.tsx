import { useEffect, useState } from 'react';
import { COPIED_RESET_MS, copyText } from './clipboard.js';
import { useI18n } from './i18n.js';
import { CheckIcon, CopyIcon, LinkIcon } from './icons.js';
import { Radio, RadioGroup } from './Radio.js';
import { shareUrl, type Preset } from './share.js';
import { SNIPPET_FORMATS, type SnippetFormat } from './snippet.js';

/** A button that says "copied" for a moment, without its box changing size. */
export function useCopied(): [boolean, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  return [copied, async (text) => setCopied(await copyText(text))];
}

export interface CodeChipProps {
  /** What the chip shows for a format, on one line. */
  line: (format: SnippetFormat) => string;
  /** What copying a format gives. */
  copy: (format: SnippetFormat) => string;
}

/**
 * The character in one of three formats on one line, and a button that copies
 * it: the snippet with its imports or script, or the avatar link. The format
 * switch and the copy button are siblings in the chip, so neither sits inside
 * the other.
 */
export function CodeChip({ line: lineOf, copy: copyOf }: CodeChipProps) {
  const t = useI18n();
  const [copied, copy] = useCopied();
  const [format, setFormat] = useState<SnippetFormat>('react');
  const line = lineOf(format);
  const names: Record<SnippetFormat, string> = {
    react: 'React',
    html: 'HTML',
    avatar: t('home.format.avatar'),
  };

  return (
    <div className="site-home__chip">
      <RadioGroup label={t('home.format')} className="site-home__formats">
        {SNIPPET_FORMATS.map((id) => (
          <Radio
            key={id}
            value={id}
            className="site-home__format"
            checked={id === format}
            label={names[id]}
            onSelect={() => setFormat(id)}
          >
            {names[id]}
          </Radio>
        ))}
      </RadioGroup>
      <button
        type="button"
        className="site-home__copy"
        aria-label={format === 'avatar' ? t('home.copyLink') : t('home.copyCode')}
        title={line}
        onClick={() => copy(copyOf(format))}
      >
        <code>{line}</code>
        <span className="site-home__chipIcon" data-copied={copied || undefined}>
          <CopyIcon />
          <CheckIcon />
        </span>
        <span className="site-home__sr" aria-live="polite">
          {copied ? t('home.copied') : ''}
        </span>
      </button>
    </div>
  );
}

/** Copies a link to the current page that opens on `preset`. */
export function ShareButton({ preset }: { preset: Preset }) {
  const t = useI18n();
  const [copied, copy] = useCopied();

  return (
    <button
      type="button"
      className="site-home__tool"
      data-copied={copied || undefined}
      aria-label={t('home.share')}
      title={t('home.share')}
      onClick={() => copy(shareUrl(preset))}
    >
      <LinkIcon />
      <CheckIcon />
      <span className="site-home__sr" aria-live="polite">
        {copied ? t('home.copied') : ''}
      </span>
    </button>
  );
}
