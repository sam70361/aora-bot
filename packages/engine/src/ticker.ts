export type TickHandler = (dt: number, now: number) => void;

/**
 * A single animation loop shared by every character on the page.
 *
 * Giving each character its own `requestAnimationFrame` is the obvious
 * implementation and it does not scale: a gallery showing two hundred
 * characters would schedule two hundred callbacks per frame, each with its own
 * timestamp bookkeeping. One loop fanning out to a set of subscribers costs
 * the same as one character, and it guarantees every character on screen is
 * evaluated against an identical timestamp, so animations stay in phase.
 */
class Ticker {
  private handlers = new Set<TickHandler>();
  private frame: number | null = null;
  private last = 0;

  add(handler: TickHandler): () => void {
    this.handlers.add(handler);
    this.start();
    return () => this.remove(handler);
  }

  remove(handler: TickHandler): void {
    this.handlers.delete(handler);
    if (this.handlers.size === 0) this.stop();
  }

  private start(): void {
    if (this.frame != null || typeof requestAnimationFrame === 'undefined') return;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.loop);
  }

  private stop(): void {
    if (this.frame == null) return;
    cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  private loop = (now: number): void => {
    this.frame = requestAnimationFrame(this.loop);

    // Clamp the delta so a backgrounded tab returning after ten seconds
    // advances one frame instead of teleporting every spring to its target.
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;

    for (const handler of this.handlers) handler(dt, now);
  };

  get size(): number {
    return this.handlers.size;
  }
}

export const ticker = new Ticker();

let reducedMotionQuery: MediaQueryList | null = null;

/** Whether the visitor asked for reduced motion. Safe to call during SSR. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  reducedMotionQuery ??= window.matchMedia('(prefers-reduced-motion: reduce)');
  return reducedMotionQuery.matches;
}

/** Subscribe to reduced-motion changes. Returns an unsubscribe function. */
export function onReducedMotionChange(handler: (reduced: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  reducedMotionQuery ??= window.matchMedia('(prefers-reduced-motion: reduce)');
  const listener = (e: MediaQueryListEvent) => handler(e.matches);
  reducedMotionQuery.addEventListener('change', listener);
  return () => reducedMotionQuery?.removeEventListener('change', listener);
}
