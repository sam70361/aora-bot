import { clamp } from '../math/easing.js';
import { smoothClosedPath } from '../math/path-builder.js';
import {
  CENTER,
  SHAPE_IDS,
  type PartTone,
  type Point,
  type Ring,
  type ShapeDef,
  type ShapeId,
  type ShapePart,
} from '../core/types.js';
import { CHARACTERS, type CharacterArt } from './characters/index.js';
import { fitFace } from './fit-face.js';
import { samplePath, smoothLoop } from './svg-path.js';

/** Outline size every shape is normalised to before rendering. */
const NORMALISED_SIZE = 228.44;

/** Vertical resolution of the span lookup table. */
const SPAN_ROWS = 160;

interface ShapeSource {
  outline: () => Point[];
  /** Pieces of the figure besides the body, in the same coordinates as `outline`. */
  parts?: () => { tone: PartTone; outline: readonly Point[] }[];
  /** Horizontal nudge for the left eye; triangular shapes need the room. */
  leftDX?: number;
  /**
   * Where to look for the face, as an offset from the centre of shape space.
   * Only needed when the body's mass is not where its bounding box says it is.
   */
  faceHint?: Point;
  /**
   * The same thing in the coordinates of `outline`, for art that was drawn
   * with a face centre. It is carried through the normalisation to become a
   * `faceHint`, so it stays true whatever the shape is scaled by — a figure
   * with ears has its body low in the box, and its face lower still.
   */
  face?: Point;
}

function sourceFromArt(art: CharacterArt): ShapeSource {
  const parts = art.parts;
  return {
    outline: () => (typeof art.body === 'string' ? samplePath(art.body) : smoothLoop(art.body.loop)),
    parts: parts && (() => parts.map((part) => ({ tone: part.tone, outline: samplePath(part.d) }))),
    leftDX: art.leftDX,
    face: art.face,
  };
}

const SOURCES: Record<string, ShapeSource> = Object.fromEntries(
  SHAPE_IDS.map((id) => [id, sourceFromArt(CHARACTERS[id])]),
);

/** Signed area of a closed polygon, via the shoelace formula. */
function polygonArea(points: readonly Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
}

/**
 * How much of the sizing is driven by area rather than by bounding box.
 *
 * Fitting every shape to the same bounding box makes the set look
 * inconsistent: a square fills its box completely while a circle fills about
 * four fifths, so at equal box size the square carries visibly more weight.
 * Icon grids have always corrected for this by hand — Material's keylines draw
 * the circle larger than the square for exactly this reason.
 *
 * Matching area outright over-corrects, and for a triangle it demands a box a
 * fifth larger than the drawable area. A partial correction with a hard clamp
 * gets the useful part: shapes with generous fill are trimmed a few percent,
 * and shapes that would need to grow past the bounds simply stay at full box
 * size rather than overflowing.
 */
const AREA_WEIGHT = 0.5;

/** Reference area: the area a circle of the standard size would have. */
const REFERENCE_AREA = Math.PI * Math.pow(NORMALISED_SIZE / 2, 2);

interface Normalised {
  body: Point[];
  parts: ShapePart[];
  /** The transform, for anything else drawn in the same source coordinates. */
  map(p: Point): Point;
}

/**
 * Scale the figure to the standard size and move it to the centre of shape space.
 *
 * The box is the figure's, ears and antennas included, so nothing a part adds
 * can poke out of the margin the animation needs; the area correction reads
 * the body alone, because that is the mass the eye weighs. Parts get exactly
 * the body's transform, which is what keeps an ear on its head.
 */
function normalise(
  points: readonly Point[],
  parts: readonly { tone: PartTone; outline: readonly Point[] }[],
): Normalised {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = (list: readonly Point[]) => {
    for (const [x, y] of list) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  };
  grow(points);
  for (const part of parts) grow(part.outline);

  const boxScale = NORMALISED_SIZE / Math.max(maxX - minX, maxY - minY);
  const area = polygonArea(points);
  const areaScale = area > 0 ? Math.sqrt(REFERENCE_AREA / area) : boxScale;

  let scale = boxScale * (1 - AREA_WEIGHT) + areaScale * AREA_WEIGHT;

  /*
   * Optical sizing may only shrink, never grow past the box. The viewBox has
   * almost no spare room once the per-shape scale and the shape-space-to-
   * viewBox factor are applied, so a body allowed to exceed this would clip
   * against the margin that belts and particles need.
   */
  const maxScale = NORMALISED_SIZE / Math.max(maxX - minX, maxY - minY);
  if (scale > maxScale) scale = maxScale;

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const map = ([x, y]: Point): Point => [CENTER + (x - cx) * scale, CENTER + (y - cy) * scale];

  return {
    body: points.map(map),
    parts: parts.map((part) => ({ tone: part.tone, outline: part.outline.map(map) })),
    map,
  };
}

