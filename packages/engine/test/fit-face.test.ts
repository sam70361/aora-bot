import { describe, expect, it } from 'vitest';
import { allShapes, getShape } from '../src/shapes/registry.js';
import { fitFace } from '../src/shapes/fit-face.js';
import { CENTER, SHAPE_IDS, type Point } from '../src/core/types.js';

/*
 * The fitter is what replaces hand-placing a face per shape, so the property
 * worth testing is the one that makes that possible: whatever outline it is
 * handed, the box it returns is inside the body and large enough to draw a
 * face in. A regression here does not throw — it quietly puts eyes on the
 * outside of a crescent.
 */

/** Even-odd winding test, so "inside" means inside the actual outline. */
function contains(points: readonly Point[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]!;
    const [xj, yj] = points[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const circle = (r: number, n = 96): Point[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [CENTER + Math.cos(a) * r, CENTER + Math.sin(a) * r] as Point;
  });

describe('fitFace', () => {
  it('puts the centre of the box inside the outline, for every shape', () => {
    for (const def of allShapes()) {
      expect(contains(def.ring, def.face.x, def.face.y), def.id).toBe(true);
    }
  });

  it('keeps the eye factor within the range the renderer expects', () => {
    for (const def of allShapes()) {
      expect(def.face.eye, def.id).toBeGreaterThanOrEqual(0.85);
      expect(def.face.eye, def.id).toBeLessThanOrEqual(1);
    }
  });

  it('returns a box with real extent, so there is somewhere to draw a face', () => {
    for (const def of allShapes()) {
      expect(def.face.sx, def.id).toBeGreaterThan(0);
      expect(def.face.sy, def.id).toBeGreaterThan(0);
    }
  });

  it('centres on a circle and grows the box to its radius', () => {
    const box = fitFace(circle(90));
    expect(box.x).toBeCloseTo(CENTER, 0);
    expect(box.y).toBeCloseTo(CENTER, 0);
    // The long axis reaches the outline. The box is not square, even in a
    // circle: the scorer rewards perimeter clearance, and a face box taller
    // than it is wide leaves more room around the eyes than a round one.
    expect(Math.max(box.sx, box.sy)).toBeCloseTo(90, 0);
    expect(Math.min(box.sx, box.sy)).toBeGreaterThan(45);
    // The roomiest body the engine draws sits near the top of the eye range
    // and nowhere near the floor a cramped one is pushed to.
    expect(box.eye).toBeGreaterThan(0.87);
    expect(box.eye).toBeLessThanOrEqual(1);
  });

  it('trims the eyes in a cramped body rather than letting them overflow', () => {
    const roomy = fitFace(circle(90));
    const tight = fitFace(circle(34));
    expect(tight.eye).toBeLessThan(roomy.eye);
    // ...but never below the floor, or a narrow body is penalised twice: the
    // eye radius already scales with the body's width at eye height.
    expect(tight.eye).toBeGreaterThanOrEqual(0.85);
    expect(fitFace(circle(8)).eye).toBe(0.85);
  });

  it('follows a hint away from the centre, which is what the crescent needs', () => {
    const ring = circle(90);
    const hinted = fitFace(ring, 0, [40, 0]);
    expect(hinted.x).toBeGreaterThan(fitFace(ring).x);
    expect(contains(ring, hinted.x, hinted.y)).toBe(true);
  });

  it('carries the left-eye offset through untouched', () => {
    expect(fitFace(circle(90), -7).leftDX).toBe(-7);
  });

  it('finds the space near the base of an onigiri rather than the apex', () => {
    // The one case worth naming: a triangle's room is all at the bottom, and
    // a fitter that anchored to the centroid would put the face in the point.
    const onigiri = getShape('onigiri');
    expect(onigiri.face.y).toBeGreaterThan(CENTER);
    expect(contains(onigiri.ring, onigiri.face.x, onigiri.face.y)).toBe(true);
  });

  it('derives a face for every shape the engine offers', () => {
    expect(allShapes()).toHaveLength(SHAPE_IDS.length);
  });
});
