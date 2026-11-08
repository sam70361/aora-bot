/**
 * The Mid-Autumn members' signature motions, from the lab's keyframes. Moves
 * are in the art's 100-unit box (the lab's percentages of the figure box are
 * the same numbers; its part moves, in shape units, are divided by 2.3).
 * Figures move about the point their art names (`pivot` in
 * `scripts/art/mid-autumn.js`); parts about the box round every part naming
 * the motion, at its `origin`. As in the lab, everything rests while asleep.
 */
import type { DecorPaint } from '../extras/index.js';
import type { ThemePackage } from '../types.js';

const AWAKE = { except: { moods: ['drowsy'] } } as const;
const GOLD: DecorPaint = { color: 'yellow' };

export const MOTIONS: NonNullable<ThemePackage['motions']> = {
  /** Pressed by the mooncake mould: a lift, a flat squash, a spring back. */
  press: {
    kind: 'keys',
    period: 4.2,
    when: AWAKE,
    keys: [
      { at: 0, scale: 1 },
      { at: 0.62, scale: 1 },
      { at: 0.68, translate: [0, -3], scale: [1.02, 0.99] },
      { at: 0.72, scale: [1.12, 0.82] },
      { at: 0.78, scale: [0.95, 1.07] },
      { at: 0.84, scale: [1.03, 0.97] },
      { at: 0.9, scale: 1 },
      { at: 1, scale: 1 },
    ],
  },
  /** Nodding with every stroke of the pestle; the same period, so the nod lands with the strike. */
  pound: {
    kind: 'keys',
    period: 1.2,
    when: AWAKE,
    keys: [
      { at: 0, translate: [0, 0] },
      { at: 0.45, translate: [0, -1.5], rotate: -1 },
      { at: 0.58, translate: [0, 1.5], scale: [1.02, 0.97] },
      { at: 0.7, translate: [0, 0] },
      { at: 1, translate: [0, 0] },
    ],
  },
  /** The pestle lifted high and struck into the mortar, with a small bounce. */
  pestle: {
    kind: 'keys',
    period: 1.2,
    origin: [0.5, 1],
    when: AWAKE,
    keys: [
      { at: 0, translate: [0, 0] },
      { at: 0.45, translate: [0, -9.6] },
      { at: 0.58, translate: [0, 0.4] },
      { at: 0.64, translate: [0, -0.9] },
      { at: 0.7, translate: [0, 0] },
      { at: 1, translate: [0, 0] },
    ],
  },
  /** Pulled along on its cord: rolls forward, stops with a wobble, rolls back. */
  roll: {
    kind: 'keys',
    period: 5.2,
    when: AWAKE,
    keys: [
      { at: 0, translate: [0, 0] },
      { at: 0.3, translate: [9, 0], rotate: 2 },
      { at: 0.36, translate: [9.5, 0], rotate: -4 },
      { at: 0.42, translate: [9, 0], rotate: 1.5 },
      { at: 0.48, translate: [9, 0], rotate: 0 },
      { at: 0.78, translate: [-6, 0], rotate: -1.5 },
      { at: 0.84, translate: [-6.4, 0], rotate: 3 },
      { at: 0.9, translate: [-6, 0], rotate: 0 },
      { at: 1, translate: [0, 0] },
    ],
  },
  /** The sprig swinging from the foot of its stem. */
  sway: {
    kind: 'keys',
    period: 3.6,
    when: AWAKE,
    keys: [
      { at: 0, rotate: -5 },
      { at: 0.5, rotate: 6 },
      { at: 1, rotate: -5 },
    ],
  },
  /** Florets shaken off the cluster, drifting down and away as they turn. */
  fall: {
    kind: 'emit',
    count: 2,
    period: 4,
    vary: 0.2,
    easing: 'ease-in',
    at: [44, 60],
    spread: [52, 6],
    travel: [5, 38],
    turn: 160,
    glyph: 'floret',
    size: 8,
    paint: GOLD,
    when: AWAKE,
  },
  /** Rising and sinking slowly, as the light breathes. */
  breathe: {
    kind: 'keys',
    period: 6,
    when: AWAKE,
    keys: [
      { at: 0, translate: [0, 2] },
      { at: 0.5, translate: [0, -3] },
      { at: 1, translate: [0, 2] },
    ],
  },
  /** A sparkle and a star twinkling below the moon, beside its cloud. */
  glint: {
    kind: 'emit',
    count: 2,
    period: 2.2,
    at: [46, 86],
    spread: [80, 2],
    travel: [0, -2],
    from: 0.72,
    grow: 1.08,
    fade: [0.4, 0.4],
    glyph: 'sparkle',
    size: 7,
    paint: GOLD,
    when: AWAKE,
  },
  /** Bobbing a greeting while the hat lifts. */
  nod: {
    kind: 'keys',
    period: 4.4,
    when: AWAKE,
    keys: [
      { at: 0, translate: [0, 0] },
      { at: 0.2, translate: [0, 0] },
      { at: 0.32, translate: [0, 1.5], scale: [1.02, 0.97] },
      { at: 0.48, translate: [0, 0], rotate: -3 },
      { at: 0.62, translate: [0, 0], rotate: 0 },
      { at: 1, translate: [0, 0] },
    ],
  },
  /** The peel hat lifted and tipped in greeting, then set back on. */
  hat: {
    kind: 'keys',
    period: 4.4,
    origin: [0.5, 1],
    when: AWAKE,
    keys: [
      { at: 0, translate: [0, 0] },
      { at: 0.2, translate: [0, 0] },
      { at: 0.32, translate: [0, -19], rotate: -14 },
      { at: 0.48, translate: [0, -21.7], rotate: -18 },
      { at: 0.58, translate: [0, 0.9], rotate: -2 },
      { at: 0.62, translate: [0, 0], rotate: 0 },
      { at: 1, translate: [0, 0] },
    ],
  },
  /** Floating up and drifting side to side. */
  rise: {
    kind: 'keys',
    period: 7,
    when: AWAKE,
    keys: [
      { at: 0, translate: [0, 3] },
      { at: 0.25, translate: [3, -3], rotate: 2 },
      { at: 0.5, translate: [0, -7] },
      { at: 0.75, translate: [-3, -2], rotate: -2 },
      { at: 1, translate: [0, 3] },
    ],
  },
  /** The little flame flickering, tall and thin, then short and wide. */
  flame: {
    kind: 'keys',
    period: 1.4,
    origin: [0.5, 1],
    when: AWAKE,
    keys: [
      { at: 0, scale: [0.88, 1.1] },
      { at: 0.5, scale: [1.08, 0.86] },
      { at: 1, scale: [0.88, 1.1] },
    ],
  },
  /** Sparks dropping from the flame and fading. */
  spark: {
    kind: 'emit',
    count: 2,
    period: 1.8,
    vary: 0.25,
    easing: 'ease-out',
    at: [50, 94],
    spread: [8, 2],
    travel: [2, 14],
    from: 1,
    grow: 0.4,
    fade: [0.2, 0.5],
    glyph: 'dot',
    size: 4,
    paint: GOLD,
    when: AWAKE,
  },
  /** Scuttling sideways, a hop and a tilt on every step, a pause, then back. */
  scuttle: {
    kind: 'keys',
    period: 3.4,
    easing: 'linear',
    when: AWAKE,
    keys: [
      { at: 0, translate: [0, 0], rotate: 0 },
      { at: 0.08, translate: [-3, -2], rotate: -3 },
      { at: 0.14, translate: [-5, 0], rotate: 0 },
      { at: 0.22, translate: [-8, -2], rotate: -3 },
      { at: 0.28, translate: [-10, 0], rotate: 0 },
      { at: 0.5, translate: [-10, 0], rotate: 0 },
      { at: 0.58, translate: [-7, -2], rotate: 3 },
      { at: 0.64, translate: [-5, 0], rotate: 0 },
      { at: 0.72, translate: [-2, -2], rotate: 3 },
      { at: 0.78, translate: [0, 0], rotate: 0 },
      { at: 1, translate: [0, 0], rotate: 0 },
    ],
  },
  /** A little lantern swinging from the tip of its rod. */
  swing: { kind: 'rotate', amplitude: 9, period: 2.6, origin: [0.5, 0], when: AWAKE },
};
