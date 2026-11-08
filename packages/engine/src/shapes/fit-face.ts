import { clamp } from '../math/easing.js';
import { CENTER, type FaceBox, type Point } from '../core/types.js';

/**
 * Distance from a point to the outline.
 *
 * Squared distances are compared and the root taken once at the end. This
 * runs a few hundred thousand times per shape — the fitter below probes it
 * seventeen times per candidate — and `Math.hypot` inside the loop would be most
 * of the cost of deriving a shape.
 */
function distanceToOutline(points: readonly Point[], x: number, y: number): number {
  let best = Infinity;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i]!;
    const b = points[i + 1 === n ? 0 : i + 1]!;
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const apx = x - a[0];
    const apy = y - a[1];
    const len2 = abx * abx + aby * aby;
    let t = len2 > 0 ? (apx * abx + apy * aby) / len2 : 0;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const dx = apx - abx * t;
    const dy = apy - aby * t;
    const d2 = dx * dx + dy * dy;
    if (d2 < best) best = d2;
  }
  return Math.sqrt(best);
}

/** Even-odd point-in-polygon. */
function inside(polygon: readonly Point[], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

const ASPECT_CANDIDATES = [1 / 1.45, 1 / 1.28, 1 / 1.12, 1, 1.12, 1.28, 1.45];

/** Smallest eye-size multiplier a cramped face box may ask for. */
const EYE_FACTOR_FLOOR = 0.85;

const PROBE_COS = Array.from({ length: 16 }, (_, i) => Math.cos((i / 16) * Math.PI * 2));
const PROBE_SIN = Array.from({ length: 16 }, (_, i) => Math.sin((i / 16) * Math.PI * 2));

/**
 * Find the largest ellipse that fits comfortably inside a body outline.
 *
 * This is what decides where a face sits. Rather than hand-placing eyes per
 * shape, the fitter searches for the roomiest spot and the eyes follow. That
 * is why the onigiri ends up with its face low (the triangle only has space
 * near the base) and the egg sits slightly below centre, without either being
 * special-cased.
 *
 * The search is two-level: a coarse pass on an 8-unit grid, then a refinement
 * pass at 2 units around the winner. Scoring rewards clearance from the
 * outline and penalises drifting away from the centre, so a shape with two
 * equally roomy spots picks the one that looks intentional.
 *
 * `hint` moves the search origin. The grid is narrow horizontally — bodies
 * are centred by construction — so a shape whose mass sits off to one side,
 * like a crescent, has to say so or the fitter lands in the notch.
 *
 * `avoid` are outlines drawn over the body that the face must stay off, such
 * as hair: a point inside one has no room, and one outside is only as roomy
 * as its distance to the nearest edge, body or obstacle.
 */
export function fitFace(
  points: readonly Point[],
  leftDX = 0,
  hint: Point = [0, 0],
  avoid: readonly (readonly Point[])[] = [],
): FaceBox {
  const originX = CENTER + hint[0];
  const originY = CENTER + hint[1];
  let best = { x: originX, y: originY, sx: 40, sy: 40, score: -Infinity };

  const room =
    avoid.length === 0
      ? (x: number, y: number) => distanceToOutline(points, x, y)
      : (x: number, y: number) => {
          let d = distanceToOutline(points, x, y);
          for (const obstacle of avoid) {
            if (inside(obstacle, x, y)) return 0;
            d = Math.min(d, distanceToOutline(obstacle, x, y));
          }
          return d;
        };

  // The centre's clearance does not depend on the aspect, so it is measured
  // once per candidate position and shared by all seven ellipses tried there.
  const evaluate = (cx: number, cy: number) => {
    // Grow the ellipse until it touches the outline.
    const clearance = room(cx, cy);
    if (clearance <= 0) return;
    const offCentre = Math.hypot(cx - originX, cy - originY);

    for (const aspect of ASPECT_CANDIDATES) {
      const sx = clearance * (aspect >= 1 ? 1 : aspect);
      const sy = clearance * (aspect >= 1 ? 1 / aspect : 1);

      // Probe the ellipse perimeter; the tightest point limits the fit.
      let tightest = Infinity;
      for (let i = 0; i < 16; i++) {
        const px = cx + sx * PROBE_COS[i]!;
        const py = cy + sy * PROBE_SIN[i]!;
        const d = room(px, py);
        if (d < tightest) tightest = d;
      }

      const score = clearance + tightest * 0.6 - offCentre * 0.22;
      if (score > best.score) best = { x: cx, y: cy, sx, sy, score };
    }
  };

  for (let dx = -16; dx <= 16; dx += 8) {
    for (let dy = -56; dy <= 56; dy += 8) evaluate(originX + dx, originY + dy);
  }

  const coarse = { x: best.x, y: best.y };
  for (let dx = -8; dx <= 8; dx += 2) {
    for (let dy = -8; dy <= 8; dy += 2) evaluate(coarse.x + dx, coarse.y + dy);
  }

  // A mild trim for cramped bodies. The eye radius is sized from the body's
  // width at eye height (see `placement.ts`), so this only has to say "a
  // little smaller in here", not carry the whole size. A low floor here would
  // penalise narrow bodies twice.
  return { x: best.x, y: best.y, sx: best.sx, sy: best.sy, eye: eyeFactor(best.sx, best.sy), leftDX };
}

/** The eye size a face box of these half-extents has room for. */
export function eyeFactor(sx: number, sy: number): number {
  const min = Math.min(sx, sy);
  const max = Math.max(sx, sy);
  return clamp((min * 0.7 + max * 0.3) * 0.0126, EYE_FACTOR_FLOOR, 1);
}
