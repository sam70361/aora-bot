// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacter as createDefault, mapPointerToGaze } from '../src/render/character.js';
import { LINE_WEIGHT, LINE_WEIGHT_RANGE, resolveLineWeight } from '../src/face/features.js';
import { STATE_SETTLE_TO } from '../src/motion/states.js';
import { getShape } from '../src/shapes/registry.js';
import { ticker } from '../src/ticker.js';

/*
 * Lifecycle smoke tests for the runtime renderer.
 *
 * Fake timers cover `requestAnimationFrame` too, so advancing the clock drives
 * the shared ticker frame by frame with real deltas. That is enough to reach
 * the code paths that only exist over time — blinks, belt entry, pulses —
 * without a browser.
 */

const FRAME_MS = 16;

/** The lifecycle tests were written against the eyes face; the cute face has its own describe at the end. */
const createCharacter: typeof createDefault = (host, options = {}) =>
  createDefault(host, { face: 'eyes', ...options });

function mount() {
  const host = document.createElement('span');
  document.body.appendChild(host);
  return host;
}

function run(ms: number): void {
  vi.advanceTimersByTime(ms);
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
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('createCharacter', () => {
  it('mounts one SVG into the host and removes it on destroy', () => {
    const host = mount();
    const character = createCharacter(host, { shape: 'hex', reducedMotion: true });

    expect(host.children).toHaveLength(1);
    expect(host.firstElementChild).toBe(character.element);
    expect(character.element.getAttribute('viewBox')).toBe('-24 -24 277 277');

    character.destroy();
    expect(host.children).toHaveLength(0);
  });

  it('treats undefined options as defaults', () => {
    const host = mount();
    const character = createCharacter(host, {
      shape: undefined,
      state: undefined,
      variant: undefined,
      seed: undefined,
      reducedMotion: true,
    });

    const body = character.element.querySelector('path');
    expect(body?.getAttribute('d')).toBe(getShape('mochi').path);

    expect(() => character.update({ shape: undefined, state: undefined })).not.toThrow();
    expect(body?.getAttribute('d')).toBe(getShape('mochi').path);
    character.destroy();
  });

  it('repaints a new ink straight away, without waiting for a tick', () => {
    const host = mount();
    const character = createCharacter(host, { shape: 'blob' });
    expect(character.element.querySelector('linearGradient')).toBeNull();

    character.update({ ink: { from: '#112233', to: '#445566' } });
    expect(character.element.querySelector('linearGradient')).not.toBeNull();

    character.destroy();
  });

  it('subscribes to the shared ticker while running and leaves it on destroy', () => {
    expect(ticker.size).toBe(0);
    const a = createCharacter(mount(), { reducedMotion: false });
    const b = createCharacter(mount(), { reducedMotion: false });
    expect(ticker.size).toBe(2);

    a.pause();
    expect(ticker.size).toBe(1);
    a.resume();
    expect(ticker.size).toBe(2);

    a.destroy();
    b.destroy();
    expect(ticker.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('runs frames off requestAnimationFrame and animates the body', () => {
    const character = createCharacter(mount(), { state: 'bouncing', seed: 'frames', reducedMotion: false });
    const group = character.element.querySelector('g > g:nth-of-type(3)');
    expect(group).not.toBeNull();

    const before = group!.getAttribute('transform');
    run(FRAME_MS * 30);
    const after = group!.getAttribute('transform');

    expect(after).not.toBe(before);
    character.destroy();
  });

  it('clears blink timers on destroy', () => {
    const timeouts = vi.spyOn(globalThis, 'setTimeout');
    const character = createCharacter(mount(), { state: 'idle', seed: 'blink', reducedMotion: false });

    // Long enough for at least one blink at the idle interval of 3.4–7.2 s.
    run(8000);

    // The blink sequence is the engine's only use of setTimeout: 70 ms to
    // reopen, then 150 ms to settle. Confirm it ran, so the assertion below is
    // about cleanup and not about nothing having been scheduled.
    const delays = timeouts.mock.calls.map((call) => call[1]);
    expect(delays).toContain(70);
    expect(delays).toContain(150);

    character.destroy();
    // Only what the engine owns is faked, so a clean destroy leaves nothing.
    expect(vi.getTimerCount()).toBe(0);
    expect(() => run(1000)).not.toThrow();
  });

  it('hands the body to a belt when an eyes face enters a belt state', () => {
    const character = createCharacter(mount(), { state: 'idle', face: 'eyes', reducedMotion: false });
    const rings = character.element.querySelector('g > g:nth-of-type(2)')!;
    const dots = character.element.querySelector('g > g:nth-of-type(4)')!;
    expect(rings.childElementCount + dots.childElementCount).toBe(0);

    character.update({ state: 'thinking' });
    run(1500);

    expect(rings.childElementCount + dots.childElementCount).toBeGreaterThan(0);
    character.destroy();
  });

  it('keeps the whole figure on a belt state with the cute face and throws its effect beside it', () => {
    const character = createCharacter(mount(), { state: 'idle', face: 'cute', reducedMotion: false });
    const pieces = () =>
      [...character.element.querySelectorAll('[data-aora-fx]')].reduce(
        (n, layer) => n + layer.childElementCount,
        0,
      );
    expect(pieces()).toBe(0);

    character.update({ state: 'thinking' });
    run(1500);

    expect(pieces()).toBe(3);
    character.destroy();
  });

  it('gives same-seed characters distinct clip ids and a source id when asked', () => {
    const a = createCharacter(mount(), { seed: 'twin', sourceId: 'src-a', reducedMotion: true });
    const b = createCharacter(mount(), { seed: 'twin', reducedMotion: true });

    const clipA = a.element.querySelector('clipPath')!.id;
    const clipB = b.element.querySelector('clipPath')!.id;
    expect(clipA).toMatch(/^aora-clip-/);
    expect(clipA).not.toBe(clipB);

    expect(a.element.querySelector('g')!.id).toBe('src-a');
    expect(b.element.querySelector('g')!.id).toBe('');

    a.destroy();
    b.destroy();
  });

  // The confetti layer is the last group under the root.
  const confettiOf = (el: Element) => el.querySelector('g > g:last-of-type')!;

  it('plays an entry effect on a state transition but not on mount', () => {
    const mounted = createCharacter(mount(), { state: 'celebrate', seed: 'fx', reducedMotion: false });
    run(FRAME_MS * 3);
    expect(confettiOf(mounted.element).childElementCount).toBe(0);
    mounted.destroy();

    const transitioned = createCharacter(mount(), { state: 'idle', seed: 'fx', reducedMotion: false });
    transitioned.update({ state: 'celebrate' });
    run(FRAME_MS * 3);
    expect(confettiOf(transitioned.element).childElementCount).toBeGreaterThan(0);
    transitioned.destroy();
  });

  it('respects entryEffects: false', () => {
    const character = createCharacter(mount(), {
      state: 'idle',
      seed: 'fx',
      reducedMotion: false,
      entryEffects: false,
    });
    character.update({ state: 'celebrate' });
    run(FRAME_MS * 3);
    expect(confettiOf(character.element).childElementCount).toBe(0);
    character.destroy();
  });

  it('holds the loop while the page is hidden when autoPause is on', () => {
    let visibility: DocumentVisibilityState = 'visible';
    const original = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });

    try {
      const character = createCharacter(mount(), { reducedMotion: false, autoPause: true });
      expect(ticker.size).toBe(1);

      visibility = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
      expect(ticker.size).toBe(0);
      expect(character.paused).toBe(false);

      visibility = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
      expect(ticker.size).toBe(1);

      // A host pause survives the page being hidden and shown again.
      character.pause();
      visibility = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
      visibility = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
      expect(ticker.size).toBe(0);
      expect(character.paused).toBe(true);

      character.destroy();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      // @ts-expect-error restoring the instance override
      delete document.visibilityState;
      if (original) Object.defineProperty(Document.prototype, 'visibilityState', original);
    }
  });

  describe('line face', () => {
    // Eyes live in the clipped group; the nose and mouth are appended after
    // the two eye paths when line mode is first requested.
    const featuresOf = (el: Element) => Array.from(el.querySelectorAll('g[clip-path] > path')).slice(2);

    it('adds no nodes for the default face', () => {
      const character = createCharacter(mount(), { reducedMotion: true });
      expect(featuresOf(character.element)).toHaveLength(0);
      character.destroy();
    });

    it('draws a stroked nose and mouth in line mode', () => {
      const character = createCharacter(mount(), {
        face: 'line',
        nose: 'hook',
        state: 'happy',
        reducedMotion: true,
      });
      const [nose, mouth] = featuresOf(character.element);
      expect(nose?.getAttribute('fill')).toBe('none');
      expect(nose?.getAttribute('d')?.startsWith('M')).toBe(true);
      expect(nose?.getAttribute('d')?.endsWith('Z')).toBe(false);
      expect(mouth?.getAttribute('d')?.endsWith('Z')).toBe(true);
      expect(Number(nose?.getAttribute('stroke-width'))).toBeGreaterThan(0);
      expect(Number(mouth?.getAttribute('opacity'))).toBeCloseTo(1, 3);
      character.destroy();
    });

    it('a null nose leaves the nose hidden but keeps the mouth', () => {
      const character = createCharacter(mount(), { face: 'line', nose: null, reducedMotion: true });
      const [nose, mouth] = featuresOf(character.element);
      expect(Number(nose?.getAttribute('opacity'))).toBe(0);
      expect(Number(mouth?.getAttribute('opacity'))).toBeCloseTo(1, 3);
      character.destroy();
    });

    it('eases into line mode on a live face switch', () => {
      const character = createCharacter(mount(), { state: 'idle', seed: 'face', reducedMotion: false });
      run(FRAME_MS * 2);
      expect(featuresOf(character.element)).toHaveLength(0);

      character.update({ face: 'line' });
      run(FRAME_MS * 3);
      const [, mouth] = featuresOf(character.element);
      expect(mouth).toBeDefined();
      const early = Number(mouth!.getAttribute('opacity'));
      expect(early).toBeGreaterThan(0);
      expect(early).toBeLessThan(1);

      run(2000);
      expect(Number(mouth!.getAttribute('opacity'))).toBeCloseTo(1, 2);

      character.update({ face: 'eyes' });
      run(2000);
      expect(Number(mouth!.getAttribute('opacity'))).toBeLessThan(0.01);
      character.destroy();
    });

    it('morphs the mouth between states and pulses it while talking', () => {
      const character = createCharacter(mount(), {
        face: 'line',
        nose: null,
        state: 'idle',
        reducedMotion: false,
      });
      run(FRAME_MS * 2);
      const [, mouth] = featuresOf(character.element);
      const resting = mouth!.getAttribute('d');

      character.update({ state: 'happy' });
      run(FRAME_MS * 2);
      const midway = mouth!.getAttribute('d');
      run(2000);
      const settled = mouth!.getAttribute('d');
      expect(midway).not.toBe(resting);
      expect(settled).not.toBe(midway);

      // `composing` talks without handing the body to a belt, so the face
      // stays visible while the mouth pulses.
      character.update({ state: 'composing' });
      run(2000);
      const a = mouth!.getAttribute('d');
      run(FRAME_MS * 6);
      const b = mouth!.getAttribute('d');
      expect(a).not.toBe(b);
      character.destroy();
    });

    it('crossfades the nose when it changes', () => {
      const character = createCharacter(mount(), { face: 'line', nose: 'slant', reducedMotion: false });
      run(FRAME_MS * 2);
      const [nose] = featuresOf(character.element);
      const before = nose!.getAttribute('d');

      character.update({ nose: 'bow' });
      run(FRAME_MS * 2);
      expect(Number(nose!.getAttribute('opacity'))).toBeLessThan(0.5);
      run(2000);
      expect(Number(nose!.getAttribute('opacity'))).toBeCloseTo(1, 2);
      expect(nose!.getAttribute('d')).not.toBe(before);
      character.destroy();
    });

    it('strokes the features in the ink for outline and glass variants, a step towards the page contrast', () => {
      const outline = createCharacter(mount(), { face: 'line', variant: 'outline', reducedMotion: true });
      const [nose] = featuresOf(outline.element);
      expect(nose?.getAttribute('stroke')).toBe(
        'color-mix(in oklab, var(--aora-fg, currentColor), light-dark(#000, #fff) 22%)',
      );
      outline.destroy();

      const solid = createCharacter(mount(), { face: 'line', variant: 'solid', reducedMotion: true });
      const [mouth] = featuresOf(solid.element).slice(1);
      expect(mouth?.getAttribute('stroke')).toBe('var(--aora-bg, var(--aora-bg-base, #fcfcfc))');
      solid.destroy();
    });
  });

  describe('finite states', () => {
    it('settles a spawning character into idle and says so', () => {
      const onSettle = vi.fn();
      const character = createCharacter(mount(), { state: 'spawning', seed: 'settle', onSettle });
      const after = STATE_SETTLE_TO.spawning!.afterMs;

      run(after - 200);
      expect(onSettle).not.toHaveBeenCalled();

      run(400);
      expect(onSettle).toHaveBeenCalledTimes(1);
      expect(onSettle).toHaveBeenCalledWith('spawning', 'idle');

      // Idle has nowhere to settle to, so the clock stops there.
      run(5000);
      expect(onSettle).toHaveBeenCalledTimes(1);
      character.destroy();
    });

    it('restarts the clock on an explicit state change', () => {
      const onSettle = vi.fn();
      const character = createCharacter(mount(), { state: 'idle', seed: 'settle', onSettle });
      character.update({ state: 'waking' });

      const after = STATE_SETTLE_TO.waking!.afterMs;
      run(after - 200);
      character.update({ state: 'waking' });
      // The same state again is not a change, so the clock keeps running.
      run(400);
      expect(onSettle).toHaveBeenCalledWith('waking', 'idle');

      onSettle.mockClear();
      character.update({ state: 'waking' });
      run(after - 200);
      character.update({ state: 'thinking' });
      run(1000);
      expect(onSettle).not.toHaveBeenCalled();
      character.destroy();
    });

    it('passes the moment immediately under reduced motion', () => {
      const onSettle = vi.fn();
      const character = createCharacter(mount(), { state: 'spawning', reducedMotion: true, onSettle });
      expect(onSettle).toHaveBeenCalledWith('spawning', 'idle');
      character.destroy();
    });
  });

  describe('HUD', () => {
    const hudOf = (el: Element) => el.querySelector('g[data-aora-hud]')!;
    const countOf = (el: Element) =>
      Array.from(hudOf(el).children).reduce((n, g) => n + g.childElementCount, 0);

    it('draws nothing until a spec arrives, then fades one in', () => {
      const character = createCharacter(mount(), { state: 'idle', seed: 'hud' });
      expect(hudOf(character.element)).not.toBeNull();
      expect(countOf(character.element)).toBe(0);

      character.update({ hud: { kind: 'progress', value: 0.5 } });
      run(FRAME_MS * 2);
      const early = Number(hudOf(character.element).getAttribute('opacity'));
      expect(countOf(character.element)).toBeGreaterThan(0);
      expect(early).toBeGreaterThan(0);
      expect(early).toBeLessThan(1);

      run(2000);
      expect(Number(hudOf(character.element).getAttribute('opacity'))).toBeCloseTo(1, 2);

      character.update({ hud: null });
      run(2000);
      expect(Number(hudOf(character.element).getAttribute('opacity'))).toBeLessThan(0.01);
      expect(countOf(character.element)).toBe(0);
      character.destroy();
    });

    it('pools its nodes rather than rebuilding them', () => {
      const character = createCharacter(mount(), { hud: { kind: 'progress', value: 0.4 }, seed: 'hud' });
      run(FRAME_MS * 4);
      const first = Array.from(hudOf(character.element).children).flatMap((g) => Array.from(g.children));
      run(FRAME_MS * 20);
      const second = Array.from(hudOf(character.element).children).flatMap((g) => Array.from(g.children));
      expect(second.length).toBeGreaterThan(0);
      expect(second[0]).toBe(first[0]);
      character.destroy();
    });

    it('keeps the body and hides the face — the ring is the reading', () => {
      const character = createCharacter(mount(), {
        state: 'thinking',
        hud: { kind: 'timer', remainingMs: 5000, totalMs: 20_000 },
        seed: 'hud',
      });
      run(1500);
      const face = character.element.querySelector('[data-aora-face]')!;
      expect(Number(face.getAttribute('opacity'))).toBeLessThan(0.05);
      const dots = character.element.querySelector('g > g:nth-of-type(4)');
      expect(dots?.childElementCount ?? 0).toBe(0);
      expect(countOf(character.element)).toBeGreaterThan(0);
      character.destroy();
    });
  });

  it('overrides the body paint with a flat colour or a gradient', () => {
    // The clip path holds a copy of the outline, so the body is the one
    // inside the third group rather than the first path in the document.
    const bodyOf = (el: Element) => el.querySelector('g > g:nth-of-type(3) > path')!;

    const flat = createCharacter(mount(), { ink: { flat: '#123456' }, reducedMotion: true });
    expect(bodyOf(flat.element).getAttribute('fill')).toBe('#123456');
    flat.destroy();

    const gradient = createCharacter(mount(), {
      ink: { from: '#111', to: '#eee', angle: 90 },
      reducedMotion: true,
    });
    const def = gradient.element.querySelector('linearGradient')!;
    expect(def).not.toBeNull();
    expect(bodyOf(gradient.element).getAttribute('fill')).toBe(`url(#${def.id})`);
    expect(def.querySelectorAll('stop')).toHaveLength(2);
    expect(def.querySelector('stop')?.getAttribute('stop-color')).toBe('#111');

    // The outlined variants draw the ink as a stroke, over a faint wash of the same ink.
    gradient.update({ variant: 'outline' });
    expect(bodyOf(gradient.element).getAttribute('fill')).toBe(`url(#${def.id})`);
    expect(Number(bodyOf(gradient.element).getAttribute('fill-opacity'))).toBeCloseTo(0.08, 2);
    expect(bodyOf(gradient.element).getAttribute('stroke')).toBe(`url(#${def.id})`);

    gradient.update({ ink: null });
    expect(bodyOf(gradient.element).getAttribute('stroke')).toBe('var(--aora-fg, currentColor)');
    gradient.destroy();
  });

  it('clamps the line weight and applies it to the face', () => {
    const weight = (multiplier?: number) => {
      const character = createCharacter(mount(), {
        face: 'line',
        nose: null,
        lineWeight: multiplier,
        reducedMotion: true,
      });
      const mouth = Array.from(character.element.querySelectorAll('g[clip-path] > path'))[3]!;
      const value = Number(mouth.getAttribute('stroke-width'));
      character.destroy();
      return value;
    };

    const base = weight();
    expect(weight(1.25)).toBeGreaterThan(base);
    expect(weight(0.8)).toBeLessThan(base);
    // Out of range in either direction is clamped to the ends of it.
    expect(weight(9)).toBeCloseTo(weight(LINE_WEIGHT_RANGE[1]), 5);
    expect(weight(0.01)).toBeCloseTo(weight(LINE_WEIGHT_RANGE[0]), 5);
    expect(weight(Number.NaN)).toBeCloseTo(base, 5);
    expect(resolveLineWeight(2)).toBe(LINE_WEIGHT * LINE_WEIGHT_RANGE[1]);
    expect(resolveLineWeight()).toBe(LINE_WEIGHT);
  });

  it('follows a point given in viewport pixels', () => {
    const character = createCharacter(mount(), { state: 'idle', seed: 'follow' });
    const rect = { left: 100, top: 100, width: 200, height: 200 };
    vi.spyOn(character.element, 'getBoundingClientRect').mockReturnValue(rect as DOMRect);

    const eye = () => character.element.querySelector('g[clip-path] > path')!.getAttribute('transform');

    character.update({ followTarget: { x: 100, y: 200 } });
    run(1200);
    const left = eye();

    character.update({ followTarget: { x: 300, y: 200 } });
    run(1200);
    expect(eye()).not.toBe(left);

    // An explicit target wins, and both of them beat idle drift.
    expect(mapPointerToGaze({ clientX: 300, clientY: 200 }, rect).x).toBeGreaterThan(0);
    expect(mapPointerToGaze({ clientX: 100, clientY: 200 }, rect).x).toBeLessThan(0);
    character.destroy();
  });

  it('keeps the eyes inside the body while a target is held', () => {
    // A held pointer is applied every frame. Adding it to the spring target
    // instead of setting it integrated the offset until the eyes left the
    // silhouette — this pins the eye centre to the face box over a long hold.
    const character = createCharacter(mount(), { shape: 'mochi', state: 'idle', seed: 'hold' });
    const shape = getShape('mochi');
    const eyeCentreY = () => {
      const t = character.element.querySelector('g[clip-path] > path')!.getAttribute('transform')!;
      // `translate(px py) matrix(…) translate(-cx -cy)`: the last pair is the
      // unprojected eye centre in shape space.
      const m = t.match(/translate\((-?[\d.]+) (-?[\d.]+)\)$/)!;
      return -Number(m[2]);
    };

    character.update({ gazeTarget: { x: 0.6, y: 0.6 } });
    run(6000);
    const held = eyeCentreY();
    expect(held).toBeGreaterThan(shape.top);
    expect(held).toBeLessThan(shape.bottom);

    // Twice as long again must not move it further: the offset is bounded.
    run(12000);
    expect(Math.abs(eyeCentreY() - held)).toBeLessThan(shape.bottom - shape.top);
    expect(eyeCentreY()).toBeLessThan(shape.bottom);
    character.destroy();
  });

  it('scales the eyes by a static multiplier', () => {
    const radius = (eyeScale?: number) => {
      const character = createCharacter(mount(), { eyeScale, reducedMotion: true });
      const d = character.element.querySelector('g[clip-path] > path')!.getAttribute('d')!;
      const spread = Math.max(...(d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number));
      character.destroy();
      return spread;
    };
    expect(radius(1.4)).toBeGreaterThan(radius());
    expect(radius(0.7)).toBeLessThan(radius());
    // Absurd values are clamped rather than filling the body.
    expect(radius(50)).toBeCloseTo(radius(2), 5);
  });

  it('draws a single frame and never subscribes under reduced motion', () => {
    const character = createCharacter(mount(), { state: 'excited', reducedMotion: true });
    expect(ticker.size).toBe(0);
    expect(character.element.querySelector('path')?.getAttribute('d')).toBeTruthy();

    character.spin();
    character.bounce();
    character.burst();
    expect(ticker.size).toBe(0);
    character.destroy();
  });
});

describe('createCharacter with the cute face', () => {
  const faceNodes = (el: Element) => Array.from(el.querySelectorAll('[data-aora-face] > path'));
  const fxNodes = (el: Element) => Array.from(el.querySelectorAll('[data-aora-fx] > *'));

  it('is the default: eyes, mouth and cheeks on the body', () => {
    const cute = createDefault(mount(), { state: 'happy', reducedMotion: true });
    expect(faceNodes(cute.element).length).toBeGreaterThanOrEqual(5);
    const eyes = createDefault(mount(), { state: 'happy', face: 'eyes', reducedMotion: true });
    expect(faceNodes(eyes.element)).toHaveLength(2);
    cute.destroy();
    eyes.destroy();
  });

  it('throws off the effect of the mood, and nothing for a mood without one', () => {
    const sleeper = createDefault(mount(), { state: 'sleeping', reducedMotion: true });
    expect(fxNodes(sleeper.element).length).toBeGreaterThan(0);
    const idle = createDefault(mount(), { state: 'idle', reducedMotion: true });
    expect(fxNodes(idle.element)).toHaveLength(0);
    const eyes = createDefault(mount(), { state: 'sleeping', face: 'eyes', reducedMotion: true });
    expect(fxNodes(eyes.element)).toHaveLength(0);
    sleeper.destroy();
    idle.destroy();
    eyes.destroy();
  });

  it('eases out to the eyes face on a live switch and back again', () => {
    const character = createDefault(mount(), { state: 'happy', seed: 'switch', reducedMotion: false });
    run(FRAME_MS * 4);
    character.update({ face: 'eyes' });
    run(2000);
    expect(faceNodes(character.element)).toHaveLength(2);
    character.update({ face: 'cute' });
    run(2000);
    expect(faceNodes(character.element).length).toBeGreaterThanOrEqual(5);
    character.destroy();
  });
});
