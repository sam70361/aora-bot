import { createConfettiController, VIEWBOX_STR, type ConfettiController } from '@aora-bot/engine';
import { useEffect, useImperativeHandle, useRef, type CSSProperties, type Ref } from 'react';
import { useReducedMotion } from '../stage/hooks.js';
import { cx } from '../utils/cx.js';

export interface ConfettiHandle {
  /** Throw `count` pieces outward. */
  burst(count?: number): void;
  /** Remove everything currently in flight. */
  clear(): void;
}

export interface CelebrationLayerProps {
  /**
   * Radius the confetti launches from, in viewBox units rather than pixels —
   * the layer scales with its box, so this is a proportion of the character
   * it sits over and does not change when the box does. Deliberately not
   * `radiusPx`.
   */
  radius?: number;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<ConfettiHandle>;
}

/**
 * Confetti on its own, with no character attached.
 *
 * The engine's confetti controller in a React box: the same paper the
 * characters throw, on the same shared ticker, which it subscribes to only
 * while pieces are in flight.
 */
export function CelebrationLayer({ radius = 114, className, style, ref }: CelebrationLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const controllerRef = useRef<ConfettiController | null>(null);

  /*
   * `burst` is called imperatively through the handle, from outside React's
   * render — there is no hook to call at that point, so the subscription's
   * answer is mirrored into a ref and read there. The hook rather than an
   * imperative `prefersReducedMotion()` so that turning the preference on
   * mid-session is honoured by a handle the host has been holding since mount.
   */
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const controller = createConfettiController(svg, { radius });
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [radius]);

  useImperativeHandle(
    ref,
    () => ({
      burst: (count = 18) => {
        if (reducedRef.current) return;
        controllerRef.current?.burst(count);
      },
      clear: () => controllerRef.current?.clear(),
    }),
    [],
  );

  return (
    <svg
      ref={svgRef}
      viewBox={VIEWBOX_STR}
      aria-hidden="true"
      className={cx('aora-confetti', className)}
      style={style}
    />
  );
}
