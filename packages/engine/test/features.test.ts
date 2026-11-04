import { describe, expect, it } from 'vitest';
import {
  LINE_WEIGHT,
  MOUTHS,
  NOSES,
  getMouth,
  morphMouth,
  mouthOutline,
  nosePolyline,
  polygonArea,
  resampleOpen,
} from '../src/face/features.js';
import { computeEyePlacement, computeFacePlacement } from '../src/face/placement.js';
import { EYE_TOPOLOGIES, EYE_TOPOLOGY_IDS } from '../src/face/topologies.js';
import { autoNoseForKey } from '../src/math/hash.js';
import { CHARACTER_STATES, STATE_MOUTH, STATE_MOUTH_TALK, mouthForState } from '../src/motion/states.js';
import { getShape } from '../src/shapes/registry.js';
import {
  DEFAULT_FACE_TUNE,
  DEFAULT_POSE,
  DEFAULT_POSE_HOME,
  MOUTH_IDS,
  NOSE_IDS,
  SHAPE_IDS,
} from '../src/core/types.js';

describe('mouths', () => {
  it('defines every id and nothing else', () => {
    expect(Object.keys(MOUTHS).sort()).toEqual([...MOUTH_IDS].sort());
  });

  it('morphs between every pair to finite specs', () => {
    for (const a of MOUTH_IDS) {
      for (const b of MOUTH_IDS) {
        for (const t of [0, 0.5, 1]) {
          const m = morphMouth(getMouth(a), getMouth(b), t);
          for (const v of Object.values(m)) expect(Number.isFinite(v)).toBe(true);
          expect(m.width).toBeGreaterThan(0);
          expect(m.open).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('morph endpoints are the inputs', () => {
    expect(morphMouth(MOUTHS.flat, MOUTHS.open, 0)).toEqual(MOUTHS.flat);
    expect(morphMouth(MOUTHS.flat, MOUTHS.open, 1)).toEqual(MOUTHS.open);
  });

  it('has zero area when closed and positive area when open', () => {
    for (const id of MOUTH_IDS) {
      const spec = getMouth(id);
      const area = Math.abs(polygonArea(mouthOutline(spec, 20)));
      if (spec.open === 0) expect(area, `${id} should be a line`).toBeLessThan(1e-6);
      else expect(area, `${id} should enclose an area`).toBeGreaterThan(1);
    }
  });

  it('outline is finite, closed and scales with the radius', () => {
    const small = mouthOutline(MOUTHS.smile, 10);
    const large = mouthOutline(MOUTHS.smile, 20);
    expect(small.length).toBe(large.length);
    for (let i = 0; i < small.length; i++) {
      expect(large[i]![0]).toBeCloseTo(small[i]![0] * 2, 6);
      expect(large[i]![1]).toBeCloseTo(small[i]![1] * 2, 6);
    }
  });

  it('bend and skew move the apex as documented', () => {
    const smile = mouthOutline(MOUTHS.smile, 10);
    const frown = mouthOutline(MOUTHS.frown, 10);
    const mid = (pts: readonly (readonly [number, number])[]) => pts[Math.floor(pts.length / 4)]!;
    // A smile's centre sits lower (larger y) than its corners; a frown's higher.
    expect(mid(smile)[1]).toBeGreaterThan(smile[0]![1]);
    expect(mid(frown)[1]).toBeLessThan(frown[0]![1]);

    const smirk = mouthOutline(MOUTHS.smirk, 10);
    const lowest = smirk.reduce((best, p) => (p[1] > best[1] ? p : best));
    // Positive skew pushes the apex towards the +x corner.
    expect(lowest[0]).toBeGreaterThan(0);
  });
});

describe('state mouths', () => {
  it('covers every state with a known mouth', () => {
    for (const state of CHARACTER_STATES) {
      expect(STATE_MOUTH[state], `${state} has no mouth`).toBeDefined();
      expect(MOUTH_IDS).toContain(mouthForState(state));
    }
  });

  it('talking states are real states', () => {
    for (const s of STATE_MOUTH_TALK) expect(CHARACTER_STATES).toContain(s);
  });
});

describe('noses', () => {
  it('defines every id as sixteen finite points', () => {
    expect(Object.keys(NOSES).sort()).toEqual([...NOSE_IDS].sort());
    for (const id of NOSE_IDS) {
      const pts = NOSES[id];
      expect(pts).toHaveLength(16);
      for (const [x, y] of pts) expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
    }
  });

  it('is centred on its bounding box and about one to two radii tall', () => {
    for (const id of NOSE_IDS) {
      const ys = NOSES[id].map((p) => p[1]);
      const xs = NOSES[id].map((p) => p[0]);
      // Centred on the raw control points' box; an extreme on a curved tip
      // may fall between the sixteen samples, so allow a small drift.
      expect(Math.abs(Math.max(...ys) + Math.min(...ys))).toBeLessThan(0.05);
      expect(Math.abs(Math.max(...xs) + Math.min(...xs))).toBeLessThan(0.05);
      const height = Math.max(...ys) - Math.min(...ys);
      expect(height).toBeGreaterThan(1);
      expect(height).toBeLessThan(2.2);
    }
  });

  it('every nose has distinct geometry', () => {
    const seen = new Set(NOSE_IDS.map((id) => JSON.stringify(NOSES[id])));
    expect(seen.size).toBe(NOSE_IDS.length);
  });

  it('positions and scales the polyline', () => {
    const pts = nosePolyline('slant', 10, 100, 50);
    expect(pts).toHaveLength(16);
    const cx = (Math.max(...pts.map((p) => p[0])) + Math.min(...pts.map((p) => p[0]))) / 2;
    expect(cx).toBeCloseTo(100, 6);
  });

  it('resamples by arc length', () => {
    const pts = resampleOpen(
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      5,
    );
    expect(pts).toHaveLength(5);
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[4]![0]).toBeCloseTo(10, 6);
    expect(pts[4]![1]).toBeCloseTo(10, 6);
    // Halfway along a 20-unit path is the corner.
    expect(pts[2]![0]).toBeCloseTo(10, 6);
    expect(pts[2]![1]).toBeCloseTo(0, 6);
  });

  it('assigns a nose deterministically and independently of shape', () => {
    expect(autoNoseForKey('agent-1')).toBe(autoNoseForKey('agent-1'));
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) seen.add(autoNoseForKey(`k${i}`));
    expect(seen.size).toBe(NOSE_IDS.length);
  });
});

describe('face placement', () => {
  const base = {
    faceTune: DEFAULT_FACE_TUNE,
    pose: DEFAULT_POSE,
    poseHome: DEFAULT_POSE_HOME,
    eyes: EYE_TOPOLOGIES.neutral,
  };

  it('eyes-only placement is unchanged by the line-face fields', () => {
    const shape = getShape('blob');
    const eyes = computeEyePlacement({ shape, ...base });
    const face = computeFacePlacement({ shape, ...base, face: 'eyes', nose: 'hook', mouth: MOUTHS.grin });
    expect(face.left).toEqual(eyes.left);
    expect(face.right).toEqual(eyes.right);
    expect(face.nose).toBeUndefined();
    expect(face.mouth).toBeUndefined();
  });

  it('line mode places a nose and a mouth at the shared weight', () => {
    const shape = getShape('blob');
    const p = computeFacePlacement({ shape, ...base, face: 'line', nose: 'slant', mouth: MOUTHS.soft });
    expect(p.nose?.path.startsWith('M')).toBe(true);
    expect(p.nose?.path.endsWith('Z')).toBe(false);
    expect(p.mouth?.path.endsWith('Z')).toBe(true);
    expect(p.lineWidth).toBeGreaterThan(0);
    // lineWidth is LINE_WEIGHT of the eye radius, and the eye radius on a
    // blob is in the low twenties.
    expect(p.lineWidth / LINE_WEIGHT).toBeGreaterThan(15);
    expect(p.lineWidth / LINE_WEIGHT).toBeLessThan(30);
  });

  it('a null nose draws no nose', () => {
    const p = computeFacePlacement({
      shape: getShape('blob'),
      ...base,
      face: 'line',
      nose: null,
      mouth: MOUTHS.soft,
    });
    expect(p.nose).toBeUndefined();
    expect(p.mouth).toBeDefined();
  });

  it.each(SHAPE_IDS)('%s keeps nose and mouth inside the silhouette, below the eyes', (id) => {
    const shape = getShape(id);
    for (const mouthId of ['open', 'grin', 'flat'] as const) {
      const p = computeFacePlacement({
        shape,
        ...base,
        face: 'line',
        nose: 'long',
        mouth: MOUTHS[mouthId],
      });
      const eyeY = anchorOf(p.left.transform)[1];
      const nose = anchorOf(p.nose!.transform);
      const mouth = anchorOf(p.mouth!.transform);

      expect(nose[1]).toBeGreaterThan(eyeY);
      expect(mouth[1]).toBeGreaterThan(nose[1]);
      expect(mouth[1]).toBeLessThan(shape.bottom);

      const [nlo, nhi] = shape.spanAt(nose[1]);
      expect(nose[0]).toBeGreaterThan(nlo);
      expect(nose[0]).toBeLessThan(nhi);
      const [mlo, mhi] = shape.spanAt(mouth[1]);
      expect(mouth[0]).toBeGreaterThan(mlo);
      expect(mouth[0]).toBeLessThan(mhi);
    }
  });

  it('nose and mouth follow a share of the gaze, as one plate', () => {
    const shape = getShape('blob');
    const still = computeFacePlacement({ shape, ...base, face: 'line', nose: 'slant', mouth: MOUTHS.soft });
    const moved = computeFacePlacement({
      shape,
      ...base,
      face: 'line',
      nose: 'slant',
      mouth: MOUTHS.soft,
      gazeX: 10,
    });
    const dNose = anchorOf(moved.nose!.transform)[0] - anchorOf(still.nose!.transform)[0];
    const dMouth = anchorOf(moved.mouth!.transform)[0] - anchorOf(still.mouth!.transform)[0];
    expect(dNose).toBeGreaterThan(0);
    expect(dMouth).toBeGreaterThan(0);
    expect(dNose).toBeLessThan(10);
    expect(dMouth).toBeLessThan(dNose);
  });

  it('thin expressions render at the line weight in line mode, and stay distinct', () => {
    const shape = getShape('blob');
    const paths = new Map<string, string>();
    for (const id of EYE_TOPOLOGY_IDS) {
      const p = computeFacePlacement({
        shape,
        ...base,
        eyes: EYE_TOPOLOGIES[id],
        face: 'line',
        mouth: MOUTHS.flat,
      });
      const prev = paths.get(p.left.path);
      expect(prev, `${id} renders identically to ${prev}`).toBeUndefined();
      paths.set(p.left.path, id);
    }
    // `closed` must be at least as thick as the shared stroke.
    const closed = computeFacePlacement({ shape, ...base, eyes: EYE_TOPOLOGIES.closed, face: 'line' });
    const ys = closed.left.path
      .slice(1, -1)
      .split('L')
      .map((seg) => Number(seg.split(' ')[1]));
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThanOrEqual(closed.lineWidth * 0.95);
  });
});

/** The projected anchor a placement's transform translates to. */
function anchorOf(transform: string): [number, number] {
  const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(transform)!;
  return [Number(m[1]), Number(m[2])];
}
