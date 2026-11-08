import { describe, expect, it } from 'vitest';
import { allShapes, getShape } from '../src/shapes/registry.js';
import { CENTER, SHAPE_IDS, SHAPE_SPACE } from '../src/core/types.js';
import { renderStaticSvg, renderStaticSvgDataUrl } from '../src/render/static-svg.js';
import { spring, stepSpring, springPosition } from '../src/math/spring.js';
import { autoColorForKey, autoShapeForKey, fnv1a32 } from '../src/math/hash.js';
import { evaluateBelt, BELT_KINDS } from '../src/motion/belts.js';
import { CHARACTER_STATES, STATE_EYE_TOPOLOGIES } from '../src/motion/states.js';
import { EYE_TOPOLOGIES } from '../src/face/topologies.js';

describe('shape registry', () => {
  it('derives every shape without throwing', () => {
    expect(() => allShapes()).not.toThrow();
    expect(allShapes()).toHaveLength(SHAPE_IDS.length);
  });

  it.each(SHAPE_IDS)('%s produces a sane outline', (id) => {
    const shape = getShape(id);

    expect(shape.path.startsWith('M')).toBe(true);
    expect(shape.path).not.toContain('NaN');

    // Normalisation targets just under SHAPE_SPACE across the larger axis, centred on CENTER.
    // Ears, leaves and antennae count towards that box, so the extent is
    // measured over the body ring and its parts together. The ring is a
    // 96-ray sampling, so a sharp ear tip can fall a few units short of the
    // true outline; the centre is therefore checked to within 5 units.
    const ys = [...shape.ring, ...shape.parts.flatMap((part) => part.outline)].map(([, y]) => y);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    expect(shape.bottom - shape.top).toBeGreaterThan(100);
    expect(bottom - top).toBeLessThanOrEqual(SHAPE_SPACE);
    expect(Math.abs((top + bottom) / 2 - CENTER)).toBeLessThan(5);

    expect(shape.radius).toBeGreaterThan(80);
    expect(shape.beltRadius).toBeGreaterThan(40);
    expect(shape.tiltScale).toBeGreaterThanOrEqual(0.15);
    expect(shape.tiltScale).toBeLessThanOrEqual(1);
    expect(shape.ring).toHaveLength(96);
  });

  it.each(SHAPE_IDS)('%s fits a face inside its own outline', (id) => {
    const { face, spanAt } = getShape(id);
    const [lo, hi] = spanAt(face.y);

    expect(face.x).toBeGreaterThan(lo);
    expect(face.x).toBeLessThan(hi);
    expect(face.sx).toBeGreaterThan(8);
    expect(face.sy).toBeGreaterThan(8);
    expect(face.eye).toBeGreaterThanOrEqual(0.64);
    expect(face.eye).toBeLessThanOrEqual(1);
  });

  it('gives flat-bottomed shapes a smaller tilt allowance than round ones', () => {
    // A bot should resist tipping more than a blob does.
    expect(getShape('bot').tiltScale).toBeLessThan(getShape('blob').tiltScale);
    expect(getShape('tofu').tiltScale).toBeLessThan(getShape('pebble').tiltScale);
  });
});

describe('deterministic assignment', () => {
  it('is stable for the same key', () => {
    expect(autoColorForKey('agent-42')).toBe(autoColorForKey('agent-42'));
    expect(autoShapeForKey('agent-42')).toBe(autoShapeForKey('agent-42'));
  });

  it('never assigns black, which is reserved for defaults', () => {
    for (let i = 0; i < 400; i++) expect(autoColorForKey(`k${i}`)).not.toBe('black');
  });

  it('spreads keys across the whole pool', () => {
    const shapes = new Set<string>();
    const colors = new Set<string>();
    for (let i = 0; i < 500; i++) {
      shapes.add(autoShapeForKey(`user-${i}`));
      colors.add(autoColorForKey(`user-${i}`));
    }
    expect(shapes.size).toBe(8);
    // Every palette colour but black, which is reserved for defaults.
    expect(colors.size).toBe(11);
  });

  it('hashes to a 32-bit unsigned value', () => {
    const h = fnv1a32('aora');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(h)).toBe(true);
  });
});

