// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacter } from '../src/render/character.js';
import { renderStaticSvg } from '../src/render/static-svg.js';
import { COLOR_IDS, FACE_STYLES } from '../src/core/types.js';
import { fnv1a32 } from '../src/math/hash.js';
import { MEDIA, mediumSize } from '../src/render/vector/media.js';
import { createSimulation, type SimulationOptions } from '../src/sim/simulation.js';
import type { FrameSnapshot } from '../src/sim/snapshot.js';
import { getStyle, resolveStyleOptions, validateStyleOptions } from '../src/styles/index.js';

/*
 * The vector series' `sticker`, `paper`, `soft` and `riso` variants, and the
 * single-line look that `outline` gives once its ink is `currentColor`.
 *
 * The three plain variants are pinned too (`solid`/`outline`/`glass` at the
 * bottom): a change to the layered ones must not move a byte of what they draw.
 */

const style = getStyle('vector');
const STICKER_AND_PAPER = ['sticker', 'paper'] as const;
/** Variants with a layer stack of their own, which every renderer has to draw alike. */
const LAYERED_VARIANTS = ['sticker', 'paper', 'soft', 'riso'] as const;
const SHAPES = ['blob', 'tofu', 'star', 'cat', 'bunny', 'sprout'] as const;
// Idle is a plain body; the others bring a squash, a belt, a fading core.
const STATES = ['idle', 'happy', 'thinking', 'powering-down'] as const;

function stillFrame(
  shape: string,
  state: string,
  variant: string,
  extra: Partial<SimulationOptions> = {},
): FrameSnapshot {
  const sim = createSimulation({
    shape: shape as never,
    state: state as never,
    variant,
    seed: 'variants',
    reducedMotion: true,
    compensateEyes: false,
    still: { beltTime: 0.62 },
    displaySizePx: 240,
    ...extra,
  });
  sim.settle();
  const frame = sim.snapshot();
  sim.dispose();
  return frame;
}

/**
 * Path data replaced by its length and a hash. A snapshot of every outline in
 * full is half a megabyte of numbers nobody reads; this keeps the structure,
 * the paint and the transforms readable and still moves if one coordinate does.
 */
function compact(svg: string): string {
  return svg
    .replace(/ d="([^"]+)"/g, (_m, d: string) => ` d="${d.length}:${fnv1a32(d).toString(36)}"`)
    .replace(
      / href="(data:[^"]+)"/g,
      (_m, url: string) => ` href="${url.length}:${fnv1a32(url).toString(36)}"`,
    );
}

function staticSvg(variant: string, extra: Record<string, unknown> = {}): string {
  return renderStaticSvg({ shape: 'blob', color: 'blue', variant, ...extra } as never);
}

/** Attribute values of every `<tag>` in a markup string, in document order. */
function attrs(markup: string, tag: string, name: string): string[] {
  const out: string[] = [];
  for (const m of markup.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))) {
    const v = new RegExp(`\\s${name}="([^"]*)"`).exec(m[0])?.[1];
    if (v !== undefined) out.push(v);
  }
  return out;
}

describe.each(LAYERED_VARIANTS)('%s: static snapshots', (variant) => {
  const cases = SHAPES.flatMap((shape) => STATES.map((state) => [shape, state] as const));

  it.each(cases)('%s / %s', (shape, state) => {
    expect(compact(renderStaticSvg({ shape, state, variant, color: 'violet' }))).toMatchSnapshot();
  });

  it('takes the parameters of its variant', () => {
    expect(
      compact(
        renderStaticSvg({
          shape: 'tofu',
          variant,
          styleOptions: { stickerWidth: 6, stickerShadow: false, paperOffset: 14, paperAngle: 120 },
        }),
      ),
    ).toMatchSnapshot();
  });
});

