import { describe, expect, it } from 'vitest';
import { evaluateHud, type HudContext, type HudFrame } from '../src/hud/dials.js';
import { formatHud } from '../src/hud/format.js';
import { HUD_KINDS, HUD_KIND_LABELS, isHudKind, isHudSpec, type HudSpec } from '../src/hud/spec.js';
import { CENTER, VIEWBOX } from '../src/core/types.js';

/*
 * Dials are pure functions of `(spec, t)`, which is what makes them testable
 * at all: every assertion here is about numbers, none about pixels. The two
 * that matter are that nothing is ever `NaN` — a single bad number silently
 * drops an SVG node rather than failing loudly — and that everything lands in
 * the ring outside the body, since the body is already carrying the state.
 */

const ctx: HudContext = { radius: 100, eyeRadius: 22, lineWeight: 0.34 };

/** One spec per kind, with plausible values for every required field. */
const SPECS: Record<string, HudSpec> = {
  progress: { kind: 'progress', value: 0.42 },
  timer: { kind: 'timer', remainingMs: 9_000, totalMs: 60_000 },
  clock: { kind: 'clock', date: 1_700_000_000_000 },
  voice: { kind: 'voice', level: 0.6, bands: 5, mode: 'speaking' },
  context: { kind: 'context', used: 90_000, total: 100_000 },
  balance: { kind: 'balance', value: 1250, low: true, unit: 'credits' },
  gauge: { kind: 'gauge', value: 30, max: 90 },
  kpi: { kind: 'kpi', value: 12, delta: -3, series: [4, 9, 2, 12] },
  notify: { kind: 'notify', count: 7 },
  sync: { kind: 'sync', state: 'syncing' },
};

function numbersOf(frame: HudFrame): number[] {
  const out: number[] = [];
  for (const a of frame.arcs) out.push(a.x, a.y, a.r, a.start, a.end, a.opacity, a.width);
  for (const b of frame.bars) out.push(b.x, b.y, b.w, b.h, b.opacity);
  for (const t of frame.ticks) out.push(t.x1, t.y1, t.x2, t.y2, t.opacity);
  for (const p of frame.pips) out.push(p.x, p.y, p.r, p.opacity);
  for (const p of frame.paths) out.push(p.opacity);
  for (const g of frame.glyphs) out.push(g.x, g.y, g.size, g.opacity);
  return out;
}

function primitiveCount(frame: HudFrame): number {
  return (
    frame.arcs.length +
    frame.bars.length +
    frame.ticks.length +
    frame.pips.length +
    frame.paths.length +
    frame.glyphs.length
  );
}

/** Every coordinate the frame mentions, as points. */
function pointsOf(frame: HudFrame): [number, number][] {
  const out: [number, number][] = [];
  for (const a of frame.arcs) {
    // An arc's extent, not its centre: the centre is the body.
    out.push([a.x + a.r, a.y], [a.x - a.r, a.y], [a.x, a.y + a.r], [a.x, a.y - a.r]);
  }
  for (const b of frame.bars) out.push([b.x, b.y], [b.x + b.w, b.y + b.h]);
  for (const t of frame.ticks) out.push([t.x1, t.y1], [t.x2, t.y2]);
  for (const p of frame.pips) out.push([p.x, p.y]);
  for (const g of frame.glyphs) out.push([g.x, g.y]);
  return out;
}

