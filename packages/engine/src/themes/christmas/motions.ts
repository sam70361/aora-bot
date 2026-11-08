/**
 * The Christmas signature motions, as the lab played them: each new
 * character's whole figure moves about its pivot, the tree's star twinkles,
 * the reindeer's nose glows, snow falls round the snowman, flakes settle in
 * the globe and steam curls off the cocoa. Moves are in the art's 100-unit
 * box, which the lab's percentages of the figure box come to. Everything
 * rests while the character sleeps, as the lab paused it.
 */
import type { PartMotion } from '../extras/index.js';

const AWAKE = { except: { moods: ['drowsy'] } } as const;

export const MOTIONS: Readonly<Record<string, PartMotion>> = {
  /** The tree, from the foot of its trunk. */
  sway: { kind: 'rotate', amplitude: 3, period: 3.6, when: AWAKE },
  /** The snowman, a tumbler that rests a moment at each end. */
  rock: {
    kind: 'keys',
    period: 3,
    when: AWAKE,
    keys: [
      { at: 0, rotate: -7 },
      { at: 0.12, rotate: -7.5 },
      { at: 0.45, rotate: 7 },
      { at: 0.58, rotate: 7.5 },
      { at: 1, rotate: -7 },
    ],
  },
  /** The gingerbread's jig, hopping and leaning toward the lifted foot. */
  jig: {
    kind: 'keys',
    period: 1.3,
    when: AWAKE,
    keys: [
      { at: 0, translate: [0, 0], rotate: 0 },
      { at: 0.2, translate: [0, -7], rotate: -7 },
      { at: 0.4, translate: [0, 0], rotate: 0 },
      { at: 0.6, translate: [0, -7], rotate: 7 },
      { at: 0.8, translate: [0, 0], rotate: 0 },
      { at: 1, translate: [0, 0], rotate: 0 },
    ],
  },
  /** The reindeer's two quick hops, then a rest. */
  prance: {
    kind: 'keys',
    period: 1.8,
    when: AWAKE,
    keys: [
      { at: 0, translate: [0, 0], rotate: 0 },
      { at: 0.15, translate: [0, -6], rotate: -3 },
      { at: 0.3, translate: [0, 0], rotate: 0 },
      { at: 0.45, translate: [0, -6], rotate: -3 },
      { at: 0.6, translate: [0, 0], rotate: 0 },
      { at: 1, translate: [0, 0], rotate: 0 },
    ],
  },
  /** The stocking from its loop, the bauble from its hook. */
  swing: { kind: 'rotate', amplitude: 9, period: 2.6, when: AWAKE },
  /** The cane tips forward on its foot, taps twice and springs back past upright. */
  tap: {
    kind: 'keys',
    period: 2.2,
    when: AWAKE,
    keys: [
      { at: 0, rotate: 0 },
      { at: 0.22, rotate: -12 },
      { at: 0.3, rotate: -9 },
      { at: 0.38, rotate: -12 },
      { at: 0.58, rotate: 2 },
      { at: 0.7, rotate: 0 },
      { at: 1, rotate: 0 },
    ],
  },
  /** The globe shakes itself, the shake dying away, then rests. */
  shake: {
    kind: 'keys',
    period: 4,
    easing: 'linear',
    when: AWAKE,
    keys: [
      { at: 0, rotate: 0 },
      { at: 0.03, rotate: -7 },
      { at: 0.06, rotate: 6 },
      { at: 0.09, rotate: -6 },
      { at: 0.12, rotate: 5 },
      { at: 0.15, rotate: -3 },
      { at: 0.18, rotate: 2 },
      { at: 0.22, rotate: 0 },
      { at: 1, rotate: 0 },
    ],
  },
  /** Santa's three belly laughs, then a beat. */
  hoho: {
    kind: 'keys',
    period: 2.6,
    when: AWAKE,
    keys: [
      { at: 0, translate: [0, 0], scale: 1 },
      { at: 0.06, translate: [0, 0], scale: [1.05, 0.93] },
      { at: 0.14, translate: [0, -3], scale: [0.98, 1.04] },
      { at: 0.22, translate: [0, 0], scale: [1.05, 0.93] },
      { at: 0.3, translate: [0, -3], scale: [0.98, 1.04] },
      { at: 0.38, translate: [0, 0], scale: [1.05, 0.93] },
      { at: 0.46, translate: [0, -3], scale: [0.98, 1.04] },
      { at: 0.52, translate: [0, 0], scale: 1 },
      { at: 1, translate: [0, 0], scale: 1 },
    ],
  },
  /** The mug rocks, comfortable. */
  cosy: { kind: 'rotate', amplitude: 2.5, period: 4.2, when: AWAKE },
  /** The star on the tree, turning a little as it brightens and dims. */
  twinkle: {
    kind: 'keys',
    period: 1.6,
    when: AWAKE,
    keys: [
      { at: 0, scale: 0.94, rotate: 0 },
      { at: 0.5, scale: 1.08, rotate: 12 },
      { at: 1, scale: 0.94, rotate: 0 },
    ],
  },
  /** The reindeer's nose, swelling as it lights up in time with the hops. */
  glow: { kind: 'scale', amplitude: 0.12, period: 1.8, when: AWAKE },
  /** Snow round the snowman, drifting down through the figure's box. */
  snow: {
    kind: 'emit',
    count: 7,
    period: 6.5,
    vary: 0.45,
    at: [48, -8],
    spread: [106, 0],
    travel: [2, 95],
    turn: 200,
    fade: [0.15, 0.15],
    glyph: 'flake',
    size: 8,
    paint: { from: { color: 'sky' }, lightness: [0.68, 0.74], chroma: 0.08 },
    when: AWAKE,
  },
  /** Flakes settling through the middle of the globe's glass. */
  flakes: {
    kind: 'emit',
    count: 10,
    period: 4.2,
    vary: 0.2,
    easing: 'ease-in',
    at: [50, 21],
    spread: [29, 0],
    travel: [0, 33],
    fade: [0.3, 0.15],
    glyph: 'dot',
    size: 4,
    paint: { color: 'snow' },
    when: AWAKE,
  },
  /** Three wisps of steam rising off the cocoa. */
  steam: {
    kind: 'emit',
    count: 3,
    period: 2.7,
    easing: 'ease-out',
    at: [45, 22],
    spread: [21, 0],
    travel: [0, -14],
    from: 0.7,
    grow: 1.15,
    fade: [0.3, 0.6],
    glyph: 'steam',
    size: 17,
    paint: { from: 'contrast', mix: { with: 'page', share: 45 } },
    when: AWAKE,
  },
};
