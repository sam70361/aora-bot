/**
 * Drawn faces placed on a body.
 *
 * A drawn face sits on the cute face's plate: the same dot radius, the same
 * eye line, the same sphere projection. Its layout moves the eyes and the
 * mouth from there in dot radii, and its layers, built about each eye's
 * centre, are carried onto the body with that eye's own tangent transform —
 * so a head turn compresses a drawn eye exactly as it does a dot.
 */
import type { DrawnFaceStyle, MouthSpec, Point, ShapeDef, ShapePart } from '../../core/types.js';
import type { TangentTransform } from '../../math/pose.js';
import { stretchAt } from '../stretch.js';
import { measureExtent, plateExtent, type ExtentProfile, type Footprint } from './extent.js';
import { DRAWN_EXTENTS } from './extents.generated.js';
import { DRAWN_FITS } from './fits.generated.js';
import type { StoredFits } from './extent.js';
import type { AnyFaceDesign, DrawnLayout, DrawnPair, EyeContext, FaceLayer } from './types.js';

/** One design on the face, and how much of the face it is (two while one face gives way to another). */
export interface DrawnEntry {
  design: AnyFaceDesign;
  eyes: DrawnPair;
  weight: number;
}

/** What the simulation hands placement for the drawn faces showing this frame. */
export interface DrawnInput {
  /** The face being left first, the face arriving last. */
  entries: readonly DrawnEntry[];
  /** Seconds in the current state. */
  time: number;
  settled: boolean;
  /** Line weight multiplier, the character's against the shared one. */
  weight: number;
}

/** A drawn eye, plate or mouth fill: where it sits and what it is made of. */
export interface DrawnShape {
  layers: FaceLayer[];
  transform: TangentTransform;
  visible: boolean;
}

/** One design's layers this frame. */
export interface DrawnFaceGeometry {
  style: DrawnFaceStyle;
  /** How much of the face this design is, 0..1; its layers' own opacities are not scaled by it. */
  opacity: number;
  left: DrawnShape;
  right: DrawnShape;
  plate?: DrawnShape;
  /** Fill inside the mouth, carried by the mouth's transform. */
  inMouth?: FaceLayer[];
  /** How the design was fitted to this body. */
  fit: DrawnFit;
}

/** The cute face's own layout, as a drawn layout: what a face with no drawn weight has. */
export interface CuteLayout {
  mouthDrop: number;
  mouthScale: number;
  mouthWeight: number;
  blush: { x: number; y: number };
}

/**
 * The layout numbers a face uses this frame: the cute face's, moved towards
 * each design by its weight, at the size and height that design was fitted
 * to (`fits`, one per entry), so the mouth and cheeks keep their place on a
 * face that had to shrink or sit lower.
 */
export function blendLayout(
  cute: CuteLayout,
  entries: readonly DrawnEntry[],
  fits: readonly DrawnFit[],
): CuteLayout {
  const out = { ...cute, blush: { ...cute.blush } };
  entries.forEach(({ design, weight }, i) => {
    const l: DrawnLayout = design.layout;
    const { scale, drop, squeeze } = fits[i] ?? UNFITTED;
    out.mouthDrop += (l.mouthDrop * scale + drop - cute.mouthDrop) * weight;
    out.mouthScale += (l.mouthScale * scale - cute.mouthScale) * weight;
    out.mouthWeight += (l.mouthWeight * scale - cute.mouthWeight) * weight;
    out.blush.x += (l.blush.x * scale * squeeze - cute.blush.x) * weight;
    out.blush.y += (l.blush.y * scale + drop - cute.blush.y) * weight;
  });
  return out;
}

/** A mouth grown `k` times about its anchor: every field is a length, so scaling the spec scales the outline. */
export function scaleMouth(m: MouthSpec, k: number): MouthSpec {
  if (k === 1) return m;
  return {
    ...m,
    width: m.width * k,
    bend: m.bend * k,
    open: m.open * k,
    wave: m.wave * k,
    dy: m.dy * k,
    ...(m.cat != null ? { cat: m.cat * k } : null),
  };
}

