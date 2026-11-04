import { describe, expect, it } from 'vitest';
import { bangGlyphPath, pencilGlyphPath } from '../src/motion/glyphs.js';
import { BELT_GLYPH_SIZE, BELT_KINDS, evaluateBelt, blendBeltFrames } from '../src/motion/belts.js';
import { CENTER } from '../src/core/types.js';

/*
 * Glyphs are the only belt artwork that is an outline rather than a circle,
 * so they are the only part that can be malformed in the SVG sense. These
 * tests check the shape of the path string and the extent of the geometry —
 * not how it looks, which is what the snapshots are for.
 */

const GLYPHS = { pencil: pencilGlyphPath, bang: bangGlyphPath } as const;

/** Every coordinate pair in a path, ignoring the commands. */
function numbersIn(d: string): number[] {
  return (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

describe('belt glyphs', () => {
  it.each(Object.keys(GLYPHS) as (keyof typeof GLYPHS)[])('%s is a closed, well-formed path', (name) => {
    const d = GLYPHS[name](BELT_GLYPH_SIZE);

    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    // Only the commands the builder emits, and no stray letters from a
    // template string that failed to interpolate.
    expect(d).toMatch(/^[MLQCZ0-9.\-\s]+$/);
    expect(d).not.toContain('NaN');
    expect(d).not.toContain('undefined');
    // Two subpaths each: a cap and a barrel, a stem and a dot.
    expect(d.match(/M/g)).toHaveLength(2);
    expect(d.match(/Z/g)).toHaveLength(2);
    for (const n of numbersIn(d)) expect(Number.isFinite(n)).toBe(true);
  });

  it.each(Object.keys(GLYPHS) as (keyof typeof GLYPHS)[])('%s is centred on the origin', (name) => {
    const d = GLYPHS[name](40);
    const values = numbersIn(d);
    const extent = Math.max(...values.map(Math.abs));
    // Built around the origin at the size asked for, so the belt frame can
    // position it with a transform.
    expect(extent).toBeGreaterThan(8);
    expect(extent).toBeLessThanOrEqual(21);
  });

  it('scales linearly with the size it is asked for', () => {
    for (const build of Object.values(GLYPHS)) {
      const small = Math.max(...numbersIn(build(20)).map(Math.abs));
      const large = Math.max(...numbersIn(build(40)).map(Math.abs));
      expect(large / small).toBeCloseTo(2, 1);
    }
  });

  it('is deterministic', () => {
    expect(pencilGlyphPath(30)).toBe(pencilGlyphPath(30));
    expect(bangGlyphPath(30)).toBe(bangGlyphPath(30));
    expect(pencilGlyphPath(30)).not.toBe(bangGlyphPath(30));
  });
});

describe('glyph belts', () => {
  it('only the two glyph belts carry glyphs', () => {
    const withGlyphs = BELT_KINDS.filter((kind) => {
      // Sampled across a cycle: `bang` has nothing on screen at t=0.
      return [0, 0.4, 1.2, 2.3].some((t) => (evaluateBelt(kind, t).glyphs?.length ?? 0) > 0);
    });
    expect([...withGlyphs].sort()).toEqual(['bang', 'pencil']);
  });

  it('names a glyph the renderer has a path for', () => {
    for (const kind of ['pencil', 'bang'] as const) {
      for (const glyph of evaluateBelt(kind, 1.4).glyphs ?? []) {
        expect(GLYPHS).toHaveProperty(glyph.kind);
        for (const n of [glyph.x, glyph.y, glyph.rotation, glyph.scale, glyph.opacity]) {
          expect(Number.isFinite(n)).toBe(true);
        }
        expect(glyph.scale).toBeGreaterThan(0);
        expect(glyph.opacity).toBeGreaterThanOrEqual(0);
        expect(glyph.opacity).toBeLessThanOrEqual(1);
      }
    }
  });

  it('moves the pencil and lifts the bang', () => {
    const positions = [0.1, 0.4, 0.7, 1].map((t) => evaluateBelt('pencil', t).glyphs![0]!);
    expect(new Set(positions.map((g) => g.x)).size).toBeGreaterThan(1);
    expect(new Set(positions.map((g) => g.y)).size).toBeGreaterThan(1);

    // The exclamation mark arrives from the body and ends up above it.
    const arriving = evaluateBelt('bang', 0.02).glyphs![0]!;
    const arrived = evaluateBelt('bang', 0.6).glyphs![0]!;
    expect(arriving.opacity).toBeLessThan(arrived.opacity);
    expect(arrived.y).toBeLessThan(arriving.y);
    expect(arrived.y).toBeLessThan(CENTER);
  });

  it('collapses the outgoing dots into the incoming glyph', () => {
    const dots = evaluateBelt('dots', 0.5);
    const pencil = evaluateBelt('pencil', 0.5);
    const sink = pencil.glyphs![0]!;

    const start = blendBeltFrames(dots, pencil, 0);
    const mid = blendBeltFrames(dots, pencil, 0.5);
    const end = blendBeltFrames(dots, pencil, 1);

    // At the start the outgoing dots are where they were.
    expect(start.dots[0]!.x).toBeCloseTo(dots.dots[0]!.x, 5);
    // Half way they are half way to the glyph, and fading.
    const travelled = Math.abs(mid.dots[0]!.x - dots.dots[0]!.x);
    const remaining = Math.abs(mid.dots[0]!.x - sink.x);
    expect(travelled).toBeGreaterThan(0);
    expect(remaining).toBeLessThan(Math.abs(dots.dots[0]!.x - sink.x));
    expect(mid.dots[0]!.opacity).toBeLessThan(dots.dots[0]!.opacity);
    // By the end only the incoming frame is left with any weight.
    expect(end.dots.every((d, i) => i >= dots.dots.length || d.opacity < 0.001)).toBe(true);
    expect(end.glyphs!.some((g) => g.opacity > 0.9)).toBe(true);
    for (const frame of [start, mid, end]) {
      for (const n of [frame.coreX, frame.coreY, frame.coreScale, frame.coreOpacity]) {
        expect(Number.isFinite(n)).toBe(true);
      }
    }
  });
});