describe('sticker', () => {
  it('wraps the body in a paper border one edge-width wide', () => {
    const svg = staticSvg('sticker', { styleOptions: { stickerWidth: 9 } });
    // Stroked at twice the edge: half is hidden under the body.
    expect(attrs(svg, 'path', 'stroke-width')).toContain('18');
    expect(attrs(svg, 'path', 'stroke')).toContain('var(--aora-paper, #fff)');
  });

  it('keeps its eyes in paper, whatever eye colour the page asks for', () => {
    const svg = staticSvg('sticker', { eyeColor: '#123456' });
    expect(svg).not.toContain('#123456');
    expect(svg).toContain('fill="var(--aora-paper, #fff)"');
  });

  it('casts a soft shadow through a filter, and drops it with the parameter', () => {
    const on = staticSvg('sticker');
    const off = staticSvg('sticker', { styleOptions: { stickerShadow: false } });
    const id = /<filter id="([^"]+)"/.exec(on)?.[1];
    expect(id).toBeTruthy();
    expect(on).toContain(`filter="url(#${id})"`);
    expect(off).not.toContain('<filter');
    expect(off).not.toContain('feDropShadow');
  });

  it('puts the badge inside the same silhouette, with a paper ring', () => {
    const frame = stillFrame('blob', 'notifying', 'sticker', { badgeColor: '#ff3b30' });
    const host = document.createElement('div');
    const live = style.createRenderer(host, { seed: 's', styleOptions: resolveStyleOptions(style) });
    live.draw(frame);

    const badge = frame.badge!;
    const circles = Array.from(live.element.querySelectorAll('circle'));
    const halo = circles.find((c) => c.getAttribute('fill') === 'var(--aora-paper, #fff)')!;
    const dot = circles.find((c) => c.getAttribute('fill') === '#ff3b30')!;
    expect(dot.getAttribute('stroke')).toBe('var(--aora-paper, #fff)');
    // Badge radius + half its own 8-unit ring + the 12-unit edge.
    expect(Number(halo.getAttribute('r'))).toBeCloseTo(badge.r + 4 + 12, 1);
    expect(halo.getAttribute('cx')).toBe(dot.getAttribute('cx'));
    live.destroy();
  });

  it('follows the body through squash and rotation', () => {
    const host = document.createElement('div');
    const live = style.createRenderer(host, { seed: 'f', styleOptions: resolveStyleOptions(style) });
    const sim = createSimulation({
      shape: 'blob',
      state: 'excited',
      variant: 'sticker',
      seed: 'f',
      reducedMotion: false,
      displaySizePx: 240,
    });
    let rotated = false;
    for (let i = 0; i < 40; i++) {
      sim.step(1 / 60);
      const frame = sim.snapshot();
      live.draw(frame);
      const bodyGroup = live.element.querySelector('g[filter]')!.parentElement!;
      const transform = bodyGroup.getAttribute('transform')!;
      expect(transform).toContain('translate(');
      const border = bodyGroup.querySelector('g[filter] > path')!;
      const body = Array.from(bodyGroup.children).find((c) => c.localName === 'path')!;
      // Same group, so the same matrix; and the same outline.
      expect(border.getAttribute('d')).toBe(body.getAttribute('d'));
      if (frame.body.rotation !== 0) rotated = true;
    }
    expect(rotated).toBe(true);
    live.destroy();
    sim.dispose();
  });

  it('fades its border with the belt core', () => {
    const frame = stillFrame('blob', 'powering-down', 'sticker');
    const core = frame.body.coreOpacity!;
    expect(core).toBeLessThan(1);
    const svg = renderStaticSvg({ shape: 'blob', state: 'powering-down', variant: 'sticker' });
    const rounded = String(Math.round(core * 100) / 100);
    expect(attrs(svg, 'path', 'opacity')).toContain(rounded);
    expect(attrs(svg, 'path', 'fill-opacity')).toContain(rounded);
  });
});

describe('paper', () => {
  it('lays a darker copy of the ink under the body, shifted by offset and angle', () => {
    const svg = staticSvg('paper', { styleOptions: { paperOffset: 10, paperAngle: 90 } });
    expect(svg).toContain('transform="translate(0 10)"');
    // Black over a copy of the ink: it works on a gradient, which a computed colour would not.
    expect(attrs(svg, 'path', 'fill-opacity')).toContain('0.32');
    expect(attrs(svg, 'path', 'fill')).toContain('#000');
  });

  it('derives its shade from a token ink and from a gradient ink alike', () => {
    const frame = stillFrame('blob', 'idle', 'paper');
    const host = document.createElement('div');
    const live = style.createRenderer(host, { seed: 'p', styleOptions: resolveStyleOptions(style) });
    live.draw(frame);
    const fills = Array.from(live.element.querySelectorAll('path')).map((p) => p.getAttribute('fill'));
    expect(fills.filter((f) => f === 'var(--aora-fg, currentColor)')).toHaveLength(2);
    expect(fills).toContain('#000');
    live.destroy();

    const gradient = staticSvg('paper', { ink: { from: '#f00', to: '#00f' } });
    expect(attrs(gradient, 'path', 'fill').filter((f) => f.startsWith('url(#'))).toHaveLength(2);
  });

  it('keeps the shadow direction fixed while the body turns', () => {
    const host = document.createElement('div');
    const live = style.createRenderer(host, {
      seed: 'p',
      styleOptions: resolveStyleOptions(style, { paperOffset: 12, paperAngle: 0 }),
    });
    const sim = createSimulation({
      shape: 'blob',
      state: 'playful',
      variant: 'paper',
      seed: 'p',
      reducedMotion: false,
      displaySizePx: 240,
    });
    for (let i = 0; i < 20; i++) {
      sim.step(1 / 60);
      live.draw(sim.snapshot());
    }
    // The figure is tilted as a whole, so the shadow is not a direct child of the root.
    const groups = Array.from(live.element.querySelectorAll('g'));
    const shadow = groups.find((g) => g.getAttribute('transform') === 'translate(12 0)')!;
    expect(shadow).toBeTruthy();
    // The shadow's inner group carries the body's rotation; the shift itself does not.
    const bodyTransform = Array.from(shadow.parentElement!.children)
      .map((c) => c.getAttribute('transform'))
      .find((t) => t?.includes('rotate('));
    expect(shadow.firstElementChild!.getAttribute('transform')).toBe(bodyTransform);
    live.destroy();
    sim.dispose();
  });

  it('does not tilt the figure: the simulation is the same as for solid', () => {
    const a = stillFrame('blob', 'happy', 'paper');
    const b = stillFrame('blob', 'happy', 'solid');
    expect({ ...a, variant: '' }).toEqual({ ...b, variant: '' });
  });
});

