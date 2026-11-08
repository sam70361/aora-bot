// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SHAPE_IDS, SHAPE_SPACE, VIEWBOX_STR } from '../src/core/types.js';
import { fnv1a32 } from '../src/math/hash.js';
import { CHARACTER_STATES } from '../src/motion/states.js';
import { createCharacter } from '../src/render/character.js';
import { renderStaticSvg } from '../src/render/static-svg.js';
import { pixelGrid } from '../src/render/pixel/grid.js';
import { PIXEL_DEFAULTS } from '../src/render/pixel/options.js';
import { createSimulation } from '../src/sim/simulation.js';
import { getStyle, resolveStyleOptions, validateStyleOptions } from '../src/styles/index.js';

/*
 * The pixel series. Static output is deterministic, so most of it is frozen
 * as hashes (one per state and shape) with a few full documents beside them
 * to show what a hash stands for. The live renderer is exercised through
 * `createCharacter`, the way a host uses it.
 */

const FRAME_MS = 16;
const SNAPSHOT_SHAPES = ['blob', 'hex', 'cloud'] as const;
const VARIANTS = ['crisp', 'dot', 'block'] as const;

const pixel = (options: Parameters<typeof renderStaticSvg>[0] = {}) =>
  renderStaticSvg({ style: 'pixel', ...options });

const hash = (s: string) => fnv1a32(s).toString(16).padStart(8, '0');

describe('pixel style definition', () => {
  const style = getStyle('pixel');

  it('declares its variants, defaults and parameter ranges', () => {
    expect(style.variants).toEqual(['crisp', 'dot', 'block']);
    expect(style.defaultVariant).toBe('crisp');
    expect(style.defaults).toEqual({ grid: 24, gap: 0.16, shades: 3, fps: 12, outline: true, glow: true });
    expect(style.params).toMatchSnapshot();
  });

  it('clamps and snaps parameters, and reports what it fixed', () => {
    expect(resolveStyleOptions(style, { grid: 999, shades: 0, gap: 'x', fps: 7.4 })).toMatchObject({
      grid: 64,
      shades: 1,
      gap: PIXEL_DEFAULTS.gap,
      fps: 7,
    });
    expect(validateStyleOptions(style, { grid: 999, bogus: 1 }).map((i) => i.key)).toEqual(['grid', 'bogus']);
  });
});

