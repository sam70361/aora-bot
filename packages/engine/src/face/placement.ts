import { clamp, lerp } from '../math/easing.js';
import { polylinePath } from '../math/polyline.js';
import {
  poseMatrix,
  projectOnSphere,
  tangentTransform,
  tangentTransformString,
  type ProjectedPoint,
  type TangentTransform,
} from '../math/pose.js';
import {
  DEFAULT_FACE_TUNE,
  type FaceStyle,
  type FaceTune,
  type MouthSpec,
  type NoseId,
  type Point,
  type Pose,
  type PoseHome,
  type ShapeDef,
} from '../core/types.js';
import {
  LINE_FACE_TUNE,
  LINE_WEIGHT,
  MOUTH_DROP,
  MOUTH_GAZE,
  mouthOutline,
  NOSE_DROP,
  NOSE_GAZE,
  nosePolyline,
} from './features.js';
import { eyeExtras, eyeOutline } from './morph.js';
import type { EyePair } from './topologies.js';

/** One eye as points: an outline in shape space and the projection that carries it onto the sphere. */
export interface EyeShape {
  /** Closed outline, already positioned around its own pivot. */
  points: Point[];
  transform: TangentTransform;
  visible: boolean;
  /**
   * More closed outlines drawn with this one as a single shape: the other bar
   * of an x, a brow, a star. Only the cute face has any.
   */
  extras?: Point[][];
}

/** A stroked feature. The outline is open for a nose and closed for a mouth. */
export interface FeatureShape extends EyeShape {
  closed: boolean;
  /** 0..1, multiplied into the feature's opacity. Absent means 1. */
  opacity?: number;
}

/**
 * The face as numbers: no path strings, no transform strings.
 *
 * This is what a frame snapshot carries. `FacePlacement` below is the same
 * face already written out as SVG, kept for hosts that draw it themselves.
 */
export interface FaceGeometry {
  left: EyeShape;
  right: EyeShape;
  nose?: FeatureShape;
  mouth?: FeatureShape;
  /** The cute face's two cheeks, as filled ellipses. */
  blush?: { left: EyeShape; right: EyeShape };
  lineWidth: number;
  /** Stroke width of the cute mouth, which thins as the mouth opens. Absent outside the cute face. */
  mouthStroke?: number;
  /** The same mouth's full line weight, for a variant that outlines it instead of filling it. */
  mouthWeight?: number;
  eyeRadius: number;
}

export interface PlacedEye {
  /** Outline path in shape space, already positioned. */
  path: string;
  /** Transform carrying the sphere projection. */
  transform: string;
  visible: boolean;
}

/** A stroked feature: same fields as an eye, but the path is meant to be stroked, not filled. */
export type PlacedFeature = PlacedEye;

export interface EyePlacement {
  left: PlacedEye;
  right: PlacedEye;
}

export interface FacePlacement extends EyePlacement {
  /** Present in line mode when a nose is set. */
  nose?: PlacedFeature;
  /** Present in line mode. */
  mouth?: PlacedFeature;
  /** Stroke width for nose, mouth and thin eyes, in shape units. */
  lineWidth: number;
  /**
   * The fitted eye radius, in shape units.
   *
   * Reported because it is the one number that says how large this shape's
   * face came out, and the HUD wants it: a dial drawn with the same pen as
   * the mouth reads as part of the same character, whereas one with its own
   * fixed weight reads as a widget stuck next to it.
   */
  eyeRadius: number;
}

/** How far above the fitted centre the eyes sit, as a fraction of its height. */
const FACE_LIFT = 0.26;

/*
 * The cute face's proportions, in dot radii (design numbers over 4.6): eyes
 * 2.6 apart, mouth 2.4 below, cheeks 4.35 out and 1.5 down. The face sits
 * close to the body's centre, which is what makes it read as a baby's.
 */
const CUTE_LIFT = 0.04;
/** The dot's radius as a fraction of the body's width at eye height. */
const CUTE_BODY = 0.078;
const CUTE_TALL = 0.08;
const CUTE_FLOOR = 0.05;
const CUTE_SEPARATION = 2.6;
const CUTE_MOUTH_DROP = 2.39;
const CUTE_BLUSH = { x: 4.35, y: 1.52, rx: 0.95, ry: 0.5 } as const;
/** Mouth stroke in dot radii (3 over 4.6), and how open a mouth is before it stops being stroked. */
const CUTE_MOUTH_WEIGHT = 0.65;
const CUTE_MOUTH_FILLED = 0.6;
/** Share of the eyes' gaze the mouth and cheeks follow. */
const CUTE_GAZE = 0.5;