describe('single line: outline with a currentColor ink', () => {
  it('draws only in the text colour, static', () => {
    const face = staticSvg('outline', { ink: { flat: 'currentColor' }, state: 'happy' });
    expect(face).not.toContain('url(#');
    expect(face).not.toContain('--aora-fg');
    expect(attrs(face, 'path', 'stroke')).toContain('currentColor');
    // Eyes switch to the ink in a hollow variant.
    expect(attrs(face, 'path', 'fill')).toContain('currentColor');

    // And so do the belt's dots and rings, which sit outside the body.
    const belt = staticSvg('outline', { ink: { flat: 'currentColor' }, state: 'thinking' });
    expect(belt).not.toContain('--aora-fg');
    expect(attrs(belt, 'circle', 'fill').length).toBeGreaterThan(0);
    expect(attrs(belt, 'circle', 'fill').every((f) => f === 'none' || f === 'currentColor')).toBe(true);
  });

  it.each(['eyes', 'cute'] as const)(
    'draws only in the text colour, live, belt or effect included (%s face)',
    (face) => {
      // A frame sampled part-way into the belt, so there are dots and rings to check.
      const frame = stillFrame('blob', 'thinking', 'outline', { face, ink: { flat: 'currentColor' } });
      expect(face === 'eyes' ? frame.belt?.dots.length : frame.fx?.items.length).toBeGreaterThan(0);
      const host = document.createElement('div');
      const live = style.createRenderer(host, { seed: 'line', styleOptions: resolveStyleOptions(style) });
      live.draw(frame);
      const painted = new Set<string>();
      for (const el of Array.from(live.element.querySelectorAll('[fill],[stroke]'))) {
        if (el.closest('defs, clipPath')) continue;
        if (el.getAttribute('opacity') === '0') continue;
        for (const name of ['fill', 'stroke'] as const) {
          const v = el.getAttribute(name);
          if (v && v !== 'none') painted.add(v);
        }
      }
      expect([...painted]).toEqual(['currentColor']);
      live.destroy();
    },
  );

  it('is what ink null gives when no stylesheet sets the token', () => {
    // `--aora-fg` is a token with `currentColor` as its own fallback, so with
    // nothing setting it the plain outline is already a single line.
    expect(staticSvg('outline')).not.toContain('currentColor');
    const host = document.createElement('div');
    const character = createCharacter(host, { variant: 'outline', reducedMotion: true });
    const stroke = character.element.querySelector('path[stroke]')!.getAttribute('stroke');
    expect(stroke).toBe('var(--aora-fg, currentColor)');
    character.destroy();
  });

  it('keeps ids apart for two inks of the same character', () => {
    const a = staticSvg('solid', { ink: { from: '#f00', to: '#00f' } });
    const b = staticSvg('solid', { ink: { from: '#0f0', to: '#00f' } });
    expect(attrs(a, 'linearGradient', 'id')[0]).not.toBe(attrs(b, 'linearGradient', 'id')[0]);
    expect(a).toContain('stop-color="#f00"');
    expect(b).toContain('stop-color="#0f0"');
  });
});

