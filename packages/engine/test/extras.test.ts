// @vitest-environment happy-dom
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CENTER, VIEWBOX, type ShapeId } from '../src/core/types.js';
import { evaluateFx } from '../src/motion/fx.js';
import { MOOD_LEAN } from '../src/motion/mood.js';
import { createCharacter } from '../src/render/character.js';
import { renderStaticSvg } from '../src/render/static-svg.js';
import { getShape, getShapeScale } from '../src/shapes/registry.js';
import { installTheme } from '../src/themes/index.js';
import type { ThemePackage } from '../src/themes/types.js';
import type { MediumDefinition } from '../src/render/vector/media.js';
import { themeExtras } from '../src/themes/extras-hook.js';
import { decorSetKey, placeDecor, type DecorSpec } from '../src/themes/extras/decor.js';
import { figureOf, fxFootprint, fxPlacement } from '../src/themes/extras/fx-anchor.js';
import { leanInto } from '../src/themes/extras/lean.js';
import { clearance } from '../src/themes/extras/silhouette.js';
import { CAPPED, DECOR, FIXTURE, FLAG, MASKED, PAINTED, PINNED, ROCKER } from './extras-fixture.js';

const HAIRED = 'fx-haired' as ShapeId;

/*
 * The theme extras: mood decorations, part motions and the vivid mood accent,
 * over a fixture theme that is not shipped. The core ships none of the data.
 */

beforeAll(() => {
  installTheme(FIXTURE);
});

function mount() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host;
}

