// @vitest-environment happy-dom
import { isThemeInstalled, loadTheme } from '@aora-bot/engine';
import { beforeAll, describe, expect, it } from 'vitest';
import { defineAoraBot, type AoraBotElement } from '../src/index.js';

/*
 * An element that names a theme's character, member or skin holds its box,
 * loads the theme and draws when it arrives.
 */

beforeAll(() => {
  defineAoraBot();
});

const mark = (el: AoraBotElement) => el.shadowRoot!.querySelector<HTMLElement>('.mark')!;

describe('<aora-bot> naming a theme', () => {
  it('holds its size, loads the theme and then draws', async () => {
    expect(isThemeInstalled('halloween')).toBe(false);
    const el = document.createElement('aora-bot') as AoraBotElement;
    el.setAttribute('reduced-motion', '');
    el.setAttribute('character', 'coal');
    el.setAttribute('variant', 'doodle');
    el.setAttribute('size', '64px');
    document.body.appendChild(el);
    expect(mark(el).querySelector('svg')).toBeNull();
    expect(el.shadowRoot!.querySelector('style')!.textContent).toContain('width: 64px');

    await loadTheme('halloween');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mark(el).querySelector('svg')).not.toBeNull();
    expect(el.getAttribute('aria-label')).toBe('Coal');
  });
});