describe('style parameters', () => {
  it('declares a range for every style parameter, so resolve and validate cover them', () => {
    expect(resolveStyleOptions(style)).toEqual({
      strokeWidth: 10,
      stickerWidth: 12,
      stickerShadow: true,
      paperOffset: 9,
      paperAngle: 55,
      paperTilt: -3,
      softShadow: true,
      softGloss: false,
      risoOffset: 10,
      risoHalftone: true,
      wobble: 4,
      grain: 1,
      hatching: true,
      neonGlow: 8,
    });
    for (const key of Object.keys(style.defaults)) expect(style.params).toHaveProperty(key);
  });

  it('clamps to range and snaps to the step', () => {
    expect(resolveStyleOptions(style, { stickerWidth: 99 })).toMatchObject({ stickerWidth: 20 });
    expect(resolveStyleOptions(style, { stickerWidth: 0 })).toMatchObject({ stickerWidth: 4 });
    expect(resolveStyleOptions(style, { paperOffset: -5 })).toMatchObject({ paperOffset: 0 });
    expect(resolveStyleOptions(style, { paperOffset: 3.4 })).toMatchObject({ paperOffset: 3 });
    expect(resolveStyleOptions(style, { paperAngle: 999 })).toMatchObject({ paperAngle: 360 });
    expect(resolveStyleOptions(style, { paperAngle: 47 })).toMatchObject({ paperAngle: 45 });
  });

  it('falls back on the wrong type', () => {
    expect(resolveStyleOptions(style, { stickerShadow: 'yes', paperAngle: '90' })).toMatchObject({
      stickerShadow: true,
      paperAngle: 55,
    });
    expect(resolveStyleOptions(style, { stickerShadow: false })).toMatchObject({ stickerShadow: false });
  });

  it('reports what resolving would repair', () => {
    expect(validateStyleOptions(style, { stickerWidth: 8, stickerShadow: false, paperAngle: 180 })).toEqual(
      [],
    );
    const issues = validateStyleOptions(style, { stickerWidth: 50, paperOffset: 2.5, stickerShadow: 1 });
    expect(issues.map((i) => i.key).sort()).toEqual(['paperOffset', 'stickerShadow', 'stickerWidth']);
  });

  it('lists the variants the series understands', () => {
    expect(style.variants).toEqual([
      'solid',
      'outline',
      'glass',
      'sticker',
      'paper',
      'soft',
      'riso',
      'pencil',
      'marker',
      'crayon',
      'watercolor',
      'neon',
      'chalk',
      'origami',
      'relief',
      'gothic',
    ]);
    expect(style.defaultVariant).toBe('solid');
  });
});

describe('live and static agree on the sticker and paper variants', () => {
  const CASES = [
    ['blob', 'idle', 'sticker'],
    ['tofu', 'thinking', 'sticker'],
    ['star', 'powering-down', 'sticker'],
    ['blob', 'idle', 'paper'],
    ['clover', 'thinking', 'paper'],
    ['pebble', 'happy', 'paper'],
    ['blob', 'idle', 'soft'],
    ['tofu', 'thinking', 'soft'],
    ['blob', 'happy', 'riso'],
    ['star', 'powering-down', 'riso'],
  ] as const;

  function drawn(root: Element): string[] {
    const out: string[] = [];
    for (const el of Array.from(root.querySelectorAll('path'))) {
      const d = el.getAttribute('d');
      if (!d || el.getAttribute('opacity') === '0' || el.closest('defs, clipPath, mask')) continue;
      out.push(d);
    }
    return out.sort();
  }

  function statics(markup: string): string[] {
    return attrs(markup, 'path', 'd').sort();
  }

  it.each(CASES)('%s / %s / %s draw the same outlines', (shape, state, variant) => {
    const frame = stillFrame(shape, state, variant);
    const options = resolveStyleOptions(style);
    const host = document.createElement('div');
    const live = style.createRenderer(host, { seed: 'consistency', styleOptions: options });
    live.draw(frame);
    const markup = style.renderStatic(frame, { color: 'blue', uid: 'x', styleOptions: options });
    const fromStatic = statics(markup);
    const fromLive = drawn(live.element);
    expect(fromStatic.length).toBeGreaterThan(0);
    for (const d of fromStatic) expect(fromLive).toContain(d);
    // The border (or the shadow) repeats the body's outline, so it is drawn more than once.
    expect(new Set(fromStatic).size).toBeLessThan(fromStatic.length);
    live.destroy();
  });

  it.each(STICKER_AND_PAPER)('%s: the same parameters give the same attribute values', (variant) => {
    const frame = stillFrame('tofu', 'idle', variant);
    const options = resolveStyleOptions(style, {
      stickerWidth: 7,
      stickerShadow: variant === 'sticker',
      paperOffset: 6,
      paperAngle: 100,
    });
    const host = document.createElement('div');
    const live = style.createRenderer(host, { seed: 'consistency', styleOptions: options });
    live.draw(frame);
    const markup = style.renderStatic(frame, { color: 'blue', uid: 'x', styleOptions: options });
    const wanted = variant === 'sticker' ? 'stroke-width' : 'transform';
    const value = variant === 'sticker' ? '14' : 'translate(-1.04 5.91)';
    expect(attrs(markup, 'path', wanted).concat(attrs(markup, 'g', wanted))).toContain(value);
    const liveValues = Array.from(live.element.querySelectorAll(variant === 'sticker' ? 'path' : 'g')).map(
      (el) => el.getAttribute(wanted),
    );
    expect(liveValues).toContain(value);
    live.destroy();
  });
});

