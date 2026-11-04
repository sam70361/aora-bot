import { autoPause as createAutoPause, type AutoPauseHandle } from '../auto-pause.js';
import type { CharacterOptions, CharacterVariant, InkPaint } from '../core/options.js';
import { clamp } from '../math/easing.js';
import { createSimulation, type Gaze, type Scheduler } from '../sim/simulation.js';
import { DEFAULT_STYLE_ID, getStyle, resolveStyleOptions } from '../styles/index.js';
import { prefersReducedMotion, ticker } from '../ticker.js';
import type { LiveRenderer } from './renderer.js';

export type { CharacterOptions, CharacterVariant, InkPaint };

export interface CharacterController {
  update(options: Partial<CharacterOptions>): void;
  /** Spin the body `turns` full revolutions. */
  spin(turns?: number): void;
  /** Hop. `strength` scales the height; 1 is the full four-arc bounce. */
  bounce(strength?: number): void;
  /** Throw confetti. */
  burst(count?: number): void;
  /** Force one frame to render — used for static/reduced-motion output. */
  renderOnce(): void;
  /**
   * Jump every spring to its target and repaint. Anything mid-flight — a
   * face-style crossfade, a nose swap, an eye morph — lands immediately. Use
   * before reading `element` for export so the markup shows the settled
   * character rather than a frame of the transition.
   */
  settle(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  readonly element: SVGSVGElement;
  readonly paused: boolean;
}

/**
 * Blink phases on wall time. They are the one thing here not driven by the
 * ticker, so they are the one thing that can fire after `destroy()` — into
 * springs nobody reads, but also into a closure the GC could otherwise have
 * collected. Track them so they can be cancelled.
 */
function timeoutScheduler(): Scheduler {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  return {
    later(fn, ms) {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    },
    cancelAll() {
      for (const id of timers) clearTimeout(id);
      timers.clear();
    },
  };
}

/**
 * Build and drive one character.
 *
 * This is the assembly: a simulation that decides what the character is
 * doing, the renderer of the chosen style series that draws it, and the
 * shared ticker that steps one and calls the other. Nothing else lives here.
 */
export function createCharacter(host: Element, options: CharacterOptions = {}): CharacterController {
  const reduced = options.reducedMotion ?? prefersReducedMotion();
  const seed = options.seed ?? 'aora';

  let style = getStyle(options.style ?? DEFAULT_STYLE_ID);
  let styleId = style.id;
  /** The caller's own parameters, kept raw so a series switch can resolve them against the new series. */
  let styleOptions = options.styleOptions;
  let variant = options.variant ?? style.defaultVariant;

  const mountRenderer = (): LiveRenderer =>
    style.createRenderer(host, {
      seed,
      sourceId: options.sourceId,
      styleOptions: resolveStyleOptions(style, styleOptions),
    });
  let renderer: LiveRenderer = mountRenderer();

  let paused = options.paused ?? false;
  let followTarget = options.followTarget;

  /*
   * A bounding box is a layout read, and this is called once per frame per
   * character; a page of twenty would be twenty forced reflows. The box only
   * changes on scroll or resize, so caching it for a fraction of a second
   * costs a few pixels of lag on a target that is itself moving.
   */
  let followRect: DOMRect | null = null;
  let followRectAt = -1;

  /** The pointer, converted to a gaze. The simulation never sees viewport pixels. */
  function followGaze(clock: number): Gaze | null {
    const point = followTarget;
    if (!point) {
      followRect = null;
      return null;
    }
    if (!followRect || clock - followRectAt > 0.4 || clock < followRectAt) {
      followRect = renderer.element.getBoundingClientRect();
      followRectAt = clock;
    }
    if (followRect.width < 1 || followRect.height < 1) return null;
    return mapPointerToGaze({ clientX: point.x, clientY: point.y }, followRect);
  }

  const sim = createSimulation({
    ...options,
    variant,
    reducedMotion: reduced,
    followGaze,
    scheduler: timeoutScheduler(),
    displaySizePx: () => renderer.element.clientWidth,
  });

  let running = false;
  let unsubscribe: (() => void) | null = null;

  function frame(dt: number): void {
    sim.step(dt);
    renderer.draw(sim.snapshot());
  }

  function start(): void {
    if (running || reduced || held) {
      if (reduced) frame(0);
      return;
    }
    running = true;
    unsubscribe = ticker.add((dt) => frame(dt));
  }

  function stop(): void {
    running = false;
    unsubscribe?.();
    unsubscribe = null;
  }

  // Auto-pause holds the loop without touching `paused`, so the host's own
  // pause survives a scroll out and back.
  let held = false;
  let autoPauseHandle: AutoPauseHandle | null = null;
  /** Observes the current root, so it has to be set up again when a series switch replaces it. */
  function watchVisibility(): void {
    autoPauseHandle?.dispose();
    autoPauseHandle = null;
    if (!options.autoPause) return;
    autoPauseHandle = createAutoPause(
      {
        element: renderer.element,
        pause() {
          held = true;
          stop();
          sim.hold();
        },
        resume() {
          held = false;
          if (!paused) start();
        },
        renderOnce() {
          frame(0);
        },
      },
      typeof options.autoPause === 'object' ? options.autoPause : {},
    );
  }
  watchVisibility();

  /**
   * Replace the renderer with one of another series. The simulation is not
   * touched, so the character keeps its state, springs and pending blinks; the
   * new root takes the old one's place in the host.
   */
  function switchStyle(id: string): void {
    const next = getStyle(id);
    const anchor = renderer.element.nextSibling;
    renderer.destroy();
    style = next;
    styleId = next.id;
    renderer = mountRenderer();
    if (anchor?.parentNode === host) host.insertBefore(renderer.element, anchor);
    followRect = null;
    watchVisibility();
  }

  const controller: CharacterController = {
    get element() {
      return renderer.element;
    },

    get paused() {
      return paused;
    },

    update(next) {
      if (next.followTarget !== undefined) followTarget = next.followTarget;
      if (next.paused !== undefined) paused = next.paused;

      let switched = false;
      let change = next;
      if (next.styleOptions) styleOptions = next.styleOptions;
      if (next.style !== undefined && next.style !== styleId) {
        switchStyle(next.style);
        switched = true;
        // A variant the new series does not have would silently draw as its fallback.
        if (next.variant === undefined && !style.variants.includes(variant)) {
          change = { ...next, variant: style.defaultVariant };
        }
      } else if (next.styleOptions) {
        renderer.configure(resolveStyleOptions(style, next.styleOptions));
      }
      if (change.variant) variant = change.variant;

      sim.update(change);

      if (next.paused !== undefined) {
        // Pausing holds the current frame rather than resetting to a neutral
        // pose. A character scrolled off screen and back should look like it
        // was waiting, not like it restarted.
        if (next.paused) stop();
        else start();
      }

      if (!running && !paused) start();
      if (reduced || paused) frame(0);
      // Paint is not animated, so a new ink or variant must not wait for the
      // next tick: a held or off-screen character would show the old one.
      else if (switched || change.variant || next.ink !== undefined) renderer.draw(sim.snapshot());
    },

    spin(turns = 1) {
      sim.spin(turns);
      if (!running) start();
    },

    bounce(strength = 1) {
      sim.bounce(strength);
      if (!running) start();
    },

    burst(count = 16) {
      if (reduced) return;
      sim.burst(count);
      if (!running) start();
    },

    renderOnce() {
      frame(0);
    },

    settle() {
      sim.settle();
      renderer.draw(sim.snapshot());
    },

    pause() {
      paused = true;
      stop();
      sim.hold();
    },

    resume() {
      paused = false;
      start();
    },

    destroy() {
      autoPauseHandle?.dispose();
      stop();
      sim.dispose();
      renderer.destroy();
    },
  };

  if (!paused) start();
  frame(0);

  return controller;
}

/**
 * Map a point in viewport pixels to a gaze target.
 *
 * The square root keeps the eyes responsive to small movements near the
 * character while still reaching their limit for anything far away — a linear
 * mapping makes nearby motion feel unresponsive.
 *
 * Exported because two callers need the same conversion: `followTarget` here,
 * and whatever is listening to the pointer in the host. Both must agree, or a
 * character that follows the mouse and one that follows a supplied point will
 * look at the same pixel differently.
 */
export function mapPointerToGaze(
  point: { clientX: number; clientY: number },
  rect: { left: number; top: number; width: number; height: number },
  strength = 0.6,
): { x: number; y: number } {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = (point.clientX - cx) / (rect.width * 2);
  const dy = (point.clientY - cy) / (rect.height * 2);
  const distance = Math.hypot(dx, dy) || 1;
  const scaled = Math.sqrt(distance) * strength;
  return {
    x: clamp((dx / distance) * scaled, -1, 1),
    y: clamp((dy / distance) * scaled, -1, 1),
  };
}