/** The cute face's plate on a body at rest: default tuning, no emphasis, the rest pose. What a face is fitted against. */
export interface DrawnRest {
  /** Dot radius in shape units. */
  r: number;
  /** The cute eye line. */
  centreY: number;
  /** The face's midline. */
  midX: number;
  /** The tangent transform of a point on the face, at the rest pose. */
  project(x: number, y: number): { transform: TangentTransform };
}

/** Where things go on the body, worked out by placement and handed over as functions. */
export interface DrawnPlacer {
  /** Dot radius in shape units. */
  r: number;
  /** The cute eye line. */
  centreY: number;
  /** The face's midline. */
  midX: number;
  gazeX: number;
  gazeY: number;
  /** The body the face is fitted to. */
  shape: ShapeDef;
  /** The same body's plate at rest, which the fit is measured on. */
  rest: DrawnRest;
  /** The tangent transform and visibility of a point on the face. */
  project(x: number, y: number): { transform: TangentTransform; visible: boolean };
  blink: number;
}

/** Layers built about an origin in dot radii, carried to `(cx, cy)`, x flipped by `nose`. */
function carry(layers: FaceLayer[], cx: number, cy: number, r: number, nose: number): FaceLayer[] {
  return layers.map((layer) => ({
    ...layer,
    rings: layer.rings.map((ring) => ring.map(([x, y]) => [cx + x * r * nose, cy + y * r] as Point)),
  }));
}

/**
 * How a drawn face is fitted to its body: lowered by `drop` dot radii, its
 * eyes brought together to `squeeze` of their designed spacing, and
 * `scale` times its designed size. 0, 1 and 1 where the face fits as drawn.
 */
export interface DrawnFit {
  scale: number;
  drop: number;
  squeeze: number;
}

const UNFITTED: DrawnFit = { scale: 1, drop: 0, squeeze: 1 };

/**
 * How far a face may sit lower and how far it may shrink on the tightest
 * body. A face that does not fit gives up what costs it least first: it sits
 * lower, then brings its eyes together towards `minSeparation`, and only
 * shrinks when neither gives it room.
 */
const FIT = { minScale: 0.45, maxDrop: 2.4, drops: 12, steps: 10 } as const;
/**
 * Clear space kept between a face and the body's edge or its hair, in dot
 * radii at the fitted size. Measured against the face's widest state, so it
 * is a hair's breadth: most states sit well inside it.
 */
const FIT_MARGIN = 0.05;
/** Columns the ceiling over a body is sampled at. */
const CEILING_COLUMNS = 64;

/** Fits stored by installed themes for their characters (`installTheme`). */
const THEME_FITS = new Map<string, StoredFits>();

/** Add a theme's stored fits. A fit whose digest no longer matches its body is worked out afresh. */
export function registerFits(rows: Readonly<Record<string, StoredFits>>): void {
  for (const [id, row] of Object.entries(rows)) THEME_FITS.set(id, row);
}

/** Whether a part caps the head — hair, or a leaf, cap or prop laid over the top — rather than hanging off its side or sitting below the face. */
const capsHead = (part: ShapePart, shape: ShapeDef): boolean => {
  if (part.tone !== 'hair' && part.tone !== 'leaf' && part.prop !== true) return false;
  const mean = part.outline.reduce((sum, [, y]) => sum + y, 0) / Math.max(1, part.outline.length);
  return mean < shape.face.y;
};

/**
 * Where a ring stops covering the column at `x` from above: the lowest end of
 * the runs it covers there that start above `face`, or `-Infinity` where it
 * covers none. A run that starts below the face line is under the face (the
 * bottom of a crust round a slice of toast), not over it.
 */
