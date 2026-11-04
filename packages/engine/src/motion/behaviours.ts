import { clamp, easeInOutCubic } from '../math/easing.js';
import type { CharacterState } from './states.js';

/** Targets a behaviour writes each frame. Springs chase these, so they can jump. */
export interface BodyTargets {
  /** Rotation in degrees, before the shape's tiltScale is applied. */
  tilt: number;
  /** Horizontal offset in shape units. */
  x: number;
  /** Vertical offset in shape units. */
  y: number;
  /** Vertical scale. 1 is neutral, below 1 squashes. */
  squash: number;
}

export interface BehaviourContext {
  /** Seconds since the state was entered. */
  t: number;
  /** Seconds since the renderer started, for continuous drift. */
  clock: number;
  /** Deterministic per-instance random in [0, 1). */
  random: () => number;
  /** Impulse hook: adds velocity directly to the y spring. */
  impulse: (velocity: number) => void;
}

export type Behaviour = (ctx: BehaviourContext) => BodyTargets;

const rest: BodyTargets = { tilt: 0, x: 0, y: 0, squash: 1 };

/**
 * The resting motion every other state is measured against.
 *
 * Three sine waves at unrelated frequencies. Because the periods never line up
 * the loop is not perceptible, which is what stops a character sitting in a
 * sidebar for ten minutes from looking like a looping GIF.
 */
const idle: Behaviour = ({ clock }) => ({
  tilt: Math.sin(clock * 0.5) * 1.5 + Math.sin(clock * 0.17) * 0.6,
  x: Math.sin(clock * 0.27),
  y: Math.sin(clock * 0.85) * 1.2,
  squash: 1 + Math.sin(clock * 0.85) * 0.007,
});

/**
 * Periodic event timer that fires once per randomised interval.
 *
 * The first interval is drawn lazily from the caller's `random`, so a seeded
 * character produces the same pulse schedule every time. Drawing from
 * `Math.random` at construction — the tempting shortcut — would make the
 * first kick of an `angry` character the only non-reproducible thing in it.
 */
function createPulse(min: number, max: number) {
  let next: number | null = null;
  let last = 0;
  return (t: number, random: () => number): number | null => {
    next ??= min + random() * (max - min);
    if (t - last >= next) {
      last = t;
      next = min + random() * (max - min);
      return t;
    }
    return null;
  };
}

/** Piecewise-linear sample of `values` at `times`; holds the last value afterwards. */
function keyframes(t: number, times: readonly number[], values: readonly number[]): number {
  if (t <= times[0]!) return values[0]!;
  for (let i = 1; i < times.length; i++) {
    if (t <= times[i]!) {
      const span = times[i]! - times[i - 1]!;
      const f = span > 0 ? (t - times[i - 1]!) / span : 1;
      return values[i - 1]! + (values[i]! - values[i - 1]!) * f;
    }
  }
  return values[values.length - 1]!;
}

const SHAKE_TIMES = [0, 0.16, 0.32, 0.48, 0.64, 0.8] as const;
const SHAKE_OFFSETS = [0, -9, 8, -6, 4, 0] as const;

