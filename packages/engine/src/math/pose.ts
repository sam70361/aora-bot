import { CENTER, type Pose, type PoseHome } from '../core/types.js';
import { roundTo } from './round.js';

export type Mat3 = readonly [number, number, number, number, number, number, number, number, number];

const DEG = Math.PI / 180;

/**
 * Rotation matrix for a turn/tilt/roll triple, applied Y then X then Z.
 * `turn` swings the head left and right, `tilt` nods it, `roll` leans it.
 */
function rotationMatrix(turn: number, tilt: number, roll: number): Mat3 {
  const cy = Math.cos(turn * DEG);
  const sy = Math.sin(turn * DEG);
  const cx = Math.cos(tilt * DEG);
  const sx = Math.sin(tilt * DEG);
  const cz = Math.cos(roll * DEG);
  const sz = Math.sin(roll * DEG);

  // Rz * Rx * Ry
  return [
    cz * cy + sz * sx * sy,
    -sz * cx,
    cz * -sy + sz * sx * cy,
    sz * cy - cz * sx * sy,
    cz * cx,
    sz * -sy - cz * sx * cy,
    cx * sy,
    sx,
    cx * cy,
  ];
}

function multiplyMat3(a: Mat3, b: Mat3): Mat3 {
  const cell = (r: number, c: number): number =>
    a[r * 3]! * b[c]! + a[r * 3 + 1]! * b[3 + c]! + a[r * 3 + 2]! * b[6 + c]!;
  return [
    cell(0, 0),
    cell(0, 1),
    cell(0, 2),
    cell(1, 0),
    cell(1, 1),
    cell(1, 2),
    cell(2, 0),
    cell(2, 1),
    cell(2, 2),
  ];
}

function applyMat3(m: Mat3, x: number, y: number, z: number): [number, number, number] {
  return [m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z];
}

export interface ProjectedPoint {
  /** Projected centre in shape space. */
  x: number;
  y: number;
  /** 2x2 affine [a b c d] mapping the tangent plane to screen space. */
  matrix: [number, number, number, number];
  /** Depth along the view axis. Negative means the point rotated out of sight. */
  z: number;
  /** False once the point is on the far side of the sphere. */
  visible: boolean;
}

/**
 * Project a point on the character's notional sphere through the current pose.
 *
 * The body is drawn flat, but the face behaves as though painted on a sphere:
 * each eye is lifted onto the unit sphere, rotated, and then the local tangent
 * plane is projected back to 2D. That 2x2 result is what squashes an eye as it
 * approaches the silhouette edge, which is what sells the turn as three
 * dimensional without any actual 3D rendering.
 */
export function projectOnSphere(cx: number, cy: number, matrix: Mat3, sx = 1, sy = 1): ProjectedPoint {
  // Lift to the unit sphere. X/Y are normalised offsets from centre; Z is
  // whatever is left over to reach radius 1.
  const X = (cx - CENTER) / CENTER;
  const Y = (CENTER - cy) / CENTER;
  const planar = X * X + Y * Y;
  const Z = Math.sqrt(Math.max(0, 1 - planar));

  const [rx, ry, rz] = applyMat3(matrix, X, Y, Z);

  // Tangent basis at the original point.
  //
  // It has to be built by projecting the world axes onto the tangent plane,
  // not from the polar/azimuthal directions. The polar frame spins with the
  // point's position around the sphere, so an eye placed off to one side would
  // arrive pre-rotated by however far around it sat — a twist of a hundred
  // degrees or more for a perfectly ordinary face position.
  //
  // Seeding from world right keeps the frame upright, and reduces to the
  // identity for a point facing the viewer under no rotation.
  const nx = X;
  const ny = Y;
  const nz = Z;

  // Fall back to world up when the normal is parallel to world right.
  const seedIsRight = Math.abs(nx) < 0.999;
  const sxAxis = seedIsRight ? 1 : 0;
  const syAxis = seedIsRight ? 0 : 1;

  const dot = sxAxis * nx + syAxis * ny;
  let ux = sxAxis - dot * nx;
  let uy = syAxis - dot * ny;
  let uz = -dot * nz;
  const ulen = Math.hypot(ux, uy, uz) || 1;
  ux /= ulen;
  uy /= ulen;
  uz /= ulen;

  // v = n x u, which is the local "up" on the sphere surface.
  const vx = ny * uz - nz * uy;
  const vy = nz * ux - nx * uz;
  const vz = nx * uy - ny * ux;

  const [aux, auy] = applyMat3(matrix, ux, uy, uz);
  const [avx, avy] = applyMat3(matrix, vx, vy, vz);

  // Rebuild the 2x2 in screen space. Local y points down in SVG while v points
  // up on the sphere, so the second column is negated. As a point rotates
  // toward the silhouette its tangent vectors tip away from the screen and
  // their projections shorten, which is the foreshortening that sells the turn.
  const a = aux * sx;
  const b = -auy * sy;
  const c = -avx * sx;
  const d = avy * sy;

  return {
    x: CENTER + rx * CENTER * sx,
    y: CENTER - ry * CENTER * sy,
    matrix: [a, b, c, d],
    z: rz,
    visible: rz > 0.02,
  };
}

/** Combined pose and rest-pose matrix. */
export function poseMatrix(pose: Pose, home: PoseHome): Mat3 {
  return multiplyMat3(
    rotationMatrix(pose.turn, pose.tilt, pose.roll),
    rotationMatrix(home.turn, home.tilt, home.roll),
  );
}

/**
 * Where a feature drawn around `(cx, cy)` lands after the sphere projection.
 *
 * Coordinates of the feature itself stay as they were built, around the pivot;
 * this says how to carry the pivot to `(x, y)` and how to distort the plane
 * around it. A renderer writes it out in whatever form it prefers
 * (`tangentTransformString` for SVG).
 */
export interface TangentTransform {
  /** Projected position of the pivot. */
  x: number;
  y: number;
  /** 2x2 linear part, `[a b c d]` in SVG `matrix()` order: `x' = a·x + c·y`, `y' = b·x + d·y`. */
  matrix: readonly [number, number, number, number];
  /** The pivot, in the feature's own coordinates. */
  pivotX: number;
  pivotY: number;
}

export function tangentTransform(p: ProjectedPoint, cx: number, cy: number): TangentTransform {
  return { x: p.x, y: p.y, matrix: p.matrix, pivotX: cx, pivotY: cy };
}

/** The same transform as an SVG attribute value, at four decimals. */
export function tangentTransformString(t: TangentTransform): string {
  const [a, b, c, d] = t.matrix;
  const r = (n: number) => roundTo(n, 4);
  return `translate(${r(t.x)} ${r(t.y)}) matrix(${r(a)} ${r(b)} ${r(c)} ${r(d)} 0 0) translate(${r(-t.pivotX)} ${r(-t.pivotY)})`;
}