function capAt(ring: readonly Point[], x: number, face: number): number {
  const crossings: number[] = [];
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i]!;
    const [x1, y1] = ring[(i + 1) % ring.length]!;
    if (x0 <= x !== x1 <= x) crossings.push(y0 + ((y1 - y0) * (x - x0)) / (x1 - x0));
  }
  crossings.sort((a, b) => a - b);
  let low = -Infinity;
  for (let i = 0; i + 1 < crossings.length; i += 2) {
    if (crossings[i]! <= face) low = Math.max(low, crossings[i + 1]!);
  }
  return low;
}

/**
 * The lowest point at each x of what caps the head, or the body's top where
 * nothing does: a face must sit below it. Hair and a leaf are part of the
 * figure but not of the face's ground, as a fringe is not. Sampled once per
 * body across its width.
 */
const ceilings = new WeakMap<ShapeDef, (x: number) => number>();

function ceilingOf(shape: ShapeDef): (x: number) => number {
  let ceiling = ceilings.get(shape);
  if (ceiling) return ceiling;
  const caps = shape.parts.filter((part) => capsHead(part, shape)).map((part) => part.outline);
  if (caps.length === 0) {
    ceiling = () => shape.top;
  } else {
    const xs = shape.outline.map(([x]) => x);
    const x0 = Math.min(...xs);
    const step = (Math.max(...xs) - x0) / CEILING_COLUMNS;
    const table = Array.from({ length: CEILING_COLUMNS + 1 }, (_, i) =>
      Math.max(shape.top, ...caps.map((ring) => capAt(ring, x0 + step * i, shape.face.y))),
    );
    // The higher of the two samples either side, so the face is never let in under a cap between them.
    ceiling = (x) => {
      const i = Math.min(CEILING_COLUMNS, Math.max(0, (x - x0) / step));
      return Math.max(table[Math.floor(i)]!, table[Math.ceil(i)]!);
    };
  }
  ceilings.set(shape, ceiling);
  return ceiling;
}

/**
 * How a design is fitted to a body. Every band of its extent, placed on the
 * body at rest and seen through the rest pose's projection, has to lie
 * inside the body's width at its height and below what caps the head. A
 * face that does not fit as drawn looks for room in order of what it costs:
 * the least drop at full size and spacing; failing that, the widest spacing
 * down to `minSeparation`, at whatever height gives it; failing that, the
 * largest size at the closest spacing.
 *
 * This is the search itself, uncached; the roster's results are stored
 * ahead of time (`fits.generated.ts`) and `fitFor` reads them.
 */