describe('switching variant on a running character', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  /**
   * Markup with the per-instance ids taken out and each tag's attributes sorted, so two characters can be
   * compared: an element reused from another variant may have gained its attributes in another order.
   */
  const bare = (el: Element): string =>
    el.outerHTML
      .replace(/aora-(clip|ink|shadow|soft|halftone|gloss|media)-[\w-]+/g, 'ID')
      .replace(/<([\w-]+)((?:\s+[\w:-]+="[^"]*")+)\s*>/g, (_m, tag: string, list: string) => {
        const sorted = (list.match(/[\w:-]+="[^"]*"/g) ?? []).sort();
        return `<${tag} ${sorted.join(' ')}>`;
      });

  function mount(options: Parameters<typeof createCharacter>[1]) {
    const host = document.createElement('span');
    document.body.appendChild(host);
    return createCharacter(host, { shape: 'tofu', state: 'happy', reducedMotion: true, ...options });
  }

  it('moves between plain and layered variants and back, leaving nothing behind', () => {
    const fresh = {
      solid: bare(mount({ variant: 'solid' }).element),
      outline: bare(mount({ variant: 'outline' }).element),
      sticker: bare(mount({ variant: 'sticker' }).element),
      paper: bare(mount({ variant: 'paper' }).element),
      soft: bare(mount({ variant: 'soft' }).element),
      riso: bare(mount({ variant: 'riso' }).element),
      pencil: bare(mount({ variant: 'pencil' }).element),
      neon: bare(mount({ variant: 'neon' }).element),
      watercolor: bare(mount({ variant: 'watercolor' }).element),
    };
    expect(new Set(Object.values(fresh)).size).toBe(9);

    const c = mount({ variant: 'solid' });
    for (const next of [
      'sticker',
      'paper',
      'outline',
      'pencil',
      'sticker',
      'solid',
      'neon',
      'paper',
      'soft',
      'watercolor',
      'riso',
      'chalk',
      'glass',
      'pencil',
      'solid',
    ] as const) {
      c.update({ variant: next });
      if (next in fresh) expect(bare(c.element)).toBe(fresh[next as keyof typeof fresh]);
    }
    c.destroy();
  });

  it('applies new style options to the variant already showing', () => {
    const c = mount({ variant: 'sticker' });
    const edge = () => c.element.querySelector('g[filter] > path')!.getAttribute('stroke-width');
    expect(edge()).toBe('24');
    c.update({ styleOptions: { stickerWidth: 6 } });
    expect(edge()).toBe('12');
    c.update({ styleOptions: { stickerShadow: false } });
    expect(c.element.querySelector('filter')).toBeNull();
    expect(c.element.querySelector('g[filter]')).toBeNull();
    c.destroy();

    const p = mount({ variant: 'paper', styleOptions: { paperAngle: 0, paperOffset: 8 } });
    expect(p.element.innerHTML).toContain('translate(8 0)');
    // styleOptions is resolved afresh on every update, not merged into the last one.
    p.update({ styleOptions: { paperAngle: 90, paperOffset: 8 } });
    expect(p.element.innerHTML).toContain('translate(0 8)');
    p.destroy();
  });

  it('keeps the node count steady while animating a sticker', () => {
    const host = document.createElement('span');
    document.body.appendChild(host);
    const c = createCharacter(host, {
      shape: 'blob',
      state: 'bouncing',
      variant: 'sticker',
      reducedMotion: false,
    });
    vi.advanceTimersByTime(200);
    const count = c.element.querySelectorAll('*').length;
    vi.advanceTimersByTime(800);
    expect(c.element.querySelectorAll('*').length).toBe(count);
    c.destroy();
  });
});