/** Resample the outline into a fixed-length polar ring so shapes can morph into each other. */
function toRing(points: readonly Point[], samples = 96): Ring {
  const ring: Point[] = [];
  for (let i = 0; i < samples; i++) {
    const theta = (i / samples) * Math.PI * 2;
    const dx = Math.cos(theta);
    const dy = Math.sin(theta);

    // Farthest outline crossing along this ray.
    let hit = 0;
    for (let j = 0; j < points.length; j++) {
      const a = points[j]!;
      const b = points[(j + 1) % points.length]!;
      const ax = a[0] - CENTER;
      const ay = a[1] - CENTER;
      const bx = b[0] - CENTER;
      const by = b[1] - CENTER;

      const denom = (bx - ax) * dy - (by - ay) * dx;
      if (Math.abs(denom) < 1e-9) continue;
      const t = (ax * dy - ay * dx) / -denom;
      if (t < 0 || t > 1) continue;
      const px = ax + (bx - ax) * t;
      const py = ay + (by - ay) * t;
      const along = px * dx + py * dy;
      if (along > hit) hit = along;
    }

    /*
     * A ray that misses the outline entirely means the centre of shape space
     * is outside the body — the notch of a crescent, or the gap under a
     * figure whose ears pushed its body down. Falling back to the outline
     * point nearest in angle keeps the ring closed rather than pinching it to
     * a point, which would dent the belt morph.
     */
    if (hit === 0) {
      let bestDiff = Infinity;
      for (const [x, y] of points) {
        const px = x - CENTER;
        const py = y - CENTER;
        let diff = Math.atan2(py, px) - theta;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        diff = Math.abs(diff);
        if (diff < bestDiff) {
          bestDiff = diff;
          hit = Math.hypot(px, py);
        }
      }
    }

    ring.push([CENTER + hit * dx, CENTER + hit * dy]);
  }
  return ring;
}

/** Left and right boundary of the outline at each of SPAN_ROWS vertical positions. */
function buildSpanTable(points: readonly Point[], top: number, bottom: number) {
  const rows: [number, number][] = [];
  const height = bottom - top;

  for (let r = 0; r < SPAN_ROWS; r++) {
    /*
     * The end rows use `top` and `bottom` themselves rather than the
     * interpolated value. `top + height * 159 / 159` is not always `bottom`
     * to the last bit, and on a round body the lowest point is a single
     * vertex: one ulp short grazes it (width ~0), one ulp over misses and
     * falls back to the row above. Which of the two happens depends on the
     * libm build (Node 22 vs 24), and `deriveTiltScale` reads this row.
     */
    const y = r === 0 ? top : r === SPAN_ROWS - 1 ? bottom : top + (height * r) / (SPAN_ROWS - 1);
    let lo = Infinity;
    let hi = -Infinity;

    for (let j = 0; j < points.length; j++) {
      const a = points[j]!;
      const b = points[(j + 1) % points.length]!;
      if (a[1] === b[1]) continue;
      const t = (y - a[1]) / (b[1] - a[1]);
      if (t < 0 || t > 1) continue;
      const x = a[0] + (b[0] - a[0]) * t;
      if (x < lo) lo = x;
      if (x > hi) hi = x;
    }

    if (lo === Infinity) {
      const prev = rows[r - 1];
      rows.push(prev ? [prev[0], prev[1]] : [CENTER, CENTER]);
    } else {
      rows.push([lo, hi]);
    }
  }

  return (y: number): readonly [number, number] => {
    const t = clamp((y - top) / height, 0, 1);
    const idx = t * (SPAN_ROWS - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(SPAN_ROWS - 1, i0 + 1);
    const f = idx - i0;
    const a = rows[i0]!;
    const b = rows[i1]!;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f] as const;
  };
}

/**
 * How much a shape is allowed to rotate.
 *
 * A shape with a flat base looks wrong when it tips — the base lifts off and
 * the illusion of weight goes with it. Comparing the outline width just above
 * the base against the width slightly higher up detects flatness, and the
 * result scales every rotation the shape performs.
 */