export function computeFit(
  shape: ShapeDef,
  design: AnyFaceDesign,
  extent: ExtentProfile,
  rest: DrawnRest,
): DrawnFit {
  const l = design.layout;
  const least = Math.min(1, l.minSeparation / l.separation);
  const ceiling = ceilingOf(shape);
  // The widest mouth at its own line, which a face with a big mouth has to find room for too.
  const mouth: Footprint = [
    { y0: l.mouthDrop + l.lift, y1: l.mouthDrop + l.lift, x0: -extent.mouth, x1: extent.mouth },
  ];
  const test = (fit: DrawnFit): boolean => {
    const rk = rest.r * fit.scale;
    const m = FIT_MARGIN * rk;
    const cy = rest.centreY + (fit.drop - l.lift * fit.scale) * rest.r;
    const half = (l.separation / 2) * fit.squeeze;
    const midline = rest.project(rest.midX, cy).transform.x;
    const prints: [Footprint, -1 | 0 | 1][] = [
      [extent.left, -1],
      [extent.right, 1],
      [plateExtent(extent, fit.squeeze, least), 0],
      [mouth, 0],
    ];
    const points: Point[] = [];
    for (const [print, side] of prints) {
      const x = rest.midX + side * half * rk;
      const nose = side === 1 ? -1 : 1;
      const t = rest.project(x, cy).transform;
      const [m0, m1, m2, m3] = t.matrix;
      const carried = (px: number, py: number): Point => [
        t.x + m0 * (px - t.pivotX) + m2 * (py - t.pivotY),
        t.y + m1 * (px - t.pivotX) + m3 * (py - t.pivotY),
      ];
      for (const band of print) {
        const a = x + (nose === 1 ? band.x0 : -band.x1) * rk;
        const b = x + (nose === 1 ? band.x1 : -band.x0) * rk;
        for (const by of [cy + band.y0 * rk, cy + band.y1 * rk]) {
          points.push(carried(a, by), carried(b, by), carried((a + b) / 2, by));
        }
      }
    }
    // Placement slides a face that the projection carried off the body back onto it, so a face fits where one
    // slide puts every point on the body.
    let lower = -Infinity;
    let upper = Infinity;
    for (const [px, py] of points) {
      if (py > shape.bottom - m) return false;
      const [lo, hi] = stretchAt(shape, py, midline);
      lower = Math.max(lower, lo + m - px);
      upper = Math.min(upper, hi - m - px);
    }
    if (lower > upper) return false;
    const dx = Math.min(Math.max(0, lower), upper);
    return points.every(([px, py]) => py >= ceiling(px + dx) + m);
  };
  const drops = Array.from({ length: FIT.drops + 1 }, (_, i) => (FIT.maxDrop * i) / FIT.drops);
  /** The most of one setting, between `from` (not fitting) and `to` (fitting), that still fits at each height; the best height wins. */
  const most = (
    fitAt: (value: number, drop: number) => DrawnFit,
    from: number,
    to: number,
  ): DrawnFit | null => {
    let best: DrawnFit | null = null;
    let bestValue = to;
    for (const drop of drops) {
      if (!test(fitAt(to, drop))) continue;
      let lo = to;
      let hi = from;
      for (let i = 0; i < FIT.steps; i++) {
        const mid = (lo + hi) / 2;
        if (test(fitAt(mid, drop))) lo = mid;
        else hi = mid;
      }
      if (!best || lo > bestValue + 1e-3) {
        best = fitAt(lo, drop);
        bestValue = lo;
      }
    }
    return best;
  };

  const fit = drops.map((drop) => ({ ...UNFITTED, drop })).find(test) ??
    most((squeeze, drop) => ({ scale: 1, drop, squeeze }), 1, least) ??
    most((scale, drop) => ({ scale, drop, squeeze: least }), 1, FIT.minScale) ?? {
      scale: FIT.minScale,
      drop: 0,
      squeeze: least,
    };
  return { scale: roundFit(fit.scale), drop: roundFit(fit.drop), squeeze: roundFit(fit.squeeze) };
}

/** Decimals a fit is kept to, so a stored fit and a computed one are the same numbers. */
const FIT_DECIMALS = 4;
const roundFit = (v: number): number => Math.round(v * 10 ** FIT_DECIMALS) / 10 ** FIT_DECIMALS;

/**
 * A short digest of a body's outline and parts: what a stored fit was worked
 * out for. A body redrawn, or replaced through `defineShape`, no longer
 * matches, and its fit is worked out afresh rather than read stale.
 */
export function shapeDigest(shape: ShapeDef): string {
  let h = 0x811c9dc5;
  const mix = (v: number): void => {
    h = Math.imul(h ^ Math.round(v * 100), 0x01000193) >>> 0;
  };
  const mixPoints = (points: readonly (readonly [number, number])[]): void => {
    for (const [x, y] of points) {
      mix(x);
      mix(y);
    }
  };
  mixPoints(shape.outline);
  for (const part of shape.parts) mixPoints(part.outline);
  mix(shape.parts.length);
  return h.toString(36);
}

const digests = new WeakMap<ShapeDef, string>();
const digestOf = (shape: ShapeDef): string => {
  let digest = digests.get(shape);
  if (digest === undefined) digests.set(shape, (digest = shapeDigest(shape)));
  return digest;
};

/** Extents measured at run time, for a face with none stored (`defineFace`). */
const measured = new WeakMap<AnyFaceDesign, ExtentProfile>();

