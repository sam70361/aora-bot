import { clamp } from '../math/easing.js';
import { smoothClosedPath } from '../math/path-builder.js';
import {
  CENTER,
  CORE_SHAPE_IDS,
  SHAPE_IDS,
  SHAPE_SPACE,
  type FaceBox,
  type PartColor,
  type PartTone,
  type Point,
  type Ring,
  type ShapeDef,
  type ShapeId,
  type ShapePart,
} from '../core/types.js';
import { loopPoints } from './characters/art.js';
import { CHARACTERS, type ArtPart, type CharacterArt } from './characters/index.js';
import { faceInputsDigest, type FaceInputs, type StoredFaceBox } from './face-boxes.js';
import { FACE_BOXES } from './face-boxes.generated.js';
import { eyeFactor, fitFace } from './fit-face.js';
import { requireTheme } from '../themes/state.js';
import { samplePath, smoothLoop } from './svg-path.js';

/** Outline size every shape is normalised to before rendering: a hair inside shape space, so its extremes never touch the edge. */
const NORMALISED_SIZE = SHAPE_SPACE - 0.6;

/** Vertical resolution of the span lookup table. */
const SPAN_ROWS = 160;

/** A piece of a figure as a source gives it, in the coordinates of its body. */
export interface SourcePart {
  tone: PartTone;
  outline: readonly Point[];
  color?: PartColor;
  prop?: boolean;
  minPx?: number;
  plain?: boolean;
  /** A prop drawn under the face (make-up, a painted mark): the face fit does not keep off it. */
  underFace?: boolean;
  /**
   * The motion it plays, about `pivot` when one is given. The art it was
   * written in has `unit` source units to its own unit and its origin at
   * `offset` (1 and the origin: the source's own coordinates).
   */
  motion?: { id: string; pivot?: Point; unit?: number; offset?: Point };
}

/** The motions a whole figure plays, about `pivot` when one is given, in the source's coordinates. */
interface SourceMotion {
  ids: readonly string[];
  pivot?: Point;
}

/** A prop as a caller gives it: a part that is laid over the figure rather than part of it. */
export type PropPart = Omit<SourcePart, 'prop'>;

interface ShapeSource {
  outline: () => Point[];
  /** Pieces of the figure besides the body, in the same coordinates as `outline`. */
  parts?: () => SourcePart[];
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
  /** The signature motions the whole figure plays. */
  motion?: SourceMotion;
  /** A face box the art pins, in the coordinates of `outline`, taken instead of a fitted one. */
  faceBox?: { x: number; y: number; sx: number; sy: number };
  /** What uncoloured hair is shaded towards, as a share of the ink's lightness. */
  hairDeep?: number;
}

const partOutline = (part: ArtPart): Point[] =>
  'd' in part ? samplePath(part.d) : smoothLoop(loopPoints(part.loop));

const fromArt = (part: ArtPart, prop?: boolean): SourcePart => ({
  tone: part.tone,
  outline: partOutline(part),
  ...(part.color === undefined ? null : { color: part.color }),
  ...(part.minPx === undefined ? null : { minPx: part.minPx }),
  ...(part.plain ? { plain: true } : null),
  ...(part.underFace ? { underFace: true } : null),
  ...(part.motion ? { motion: { id: part.motion, ...(part.pivot ? { pivot: part.pivot } : null) } } : null),
  ...(prop ? { prop } : null),
});

/** A figure's motions as its art names them, or `undefined`. */
function figureMotionOf(art: CharacterArt): SourceMotion | undefined {
  if (!art.motion) return undefined;
  const ids = typeof art.motion === 'string' ? [art.motion] : art.motion;
  return ids.length > 0 ? { ids, ...(art.pivot ? { pivot: art.pivot } : null) } : undefined;
}

function sourceFromArt(art: CharacterArt): ShapeSource {
  const motion = figureMotionOf(art);
  if ('base' in art) {
    const source = propSource(
      art.base,
      () => art.props.map((part) => fromArt(part)),
      art.at,
      art.scale,
      art,
      motion,
    );
    if (art.faceBox) source.faceBox = art.faceBox;
    if (art.hairDeep !== undefined) source.hairDeep = art.hairDeep;
    return source;
  }
  const parts = art.parts;
  return {
    outline: () =>
      typeof art.body === 'string' ? samplePath(art.body) : smoothLoop(loopPoints(art.body.loop)),
    parts: parts && (() => parts.map((part) => fromArt(part))),
    leftDX: art.leftDX,
    face: art.face,
    ...(motion ? { motion } : null),
    ...(art.faceBox ? { faceBox: art.faceBox } : null),
    ...(art.hairDeep !== undefined ? { hairDeep: art.hairDeep } : null),
  };
}

