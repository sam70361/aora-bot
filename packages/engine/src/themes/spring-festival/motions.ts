/**
 * The Spring Festival members' signature motions, each the whole figure
 * moving about a point chosen for what it is: a hung thing from the top, a
 * standing one from its foot. Moves are in the art's 100-unit box; each
 * figure's art names its motion and that point (`motion` and `pivot` in
 * `scripts/art/spring-festival.js`). They play in every state, as the lab's did.
 */
import type { ThemePackage } from '../types.js';

export const MOTIONS: NonNullable<ThemePackage['motions']> = {
  /** Wobbling in the spoon like a ball just scooped up. */
  jiggle: {
    kind: 'keys',
    period: 2.2,
    keys: [
      { at: 0, scale: 1 },
      { at: 0.08, scale: [1.07, 0.92] },
      { at: 0.16, scale: [0.95, 1.06] },
      { at: 0.24, scale: [1.03, 0.97] },
      { at: 0.32, scale: [0.99, 1.01], rotate: -2 },
      { at: 0.4, rotate: 1 },
      { at: 0.46, rotate: 0 },
      { at: 1, rotate: 0 },
    ],
  },
  /** Up on its toes and a shake, as if the money inside rustled. */
  shimmy: {
    kind: 'keys',
    period: 2.6,
    keys: [
      { at: 0, translate: [0, 0] },
      { at: 0.12, translate: [0, -7.7], rotate: -5 },
      { at: 0.2, translate: [0, -7.7], rotate: 5 },
      { at: 0.28, translate: [0, -7.7], rotate: -4 },
      { at: 0.36, translate: [0, -7.7], rotate: 3 },
      { at: 0.48, translate: [0, 0], scale: [1.04, 0.96] },
      { at: 0.6, translate: [0, 0] },
      { at: 1, translate: [0, 0] },
    ],
  },
  /** Swinging on its fuse, with a shiver at the end of each swing as if about to go off. */
  swing: {
    kind: 'keys',
    period: 2.4,
    keys: [
      { at: 0, rotate: 8 },
      { at: 0.5, rotate: -8 },
      { at: 0.52, rotate: -7, translate: [1.2, 0] },
      { at: 0.54, rotate: -8, translate: [-1.2, 0] },
      { at: 0.56, rotate: -7.4 },
      { at: 1, rotate: 8 },
    ],
  },
  /** Pinned at the top corner, the paper lifting in the wind. */
  flutter: {
    kind: 'keys',
    period: 3.2,
    keys: [
      { at: 0, rotate: 0, skew: [0, 0] },
      { at: 0.2, rotate: 4, skew: [0, -3], scale: [0.96, 1] },
      { at: 0.45, rotate: -3, skew: [0, 2] },
      { at: 0.65, rotate: 2, skew: [0, -1], scale: [0.98, 1] },
      { at: 0.82, rotate: -1 },
      { at: 1, rotate: 0, skew: [0, 0] },
    ],
  },
  /** A hop and a stamp that squashes it flat, never quite fierce. */
  stomp: {
    kind: 'keys',
    period: 2,
    keys: [
      { at: 0, translate: [0, 0] },
      { at: 0.18, translate: [0, -11.6], scale: [0.95, 1.06] },
      { at: 0.32, translate: [0, 0], scale: [1.1, 0.88] },
      { at: 0.42, scale: [0.98, 1.02] },
      { at: 0.52, scale: 1 },
      { at: 0.66, rotate: -4 },
      { at: 0.82, rotate: 4 },
      { at: 1, rotate: 0 },
    ],
  },
  /** Swaying slowly from its cord. */
  sway: {
    kind: 'keys',
    period: 3,
    keys: [
      { at: 0, rotate: 7, skew: [-3, 0] },
      { at: 0.5, rotate: -7, skew: [3, 0] },
      { at: 1, rotate: 7, skew: [-3, 0] },
    ],
  },
  /** Rolling to and fro on the table. */
  roll: {
    kind: 'keys',
    period: 2.8,
    keys: [
      { at: 0, translate: [-6.8, 0], rotate: -14 },
      { at: 0.5, translate: [6.8, 0], rotate: 14 },
      { at: 1, translate: [-6.8, 0], rotate: -14 },
    ],
  },
  /** Bounding forward, head down at the top of each jump as if to butt. */
  bound: {
    kind: 'keys',
    period: 1.8,
    keys: [
      { at: 0, translate: [0, 0] },
      { at: 0.12, scale: [1.06, 0.93] },
      { at: 0.34, translate: [0, -14.5], rotate: -7 },
      { at: 0.56, translate: [0, 0], scale: [1.07, 0.93], rotate: 2 },
      { at: 0.7, translate: [0, 0], rotate: 0 },
      { at: 1, translate: [0, 0] },
    ],
  },
  /** Wriggling forward, now and then leaping out of the water. */
  swim: {
    kind: 'keys',
    period: 3.6,
    keys: [
      { at: 0, translate: [-3.9, 0], rotate: -3, skew: [0, 2] },
      { at: 0.25, translate: [0, 0], rotate: 2, skew: [0, -2] },
      { at: 0.5, translate: [3.9, 0], rotate: -2, skew: [0, 2] },
      { at: 0.64, translate: [1.9, -15.5], rotate: -12 },
      { at: 0.76, translate: [0, 0], rotate: 4, skew: [0, -2] },
      { at: 1, translate: [-3.9, 0], rotate: -3, skew: [0, 2] },
    ],
  },
  /** Set down and rocking on its round bottom, smaller each time. */
  rock: {
    kind: 'keys',
    period: 2.8,
    keys: [
      { at: 0, rotate: 0 },
      { at: 0.1, rotate: 9 },
      { at: 0.22, rotate: -7 },
      { at: 0.34, rotate: 4.5 },
      { at: 0.46, rotate: -2.5 },
      { at: 0.58, rotate: 1 },
      { at: 0.68, rotate: 0 },
      { at: 1, rotate: 0 },
    ],
  },
};
