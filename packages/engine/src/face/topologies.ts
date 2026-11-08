/**
 * Eye topologies.
 *
 * Every expression is a curved stroke: a centreline of half-length `len`
 * pointing along `angle`, bowed sideways by `bend`, given thickness `width`,
 * and capped round at both ends. Eighteen presets cover the whole emotional
 * range.
 *
 * Describing eyes as parameters rather than as digitised outlines has one
 * concrete payoff: morphing between two expressions is a plain interpolation
 * of five numbers, so the shape between "closed" and "wide open" is always a
 * valid eye. Interpolating raw point rings instead lets points cross over each
 * other mid-transition, which is why implementations that store outlines have
 * to reconstruct an axis before they can blend.
 *
 * Units are relative to the fitted eye radius, so a topology renders correctly
 * on every body without per-shape adjustment.
 */
export interface EyeSpec {
  /** Offset from the eye anchor. */
  dx: number;
  dy: number;
  /** Half-length of the centreline. */
  len: number;
  /** Half-thickness of the stroke. */
  width: number;
  /** Direction of the centreline in radians. 0 is horizontal, PI/2 vertical. */
  angle: number;
  /** Sideways bow of the midpoint. Negative arcs upward. */
  bend: number;
  /** A second stroke drawn with the first: the other bar of an x, or a slanted brow. */
  extra?: EyeExtra;
  /** 0..1: how far the eye has become a four-pointed star, which takes the place of the stroke. */
  star?: number;
}

/**
 * The second stroke of an eye. Same fields as the first, positioned relative
 * to the eye's anchor, plus `amount`: 0 is absent, 1 is fully grown. A stroke
 * that arrives grows out of its own middle, so morphing a dot into an x or a
 * sad dot into a happy arc never pops a part in or out.
 */
export interface EyeExtra {
  dx: number;
  dy: number;
  len: number;
  width: number;
  angle: number;
  bend: number;
  amount: number;
}

export type EyePair = readonly [EyeSpec, EyeSpec];

const eye = (
  len: number,
  width: number,
  angle: number,
  {
    dx = 0,
    dy = 0,
    bend = 0,
    extra,
    star,
  }: Partial<Pick<EyeSpec, 'dx' | 'dy' | 'bend' | 'extra' | 'star'>> = {},
): EyeSpec => ({
  dx,
  dy,
  len,
  width,
  angle,
  bend,
  // Left out rather than set to undefined, so specs without them carry no such key.
  ...(extra ? { extra } : null),
  ...(star ? { star } : null),
});

/** Mirror a spec across the vertical axis, for the opposite eye. */
const mirror = (s: EyeSpec): EyeSpec => ({
  ...s,
  dx: -s.dx,
  angle: -s.angle,
  bend: -s.bend,
  ...(s.extra
    ? { extra: { ...s.extra, dx: -s.extra.dx, angle: -s.extra.angle, bend: -s.extra.bend } }
    : null),
});

const both = (s: EyeSpec): EyePair => [s, { ...s }];
const opposed = (s: EyeSpec): EyePair => [s, mirror(s)];

const V = Math.PI / 2;

export const EYE_TOPOLOGIES = {
  /** Default open eye — a tall rounded oval. */
  neutral: both(eye(0.5, 0.52, V)),
  /** Marginally smaller neutral, used to vary long idles without reading as a blink. */
  neutralSoft: both(eye(0.46, 0.49, V)),
  /** Fully closed. */
  closed: both(eye(0.62, 0.06, 0)),
  /** Half-lidded. */
  half: both(eye(0.28, 0.52, V)),
  /** Startled, wide. */
  wide: both(eye(0.62, 0.66, V)),
  /** Smiling arc. */
  happy: both(eye(0.58, 0.115, 0, { bend: -0.3 })),
  /** Broad grin — flatter and longer than `happy`. */
  joyful: both(eye(0.66, 0.1, 0, { bend: -0.38 })),
  /** Brows drawn down towards the nose. */
  angry: opposed(eye(0.5, 0.28, 0.42)),
  /** Narrowed, thinking it over. */
  squint: both(eye(0.55, 0.16, 0)),
  /** Glancing left. */
  lookLeft: both(eye(0.48, 0.5, V, { dx: -0.3 })),
  /** Glancing right. */
  lookRight: both(eye(0.48, 0.5, V, { dx: 0.3 })),
  /** Looking up, as when recalling something. */
  lookUp: both(eye(0.46, 0.5, V, { dy: -0.26 })),
  /** Cast down, bashful. */
  shy: both(eye(0.32, 0.48, V, { dy: 0.2 })),
  /** One eye narrowed — doubt. */
  suspicious: [eye(0.24, 0.48, V), eye(0.48, 0.5, V)] as const,
  /** Drooping, about to fall asleep. */
  sleepy: both(eye(0.56, 0.13, 0, { bend: 0.2 })),
  /** Bright and vertical, keyed up. */
  excited: both(eye(0.64, 0.46, V)),
  /** Small circles — dazed. */
  dizzy: both(eye(0.26, 0.26, 0)),
  /** One eye a smiling arc, the other open — a wink. */
  wink: [eye(0.56, 0.11, 0, { bend: -0.28 }), eye(0.48, 0.5, V)] as const,
} satisfies Record<string, EyePair>;

export type EyeTopologyId = keyof typeof EYE_TOPOLOGIES;

export const EYE_TOPOLOGY_IDS = Object.keys(EYE_TOPOLOGIES) as EyeTopologyId[];

