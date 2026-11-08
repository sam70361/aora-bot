// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CAST, CORE_CAST_IDS, castMember } from '../src/core/cast.js';
import { getLeafColor } from '../src/core/leaf.js';
import {
  ALL_SHAPE_IDS,
  CORE_SHAPE_IDS,
  SHAPE_FAMILIES,
  SHAPE_IDS,
  SHAPE_SPACE,
  isListedShape,
  type ShapeId,
} from '../src/core/types.js';
import { createCharacter } from '../src/render/character.js';
import { renderStaticSvg } from '../src/render/static-svg.js';
import { unionOutline } from '../src/render/vector/parts.js';
import { CHARACTERS } from '../src/shapes/characters/index.js';
import { defineShape, getShape } from '../src/shapes/registry.js';
import { autoShapeForKey } from '../src/math/hash.js';
import { STYLE_IDS, allVariants, getStyle } from '../src/styles/index.js';
import { THEME_MANIFEST } from '../src/themes/manifest.js';

/*
 * The character roster: every body builds, and a shape's parts (ears, leaves,
 * antennae) survive every variant of both series, static and live.
 */

const PIXEL_VARIANTS = ['crisp', 'dot', 'block'] as const;
const LEAF = getLeafColor('blue').toLowerCase();

/** Shapes that carry at least one part. */
const PARTED = SHAPE_IDS.filter((id) => getShape(id).parts.length > 0);

/** Markup with the per-instance ids taken out, so two characters can be compared. */
const bare = (markup: string): string => markup.replace(/aora-(clip|ink|shadow)-[\w-]+/g, 'ID');

/** The smallest y a path's coordinates reach; the paths here are absolute `M`/`C`/`L` lists. */
const minY = (d: string): number =>
  Math.min(...(d.match(/-?\d+(?:\.\d+)?/g) ?? []).filter((_, i) => i % 2 === 1).map(Number));

const FRAME_MS = 16;
const run = (ms: number): void => {
  for (let t = 0; t < ms; t += FRAME_MS) vi.advanceTimersByTime(FRAME_MS);
};

function mount(options: Parameters<typeof createCharacter>[1]) {
  const host = document.createElement('span');
  document.body.appendChild(host);
  return createCharacter(host, { reducedMotion: true, ...options });
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('roster', () => {
  it('keeps a roster of seventy-one, led by the round ball', () => {
    expect(SHAPE_IDS).toHaveLength(71);
    expect(new Set(SHAPE_IDS).size).toBe(SHAPE_IDS.length);
    expect(SHAPE_IDS[0]).toBe('circle');
  });

  it('files every character in exactly one family, in catalogue order', () => {
    const filed = SHAPE_FAMILIES.flatMap((family) => [...family.shapes]);
    expect(filed).toEqual([...SHAPE_IDS]);
    expect(new Set(SHAPE_FAMILIES.map((family) => family.id)).size).toBe(SHAPE_FAMILIES.length);
    for (const family of SHAPE_FAMILIES) {
      expect(family.shapes.length, family.id).toBeGreaterThan(0);
      expect(family.label.en, family.id).not.toBe('');
      expect(family.label.zh, family.id).not.toBe('');
    }
    for (const id of SHAPE_IDS) {
      expect(
        SHAPE_FAMILIES.filter((family) => (family.shapes as readonly string[]).includes(id)),
        id,
      ).toHaveLength(1);
    }
  });

  it('has exactly one drawing per core shape, listed or not', () => {
    expect(Object.keys(CHARACTERS).sort()).toEqual([...CORE_SHAPE_IDS].sort());
  });

  it('keeps theme characters out of the core and of the listed roster, and knows their ids', () => {
    const theme = THEME_MANIFEST.flatMap((entry) => [...entry.shapes]);
    expect(theme.length).toBeGreaterThan(0);
    for (const id of theme) {
      expect(SHAPE_IDS, id).not.toContain(id);
      expect(CORE_SHAPE_IDS, id).not.toContain(id);
      expect(isListedShape(id), id).toBe(false);
    }
    expect(ALL_SHAPE_IDS).toEqual([...CORE_SHAPE_IDS, ...theme]);
    expect(CORE_CAST_IDS).toHaveLength(CORE_SHAPE_IDS.length);
  });
  it('makes mochi the default shape', () => {
    expect(renderStaticSvg({ color: 'blue' })).toBe(renderStaticSvg({ shape: 'mochi', color: 'blue' }));
    const host = mount({}).element;
    expect(bare(host.outerHTML)).toBe(bare(mount({ shape: 'mochi' }).element.outerHTML));
  });

  it('has exactly one named cast member per shape', () => {
    expect(CAST.map((m) => m.shape).sort()).toEqual([...SHAPE_IDS].sort());
    for (const member of CAST) expect(castMember(member.id)).toBe(member);
  });

  it('only ever picks live shapes automatically', () => {
    for (let i = 0; i < 64; i++) expect(SHAPE_IDS).toContain(autoShapeForKey(`agent-${i}`));
  });

  it.each(CORE_SHAPE_IDS)('builds %s, statically and live, in every variant of every style', (id) => {
    const shape = getShape(id);
    expect(shape.path).not.toContain('NaN');
    for (const part of shape.parts) {
      expect(part.outline.length).toBeGreaterThan(3);
      expect(part.outline.flat().every(Number.isFinite)).toBe(true);
    }

    for (const styleId of STYLE_IDS) {
      for (const variant of allVariants(getStyle(styleId))) {
        const options = { shape: id, style: styleId, variant, state: 'happy' } as const;
        const svg = renderStaticSvg(options);
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg).not.toContain('NaN');

        const live = mount(options);
        run(64);
        expect(live.element.outerHTML).not.toContain('NaN');
        live.destroy();
      }
    }
  });
});

