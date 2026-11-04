/**
 * Critically-damped-by-default second order spring.
 *
 * Every continuous quantity in the engine (tilt, translation, squash, blink,
 * gaze, morph progress) is one of these. They are integrated at a fixed 120 Hz
 * substep regardless of display refresh rate, so a 144 Hz monitor and a 60 Hz
 * monitor converge identically.
 */
export interface Spring {
  /** Current value. */
  value: number;
  /** Current velocity, in units per second. */
  velocity: number;
  /** Value the spring is pulling towards. */
  target: number;
  /** Angular frequency — higher is snappier. */
  omega: number;
  /** Damping ratio. 1 is critically damped, below 1 overshoots. */
  zeta: number;
}

export function spring(value = 0, omega = 6, zeta = 1): Spring {
  return { value, velocity: 0, target: value, omega, zeta };
}

/** Fixed integration substep: 120 Hz. */
const SPRING_SUBSTEP = 1 / 120;

/**
 * Advance a spring by `dt` seconds using semi-implicit Euler at a fixed
 * substep. Semi-implicit is stable at these frequencies and is a third the
 * cost of RK4, which matters when several hundred springs tick per frame.
 */
export function stepSpring(s: Spring, dt: number): number {
  let remaining = Math.min(dt, 0.1);

  while (remaining > 0) {
    const h = Math.min(SPRING_SUBSTEP, remaining);
    remaining -= h;

    const accel = -s.omega * s.omega * (s.value - s.target) - 2 * s.zeta * s.omega * s.velocity;
    s.velocity += accel * h;
    s.value += s.velocity * h;
  }

  return s.value;
}

/** Drop a spring onto its target instantly. Used for reduced-motion. */
export function settleSpring(s: Spring): number {
  s.value = s.target;
  s.velocity = 0;
  return s.value;
}

/**
 * Time in seconds for a spring to visually settle. Used to derive CSS
 * `linear()` easings for the onboarding choreography, where the motion must
 * match but cannot run on the JS ticker.
 */
export function springSettleTime(omega: number, zeta: number): number {
  // Envelope decays as e^(-zeta*omega*t); 1% of initial displacement reads as settled.
  const decay = zeta * omega;
  return decay <= 0 ? 1 : Math.min(6, Math.log(100) / decay);
}

/** Normalised spring position at time `t`, starting at 0 and settling at 1. */
export function springPosition(t: number, omega: number, zeta: number): number {
  if (zeta < 1) {
    const wd = omega * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-omega * t) * (1 + omega * t);
}

/**
 * Sample a spring into a CSS `linear()` easing function so a DOM transition
 * can reproduce the same motion curve.
 */
export function springToLinearEasing(omega: number, zeta: number, samples = 24): string {
  const duration = springSettleTime(omega, zeta);
  const stops: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * duration;
    stops.push((Math.round(springPosition(t, omega, zeta) * 10000) / 10000).toString());
  }
  return `linear(${stops.join(', ')})`;
}
