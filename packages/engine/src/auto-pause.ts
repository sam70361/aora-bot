import { onReducedMotionChange, prefersReducedMotion } from './ticker.js';

/**
 * Pause a character when nobody can see it.
 *
 * Three browser signals feed one switch:
 *
 * 1. **Page visibility.** A hidden tab or a minimised window stops the frame
 *    loop. A character in a background tab burning a core is the single
 *    most common complaint about animated UI.
 * 2. **Viewport intersection.** Scrolled out of view stops it too, and
 *    scrolling back resumes from the held frame, so it looks like it waited.
 * 3. **Reduced motion.** If the visitor turns the preference on mid-session
 *    the character freezes on a static frame — optionally re-rendered at a
 *    low rate — and thaws when they turn it off.
 *
 * The three are ANDed: the character runs only when the page is visible,
 * the element is in view and motion is acceptable. The switch is idempotent,
 * so a burst of events causes at most one pause or resume.
 *
 * Works on anything with `pause()` and `resume()`, not only the engine's
 * controller; a canvas renderer with the same two methods gets the same
 * behaviour.
 */
export interface AutoPauseTarget {
  /** Element to observe for viewport intersection. Without it, signal 2 is skipped. */
  element?: Element | null;
  pause(): void;
  resume(): void;
  /** Draw one frame without animating. Used under reduced motion so the character is not left blank. */
  renderOnce?(): void;
}

export interface AutoPauseOptions {
  /** Stop when the page is hidden. Default true. */
  visibility?: boolean;
  /** Stop when the element leaves the viewport. Default true. */
  viewport?: boolean;
  /** Grow the intersection root by this margin, so the character starts just before it scrolls into view. Default `'64px'`. */
  rootMargin?: string;
  /** Freeze under `prefers-reduced-motion`. Default true. */
  reducedMotion?: boolean;
  /** When frozen for reduced motion, re-render at this rate instead of once. 0 (default) renders once. */
  reducedFps?: number;
}

export interface AutoPauseHandle {
  /** Re-evaluate after a signal the handle cannot see, such as a host window being hidden. */
  refresh(): void;
  /** Whether the target is currently allowed to run. */
  readonly running: boolean;
  dispose(): void;
}

const NOOP_HANDLE: AutoPauseHandle = { refresh() {}, running: true, dispose() {} };

export function autoPause(target: AutoPauseTarget, options: AutoPauseOptions = {}): AutoPauseHandle {
  const doc = typeof document !== 'undefined' ? document : null;
  if (!doc) return NOOP_HANDLE;

  let pageVisible = doc.visibilityState !== 'hidden';
  let inView = true;
  let motionOk = true;
  let running: boolean | null = null;
  let lowFrequency: ReturnType<typeof setInterval> | null = null;

  const watchMotion = options.reducedMotion !== false;
  if (watchMotion) motionOk = !prefersReducedMotion();

  const clearLowFrequency = () => {
    if (lowFrequency != null) {
      clearInterval(lowFrequency);
      lowFrequency = null;
    }
  };

  const sync = () => {
    const want = pageVisible && inView && motionOk;
    if (want === running) return;
    clearLowFrequency();
    if (want) {
      target.resume();
    } else {
      target.pause();
      // Reduced motion but still on screen: a still frame, not a blank.
      if (!motionOk && pageVisible && inView && target.renderOnce) {
        target.renderOnce();
        if (options.reducedFps && options.reducedFps > 0) {
          const render = () => target.renderOnce?.();
          lowFrequency = setInterval(render, Math.max(1000 / options.reducedFps, 100));
        }
      }
    }
    running = want;
  };

  let onVisibility: (() => void) | null = null;
  if (options.visibility !== false) {
    onVisibility = () => {
      pageVisible = doc.visibilityState !== 'hidden';
      sync();
    };
    doc.addEventListener('visibilitychange', onVisibility);
  }

  let observer: IntersectionObserver | null = null;
  if (options.viewport !== false && target.element && typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver(
      (entries) => {
        // The last entry is the most recent state.
        inView = entries[entries.length - 1]?.isIntersecting ?? true;
        sync();
      },
      { rootMargin: options.rootMargin ?? '64px' },
    );
    observer.observe(target.element);
  }

  const stopMotion = watchMotion
    ? onReducedMotionChange((reduced) => {
        motionOk = !reduced;
        sync();
      })
    : null;

  // Initial state is applied on the first `sync()`, so a character mounted
  // in a hidden tab is paused before its first animated frame.
  running = true;
  sync();

  return {
    refresh: sync,
    get running() {
      return running === true;
    },
    dispose() {
      clearLowFrequency();
      if (onVisibility) doc.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
      stopMotion?.();
    },
  };
}
