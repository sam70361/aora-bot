// @vitest-environment happy-dom
import { mapPointerToGaze as engineMapPointerToGaze, type CharacterOptions } from '@aora-bot/engine';
import type * as Engine from '@aora-bot/engine';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CharacterMark, mapPointerToGaze } from '../src/mark/CharacterMark.js';

/*
 * The new options are pushed into the engine imperatively rather than
 * rendered, so there is nothing in the React tree to assert on. Two angles
 * cover it: the calls the controller receives, and the SVG the engine
 * produces from them.
 */

const updates: Partial<CharacterOptions>[] = [];
const created: CharacterOptions[] = [];

vi.mock('@aora-bot/engine', async () => {
  const actual = await vi.importActual<typeof Engine>('@aora-bot/engine');
  return {
    ...actual,
    createCharacter: (host: HTMLElement, options: CharacterOptions) => {
      created.push(options);
      const controller = actual.createCharacter(host, options);
      return {
        ...controller,
        update: (next: Partial<CharacterOptions>) => {
          updates.push(next);
          controller.update(next);
        },
      };
    },
  };
});

let root: Root | null = null;
let host: HTMLElement | null = null;

function render(ui: ReactNode): HTMLElement {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(ui));
  return host;
}

const rerender = (ui: ReactNode) => act(() => root!.render(ui));
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

const svg = (el: HTMLElement) => el.querySelector('svg')!;

beforeEach(() => {
  updates.length = 0;
  created.length = 0;
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
  vi.restoreAllMocks();
});

describe('CharacterMark option passthrough', () => {
  it('hands the new options to the engine at mount', () => {
    render(
      <CharacterMark
        shape="hex"
        face="line"
        hud={{ kind: 'progress', value: 0.4 }}
        ink={{ flat: '#123456' }}
        eyeScale={1.2}
        lineWeight={1.2}
        followTarget={{ x: 10, y: 20 }}
      />,
    );

    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      hud: { kind: 'progress', value: 0.4 },
      ink: { flat: '#123456' },
      eyeScale: 1.2,
      lineWeight: 1.2,
      followTarget: { x: 10, y: 20 },
    });
  });

  it('paints a flat ink onto the body and a gradient into defs', () => {
    const el = render(<CharacterMark shape="blob" ink={{ flat: '#123456' }} />);
    expect(svg(el).innerHTML).toContain('#123456');
    expect(svg(el).querySelector('linearGradient')).toBeNull();

    rerender(<CharacterMark shape="blob" ink={{ from: '#112233', to: '#445566', angle: 90 }} />);
    const gradient = svg(el).querySelector('linearGradient');
    expect(gradient).not.toBeNull();
    expect(svg(el).innerHTML).toContain(`url(#${gradient!.id})`);
  });

  it('draws the HUD layer once a spec arrives and clears it when it goes', () => {
    const el = render(<CharacterMark shape="blob" hud={{ kind: 'progress', value: 0.6 }} />);
    advance(400);

    const layer = svg(el).querySelector('[data-aora-hud]')!;
    expect(layer.querySelectorAll('path, circle, rect, line').length).toBeGreaterThan(0);
    expect(Number(layer.getAttribute('opacity'))).toBeGreaterThan(0);

    rerender(<CharacterMark shape="blob" hud={null} />);
    advance(1200);
    expect(Number(layer.getAttribute('opacity'))).toBeLessThan(0.05);
  });

  it('does not push an update when a fresh literal has the same contents', () => {
    render(<CharacterMark shape="blob" hud={{ kind: 'progress', value: 0.5 }} />);
    const before = updates.filter((u) => 'hud' in u).length;

    // What a host reading a live number does: same value, new object.
    rerender(<CharacterMark shape="blob" hud={{ kind: 'progress', value: 0.5 }} />);
    expect(updates.filter((u) => 'hud' in u)).toHaveLength(before);

    rerender(<CharacterMark shape="blob" hud={{ kind: 'progress', value: 0.75 }} />);
    expect(updates.filter((u) => 'hud' in u).length).toBe(before + 1);
  });

  it('scales the line face with lineWeight', () => {
    const el = render(<CharacterMark shape="blob" face="line" nose="hook" lineWeight={0.8} sizePx={96} />);
    advance(200);
    // Paths only: the nose and the mouth. The badge is a circle with its own
    // fixed stroke, and it is hidden in every state but `notifying`.
    const widths = () =>
      [...svg(el).querySelectorAll('path[stroke-width]')].map((node) =>
        Number(node.getAttribute('stroke-width')),
      );
    const light = Math.max(...widths());

    rerender(<CharacterMark shape="blob" face="line" nose="hook" lineWeight={1.25} sizePx={96} />);
    advance(200);
    expect(Math.max(...widths())).toBeGreaterThan(light);
  });

  it('re-exports the engine conversion rather than keeping its own', () => {
    expect(mapPointerToGaze).toBe(engineMapPointerToGaze);
  });

  it('still follows the pointer', () => {
    // happy-dom measures everything as zero, and the handler needs a box.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      width: 40,
      height: 40,
      right: 140,
      bottom: 140,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    });

    render(<CharacterMark shape="blob" followPointer />);
    window.dispatchEvent(new window.PointerEvent('pointermove', { clientX: 160, clientY: 120 }));

    let gaze: CharacterOptions['gazeTarget'];
    for (const update of updates) if (update.gazeTarget) gaze = update.gazeTarget;
    expect(gaze).toEqual(
      engineMapPointerToGaze({ clientX: 160, clientY: 120 }, { left: 100, top: 100, width: 40, height: 40 }),
    );

    window.dispatchEvent(new window.PointerEvent('pointerleave'));
    expect(updates.at(-1)).toEqual({ gazeTarget: null });
  });

  it('calls the latest onSettle without rebuilding the controller', () => {
    const first = vi.fn();
    const second = vi.fn();
    render(<CharacterMark shape="blob" onSettle={first} />);
    rerender(<CharacterMark shape="blob" onSettle={second} />);

    expect(created).toHaveLength(1);
    created[0]!.onSettle?.('surprised', 'idle');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('surprised', 'idle');
  });
});