describe('HUD spec', () => {
  it('labels every kind in both languages', () => {
    for (const kind of HUD_KINDS) {
      expect(HUD_KIND_LABELS[kind]?.en, kind).toBeTruthy();
      expect(HUD_KIND_LABELS[kind]?.zh, kind).toBeTruthy();
    }
    expect(Object.keys(HUD_KIND_LABELS)).toHaveLength(HUD_KINDS.length);
    expect(new Set(HUD_KINDS).size).toBe(HUD_KINDS.length);
  });

  it('recognises its own kinds and nothing else', () => {
    for (const kind of HUD_KINDS) expect(isHudKind(kind)).toBe(true);
    expect(isHudKind('spinner')).toBe(false);
    expect(isHudKind(null)).toBe(false);
  });

  it('accepts a well-formed spec for every kind', () => {
    for (const kind of HUD_KINDS) {
      expect(isHudSpec(SPECS[kind]), kind).toBe(true);
    }
    // Optional fields really are optional.
    expect(isHudSpec({ kind: 'clock' })).toBe(true);
    expect(isHudSpec({ kind: 'kpi', value: 3 })).toBe(true);
    expect(isHudSpec({ kind: 'notify', count: 0 })).toBe(true);
  });

  it('rejects anything a renderer could not draw', () => {
    for (const bad of [
      null,
      undefined,
      42,
      'progress',
      [],
      {},
      { kind: 'nope' },
      // Required fields missing or the wrong type.
      { kind: 'progress' },
      { kind: 'progress', value: '0.5' },
      { kind: 'progress', value: Number.NaN },
      { kind: 'timer', remainingMs: 10 },
      { kind: 'voice' },
      { kind: 'context', used: 1 },
      { kind: 'gauge', value: 1 },
      { kind: 'notify', count: null },
      { kind: 'sync', state: 'pending' },
      { kind: 'typing' },
      { kind: 'kpi', value: 1, series: [1, 'two'] },
      { kind: 'radar' },
      { kind: 'balance', value: 10, unit: 5 },
    ]) {
      expect(isHudSpec(bad), JSON.stringify(bad) ?? String(bad)).toBe(false);
    }
  });
});

