// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STYLE_ID,
  STYLE_IDS,
  defineStyle,
  getStyle,
  hasStyle,
  listStyles,
  paramsForVariant,
  resolveStyleOptions,
  validateStyleOptions,
  vectorStyle,
} from '../src/styles/index.js';

describe('style registry', () => {
  it('ships the vector, pixel and kaomoji series, registered', () => {
    expect(STYLE_IDS).toEqual(['vector', 'pixel', 'kaomoji']);
    expect(hasStyle('vector')).toBe(true);
    expect(getStyle('vector')).toBe(vectorStyle);
    expect(listStyles().map((s) => s.id)).toContain('vector');
  });

  it('registers exactly the built-in ids, in order, and the default is one of them', () => {
    expect(
      listStyles()
        .slice(0, STYLE_IDS.length)
        .map((s) => s.id),
    ).toEqual([...STYLE_IDS]);
    expect(STYLE_IDS).toContain(DEFAULT_STYLE_ID);
  });

  it('refuses an unknown id and names the ones that exist', () => {
    expect(() => getStyle('nope')).toThrow(/Unknown style "nope".*vector/);
  });

  it('registers a new series and replaces one with the same id', () => {
    const base = {
      label: 'Test',
      variants: ['a', 'b'],
      defaultVariant: 'a',
      defaults: { cells: 8, smooth: false },
      params: {
        cells: { type: 'number', min: 4, max: 16, step: 4 },
        smooth: { type: 'boolean' },
      },
      createRenderer: vectorStyle.createRenderer,
      renderStatic: vectorStyle.renderStatic,
    } as const;
    const first = defineStyle({ id: 'test-grid', ...base });
    expect(getStyle('test-grid')).toBe(first);
    const second = defineStyle({ id: 'test-grid', ...base, label: 'Replaced' });
    expect(getStyle('test-grid')).toBe(second);
    expect(listStyles().filter((s) => s.id === 'test-grid')).toHaveLength(1);
  });

  it('rejects a definition whose defaults or default variant do not line up', () => {
    const base = {
      label: 'Bad',
      variants: ['a'],
      defaultVariant: 'a',
      createRenderer: vectorStyle.createRenderer,
      renderStatic: vectorStyle.renderStatic,
    };
    expect(() => defineStyle({ ...base, id: 'bad-1', defaults: { x: 1 }, params: {} as never })).toThrow(
      /"x"/,
    );
    expect(() =>
      defineStyle({ ...base, id: 'bad-2', defaultVariant: 'z', defaults: {}, params: {} }),
    ).toThrow(/"z"/);
    expect(hasStyle('bad-1')).toBe(false);
    expect(hasStyle('bad-2')).toBe(false);
  });
});

describe('style options', () => {
  const style = getStyle('vector');

  it('fills defaults when nothing is given', () => {
    expect(resolveStyleOptions(style)).toMatchObject({ strokeWidth: 10 });
    expect(resolveStyleOptions(style, null)).toMatchObject({ strokeWidth: 10 });
    expect(resolveStyleOptions(style, {})).toMatchObject({ strokeWidth: 10 });
  });

  it('clamps to range and snaps to the step', () => {
    expect(resolveStyleOptions(style, { strokeWidth: 100 })).toMatchObject({ strokeWidth: 28 });
    expect(resolveStyleOptions(style, { strokeWidth: -3 })).toMatchObject({ strokeWidth: 4 });
    expect(resolveStyleOptions(style, { strokeWidth: 9.4 })).toMatchObject({ strokeWidth: 9 });
  });

  it('falls back on wrong types and drops unknown keys', () => {
    expect(resolveStyleOptions(style, { strokeWidth: 'wide', extra: 1 })).toMatchObject({ strokeWidth: 10 });
    expect(resolveStyleOptions(style, { strokeWidth: Number.NaN })).toMatchObject({ strokeWidth: 10 });
  });

  it('reports what resolving would silently repair', () => {
    expect(validateStyleOptions(style, { strokeWidth: 10 })).toEqual([]);
    expect(validateStyleOptions(style, undefined)).toEqual([]);
    const issues = validateStyleOptions(style, { strokeWidth: 99, mystery: true });
    expect(issues.map((i) => i.key).sort()).toEqual(['mystery', 'strokeWidth']);
  });

  it('handles enum and boolean parameters', () => {
    const series = defineStyle({
      id: 'test-enum',
      label: 'Enum',
      variants: ['a'],
      defaultVariant: 'a',
      defaults: { mode: 'one', on: true },
      params: { mode: { type: 'enum', options: ['one', 'two'] }, on: { type: 'boolean' } },
      createRenderer: vectorStyle.createRenderer,
      renderStatic: vectorStyle.renderStatic,
    });
    expect(resolveStyleOptions(series, { mode: 'two', on: false })).toEqual({ mode: 'two', on: false });
    expect(resolveStyleOptions(series, { mode: 'three', on: 'yes' })).toEqual({ mode: 'one', on: true });
  });
});

describe('parameters by variant', () => {
  const keys = (style: string, variant: string) => Object.keys(paramsForVariant(getStyle(style), variant));

  it('lists only what a variant reads', () => {
    expect(keys('vector', 'solid')).toEqual([]);
    expect(keys('vector', 'outline')).toEqual(['strokeWidth']);
    expect(keys('vector', 'soft')).toEqual(['softShadow', 'softGloss']);
    expect(keys('vector', 'riso')).toEqual(['risoOffset', 'risoHalftone']);
    expect(keys('pixel', 'dot')).toEqual(['grid', 'gap', 'shades', 'fps', 'glow']);
  });

  it('treats a parameter with no variants as read by every variant', () => {
    for (const variant of getStyle('kaomoji').variants) {
      expect(keys('kaomoji', variant)).toEqual(['weight', 'tail']);
    }
  });

  it('gives every built-in parameter a home: each is read by at least one variant', () => {
    for (const style of listStyles().filter((s) => STYLE_IDS.includes(s.id as never))) {
      const used = new Set(style.variants.flatMap((variant) => keys(style.id, variant)));
      expect([...used].sort()).toEqual(Object.keys(style.params).sort());
    }
  });

  it('rejects a parameter that names a variant the series does not have', () => {
    expect(() =>
      defineStyle({
        id: 'bad-variant',
        label: 'Bad',
        variants: ['a'],
        defaultVariant: 'a',
        defaults: { x: 1 },
        params: { x: { type: 'number', min: 0, max: 2, step: 1, variants: ['zzz'] } },
        createRenderer: vectorStyle.createRenderer,
        renderStatic: vectorStyle.renderStatic,
      }),
    ).toThrow(/"zzz"/);
    expect(hasStyle('bad-variant')).toBe(false);
  });
});