interface CuteFaceMetrics {
  /** Dot radius in shape units. */
  radius: number;
  centreY: number;
  separation: number;
}

/** Size and place the cute face on this body. */
function measureCuteFace(options: PlacementOptions): CuteFaceMetrics {
  const { shape, faceTune, eyeScale = 1 } = options;
  const { face: box } = shape;
  const centreY = box.y - box.sy * CUTE_LIFT * faceTune.height;
  const [lo, hi] = shape.spanAt(clamp(centreY, shape.top + 4, shape.bottom - 4));
  const rowWidth = Math.max(hi - lo, 1);
  const bodyHeight = Math.max(shape.bottom - shape.top, 1);
  const radius =
    Math.max(Math.min(rowWidth * CUTE_BODY, bodyHeight * CUTE_TALL), bodyHeight * CUTE_FLOOR) *
    (faceTune.size / DEFAULT_FACE_TUNE.size) *
    box.eye *
    eyeScale;
  return { radius, centreY, separation: radius * CUTE_SEPARATION };
}

/** An ellipse as a closed outline of `n` points. */
function ellipse(cx: number, cy: number, rx: number, ry: number, n = 20): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Point;
  });
}

/** Add the cute face's mouth and cheeks to a placement that already has its eyes. */
function addCuteFeatures(
  placement: FaceGeometry,
  options: PlacementOptions,
  metrics: CuteFaceMetrics,
  centreY: number,
  cute: number,
): void {
  const { shape, pose, poseHome, mouth, gazeX = 0, gazeY = 0 } = options;
  const { face: box } = shape;
  const { radius: r } = metrics;
  const matrix = poseMatrix(pose, poseHome);
  const midX = box.x + box.leftDX / 2 + gazeX * CUTE_GAZE;
  const chin = shape.bottom - r;

  const shapeAt = (points: Point[], cx: number, cy: number): EyeShape => {
    const projected = projectOnSphere(cx, cy, matrix);
    return { points, transform: tangentTransform(projected, cx, cy), visible: projected.visible };
  };
  const inside = (x: number, y: number, half: number): number => {
    const [lo, hi] = shape.spanAt(clamp(y, shape.top + 4, shape.bottom - 4));
    return clamp(x, lo + half, hi - half);
  };

  const by = Math.min(centreY + r * CUTE_BLUSH.y + gazeY * CUTE_GAZE, chin);
  const cheek = (side: -1 | 1): EyeShape => {
    const bx = inside(midX + side * r * CUTE_BLUSH.x, by, r * CUTE_BLUSH.rx);
    return shapeAt(ellipse(bx, by, r * CUTE_BLUSH.rx, r * CUTE_BLUSH.ry), bx, by);
  };
  placement.blush = { left: cheek(-1), right: cheek(1) };

  if (!mouth) return;
  const my = Math.min(centreY + r * CUTE_MOUTH_DROP + gazeY * CUTE_GAZE, chin - r * mouth.open);
  const mx = inside(midX, my, r * mouth.width);
  const outline = mouthOutline(mouth, r).map(([x, y]) => [mx + x, my + y] as Point);
  placement.mouth = {
    ...shapeAt(outline, mx, my),
    closed: true,
    opacity: (mouth.show ?? 1) * cute,
  };
  // A mouth that has opened up is a filled shape; stroking it as well would fatten it by the line weight.
  placement.mouthWeight = r * CUTE_MOUTH_WEIGHT;
  placement.mouthStroke = placement.mouthWeight * clamp(1 - mouth.open / CUTE_MOUTH_FILLED, 0, 1);
}
/**
 * Eye radius as a fraction of the body's width at eye height.
 *
 * The eyes are sized against the body, not against the fitted ellipse: the
 * ellipse is a conservative fit that comes out very different on a circle and
 * a crescent, and sizing from it left a narrow body with eyes half the size
 * of a circle's. A face drawn on a ball is drawn against the ball.
 */
