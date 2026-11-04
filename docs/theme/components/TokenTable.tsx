import { useI18n } from '../../app/shared/i18n.js';
import { useEffect, useState } from 'react';
import { COPIED_RESET_MS, copyText } from '../../app/shared/clipboard.js';

const GROUPS: {
  titleKey: 'tokens.surfaces' | 'tokens.text' | 'tokens.lines' | 'tokens.accent' | 'tokens.radii';
  tokens: string[];
}[] = [
  {
    titleKey: 'tokens.surfaces',
    tokens: ['--aora-bg-base', '--aora-surface', '--aora-surface-raised', '--aora-surface-sunken'],
  },
  {
    titleKey: 'tokens.text',
    tokens: ['--aora-text', '--aora-text-muted', '--aora-text-faint'],
  },
  {
    titleKey: 'tokens.lines',
    tokens: ['--aora-line', '--aora-line-strong', '--aora-fill', '--aora-fill-hover'],
  },
  {
    titleKey: 'tokens.accent',
    tokens: [
      '--aora-accent',
      '--aora-accent-hover',
      '--aora-accent-soft',
      '--aora-on-accent',
      '--aora-on-scrim',
    ],
  },
  {
    titleKey: 'tokens.radii',
    tokens: [
      '--aora-radius-xs',
      '--aora-radius-sm',
      '--aora-radius-md',
      '--aora-radius-lg',
      '--aora-radius-pill',
    ],
  },
];

/**
 * Lists the design tokens with their resolved values.
 *
 * Values are read from the live document rather than hard-coded, so the table
 * shows what the current theme actually resolves to and cannot drift from the
 * stylesheet.
 */
export function TokenTable() {
  const t = useI18n();
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      const root = document.documentElement;
      const computed = getComputedStyle(root);
      // Colour tokens are `light-dark()` pairs, which a custom property reports
      // as the unresolved string. A probe element resolves them to the colour
      // the current scheme actually paints.
      const probe = document.createElement('span');
      probe.hidden = true;
      root.append(probe);
      const next: Record<string, string> = {};
      for (const group of GROUPS) {
        for (const token of group.tokens) {
          if (group.titleKey === 'tokens.radii') {
            next[token] = computed.getPropertyValue(token).trim();
          } else {
            probe.style.color = `var(${token})`;
            next[token] = getComputedStyle(probe).color;
          }
        }
      }
      probe.remove();
      setValues(next);
    };

    read();

    // Re-read when the theme class flips so the values stay honest.
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const copy = async (token: string) => {
    if (!(await copyText(`var(${token})`))) return;
    setCopied(token);
    setTimeout(() => setCopied((c) => (c === token ? null : c)), COPIED_RESET_MS);
  };

  return (
    <div>
      {GROUPS.map((group) => (
        <div key={group.titleKey}>
          <h3>{t(group.titleKey)}</h3>
          <div className="site-tokens">
            {group.tokens.map((token) => (
              <button key={token} type="button" className="site-token" onClick={() => void copy(token)}>
                <span className="site-token__chip" style={{ background: `var(${token})` }} />
                <span>
                  <span className="site-token__name">{token}</span>
                  <br />
                  <span className="site-token__value" role="status">
                    {copied === token ? t('tokens.copied') : values[token] || '—'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
