/**
 * Line-face features: the mouth and the nose.
 *
 * The default face is two eyes and a silhouette. The line face adds the two
 * features a stroked body wants — a nose to anchor the face and a mouth to
 * carry the emotion the eyes cannot — without adding a second colour or a
 * second visual language. Everything here is a stroke at one shared weight.
 *
 * The mouth is parametric (`MouthSpec`) so that states morph into each other
 * on a spring. The nose is a fixed polyline chosen once per character.
 */
import { clamp, lerp } from '../math/easing.js';
import {
  MOUTH_IDS,
  NOSE_IDS,
  type CuteMouthId,
  type MouthId,
  type MouthSpec,
  type NoseId,
  type Point,
} from '../core/types.js';

export { MOUTH_IDS, NOSE_IDS };

/**
 * Stroke weight for nose, mouth and thin eye expressions, as a fraction of the
 * fitted eye radius. Recomputed per frame so it scales with the body exactly
 * as the eyes do.
 */
export const LINE_WEIGHT = 0.34;

/** How far a character may stray from the shared line weight, either way. */
export const LINE_WEIGHT_RANGE = [0.8, 1.25] as const;

/**
 * Resolve a per-character line weight from a multiplier.
 *
 * The range is deliberately narrow. The weight is shared by the nose, the
 * mouth and the HUD dials, so it is the one number that decides whether a
 * character reads as drawn with a pen or with a marker; letting a host set
 * it freely would let one character in a list arrive at a different weight
 * from its neighbours and break the set.
 */
export function resolveLineWeight(multiplier?: number): number {
  const m = multiplier == null || !Number.isFinite(multiplier) ? 1 : multiplier;
  return LINE_WEIGHT * clamp(m, LINE_WEIGHT_RANGE[0], LINE_WEIGHT_RANGE[1]);
}

/**
 * Eye size multipliers applied in line mode.
 *
 * The default eyes are large cut-outs sized to carry a face alone. Next to a
 * nose and a mouth they crowd the plate, so they shrink towards the dot
 * proportions of a drawn face. The floor `LINE_WEIGHT` sets keeps the thin
 * expressions at exactly the feature weight.
 */
export const LINE_FACE_TUNE = { eyeWidth: 0.66, eyeHeight: 0.66 } as const;

/** Where the nose sits below the eye line, in eye radii. */
export const NOSE_DROP = 0.86;
/** Where the mouth sits below the eye line, in eye radii. */
export const MOUTH_DROP = 2.3;
/** Fraction of the eyes' gaze offset the nose and mouth follow. */
export const NOSE_GAZE = 0.6;
export const MOUTH_GAZE = 0.5;

/*
 * Mouth specs are written in "mouth units" and scaled here, so the whole
 * vocabulary can be resized against the eyes without retouching eleven
 * entries. 1 mouth unit = MOUTH_SCALE eye radii.
 */
const MOUTH_SCALE = 1.5;

const mouth = (width: number, bend: number, open = 0, { wave = 0, skew = 0, dy = 0 } = {}): MouthSpec => ({
  width: width * MOUTH_SCALE,
  bend: bend * MOUTH_SCALE,
  open: open * MOUTH_SCALE,
  wave: wave * MOUTH_SCALE,
  skew,
  dy: dy * MOUTH_SCALE,
});

/** The thirteen mouths. Together they cover every state; see `STATE_MOUTH`. */
export const MOUTHS: Record<MouthId, MouthSpec> = {
  /** Straight line — neutral, attentive. */
  flat: mouth(0.5, 0),
  /** Barely-there curve, the resting mouth. */
  soft: mouth(0.5, 0.09),
  /** Clear smile. */
  smile: mouth(0.6, 0.22),
  /** Wide smile with a sliver of opening. */
  grin: mouth(0.7, 0.26, 0.14),
  /** One corner up. */
  smirk: mouth(0.5, 0.15, 0, { skew: 0.7 }),
  /** Small round "o". */
  o: mouth(0.24, 0, 0.48),
  /** Open laugh. */
  open: mouth(0.5, 0.14, 0.62),
  /** Tiny dot — concentration. */
  dot: mouth(0.1, 0, 0.2),
  /** Zig-zag — unease, confusion. */
  wavy: mouth(0.55, 0, 0, { wave: 0.11 }),
  /** Downturned. */
  frown: mouth(0.5, -0.18),
  /** Small, slightly downturned and lower. */
  pout: mouth(0.3, -0.1, 0, { dy: 0.06 }),
  /**
   * Closed and content, with a ripple running through it.
   *
   * A smile would say "pleased"; the point of this one is that the mouth is
   * shut and something is coming out anyway, which is what the ripple is
   * for. Kept narrow so it does not read as a grin at sixteen pixels.
   */
  hum: mouth(0.34, 0.14, 0, { wave: 0.05 }),
  /** Pressed shut — short, flat and a shade lower than `flat`. */
  tight: mouth(0.32, 0, 0, { dy: 0.04 }),
};