/** The face box a source pins, carried into shape space; `null` when it leaves the face to the fit. */
function pinnedFace(source: ShapeSource, fitted: Normalised): FaceBox | null {
  const pin = source.faceBox;
  if (!pin) return null;
  const [x, y] = fitted.map([pin.x, pin.y]);
  const sx = pin.sx * fitted.unit;
  const sy = pin.sy * fitted.unit;
  return { x, y, sx, sy, eye: eyeFactor(sx, sy), leftDX: source.leftDX ?? 0 };
}

/**
 * A shape of the roster wearing props. The base's body, parts and face are
 * carried over as they are, scaled by `scale` about `at` in a 100 x 100 box,
 * so the props, drawn in that box, have room round it; the whole figure is
 * then normalised like any other.
 */
function propSource(
  base: string,
  props: () => PropPart[],
  at: Point,
  scale: number,
  {
    drop = [],
    tint = {},
    plain = [],
  }: {
    drop?: readonly number[];
    tint?: Readonly<Record<number, PartColor>>;
    plain?: readonly number[];
  } = {},
  motion?: SourceMotion,
): ShapeSource {
  let placed: { body: Point[]; parts: SourcePart[]; face: Point; leftDX: number } | null = null;
  const place = () => {
    if (placed) return placed;
    const shape = getShape(base as ShapeId);
    const k = (scale * 100) / SHAPE_SPACE;
    const map = ([x, y]: Point): Point => [at[0] + (x - CENTER) * k, at[1] + (y - CENTER) * k];
    placed = {
      body: shape.outline.map(map),
      parts: [
        ...shape.parts.flatMap((part, i): SourcePart[] =>
          drop.includes(i)
            ? []
            : [
                {
                  ...part,
                  outline: part.outline.map(map),
                  ...(tint[i] ? { color: tint[i] } : null),
                  ...(plain.includes(i) ? { plain: true } : null),
                  ...(part.motion
                    ? {
                        motion: {
                          id: part.motion.id,
                          ...(part.motion.pivot ? { pivot: map(part.motion.pivot) } : null),
                          unit: part.motion.unit * k,
                          offset: map(part.motion.offset),
                        },
                      }
                    : null),
                },
              ],
        ),
        ...props().map((part) => ({ ...part, prop: true })),
      ],
      face: map([shape.face.x, shape.face.y]),
      leftDX: shape.face.leftDX,
    };
    return placed;
  };
  return {
    outline: () => place().body,
    parts: () => place().parts,
    get leftDX() {
      return place().leftDX;
    },
    get face() {
      return place().face;
    },
    ...(motion ? { motion } : null),
  };
}

const SOURCES: Record<string, ShapeSource> = Object.fromEntries(
  CORE_SHAPE_IDS.map((id) => [id, sourceFromArt(CHARACTERS[id])]),
);

/** Face boxes worked out ahead of time: the core's, and those an installed theme brings. */
const STORED = new Map<string, StoredFaceBox>(
  Object.entries(FACE_BOXES).flatMap(([id, box]) => (box ? [[id, box]] : [])),
);

/**
 * Add a theme's characters (`installTheme`), with the face boxes stored for
 * them. A box whose digest no longer matches its body is fitted afresh, as
 * the core's are.
 */
export function registerArt(
  art: Readonly<Record<string, CharacterArt>>,
  boxes: Readonly<Record<string, StoredFaceBox>> = {},
): void {
  for (const [id, entry] of Object.entries(art)) {
    SOURCES[id] = sourceFromArt(entry);
    cache.delete(id);
  }
  for (const [id, box] of Object.entries(boxes)) STORED.set(id, box);
}

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
  /** Shape units to one source unit. */
  unit: number;
}

/**
 * Scale the figure to the standard size and move it to the centre of shape space.
 *
 * The box is the figure's, ears and antennas included, so nothing a part adds
 * can poke out of the margin the animation needs; the area correction reads
 * the body alone, because that is the mass the eye weighs. Parts get exactly
 * the body's transform, which is what keeps an ear on its head.
 */