const EYE_BODY = 0.165;
/**
 * Cap on the eye radius as a fraction of the body's height, so a flat body (a
 * tofu, a cloud) gets eyes that fit between its top and its chin.
 */
const EYE_TALL = 0.16;
/**
 * Floor on the eye radius as a fraction of the body's height, so a body that
 * is thin where the face sits (a crescent's horn) still gets legible eyes.
 */
const EYE_FLOOR = 0.085;
/** Distance from face centre to each eye, as a fraction of the body's width at eye height. */
const EYE_SEPARATION = 0.125;
/**
 * Horizontal stretch applied to every eye outline. The topologies are drawn
 * as tall strokes; widened by this much the open eye reads as an oval rather
 * than a slit, and the closed and smiling strokes span a matching width.
 */
const EYE_WIDEN = 1.5;

export interface PlacementOptions {
  shape: ShapeDef;
  eyes: EyePair;
  faceTune: FaceTune;
  pose: Pose;
  poseHome: PoseHome;
  /** Extra multiplier on eye size, driven by the emphasis spring. */
  eyeScale?: number;
  /** Vertical squeeze applied to simulate a blink. 1 is open, 0.05 closed. */
  blink?: number;
  /** Gaze offset in shape-space units. */
  gazeX?: number;
  gazeY?: number;
  /** Face style. Defaults to `eyes`. */
  face?: FaceStyle;
  /**
   * How far into the cute face it is, 0..1: the same easing role as
   * `lineBlend`, for a live switch to or from `cute`. Defaults to 1 when
   * `face` is `cute`, 0 otherwise.
   */
  cuteBlend?: number;
  /**
   * How far into line mode the face is, 0..1. Lets a live switch between the
   * two styles ease the eye size rather than snap. Defaults to 1 when `face`
   * is `line`, 0 otherwise.
   */
  lineBlend?: number;
  /** Mouth to draw in the line and cute faces. */
  mouth?: MouthSpec;
  /** Nose to draw in line mode. `null` draws none. */
  nose?: NoseId | null;
  /**
   * Stroke weight as a fraction of the fitted eye radius. Defaults to the
   * shared `LINE_WEIGHT`; pass `resolveLineWeight(multiplier)` to give one
   * character a heavier or lighter pen.
   */
  lineWeight?: number;
}

/**
 * Work out where the two eyes go and how they are distorted by the pose.
 *
 * Both eyes are anchored either side of the fitted face centre, clamped so
 * they cannot escape the silhouette, then lifted onto the notional sphere and
 * projected back. The projection is what makes the far eye compress as the
 * head turns.
 */
export function computeEyePlacement(options: PlacementOptions): EyePlacement {
  const { left, right } = computeFacePlacement(options);
  return { left, right };
}

/** An eye's outline and its extras as one path: separate subpaths of one shape. */
export const eyePath = (shape: EyeShape): string =>
  polylinePath(shape.points) + (shape.extras ?? []).map((ring) => polylinePath(ring)).join('');

const writeEye = (shape: EyeShape): PlacedEye => ({
  path: eyePath(shape),
  transform: tangentTransformString(shape.transform),
  visible: shape.visible,
});

const writeFeature = (shape: FeatureShape): PlacedFeature => ({
  path: polylinePath(shape.points, shape.closed),
  transform: tangentTransformString(shape.transform),
  visible: shape.visible,
});

/**
 * The same placement as SVG strings. A thin wrapper over `computeFaceGeometry`
 * so the two cannot drift apart.
 */
export function computeFacePlacement(options: PlacementOptions): FacePlacement {
  const geometry = computeFaceGeometry(options);
  const placement: FacePlacement = {
    left: writeEye(geometry.left),
    right: writeEye(geometry.right),
    lineWidth: geometry.lineWidth,
    eyeRadius: geometry.eyeRadius,
  };
  if (geometry.nose) placement.nose = writeFeature(geometry.nose);
  if (geometry.mouth) placement.mouth = writeFeature(geometry.mouth);
  return placement;
}

/**
 * Place the whole face: eyes, and in line mode the nose and mouth too.
 *
 * The three sit on one plate. Nose and mouth anchors are projected with the
 * same pose matrix as the eyes and take a share of the same gaze offset, so a
 * head turn compresses the face as a unit instead of letting the features
 * drift apart.
 */
