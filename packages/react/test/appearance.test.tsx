// @vitest-environment happy-dom
import type * as Engine from '@aora-bot/engine';
import type { CharacterOptions } from '@aora-bot/engine';
import { act, useEffect, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppearanceProvider,
  CharacterMark,
  CharacterMarkMirror,
  CharacterStageProvider,
  StagedMark,
  useAppearance,
  type MarkAppearance,
} from '../src/index.js';

/*
 * What the style series adds to the React layer: props that reach the engine,
 * a context that supplies them, and a stage that keeps pixel and vector
 * sources apart. The engine's own pixel output is covered in its package; here
 * only the wiring is.
 */

type StaticSvgOptions = Parameters<typeof Engine.renderStaticSvg>[0];

const updates: Partial<CharacterOptions>[] = [];
const created: CharacterOptions[] = [];
const statics: StaticSvgOptions[] = [];

vi.mock('@aora-bot/engine', async () => {
  const actual = await vi.importActual<typeof Engine>('@aora-bot/engine');
  return {
    ...actual,
    renderStaticSvg: (options: StaticSvgOptions) => {
      statics.push(options);
      return actual.renderStaticSvg(options);
    },
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

const rerender = (ui: ReactNode): void => act(() => root!.render(ui));
const advance = (ms: number): void =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

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
});

const mark = (el: HTMLElement) => el.querySelector('.aora-mark') as HTMLElement;
const sources = (el: HTMLElement) => [...el.querySelectorAll('.aora-stage > .aora-mark')] as HTMLElement[];
const roster = (el: HTMLElement) => [...el.querySelectorAll('.aora-roster > .aora-mark')] as HTMLElement[];

describe('CharacterMark style series', () => {
  it('reports vector and solid when nothing is named, and asks the engine for the same', () => {
    const el = render(<CharacterMark shape="blob" />);

    expect(mark(el).getAttribute('data-style')).toBe('vector');
    expect(mark(el).getAttribute('data-variant')).toBe('solid');
    expect(created[0]).toMatchObject({ style: 'vector', variant: 'solid' });
    // No pixel cells: the vector renderer is still the one in the host.
    expect(el.querySelector('[shape-rendering="crispEdges"]')).toBeNull();
  });

  it("draws a pixel mark with the series' own default variant", () => {
    const el = render(<CharacterMark shape="blob" styleId="pixel" />);

    expect(mark(el).getAttribute('data-style')).toBe('pixel');
    expect(mark(el).getAttribute('data-variant')).toBe('crisp');
    expect(created[0]).toMatchObject({ style: 'pixel', variant: 'crisp' });
    expect(el.querySelector('svg g[shape-rendering="crispEdges"] path')).not.toBeNull();
  });

  it('passes variant and styleOptions through and reports the variant', () => {
    const el = render(
      <CharacterMark shape="hex" styleId="pixel" variant="dot" styleOptions={{ grid: 32 }} />,
    );

    expect(mark(el).getAttribute('data-variant')).toBe('dot');
    expect(created[0]).toMatchObject({ style: 'pixel', variant: 'dot', styleOptions: { grid: 32 } });
  });

  it('falls back to the default variant when the series does not have the one asked for', () => {
    const el = render(<CharacterMark shape="blob" styleId="pixel" variant="glass" />);
    expect(mark(el).getAttribute('data-variant')).toBe('crisp');
    expect(created[0]!.variant).toBe('crisp');
  });

  it('switches series at runtime without rebuilding the controller', () => {
    const el = render(<CharacterMark shape="blob" state="happy" />);
    expect(created).toHaveLength(1);

    rerender(<CharacterMark shape="blob" state="happy" styleId="pixel" />);

    expect(created).toHaveLength(1);
    expect(updates.at(-1)).toMatchObject({ style: 'pixel', variant: 'crisp' });
    expect(el.querySelectorAll('svg')).toHaveLength(1);
    expect(el.querySelector('svg g[shape-rendering="crispEdges"] path')).not.toBeNull();
    expect(mark(el).getAttribute('data-style')).toBe('pixel');

    rerender(<CharacterMark shape="blob" state="happy" />);
    expect(updates.at(-1)).toMatchObject({ style: 'vector', variant: 'solid' });
    expect(el.querySelectorAll('svg')).toHaveLength(1);
    expect(el.querySelector('svg g[shape-rendering="crispEdges"] path')).toBeNull();
  });

  it('compares styleOptions by value, and returns to the defaults when they are dropped', () => {
    render(<CharacterMark shape="blob" styleId="pixel" styleOptions={{ grid: 32, gap: 0.2 }} />);

    // A fresh literal with the same content, keys in another order: nothing to push.
    rerender(<CharacterMark shape="blob" styleId="pixel" styleOptions={{ gap: 0.2, grid: 32 }} />);
    expect(updates.filter((u) => u.styleOptions)).toHaveLength(0);

    const pushed = () => updates.flatMap((u) => (u.styleOptions ? [u.styleOptions] : []));

    rerender(<CharacterMark shape="blob" styleId="pixel" styleOptions={{ grid: 16 }} />);
    expect(pushed().at(-1)).toEqual({ grid: 16 });

    rerender(<CharacterMark shape="blob" styleId="pixel" />);
    expect(pushed().at(-1)).toEqual({});
  });

  it('renders the same attributes on the server', () => {
    const html = renderToString(<CharacterMark shape="blob" styleId="pixel" variant="block" />);
    expect(html).toContain('data-style="pixel"');
    expect(html).toContain('data-variant="block"');

    const plain = renderToString(<CharacterMark shape="blob" />);
    expect(plain).toContain('data-style="vector"');
    expect(plain).toContain('data-variant="solid"');
  });
});

describe('CharacterMarkMirror', () => {
  it('echoes the source style as data attributes', () => {
    const html = renderToString(
      <CharacterMarkMirror sourceId="x" styleId="pixel" variant="dot" styleOptions={{ grid: 32 }} />,
    );
    expect(html).toContain('data-style="pixel"');
    expect(html).toContain('data-variant="dot"');
    expect(html).toContain('data-style-options=');

    const bare = renderToString(<CharacterMarkMirror sourceId="x" />);
    expect(bare).not.toContain('data-style');
  });
});

describe('AppearanceProvider', () => {
  it('is empty outside any provider', () => {
    const seen: MarkAppearance[] = [];
    function Probe() {
      const value = useAppearance();
      useEffect(() => {
        seen.push(value);
      });
      return null;
    }
    render(<Probe />);
    expect(seen).toEqual([{}]);
  });

  it('supplies the series, variant and options to every mark below', () => {
    const el = render(
      <AppearanceProvider styleId="pixel" variant="block" styleOptions={{ grid: 20 }} face="line">
        <CharacterMark shape="blob" />
      </AppearanceProvider>,
    );

    expect(mark(el).getAttribute('data-style')).toBe('pixel');
    expect(mark(el).getAttribute('data-variant')).toBe('block');
    expect(mark(el).getAttribute('data-face')).toBe('line');
    expect(created[0]).toMatchObject({ style: 'pixel', variant: 'block', styleOptions: { grid: 20 } });
  });

  it('lets a prop on the mark win over the context', () => {
    const el = render(
      <AppearanceProvider styleId="pixel" variant="dot" lineWeight={1.2}>
        <CharacterMark shape="blob" styleId="vector" lineWeight={0.9} />
      </AppearanceProvider>,
    );

    expect(mark(el).getAttribute('data-style')).toBe('vector');
    // `dot` is not a vector variant, so the series' own default is drawn and reported.
    expect(mark(el).getAttribute('data-variant')).toBe('solid');
    expect(created[0]).toMatchObject({ style: 'vector', lineWeight: 0.9 });
  });

  it('merges nested providers, the inner one replacing only what it sets', () => {
    const el = render(
      <AppearanceProvider styleId="pixel" variant="dot" styleOptions={{ grid: 32 }}>
        <AppearanceProvider variant="block">
          <CharacterMark shape="blob" />
        </AppearanceProvider>
      </AppearanceProvider>,
    );

    expect(mark(el).getAttribute('data-style')).toBe('pixel');
    expect(mark(el).getAttribute('data-variant')).toBe('block');
    expect(created[0]!.styleOptions).toEqual({ grid: 32 });
  });

  it('switches every mark below when the context changes, keeping each controller', () => {
    const tree = (styleId: 'vector' | 'pixel') => (
      <AppearanceProvider styleId={styleId}>
        <CharacterMark shape="blob" />
        <CharacterMark shape="hex" />
      </AppearanceProvider>
    );
    const el = render(tree('vector'));
    expect(created).toHaveLength(2);

    rerender(tree('pixel'));

    expect(created).toHaveLength(2);
    expect([...el.querySelectorAll('.aora-mark')].map((m) => m.getAttribute('data-style'))).toEqual([
      'pixel',
      'pixel',
    ]);
    expect(el.querySelectorAll('svg g[shape-rendering="crispEdges"] path').length).toBeGreaterThan(0);
  });

  it('does not push an update when the provider is handed an equal options literal', () => {
    const tree = (styleOptions: Record<string, unknown>) => (
      <AppearanceProvider styleId="pixel" styleOptions={styleOptions}>
        <CharacterMark shape="blob" />
      </AppearanceProvider>
    );
    render(tree({ grid: 32 }));
    rerender(tree({ grid: 32 }));
    expect(updates.filter((u) => u.styleOptions)).toHaveLength(0);
  });
});

describe('shared stage appearance key', () => {
  const marks = (
    <div className="aora-roster">
      <StagedMark shape="blob" state="idle" />
      <StagedMark shape="blob" state="idle" styleId="pixel" />
      <StagedMark shape="blob" state="idle" styleId="pixel" variant="dot" />
      <StagedMark shape="blob" state="idle" styleId="pixel" variant="dot" styleOptions={{ grid: 32 }} />
      <StagedMark shape="blob" state="idle" styleId="pixel" variant="dot" styleOptions={{ grid: 32 }} />
    </div>
  );

  it('hosts one source per style, variant and parameter set, and shares the rest', () => {
    const el = render(<CharacterStageProvider>{marks}</CharacterStageProvider>);
    advance(FRAME_MS);

    const hosted = sources(el);
    expect(hosted.map((s) => [s.getAttribute('data-style'), s.getAttribute('data-variant')])).toEqual([
      ['vector', 'solid'],
      ['pixel', 'crisp'],
      ['pixel', 'dot'],
      ['pixel', 'dot'],
    ]);
    expect(roster(el)).toHaveLength(5);
    expect(roster(el).every((m) => m.classList.contains('aora-mark--mirror'))).toBe(true);

    for (const use of el.querySelectorAll('.aora-roster use')) {
      const id = use.getAttribute('href')!.slice(1);
      expect(el.querySelector(`.aora-stage [id="${id}"]`)).not.toBeNull();
    }
  });

  it('echoes the series on each mirror', () => {
    const el = render(<CharacterStageProvider>{marks}</CharacterStageProvider>);
    advance(FRAME_MS);

    expect(
      roster(el).map((m) => `${m.getAttribute('data-style')}/${m.getAttribute('data-variant')}`),
    ).toEqual(['vector/solid', 'pixel/crisp', 'pixel/dot', 'pixel/dot', 'pixel/dot']);
  });

  it('treats options equal to the defaults, or in another order, as the same appearance', () => {
    const el = render(
      <CharacterStageProvider>
        <div className="aora-roster">
          <StagedMark shape="blob" styleId="pixel" />
          <StagedMark shape="blob" styleId="pixel" styleOptions={{}} />
          <StagedMark shape="blob" styleId="pixel" styleOptions={{ grid: 24 }} />
          <StagedMark shape="blob" styleId="pixel" styleOptions={{ grid: 99 }} />
          <StagedMark shape="blob" styleId="pixel" styleOptions={{ grid: 64 }} />
          <StagedMark shape="blob" styleId="pixel" styleOptions={{ gap: 0.3, grid: 20 }} />
          <StagedMark shape="blob" styleId="pixel" styleOptions={{ grid: 20, gap: 0.3 }} />
        </div>
      </CharacterStageProvider>,
    );
    advance(FRAME_MS);

    // defaults; grid 64 (99 clamps to it); grid 20 + gap 0.3.
    expect(sources(el)).toHaveLength(3);
  });

  it('draws the same series in the still image once the stage is over its cap', () => {
    const el = render(
      <CharacterStageProvider maxSources={1}>
        <div className="aora-roster">
          <StagedMark shape="blob" />
          <StagedMark shape="hex" styleId="pixel" variant="block" />
        </div>
      </CharacterStageProvider>,
    );
    advance(FRAME_MS);

    const still = roster(el)[1]!;
    expect(still.classList.contains('aora-mark--still')).toBe(true);
    expect(still.getAttribute('data-style')).toBe('pixel');
    expect(still.getAttribute('data-variant')).toBe('block');
    // happy-dom cannot parse the static SVG's <style>, so the call is what is checked.
    expect(statics.at(-1)).toMatchObject({ shape: 'hex', style: 'pixel', variant: 'block' });
    expect(statics.at(-1)!.styleOptions).toBeUndefined();
  });

  it('keeps the ids of marks that never named a style as they were', () => {
    const el = render(
      <CharacterStageProvider>
        <div className="aora-roster">
          <StagedMark shape="blob" state="idle" lineWeight={1.15} />
        </div>
      </CharacterStageProvider>,
    );
    advance(FRAME_MS);

    const id = sources(el)[0]!.querySelector('g[id]')!.getAttribute('id')!;
    expect(id).toMatch(/^aora-src-.+-blob-idle-cute---1-15----$/);
    expect(id).not.toMatch(/%/);
  });

  it('gives a pixel source an id a <use> can resolve', () => {
    const el = render(
      <CharacterStageProvider>
        <div className="aora-roster">
          <StagedMark shape="blob" styleId="pixel" styleOptions={{ grid: 32, gap: 0.3 }} />
        </div>
      </CharacterStageProvider>,
    );
    advance(FRAME_MS);

    const href = roster(el)[0]!.querySelector('use')!.getAttribute('href')!;
    expect(href).toMatch(/^#[A-Za-z0-9_-]+$/);
    expect(el.querySelector(`.aora-stage [id="${href.slice(1)}"]`)).not.toBeNull();
  });

  it('takes the ambient series from an AppearanceProvider, without leaking it into the sources it hosts', () => {
    const el = render(
      <AppearanceProvider styleId="pixel" variant="dot" lineWeight={1.2}>
        <CharacterStageProvider>
          <div className="aora-roster">
            <StagedMark shape="blob" />
          </div>
        </CharacterStageProvider>
      </AppearanceProvider>,
    );
    advance(FRAME_MS);

    expect(roster(el)[0]!.getAttribute('data-style')).toBe('pixel');
    expect(roster(el)[0]!.getAttribute('data-variant')).toBe('dot');
    // The source is built from its key alone, which carries the weight.
    expect(created.at(-1)).toMatchObject({ style: 'pixel', variant: 'dot', lineWeight: 1.2 });
  });

  it('does not release and re-claim the source when styleOptions is a fresh equal literal', () => {
    const tree = (styleOptions: Record<string, unknown>) => (
      <CharacterStageProvider>
        <StagedMark shape="blob" styleId="pixel" styleOptions={styleOptions} />
      </CharacterStageProvider>
    );
    render(tree({ grid: 32 }));
    advance(FRAME_MS);
    const before = created.length;

    rerender(tree({ grid: 32 }));
    advance(FRAME_MS * 2);

    expect(created).toHaveLength(before);
  });
});