function deriveTiltScale(spanAt: (y: number) => readonly [number, number], bottom: number): number {
  const near = spanAt(bottom - 1);
  const above = spanAt(bottom - 9);
  const nearWidth = near[1] - near[0];
  const aboveWidth = above[1] - above[0];
  if (aboveWidth <= 0) return 1;
  const ratio = nearWidth / aboveWidth;
  return clamp(1 - 1.9 * (ratio - 0.36), 0.15, 1);
}

function build(id: ShapeId): ShapeDef {
  const source = SOURCES[id]!;
  const fitted = normalise(source.outline(), source.parts?.() ?? []);
  const points = fitted.body;

  let radius = 0;
  let top = Infinity;
  let bottom = -Infinity;
  for (const [x, y] of points) {
    const d = Math.hypot(x - CENTER, y - CENTER);
    if (d > radius) radius = d;
    if (y < top) top = y;
    if (y > bottom) bottom = y;
  }

  const spanAt = buildSpanTable(points, top, bottom);

  // The particle system orbits at the widest horizontal half-extent rather
  // than the outer radius, so satellites hug the body instead of the corners.
  let beltRadius = 0;
  for (let i = 0; i < 64; i++) {
    const y = top + ((bottom - top) * i) / 63;
    const [lo, hi] = spanAt(y);
    const half = (hi - lo) / 2;
    if (half > beltRadius) beltRadius = half;
  }
  // Parts that stand wider than the body (a cactus's arms, a fish's tail, a cherry's twin) are part of what
  // the satellites and the radar rings must clear: measured from the figure's width, not the body's alone.
  if (fitted.parts.length > 0) {
    let bodyLo = Infinity;
    let bodyHi = -Infinity;
    for (const [x] of points) {
      if (x < bodyLo) bodyLo = x;
      if (x > bodyHi) bodyHi = x;
    }
    let lo = bodyLo;
    let hi = bodyHi;
    for (const part of fitted.parts) {
      for (const [x] of part.outline) {
        if (x < lo) lo = x;
        if (x > hi) hi = x;
      }
    }
    // Only when a part really sticks out sideways; a part inside the body's width changes nothing.
    if (hi - lo > bodyHi - bodyLo + 1) beltRadius = Math.max(beltRadius, (hi - lo) / 2);
  }

  let hint = source.faceHint;
  if (source.face) {
    const [fx, fy] = fitted.map(source.face);
    hint = [fx - CENTER, fy - CENTER];
  }

  return {
    id,
    path: smoothClosedPath(points),
    outline: points,
    radius,
    beltRadius,
    tiltScale: deriveTiltScale(spanAt, bottom),
    top,
    bottom,
    spanAt,
    ring: toRing(points),
    face: fitFace(
      points,
      source.leftDX ?? 0,
      hint,
      fitted.parts.filter((part) => part.tone === 'hair').map((part) => part.outline),
    ),
    parts: fitted.parts,
  };
}

const cache = new Map<string, ShapeDef>();

/**
 * Shapes are derived on first use, not at import. Face fitting is a grid
 * search and building every shape eagerly would cost far more than any single
 * page needs.
 */
export function getShape(id: ShapeId): ShapeDef {
  let def = cache.get(id);
  if (!def) {
    def = build(id);
    cache.set(id, def);
  }
  return def;
}

/** Every shape, derived. Only call this when you genuinely need all of them. */
export function allShapes(): ShapeDef[] {
  return SHAPE_IDS.map(getShape);
}

/**
 * Register a custom shape, or replace a built-in one.
 *
 * `parts` are the rest of the figure — ears, leaves, an antenna — in the same
 * coordinates as `outline`. They are normalised with the body and ride its
 * pose, exactly like the built-in characters' parts.
 */
export function defineShape(
  id: string,
  outline: () => Point[],
  options: {
    leftDX?: number;
    faceHint?: Point;
    parts?: readonly { tone: PartTone; outline: readonly Point[] }[];
  } = {},
): ShapeDef {
  const { parts } = options;
  SOURCES[id] = {
    outline,
    parts: parts && (() => parts.map((part) => ({ tone: part.tone, outline: part.outline }))),
    leftDX: options.leftDX,
    faceHint: options.faceHint,
  };
  cache.delete(id);
  return getShape(id as ShapeId);
}

/*
 * No per-shape size correction: the area rule in `normalise` sizes every body.
 * The body is deliberately not scaled up to fill the viewBox either — the
 * margin around shape space is where the animation happens, and a body that
 * already touches the edge at rest leaves it nowhere to go.
 */
export const getShapeScale = (_id: ShapeId): number => 1;

/** Counter-scale for eyes so they read the same size on every body. */
export const getEyeScaleForShape = (_id: ShapeId): number => 0.92;
