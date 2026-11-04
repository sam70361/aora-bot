// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConfettiController } from '../src/effects/confetti-controller.js';
import { ticker } from '../src/ticker.js';

/*
 * The controller is the particle system without a character, so what is worth
 * testing is the housekeeping: that it draws into the SVG it was given, that
 * it lets the shared ticker go quiet once there is nothing left on screen, and
 * that destroying it leaves nothing behind.
 */

const FRAME_MS = 16;
const SVG_NS = 'http://www.w3.org/2000/svg';

function stage(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  document.body.appendChild(svg);
  return svg;
}

const nodeCount = (svg: SVGSVGElement): number =>
  Array.from(svg.querySelectorAll('g > g')).reduce((n, g) => n + g.childElementCount, 0);

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('createConfettiController', () => {
  it('adds one hidden layer and takes it away again', () => {
    const svg = stage();
    const confetti = createConfettiController(svg);

    expect(svg.childElementCount).toBe(1);
    expect(svg.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    expect(ticker.size).toBe(0);

    confetti.destroy();
    expect(svg.childElementCount).toBe(0);
    expect(ticker.size).toBe(0);
  });

  it('throws paper on burst and stops once it has landed', () => {
    const svg = stage();
    const confetti = createConfettiController(svg);

    confetti.burst(12);
    expect(ticker.size).toBe(1);
    vi.advanceTimersByTime(FRAME_MS * 4);
    expect(nodeCount(svg)).toBeGreaterThan(0);

    // Every piece has a finite life, so the loop ends by itself.
    vi.advanceTimersByTime(6000);
    expect(ticker.size).toBe(0);
    confetti.destroy();
  });

  it('draws a trail for a spin and winds it down', () => {
    const svg = stage();
    const confetti = createConfettiController(svg);

    confetti.spin();
    vi.advanceTimersByTime(FRAME_MS * 6);
    const paths = svg.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
    expect(Array.from(paths).some((p) => (p.getAttribute('d') ?? '').startsWith('M'))).toBe(true);

    vi.advanceTimersByTime(6000);
    expect(ticker.size).toBe(0);
    confetti.destroy();
  });

  it('keeps going while sustained and stops when switched off', () => {
    const svg = stage();
    const confetti = createConfettiController(svg);

    confetti.setSustained(true);
    vi.advanceTimersByTime(2000);
    expect(ticker.size).toBe(1);

    confetti.setSustained(false);
    vi.advanceTimersByTime(6000);
    expect(ticker.size).toBe(0);
    confetti.destroy();
  });

  it('uses the palette it is given and clears on demand', () => {
    const svg = stage();
    const confetti = createConfettiController(svg, { colors: ['#abcdef'], sizeScale: 0.5 });

    confetti.burst(8);
    vi.advanceTimersByTime(FRAME_MS * 2);
    const fills = new Set(Array.from(svg.querySelectorAll('rect')).map((r) => r.getAttribute('fill')));
    expect(fills).toEqual(new Set(['#abcdef']));

    confetti.clear();
    expect(nodeCount(svg)).toBe(0);
    confetti.destroy();
  });

  it('ignores everything after destroy', () => {
    const svg = stage();
    const confetti = createConfettiController(svg);
    confetti.destroy();

    expect(() => {
      confetti.burst();
      confetti.spin();
      confetti.setSustained(true);
      confetti.clear();
      confetti.destroy();
    }).not.toThrow();
    expect(ticker.size).toBe(0);
    expect(svg.childElementCount).toBe(0);
  });
});