export const getMouth = (id: MouthId): MouthSpec => MOUTHS[id] ?? MOUTHS.flat;

/*
 * The cute face's mouths.
 *
 * Written straight in eye radii, with no `MOUTH_SCALE`, because the cute face
 * sizes everything from one dot: each number is a design coordinate
 * divided by 4.6, the resting dot's radius in that grid. The filled ones
 * (grin, laugh, o) have no upper lip above the line, which gives them the flat
 * top of a "D".
 */
const cute = (
  width: number,
  bend: number,
  open = 0,
  { wave = 0, skew = 0, dy = 0, cat, upper, show }: Partial<MouthSpec> = {},
): MouthSpec => ({
  width,
  bend,
  open,
  wave,
  skew,
  dy,
  ...(cat != null ? { cat } : null),
  ...(upper != null ? { upper } : null),
  ...(show != null ? { show } : null),
});

export const CUTE_MOUTHS: Record<CuteMouthId, MouthSpec> = {
  /** No mouth at all: a flat line that is not drawn. */
  none: cute(0.76, 0, 0, { dy: 0.22, show: 0 }),
  smile: cute(1.09, 0.54),
  /** The two small bumps of a cat's ω. */
  cat: cute(1.3, 0, 0, { cat: 0.43 }),
  /** An open smile with a flat top. */
  grin: cute(1.41, 0, 1.74, { dy: -0.22, upper: 0 }),
  /** A wider open smile. */
  laugh: cute(1.6, 0, 2.3, { dy: -0.3, upper: 0 }),
  flat: cute(0.76, 0, 0, { dy: 0.22 }),
  frown: cute(1.09, -0.54, 0, { dy: 0.65 }),
  /** An open oval. */
  o: cute(0.65, 0, 1.57, { dy: 0.22, upper: 0.5 }),
  /** The smallest o. */
  dot: cute(0.24, 0, 0.5, { dy: 0.1, upper: 0.5 }),
  wavy: cute(1.52, 0, 0, { dy: 0.22, cat: -0.54 }),
  smirk: cute(1.0, 0.35, 0, { skew: 0.7 }),
  pout: cute(0.6, -0.3, 0, { dy: 0.5 }),
};

export const getCuteMouth = (id: CuteMouthId): MouthSpec => CUTE_MOUTHS[id] ?? CUTE_MOUTHS.flat;

/** The mouth a name means on a given face, or `undefined` when that face has no such mouth. */
export function mouthSpecFor(isCute: boolean, id: string): MouthSpec | undefined {
  return (isCute ? (CUTE_MOUTHS as Record<string, MouthSpec>) : (MOUTHS as Record<string, MouthSpec>))[id];
}

/** Blend two mouths. Every field is independent, so the result is always a valid mouth. */
export function morphMouth(a: MouthSpec, b: MouthSpec, t: number): MouthSpec {
  const out: MouthSpec = {
    width: lerp(a.width, b.width, t),
    bend: lerp(a.bend, b.bend, t),
    open: lerp(a.open, b.open, t),
    wave: lerp(a.wave, b.wave, t),
    skew: lerp(a.skew, b.skew, t),
    dy: lerp(a.dy, b.dy, t),
  };
  if (a.cat != null || b.cat != null) out.cat = lerp(a.cat ?? 0, b.cat ?? 0, t);
  if (a.upper != null || b.upper != null) out.upper = lerp(a.upper ?? UPPER_SHARE, b.upper ?? UPPER_SHARE, t);
  if (a.show != null || b.show != null) out.show = lerp(a.show ?? 1, b.show ?? 1, t);
  return out;
}

/** Share of the opening that sits above the lip line, unless a mouth says otherwise. */
const UPPER_SHARE = 0.38;

/**
 * Convert a mouth spec into a closed outline: the upper lip left to right,
 * the lower lip back.
 *
 * The lip line is a parabola through the two corners, bowed by `bend` with
 * its apex pushed towards a corner by `skew`, plus one sine ripple of
 * amplitude `wave`. The opening is an ellipse-like lens split unevenly — the
 * lower lip drops further than the upper one rises, as a real mouth opens.
 * When `open` is 0 the two lips coincide and only the stroke is visible, so
 * a closed mouth opening into an "o" is one continuous shape.
 *
 * Output is meant to be stroked at `LINE_WEIGHT`, not filled.
 */
