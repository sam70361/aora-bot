import { describe, expect, it } from 'vitest';
import * as engine from '../src/index.js';
import * as staticEntry from '../src/static.js';
import * as agentEntry from '../src/agent.js';

/*
 * Entry-point contracts.
 *
 * These run in the default Node environment on purpose: there is no `window`
 * and no `document`, so anything either entry touches at import time fails
 * here rather than in a server component.
 */

describe('entry points', () => {
  it('load without a DOM', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
    expect(engine.createCharacter).toBeTypeOf('function');
    expect(staticEntry.renderStaticSvg).toBeTypeOf('function');
  });

  it('static is a strict subset of the main entry', () => {
    for (const name of Object.keys(staticEntry)) {
      expect(engine, `static exports ${name}, main entry does not`).toHaveProperty(name);
      expect((engine as Record<string, unknown>)[name]).toBe((staticEntry as Record<string, unknown>)[name]);
    }
    expect(staticEntry).not.toHaveProperty('createCharacter');
    expect(staticEntry).not.toHaveProperty('ticker');
  });

  it('static carries the state list a server validates input against', () => {
    expect(staticEntry.CHARACTER_STATES).toBe(engine.CHARACTER_STATES);
    expect(staticEntry.isCharacterState('thinking')).toBe(true);
    expect(staticEntry.isCharacterState('not-a-state')).toBe(false);
  });

  it('agent is a DOM-free subset of the main entry', () => {
    expect(typeof document).toBe('undefined');
    expect(agentEntry.createArbiter).toBeTypeOf('function');
    expect(agentEntry.normalize).toBeTypeOf('function');
    expect(agentEntry).not.toHaveProperty('createCharacter');
    expect(agentEntry).not.toHaveProperty('ticker');
    for (const name of ['createArbiter', 'normalize', 'normalizeLine', 'resolveEmotionId'] as const) {
      expect(engine, `main entry missing ${name}`).toHaveProperty(name);
      expect((engine as Record<string, unknown>)[name]).toBe((agentEntry as Record<string, unknown>)[name]);
    }
  });
});

describe('state tables', () => {
  it('every state belongs to exactly one group', () => {
    const seen = new Map<string, number>();
    for (const group of engine.STATE_GROUPS) {
      for (const state of group.states) seen.set(state, (seen.get(state) ?? 0) + 1);
    }
    for (const state of engine.CHARACTER_STATES) {
      expect(seen.get(state), `${state} is missing from STATE_GROUPS`).toBe(1);
    }
    expect(seen.size).toBe(engine.CHARACTER_STATES.length);
  });

  it('every state has an expression list, a switch interval and a blink entry', () => {
    for (const state of engine.CHARACTER_STATES) {
      expect(engine.STATE_EYE_TOPOLOGIES[state]?.length, state).toBeGreaterThan(0);
      expect(state in engine.STATE_EYE_SWITCH_MS, state).toBe(true);
      expect(state in engine.STATE_BLINK_MS, state).toBe(true);
    }
  });

  it('every expression a state names exists', () => {
    for (const [state, list] of Object.entries(engine.STATE_EYE_TOPOLOGIES)) {
      for (const id of list) {
        expect(engine.EYE_TOPOLOGIES, `${state} → ${id}`).toHaveProperty(id);
      }
    }
  });
});

describe('static rendering', () => {
  it.each(engine.SHAPE_IDS)('%s renders a well-formed SVG', (shape) => {
    const svg = engine.renderStaticSvg({ shape, color: 'blue' });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    expect(svg).toContain(`viewBox="${engine.VIEWBOX_STR}"`);
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toContain('NaN');
    expect(svg).not.toContain('undefined');
  });

  it('leaves the viewBox margin for motion', () => {
    // The body must not touch the edge at rest, or the first jump is clipped.
    expect(engine.VIEWBOX.minX).toBeLessThanOrEqual(-24);
    for (const id of engine.SHAPE_IDS) {
      expect(engine.getShapeScale(id), id).toBeLessThanOrEqual(1);
    }
  });

  it.each(engine.CHARACTER_STATES)('%s state renders', (state) => {
    const svg = engine.renderStaticSvg({ shape: 'blob', color: 'green', state });
    expect(svg).toContain('<svg');
    expect(svg).not.toContain('NaN');
  });

  it('escapes the eye colour before writing it into an attribute', () => {
    const svg = engine.renderStaticSvg({ eyeColor: '"><script>alert(1)</script>' });
    expect(svg).not.toContain('<script');
    expect(svg).toContain('&quot;&gt;&lt;script&gt;');
  });

  it.each(engine.HUD_KINDS)('%s HUD renders into the frozen fallback', (kind) => {
    const specs: Record<string, engine.HudSpec> = {
      progress: { kind: 'progress', value: 0.7 },
      timer: { kind: 'timer', remainingMs: 1000, totalMs: 4000 },
      clock: { kind: 'clock', date: 0 },
      voice: { kind: 'voice', level: 0.8 },
      context: { kind: 'context', used: 7, total: 9 },
      balance: { kind: 'balance', value: 42 },
      gauge: { kind: 'gauge', value: 2, max: 8 },
      kpi: { kind: 'kpi', value: 5, delta: 1, series: [1, 5] },
      notify: { kind: 'notify', count: 2 },
      sync: { kind: 'sync', state: 'done' },
    };
    const svg = engine.renderStaticSvg({ shape: 'blob', color: 'blue', hud: specs[kind] });
    expect(svg).toContain('data-aora-hud');
    expect(svg).not.toContain('data-aora-face');
    expect(svg).not.toContain('NaN');
    expect(svg).not.toContain('undefined');
  });

  it('draws the belt glyphs in the fallback and respects the line weight', () => {
    for (const state of ['writing', 'alerting'] as const) {
      // Sampled part-way into the cycle, where both glyphs are on screen.
      const svg = engine.renderStaticSvg({ state, face: 'line' });
      expect(svg).toContain('<path');
      expect(svg).not.toContain('NaN');
    }

    const width = (lineWeight?: number) => {
      const svg = engine.renderStaticSvg({ face: 'line', nose: 'hook', state: 'happy', lineWeight });
      return Number(/stroke-width="([\d.]+)"/.exec(svg)?.[1]);
    };
    expect(width(1.25)).toBeGreaterThan(width());
    expect(width(0.8)).toBeLessThan(width());
    expect(width(99)).toBeCloseTo(width(engine.LINE_WEIGHT_RANGE[1]), 5);
  });

  it('is deterministic', () => {
    const a = engine.renderStaticSvg({ shape: 'hex', color: 'red', state: 'thinking' });
    const b = engine.renderStaticSvg({ shape: 'hex', color: 'red', state: 'thinking' });
    expect(a).toBe(b);
  });

  it('cuts the selection ring with a mask, not a blend mode', () => {
    // `mix-blend-mode: destination-out` is not CSS; it left the ring a solid disc.
    const url = engine.shapeRingMaskImage({ shape: 'blob', sizePx: 48 });
    const svg = decodeURIComponent(url.slice('url("data:image/svg+xml,'.length, -2));
    expect(svg).toContain('<mask');
    expect(svg).toContain('mask="url(#r)"');
    expect(svg).not.toContain('destination-out');
    expect((svg.match(/<path /g) ?? []).length).toBe(2);
  });
});