const BEHAVIOURS: Partial<Record<CharacterState, Behaviour>> = {
  idle,

  sleeping: ({ clock }) => ({
    tilt: 6 + Math.sin(clock * 0.34) * 1.2,
    x: 0,
    // Slow, deep breathing.
    y: Math.sin(clock * 0.55) * 2.6,
    squash: 1 + Math.sin(clock * 0.55) * 0.02,
  }),

  drowsy: ({ clock }) => ({
    tilt: 4 + Math.sin(clock * 0.4) * 3,
    x: Math.sin(clock * 0.22) * 1.4,
    y: Math.sin(clock * 0.5) * 2,
    squash: 1,
  }),

  bored: ({ clock }) => ({
    tilt: Math.sin(clock * 0.3) * 4,
    x: Math.sin(clock * 0.19) * 3,
    y: 2,
    squash: 0.99,
  }),

  waking: ({ t, clock }) => ({
    tilt: Math.sin(clock * 0.6) * 2 * Math.min(1, t),
    x: 0,
    y: Math.max(0, 4 - t * 4),
    squash: 1,
  }),

  'powering-down': ({ t }) => ({
    tilt: Math.min(8, t * 4),
    x: 0,
    y: Math.min(6, t * 3),
    squash: Math.max(0.94, 1 - t * 0.03),
  }),

  listening: ({ clock }) => ({
    tilt: 8 + Math.sin(clock * 0.7) * 1.2,
    x: 0,
    y: Math.sin(clock * 0.9) * 1,
    squash: 1,
  }),

  thinking: ({ clock }) => ({
    tilt: -9 + Math.sin(clock * 0.45) * 2,
    x: Math.sin(clock * 0.33) * 1.6,
    y: Math.sin(clock * 0.6) * 1,
    squash: 1,
  }),

  searching: ({ clock }) => ({
    tilt: Math.sin(clock * 1.6) * 3,
    x: Math.sin(clock * 1.2) * 4,
    y: Math.sin(clock * 0.8) * 1.4,
    squash: 1,
  }),

  reading: ({ clock }) => ({
    tilt: 3,
    x: Math.sin(clock * 0.9) * 3,
    y: 1,
    squash: 1,
  }),

  working: ({ clock }) => ({
    tilt: -4 + Math.sin(clock * 2.4) * 1.6,
    x: Math.sin(clock * 1.9) * 1.2,
    y: Math.sin(clock * 3.1) * 1.4,
    squash: 1 + Math.sin(clock * 3.1) * 0.012,
  }),

  writing: ({ clock }) => ({
    tilt: 2 + Math.sin(clock * 1.4) * 1.5,
    x: Math.sin(clock * 0.7) * 2.4,
    y: 1,
    squash: 1,
  }),

  happy: ({ clock }) => ({
    tilt: Math.sin(clock * 1.1) * 3,
    x: Math.sin(clock * 0.5) * 1.5,
    y: Math.sin(clock * 1.6) * 2.2,
    squash: 1 + Math.sin(clock * 1.6) * 0.015,
  }),

  /** 2.2 Hz hop: compress on landing, stretch at the top. */
  excited: ({ clock }) => {
    const phase = (clock * 2.2) % 1;
    const lift = Math.sin(phase * Math.PI);
    return {
      tilt: Math.sin(clock * 3) * 2,
      x: 0,
      y: -lift * 14,
      squash: phase < 0.12 ? 0.92 : 1 + lift * 0.05,
    };
  },

  bouncing: ({ clock }) => {
    const phase = (clock * 1.5) % 1;
    const lift = Math.abs(Math.sin(phase * Math.PI));
    return { tilt: 0, x: 0, y: -lift * 20, squash: phase < 0.14 ? 0.9 : 1 + lift * 0.06 };
  },

  laughing: ({ clock }) => ({
    tilt: Math.sin(clock * 6.4) * 4,
    x: 0,
    y: Math.abs(Math.sin(clock * 6.4)) * -5,
    squash: 1 + Math.sin(clock * 6.4) * 0.03,
  }),

  playful: ({ clock }) => ({
    tilt: Math.sin(clock * 1.7) * 9,
    x: Math.sin(clock * 1.1) * 6,
    y: Math.sin(clock * 2.3) * 3,
    squash: 1,
  }),

  proud: ({ clock }) => ({
    tilt: Math.sin(clock * 0.5) * 1.5,
    x: 0,
    y: -4 + Math.sin(clock * 0.7) * 0.8,
    squash: 1.01,
  }),

  celebrate: ({ clock }) => ({
    tilt: Math.sin(clock * 2.8) * 6,
    x: Math.sin(clock * 1.9) * 4,
    y: -Math.abs(Math.sin(clock * 2.8)) * 8,
    squash: 1 + Math.sin(clock * 2.8) * 0.02,
  }),

  shy: ({ clock }) => ({
    tilt: 7 + Math.sin(clock * 0.6) * 1,
    x: -3,
    y: 4,
    squash: 0.985,
  }),

  sad: ({ clock }) => ({
    tilt: 5,
    x: 0,
    y: 5 + Math.sin(clock * 0.45) * 1.2,
    squash: 0.97,
  }),

  confused: ({ clock }) => ({
    tilt: Math.sin(clock * 0.8) * 11,
    x: Math.sin(clock * 0.55) * 3,
    y: 0,
    squash: 1,
  }),

  suspicious: ({ clock }) => ({
    tilt: -6,
    x: Math.sin(clock * 0.5) * 2,
    y: 0,
    squash: 1,
  }),

  surprised: ({ t }) => ({
    tilt: 0,
    x: 0,
    y: t < 0.3 ? -8 * (1 - t / 0.3) : 0,
    squash: t < 0.2 ? 1.06 : 1,
  }),

  scared: ({ clock }) => ({
    // Fast, small tremor.
    tilt: Math.sin(clock * 22) * 1.6,
    x: Math.sin(clock * 19) * 1.4,
    y: 2,
    squash: 0.98,
  }),

  /** Head cocked, leaning in slightly, with a slow side-to-side look. */
  curious: ({ clock }) => ({
    tilt: 4 + Math.sin(clock * 0.7) * 1.5,
    x: Math.sin(clock * 0.45) * 2.5,
    y: -1 + Math.sin(clock * 1.1) * 0.8,
    squash: 1.005,
  }),

  /**
   * A head-shake on entry, then a low, planted stance.
   *
   * The shake is a decaying alternation over 0.8 s: the first swing is the
   * widest and each return is shorter, which is the rhythm of an actual "no"
   * rather than a vibration.
   */
  refusing: ({ t, clock }) => ({
    tilt: -2 + Math.sin(clock * 0.4) * 0.6,
    x: keyframes(t, SHAKE_TIMES, SHAKE_OFFSETS),
    y: 2,
    squash: 0.99,
  }),

  spawning: ({ t }) => ({
    tilt: 0,
    x: 0,
    y: t < 0.45 ? -20 * (1 - easeInOutCubic(Math.min(1, t / 0.45))) : 0,
    squash: t < 0.5 ? 0.9 + 0.1 * easeInOutCubic(Math.min(1, t / 0.5)) : 1,
  }),

  composing: ({ clock }) => ({
    tilt: Math.sin(clock * 1.3) * 2,
    x: Math.sin(clock * 0.9) * 1.6,
    y: Math.sin(clock * 2.1) * 1,
    squash: 1,
  }),

  notifying: ({ clock }) => ({
    tilt: Math.sin(clock * 3.2) * 2.5,
    x: 0,
    y: Math.sin(clock * 3.2) * 2,
    squash: 1,
  }),

  /**
   * Swaying to a tune only it can hear.
   *
   * The tilt and the sideways drift share one slow frequency so the body
   * leans into the direction it is moving, the way a person rocking on their
   * feet does; the bob runs at twice that, landing on each end of the sway.
   */
  humming: ({ clock }) => {
    const sway = Math.sin(clock * 1.15);
    return {
      tilt: sway * 6,
      x: sway * 5,
      y: Math.cos(clock * 2.3) * 2.2,
      squash: 1 + Math.cos(clock * 2.3) * 0.012,
    };
  },

  dragging: ({ clock }) => {
    /*
     * One 3.4 s round trip: lift, glide, land, rest. The landing is the part
     * that sells it — the body arrives a moment before it stops, squashes
     * against the surface and springs back, which is why the squash curve is
     * sharp where the glide curve is smooth. Driven by `clock` rather than
     * the state clock so a character already dragging when the host looks
     * away is not restarted mid-flight.
     */
    const period = 3.4;
    const p = (clock % period) / period;
    const direction = Math.floor(clock / period) % 2 === 0 ? 1 : -1;

    const lift = keyframes(p, DRAG_TIMES, DRAG_LIFT);
    const glide = easeInOutCubic(clamp((p - 0.22) / 0.4, 0, 1));
    const impact = p >= 0.62 && p < 0.78 ? Math.sin(((p - 0.62) / 0.16) * Math.PI) : 0;

    return {
      tilt: direction * lift * 0.5,
      x: direction * (-14 + glide * 28),
      y: -lift + impact * 2,
      squash: 1 - impact * 0.1 + (lift / 22) * 0.03,
    };
  },
};