describe('mood decorations', () => {
  it('belong to the skins of the theme that declares them, unless a skin opts out', () => {
    const extras = themeExtras()!;
    expect(extras.decorates('fixdoodle')).toBe(true);
    expect(extras.decorates('fixplain')).toBe(false);
    expect(extras.decorates('solid')).toBe(false);
  });

  it('refuse a set that names a glyph the spec does not draw', () => {
    const broken: ThemePackage = {
      ...FIXTURE,
      definition: {
        ...FIXTURE.definition,
        id: 'fixture-broken',
        style: { open: [{ style: 'vector', variant: 'solid' }] },
      },
      variants: [],
      art: {},
      motions: undefined,
      decor: { glyphs: {}, moods: { bright: [{ glyph: 'nope', paint: 'ink', size: 10, zone: 'top' }] } },
    };
    expect(() => installTheme(broken)).toThrow(/glyph "nope"/);
  });

  it('draw the same static document every time, at rest', () => {
    const options = {
      shape: 'mochi' as const,
      color: 'orange' as const,
      variant: 'fixdoodle',
      state: 'happy' as const,
    };
    const a = renderStaticSvg(options);
    expect(renderStaticSvg(options)).toBe(a);
    expect(a).toContain('data-aora-decor');
    expect(a).not.toContain('aora-anim');
    expect(a).not.toContain('<style>@keyframes');
    // Two kinds, one of them twice.
    expect(a.match(/<path d="M12 1.5C/g)).toHaveLength(3);
  });

  it('show nothing on a calm state with no set, and nothing on a core variant', () => {
    expect(renderStaticSvg({ shape: 'mochi', variant: 'fixdoodle', state: 'idle' })).not.toContain(
      'data-aora-decor',
    );
    expect(renderStaticSvg({ shape: 'mochi', variant: 'solid', state: 'happy' })).not.toContain(
      'data-aora-decor',
    );
  });

  it('let a state set win over its mood set', () => {
    const angry = renderStaticSvg({ shape: 'mochi', variant: 'fixdoodle', state: 'angry' });
    // `contrast` is the page's own contrast.
    expect(angry.match(/<path d="M12 1.5C[^"]*" fill="light-dark\(#000, #fff\)"/g)).toHaveLength(3);
  });

  it('leave a character shown smaller than the set allows bare', () => {
    expect(
      renderStaticSvg({ shape: 'mochi', variant: 'fixdoodle', state: 'happy', sizePx: 48 }),
    ).not.toContain('data-aora-decor');
    expect(renderStaticSvg({ shape: 'mochi', variant: 'fixdoodle', state: 'happy', sizePx: 96 })).toContain(
      'data-aora-decor',
    );
  });

  it('paint every colour from the ink, the page or a palette colour', () => {
    const svg = renderStaticSvg({ shape: 'mochi', color: 'orange', variant: 'fixdoodle', state: 'happy' });
    const fills = [...svg.matchAll(/<g transform="translate[^>]*><path d="M12[^"]*" fill="([^"]+)"/g)].map(
      (m) => m[1]!,
    );
    expect(fills.length).toBeGreaterThan(0);
    for (const fill of fills) expect(fill).toMatch(/var\(--a[a-z0-9]+-ink/);
    expect(fills.some((fill) => fill.includes('calc(h + 40)') && fill.includes('max(c, 0.12)'))).toBe(true);
  });

  it.each(['mochi', 'bob', 'twinbuns', 'bunny', 'tofu', FLAG] as ShapeId[])(
    'keep clear of the face, the figure and its props, inside the box, on %s',
    (id) => {
      const shape = getShape(id);
      const scale = getShapeScale(id);
      const figure = figureOf(shape);
      const lo = (b: number) => CENTER + (b - CENTER) / scale;
      for (const key of ['m:bright', 'm:drowsy', 's:angry']) {
        const placed = placeDecor(DECOR, key, shape, scale);
        expect(placed.length).toBeGreaterThan(0);
        for (const { x, y, size } of placed) {
          const r = size / 2;
          const fx = (x - shape.face.x) / (shape.face.sx + r);
          const fy = (y - shape.face.y) / (shape.face.sy + r);
          expect(fx * fx + fy * fy).toBeGreaterThanOrEqual(1);
          expect(clearance(figure, x, y)).toBeGreaterThanOrEqual(r + 5.9);
          expect(x - r).toBeGreaterThanOrEqual(lo(VIEWBOX.minX) - 1e-9);
          expect(x + r).toBeLessThanOrEqual(lo(VIEWBOX.minX + VIEWBOX.width) + 1e-9);
          expect(y - r).toBeGreaterThanOrEqual(lo(VIEWBOX.minY) - 1e-9);
          expect(y + r).toBeLessThanOrEqual(lo(VIEWBOX.minY + VIEWBOX.height) + 1e-9);
        }
        // Clear of one another.
        for (let i = 0; i < placed.length; i++) {
          for (let j = i + 1; j < placed.length; j++) {
            const a = placed[i]!;
            const b = placed[j]!;
            expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan((a.size + b.size) / 2);
          }
        }
      }
    },
  );

  it('keep clear of the effect the set’s states throw', () => {
    const shape = getShape('mochi');
    const scale = getShapeScale('mochi');
    const zz = fxFootprint(shape, 'zz', scale);
    for (const { x, y, size } of placeDecor(DECOR, 'm:drowsy', shape, scale)) {
      for (const [zx, zy, zr] of zz) expect(Math.hypot(x - zx, y - zy)).toBeGreaterThan(size / 2 + zr);
    }
  });
});

describe('live decorations and motions', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  const decorOf = (el: Element) => el.querySelector('[data-aora-decor]')!;
  const layerOf = (el: Element, name: string) => el.querySelector(`[data-aora-layer="${name}"]`)!;
  const layerNameOf = (el: Element) => el.closest('[data-aora-layer]')?.getAttribute('data-aora-layer');
  /** A group's opacity, as an SVG attribute or, lifted into a box, as CSS. */
  const opacityOf = (el: Element) => el.getAttribute('opacity') ?? (el as HTMLElement).style.opacity;
  /** The stylesheet the page's characters share. */
  const sheet = () => document.querySelectorAll('style[data-aora-motion]');
  const rules = () => Array.from(sheet(), (style) => style.textContent).join('');

  it('play in CSS, with the reduced-motion rule and the pause in one stylesheet the page shares', () => {
    const character = createCharacter(mount(), {
      shape: 'mochi',
      variant: 'fixdoodle',
      state: 'happy',
      reducedMotion: false,
    });
    const other = createCharacter(mount(), {
      shape: 'mochi',
      variant: 'fixdoodle',
      state: 'happy',
      seed: 'other',
      reducedMotion: false,
    });
    vi.advanceTimersByTime(48);
    expect(character.element.querySelector('style')).toBeNull();
    expect(sheet()).toHaveLength(1);
    const text = rules();
    expect(text).toContain('@keyframes aora-k');
    expect(text).toContain('prefers-reduced-motion:reduce');
    // Each rule once, however many characters play it.
    const names = text.match(/@keyframes [\w-]+/g)!;
    expect(new Set(names).size).toBe(names.length);
    other.destroy();
    const animated = decorOf(character.element).querySelector('.aora-anim')!;
    expect(animated.getAttribute('style')).toContain('animation-play-state:var(--aora-play,running)');
    character.pause();
    expect(character.element.style.getPropertyValue('--aora-play')).toBe('paused');
    character.resume();
    expect(character.element.style.getPropertyValue('--aora-play')).toBe('');
    character.destroy();
  });

  it('write nothing for the decorations from one frame to the next', () => {
    const character = createCharacter(mount(), {
      shape: 'mochi',
      variant: 'fixdoodle',
      state: 'happy',
      reducedMotion: false,
    });
    vi.advanceTimersByTime(48);
    const layer = decorOf(character.element);
    const before = layer.innerHTML;
    const first = layer.querySelector('path');
    vi.advanceTimersByTime(500);
    expect(layer.innerHTML).toBe(before);
    expect(layer.querySelector('path')).toBe(first);
    character.destroy();
  });

  it('hold the rest pose under reduced motion', () => {
    const character = createCharacter(mount(), {
      shape: FLAG,
      variant: 'fixdoodle',
      state: 'happy',
      reducedMotion: true,
    });
    expect(decorOf(character.element).querySelectorAll('path').length).toBe(3);
    expect(character.element.querySelector('.aora-anim')).toBeNull();
    expect(character.element.querySelector('style')).toBeNull();
    character.destroy();
  });

  it('draw a theme skin in layers: the skin at rest, the body’s motion on the box that holds it', () => {
    const character = createCharacter(mount(), {
      shape: FLAG,
      variant: 'fixdoodle',
      state: 'happy',
      reducedMotion: false,
    });
    vi.advanceTimersByTime(48);
    const svg = character.element;
    const object = svg.querySelector('foreignObject')!;
    expect(object).not.toBeNull();
    // Its own transform undoes the viewBox, for WebKit paints composited boxes without the SVG's.
    const [minX, minY, width] = svg.getAttribute('viewBox')!.split(' ');
    expect(object.getAttribute('transform')).toBe(`translate(${minX} ${minY})`);
    expect(object.getAttribute('width')).toBe(width);
    const names = Array.from(object.querySelectorAll('[data-aora-layer]'), (el) =>
      el.getAttribute('data-aora-layer'),
    );
    expect(names).toEqual(['body', 'below', 'skin', 'above', 'face', 'streams', 'front', 'decor']);
    const skin = layerOf(svg, 'skin');
    expect(skin.getAttribute('style')).toContain('will-change:transform');
    const body = layerOf(svg, 'body') as HTMLElement;
    const skinBefore = skin.innerHTML;
    const transforms = new Set<string>();
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(16);
      transforms.add(body.style.transform);
    }
    // The body hops and squashes as a whole box, and the skin is not written to.
    expect(transforms.size).toBeGreaterThan(1);
    expect([...transforms][0]).toMatch(/^translate\(.+%,.+%\) rotate\(.+deg\) scale\(/);
    expect(skin.innerHTML).toBe(skinBefore);
    // Nothing of the body's motion is left inside the layers.
    expect(skin.querySelector('[transform*="rotate"]')).toBeNull();
    // The face is a layer of its own, clipped by the body the root defines.
    const face = object.querySelector('[data-aora-face]')!;
    expect(face.closest('svg')).toBe(layerOf(svg, 'face'));
    const clip = svg.querySelector('clipPath')!;
    expect(face.getAttribute('clip-path')).toBe(`url(#${clip.id})`);
    character.destroy();
  });

  it('draw a core variant in one tree, as it always has', () => {
    const character = createCharacter(mount(), {
      shape: 'mochi',
      variant: 'sticker',
      state: 'happy',
      reducedMotion: false,
    });
    vi.advanceTimersByTime(48);
    expect(character.element.querySelector('foreignObject')).toBeNull();
    character.update({ variant: 'fixdoodle' });
    vi.advanceTimersByTime(48);
    expect(character.element.querySelector('foreignObject')).not.toBeNull();
    character.update({ variant: 'sticker' });
    vi.advanceTimersByTime(48);
    expect(character.element.querySelector('foreignObject')).toBeNull();
    character.destroy();
  });

  it('let a skin’s underlay breathe, in a layer behind the skin, and draw it at rest in static output', () => {
    const character = createCharacter(mount(), {
      shape: FLAG,
      variant: 'fixhalo',
      state: 'happy',
      reducedMotion: false,
    });
    vi.advanceTimersByTime(48);
    const halo = character.element.querySelector('circle[r="130"]')!;
    expect(layerNameOf(halo)).toBe('below');
    expect(halo.closest('.aora-anim')).not.toBeNull();
    expect(rules()).toMatch(/opacity:0\.55/);
    // A shape the skin does not breathe for keeps its underlay in the skin, still.
    character.update({ shape: 'mochi' });
    vi.advanceTimersByTime(48);
    const still = character.element.querySelector('circle[r="130"]')!;
    expect(layerNameOf(still)).toBe('skin');
    expect(still.closest('.aora-anim')).toBeNull();
    character.destroy();
    const svg = renderStaticSvg({ shape: FLAG, variant: 'fixhalo', state: 'happy' });
    expect(svg).toContain('r="130"');
    expect(svg).not.toContain('aora-anim');
    // A skin whose underlay reaches past the box lets a static document overflow.
    expect(svg).toMatch(/^<svg[^>]* overflow="visible"/);
    expect(renderStaticSvg({ shape: FLAG, variant: 'fixplain' })).not.toContain('overflow="visible"');
  });

  it('keep a mirrored character in one tree', () => {
    const character = createCharacter(mount(), {
      shape: FLAG,
      variant: 'fixdoodle',
      state: 'happy',
      sourceId: 'mirrored',
      reducedMotion: false,
    });
    vi.advanceTimersByTime(48);
    expect(character.element.querySelector('foreignObject')).toBeNull();
    expect(character.element.querySelector('g')!.id).toBe('mirrored');
    // A `<use>` copies the tree, so the keyframes stay in it.
    expect(character.element.querySelector('style')!.textContent).toContain('@keyframes aora-k');
    character.destroy();
  });

  it('cross-fade from one mood’s set to the next, and let the old one go once it has faded', () => {
    const character = createCharacter(mount(), {
      shape: 'mochi',
      variant: 'fixdoodle',
      state: 'happy',
      reducedMotion: false,
    });
    vi.advanceTimersByTime(48);
    const decor = decorOf(character.element);
    // An HTML box, so the browser composites the doodles' animations.
    expect(decor.localName).toBe('div');
    const [a, b] = Array.from(decor.children);
    expect(opacityOf(a!)).toBe('1');
    expect(opacityOf(b!)).toBe('0');
    expect(a!.getAttribute('style')).toContain('transition:opacity 480ms');
    character.update({ state: 'sleeping' });
    vi.advanceTimersByTime(48);
    expect(opacityOf(a!)).toBe('0');
    expect(opacityOf(b!)).toBe('1');
    expect(a!.childElementCount).toBeGreaterThan(0);
    vi.advanceTimersByTime(800);
    expect(a!.childElementCount).toBe(0);
    expect(b!.childElementCount).toBeGreaterThan(0);
    character.destroy();
  });

  it('turn a part about its pivot, inside the body’s motion', () => {
    const character = createCharacter(mount(), {
      shape: FLAG,
      variant: 'fixdoodle',
      state: 'idle',
      reducedMotion: false,
    });
    vi.advanceTimersByTime(48);
    const moving = Array.from(character.element.querySelectorAll('.aora-anim')).filter(
      (el) => !el.closest('[data-aora-decor]'),
    );
    // The wave, and the bubbles' three copies; the glow waits for a drowsy mood.
    expect(moving).toHaveLength(4);
    // In layers of their own, so their motion does not paint the skin again, on boxes the browser composites.
    for (const el of moving) {
      expect(['below', 'above']).toContain(layerNameOf(el));
      expect(el.localName).toBe('div');
    }
    const rule = rules();
    expect(rule).toMatch(/rotate\(-12deg\)/);
    expect(rule).toMatch(/rotate\(12deg\)/);
    character.update({ state: 'sleeping' });
    vi.advanceTimersByTime(48);
    expect(
      Array.from(character.element.querySelectorAll('.aora-anim')).filter(
        (el) => !el.closest('[data-aora-decor]'),
      ),
    ).toHaveLength(5);
    character.destroy();
  });

  it('draw the rest pose in static output', () => {
    const svg = renderStaticSvg({ shape: FLAG, variant: 'fixdoodle', state: 'sleeping' });
    expect(svg).not.toContain('aora-anim');
    expect(renderStaticSvg({ shape: FLAG, variant: 'solid', state: 'sleeping' })).not.toContain('aora-anim');
    expect(renderStaticSvg({ shape: ROCKER, variant: 'solid', state: 'happy' })).not.toContain('aora-anim');
  });

  it('move a whole figure inside the body’s own motion, and stream glyphs round it', () => {
    const character = createCharacter(mount(), {
      shape: ROCKER,
      variant: 'solid',
      state: 'happy',
      reducedMotion: false,
    });
    vi.advanceTimersByTime(48);
    const face = character.element.querySelector('[data-aora-face]')!;
    // The figure's motion plays on the HTML box that holds its layers.
    const rocking = face.closest('div.aora-anim')!;
    expect(rocking).not.toBeNull();
    // The body's transform (hop and squash) is the box outside the figure's motion.
    const body = rocking.parentElement!;
    expect(body.style.transform).toMatch(/scale\(/);
    const rule = rules();
    expect(rule).toContain('skew(0deg,3deg)');
    // In shares of the box, so it plays at any size.
    expect(rocking.getAttribute('style')).toMatch(/animation:aora-k/);
    expect(rule).toMatch(/translate\([\d.-]+%,[\d.-]+%\) rotate\([\d.-]+deg\) skew/);
    // The keyframe that only fades leaves the transform to the stops round it.
    expect(rule).toMatch(/80%\{opacity:0\.9\}/);
    // Four flakes beside the rocking figure, riding the body but not the rock.
    const streams = body.querySelector(':scope > [data-aora-layer="streams"]')!;
    expect(streams.querySelectorAll('.aora-anim')).toHaveLength(4);
    character.update({ state: 'sleeping' });
    vi.advanceTimersByTime(48);
    // The rock rests while drowsy; the snow keeps falling.
    const still = character.element.querySelector('[data-aora-face]')!.closest('.aora-anim');
    expect(still).toBeNull();
    expect(streams.querySelectorAll('.aora-anim')).toHaveLength(4);
    character.destroy();
  });

  it('move a whole figure in its own tree when other marks mirror it', () => {
    const character = createCharacter(mount(), {
      shape: ROCKER,
      variant: 'solid',
      state: 'happy',
      sourceId: 'rocker-src',
      reducedMotion: false,
    });
    vi.advanceTimersByTime(48);
    const rocking = character.element.querySelector('[data-aora-face]')!.closest('.aora-anim')!;
    // Inside the body's transform, in the art's units.
    expect(rocking.parentElement!.getAttribute('transform')).toMatch(/scale\(/);
    expect(rocking.parentElement!.querySelectorAll(':scope > .aora-anim')).toHaveLength(5);
    character.destroy();
  });

  it('turn the parts naming one motion as one piece, about their shared box', () => {
    const parts = getShape(ROCKER).parts.filter((part) => part.motion?.id === 'cap');
    expect(parts).toHaveLength(2);
    const outlines = parts.flatMap((part) => part.outline);
    const xs = outlines.map(([x]) => x);
    const ys = outlines.map(([, y]) => y);
    const [x0, x1, y1] = [Math.min(...xs), Math.max(...xs), Math.max(...ys)];
    const character = createCharacter(mount(), {
      shape: ROCKER,
      variant: 'solid',
      state: 'happy',
      reducedMotion: false,
    });
    vi.advanceTimersByTime(48);
    const rule = rules();
    // `origin: [0.5, 1]`: the bottom middle of the cap's box.
    const at = (v: number) => String(Math.round(v * 1000) / 1000);
    expect(rule).toContain(`translate(${at((x0 + x1) / 2)}px,${at(y1)}px) rotate(10deg)`);
    character.destroy();
  });
});

describe('the art’s motion and plain fields', () => {
  it('carry a figure’s motions and its pivot into shape space', () => {
    const shape = getShape(ROCKER);
    expect(shape.motion?.ids).toEqual(['rock', 'snow']);
    const bottom = Math.max(...shape.outline.map(([, y]) => y));
    // The pivot was drawn at the foot of the body.
    expect(shape.motion!.pivot![1]).toBeCloseTo(bottom, 0);
  });

  it('take a pinned face box as it is, in shape space', () => {
    const shape = getShape(PINNED);
    const scale = (shape.face.sx / 18 + shape.face.sy / 10) / 2;
    expect(shape.face.sx / shape.face.sy).toBeCloseTo(1.8, 5);
    // The box was pinned 15 units below the face hint, in the art's box.
    expect(shape.face.y - CENTER).toBeCloseTo((70 - 55) * scale, 0);
  });

  it('let the face sit over a prop drawn under it', () => {
    expect(getShape(PAINTED).face.sy).toBeGreaterThan(getShape(MASKED).face.sy);
  });

  it('leave the base parts a prop names plain', () => {
    const parts = getShape(CAPPED).parts;
    expect(parts[0]!.plain).toBe(true);
    expect(parts.slice(1).some((part) => part.plain)).toBe(false);
  });

  it('refuse art that names a motion its theme does not declare', () => {
    const broken: ThemePackage = {
      ...FIXTURE,
      definition: {
        ...FIXTURE.definition,
        id: 'fixture-motionless',
        style: { open: [{ style: 'vector', variant: 'solid' }] },
      },
      variants: [],
      decor: undefined,
      motions: {},
      art: { 'fx-lost': { body: 'M20 20L80 20L80 80L20 80Z', face: [50, 50], motion: 'spin' } },
    };
    expect(() => installTheme(broken)).toThrow(/motion "spin"/);
  });
});

describe('decorations in every set', () => {
  const spec: DecorSpec = {
    glyphs: DECOR.glyphs,
    moods: { bright: [{ glyph: 'spark', paint: 'ink', size: 18, zone: 'top-left' }] },
    always: [{ glyph: 'moon', paint: 'ink', size: 12, zone: 'bottom-right' }],
  };

  it('reach past the box only as far as the spec allows', () => {
    const shape = getShape('tofu');
    const wide: DecorSpec = { ...spec, reach: 0.12 };
    const lo = CENTER + (VIEWBOX.minX - 0.12 * VIEWBOX.width - CENTER) / getShapeScale('tofu');
    const placed = placeDecor(wide, 'm:bright', shape, getShapeScale('tofu'));
    expect(placed.length).toBeGreaterThan(0);
    for (const { x, size } of placed) expect(x - size / 2).toBeGreaterThanOrEqual(lo - 1e-9);
  });

  it('join each set and show alone where a state has none', () => {
    const shape = getShape('mochi');
    expect(decorSetKey(spec, 'happy')).toBe('m:bright');
    expect(decorSetKey(spec, 'idle')).toBe('m:calm');
    expect(placeDecor(spec, 'm:bright', shape, 1).map((p) => p.item.glyph)).toEqual(['spark', 'moon']);
    expect(placeDecor(spec, 'm:calm', shape, 1).map((p) => p.item.glyph)).toEqual(['moon']);
  });
});

describe('a skin’s own face ink and a shape’s own hair shade', () => {
  const paint: MediumDefinition['paint'] = (piece, ctx) => [
    ctx.kit.node('path', { d: ctx.kit.closedCurve(piece.ring), fill: piece.color }),
  ];
  const skin = (
    variant: string,
    medium: Omit<MediumDefinition, 'paint'>,
  ): ThemePackage['variants'][number] => ({
    style: 'vector',
    variant,
    reads: [],
    medium: { ...medium, paint },
  });
  beforeAll(() => {
    installTheme({
      ...FIXTURE,
      definition: {
        ...FIXTURE.definition,
        id: 'fixture-faces',
        style: { open: [{ style: 'vector', variant: 'facebare' }] },
      },
      art: { [HAIRED]: { base: 'bob', at: [50, 50], scale: 0.9, props: [], hairDeep: 0.5 } },
      decor: undefined,
      motions: undefined,
      variants: [
        skin('facebare', {}),
        skin('facegold', { faceInk: { light: '#ffe08a' } }),
        skin('facesplit', { faceInk: { dark: '#2B1A22', light: '#FFF0F3', split: 0.58 } }),
      ],
    });
  });
  const draw = (variant: string, color: 'night' | 'cream' | 'red', shape: ShapeId = 'mochi') =>
    renderStaticSvg({ shape, color, variant, state: 'happy', face: 'cute' });

  it('leaves the face rule as it is where a skin does not opt in', () => {
    for (const color of ['night', 'cream', 'red'] as const) {
      const bare = draw('facebare', color);
      expect(bare).not.toContain('calc(l + (');
      // The opted-in skins differ from it in paints alone, and every paint that differs is the face ink.
      const fills = (doc: string) => [...doc.matchAll(/(?:fill|stroke)="([^"]*)"/g)].map((m) => m[1]!);
      const strip = (doc: string) => doc.replace(/(fill|stroke)="[^"]*"/g, '$1=""');
      for (const variant of ['facegold', 'facesplit']) {
        const own = draw(variant, color).replaceAll(variant, 'facebare');
        expect(strip(own)).toBe(strip(bare));
        const changed = fills(own).filter((fill, i) => fill !== fills(bare)[i]);
        for (const fill of changed) expect(fill).toMatch(/^oklch\(from .*1000, 1\)\)\)$/);
      }
    }
  });

  it('turns the light face gold where the rule paints it light, and leaves the dark one', () => {
    const gold = draw('facegold', 'night');
    expect(gold).toContain('calc(l + (0.914 - l) * clamp(0, (l - 0.6) * 1000, 1))');
  });

  it('lets a skin split dark from light by the ink itself', () => {
    const split = draw('facesplit', 'cream');
    expect(split).toContain('clamp(0, (0.58 - l) * 1000, 1)');
    expect(split).toMatch(/oklch\(from var\(--a[a-z0-9]+-ink/);
  });

  it('shades hair towards the deep tone its shape asks for, and only there', () => {
    expect(draw('solid', 'red', HAIRED)).toContain('calc(l * 0.5) calc(c * 0.9 + 0.03) h)');
    expect(draw('solid', 'red', 'bob')).not.toContain('calc(l * 0.5)');
  });
});

describe('the vivid mood accent', () => {
  it('leaves an accent with no settings as the plain lean', () => {
    const lean = MOOD_LEAN.heated!;
    expect(leanInto('#123456', 'heated')).toMatch(
      new RegExp(
        `^oklch\\(from color-mix\\(in oklab, #123456, ${lean.tint} ${lean.share}%\\) l max\\(c, [0-9.]+\\) h / alpha\\)$`,
      ),
    );
    expect(leanInto('#123456', 'calm')).toBe('#123456');
  });

  it('holds a vivid accent above its chroma and within its band', () => {
    const vivid = leanInto('#123456', 'bright', { chroma: 0.18, lightness: [0.62, 0.86], share: 2 });
    expect(vivid).toContain('clamp(0.62, l, 0.86)');
    expect(vivid).toContain('max(c, 0.18)');
    expect(vivid).toContain(`${MOOD_LEAN.bright!.tint} 68%`);
  });

  it('lets one mood take a tint of its own, and a band per page', () => {
    const own = leanInto('#123456', 'heated', {
      moods: { heated: { tint: '#B04CFF', share: 70, lightness: { light: [0.5, 0.7], dark: [0.65, 0.85] } } },
    });
    expect(own.startsWith('light-dark(')).toBe(true);
    expect(own).toContain('#B04CFF 70%');
    expect(own).toContain('clamp(0.5, l, 0.7)');
    expect(own).toContain('clamp(0.65, l, 0.85)');
    expect(leanInto('#123456', 'calm', { moods: { calm: { tint: '#00FFAA', share: 30 } } })).toContain(
      '#00FFAA 30%',
    );
  });

  it('keeps a lean from lightening a dark accent by more than its lift', () => {
    const warm = leanInto('#5A2D1C', 'bright', { moods: { bright: { lift: 0.08 } } });
    expect(warm).toContain('oklch(from #5A2D1C min(');
    expect(warm).toContain('calc(l + 0.08)');
  });

  it('paints a following skin’s accent from it', () => {
    const svg = renderStaticSvg({ shape: 'mochi', color: 'orange', variant: 'fixdoodle', state: 'happy' });
    expect(svg).toContain('clamp(0.6, l, 0.85)');
  });
});

describe('the effect anchor', () => {
  it('leaves a shape with nothing in the top right as it was', () => {
    for (const id of ['mochi', 'tofu', 'hex'] as ShapeId[]) {
      for (const kind of ['zz', 'sparkle', 'bang', 'strokes', 'dots'] as const) {
        expect(fxPlacement(getShape(id), kind, getShapeScale(id))).toEqual({ mirror: false, dx: 0, dy: 0 });
      }
    }
  });

  it('takes the free corner when a prop is in the way, and keeps clearer of the figure', () => {
    const shape = getShape(FLAG);
    const scale = getShapeScale(FLAG);
    const figure = figureOf(shape);
    const placed = fxPlacement(shape, 'zz', scale);
    expect(placed).not.toEqual({ mirror: false, dx: 0, dy: 0 });
    const overlap = (circles: readonly (readonly [number, number, number])[]) =>
      circles.reduce((sum, [x, y, r]) => sum + Math.max(0, r - clearance(figure, x, y)), 0);
    const laid = evaluateFx('zz', 0, { settled: true }).items.map(
      (item) => [item.x, item.y, item.size] as const,
    );
    expect(overlap(fxFootprint(shape, 'zz', scale))).toBeLessThan(overlap(laid));
  });

  it('moves the effect the character draws, and mirrors its pieces with it', () => {
    const svg = renderStaticSvg({ shape: FLAG, state: 'sleeping', face: 'cute' });
    const plain = renderStaticSvg({ shape: 'mochi', state: 'sleeping', face: 'cute' });
    const zOf = (doc: string) => Number(/data-aora-fx=""><path d="M([0-9.-]+)/.exec(doc)?.[1]);
    expect(zOf(plain)).toBeGreaterThan(CENTER);
    if (fxPlacement(getShape(FLAG), 'zz', getShapeScale(FLAG)).mirror) expect(zOf(svg)).toBeLessThan(CENTER);
  });
});

describe('the core bundle', () => {
  const src = (...path: string[]) => readFileSync(join(process.cwd(), 'src', ...path), 'utf8');
  /** Every module the main and `/static` entries can reach, by following their relative imports. */
  function reach(entry: string): Set<string> {
    const seen = new Set<string>();
    const visit = (file: string): void => {
      if (seen.has(file)) return;
      seen.add(file);
      const text = readFileSync(file, 'utf8');
      for (const [, path] of text.matchAll(/^(?:import|export) (?!type )[^'"]*?from '(\.[^']+)'/gm)) {
        visit(join(file, '..', path!.replace(/\.js$/, '.ts')));
      }
    };
    visit(join(process.cwd(), 'src', entry));
    return seen;
  }

  it('reaches no theme folder and none of the extras from the main and static entries', () => {
    for (const entry of ['index.ts', 'static.ts']) {
      const files = [...reach(entry)].map((file) => file.replace(/\\/g, '/'));
      expect(
        files.filter((file) => /\/themes\/(?!index|manifest|state|types|extras-hook)[^/]+\//.test(file)),
      ).toEqual([]);
    }
  });

  it('keeps the extras free of the core at run time and of every theme', () => {
    const dir = join(process.cwd(), 'src', 'themes', 'extras');
    for (const file of readdirSync(dir)) {
      const text = src('themes', 'extras', file);
      for (const [, path] of text.matchAll(/^import (?!type )[^'"]*?from '([^']+)'/gm))
        expect(path).toMatch(/^\.\/[a-z-]+\.js$/);
    }
  });

  const built = join(process.cwd(), 'dist', 'index.js');
  it.skipIf(!existsSync(built))(
    'carries no decoration or motion engine in the main and static entries',
    () => {
      for (const file of ['index.js', 'static.js']) {
        const text = readFileSync(join(process.cwd(), 'dist', file), 'utf8');
        for (const mark of [
          'function placeDecor',
          'function planFor',
          'function fxPlacement',
          '@keyframes',
          'aora-anim',
          'data-aora-decor',
          'data-aora-layer',
          'data-aora-motion',
        ])
          expect(text, `${file}: ${mark}`).not.toContain(mark);
      }
    },
  );

  it.skipIf(!existsSync(built))(
    'carries no theme’s decorations or motions',
    { timeout: 60_000 },
    async () => {
      const main = readFileSync(built, 'utf8');
      const themes = readdirSync(join(process.cwd(), 'src', 'themes'), { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name !== 'shared' && entry.name !== 'extras')
        .map((entry) => entry.name);
      const modules = await Promise.all(
        themes.map((id) => import(`../src/themes/${id}/index.ts`) as Promise<Record<string, unknown>>),
      );
      for (const module of modules) {
        const entry = Object.values(module).find(
          (value): value is ThemePackage => !!value && typeof value === 'object' && 'definition' in value,
        );
        const specs = [entry?.decor, ...(entry?.variants ?? []).map((skin) => skin.decor)];
        for (const spec of specs) {
          for (const glyph of Object.values(spec?.glyphs ?? {})) {
            for (const layer of glyph.layers) if (layer.d.length > 24) expect(main).not.toContain(layer.d);
          }
        }
      }
    },
  );
});