describe('solid, outline and glass, as restyled with the cute face', () => {
  it.each(['solid', 'outline', 'glass'] as const)('%s static output is pinned', (variant) => {
    const render = (options: Parameters<typeof renderStaticSvg>[0]) => compact(renderStaticSvg(options));
    expect(render({ shape: 'blob', state: 'happy', variant, color: 'blue' })).toMatchSnapshot();
    expect(render({ shape: 'cloud', state: 'thinking', variant, color: 'green' })).toMatchSnapshot();
    expect(render({ shape: 'star', variant, face: 'line', state: 'happy', flat: true })).toMatchSnapshot();
  });

  it.each(['solid', 'outline', 'glass'] as const)('%s uses none of the layered constructs', (variant) => {
    const svg = renderStaticSvg({ shape: 'blob', state: 'thinking', variant });
    expect(svg).not.toContain('filter');
    expect(svg).not.toContain('--aora-paper');
    expect(svg).not.toContain('fill="#000"');
  });
});

describe('soft', () => {
  it('shades the body with a radial gradient over a flat ink, and adds a gloss only when asked', () => {
    const svg = staticSvg('soft');
    expect(svg).toContain('<radialGradient');
    expect(attrs(svg, 'path', 'fill').some((f) => f.startsWith('url(#') && f.includes('-soft'))).toBe(true);
    expect(svg).not.toContain('-gloss');
    expect(staticSvg('soft', { styleOptions: { softGloss: true } })).toContain('-gloss');
  });

  it('stands on a shadow on the ground, and drops the shadow and the gloss with their parameters', () => {
    expect(staticSvg('soft')).toContain('<ellipse');
    const bare = staticSvg('soft', { styleOptions: { softShadow: false, softGloss: false } });
    expect(bare).not.toContain('<ellipse');
    expect(bare).not.toContain('-gloss');
  });

  it('keeps its ground shadow still while the body hops', () => {
    const rest = stillFrame('blob', 'idle', 'soft');
    const hop = stillFrame('blob', 'excited', 'soft');
    const shadowOf = (frame: FrameSnapshot) =>
      attrs(
        style.renderStatic(frame, { color: 'blue', uid: 'x', styleOptions: resolveStyleOptions(style) }),
        'ellipse',
        'cy',
      );
    expect(shadowOf(hop)).toEqual(shadowOf(rest));
  });

  it('wears a dark face on a black body, light on every hue', () => {
    expect(staticSvg('soft', { color: 'black' })).toMatch(/-soft: #2B2420/);
    expect(staticSvg('soft', { color: 'blue' })).not.toMatch(/-soft: #2B2420/);
  });
});

describe('riso', () => {
  it('prints a second ink beside the first, multiplied over it', () => {
    const svg = staticSvg('riso');
    expect(svg).toContain('mix-blend-mode:multiply');
    expect(svg).toContain('isolation:isolate');
    expect(svg).toContain('#FF78A6');
  });

  it('swaps the second ink on pink, where it would disappear into its own body', () => {
    const svg = staticSvg('riso', { color: 'pink' });
    expect(svg).toContain('--aora-ink2:#F5B428');
  });

  it('screens the print with halftone dots unless told not to', () => {
    expect(staticSvg('riso')).toContain('<pattern');
    expect(staticSvg('riso', { styleOptions: { risoHalftone: false } })).not.toContain('<pattern');
  });

  it('shifts the second ink by the misregistration', () => {
    const none = staticSvg('riso', { styleOptions: { risoOffset: 0 } });
    const wide = staticSvg('riso', { styleOptions: { risoOffset: 20 } });
    expect(none).not.toBe(wide);
  });
});

describe('the mood effects keep their colours on every variant', () => {
  const EFFECTS = [
    ['happy', '#FF6F91'],
    ['celebrate', '#F5B428'],
    ['refusing', '#EB4B4F'],
    ['sad', '#7CC7FF'],
  ] as const;

  it.each(
    LAYERED_VARIANTS.flatMap((variant) => EFFECTS.map(([state, hex]) => [variant, state, hex] as const)),
  )('%s / %s draws in %s', (variant, state, hex) => {
    expect(staticSvg(variant, { state }).toUpperCase()).toContain(hex);
  });
});

/*
 * The drawing media: the same snapshot drawn by hand. They are checked for
 * what makes them safe to put anywhere — no background, no noise filter, defs
 * that never collide — and for reading on every face, colour and theme.
 */
const MEDIA_SHAPES = ['blob', 'cat', 'sprout'] as const;

describe.each(MEDIA)('%s: static snapshots', (variant) => {
  const cases = MEDIA_SHAPES.flatMap((shape) => STATES.map((state) => [shape, state] as const));

  it.each(cases)('%s / %s', (shape, state) => {
    expect(compact(renderStaticSvg({ shape, state, variant, color: 'violet' }))).toMatchSnapshot();
  });
});

describe('drawing media', () => {
  const ids = (svg: string) => attrs(svg, '\\w+', 'id');
  const outsideDefs = (svg: string) => svg.replace(/<defs>[\s\S]*?<\/defs>/g, '');

  it('is deterministic, and keeps its defs apart from another medium of the same character inlined beside it', () => {
    for (const variant of MEDIA) {
      expect(staticSvg(variant, { state: 'happy' })).toBe(staticSvg(variant, { state: 'happy' }));
    }
    const all = MEDIA.map((variant) => ids(staticSvg(variant, { state: 'happy' })));
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(
          all[i]!.filter((id) => all[j]!.includes(id)),
          `${MEDIA[i]} / ${MEDIA[j]}`,
        ).toEqual([]);
      }
    }
    // Different settings of one medium inlined together keep apart too.
    const fine = ids(staticSvg('crayon', { styleOptions: { grain: 0.5 } }));
    expect(ids(staticSvg('crayon')).filter((id) => fine.includes(id) && id.includes('grain'))).toEqual([]);
  });

  it.each(MEDIA)('%s paints no background and runs no noise filter', (variant) => {
    const svg = staticSvg(variant, { state: 'thinking' });
    expect(outsideDefs(svg)).not.toContain('<rect');
    expect(svg).not.toContain('feTurbulence');
    expect(svg).not.toContain('feImage');
  });

  it('grains crayon and watercolour fills through a pattern, and drops it with the grain', () => {
    for (const variant of ['crayon', 'watercolor'] as const) {
      const svg = staticSvg(variant);
      expect(svg).toContain('<pattern');
      expect(svg).toContain('data:image/png;base64,');
      expect(attrs(svg, 'path', 'fill').some((f) => f.startsWith('url(#'))).toBe(true);
      const clean = staticSvg(variant, { styleOptions: { grain: 0 } });
      expect(clean).not.toContain('<pattern');
      expect(clean).not.toContain('data:image');
    }
  });

  it('grains pencil and chalk through one mask on the body, face included, and drops it with the grain', () => {
    for (const variant of ['pencil', 'chalk'] as const) {
      const svg = staticSvg(variant, { state: 'happy' });
      const mask = attrs(svg, 'g', 'mask');
      expect(mask.length).toBeGreaterThan(0);
      // The face sits inside the masked group, whatever face style draws it.
      const masked = svg.slice(svg.indexOf(`mask="${mask[0]}"`));
      expect(masked).toContain('data-aora-face');
      expect(staticSvg(variant, { styleOptions: { grain: 0 } })).not.toContain('<mask');
    }
  });

  it('glows neon through a blur, and leaves the bare tube at neonGlow 0', () => {
    const svg = staticSvg('neon');
    expect(svg).toContain('feGaussianBlur');
    expect(attrs(svg, 'g', 'filter').length).toBeGreaterThan(0);
    expect(staticSvg('neon', { styleOptions: { neonGlow: 0 } })).not.toContain('<filter');
  });

  it('outlines the marker face with the dark marker', () => {
    const svg = staticSvg('marker', { state: 'happy' });
    expect(svg).toContain('feMorphology');
    const rim = attrs(svg, 'g', 'filter')[0]!;
    expect(svg.slice(svg.indexOf(`filter="${rim}"`))).toContain('data-aora-face');
  });

  it('takes the wobble, the hatching and the line width from its parameters', () => {
    expect(staticSvg('pencil', { styleOptions: { wobble: 0 } })).not.toBe(staticSvg('pencil'));
    expect(staticSvg('marker', { styleOptions: { wobble: 8 } })).not.toBe(staticSvg('marker'));
    const paths = (svg: string) => attrs(svg, 'path', 'd').length;
    for (const variant of ['pencil', 'chalk'] as const) {
      expect(paths(staticSvg(variant, { styleOptions: { hatching: false } }))).toBeLessThan(
        paths(staticSvg(variant)),
      );
    }
    const thin = attrs(staticSvg('chalk', { styleOptions: { strokeWidth: 4 } }), 'path', 'stroke-width');
    const thick = attrs(staticSvg('chalk', { styleOptions: { strokeWidth: 20 } }), 'path', 'stroke-width');
    expect(Math.max(...thick.map(Number))).toBeGreaterThan(Math.max(...thin.map(Number)));
  });

  it.each(MEDIA.flatMap((variant) => FACE_STYLES.map((face) => [variant, face] as const)))(
    '%s draws the %s face',
    (variant, face) => {
      // Not a busy state: there the eyes and line faces give the body to a belt and fade.
      for (const state of ['happy', 'sad'] as const) {
        expect(renderStaticSvg({ shape: 'cat', variant, face, state, color: 'orange' })).toContain(
          'data-aora-face',
        );
      }
    },
  );

  it.each(MEDIA)('%s follows the page on every palette colour', (variant) => {
    for (const color of COLOR_IDS) {
      const svg = renderStaticSvg({ shape: 'blob', variant, color, state: 'happy' });
      expect(svg).toContain('@media (prefers-color-scheme: dark)');
      // A face drawn as a line takes the ink shifted towards the page's contrast, which flips with the page.
      if (['pencil', 'neon', 'chalk'].includes(variant)) expect(svg).toMatch(/-shift: #fff/);
    }
    // A painted dark face turns white on a black body, which is dark on a light page.
    if (variant === 'crayon' || variant === 'watercolor') {
      expect(renderStaticSvg({ shape: 'blob', variant, color: 'black' })).toMatch(/-soft: #FFFFFF/);
    }
  });

  it('draws pencil effects in graphite, and every other medium in the effects own colours', () => {
    expect(staticSvg('pencil', { state: 'happy' }).toUpperCase()).not.toContain('#FF6F91');
    for (const variant of ['marker', 'crayon', 'watercolor', 'neon', 'chalk'] as const) {
      for (const [state, hex] of [
        ['happy', '#FF6F91'],
        ['celebrate', '#F5B428'],
        ['sad', '#7CC7FF'],
      ] as const) {
        expect(staticSvg(variant, { state }).toUpperCase(), `${variant} / ${state}`).toContain(hex);
      }
    }
  });

  it.each([
    ['blob', 'happy', 'pencil'],
    ['cat', 'thinking', 'chalk'],
    ['sprout', 'happy', 'crayon'],
    ['tofu', 'powering-down', 'watercolor'],
    ['bunny', 'happy', 'marker'],
    ['star', 'thinking', 'neon'],
  ] as const)('%s / %s / %s: live draws the outlines static does', (shape, state, variant) => {
    const frame = stillFrame(shape, state, variant);
    const options = resolveStyleOptions(style);
    const host = document.createElement('div');
    const live = style.createRenderer(host, { seed: 'media', styleOptions: options });
    live.draw(frame);
    const markup = style.renderStatic(frame, { color: 'blue', uid: 'x', styleOptions: options });
    const fromLive = Array.from(live.element.querySelectorAll('path'))
      .filter((el) => !el.closest('defs') && el.getAttribute('opacity') !== '0')
      .map((el) => el.getAttribute('d'));
    const fromStatic = attrs(markup, 'path', 'd');
    expect(fromStatic.length).toBeGreaterThan(0);
    for (const d of fromStatic) expect(fromLive).toContain(d);
    live.destroy();
  });

  it('leaves its fine detail out of a small character and keeps its lines a pixel wide', () => {
    const at = (variant: string, sizePx?: number) =>
      renderStaticSvg({ shape: 'blob', color: 'blue', state: 'happy', variant, sizePx });
    const widest = (svg: string) => Math.max(...attrs(outsideDefs(svg), 'path', 'stroke-width').map(Number));
    for (const variant of ['pencil', 'chalk'] as const) {
      // The face sits inside the masked group at a size where the grain shows, and is clean at 24 px.
      expect(at(variant, 240)).toContain('<mask');
      expect(at(variant)).toContain('<mask');
      expect(at(variant, 24)).not.toContain('<mask');
      expect(attrs(at(variant, 24), 'path', 'd').length).toBeLessThan(
        attrs(at(variant, 240), 'path', 'd').length,
      );
    }
    for (const variant of ['crayon', 'watercolor'] as const)
      expect(at(variant, 24)).not.toContain('<pattern');
    // In between, the grain fades rather than switching off.
    expect(ids(at('crayon', 60)).some((id) => id.endsWith('-grain5'))).toBe(true);
    // A medium's line covers about a pixel, as outline's does at 24 px; a large one keeps its own width.
    for (const variant of ['pencil', 'chalk', 'neon', 'marker'] as const) {
      expect(widest(at(variant, 24))).toBeGreaterThan(widest(at(variant, 240)));
      expect(widest(at(variant, 240))).toBe(widest(at(variant)));
    }
    expect(mediumSize(resolveStyleOptions(style) as never, 0, 1).minLine).toBe(0);
  });

  it('keeps the node count steady while animating', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    for (const variant of ['pencil', 'neon', 'crayon'] as const) {
      const host = document.createElement('span');
      document.body.appendChild(host);
      const c = createCharacter(host, { shape: 'cat', state: 'bouncing', variant, reducedMotion: false });
      vi.advanceTimersByTime(200);
      const count = c.element.querySelectorAll('*').length;
      vi.advanceTimersByTime(800);
      expect(c.element.querySelectorAll('*').length, variant).toBe(count);
      c.destroy();
    }
    vi.useRealTimers();
    document.body.replaceChildren();
  });
});