/** A design's extent: the stored one for a built-in face, else measured once from the design. */
function extentOf(design: AnyFaceDesign): ExtentProfile {
  const stored = (DRAWN_EXTENTS as Partial<Record<string, ExtentProfile>>)[design.id];
  if (stored) return stored;
  let profile = measured.get(design);
  if (!profile) measured.set(design, (profile = measureExtent(design)));
  return profile;
}

/** Fits already worked out or looked up, per body and face. */
const fits = new WeakMap<ShapeDef, Map<string, DrawnFit>>();

/**
 * How a design is fitted to a body: the stored fit when the body is the one
 * it was worked out for, else worked out now. Either way kept per body and
 * face, so it is a property of the pair and not of the moment.
 */
function fitFor(shape: ShapeDef, design: AnyFaceDesign, rest: DrawnRest): DrawnFit {
  let byFace = fits.get(shape);
  if (!byFace) fits.set(shape, (byFace = new Map()));
  const known = byFace.get(design.id);
  if (known) return known;
  const stored = DRAWN_FITS[shape.id] ?? THEME_FITS.get(shape.id);
  const row = stored && stored.digest === digestOf(shape) ? stored.fits[design.id] : undefined;
  const fit = row
    ? { scale: row[0], drop: row[1], squeeze: row[2] }
    : computeFit(shape, design, extentOf(design), rest);
  const result = fit.scale === 1 && fit.drop === 0 && fit.squeeze === 1 ? UNFITTED : fit;
  byFace.set(design.id, result);
  return result;
}

/**
 * Build every drawn design showing this frame, at the height, spacing and
 * size it was fitted to this body with.
 */
export function placeDrawn(input: DrawnInput, at: DrawnPlacer): DrawnFaceGeometry[] {
  return input.entries.map(({ design, eyes, weight }) => {
    const l = design.layout;
    const { r } = at;
    const fit = fitFor(at.shape, design, at.rest);
    const rk = r * fit.scale;
    const half = (l.separation / 2) * fit.squeeze;
    const shiftX = at.gazeX * l.gazeShift;
    const shiftY = at.gazeY * l.gazeShift;
    const look = (nose: 1 | -1): Point => [((at.gazeX - shiftX) / rk) * nose, (at.gazeY - shiftY) / rk];
    const context = (nose: 1 | -1): EyeContext => ({
      nose,
      order: nose === 1 ? 0 : 1,
      time: input.time,
      settled: input.settled,
      blink: at.blink,
      look: look(nose),
      weight: input.weight,
      mid: half,
    });

    // The face shrinks about the cute face's own centre and sits `drop` lower.
    const y = at.centreY + (fit.drop - l.lift * fit.scale) * r + shiftY;
    const lx = at.midX - half * rk + shiftX;
    const rx = at.midX + half * rk + shiftX;
    const geometry: DrawnFaceGeometry = {
      style: design.id,
      opacity: weight,
      left: { layers: carry(design.eye(eyes[0], context(1)), lx, y, rk, 1), ...at.project(lx, y) },
      right: { layers: carry(design.eye(eyes[1], context(-1)), rx, y, rk, -1), ...at.project(rx, y) },
      fit,
    };
    if (design.plate) {
      const mx = (lx + rx) / 2;
      geometry.plate = {
        layers: carry(design.plate(eyes[0], eyes[1], context(1)), mx, y, rk, 1),
        ...at.project(mx, y),
      };
    }
    return geometry;
  });
}

/** The fill of a design's mouth, about the mouth's anchor at `(mx, my)`. */
export function placeInMouth(
  geometry: DrawnFaceGeometry[],
  entries: readonly DrawnEntry[],
  mouth: MouthSpec,
  stroke: number,
  r: number,
  mx: number,
  my: number,
): void {
  entries.forEach(({ design }, i) => {
    if (!design.inMouth) return;
    geometry[i]!.inMouth = carry(design.inMouth({ mouth, stroke: stroke / r }), mx, my, r, 1);
  });
}