function normalise(points: readonly Point[], parts: readonly SourcePart[]): Normalised {
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
    parts: parts.map(({ motion, ...part }): ShapePart => ({
      ...part,
      outline: part.outline.map(map),
      ...(motion
        ? {
            motion: {
              id: motion.id,
              ...(motion.pivot ? { pivot: map(motion.pivot) } : null),
              unit: (motion.unit ?? 1) * scale,
              offset: map(motion.offset ?? [0, 0]),
            },
          }
        : null),
    })),
    map,
    unit: scale,
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

/** A shape's source; throws `ThemeNotInstalledError` for a theme's shape while the theme is not installed. */
function sourceOf(id: string): ShapeSource {
  const source = SOURCES[id];
  if (source) return source;
  requireTheme('shape', id);
  const adopted = SOURCES[id];
  if (adopted) return adopted;
  throw new Error(
    `Unknown shape "${id}". Shapes are the roster's, a theme's once installed, or registered with defineShape.`,
  );
}

function build(id: ShapeId): ShapeDef {
  const source = sourceOf(id);
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

  const inputs = faceInputs(source, fitted);
  const stored = STORED.get(id);
  const face =
    pinnedFace(source, fitted) ??
    (stored && stored.digest === faceInputsDigest(inputs)
      ? { ...stored.box }
      : fitFace(inputs.points, inputs.leftDX, inputs.hint, inputs.avoid));

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
    face,
    parts: fitted.parts,
    ...(source.hairDeep !== undefined ? { hairDeep: source.hairDeep } : null),
    ...(source.motion
      ? {
          motion: {
            ids: source.motion.ids,
            ...(source.motion.pivot ? { pivot: fitted.map(source.motion.pivot) } : null),
            unit: fitted.unit,
            offset: fitted.map([0, 0]),
          },
        }
      : null),
  };
}

/**
 * What a shape's face box is worked out from: the normalised body, the
 * left-eye nudge, the face hint carried through the normalisation, and the
 * hair the face must keep off.
 */
function faceInputs(source: ShapeSource, fitted: ReturnType<typeof normalise>): FaceInputs {
  let hint = source.faceHint;
  if (source.face) {
    const [fx, fy] = fitted.map(source.face);
    hint = [fx - CENTER, fy - CENTER];
  }
  return {
    points: fitted.body,
    leftDX: source.leftDX ?? 0,
    hint,
    avoid: fitted.parts
      .filter(
        (part) =>
          part.tone === 'hair' ||
          (part.prop === true && !part.underFace && covers(part.outline, fitted.body)),
      )
      .map((part) => part.outline),
  };
}

/** Whether a prop lies over the body at all: a prop off to one side leaves the face its room. */
function covers(prop: readonly Point[], body: readonly Point[]): boolean {
  const inside = (polygon: readonly Point[], [x, y]: Point): boolean => {
    let hit = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i]!;
      const b = polygon[j]!;
      if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
    }
    return hit;
  };
  return prop.some((p) => inside(body, p)) || body.some((p) => inside(prop, p));
}

/**
 * A shape's face box worked out now, with the digest it is stored under:
 * for the script that writes `face-boxes.generated.ts` and the test that
 * checks it. Ignores any stored box.
 */
export function computeFaceBox(id: ShapeId): StoredFaceBox {
  const source = sourceOf(id);
  const fitted = normalise(source.outline(), source.parts?.() ?? []);
  const inputs = faceInputs(source, fitted);
  return {
    digest: faceInputsDigest(inputs),
    box: pinnedFace(source, fitted) ?? fitFace(inputs.points, inputs.leftDX, inputs.hint, inputs.avoid),
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

/** Every listed shape, derived. Only call this when you genuinely need all of them. */
export function allShapes(): ShapeDef[] {
  return SHAPE_IDS.map(getShape);
}

/**
 * Register a custom shape, or replace a built-in one.
 *
 * `parts` are the rest of the figure — ears, leaves, an antenna — in the same
 * coordinates as `outline`. They are normalised with the body and ride its
 * pose, exactly like the built-in characters' parts. `props` are drawn the
 * same way, in front of the parts, and the face keeps off any that lie over
 * the body.
 */
export function defineShape(
  id: string,
  outline: () => Point[],
  options: {
    leftDX?: number;
    faceHint?: Point;
    parts?: readonly PropPart[];
    props?: readonly PropPart[];
  } = {},
): ShapeDef {
  const { parts = [], props = [] } = options;
  SOURCES[id] = {
    outline,
    parts: () => [...parts.map((part) => ({ ...part })), ...props.map((part) => ({ ...part, prop: true }))],
    leftDX: options.leftDX,
    faceHint: options.faceHint,
  };
  cache.delete(id);
  return getShape(id as ShapeId);
}

/**
 * Register a shape that is another one wearing props: a hat, a lantern, a
 * nightcap. The `base` keeps its body, parts and face; it is scaled by
 * `scale` about `at` in a 100 x 100 box, and the props are drawn in that box,
 * in front of it. The face is fitted again, keeping off any prop that lies
 * over the body, as it keeps off hair. `drop` leaves out base parts a prop
 * takes the place of, and `tint` gives base parts a colour, both by index.
 */
export function defineShapeWithProps(
  id: string,
  options: {
    base: ShapeId;
    props: readonly PropPart[];
    at?: Point;
    scale?: number;
    drop?: readonly number[];
    tint?: Readonly<Record<number, PartColor>>;
  },
): ShapeDef {
  const { base, props, at = [50, 50], scale = 0.7 } = options;
  SOURCES[id] = propSource(base, () => props.map((part) => ({ ...part })), at, scale, options);
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