describe('springs', () => {
  it('converges on its target', () => {
    const s = spring(0, 6, 1);
    s.target = 10;
    for (let i = 0; i < 200; i++) stepSpring(s, 1 / 60);
    expect(s.value).toBeCloseTo(10, 2);
  });

  it('is frame-rate independent', () => {
    const at60 = spring(0, 6, 1);
    const at144 = spring(0, 6, 1);
    at60.target = 1;
    at144.target = 1;
    for (let i = 0; i < 60; i++) stepSpring(at60, 1 / 60);
    for (let i = 0; i < 144; i++) stepSpring(at144, 1 / 144);
    expect(at60.value).toBeCloseTo(at144.value, 3);
  });

  it('overshoots when underdamped and does not when critically damped', () => {
    const under = spring(0, 10, 0.4);
    const critical = spring(0, 10, 1);
    under.target = 1;
    critical.target = 1;
    let underMax = 0;
    let criticalMax = 0;
    for (let i = 0; i < 300; i++) {
      underMax = Math.max(underMax, stepSpring(under, 1 / 120));
      criticalMax = Math.max(criticalMax, stepSpring(critical, 1 / 120));
    }
    expect(underMax).toBeGreaterThan(1);
    expect(criticalMax).toBeLessThanOrEqual(1.001);
  });

  it('analytic position matches the integrator', () => {
    const s = spring(0, 8, 1);
    s.target = 1;
    for (let i = 0; i < 60; i++) stepSpring(s, 1 / 120);
    expect(s.value).toBeCloseTo(springPosition(0.5, 8, 1), 1);
  });
});

describe('belts', () => {
  it.each(BELT_KINDS)('%s evaluates to finite geometry across a full cycle', (kind) => {
    for (let t = 0; t < 6; t += 0.05) {
      const frame = evaluateBelt(kind, t);
      expect(Number.isFinite(frame.coreX)).toBe(true);
      expect(Number.isFinite(frame.coreY)).toBe(true);
      expect(frame.coreScale).toBeGreaterThan(0);
      for (const d of frame.dots) {
        expect(Number.isFinite(d.x) && Number.isFinite(d.y)).toBe(true);
        expect(d.r).toBeGreaterThanOrEqual(0);
      }
      for (const ring of frame.rings) {
        expect(Number.isFinite(ring.r)).toBe(true);
        expect(ring.r).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('is pure — the same time always gives the same frame', () => {
    expect(evaluateBelt('orbit', 1.234)).toEqual(evaluateBelt('orbit', 1.234));
  });
});

describe('state tables', () => {
  it('every state names expressions that exist', () => {
    for (const state of CHARACTER_STATES) {
      const list = STATE_EYE_TOPOLOGIES[state];
      expect(list, `${state} has no expression list`).toBeDefined();
      expect(list.length).toBeGreaterThan(0);
      for (const id of list) {
        expect(EYE_TOPOLOGIES[id], `${state} references unknown expression ${id}`).toBeDefined();
      }
    }
  });
});

describe('static rendering', () => {
  it('runs without a DOM', () => {
    const svg = renderStaticSvg({ shape: 'cloud', color: 'blue' });
    expect(svg).toContain('<svg');
    expect(svg).not.toContain('NaN');
    expect(svg).not.toContain('undefined');
  });

  it('renders the expression it is given, not always a neutral one', () => {
    const neutral = renderStaticSvg({ shape: 'blob', expression: 'neutral' });
    const happy = renderStaticSvg({ shape: 'blob', expression: 'happy' });
    const closed = renderStaticSvg({ shape: 'blob', expression: 'closed' });
    expect(happy).not.toBe(neutral);
    expect(closed).not.toBe(neutral);
  });

  it('derives the expression from a state', () => {
    expect(renderStaticSvg({ state: 'sleeping', face: 'eyes' })).toBe(
      renderStaticSvg({ state: 'sleeping', face: 'eyes', expression: 'closed' }),
    );
    expect(renderStaticSvg({ state: 'sleeping' })).toBe(
      renderStaticSvg({ state: 'sleeping', expression: 'curve' }),
    );
  });

  it('produces a data URL with no raw characters that would truncate it', () => {
    const url = renderStaticSvgDataUrl({ shape: 'hex', color: 'green' });
    expect(url.startsWith('data:image/svg+xml,')).toBe(true);
    // A bare '#' ends the URL at the fragment, which is the classic way
    // inline SVG data URLs break.
    expect(url).not.toContain('#');
  });
});
