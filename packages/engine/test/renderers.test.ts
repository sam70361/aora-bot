// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createSimulation } from '../src/sim/simulation.js';
import { getStyle, resolveStyleOptions } from '../src/styles/index.js';
import type { FrameSnapshot } from '../src/sim/snapshot.js';

/*
 * One snapshot, two renderers. The live one reconciles DOM and keeps hidden
 * nodes for pooling; the static one culls and serialises. Both come out of
 * the same scene builder, so whatever geometry is visible in one must be
 * visible in the other, byte for byte.
 */

const style = getStyle('vector');
const options = resolveStyleOptions(style);

function stillFrame(shape: string, state: string, variant: 'solid' | 'outline' | 'glass'): FrameSnapshot {
  const sim = createSimulation({
    shape: shape as never,
    state: state as never,
    variant,
    seed: 'consistency',
    reducedMotion: true,
    compensateEyes: false,
    still: { beltTime: 0.62 },
    displaySizePx: 240,
  });
  sim.settle();
  const frame = sim.snapshot();
  sim.dispose();
  return frame;
}

/** Every drawn outline: a `d` that is not empty, on a node that is not hidden. */
function drawnPaths(root: Element): string[] {
  const out: string[] = [];
  for (const el of Array.from(root.querySelectorAll('path'))) {
    const d = el.getAttribute('d');
    if (!d) continue;
    if (el.getAttribute('opacity') === '0') continue;
    if (el.closest('defs, clipPath, mask')) continue;
    out.push(d);
  }
  return out.sort();
}

/** The same list from markup. A regexp, not a parser: the DOM's HTML parser is not what static output is for. */
function staticPaths(markup: string): string[] {
  const out: string[] = [];
  for (const tag of markup.match(/<path\b[^>]*>/g) ?? []) {
    const d = /\sd="([^"]+)"/.exec(tag)?.[1];
    if (!d || /\sopacity="0"/.test(tag)) continue;
    out.push(d);
  }
  return out.sort();
}

const CASES: [string, string, 'solid' | 'outline' | 'glass'][] = [
  ['blob', 'idle', 'solid'],
  ['tofu', 'thinking', 'solid'],
  ['clover', 'idle', 'outline'],
  ['pebble', 'idle', 'glass'],
  ['blob', 'listening', 'solid'],
];

describe('live and static vector renderers', () => {
  it.each(CASES)('draw the same outlines for %s / %s / %s', (shape, state, variant) => {
    const frame = stillFrame(shape, state, variant);

    const host = document.createElement('div');
    document.body.appendChild(host);
    const live = style.createRenderer(host, { seed: 'consistency', styleOptions: options });
    live.draw(frame);

    const markup = style.renderStatic(frame, {
      color: 'blue',
      uid: 'x',
      styleOptions: options,
    });
    const fromStatic = staticPaths(markup);
    const fromLive = drawnPaths(live.element);

    expect(fromStatic.length).toBeGreaterThan(0);
    // Static output must be a subset of what live shows: it never invents geometry.
    for (const d of fromStatic) expect(fromLive).toContain(d);

    live.destroy();
    host.remove();
  });

  it('draws the same frame twice without touching the DOM the second time', () => {
    const frame = stillFrame('blob', 'idle', 'solid');
    const host = document.createElement('div');
    const live = style.createRenderer(host, { seed: 'idem', styleOptions: options });
    live.draw(frame);

    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((records) => mutations.push(...records));
    observer.observe(live.element, { attributes: true, childList: true, subtree: true });
    live.draw(frame);
    return Promise.resolve().then(() => {
      observer.disconnect();
      expect(mutations).toHaveLength(0);
      live.destroy();
    });
  });

  it('serialises the same markup for the same snapshot', () => {
    const frame = stillFrame('tofu', 'idle', 'solid');
    const ctx = { color: 'green', uid: 'x', styleOptions: options } as const;
    expect(style.renderStatic(frame, ctx)).toBe(style.renderStatic(frame, ctx));
  });

  it('removes what it mounted on destroy', () => {
    const host = document.createElement('div');
    const live = style.createRenderer(host, { seed: 'gone', styleOptions: options });
    expect(host.querySelector('svg')).toBe(live.element);
    live.destroy();
    expect(host.childElementCount).toBe(0);
  });

  it('thickens the outline when the style parameter changes', () => {
    const frame = stillFrame('blob', 'idle', 'outline');
    const host = document.createElement('div');
    const live = style.createRenderer(host, { seed: 'cfg', styleOptions: options });
    live.draw(frame);
    const widths = (): string[] =>
      Array.from(live.element.querySelectorAll('[stroke-width]')).map((el) =>
        el.getAttribute('stroke-width')!,
      );
    const before = widths();
    live.configure(resolveStyleOptions(style, { strokeWidth: 24 }));
    live.draw(frame);
    expect(widths()).not.toEqual(before);
    live.destroy();
  });
});