describe('parts', () => {
  it('exists on the shapes that need ears, leaves and antennae', () => {
    for (const id of [
      'sprout',
      'bunny',
      'bot',
      'pear',
      'leaf',
      'bell',
      'bun',
      'bear',
      'chick',
      'penguin',
    ] as const) {
      expect(PARTED).toContain(id);
    }
    expect(getShape('sprout').parts.map((p) => p.tone)).toEqual(['leaf', 'leaf']);
    expect(getShape('bunny').parts.map((p) => p.tone)).toContain('inner');
  });

  it('sets the belt radius from the whole figure when a part stands wider than the body', () => {
    for (const id of ['cactus', 'fish', 'cherry', 'chick', 'penguin', 'octopus'] as const) {
      const shape = getShape(id);
      const xs = [...shape.outline, ...shape.parts.flatMap((p) => p.outline)].map(([x]) => x);
      const half = (Math.max(...xs) - Math.min(...xs)) / 2;
      expect(shape.beltRadius, id).toBeGreaterThanOrEqual(half - 1);
    }
    // Parts inside the body's width leave the radius alone.
    const bunny = getShape('bunny');
    const widest = Math.max(...bunny.outline.map(([x]) => x)) - Math.min(...bunny.outline.map(([x]) => x));
    expect(bunny.beltRadius).toBeLessThanOrEqual(widest / 2 + 1);
  });

  it('keeps the whole figure, parts included, inside the box and centred', () => {
    for (const id of PARTED) {
      const shape = getShape(id);
      const ys = shape.parts.flatMap((p) => p.outline.map(([, y]) => y));
      // Normalisation sizes the union of body and parts, so nothing may stick out of shape space.
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...ys)).toBeLessThanOrEqual(SHAPE_SPACE);
    }
  });

  it('paints a leaf in the leaf colour in the filled vector variants, static and live', () => {
    for (const variant of ['solid', 'sticker', 'paper'] as const) {
      const svg = renderStaticSvg({ shape: 'sprout', color: 'blue', variant });
      expect(svg.toLowerCase(), `static ${variant}`).toContain(LEAF);

      const live = mount({ shape: 'sprout', variant }).element.outerHTML;
      expect(live, `live ${variant}`).toContain('var(--aora-leaf');
    }
  });

  it('strokes a leaf like the body in the hollow vector variants, static and live', () => {
    const paths = (markup: string) => (markup.match(/<path /g) ?? []).length;
    for (const variant of ['outline', 'glass'] as const) {
      expect(paths(renderStaticSvg({ shape: 'sprout', variant })), `static ${variant}`).toBeGreaterThan(
        paths(renderStaticSvg({ shape: 'mochi', variant })),
      );
      const sprout = mount({ shape: 'sprout', variant }).element.outerHTML;
      const mochi = mount({ shape: 'mochi', variant }).element.outerHTML;
      expect(paths(sprout), `live ${variant}`).toBeGreaterThan(paths(mochi));
    }
  });

  it('turns the leaf lighter on a green body so it stays readable', () => {
    const svg = renderStaticSvg({ shape: 'sprout', color: 'green' });
    expect(svg.toLowerCase()).toContain(getLeafColor('green').toLowerCase());
    expect(svg.toLowerCase()).not.toContain(getLeafColor('blue').toLowerCase());
  });

  it('shades hair towards white on a black body while it is dark, and towards black otherwise', () => {
    const black = renderStaticSvg({ shape: 'bob', color: 'black' });
    expect(black).toMatch(/--(\w+)-hair: #FFFFFF;[\s\S]*--\1-hair: #000000;/);
    expect(black).toContain('-hair, #FFFFFF)" fill-opacity="0.4"');
    expect(renderStaticSvg({ shape: 'bob', color: 'blue' })).toContain('fill="#000000" fill-opacity="0.4"');
    expect(renderStaticSvg({ shape: 'bob', color: 'black', colorScheme: 'page' })).not.toContain(
      'fill="#000000" fill-opacity="0.4"',
    );
    const live = mount({ shape: 'bob' }).element.outerHTML;
    expect(live).toContain('var(--aora-hair-shade, #000000)');
  });

  it('paints a leaf in every pixel variant, static and live', () => {
    for (const variant of PIXEL_VARIANTS) {
      const svg = renderStaticSvg({ shape: 'sprout', color: 'blue', style: 'pixel', variant });
      expect(svg.toLowerCase(), `static ${variant}`).toContain(LEAF);

      const live = mount({ shape: 'sprout', style: 'pixel', variant });
      run(64);
      expect(live.element.outerHTML.toLowerCase(), `live ${variant}`).toMatch(/aora-leaf|34b36b/);
    }
  });

  it('makes the pixel silhouette of an eared shape taller than its body', () => {
    for (const variant of PIXEL_VARIANTS) {
      const eared = renderStaticSvg({ shape: 'bunny', color: 'blue', style: 'pixel', variant });
      const plain = renderStaticSvg({ shape: 'mochi', color: 'blue', style: 'pixel', variant });
      expect(eared).not.toBe(plain);
    }
  });

  it('joins body-tone parts into the outline of a hollow variant instead of crossing it', () => {
    const body = getShape('bunny');
    const earTop = Math.min(
      ...body.parts.filter((p) => p.tone === 'body').flatMap((p) => p.outline.map(([, y]) => y)),
    );

    for (const variant of ['outline', 'glass'] as const) {
      const svg = renderStaticSvg({ shape: 'bunny', color: 'blue', variant });
      const first = /<path d="([^"]+)"/.exec(svg)![1]!;
      // One merged silhouette: its top is the ears' top, not the head's.
      expect(minY(first), variant).toBeLessThan(minY(body.path) - 8);
      expect(minY(first), variant).toBeLessThanOrEqual(earTop + 4);
    }
  });

  it('keeps parts inside the paper border of a sticker and the shadow of a paper', () => {
    const count = (svg: string) => (svg.match(/<path /g) ?? []).length;
    const sticker = count(renderStaticSvg({ shape: 'sprout', variant: 'sticker' }));
    const plainSticker = count(renderStaticSvg({ shape: 'mochi', variant: 'sticker' }));
    expect(sticker).toBeGreaterThan(plainSticker);

    const paper = count(renderStaticSvg({ shape: 'sprout', variant: 'paper' }));
    const plainPaper = count(renderStaticSvg({ shape: 'mochi', variant: 'paper' }));
    expect(paper).toBeGreaterThan(plainPaper);
  });

  it('fades parts out when a character morphs to a shape without them, and back in', () => {
    const c = mount({ shape: 'sprout', state: 'idle' });
    run(400);
    expect(c.element.outerHTML).toContain('var(--aora-leaf');

    c.update({ shape: 'mochi' });
    run(1500);
    expect(c.element.outerHTML).not.toContain('var(--aora-leaf');

    c.update({ shape: 'sprout' });
    run(1500);
    expect(c.element.outerHTML).toContain('var(--aora-leaf');
  });
});

