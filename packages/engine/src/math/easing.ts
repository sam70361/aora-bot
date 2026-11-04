export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export const clamp01 = (v: number): number => clamp(v, 0, 1);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Frame-rate independent exponential approach. `rate` is the fraction covered
 * in one 60 Hz frame; the exponent rescales it for the actual delta so motion
 * is identical at 30, 60 and 144 Hz.
 */
export const frameLerp = (current: number, target: number, rate: number, dt: number): number =>
  current + (target - current) * (1 - Math.pow(1 - rate, dt * 60));

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