export function computeFaceGeometry(options: PlacementOptions): FaceGeometry {
  const {
    shape,
    eyes,
    faceTune,
    pose,
    poseHome,
    eyeScale = 1,
    blink = 1,
    gazeX = 0,
    gazeY = 0,
    face = 'eyes',
    mouth,
    nose,
  } = options;
  const lineBlend = clamp(options.lineBlend ?? (face === 'line' ? 1 : 0), 0, 1);
  const cute = clamp(options.cuteBlend ?? (face === 'cute' ? 1 : 0), 0, 1);

  const { face: box } = shape;
  const matrix = poseMatrix(pose, poseHome);

  // `box` is the largest ellipse that fits the body. It decides where the
  // face sits; how big the face is comes from the body itself, below.

  // Eyes belong in the upper half. Anchoring them at the fitted centre puts
  // them at the body's waist, which reads as a torso rather than a head.
  const lineCentreY = box.y - box.sy * FACE_LIFT * faceTune.height;
  const cuteFace = cute > 0 ? measureCuteFace(options) : null;
  const centreY = cuteFace ? lerp(lineCentreY, cuteFace.centreY, cute) : lineCentreY;

  // Eye size follows the body's width at eye height, capped by its height, so
  // a cramped body gets smaller eyes automatically rather than needing a
  // per-shape override.
  const [rowLo, rowHi] = shape.spanAt(clamp(centreY, shape.top + 4, shape.bottom - 4));
  const rowWidth = Math.max(rowHi - rowLo, 1);
  const bodyHeight = Math.max(shape.bottom - shape.top, 1);
  const radius =
    Math.max(Math.min(rowWidth * EYE_BODY, bodyHeight * EYE_TALL), bodyHeight * EYE_FLOOR) *
    faceTune.size *
    box.eye *
    eyeScale;
  const separation = lerp(rowWidth * EYE_SEPARATION * faceTune.gap, cuteFace?.separation ?? 0, cute);

  // One stroke weight for everything drawn as a line, in shape units.
  const lineWidth = radius * (options.lineWeight ?? LINE_WEIGHT);

  // In line mode the eyes shrink towards dot proportions and the thin
  // expressions are floored to the line weight. Both ease with `lineBlend`.
  const shrinkX = 1 + (LINE_FACE_TUNE.eyeWidth - 1) * lineBlend;
  const shrinkY = 1 + (LINE_FACE_TUNE.eyeHeight - 1) * lineBlend;
  // The cute face's eyes are round and sized from their own radius.
  const cuteRadius = cuteFace?.radius ?? 0;
  const sizeXOpen = lerp(radius * faceTune.eyeWidth * shrinkX * EYE_WIDEN, cuteRadius, cute);
  const sizeYOpen = lerp(radius * faceTune.eyeHeight * shrinkY, cuteRadius, cute);
  // Half-thickness floor in unit-eye space: the ribbon is built at radius 1
  // and then scaled by `sizeY`, so divide the target half-width back out.
  const minWidth = lineBlend > 0 ? (lineWidth / 2 / sizeYOpen) * lineBlend : 0.012;
  // A blink in line mode squashes the eye to a line of the shared weight, not
  // to nothing: `neutral` is 2 * (len + width) = 2.12 units tall.
  const blinkFloor = lineBlend > 0 ? (lineWidth / (2.12 * sizeYOpen)) * lineBlend : 0;
  const blinkEff = Math.max(blink, blinkFloor);

  const build = (spec: EyePair[number], side: -1 | 1): EyeShape => {
    const sizeX = sizeXOpen;
    const sizeY = sizeYOpen * blinkEff;

    const anchorX = centreOf(side) + spec.dx * radius;
    const anchorY = centreY + spec.dy * radius + gazeY;

    // Keep the eye inside the body outline at its own height.
    const [lo, hi] = shape.spanAt(clamp(anchorY, shape.top + 4, shape.bottom - 4));
    const margin = lerp(radius, cuteRadius, cute) * 1.1;
    const cx = clamp(anchorX, lo + margin, hi - margin);
    const cy = anchorY;

    // Build the outline at unit scale, then stretch it. Scaling after the
    // fact keeps the blink squeeze (sizeY) independent of the stroke geometry.
    const place = ([x, y]: Point): Point => [cx + x * sizeX, cy + y * sizeY];
    const outline = eyeOutline(spec, 1, 28, Math.max(0.012, minWidth)).map(place);
    const extras = cute > 0 ? eyeExtras(spec, 1, 28).map((ring) => ring.map(place)) : [];

    const projected: ProjectedPoint = projectOnSphere(cx, cy, matrix);

    return {
      points: outline,
      transform: tangentTransform(projected, cx, cy),
      visible: projected.visible,
      ...(extras.length > 0 ? { extras } : null),
    };
  };

  function centreOf(side: -1 | 1): number {
    const base = box.x + side * separation + gazeX;
    return side === -1 ? base + box.leftDX : base;
  }

  const placement: FaceGeometry = {
    left: build(eyes[0], -1),
    right: build(eyes[1], 1),
    lineWidth,
    eyeRadius: radius,
  };

  if (face !== 'line' && cute > 0 && cuteFace) addCuteFeatures(placement, options, cuteFace, centreY, cute);
  if (face !== 'line') return placement;

  // The face's own centre line, halfway between the eyes including the
  // left-eye nudge, so the nose sits between them on lopsided shapes too.
  const midX = box.x + box.leftDX / 2;

  const feature = (points: Point[], cx: number, cy: number, closed: boolean): FeatureShape => {
    const projected = projectOnSphere(cx, cy, matrix);
    return {
      points,
      closed,
      transform: tangentTransform(projected, cx, cy),
      visible: projected.visible,
    };
  };

  const inside = (x: number, y: number, half: number): number => {
    const [lo, hi] = shape.spanAt(clamp(y, shape.top + 4, shape.bottom - 4));
    return clamp(x, lo + half + lineWidth, hi - half - lineWidth);
  };

  // Flat or squat bodies have less room under the eyes than tall ones; keep
  // both features above the chin rather than letting them slide off it.
  const chin = shape.bottom - lineWidth * 2;

  if (nose) {
    const ny = Math.min(centreY + radius * NOSE_DROP + gazeY * NOSE_GAZE, chin - radius * 0.9);
    const nx = inside(midX + gazeX * NOSE_GAZE, ny, radius * 0.3);
    placement.nose = feature(nosePolyline(nose, radius, nx, ny), nx, ny, false);
  }

  if (mouth) {
    const my = Math.min(
      centreY + radius * MOUTH_DROP + gazeY * MOUTH_GAZE,
      chin - radius * (0.3 + mouth.open),
    );
    const mx = inside(midX + gazeX * MOUTH_GAZE, my, radius * mouth.width);
    const outline = mouthOutline(mouth, radius).map(([x, y]) => [mx + x, my + y] as Point);
    placement.mouth = feature(outline, mx, my, true);
  }

  return placement;
}