/*
 * The cute face's eyes, in the same language.
 *
 * Units are cute-eye radii: 1 is the radius of the resting round dot, and
 * every number below is a design coordinate divided by 4.6, so a dot, an
 * arc, an x and a star keep the proportions they were drawn with. The face
 * places them at the cute radius with no horizontal stretch, which is why a
 * dot is a round stroke of almost no length rather than the tall oval
 * `neutral` is.
 */

/** A round dot: a stroke too short to be anything but a circle, `width` its radius. */
const dotEye = (width: number, offset: Partial<Pick<EyeSpec, 'dx' | 'dy'>> = {}): EyePair =>
  both(eye(0.02, width, V, offset));

/** The slanted brow of a sad or angry eye, for the left eye; the right mirrors it. */
const brow = (angle: number, dy: number): EyeExtra => ({
  dx: -0.11,
  dy,
  len: 1.05,
  width: 0.3,
  angle,
  bend: 0,
  amount: 1,
});

const LOOK = 0.45;

export const CUTE_EYE_TOPOLOGIES = {
  /** Resting dot. */
  dot: dotEye(1),
  /** Small dot, the pupil of a frightened eye. */
  dotSmall: dotEye(0.62),
  /** Wide dot, startled or keyed up. */
  dotWide: dotEye(1.35),
  dotLeft: dotEye(1, { dx: -LOOK }),
  dotRight: dotEye(1, { dx: LOOK }),
  dotUp: dotEye(1, { dy: -LOOK }),
  /** Cast down at the work. */
  dotDown: dotEye(0.96, { dy: 0.39 }),
  /** Glancing up and to the side, as when thinking something over. */
  dotLook: dotEye(1, { dx: 0.43, dy: -0.48 }),
  /** Half-lidded: a dot squashed into a pill. */
  dotHalf: both(eye(0.45, 0.45, 0, { dy: 0.2 })),
  /** One eye half-lidded, the other open — doubt. */
  dotSuspicious: [eye(0.45, 0.45, 0, { dy: 0.2 }), eye(0.02, 1, V)] as const,
  /** Smiling arc. */
  arch: both(eye(1.09, 0.37, 0, { dy: 0.43, bend: -0.87 })),
  /** A broader, higher smile. */
  archWide: both(eye(1.2, 0.34, 0, { dy: 0.45, bend: -1.02 })),
  /** Closed eye, a downward arc. */
  curve: both(eye(1.09, 0.37, 0, { bend: 0.43 })),
  /** Closed and drooping. */
  curveSleepy: both(eye(1.0, 0.34, 0, { dy: 0.1, bend: 0.62 })),
  /** An x: two crossed strokes. */
  cross: both(
    eye(1.23, 0.37, Math.PI / 4, {
      extra: { dx: 0, dy: 0, len: 1.23, width: 0.37, angle: -Math.PI / 4, bend: 0, amount: 1 },
    }),
  ),
  /** A four-pointed star. */
  star: both(eye(0.02, 0.2, V, { star: 1 })),
  /** A dot under a brow that falls away to the outside. */
  sad: opposed(eye(0.02, 0.91, V, { dy: 0.26, extra: brow(-0.38, -1.48) })),
  /** A dot under a brow that drops towards the nose. */
  mad: opposed(eye(0.02, 0.95, V, { dy: 0.12, extra: brow(0.4, -1.4) })),
  /** One eye a smiling arc, the other a dot. */
  wink: [eye(1.0, 0.36, 0, { dy: 0.43, bend: -0.8 }), eye(0.02, 1, V)] as const,
} satisfies Record<string, EyePair>;

export type CuteEyeId = keyof typeof CUTE_EYE_TOPOLOGIES;

export const CUTE_EYE_IDS = Object.keys(CUTE_EYE_TOPOLOGIES) as CuteEyeId[];

/** Either table's expression, for the places that pin one by name. */
export type ExpressionId = EyeTopologyId | CuteEyeId;

/** The cute eye nearest each line-face expression, so a pinned `happy` still means something on the cute face. */
const EYE_TO_CUTE: Record<EyeTopologyId, CuteEyeId> = {
  neutral: 'dot',
  neutralSoft: 'dot',
  closed: 'curve',
  half: 'dotHalf',
  wide: 'dotWide',
  happy: 'arch',
  joyful: 'archWide',
  angry: 'mad',
  squint: 'dotHalf',
  lookLeft: 'dotLeft',
  lookRight: 'dotRight',
  lookUp: 'dotUp',
  shy: 'dotDown',
  suspicious: 'dotSuspicious',
  sleepy: 'curveSleepy',
  excited: 'dotWide',
  dizzy: 'cross',
  wink: 'wink',
};

/** The cute expression a name means: itself when it is one, its nearest cute eye when it is a line-face name, else the resting dot. */
export function cuteNameFor(id: string): CuteEyeId {
  if (id in CUTE_EYE_TOPOLOGIES) return id as CuteEyeId;
  return EYE_TO_CUTE[id as EyeTopologyId] ?? 'dot';
}

/**
 * The eye pair a name means on a given face. The cute face reads cute names
 * and translates line-face ones; the other faces read only their own, and fall
 * back to the resting eye for a name they do not have.
 */
export function eyePairFor(cute: boolean, id: string): EyePair {
  if (cute) {
    const own = (CUTE_EYE_TOPOLOGIES as Record<string, EyePair>)[id];
    return own ?? CUTE_EYE_TOPOLOGIES[EYE_TO_CUTE[id as EyeTopologyId] ?? 'dot'];
  }
  return (EYE_TOPOLOGIES as Record<string, EyePair>)[id] ?? EYE_TOPOLOGIES.neutral;
}
