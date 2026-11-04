// @vitest-environment happy-dom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@aora-bot/react';
import { BootLoop } from '../src/scenes/BootLoop.js';
import { DeviceBezel } from '../src/scenes/DeviceBezel.js';
import { LoadingMark } from '../src/scenes/LoadingMark.js';
import { RestrictedScene } from '../src/scenes/RestrictedScene.js';

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

const shapeOf = (el: HTMLElement) => el.querySelector('.aora-mark')!.getAttribute('data-shape');

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

describe('RestrictedScene', () => {
  it('rotates through the pool on its own clock', () => {
    const el = render(<RestrictedScene shapePool={['hex', 'star', 'cloud']} rotateMs={12_000} />);
    expect(shapeOf(el)).toBe('hex');

    advance(11_900);
    expect(shapeOf(el)).toBe('hex');
    advance(200);
    expect(shapeOf(el)).toBe('star');
    advance(12_000);
    expect(shapeOf(el)).toBe('cloud');
    // Wraps rather than running out of shapes.
    advance(12_000);
    expect(shapeOf(el)).toBe('hex');
  });

  it('holds still when asked to', () => {
    const el = render(<RestrictedScene shapePool={['hex', 'star']} rotateMs={0} />);
    advance(60_000);
    expect(shapeOf(el)).toBe('hex');
  });

  it('holds still for a pool of one', () => {
    const el = render(<RestrictedScene shapePool={['hex']} />);
    advance(40_000);
    expect(shapeOf(el)).toBe('hex');
  });

  it('refuses by default', () => {
    const el = render(<RestrictedScene />);
    expect(el.querySelector('.aora-mark')!.getAttribute('data-state')).toBe('refusing');
  });

  it('takes its copy from the tone, and lets a host override it', () => {
    expect(renderToString(<RestrictedScene tone="offline" />)).toContain('No connection');
    expect(renderToString(<RestrictedScene tone="unauthorised" />)).toContain('Not allowed');
    expect(renderToString(<RestrictedScene title="Nope" body="Not here." />)).toContain('Not here.');
    expect(
      renderToString(
        <LocaleProvider locale="zh-CN">
          <RestrictedScene tone="offline" />
        </LocaleProvider>,
      ),
    ).toContain('没有连接');
  });

  it('lights the bezel according to the tone', () => {
    expect(renderToString(<RestrictedScene tone="offline" />)).toContain('data-light="off"');
    expect(renderToString(<RestrictedScene />)).toContain('data-light="alert"');
  });
});

describe('BootLoop', () => {
  it('alternates the two states and reports each cycle', () => {
    const onCycle = vi.fn();
    const el = render(<BootLoop durationMs={1000} onCycle={onCycle} />);
    const state = () => el.querySelector('.aora-mark')!.getAttribute('data-state');

    expect(state()).toBe('working');
    advance(1000);
    expect(state()).toBe('thinking');
    expect(onCycle).not.toHaveBeenCalled();

    advance(1000);
    expect(state()).toBe('working');
    expect(onCycle).toHaveBeenLastCalledWith(1);

    advance(2000);
    expect(onCycle).toHaveBeenLastCalledWith(2);
  });
});

describe('LoadingMark', () => {
  it('holds the silhouette until it is ready, then cross-fades', () => {
    const el = render(<LoadingMark shape="hex" sizePx={40} />);
    const wrapper = el.firstElementChild as HTMLElement;
    expect(wrapper.dataset.ready).toBeUndefined();
    expect(el.querySelector('[role="status"]')).not.toBeNull();

    act(() => root!.render(<LoadingMark shape="hex" sizePx={40} ready />));
    expect((el.firstElementChild as HTMLElement).dataset.ready).toBe('true');
    // The announcement goes once the real character is there.
    expect(el.querySelector('[role="status"]')).toBeNull();
  });

  it('masks with the shape it is standing in for', () => {
    const html = renderToString(<LoadingMark shape="star" />);
    expect(html).toContain('--aora-mask');
    expect(html).toContain('data:image/svg+xml');
  });
});

describe('scene surfaces', () => {
  it.each([
    ['DeviceBezel', <DeviceBezel />],
    ['DeviceBezel alert', <DeviceBezel light="alert" widthPx={120} />],
    ['RestrictedScene', <RestrictedScene lineWeight={1.1} face="line" nose="hook" />],
    ['BootLoop', <BootLoop inFront lineWeight={0.9} />],
    ['LoadingMark', <LoadingMark />],
    ['LoadingMark ready', <LoadingMark ready shape="blob" />],
  ])('%s renders without a DOM', (_name, element) => {
    const html = renderToString(element);
    expect(html).toBeTruthy();
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
  });
});