describe('evaluateHud', () => {
  it.each(HUD_KINDS)('%s draws finite primitives inside the viewBox', (kind) => {
    const spec = SPECS[kind]!;
    for (const t of [0, 137, 900, 2500, 7777]) {
      const frame = evaluateHud(spec, t, ctx);
      expect(primitiveCount(frame), `${kind} at ${t}ms draws nothing`).toBeGreaterThan(0);
      for (const n of numbersOf(frame)) expect(Number.isFinite(n), `${kind} at ${t}ms`).toBe(true);
      for (const [x, y] of pointsOf(frame)) {
        expect(x, `${kind} x`).toBeGreaterThanOrEqual(VIEWBOX.minX);
        expect(x, `${kind} x`).toBeLessThanOrEqual(VIEWBOX.minX + VIEWBOX.width);
        expect(y, `${kind} y`).toBeGreaterThanOrEqual(VIEWBOX.minY);
        expect(y, `${kind} y`).toBeLessThanOrEqual(VIEWBOX.minY + VIEWBOX.height);
      }
      for (const arc of frame.arcs) expect(arc.opacity).toBeGreaterThan(0);
      for (const path of frame.paths) expect(path.d.startsWith('M')).toBe(true);
    }
  });

  it.each(HUD_KINDS)('%s is deterministic and unaffected by the clock when motion is off', (kind) => {
    const spec = SPECS[kind]!;
    const a = evaluateHud(spec, 500, ctx);
    const b = evaluateHud(spec, 500, ctx);
    expect(a).toEqual(b);

    const reduced = { ...ctx, reducedMotion: true };
    const early = evaluateHud(spec, 0, reduced);
    const late = evaluateHud(spec, 9_999, reduced);
    expect(primitiveCount(early)).toBeGreaterThan(0);
    // `clock` is the exception: it is told the time as data, so a frozen
    // clock still has to show the hour it was given.
    if (kind === 'clock') expect(late).toEqual(early);
    else expect(late).toEqual(early);
  });

  it('keeps everything clear of the body it sits around', () => {
    for (const kind of HUD_KINDS) {
      const frame = evaluateHud(SPECS[kind]!, 640, ctx);
      for (const [x, y] of pointsOf(frame)) {
        const distance = Math.hypot(x - CENTER, y - CENTER);
        expect(distance, `${kind} overlaps the body`).toBeGreaterThan(ctx.radius - 2);
      }
    }
  });

  it('follows the value it is given', () => {
    const at = (value: number) => evaluateHud({ kind: 'progress', value }, 0, ctx);
    // The filled arc is the second one; the first is the empty track.
    const sweep = (value: number) => {
      const arcs = at(value).arcs;
      return arcs.length > 1 ? arcs[1]!.end - arcs[1]!.start : 0;
    };
    expect(sweep(0)).toBe(0);
    expect(sweep(0.5)).toBeCloseTo(Math.PI * 0.75, 5);
    expect(sweep(1)).toBeCloseTo(Math.PI * 1.5, 5);
    // Out-of-range values are clamped rather than wrapping round twice.
    expect(sweep(4)).toBeCloseTo(Math.PI * 1.5, 5);
    expect(sweep(-1)).toBe(0);
  });

  it('counts context cells as they fill', () => {
    const lit = (used: number) =>
      evaluateHud({ kind: 'context', used, total: 100 }, 0, ctx).pips.filter((p) => p.opacity > 0.5).length;
    expect(lit(0)).toBe(0);
    expect(lit(100)).toBeGreaterThan(lit(50));
    expect(lit(50)).toBeGreaterThan(lit(0));
  });

  it('shows one bar per voice band and grows them with the level', () => {
    const bars = (level: number, bands?: number) =>
      evaluateHud({ kind: 'voice', level, bands }, 0, { ...ctx, reducedMotion: true }).bars;
    expect(bars(0.5, 3)).toHaveLength(3);
    // Silly band counts are clamped, not honoured.
    expect(bars(0.5, 40).length).toBeLessThanOrEqual(9);
    const quiet = bars(0.1).reduce((a, b) => a + b.h, 0);
    const loud = bars(1).reduce((a, b) => a + b.h, 0);
    expect(loud).toBeGreaterThan(quiet);
  });

  it('survives degenerate inputs the wire could carry', () => {
    const specs: HudSpec[] = [
      { kind: 'timer', remainingMs: 0, totalMs: 0 },
      { kind: 'gauge', value: 5, max: 0 },
      { kind: 'context', used: 5, total: 0 },
      { kind: 'kpi', value: 0, series: [] },
      { kind: 'kpi', value: 0, series: [7, 7, 7] },
      { kind: 'balance', value: 0 },
      { kind: 'notify', count: 0 },
      { kind: 'sync', state: 'idle' },
    ];
    for (const spec of specs) {
      const frame = evaluateHud(spec, 1234, ctx);
      for (const n of numbersOf(frame)) expect(Number.isFinite(n), spec.kind).toBe(true);
    }
    // A time that is not a time is treated as zero rather than poisoning
    // every coordinate downstream.
    const nan = evaluateHud({ kind: 'progress', value: 0.5 }, Number.NaN, ctx);
    for (const n of numbersOf(nan)) expect(Number.isFinite(n)).toBe(true);
  });

  it('scales its stroke with the face it belongs to', () => {
    const thin = evaluateHud({ kind: 'progress', value: 0.5 }, 0, { ...ctx, lineWeight: 0.2 });
    const thick = evaluateHud({ kind: 'progress', value: 0.5 }, 0, { ...ctx, lineWeight: 0.5 });
    expect(thick.arcs[0]!.width).toBeGreaterThan(thin.arcs[0]!.width);
  });

  it('prints the same figure formatHud would, and can stay mute on chips', () => {
    const printed = evaluateHud({ kind: 'progress', value: 0.42 }, 0, ctx);
    expect(printed.glyphs[0]?.text).toBe(formatHud({ kind: 'progress', value: 0.42 }).value);
    const chip = evaluateHud({ kind: 'progress', value: 0.42 }, 0, { ...ctx, print: false });
    expect(chip.glyphs).toHaveLength(0);
    expect(chip.arcs.length).toBeGreaterThan(0);
  });
});

describe('formatHud', () => {
  it('prints a figure for every kind', () => {
    for (const kind of HUD_KINDS) {
      const reading = formatHud(SPECS[kind]!);
      expect(reading.value, kind).toBeTruthy();
      expect(['info', 'ok', 'warn', 'alert']).toContain(reading.level);
    }
  });

  it('keeps percents and clocks as the product would print them', () => {
    expect(formatHud({ kind: 'progress', value: 0.42 })).toEqual({ value: '42', unit: '%', level: 'info' });
    expect(formatHud({ kind: 'progress', value: 1 })).toEqual({ value: '100', unit: '%', level: 'ok' });
    expect(formatHud({ kind: 'timer', remainingMs: 9_000, totalMs: 60_000 }).value).toBe('00:09');
    expect(formatHud({ kind: 'clock', date: Date.UTC(2024, 0, 1, 8, 5) }, 0).value).toMatch(/^\d{2}:\d{2}$/);
    expect(formatHud({ kind: 'context', used: 90_000, total: 100_000 })).toMatchObject({
      value: '90k/100k',
      level: 'warn',
    });
    expect(formatHud({ kind: 'sync', state: 'error' }).level).toBe('alert');
  });
});