describe('static pixel output', () => {
  it.each(SNAPSHOT_SHAPES)('freezes every state of %s as a hash', (shape) => {
    const hashes = Object.fromEntries(
      CHARACTER_STATES.map((state) => [state, hash(pixel({ shape, state }))]),
    );
    expect(hashes).toMatchSnapshot();
  });

  it.each(SNAPSHOT_SHAPES)('draws a different picture for most states of %s', (shape) => {
    const distinct = new Set(CHARACTER_STATES.map((state) => pixel({ shape, state })));
    // Some states share a pose and an expression; the series must not collapse them all.
    expect(distinct.size).toBeGreaterThan(CHARACTER_STATES.length / 2);
  });

  it.each(VARIANTS)('freezes a full %s document', (variant) => {
    expect(pixel({ shape: 'blob', state: 'happy', variant })).toMatchSnapshot();
  });

  it('freezes a line face and a gradient-free hex', () => {
    expect(pixel({ shape: 'hex', state: 'thinking', face: 'line', nose: 'slant' })).toMatchSnapshot();
    expect(pixel({ shape: 'cloud', state: 'notifying', variant: 'block', color: 'blue' })).toMatchSnapshot();
  });

  it('is deterministic', () => {
    for (const variant of VARIANTS) {
      const a = pixel({ shape: 'tofu', state: 'curious', variant, color: 'blue' });
      const b = pixel({ shape: 'tofu', state: 'curious', variant, color: 'blue' });
      expect(a).toBe(b);
    }
  });

  it('draws the same cells whatever size it is rendered at', () => {
    for (const variant of VARIANTS) {
      const small = pixel({ shape: 'blob', state: 'happy', variant, sizePx: 16 });
      const large = pixel({ shape: 'blob', state: 'happy', variant, sizePx: 480 });
      const strip = (svg: string) => svg.replace(/ (width|height)="[^"]*"/g, '');
      expect(strip(small)).toBe(strip(large));
    }
  });

  it('changes the cell count with the grid, not with the size', () => {
    const cells = (svg: string) => (svg.match(/h[\d.]+v1/g) ?? []).length;
    const coarse = cells(pixel({ shape: 'blob', styleOptions: { grid: 16 } }));
    const fine = cells(pixel({ shape: 'blob', styleOptions: { grid: 48 } }));
    expect(fine).toBeGreaterThan(coarse);
  });

  it('shows no more shades than asked for', () => {
    const classes = (svg: string) => new Set(svg.match(/class="[^"]+"/g)).size;
    const flat = classes(pixel({ shape: 'blob', styleOptions: { shades: 1 }, eyeColor: '#fff' }));
    const rich = classes(pixel({ shape: 'blob', styleOptions: { shades: 5 }, eyeColor: '#fff' }));
    expect(flat).toBeLessThan(rich);
  });

  it('drops the dark-scheme overrides when the ink is flat', () => {
    expect(pixel({ shape: 'blob' })).toContain('prefers-color-scheme: dark');
    expect(pixel({ shape: 'blob', flat: true })).not.toContain('prefers-color-scheme');
  });
});

/** Cells of the paint with this fill, as `col,row` keys. Reads crisp output only. */
function cellsOf(svg: string, fill: string): Set<string> {
  const out = new Set<string>();
  const tag = new RegExp(`<path[^>]*fill="${fill}"[^>]*d="([^"]+)"`, 'i').exec(svg);
  if (!tag) return out;
  for (const m of tag[1]!.matchAll(/M([\d.]+) ([\d.]+)h([\d.]+)v1/g)) {
    const col = Number(m[1]);
    const row = Number(m[2]);
    for (let i = 0; i < Number(m[3]); i++) out.add(`${Math.round(col + i)},${row}`);
  }
  return out;
}

describe.each(['cute', 'eyes'] as const)('pixel eyes on the %s face', (face) => {
  const EYE = '#00FF99';
  /** The cute mouth is drawn in the eye colour too; it is measured on its own, not folded into the eyes. */
  const eyesOnly = face === 'cute' ? ({ mouth: 'none' } as const) : {};

  /** The column the eyes mirror about, taken from the eyes themselves: a turned head moves the face off the body's axis. */
  const axisOf = (eyes: Set<string>): number => {
    const cols = [...eyes].map((key) => Number(key.split(',')[0]));
    return (Math.min(...cols) + Math.max(...cols)) / 2;
  };

  it.each(['blob', 'hex', 'tofu', 'cloud', 'star'] as const)('stay left/right symmetric on %s', (shape) => {
    for (const state of ['idle', 'happy', 'surprised', 'sleeping', 'curious', 'sad'] as const) {
      const eyes = cellsOf(pixel({ shape, state, face, ...eyesOnly, eyeColor: EYE }), EYE);
      expect(eyes.size, `${shape}/${state} has eyes`).toBeGreaterThan(0);
      const axis = axisOf(eyes);
      const mirrored = new Set(
        [...eyes].map((key) => {
          const [col, row] = key.split(',').map(Number) as [number, number];
          return `${2 * axis - col},${row}`;
        }),
      );
      expect(mirrored, `${shape}/${state}`).toEqual(eyes);
    }
  });

  it('leave a gap between the two eyes', () => {
    for (const state of ['idle', 'surprised', 'happy'] as const) {
      const eyes = cellsOf(pixel({ shape: 'blob', state, face, ...eyesOnly, eyeColor: EYE }), EYE);
      const axis = axisOf(eyes);
      const cols = [...eyes].map((key) => Number(key.split(',')[0]));
      const left = Math.max(...cols.filter((col) => col < axis));
      const right = Math.min(...cols.filter((col) => col > axis));
      expect(right - left, state).toBeGreaterThanOrEqual(2);
    }
  });

  it('keep at least a cell at a coarse grid wherever they show at the default', () => {
    let shown = 0;
    for (const state of CHARACTER_STATES) {
      const base = cellsOf(pixel({ shape: 'blob', state, face, ...eyesOnly, eyeColor: EYE }), EYE);
      if (base.size === 0) continue; // belt states replace the face
      shown++;
      const coarse = cellsOf(
        pixel({ shape: 'blob', state, face, ...eyesOnly, eyeColor: EYE, styleOptions: { grid: 12 } }),
        EYE,
      );
      expect(coarse.size, state).toBeGreaterThan(0);
    }
    expect(shown).toBeGreaterThan(CHARACTER_STATES.length / 2);
  });
});

describe('pixel cute face', () => {
  it('is in the features colour on a hue, with cheeks and the effect colour of the mood', () => {
    const happy = pixel({ shape: 'blob', state: 'happy', color: 'blue' });
    expect(happy).toContain('#2B2420');
    expect(happy).not.toContain('#FFFFFF');
    expect(happy).toContain('#FF9DBB');
    expect(happy).toContain('#FF6F91');
    expect(pixel({ shape: 'blob', state: 'sad', color: 'blue' })).toContain('#7CC7FF');
    expect(pixel({ shape: 'blob', state: 'celebrate', color: 'blue' })).toContain('#F5B428');
  });

  it('leaves the eyes face without cheeks', () => {
    const eyes = pixel({ shape: 'blob', state: 'happy', color: 'blue', face: 'eyes' });
    expect(eyes).not.toContain('#FF9DBB');
    expect(eyes).not.toContain('#FF6F91');
  });

  it('turns the face of a black body with the page, as the body turns', () => {
    for (const face of ['cute', 'eyes'] as const) {
      const svg = pixel({ shape: 'blob', state: 'idle', color: 'black', face });
      const turned = /\.(\S+) \{ fill: #2B2420; \}/.exec(svg)?.[1];
      expect(svg, face).toContain(`class="${turned}" fill="#FFFFFF"`);
    }
  });
});

describe('pixel grid', () => {
  it('divides shape space into the requested cells and keeps a margin for what hangs outside', () => {
    for (const n of [12, 15, 24, 33, 48]) {
      const grid = pixelGrid(n);
      expect(grid.size).toBe(n + 2 * grid.margin);
      expect(grid.cell).toBeCloseTo(SHAPE_SPACE / n, 6);
    }
  });
});

describe('live pixel renderer', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  const mount = () => {
    const host = document.createElement('span');
    document.body.appendChild(host);
    return host;
  };

  it('mounts one SVG, draws cells, and removes it on destroy', () => {
    const host = mount();
    const character = createCharacter(host, { style: 'pixel', shape: 'blob', reducedMotion: true });

    expect(host.children).toHaveLength(1);
    expect(host.firstElementChild).toBe(character.element);
    expect(character.element.getAttribute('viewBox')).toBe(VIEWBOX_STR);
    expect(character.element.querySelectorAll('path').length).toBeGreaterThan(0);

    character.destroy();
    expect(host.children).toHaveLength(0);
  });

  it('draws each variant', () => {
    for (const variant of VARIANTS) {
      const host = mount();
      const character = createCharacter(host, { style: 'pixel', variant, shape: 'hex', reducedMotion: true });
      expect(character.element.querySelectorAll('path').length, variant).toBeGreaterThan(0);
      // Only the LED plate has a lattice and a glow to define.
      expect(character.element.querySelector('pattern') !== null, variant).toBe(variant === 'dot');
      character.destroy();
    }
  });

  it('lays a different grid with styleOptions, live and through configure', () => {
    const host = mount();
    const character = createCharacter(host, {
      style: 'pixel',
      shape: 'blob',
      reducedMotion: true,
      styleOptions: { grid: 16 },
    });
    const coarse = character.element.querySelectorAll('path').length;
    const coarseD = character.element.querySelector('path')!.getAttribute('d')!.length;

    character.update({ styleOptions: { grid: 48 } });
    const fineD = character.element.querySelector('path')!.getAttribute('d')!.length;
    expect(coarse).toBeGreaterThan(0);
    expect(fineD).toBeGreaterThan(coarseD);
    character.destroy();
  });

  it('only writes to the DOM when a cell changed', () => {
    const host = mount();
    const character = createCharacter(host, {
      style: 'pixel',
      shape: 'blob',
      state: 'idle',
      styleOptions: { fps: 0 },
    });
    const g = character.element.querySelector('g')!;
    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((records) => mutations.push(...records));
    observer.observe(g, { subtree: true, attributes: true, childList: true });

    character.renderOnce();
    character.renderOnce();
    observer.takeRecords();
    mutations.length = 0;

    // A repaint of the same frame is the same raster: nothing to write.
    character.renderOnce();
    expect(observer.takeRecords()).toHaveLength(0);
    observer.disconnect();
    character.destroy();
  });

  it('keeps animating on a quantised clock', () => {
    const host = mount();
    const character = createCharacter(host, {
      style: 'pixel',
      shape: 'blob',
      state: 'excited',
      styleOptions: { fps: 12 },
    });
    const before = character.element.innerHTML;
    vi.advanceTimersByTime(FRAME_MS * 30);
    expect(character.element.innerHTML).not.toBe(before);
    character.destroy();
  });

  it('switches series at runtime without touching the simulation', () => {
    const host = mount();
    const character = createCharacter(host, { shape: 'blob', state: 'happy', reducedMotion: true });
    const sibling = document.createElement('i');
    host.appendChild(sibling);
    const vectorSvg = character.element;
    expect(vectorSvg.querySelector('[shape-rendering="crispEdges"]')).toBeNull();

    character.update({ style: 'pixel', variant: 'dot', styleOptions: { grid: 32 } });

    expect(character.element).not.toBe(vectorSvg);
    expect(vectorSvg.isConnected).toBe(false);
    expect(host.children).toHaveLength(2);
    // The new root takes the old one's place, ahead of what followed it.
    expect(host.firstElementChild).toBe(character.element);
    expect(character.element.nextElementSibling).toBe(sibling);
    expect(character.element.querySelector('pattern')).not.toBeNull();

    character.update({ style: 'vector' });
    expect(host.firstElementChild).toBe(character.element);
    expect(character.element.querySelector('pattern')).toBeNull();
    expect(character.element.querySelectorAll('path').length).toBeGreaterThan(0);

    character.destroy();
    expect(host.children).toHaveLength(1);
  });

  it('falls back to the new series default when the old variant does not exist there', () => {
    const host = mount();
    const character = createCharacter(host, { shape: 'blob', variant: 'outline', reducedMotion: true });
    character.update({ style: 'pixel' });
    // `outline` is not a pixel variant: crisp, the default, has no LED plate.
    expect(character.element.querySelector('pattern')).toBeNull();
    expect(character.element.querySelectorAll('path').length).toBeGreaterThan(0);
    character.destroy();
  });

  it('keeps the state it had across a series switch', () => {
    const host = mount();
    const options = { shape: 'blob', state: 'sleeping', seed: 's', reducedMotion: true } as const;
    const switched = createCharacter(host, options);
    switched.update({ style: 'pixel' });
    const direct = createCharacter(mount(), { ...options, style: 'pixel' });

    // Ids carry a per-instance serial; the picture is what has to match.
    const picture = (el: Element) => el.innerHTML.replace(/aora-p[xg]-[\w-]+/g, 'id');
    expect(picture(switched.element)).toBe(picture(direct.element));
    switched.destroy();
    direct.destroy();
  });
});

describe('live and static agree', () => {
  it('draw the same cells for the same frame', () => {
    const style = getStyle('pixel');
    for (const variant of VARIANTS) {
      const sim = createSimulation({
        shape: 'blob',
        state: 'happy',
        variant,
        seed: 'consistency',
        reducedMotion: true,
        compensateEyes: false,
        still: { beltTime: 0.62 },
        displaySizePx: 240,
      });
      sim.settle();
      const frame = sim.snapshot();
      sim.dispose();

      const host = document.createElement('div');
      document.body.appendChild(host);
      const live = style.createRenderer(host, {
        seed: 'consistency',
        styleOptions: resolveStyleOptions(style),
      });
      live.draw(frame);
      const markup = style.renderStatic(frame, {
        color: 'black',
        // Static output paints the palette gradient unless told otherwise; the live
        // character with no ink override is flat, so that is the one to compare.
        flat: true,
        uid: 'x',
        styleOptions: resolveStyleOptions(style),
      });

      // The colours are written differently (CSS mixes against hex), the cells are not.
      const liveCells = [...host.querySelectorAll('path')].map((p) => p.getAttribute('d')).sort();
      const staticCells = (markup.match(/<path\b[^>]*>/g) ?? [])
        .map((tag) => /\sd="([^"]+)"/.exec(tag)?.[1])
        .sort();
      expect(liveCells.length, variant).toBeGreaterThan(0);
      expect(liveCells, variant).toEqual(staticCells);
      live.destroy();
      host.remove();
    }
  });
});

describe('every shape', () => {
  it.each(SHAPE_IDS)('renders %s without throwing, for every variant', (shape) => {
    for (const variant of VARIANTS) {
      expect(pixel({ shape, state: 'idle', variant })).toContain('<path');
    }
  });
});
