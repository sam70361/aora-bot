/**
 * Confetti and spin ribbons without a character.
 *
 * The particle system already knows how to throw paper and drag comets; the
 * only thing tying it to a body was the renderer that painted it. This is
 * that renderer on its own, so a host can celebrate a form submission, a
 * finished upload or an onboarding step with the same paper the characters
 * use, and the two never look like they came from different kits.
 *
 * No React, no per-instance loop: it draws into an SVG the caller already
 * has and rides the same shared ticker as everything else.
 */
import { createParticleSystem, SPIN_REST } from '../particles.js';
import { createSvgElement, syncChildren } from '../render/dom.js';
import { paperNodes, trailNodes } from '../render/vector/particles.js';
import type { ParticleFrame } from '../sim/snapshot.js';
import { particleFrames, trailFrames } from '../sim/particle-frames.js';
import { ticker } from '../ticker.js';

export interface ConfettiControllerOptions {
  /** Emission radius, in shape units. Defaults to the particle system's own. */
  radius?: number;
  /** Multiplier on every piece, for small stages. */
  sizeScale?: number;
  /** Override the paper colours. */
  colors?: readonly string[];
}

export interface ConfettiController {
  /** Throw `count` pieces of paper. */
  burst(count?: number): void;
  /** Fling ribbons as though a body had spun. */
  spin(): void;
  /** Keep two slow ribbons circling until switched off. */
  setSustained(on: boolean): void;
  /** Remove everything on screen immediately. */
  clear(): void;
  /** Stop, unsubscribe and remove the layer. */
  destroy(): void;
}

/** How fast a `spin()` starts, and how quickly it runs down, in rad/s. */
const SPIN_VELOCITY = 11;
const SPIN_DECAY = 2.2;

export function createConfettiController(
  svg: SVGSVGElement,
  options: ConfettiControllerOptions = {},
): ConfettiController {
  const particles = createParticleSystem({ radius: options.radius, sizeScale: options.sizeScale });
  const sizeScale = options.sizeScale ?? 1;
  const colors = options.colors;

  const layer = createSvgElement('g');
  layer.setAttribute('aria-hidden', 'true');
  const trailsBack = createSvgElement('g');
  const paper = createSvgElement('g');
  const trailsFront = createSvgElement('g');
  layer.append(trailsBack, paper, trailsFront);
  svg.appendChild(layer);

  let unsubscribe: (() => void) | null = null;
  let spinVelocity = 0;
  let sustained = false;
  let destroyed = false;

  function start(): void {
    if (unsubscribe || destroyed) return;
    unsubscribe = ticker.add((dt) => frame(dt));
  }

  function stop(): void {
    unsubscribe?.();
    unsubscribe = null;
  }

  function frame(dt: number): void {
    // Exponential run-down rather than a fixed duration: the trail thins out
    // as the notional body slows, which is what makes a spin read as one
    // gesture instead of an animation that was switched off.
    if (spinVelocity > 0) {
      spinVelocity *= Math.exp(-SPIN_DECAY * dt);
      // Below this the ribbons treat the body as still, so the sweep ends by itself.
      if (spinVelocity < SPIN_REST) spinVelocity = 0;
    }

    particles.update(dt, {
      spinVelocity,
      sizeScale,
      wide: false,
      sustain: sustained,
    });

    paint();

    // Nothing to draw and nothing that will start drawing: let the shared
    // ticker go quiet rather than burning a frame on an empty layer.
    if (!particles.active && spinVelocity === 0 && !sustained) stop();
  }

  function paint(): void {
    const paperFrames = particleFrames(particles.particles);
    const comets = trailFrames(particles.trails);
    syncChildren(paper, paperNodes(recolor(paperFrames)));
    syncChildren(trailsBack, trailNodes(comets, 'back', sizeScale));
    syncChildren(trailsFront, trailNodes(comets, 'front', sizeScale));
  }

  /** Honour a caller's palette without teaching the particle system about it. */
  function recolor(frames: readonly ParticleFrame[]): readonly ParticleFrame[] {
    if (!colors || colors.length === 0) return frames;
    return frames.map((p, i) => ({ ...p, color: colors[i % colors.length]! }));
  }

  return {
    burst(count = 16) {
      if (destroyed) return;
      particles.burst(count);
      start();
    },

    spin() {
      if (destroyed) return;
      spinVelocity = SPIN_VELOCITY;
      start();
    },

    setSustained(on) {
      if (destroyed) return;
      sustained = on;
      if (on) start();
    },

    clear() {
      particles.clear();
      spinVelocity = 0;
      paint();
      if (!sustained) stop();
    },

    destroy() {
      destroyed = true;
      sustained = false;
      stop();
      particles.clear();
      layer.remove();
    },
  };
}
