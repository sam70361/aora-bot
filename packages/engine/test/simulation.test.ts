// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSimulation, type SimulationOptions } from '../src/sim/simulation.js';
import { CHARACTER_STATES } from '../src/motion/states.js';
import { SHAPE_IDS } from '../src/core/types.js';
import { STATE_BELT } from '../src/motion/belts.js';
import { getShape } from '../src/shapes/registry.js';

/*
 * This file runs in a Node environment on purpose: the simulation must not
 * need a DOM, and a stray `document` or `window` read would throw here.
 */

function run(options: SimulationOptions, frames = 90) {
  const sim = createSimulation(options);
  for (let i = 0; i < frames; i++) sim.step(1 / 60);
  const frame = sim.snapshot();
  sim.dispose();
  return frame;
}

describe('createSimulation', () => {
  it('has no DOM to read', () => {
    expect(typeof document).toBe('undefined');
    expect(() => run({ shape: 'tofu', state: 'thinking' })).not.toThrow();
  });

  it('is a pure function of its options: same seed, same frames', () => {
    const options: SimulationOptions = { shape: 'clover', state: 'thinking', seed: 'repeat', antics: true };
    expect(JSON.stringify(run(options, 240))).toBe(JSON.stringify(run(options, 240)));
  });

  it('differs between seeds once something random has had time to happen', () => {
    const a = run({ shape: 'blob', seed: 'a', antics: true }, 900);
    const b = run({ shape: 'blob', seed: 'b', antics: true }, 900);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('keeps blink phases on its own clock unless a scheduler is supplied', () => {
    const sim = createSimulation({ seed: 'blink' });
    for (let i = 0; i < 60 * 30; i++) sim.step(1 / 60);
    expect(() => sim.snapshot()).not.toThrow();
    sim.dispose();
  });

  it('draws the same still frame however long it has been running', () => {
    const still = { beltTime: 0.5 };
    const early = createSimulation({ shape: 'pebble', state: 'idle', reducedMotion: true, still });
    early.settle();
    const late = createSimulation({ shape: 'pebble', state: 'idle', reducedMotion: true, still });
    for (let i = 0; i < 600; i++) late.step(1 / 60);
    late.settle();
    // The clock is the one field that is allowed to know how long it has run.
    expect({ ...late.snapshot(), time: 0 }).toEqual({ ...early.snapshot(), time: 0 });
    early.dispose();
    late.dispose();
  });

  it('snapshots every shape in every state as plain, finite numbers', () => {
    for (const shape of SHAPE_IDS) {
      for (const state of CHARACTER_STATES) {
        const frame = run({ shape, state, reducedMotion: true, still: true }, 1);
        const bad = JSON.stringify(frame, (_, v: unknown) =>
          typeof v === 'number' && !Number.isFinite(v) ? '__nonfinite__' : v,
        ).includes('__nonfinite__');
        expect(bad, `${shape}/${state}`).toBe(false);
      }
    }
  }, 20_000);

  it('spins about the vertical axis: the body stays upright and the face goes round and back', () => {
    const options: SimulationOptions = { shape: 'mochi', state: 'idle', seed: 'turn', reducedMotion: false };
    const sim = createSimulation(options);
    const still = createSimulation(options);
    sim.spin(1);
    let maxRotation = 0;
    let hidden = false;
    for (let i = 0; i < 60 * 4; i++) {
      sim.step(1 / 60);
      still.step(1 / 60);
      const frame = sim.snapshot();
      maxRotation = Math.max(maxRotation, Math.abs(frame.body.rotation));
      if (frame.face.geometry && !frame.face.geometry.left.visible) hidden = true;
    }
    const after = sim.snapshot().face.geometry!.left;
    const unturned = still.snapshot().face.geometry!.left;
    sim.dispose();
    still.dispose();
    // The idle sway is a few degrees; a spin that rolled the body would pass through 180.
    expect(maxRotation).toBeLessThan(10);
    expect(hidden).toBe(true);
    expect(after.visible).toBe(true);
    // The ribbons draw on the random stream the gaze uses, so the two runs glance a little differently;
    // a face left a tenth of a turn round would be some thirty units off.
    expect(Math.abs(after.transform.x - unturned.transform.x)).toBeLessThan(4);
  });

  it('reports the state it was asked for and fires onSettle for a finite one', () => {
    const settled: string[] = [];
    const sim = createSimulation({ state: 'spawning', seed: 's', onSettle: () => settled.push('settled') });
    expect(sim.state).toBe('spawning');
    for (let i = 0; i < 60 * 20 && settled.length === 0; i++) sim.step(1 / 60);
    expect(settled).toHaveLength(1);
    sim.dispose();
  });
});

/** The belt states: with the cute face they keep the whole body rather than shrinking it to a bead. */
const BELT_STATES = Object.keys(STATE_BELT) as (keyof typeof STATE_BELT)[];

describe('belt states on the cute face', () => {
  const SHAPES = ['mochi', 'cat', 'bunny', 'tofu'] as const;

  it('names the sixteen states that carry a belt', () => {
    expect(BELT_STATES).toHaveLength(16);
  });

  it('keeps the full body and its face, with no belt overlay', () => {
    for (const shape of SHAPES) {
      for (const state of BELT_STATES) {
        const frame = run({ shape, state, seed: 'belt' }, 120);
        const label = `/`;
        expect(frame.belt, label).toBeNull();
        expect(frame.body.outline, label).toBe(getShape(shape).outline);
        expect(frame.face.opacity, label).toBeGreaterThan(0.99);
        expect(frame.face.geometry, label).not.toBeNull();
        expect(frame.body.parts.length, label).toBe(getShape(shape).parts.length);
      }
    }
  });

  it('shows what the belt said as an effect, for every state but the two that move or dim the body', () => {
    for (const state of BELT_STATES) {
      const frame = run({ shape: 'mochi', state, seed: 'belt' }, 120);
      if (state === 'powering-down' || state === 'bouncing') {
        expect(frame.fx, state).toBeNull();
      } else {
        expect(frame.fx?.items.length, state).toBeGreaterThan(0);
      }
    }
  });

  it('dims the body to power down and hops it to bounce', () => {
    expect(run({ state: 'powering-down', seed: 'belt' }, 120).body.coreOpacity ?? 1).toBeLessThan(0.95);

    const sim = createSimulation({ state: 'bouncing', seed: 'belt' });
    let highest = 0;
    for (let i = 0; i < 240; i++) {
      sim.step(1 / 60);
      highest = Math.max(highest, -sim.snapshot().body.y);
    }
    sim.dispose();
    expect(highest).toBeGreaterThan(10);
  });

  it('still hands the body to a belt on the older faces', () => {
    for (const face of ['eyes', 'line'] as const) {
      const frame = run({ state: 'thinking', face, seed: 'belt' }, 120);
      expect(frame.belt, face).not.toBeNull();
      expect(frame.face.opacity, face).toBe(0);
      expect(frame.fx, face).toBeNull();
    }
  });

  it('keeps the readout of a HUD in place of the effect', () => {
    const frame = run({ state: 'progress', hud: { kind: 'progress', value: 0.4 }, seed: 'belt' }, 120);
    expect(frame.fx).toBeNull();
    expect(frame.hud.primitives).not.toBeNull();
  });
});
