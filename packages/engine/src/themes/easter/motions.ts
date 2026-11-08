/**
 * The Easter members' signature motions, each the whole figure moving about
 * a point chosen for what it is: the egg cup's foot, the basket's handle,
 * the carrot's tip, the daisy's stem. Moves are in the art's 100-unit box;
 * each figure's art names its motion and that point (`motion` and `pivot`
 * in `scripts/art/easter.js`). As in the lab, most play in the first third
 * or so of the period and then hold still, so the state's own motion leads
 * the rest of the time, and they play in every state.
 */
import type { ThemePackage } from '../types.js';

export const MOTIONS: NonNullable<ThemePackage['motions']> = {
  /** Dapple rocks in its cup like a roly-poly, twice, and settles. */
  rock: {
    kind: 'keys',
    period: 4.6,
    keys: [
      { at: 0, rotate: 0 },
      { at: 0.06, rotate: -10 },
      { at: 0.14, rotate: 8 },
      { at: 0.22, rotate: -5 },
      { at: 0.3, rotate: 2.5 },
      { at: 0.4, rotate: 0 },
      { at: 1, rotate: 0 },
    ],
  },
  /** Wicker swings to and fro, as if lifted by its handle. */
  swing: {
    kind: 'keys',
    period: 4.6,
    keys: [
      { at: 0, rotate: 0 },
      { at: 0.08, rotate: 11 },
      { at: 0.18, rotate: -8 },
      { at: 0.28, rotate: 5 },
      { at: 0.38, rotate: -2 },
      { at: 0.48, rotate: 0 },
      { at: 1, rotate: 0 },
    ],
  },
  /** Cocoa slumps a little in the sun and slowly stands up again. */
  melt: {
    kind: 'keys',
    period: 5.4,
    keys: [
      { at: 0, scale: 1 },
      { at: 0.22, scale: [1.08, 0.88] },
      { at: 0.36, scale: [1.08, 0.88] },
      { at: 0.62, scale: 1 },
      { at: 1, scale: 1 },
    ],
  },
  /** Crunchy, as if just pulled up: a squat, a spring up and a bounce. */
  pop: {
    kind: 'keys',
    period: 4.6,
    keys: [
      { at: 0, translate: [0, 0], scale: 1 },
      { at: 0.08, translate: [0, 0], scale: [1.07, 0.86] },
      { at: 0.17, translate: [0, -16], scale: [0.93, 1.1] },
      { at: 0.26, translate: [0, 0], scale: [1.06, 0.92] },
      { at: 0.33, translate: [0, 0], scale: [0.98, 1.02] },
      { at: 0.4, translate: [0, 0], scale: 1 },
      { at: 1, translate: [0, 0], scale: 1 },
    ],
  },
  /** Posy nods either way in the wind, about the root of its stem. */
  sway: {
    kind: 'keys',
    period: 3.4,
    keys: [
      { at: 0, rotate: -5 },
      { at: 0.5, rotate: 5 },
      { at: 1, rotate: -5 },
    ],
  },
  /** Breezy beats its wings twice and floats up on the air. */
  flutter: {
    kind: 'keys',
    period: 4.6,
    keys: [
      { at: 0, translate: [0, 0], scale: 1 },
      { at: 0.05, translate: [0, -2], scale: [0.72, 1] },
      { at: 0.1, translate: [0, -5], scale: 1 },
      { at: 0.15, translate: [0, -8], scale: [0.72, 1] },
      { at: 0.2, translate: [0, -11], scale: 1 },
      { at: 0.32, translate: [0, -6], scale: 1 },
      { at: 0.46, translate: [0, 0], scale: 1 },
      { at: 1, translate: [0, 0], scale: 1 },
    ],
  },
  /** Peeky wriggles in its shell and pushes up, the cap bouncing on its head. */
  peek: {
    kind: 'keys',
    period: 4.6,
    keys: [
      { at: 0, rotate: 0, translate: [0, 0], scale: 1 },
      { at: 0.05, rotate: -5, translate: [0, 0], scale: 1 },
      { at: 0.1, rotate: 5, translate: [0, 0], scale: 1 },
      { at: 0.15, rotate: -3, translate: [0, 0], scale: 1 },
      { at: 0.22, rotate: 0, translate: [0, -9], scale: [0.97, 1.05] },
      { at: 0.3, rotate: 0, translate: [0, 0], scale: [1.04, 0.95] },
      { at: 0.35, rotate: 0, translate: [0, 0], scale: 1 },
      { at: 1, rotate: 0, translate: [0, 0], scale: 1 },
    ],
  },
};
