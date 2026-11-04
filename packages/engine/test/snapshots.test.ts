import { describe, expect, it } from 'vitest';
import { getShape } from '../src/shapes/registry.js';
import { SHAPE_IDS, COLOR_IDS, CUTE_MOUTH_IDS, MOUTH_IDS, NOSE_IDS } from '../src/core/types.js';
import { CHARACTER_STATES } from '../src/motion/states.js';
import { fnv1a32 } from '../src/math/hash.js';
import { renderStaticSvg } from '../src/render/static-svg.js';
import { CUTE_EYE_IDS, EYE_TOPOLOGY_IDS } from '../src/face/topologies.js';
import { evaluateBelt, BELT_KINDS } from '../src/motion/belts.js';
import { springPosition, springToLinearEasing } from '../src/math/spring.js';

/**
 * Golden files for the deterministic half of the engine.
 *
 * The animation loop cannot be snapshotted, but everything it is built from
 * can: shape outlines, the fitted face, expression geometry and belt frames
 * are all pure functions. Freezing them means a refactor that shifts a curve
 * by a pixel fails here rather than being noticed months later in a screenshot.
 */

describe('shape outlines', () => {
  it.each(SHAPE_IDS)('%s path is stable', (id) => {
    expect(getShape(id).path).toMatchSnapshot();
  });

  it.each(SHAPE_IDS)('%s derived metrics are stable', (id) => {
    const s = getShape(id);
    expect({
      radius: round(s.radius),
      beltRadius: round(s.beltRadius),
      tiltScale: round(s.tiltScale),
      top: round(s.top),
      bottom: round(s.bottom),
      face: {
        x: round(s.face.x),
        y: round(s.face.y),
        sx: round(s.face.sx),
        sy: round(s.face.sy),
        eye: round(s.face.eye),
        leftDX: s.face.leftDX,
      },
    }).toMatchSnapshot();
  });
});

describe('expressions', () => {
  it.each(EYE_TOPOLOGY_IDS)('%s renders stable eye geometry', (id) => {
    expect(renderStaticSvg({ shape: 'blob', color: 'blue', face: 'eyes', expression: id })).toMatchSnapshot();
  });

  it('every expression produces distinct geometry', () => {
    const seen = new Map<string, string>();
    for (const id of EYE_TOPOLOGY_IDS) {
      const svg = renderStaticSvg({ shape: 'blob', face: 'eyes', expression: id });
      const previous = seen.get(svg);
      // Catches the class of bug where a clamp collapses thin expressions
      // into the same shape as fat ones.
      expect(previous, `${id} renders identically to ${previous}`).toBeUndefined();
      seen.set(svg, id);
    }
  });
});

describe('line face', () => {
  it.each(EYE_TOPOLOGY_IDS)('%s renders stable line-mode eyes', (id) => {
    expect(
      renderStaticSvg({
        shape: 'blob',
        color: 'blue',
        face: 'line',
        nose: 'slant',
        mouth: 'flat',
        expression: id,
      }),
    ).toMatchSnapshot();
  });

  it.each(MOUTH_IDS)('%s mouth is stable', (id) => {
    expect(renderStaticSvg({ shape: 'blob', face: 'line', nose: null, mouth: id })).toMatchSnapshot();
  });

  it.each(NOSE_IDS)('%s nose is stable', (id) => {
    expect(renderStaticSvg({ shape: 'blob', face: 'line', nose: id, mouth: 'flat' })).toMatchSnapshot();
  });

  it('every mouth produces distinct geometry', () => {
    const seen = new Map<string, string>();
    for (const id of MOUTH_IDS) {
      const svg = renderStaticSvg({ shape: 'blob', face: 'line', nose: null, mouth: id });
      const previous = seen.get(svg);
      expect(previous, `${id} renders identically to ${previous}`).toBeUndefined();
      seen.set(svg, id);
    }
  });

  it('every expression stays distinct under the line-weight floor', () => {
    const seen = new Map<string, string>();
    for (const id of EYE_TOPOLOGY_IDS) {
      const svg = renderStaticSvg({ shape: 'blob', face: 'line', nose: null, mouth: 'flat', expression: id });
      const previous = seen.get(svg);
      expect(previous, `${id} renders identically to ${previous}`).toBeUndefined();
      seen.set(svg, id);
    }
  });

  it('the default face is the cute one, and the eyes face is still there to ask for', () => {
    const cute = renderStaticSvg({ shape: 'blob', color: 'blue' });
    expect(cute).toBe(renderStaticSvg({ shape: 'blob', color: 'blue', face: 'cute' }));
    expect(cute).not.toBe(renderStaticSvg({ shape: 'blob', color: 'blue', face: 'eyes' }));
  });
});

describe('cute face', () => {
  it.each(CUTE_EYE_IDS)('%s eyes are stable', (id) => {
    expect(
      renderStaticSvg({ shape: 'blob', color: 'blue', expression: id, mouth: 'none' }),
    ).toMatchSnapshot();
  });

  it.each(CUTE_MOUTH_IDS.filter((id) => id !== 'none'))('%s mouth is stable', (id) => {
    expect(renderStaticSvg({ shape: 'blob', color: 'blue', expression: 'dot', mouth: id })).toMatchSnapshot();
  });

  it('every eye, and every mouth, produces distinct geometry', () => {
    for (const [ids, render] of [
      [
        CUTE_EYE_IDS,
        (id: string) => renderStaticSvg({ shape: 'blob', expression: id as never, mouth: 'none' }),
      ],
      [
        CUTE_MOUTH_IDS,
        (id: string) => renderStaticSvg({ shape: 'blob', expression: 'dot', mouth: id as never }),
      ],
    ] as const) {
      const seen = new Map<string, string>();
      for (const id of ids) {
        const svg = render(id);
        expect(seen.get(svg), `${id} renders identically to ${seen.get(svg)}`).toBeUndefined();
        seen.set(svg, id);
      }
    }
  });

  it.each(CHARACTER_STATES)('%s is frozen as a hash', (state) => {
    expect(fnv1a32(renderStaticSvg({ shape: 'blob', color: 'blue', state }))).toMatchSnapshot();
  });
});

describe('palette', () => {
  it('has twelve colours, pink among them', () => {
    expect(COLOR_IDS).toHaveLength(12);
    expect(COLOR_IDS).toContain('pink');
  });

  it.each(COLOR_IDS)('%s static render is stable', (id) => {
    expect(renderStaticSvg({ shape: 'pebble', color: id })).toMatchSnapshot();
  });
});

describe('belts', () => {
  it.each(BELT_KINDS)('%s frames are stable across a cycle', (kind) => {
    const frames = [0, 0.25, 0.5, 1, 1.5, 2, 3].map((t) => evaluateBelt(kind, t));
    expect(JSON.parse(JSON.stringify(frames, roundReplacer))).toMatchSnapshot();
  });
});

describe('spring curves', () => {
  it('sampled positions are stable', () => {
    const curve = [0, 0.1, 0.2, 0.4, 0.8, 1.6].map((t) => round(springPosition(t, 6, 1)));
    expect(curve).toMatchSnapshot();
  });

  it('CSS linear() easing is stable', () => {
    expect(springToLinearEasing(6, 0.8, 8)).toMatchSnapshot();
  });
});

const round = (n: number): number => Math.round(n * 1000) / 1000;

function roundReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'number' ? round(value) : value;
}
