// @vitest-environment happy-dom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@aora-bot/react';
import { Composer } from '../src/walkthrough/Composer.js';
import { DemoDesktop } from '../src/walkthrough/DemoDesktop.js';
import { HandOff } from '../src/walkthrough/HandOff.js';
import { JobBubbles } from '../src/walkthrough/JobBubbles.js';
import { LandingWait } from '../src/walkthrough/LandingWait.js';
import { SuggestionCards } from '../src/walkthrough/SuggestionCards.js';

let root: Root | null = null;
let host: HTMLElement | null = null;

function render(ui: ReactNode): HTMLElement {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(ui));
  return host;
}

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

const markState = (el: HTMLElement, selector = '.aora-mark') =>
  el.querySelector(selector)!.getAttribute('data-state');

/**
 * Type into a controlled input.
 *
 * React replaces `value` on the element with its own tracking accessor, so a
 * plain assignment records the new value as "already seen" and the change
 * event is then deduplicated away. Going through the prototype's setter is
 * what an actual keystroke does.
 */
function type(field: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(field, value);
    field.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
      'Date',
    ],
  });
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  host?.remove();
  host = null;
  vi.useRealTimers();
});

describe('Composer', () => {
  it('listens on focus, composes while typing, and settles afterwards', () => {
    const el = render(<Composer idleMs={1000} />);
    const field = el.querySelector('input')!;

    expect(markState(el)).toBe('idle');

    act(() => field.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true })));
    expect(markState(el)).toBe('listening');

    type(field, 'hello');
    expect(markState(el)).toBe('composing');

    advance(1001);
    expect(markState(el)).toBe('listening');

    act(() => field.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true })));
    expect(markState(el)).toBe('idle');
  });

  it('reports what was written', () => {
    const onSubmit = vi.fn();
    const onChange = vi.fn();
    const el = render(<Composer onSubmit={onSubmit} onChange={onChange} />);
    const field = el.querySelector('input')!;

    type(field, ' ship it ');
    expect(onChange).toHaveBeenCalledWith(' ship it ');

    const send = [...el.querySelectorAll('button')].at(-1)!;
    act(() => send.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    expect(onSubmit).toHaveBeenCalledWith('ship it');
  });

  it('keeps the send button out of reach while the field is empty', () => {
    const el = render(<Composer />);
    expect([...el.querySelectorAll('button')].at(-1)!.disabled).toBe(true);
  });
});

describe('HandOff', () => {
  const from = { id: 'lead', name: 'Lead' };
  const to = { id: 'helper', name: 'Helper' };

  it('runs three beats and stops', () => {
    const el = render(<HandOff from={from} to={to} beatMs={500} />);
    const states = () => [...el.querySelectorAll('.aora-mark')].map((m) => m.getAttribute('data-state'));

    expect(states()).toEqual(['idle', 'idle']);
    advance(500);
    expect(states()).toEqual(['sending', 'receiving']);
    advance(500);
    expect(states()).toEqual(['happy', 'working']);
    advance(5000);
    expect(states()).toEqual(['happy', 'working']);
  });

  it('starts over when looping', () => {
    const el = render(<HandOff from={from} to={to} beatMs={500} loop />);
    advance(1500);
    expect([...el.querySelectorAll('.aora-mark')].map((m) => m.getAttribute('data-state'))).toEqual([
      'idle',
      'idle',
    ]);
  });
});

describe('LandingWait', () => {
  it('counts up while there is no deadline', () => {
    const el = render(<LandingWait />);
    const value = () => el.querySelector('.aora-hud-plate__value')!.textContent;
    expect(value()).toBe('0:00');
    advance(65_000);
    expect(value()).toBe('1:05');
  });

  it('counts down to a deadline and carries the dial', () => {
    const el = render(<LandingWait waitMs={30_000} />);
    expect(el.querySelector('.aora-hud-plate__value')!.textContent).toBe('0:30');
    advance(25_000);
    expect(el.querySelector('.aora-hud-plate__value')!.textContent).toBe('0:05');
    advance(10_000);
    expect(el.querySelector('.aora-hud-plate__value')!.textContent).toBe('0:00');
    expect(el.querySelector('.aora-hud-plate')!.getAttribute('data-level')).toBe('warn');
  });

  it('waits rather than idles', () => {
    expect(markState(render(<LandingWait />))).toBe('waiting');
  });
});

describe('SuggestionCards', () => {
  it('gives each card a face derived from its id', () => {
    const el = render(<SuggestionCards />);
    const shapes = [...el.querySelectorAll('.aora-mark')].map((m) => m.getAttribute('data-shape'));
    expect(shapes).toHaveLength(3);
    expect(new Set(shapes).size).toBeGreaterThan(1);
  });

  it('reports the picked card', () => {
    const onPick = vi.fn();
    const cards = [{ id: 'one', title: 'One' }];
    const el = render(<SuggestionCards cards={cards} onPick={onPick} />);
    act(() => el.querySelector('button')!.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    expect(onPick).toHaveBeenCalledWith(cards[0]);
  });
});

describe('walkthrough surfaces', () => {
  const agent = { id: 'a', name: 'A' };

  it.each([
    ['DemoDesktop', <DemoDesktop toolbar={<span>toolbar</span>}>body</DemoDesktop>],
    ['JobBubbles', <JobBubbles lineWeight={1.1} />],
    ['JobBubbles with jobs', <JobBubbles jobs={['one', 'two']} radiusPx={60} />],
    ['SuggestionCards', <SuggestionCards face="line" nose="curve" />],
    ['LandingWait', <LandingWait waitMs={60_000} action={<button type="button">Go</button>} />],
    ['HandOff', <HandOff from={agent} to={{ id: 'b' }} />],
    ['Composer', <Composer value="typed" />],
  ])('%s renders without a DOM', (_name, element) => {
    const html = renderToString(element);
    expect(html).toBeTruthy();
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
  });

  it('takes every string from the locale', () => {
    const html = renderToString(
      <LocaleProvider locale="zh-CN">
        <DemoDesktop>
          <JobBubbles />
          <SuggestionCards />
          <Composer />
        </DemoDesktop>
      </LocaleProvider>,
    );
    expect(html).toContain('演示窗口');
    expect(html).toContain('读一遍需求');
    expect(html).toContain('规划者');
    expect(html).toContain('有什么想问的');
  });
});