describe('unionOutline', () => {
  const square = (x: number, y: number, size: number): [number, number][] => [
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size],
  ];
  const area = (ring: readonly (readonly [number, number])[]): number =>
    Math.abs(
      ring.reduce(
        (sum, [x, y], i) => sum + x * ring[(i + 1) % ring.length]![1] - ring[(i + 1) % ring.length]![0] * y,
        0,
      ),
    ) / 2;

  it('merges two overlapping polygons into one outline', () => {
    const merged = unionOutline(square(0, 0, 10), square(5, 5, 10));
    expect(merged).not.toBeNull();
    // 100 + 100 - the 25-unit overlap.
    expect(area(merged!)).toBeCloseTo(175, 0);
  });

  it('gives up on disjoint polygons so the caller can stroke them separately', () => {
    expect(unionOutline(square(0, 0, 10), square(40, 40, 10))).toBeNull();
  });
});

describe('a host-defined shape', () => {
  it('is drawn under its own id', () => {
    const def = defineShape('arch', disc, {});
    expect(getShape('arch' as ShapeId)).toBe(def);
  });

  it('can carry parts, normalised with the body and drawn like a built-in one', () => {
    const ear: [number, number][] = [
      [30, 8],
      [44, 8],
      [44, 24],
      [30, 24],
    ];
    const plain = defineShape('plain-disc', disc);
    const eared = defineShape('eared-disc', disc, { parts: [{ tone: 'inner', outline: ear }] });

    expect(plain.parts).toEqual([]);
    expect(eared.parts).toHaveLength(1);
    expect(eared.parts[0]!.tone).toBe('inner');
    const ys = eared.parts[0]!.outline.map(([, y]) => y);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    // The ear stands above the body, and the body gives way to it: same transform, smaller disc.
    expect(Math.min(...ys)).toBeLessThan(eared.top);
    expect(eared.radius).toBeLessThan(plain.radius);

    const count = (svg: string) => (svg.match(/<path /g) ?? []).length;
    expect(count(renderStaticSvg({ shape: 'eared-disc' as never }))).toBeGreaterThan(
      count(renderStaticSvg({ shape: 'plain-disc' as never })),
    );
  });
});

function disc(): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    out.push([50 + 40 * Math.cos(a), 50 + 40 * Math.sin(a)]);
  }
  return out;
}
