/**
 * The Halloween members' signature motions, small enough that the sticker
 * edge, worked out at rest, still covers what moves: a part turns a few
 * degrees about where it is held, a figure moves as a whole. Moves are in the
 * art's 100-unit box; the art names each motion and its pivot
 * (`scripts/art/halloween.ts`). Everything rests while the member sleeps.
 */
import type { ThemePackage } from '../types.js';

const AWAKE = { except: { moods: ['drowsy'] } } as const;

export const MOTIONS: NonNullable<ThemePackage['motions']> = {
  /** The mummy's loose bandage end, lifting and settling in a draught. */
  flutter: {
    kind: 'keys',
    period: 1.9,
    when: AWAKE,
    keys: [
      { at: 0, rotate: 0 },
      { at: 0.22, rotate: -5 },
      { at: 0.4, rotate: 2 },
      { at: 0.58, rotate: -3 },
      { at: 0.76, rotate: 1 },
      { at: 1, rotate: 0 },
    ],
  },
  /** The spider swaying on its thread, hung from the top of it. */
  sway: { kind: 'rotate', amplitude: 5, period: 3, when: AWAKE },
  /** Bubbles rising off the cauldron's brew and fading. */
  brew: {
    kind: 'emit',
    count: 3,
    period: 3.4,
    vary: 0.3,
    at: [51, 30],
    spread: [24, 0],
    travel: [2, -20],
    from: 0.5,
    grow: 1.1,
    fade: [0.2, 0.4],
    glyph: 'bubble',
    size: 9,
    paint: { from: { color: 'green' }, lightness: [0.82, 0.9], chroma: 0.19 },
    when: AWAKE,
  },
  /** The candle's flame leaning and stretching from its base. */
  flicker: {
    kind: 'keys',
    period: 1.4,
    when: AWAKE,
    keys: [
      { at: 0, skew: [0, 0], scale: 1 },
      { at: 0.25, skew: [-4, 0], scale: [0.95, 1.06] },
      { at: 0.5, skew: [3, 0], scale: [1.04, 0.96] },
      { at: 0.75, skew: [-2, 0], scale: [0.97, 1.04] },
      { at: 1, skew: [0, 0], scale: 1 },
    ],
  },
  /** The ghost hovering, rising and tipping a little as it floats. */
  hover: {
    kind: 'keys',
    period: 3.2,
    when: AWAKE,
    keys: [
      { at: 0, translate: [0, 0], rotate: 0 },
      { at: 0.5, translate: [0, -3], rotate: -2 },
      { at: 1, translate: [0, 0], rotate: 0 },
    ],
  },
  /** Two quick flaps of the bat's wings, then a rest. */
  flap: {
    kind: 'keys',
    period: 3.2,
    when: AWAKE,
    keys: [
      { at: 0, translate: [0, 0], scale: 1 },
      { at: 0.07, translate: [0, -2.5], scale: [1.05, 0.95] },
      { at: 0.14, translate: [0, 0], scale: 1 },
      { at: 0.21, translate: [0, -2.5], scale: [1.05, 0.95] },
      { at: 0.28, translate: [0, 0], scale: 1 },
      { at: 1, translate: [0, 0], scale: 1 },
    ],
  },
  /** The wisp drifting like a breeze, its head rising and leaning into the wind. */
  drift: {
    kind: 'keys',
    period: 3.8,
    when: AWAKE,
    keys: [
      { at: 0, translate: [0, 0], rotate: 0 },
      { at: 0.5, translate: [1.5, -3], rotate: 3 },
      { at: 1, translate: [0, 0], rotate: 0 },
    ],
  },
  /** The skull clattering when it laughs: a quick rattle from the chin, then still. */
  chatter: {
    kind: 'keys',
    period: 1.8,
    when: { moods: ['bright'] },
    keys: [
      { at: 0, rotate: 0, translate: [0, 0] },
      { at: 0.06, rotate: -3, translate: [0, -1] },
      { at: 0.12, rotate: 3, translate: [0, 0] },
      { at: 0.18, rotate: -2, translate: [0, -1] },
      { at: 0.24, rotate: 1, translate: [0, 0] },
      { at: 0.3, rotate: 0, translate: [0, 0] },
      { at: 1, rotate: 0, translate: [0, 0] },
    ],
  },
  /** A lit window or a carved face glowing unevenly, as a candle behind it does. */
  glow: {
    kind: 'keys',
    period: 2.2,
    when: AWAKE,
    keys: [
      { at: 0, opacity: 1 },
      { at: 0.2, opacity: 0.7 },
      { at: 0.32, opacity: 1 },
      { at: 0.58, opacity: 0.8 },
      { at: 0.7, opacity: 1 },
      { at: 1, opacity: 1 },
    ],
  },
};