/**
 * The face turned `yaw` radians about the body's vertical axis, as the body spins.
 *
 * Each feature slides round the body at its own height, over the body's
 * half-width there rather than a sphere's, so on a narrow body it never leaves
 * the silhouette. It narrows towards the edge and is hidden once it has gone
 * round the back. At a whole number of turns the face is unchanged.
 */
export function turnFace(geometry: FaceGeometry, shape: ShapeDef, yaw: number): FaceGeometry {
  const turn = <T extends EyeShape>(feature: T): T => {
    const { x, y, matrix } = feature.transform;
    const [lo, hi] = shape.spanAt(clamp(y, shape.top + 1, shape.bottom - 1));
    const middle = (lo + hi) / 2;
    const half = Math.max((hi - lo) / 2, 1);
    const longitude = Math.asin(clamp((x - middle) / half, -1, 1));
    const facing = Math.cos(longitude + yaw);
    if (facing <= 0.05) return { ...feature, visible: false };
    const squeeze = facing / Math.max(Math.cos(longitude), 0.3);
    const [a, b, c, d] = matrix;
    return {
      ...feature,
      transform: {
        ...feature.transform,
        x: middle + half * Math.sin(longitude + yaw),
        matrix: [a * squeeze, b, c * squeeze, d],
      },
    };
  };
  return {
    ...geometry,
    left: turn(geometry.left),
    right: turn(geometry.right),
    nose: geometry.nose && turn(geometry.nose),
    mouth: geometry.mouth && turn(geometry.mouth),
    blush: geometry.blush && { left: turn(geometry.blush.left), right: turn(geometry.blush.right) },
  };
}
