// @vitest-environment happy-dom
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

/*
 * The CDN file is a build product, so this needs `pnpm --filter @aora-bot/element build`
 * to have run, as the React package needs the engine's `dist`.
 */

const file = join(import.meta.dirname, '../dist/aora-bot.js');

describe('CDN bundle', () => {
  it('is one self-contained file', () => {
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf8')).not.toMatch(/from\s*["']@aora-bot/);
  });

  it('defines <aora-bot> when it loads', async () => {
    expect(customElements.get('aora-bot')).toBeUndefined();
    await import(/* @vite-ignore */ pathToFileURL(file).href);

    const Constructor = customElements.get('aora-bot')!;
    expect(Constructor).toBeTypeOf('function');

    const el = document.createElement('aora-bot');
    el.setAttribute('character', 'mochi');
    el.setAttribute('reduced-motion', '');
    document.body.appendChild(el);
    expect(el.shadowRoot!.querySelector('svg')).not.toBeNull();
    expect(el.getAttribute('aria-label')).toBe('Mochi');
    el.remove();
  });
});