export function mouthOutline(spec: MouthSpec, radius: number, samples = 16): Point[] {
  const { width, bend, open, wave, skew, dy } = spec;
  const W = width * radius;
  const B = bend * radius;
  const O = open * radius;
  const A = wave * radius;
  const Y = dy * radius;
  const C = (spec.cat ?? 0) * radius;
  const UPPER = spec.upper ?? UPPER_SHARE;

  const lip = (u: number): number => {
    const bow = B * (1 - u * u) * (1 + skew * u);
    const ripple = A * Math.sin(Math.PI * u);
    // Two bumps, one under each half: zero at the corners and the middle.
    const bumps = C * 0.5 * (1 - Math.cos(2 * Math.PI * u));
    return Y + bow + ripple + bumps;
  };
  const lens = (u: number): number => O * Math.sqrt(Math.max(0, 1 - u * u));

  const upper: Point[] = [];
  const lower: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const u = -1 + (2 * i) / samples;
    const x = u * W;
    const y = lip(u);
    const gap = lens(u);
    upper.push([x, y - gap * UPPER]);
    lower.push([x, y + gap * (1 - UPPER)]);
  }
  lower.reverse();
  // The corners are shared; drop the duplicated end points so the closed
  // path has no zero-length segment at either corner.
  return upper.concat(lower.slice(1, -1));
}

/** Signed area of a closed polygon, for tests and for deciding whether to fill. */
export function polygonArea(points: readonly Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]!;
    const [x2, y2] = points[(i + 1) % points.length]!;
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

// ---- Noses ------------------------------------------------------------------

/*
 * The six nose control polylines.
 *
 * Coordinates are raw path control points. They are recentred,
 * scaled to eye-radius units and resampled to 16 points below. Each is a
 * single open stroke: down the bridge, then a small turn for the tip.
 */
type Raw = readonly [number, number];

const quad = (p0: Raw, p1: Raw, p2: Raw, n: number): Raw[] => {
  const out: Raw[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
      u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    ]);
  }
  return out;
};

const cubic = (p0: Raw, p1: Raw, p2: Raw, p3: Raw, n: number): Raw[] => {
  const out: Raw[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return out;
};

const join = (...parts: Raw[][]): Raw[] =>
  parts.reduce((acc, p) => acc.concat(acc.length ? p.slice(1) : p), []);

const RAW_NOSES: Record<NoseId, Raw[]> = {
  slant: [
    [13, 5],
    [6, 29],
  ],
  angular: [
    [13, 6],
    [7, 26],
    [15, 28.5],
  ],
  hook: join(
    [
      [13, 5],
      [5.5, 27],
    ],
    quad([5.5, 27], [4.5, 33.5], [11, 32.5], 8),
  ),
  long: join(
    [
      [15, 3],
      [4, 30],
    ],
    quad([4, 30], [2.5, 35.5], [10, 35], 8),
  ),
  curve: join(cubic([12, 6], [9.5, 14], [5, 21], [6, 28], 10), quad([6, 28], [6.5, 33], [12, 32], 6)),
  bow: cubic([13, 5], [7.5, 13], [5, 21], [7, 29], 14),
};

/** Raw units to eye radii: the plain `slant` nose comes out 1.4 radii tall. */
const NOSE_UNIT = 1.4 / 24;

/** Resample an open polyline to `n` points spaced evenly by arc length. */
export function resampleOpen(points: readonly Point[], n: number): Point[] {
  if (points.length < 2) return points.slice();
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]!;
    const [x1, y1] = points[i]!;
    cum.push(cum[i - 1]! + Math.hypot(x1 - x0, y1 - y0));
  }
  const total = cum[cum.length - 1]!;
  const out: Point[] = [];
  let seg = 1;
  for (let i = 0; i < n; i++) {
    const target = (total * i) / (n - 1);
    while (seg < cum.length - 1 && cum[seg]! < target) seg++;
    const a = points[seg - 1]!;
    const b = points[seg]!;
    const span = cum[seg]! - cum[seg - 1]! || 1;
    const t = (target - cum[seg - 1]!) / span;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

function buildNose(raw: Raw[]): Point[] {
  // Centre on the bounding box, not the centroid: the tip's extra samples
  // would otherwise drag the whole nose down and left.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of raw) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return resampleOpen(
    raw.map(([x, y]) => [(x - cx) * NOSE_UNIT, (y - cy) * NOSE_UNIT] as const),
    16,
  );
}

/** Sixteen-point polylines in eye-radius units, centred on their bounding box. */
export const NOSES: Record<NoseId, readonly Point[]> = {
  slant: buildNose(RAW_NOSES.slant),
  angular: buildNose(RAW_NOSES.angular),
  hook: buildNose(RAW_NOSES.hook),
  long: buildNose(RAW_NOSES.long),
  curve: buildNose(RAW_NOSES.curve),
  bow: buildNose(RAW_NOSES.bow),
};

/** Nose polyline scaled to a radius and positioned at an anchor. */
export function nosePolyline(id: NoseId, radius: number, cx = 0, cy = 0): Point[] {
  const base = NOSES[id] ?? NOSES.slant;
  return base.map(([x, y]) => [cx + x * radius, cy + y * radius]);
}

export const isMouthId = (value: string): value is MouthId =>
  (MOUTH_IDS as readonly string[]).includes(value);
export const isNoseId = (value: string): value is NoseId => (NOSE_IDS as readonly string[]).includes(value);
