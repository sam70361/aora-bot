/**
 * The Summer members' signature motions, as the lab played them: a drip
 * swelling and falling from the lolly, the parasol and the pineapple's crown
 * swaying, the castle flag fluttering, the fan's blades spinning, the ice
 * cube's puddle spreading while a drop slides down its side, the scallop's
 * lid closing over its pearl, the cicada's wings buzzing in bursts, and the
 * swim ring rocking on the waves. Moves are in the art's 100-unit box, about
 * the pivot each part names (`scripts/art/summer.js`). The lab played every
 * one of them in every state, so none is gated.
 */
import type { MotionKey, PartMotion } from '../extras/index.js';
import type { ThemePackage } from '../types.js';

/** The lab's keyframes moved in its twin's shape space, about 2.29 units to one unit of the art's box. */
const px = (v: number) => Math.round((v / 2.29) * 100) / 100;

/** A lab pose: moved `x`, `y` (lab pixels), turned `r` degrees, skewed `k` degrees on y, scaled `sx`, `sy`, at opacity `o`. */
interface Pose {
  x?: number;
  y?: number;
  r?: number;
  k?: number;
  s?: number;
  sx?: number;
  sy?: number;
  o?: number;
}

/**
 * The lab's keyframes, `[at, pose]` with an empty pose at rest. Every key
 * spells out the whole transform, as each lab keyframe set the whole of it,
 * and the opacity where the motion fades.
 */
function keys(list: readonly (readonly [number, Pose])[]): MotionKey[] {
  const fades = list.some(([, pose]) => pose.o !== undefined);
  const skews = list.some(([, pose]) => pose.k !== undefined);
  return list.map(([at, { x = 0, y = 0, r = 0, k = 0, s = 1, sx = s, sy = s, o = 1 }]) => ({
    at,
    translate: [px(x), px(y)],
    rotate: r,
    ...(skews ? { skew: [0, k] as const } : null),
    scale: sx === sy ? sx : [sx, sy],
    ...(fades ? { opacity: o } : null),
  }));
}

const motion = (
  period: number,
  list: readonly (readonly [number, Pose])[],
  easing?: PartMotion['easing'],
): PartMotion => ({ kind: 'keys', period, ...(easing ? { easing } : null), keys: keys(list) });

/** Five quick beats between `up` and `back` degrees in the first 44 % of the period, then rest. */
function buzz(up: number, back: number): PartMotion {
  const beats: [number, Pose][] = [[0, {}]];
  for (let i = 0; i < 5; i++) beats.push([0.04 + i * 0.08, { r: up }], [0.08 + i * 0.08, { r: back }]);
  beats.push([0.44, {}], [1, {}]);
  return motion(2.6, beats, 'linear');
}

export const MOTIONS: NonNullable<ThemePackage['motions']> = {
  /** The drop under the lemon band swells, stretches, falls and is gone; the next one swells. */
  drip: motion(
    2.8,
    [
      [0, { y: -6, s: 0.2, o: 1 }],
      [0.3, {}],
      [0.55, { y: 5, sx: 0.95, sy: 1.18 }],
      [0.82, { y: 34, s: 0.9 }],
      [0.84, { y: 36, s: 0.9, o: 0 }],
      [1, { y: 36, s: 0.9, o: 0 }],
    ],
    'ease-in',
  ),
  /** The parasol, or the pineapple's crown, sways from where it is planted. */
  sway: motion(2.4, [
    [0, { r: -10 }],
    [0.5, { r: 9 }],
    [1, { r: -10 }],
  ]),
  /** The flag ripples along its pole, skewing and stretching. */
  flutter: motion(0.9, [
    [0, { k: -9, sx: 0.84, sy: 1 }],
    [0.5, { k: 7, sx: 1.02, sy: 1 }],
    [1, { k: -9, sx: 0.84, sy: 1 }],
  ]),
  /** The blades turn round the hub, a turn every 0.62 s. */
  spin: { kind: 'rotate', amplitude: 360, wave: 'loop', easing: 'linear', period: 0.62 },
  /** The puddle at the cube's foot spreads and draws back. */
  melt: motion(4.2, [
    [0, { sx: 0.84, sy: 0.86 }],
    [0.5, { sx: 1.1, sy: 1.06 }],
    [1, { sx: 0.84, sy: 0.86 }],
  ]),
  /** A drop fades in at the side face's top, slides down the edge and fades out. */
  slide: motion(
    3.6,
    [
      [0, { y: -6, o: 0 }],
      [0.15, {}],
      [0.8, { y: 42 }],
      [1, { y: 52, o: 0 }],
    ],
    'ease-in',
  ),
  /** The lid folds down onto the hinge, holds, and opens again past where it rests. */
  lid: motion(4.8, [
    [0, {}],
    [0.3, {}],
    [0.44, { sx: 1, sy: 0.32 }],
    [0.56, { sx: 1, sy: 0.32 }],
    [0.72, { sx: 1, sy: 1.07 }],
    [0.82, {}],
    [1, {}],
  ]),
  /** The pearl sinks into the bowl while the lid is shut and pops back out. */
  pearl: motion(4.8, [
    [0, {}],
    [0.3, {}],
    [0.42, { y: 30 }],
    [0.58, { y: 30 }],
    [0.74, { y: -3 }],
    [0.82, {}],
    [1, {}],
  ]),
  /** The cicada's wings buzz in a burst from their roots, then rest. */
  buzzL: buzz(16, -3),
  buzzR: buzz(-16, 3),
  /** The swim ring rocks either way and sinks a little between, as if on a wave. */
  rock: motion(3.4, [
    [0, { r: -5 }],
    [0.25, { y: 8.3 }],
    [0.5, { r: 5 }],
    [0.75, { y: 8.3 }],
    [1, { r: -5 }],
  ]),
};