/** Height off the surface through one drag cycle, in shape units. */
const DRAG_TIMES = [0, 0.18, 0.22, 0.62, 0.7, 0.86, 1] as const;
const DRAG_LIFT = [0, 20, 22, 20, 0, 0, 0] as const;

/**
 * Behaviours that fire discrete impulses rather than tracking a continuous
 * curve. Kept separate because they need per-instance timers.
 */
export function createImpulseBehaviour(state: CharacterState): ((ctx: BehaviourContext) => void) | null {
  switch (state) {
    case 'angry': {
      const pulse = createPulse(1.8, 3.2);
      return ({ t, random, impulse }) => {
        if (pulse(t, random) !== null) impulse(70);
      };
    }
    case 'listening': {
      const pulse = createPulse(1.8, 3.2);
      return ({ t, random, impulse }) => {
        if (pulse(t, random) !== null) impulse(26);
      };
    }
    case 'alerting': {
      const pulse = createPulse(2.2, 2.2);
      return ({ t, random, impulse }) => {
        if (pulse(t, random) !== null) impulse(48);
      };
    }
    case 'receiving': {
      const pulse = createPulse(1.7, 1.7);
      return ({ t, random, impulse }) => {
        if (pulse(t, random) !== null) impulse(-18);
      };
    }
    default:
      return null;
  }
}

export function behaviourFor(state: CharacterState): Behaviour {
  return BEHAVIOURS[state] ?? angryOrDefault(state);
}

function angryOrDefault(state: CharacterState): Behaviour {
  if (state === 'angry') {
    return ({ clock }) => ({
      tilt: -5 + Math.sin(clock * 14) * 1.2,
      x: Math.sin(clock * 16) * 1.1,
      y: 0,
      squash: 1,
    });
  }
  // Belt-driven states keep the body still so the overlay reads clearly.
  return () => rest;
}
