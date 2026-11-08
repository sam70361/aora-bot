/**
 * The Valentine members' signature motions, as the lab played them: the
 * bonbon's lid lifting at one corner, the rose stretching its outer petals
 * and fanning its leaves, the cherub's wings and arrow jab, the ring box
 * snapping shut and springing open, the dove's wing beats and swinging
 * letter, a chocolate drop swelling and falling from the strawberry's tip.
 * Moves are in the art's 100-unit box, about the pivot each part names
 * (`scripts/art/valentine.js`). Everything rests while the member sleeps.
 */
import type { MotionKey, PartMotion } from '../extras/index.js';
import type { ThemePackage } from '../types.js';

const AWAKE = { except: { moods: ['drowsy'] } } as const;

/** A lab pose: moved `x`, `y`, turned `r` degrees, scaled `s` (or `sx`, `sy`), at opacity `o`. */
interface Pose {
  x?: number;
  y?: number;
  r?: number;
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
  return list.map(([at, { x = 0, y = 0, r = 0, s = 1, sx = s, sy = s, o = 1 }]) => ({
    at,
    translate: [x, y],
    rotate: r,
    scale: sx === sy ? sx : [sx, sy],
    ...(fades ? { opacity: o } : null),
  }));
}

const motion = (period: number, list: readonly (readonly [number, Pose])[]): PartMotion => ({
  kind: 'keys',
  period,
  when: AWAKE,
  keys: keys(list),
});

/** A turn there and back for the lab's mirrored pairs: `sign` -1 mirrors it. */
const turns = (period: number, list: readonly (readonly [number, number])[], sign = 1): PartMotion =>
  motion(
    period,
    list.map(([at, r]) => [at, { r: r * sign }] as const),
  );

const PETAL = [
  [0, 0],
  [0.3, -13],
  [0.5, -10],
  [0.7, 0],
  [1, 0],
] as const;
const LEAF = [
  [0, 0],
  [0.15, 14],
  [0.3, -10],
  [0.45, 8],
  [0.6, 0],
  [1, 0],
] as const;
const CHERUB_WING = [
  [0, 0],
  [0.08, 24],
  [0.16, -6],
  [0.24, 22],
  [0.32, -4],
  [0.4, 18],
  [0.5, 0],
  [1, 0],
] as const;

export const MOTIONS: NonNullable<ThemePackage['motions']> = {
  /** The lid lifts at its left corner about its right hinge, holds, and snaps shut. */
  'bonbon-lid': motion(4.4, [
    [0, {}],
    [0.1, { y: -6, r: 17 }],
    [0.17, { y: -4.5, r: 12.5 }],
    [0.24, { y: -5.2, r: 14.5 }],
    [0.44, { y: -5.2, r: 14.5 }],
    [0.52, { y: 0.8, r: -0.6 }],
    [0.56, {}],
    [1, {}],
  ]),
  /** The outer petals stretch out, as in a yawn. */
  'rose-petalL': turns(3.8, PETAL),
  'rose-petalR': turns(3.8, PETAL, -1),
  /** The leaves fan back and forth from where they join the stem. */
  'rose-leafL': turns(3.8, LEAF),
  'rose-leafR': turns(3.8, LEAF, -1),
  /** Three quick flaps of the little wings. */
  'cherub-wingL': turns(3.6, CHERUB_WING),
  'cherub-wingR': turns(3.6, CHERUB_WING, -1),
  /** The arrow drawn back, then jabbed forward along its shaft. */
  'cherub-arrow': motion(3.6, [
    [0, {}],
    [0.5, {}],
    [0.56, { x: -3.2, y: 1.6 }],
    [0.62, { x: 5.4, y: -2.8 }],
    [0.74, { x: 4.6, y: -2.4 }],
    [0.84, {}],
    [1, {}],
  ]),
  /** The lid folds flat onto the hinge and springs back past open. */
  'ring-lid': motion(4.6, [
    [0, {}],
    [0.14, {}],
    [0.26, { sy: 0.1 }],
    [0.42, { sy: 0.1 }],
    [0.5, { sy: 1.1 }],
    [0.56, { sy: 0.97 }],
    [0.62, {}],
    [1, {}],
  ]),
  /** The ring sinks into the cushion while the lid is shut, then pops out. */
  'ring-ring': motion(4.6, [
    [0, {}],
    [0.14, {}],
    [0.24, { s: 0.15 }],
    [0.44, { s: 0.15 }],
    [0.52, { s: 1.15 }],
    [0.58, { s: 0.96 }],
    [0.64, {}],
    [1, {}],
  ]),
  /**
   * The sparkle goes out with the lid and flashes back a quarter turn on: a
   * four-point star a quarter turn on is the star at rest, so the loop is seamless.
   */
  'ring-spark': motion(4.6, [
    [0, {}],
    [0.14, {}],
    [0.22, { s: 0 }],
    [0.48, { s: 0 }],
    [0.56, { s: 1.7, r: 45 }],
    [0.66, { s: 0.9, r: 90 }],
    [0.74, { r: 90 }],
    [1, { r: 90 }],
  ]),
  /** Two wing beats. */
  'dove-wingL': turns(3.4, [
    [0, 0],
    [0.12, -26],
    [0.24, 8],
    [0.36, -22],
    [0.48, 0],
    [1, 0],
  ]),
  'dove-wingR': turns(3.4, [
    [0, 0],
    [0.12, 24],
    [0.24, -8],
    [0.36, 20],
    [0.48, 0],
    [1, 0],
  ]),
  /** The letter swings from the beak like a pendulum, half a beat behind the wings, and dies away. */
  'dove-letter': turns(3.4, [
    [0, 0],
    [0.16, 0],
    [0.3, 14],
    [0.44, -10],
    [0.58, 6],
    [0.7, -2],
    [0.8, 0],
    [1, 0],
  ]),
  /** A drop of chocolate swells at the tip, stretches, falls and is gone; the next bead forms. */
  'dipped-drop': motion(3.6, [
    [0, { s: 0.25 }],
    [0.34, { s: 1 }],
    [0.5, { sx: 0.92, sy: 1.45 }],
    [0.6, { y: 12, s: 0.8, o: 0 }],
    [0.61, { s: 0.2, o: 0 }],
    [0.74, { s: 0.25, o: 1 }],
    [1, { s: 0.25 }],
  ]),
};
