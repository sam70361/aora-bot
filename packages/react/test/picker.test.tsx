// @vitest-environment happy-dom
import { ASSIGNABLE_COLOR_IDS, AUTO_SHAPE_POOL } from '@aora-bot/engine';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../src/locale/index.js';
import { AgentCharacterSelector } from '../src/picker/AgentCharacterSelector.js';
import { CharacterSelector } from '../src/picker/CharacterSelector.js';
import { CompactCharacterSelector } from '../src/picker/CompactCharacterSelector.js';

let root: Root | null = null;
let host: HTMLElement | null = null;

function render(ui: ReactNode): HTMLElement {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(ui));
  return host;
}

const click = (el: Element) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
const byLabel = (el: HTMLElement, label: string) =>
  el.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;
const buttonWithText = (el: HTMLElement, text: string) =>
  [...el.querySelectorAll('button')].find((b) => b.textContent === text)!;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  host?.remove();
  host = null;
  vi.useRealTimers();
});

describe('AgentCharacterSelector', () => {
  const value = { shape: 'blob', color: 'blue' } as const;

  it('stages a pick and only reports it on commit', () => {
    const onCommit = vi.fn();
    const el = render(<AgentCharacterSelector value={value} onCommit={onCommit} />);

    click(byLabel(el, 'Hexagon'));
    expect(onCommit).not.toHaveBeenCalled();
    // The staged pick is what the grid shows, so the dialog is honest about
    // what pressing Save would do.
    expect(byLabel(el, 'Hexagon').dataset.selected).toBe('true');

    click(buttonWithText(el, 'Save'));
    expect(onCommit).toHaveBeenCalledWith({ shape: 'hex', color: 'blue' });
  });

  it('discards the staged pick on cancel', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const el = render(<AgentCharacterSelector value={value} onCommit={onCommit} onCancel={onCancel} />);

    click(byLabel(el, 'Cloud'));
    click(buttonWithText(el, 'Cancel'));

    expect(onCancel).toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
    expect(byLabel(el, 'Blob').dataset.selected).toBe('true');
  });

  it('commits every pick in immediate mode and drops the buttons', () => {
    const onCommit = vi.fn();
    const el = render(<AgentCharacterSelector value={value} onCommit={onCommit} immediate />);

    click(byLabel(el, 'Star'));
    expect(onCommit).toHaveBeenCalledWith({ shape: 'star', color: 'blue' });
    expect(el.querySelector('.aora-staged-picker__actions')).toBeNull();
  });

  it('shows no selection ring while the agent has a picture of its own', () => {
    const el = render(<AgentCharacterSelector value={value} hasPicture />);
    expect(el.querySelector('[data-selected]')).toBeNull();
    // Picking still stages, so confirming can replace the picture.
    click(byLabel(el, 'Hexagon'));
    expect(el.querySelector('[data-selected]')).toBeNull();
  });
});

describe('CharacterSelector', () => {
  it('reports the colour that was picked', () => {
    const onSelectColor = vi.fn();
    const el = render(<CharacterSelector shape="blob" color="blue" onSelectColor={onSelectColor} />);
    click(byLabel(el, 'Red'));
    expect(onSelectColor).toHaveBeenCalledWith('red');
  });

  it('labels options with names rather than ids', () => {
    const html = renderToString(<CharacterSelector shape="blob" color="blue" />);
    expect(html).toContain('aria-label="Hexagon"');
    expect(html).toContain('aria-label="Amber"');

    const zh = renderToString(
      <LocaleProvider locale="zh-CN">
        <CharacterSelector shape="blob" color="blue" />
      </LocaleProvider>,
    );
    expect(zh).toContain('aria-label="六边"');
  });
});

describe('CompactCharacterSelector', () => {
  it('offers the eight small-size shapes and the ten assignable colours', () => {
    const el = render(<CompactCharacterSelector shape="blob" color="blue" />);
    expect(el.querySelectorAll('.aora-picker__item')).toHaveLength(AUTO_SHAPE_POOL.length);
    expect(el.querySelectorAll('.aora-picker__swatch')).toHaveLength(ASSIGNABLE_COLOR_IDS.length);
    expect(el.querySelector('[aria-label="Black"]')).toBeNull();
  });

  it('renders on the server', () => {
    const html = renderToString(<CompactCharacterSelector shape="hex" color="green" lineWeight={1.1} />);
    expect(html).toContain('aora-picker--compact');
    expect(html).not.toContain('NaN');
  });
});
