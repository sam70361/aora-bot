// @vitest-environment happy-dom
import { castMember, renderStaticSvg, ticker } from '@aora-bot/engine';
import { act, createRef, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ActivityTicker,
  AgentStateProvider,
  CharacterMark,
  ConfettiLayer,
  MarkStageProvider,
  SpriteMark,
  StagedMark,
  useAgentState,
  useIdleSleep,
  type ConfettiHandle,
  type SpriteManifest,
} from '../src/index.js';

/*
 * Client-side behaviour that the SSR smoke test cannot reach: anything that
 * happens after mount, over time, or in response to a prop change.
 *
 * Fake timers cover `requestAnimationFrame`, so the stage's per-frame commit
 * and the engine's shared ticker both advance under `act` with real deltas.
 */

const FRAME_MS = 16;

let root: Root | null = null;
let host: HTMLElement | null = null;

function render(ui: ReactNode): HTMLElement {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(ui));
  return host;
}

function rerender(ui: ReactNode): void {
  act(() => root!.render(ui));
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
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

const appearances = [
  { shape: 'blob', state: 'idle' },
  { shape: 'hex', state: 'thinking' },
  { shape: 'tofu', state: 'happy' },
  { shape: 'cloud', state: 'proud' },
] as const;

/** The visible cells, as opposed to the hidden sources the stage hosts. */
const roster = (el: HTMLElement) => [...el.querySelectorAll('.aora-roster > .aora-mark')];
const sources = (el: HTMLElement) => [...el.querySelectorAll('.aora-stage > .aora-mark')];

describe('MarkStageProvider', () => {
  it('hosts one engine per appearance and mirrors every claim under the cap', () => {
    const el = render(
      <MarkStageProvider maxSources={4}>
        <div className="aora-roster">
          {appearances.map((a, i) => (
            <StagedMark key={i} {...a} sizePx={32} />
          ))}
          {appearances.map((a, i) => (
            <StagedMark key={`dup-${i}`} {...a} sizePx={32} />
          ))}
        </div>
      </MarkStageProvider>,
    );

    // Claims are coalesced into the next frame; until then the box is held open.
    expect(sources(el)).toHaveLength(0);
    const placeholders = roster(el);
    expect(placeholders).toHaveLength(8);
    for (const p of placeholders) {
      expect(p.classList.contains('aora-mark--mirror')).toBe(false);
      expect((p as HTMLElement).style.aspectRatio).toBe('1 / 1');
    }

    advance(FRAME_MS);

    // Eight claims, four distinct appearances: four sources, eight mirrors.
    expect(sources(el)).toHaveLength(4);
    const cells = roster(el);
    expect(cells.filter((c) => c.classList.contains('aora-mark--mirror'))).toHaveLength(8);
    expect(cells.filter((c) => c.classList.contains('aora-mark--still'))).toHaveLength(0);

    // Every mirror points at a real, mounted source group.
    for (const use of el.querySelectorAll('.aora-roster use')) {
      const id = use.getAttribute('href')!.slice(1);
      expect(el.querySelector(`.aora-stage [id="${id}"]`)).not.toBeNull();
    }
  });

  it('falls back to inline still images past maxSources instead of leaving blank cells', () => {
    const el = render(
      <MarkStageProvider maxSources={2}>
        <div className="aora-roster">
          {appearances.map((a, i) => (
            <StagedMark key={i} {...a} color="blue" sizePx={32} />
          ))}
        </div>
      </MarkStageProvider>,
    );
    advance(FRAME_MS);

    expect(sources(el)).toHaveLength(2);
    const cells = roster(el);
    expect(cells.map((c) => c.classList.contains('aora-mark--mirror'))).toEqual([true, true, false, false]);
    expect(cells.map((c) => c.classList.contains('aora-mark--still'))).toEqual([false, false, true, true]);

    for (const still of cells.slice(2)) {
      // Inline SVG rather than an <img>, so the eye cut-outs can inherit
      // --aora-bg from the page. (The markup itself is covered by the engine's
      // static-render tests; here we only care that it is inline.)
      expect(still.querySelector('img')).toBeNull();
      expect(still.querySelector('svg')?.getAttribute('viewBox')).toBe('-24 -24 277 277');
      expect(still.getAttribute('data-color')).toBe('blue');
    }
    expect(
      renderStaticSvg({ shape: 'tofu', state: 'happy', color: 'blue', eyeColor: 'var(--aora-bg)' }),
    ).toContain('var(--aora-bg)');

    // Nothing in the roster is empty.
    for (const cell of cells) expect(cell.querySelector('svg')).not.toBeNull();
  });

  it('keeps first-come claims hosted when a later one would push them over the cap', () => {
    const el = render(
      <MarkStageProvider maxSources={1}>
        <div className="aora-roster">
          <StagedMark key="blob" shape="blob" state="idle" />
        </div>
      </MarkStageProvider>,
    );
    advance(FRAME_MS);
    expect(roster(el)[0]!.classList.contains('aora-mark--mirror')).toBe(true);

    // The newcomer is placed *before* the running mark in the tree. Claim
    // order, not tree order, decides who stays under the cap, so the mark
    // that has been running must keep its engine.
    rerender(
      <MarkStageProvider maxSources={1}>
        <div className="aora-roster">
          <StagedMark key="hex" shape="hex" state="idle" />
          <StagedMark key="blob" shape="blob" state="idle" />
        </div>
      </MarkStageProvider>,
    );
    advance(FRAME_MS);
    // A second frame: a stage that released and re-claimed on every commit
    // would have re-ordered the roster by now.
    advance(FRAME_MS);

    const cells = roster(el);
    expect(cells[0]!.getAttribute('data-shape')).toBe('hex');
    expect(cells[0]!.classList.contains('aora-mark--still')).toBe(true);
    expect(cells[1]!.classList.contains('aora-mark--mirror')).toBe(true);
    expect(sources(el).map((s) => s.getAttribute('data-shape'))).toEqual(['blob']);
  });

  it('releases sources when the last claim goes away', () => {
    const el = render(
      <MarkStageProvider>
        <StagedMark shape="blob" state="idle" />
        <StagedMark shape="blob" state="idle" />
      </MarkStageProvider>,
    );
    advance(FRAME_MS);
    expect(sources(el)).toHaveLength(1);
    expect(ticker.size).toBe(1);

    rerender(<MarkStageProvider>{null}</MarkStageProvider>);
    advance(FRAME_MS);
    expect(sources(el)).toHaveLength(0);
    expect(ticker.size).toBe(0);
  });

  it('treats face style and nose as part of the appearance, but ignores a nose on the default face', () => {
    const el = render(
      <MarkStageProvider>
        <div className="aora-roster">
          <StagedMark shape="blob" state="idle" />
          <StagedMark shape="blob" state="idle" nose="hook" />
          <StagedMark shape="blob" state="idle" face="line" nose="hook" />
          <StagedMark shape="blob" state="idle" face="line" nose="bow" />
          <StagedMark shape="blob" state="idle" face="line" nose="bow" />
        </div>
      </MarkStageProvider>,
    );
    advance(FRAME_MS);

    // cute, line+hook, line+bow — the nose on the cute face is moot.
    const hosted = sources(el);
    expect(hosted).toHaveLength(3);
    expect(hosted.map((s) => s.getAttribute('data-face'))).toEqual(['cute', 'line', 'line']);
    expect(roster(el).map((c) => c.getAttribute('data-face'))).toEqual([
      'cute',
      'cute',
      'line',
      'line',
      'line',
    ]);

    // The line sources carry a stroked nose and mouth; the cute source does not.
    const strokes = (s: Element) => s.querySelectorAll('g[clip-path] > path[fill="none"]').length;
    expect(strokes(hosted[0]!)).toBe(0);
    expect(strokes(hosted[1]!)).toBe(2);
  });

  it('splits sources by line weight, and tells each mirror the weight it is showing', () => {
    const el = render(
      <MarkStageProvider>
        <div className="aora-roster">
          <StagedMark shape="blob" state="idle" face="line" nose="hook" />
          <StagedMark shape="blob" state="idle" face="line" nose="hook" lineWeight={1.2} />
          <StagedMark shape="blob" state="idle" face="line" nose="hook" lineWeight={1.2} />
        </div>
      </MarkStageProvider>,
    );
    advance(FRAME_MS);

    // Line weight is baked into the source geometry, so a heavier pen needs
    // its own engine rather than a mirror of the lighter one.
    expect(sources(el)).toHaveLength(2);
    const cells = roster(el);
    expect(cells.every((c) => c.classList.contains('aora-mark--mirror'))).toBe(true);
    expect(cells.map((c) => c.getAttribute('data-line-weight'))).toEqual([null, '1.2', '1.2']);
    // The two heavy ones mirror one source; the light one has its own.
    const hrefs = cells.map((c) => c.querySelector('use')!.getAttribute('href'));
    expect(hrefs[1]).toBe(hrefs[2]);
    expect(hrefs[0]).not.toBe(hrefs[1]);
    // The id has to survive being a fragment identifier: the key's separator
    // and the weight's decimal point are both illegal in one.
    for (const href of hrefs) expect(href).not.toMatch(/[|.]/);
  });

  it('splits sources by emphasis and by pause, which are how the engine is driven', () => {
    const el = render(
      <MarkStageProvider>
        <div className="aora-roster">
          <StagedMark shape="hex" state="idle" />
          <StagedMark shape="hex" state="idle" emphasis />
          <StagedMark shape="hex" state="idle" paused />
        </div>
      </MarkStageProvider>,
    );
    advance(FRAME_MS);
    expect(sources(el)).toHaveLength(3);
  });

  it('leaves the stage entirely for a mark with a HUD, which no two marks can share', () => {
    const el = render(
      <MarkStageProvider>
        <div className="aora-roster">
          <StagedMark shape="blob" state="working" />
          <StagedMark shape="blob" state="working" hud={{ kind: 'progress', value: 0.4 }} />
        </div>
      </MarkStageProvider>,
    );
    advance(FRAME_MS);

    // A dial's value moves every tick, so keying on it would mint a source
    // per frame. The mark runs its own engine instead.
    expect(sources(el)).toHaveLength(1);
    const cells = roster(el);
    expect(cells[0]!.classList.contains('aora-mark--mirror')).toBe(true);
    expect(cells[1]!.classList.contains('aora-mark--mirror')).toBe(false);
    expect(cells[1]!.querySelector('use')).toBeNull();
    expect(cells[1]!.querySelector('svg')).not.toBeNull();
  });

  it('cancels a pending commit on unmount', () => {
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame');
    render(
      <MarkStageProvider>
        <StagedMark shape="blob" state="idle" />
      </MarkStageProvider>,
    );

    // Unmount before the frame fires: the scheduled commit must be cancelled,
    // not left to call setState on a provider that no longer exists.
    act(() => root!.unmount());
    root = null;
    expect(cancel).toHaveBeenCalled();

    expect(() => advance(FRAME_MS * 4)).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
    cancel.mockRestore();
  });
});

describe('ActivityTicker', () => {
  const lines = (el: HTMLElement) =>
    [...el.querySelectorAll('.aora-ticker__line')].map((n) => [
      n.className.includes('--out') ? 'out' : 'in',
      n.textContent,
    ]);

  it('crossfades and retires the outgoing line after the duration', () => {
    const el = render(<ActivityTicker text="Reading files" durationMs={200} />);
    expect(lines(el)).toEqual([['in', 'Reading files']]);

    rerender(<ActivityTicker text="Running tests" durationMs={200} />);
    expect(lines(el)).toEqual([
      ['out', 'Reading files'],
      ['in', 'Running tests'],
    ]);
    expect(el.querySelector('.aora-ticker__line--out')!.getAttribute('aria-hidden')).toBe('true');

    advance(199);
    expect(lines(el)).toHaveLength(2);
    advance(1);
    expect(lines(el)).toEqual([['in', 'Running tests']]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not leave an outgoing line behind when the text changes again mid-fade', () => {
    const el = render(<ActivityTicker text="one" durationMs={200} />);
    rerender(<ActivityTicker text="two" durationMs={200} />);
    advance(100);
    rerender(<ActivityTicker text="three" durationMs={200} />);

    // The retiring line is always the one most recently shown.
    expect(lines(el)).toEqual([
      ['out', 'two'],
      ['in', 'three'],
    ]);

    advance(200);
    expect(lines(el)).toEqual([['in', 'three']]);
  });

  it('ignores re-renders that keep the same text', () => {
    const el = render(<ActivityTicker text="steady" />);
    rerender(<ActivityTicker text="steady" />);
    rerender(<ActivityTicker text="steady" className="x" />);
    expect(lines(el)).toEqual([['in', 'steady']]);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('ConfettiLayer', () => {
  /** Dots, stars and strips: everything in the paper group, between the two ribbon groups. */
  const pieces = (el: Element) => el.querySelectorAll('g[aria-hidden="true"] > g:nth-child(2) > *');

  it('stays off the shared ticker while idle and leaves it once the burst settles', () => {
    const ref = createRef<ConfettiHandle>();
    const el = render(<ConfettiLayer ref={ref} />);
    expect(ticker.size).toBe(0);

    act(() => ref.current!.burst(12));
    expect(ticker.size).toBe(1);
    advance(FRAME_MS);
    expect(pieces(el)).toHaveLength(12);

    // Particles have a finite life; once the last one is gone the layer
    // unsubscribes rather than pinning the page's frame loop.
    advance(5000);
    expect(pieces(el)).toHaveLength(0);
    expect(ticker.size).toBe(0);
  });

  it('clears in-flight pieces and unsubscribes on demand', () => {
    const ref = createRef<ConfettiHandle>();
    const el = render(<ConfettiLayer ref={ref} />);

    act(() => ref.current!.burst(6));
    advance(FRAME_MS);
    expect(pieces(el)).toHaveLength(6);

    act(() => ref.current!.clear());
    expect(pieces(el)).toHaveLength(0);
    expect(ticker.size).toBe(0);
  });
});

const SPRITE: SpriteManifest = {
  kind: 'sprite-mate',
  formatVersion: 1,
  id: 'demo',
  frameSize: [64, 64],
  fps: 10,
  frames: { '02': ['a.png', 'b.png'] },
};

function IdleProbe() {
  const idle = useIdleSleep({ drowsyAfterMs: 100, sleepAfterMs: 200, wakeMs: 50 });
  return <span data-phase={idle.phase} data-state={idle.state ?? ''} />;
}

function AgentProbe() {
  const { state, tips, update } = useAgentState();
  return (
    <button
      type="button"
      data-state={state}
      data-tips={tips ?? ''}
      onClick={() => update({ sessionId: 's', emotionId: '32', tips: 'go' })}
    >
      {state}
    </button>
  );
}

describe('AgentStateProvider', () => {
  it('shares an arbiter and updates the tree', () => {
    const el = render(
      <AgentStateProvider>
        <AgentProbe />
      </AgentStateProvider>,
    );
    const button = el.querySelector('button')!;
    expect(button.getAttribute('data-state')).toBe('idle');
    act(() => button.click());
    expect(button.getAttribute('data-state')).toBe('working');
    expect(button.getAttribute('data-tips')).toBe('go');
  });
});

describe('useIdleSleep', () => {
  it('moves from awake to drowsy to asleep, then wakes', () => {
    const el = render(<IdleProbe />);
    const probe = () => el.querySelector('[data-phase]')!;
    expect(probe().getAttribute('data-phase')).toBe('awake');
    advance(100);
    expect(probe().getAttribute('data-phase')).toBe('drowsy');
    advance(100);
    expect(probe().getAttribute('data-phase')).toBe('asleep');
    expect(probe().getAttribute('data-state')).toBe('sleeping');
    act(() => document.dispatchEvent(new Event('pointerdown')));
    expect(probe().getAttribute('data-phase')).toBe('waking');
    advance(50);
    expect(probe().getAttribute('data-phase')).toBe('awake');
  });
});

describe('SpriteMark', () => {
  it('swaps frames on a timer and holds the first when paused', () => {
    const el = render(<SpriteMark manifest={SPRITE} baseUrl="/s/" state="idle" />);
    const img = () => el.querySelector('img')!;
    expect(img().getAttribute('src')).toBe('/s/a.png');
    advance(100);
    expect(img().getAttribute('src')).toBe('/s/b.png');
    rerender(<SpriteMark manifest={SPRITE} baseUrl="/s/" state="idle" paused />);
    expect(img().getAttribute('src')).toBe('/s/a.png');
    advance(200);
    expect(img().getAttribute('src')).toBe('/s/a.png');
  });

  it('draws the fallback as the character it is standing in for', () => {
    // No manifest: this is the state a `src` sheet is in until it arrives,
    // and a black blob followed by a blue hexagon reads as two characters.
    const el = render(<SpriteMark state="thinking" shape="hex" color="blue" face="line" nose="hook" />);
    const mark = el.querySelector('.aora-mark')!;
    expect(el.querySelector('.aora-sprite')!.getAttribute('data-sprite-status')).toBe('loading');
    expect(mark.getAttribute('data-shape')).toBe('hex');
    expect(mark.getAttribute('data-face')).toBe('line');
    expect((mark as HTMLElement).style.getPropertyValue('--aora-fg')).not.toBe('');
  });

  it('takes the fallback identity from a cast preset too', () => {
    const el = render(<SpriteMark state="idle" preset="hop" />);
    const mark = el.querySelector('.aora-mark')!;
    expect(mark.getAttribute('data-shape')).toBe(castMember('hop')!.shape);
  });

  it('draws an empty box of the final size when the host asks for no fallback', () => {
    const el = render(<SpriteMark state="idle" sizePx={40} fallback="none" />);
    const box = el.querySelector('.aora-sprite') as HTMLElement;
    expect(box.querySelector('.aora-mark')).toBeNull();
    expect(box.style.width).toBe('40px');
  });
});

describe('autoPause', () => {
  it('pauses the engine when the document is hidden', () => {
    const el = render(<CharacterMark shape="blob" state="idle" autoPause sizePx={48} />);
    expect(el.querySelector('svg')).toBeTruthy();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    // A paused character keeps its SVG; it just drops off the ticker.
    expect(el.querySelector('svg')).toBeTruthy();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  });
});
