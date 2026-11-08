import { describe, expect, it } from 'vitest';
import { COLOR_IDS, CORE_COLOR_IDS, type ColorId } from '../src/core/types.js';
import {
  COLOR_SWATCHES,
  getInkColor,
  getInkColorCss,
  getInkGradient,
  getInkGradientFor,
  getSwatch,
  getSwatchHex,
  haloBackground,
  INK_GRADIENT_ANGLE,
} from '../src/core/palette.js';

/*
 * The palette is a table, so the risk is not arithmetic but coverage: a hue
 * added to `COLOR_IDS` without a swatch silently resolves to black, and a
 * character whose ink does not change with the page's scheme is the bug the
 * whole `light-dark()` design exists to prevent. These tests are about those
 * two properties rather than about any particular hex value.
 */

const HEX = /^#[0-9A-Fa-f]{6}$/;

describe('COLOR_SWATCHES', () => {
  it('covers every colour the engine offers, exactly once', () => {
    expect(COLOR_SWATCHES.map((s) => s.id)).toEqual([...CORE_COLOR_IDS]);
  });

  it('gives each hue a chip colour and both ink values', () => {
    for (const swatch of COLOR_SWATCHES) {
      expect(swatch.value, swatch.id).toMatch(HEX);
      expect(swatch.ink.light, swatch.id).toMatch(HEX);
      expect(swatch.ink.dark, swatch.id).toMatch(HEX);
      // The point of two values is that they differ; one would mean the
      // character does not respond to the page's scheme at all.
      expect(swatch.ink.light, swatch.id).not.toBe(swatch.ink.dark);
    }
  });
});

describe('getSwatchHex', () => {
  it('answers for every id', () => {
    for (const id of COLOR_IDS) expect(getSwatchHex(id), id).toMatch(HEX);
  });

  it('falls back to the neutral rather than throwing on an unknown id', () => {
    // Ids arrive off the wire, so an unrecognised one has to draw something.
    expect(getSwatchHex('chartreuse' as ColorId)).toBe(getSwatchHex('black'));
    expect(getSwatch('chartreuse' as ColorId).id).toBe('black');
  });
});

describe('getInkColor', () => {
  it('defaults to the light scheme and switches on request', () => {
    expect(getInkColor('blue')).toBe(getInkColor('blue', 'light'));
    expect(getInkColor('blue', 'dark')).not.toBe(getInkColor('blue', 'light'));
  });

  it('inverts the neutral, so black is the highest-contrast ink either way', () => {
    expect(getInkColor('black', 'light').toUpperCase()).toContain('1F1F1F');
    expect(getInkColor('black', 'dark').toUpperCase()).toBe('#FFFFFF');
  });
});

describe('getInkColorCss', () => {
  it('pairs both inks into one value the browser re-resolves itself', () => {
    expect(getInkColorCss('green')).toBe(
      `light-dark(${getInkColor('green', 'light')}, ${getInkColor('green', 'dark')})`,
    );
  });
});

describe('getInkGradientFor', () => {
  it('resolves to the stops of one scheme, for contexts with no CSS colour functions', () => {
    const light = getInkGradientFor('violet', 'light');
    const dark = getInkGradientFor('violet', 'dark');

    expect(light.from).toMatch(HEX);
    expect(light.to).toMatch(HEX);
    expect(light).not.toEqual(dark);
    // A gradient needs two different stops or it is a flat fill.
    expect(light.from).not.toBe(light.to);
  });

  it('agrees with the `light-dark()` form on both halves', () => {
    for (const id of COLOR_IDS) {
      const { from, to, angle } = getInkGradient(id);
      const light = getInkGradientFor(id, 'light');
      const dark = getInkGradientFor(id, 'dark');
      expect(from, id).toBe(`light-dark(${light.from}, ${dark.from})`);
      expect(to, id).toBe(`light-dark(${light.to}, ${dark.to})`);
      expect(angle, id).toBe(INK_GRADIENT_ANGLE);
    }
  });
});

describe('haloBackground', () => {
  it('washes the hue over three layers, all of them fading out', () => {
    const halo = haloBackground('cyan');
    const hex = getSwatchHex('cyan');

    expect(halo.split('),').length).toBeGreaterThan(1);
    expect(halo.match(/radial-gradient/g)).toHaveLength(2);
    expect(halo).toContain('linear-gradient');
    // Mixed towards transparent rather than painted flat, or the halo would
    // be a disc behind the character instead of a glow.
    expect(halo).toContain(`color-mix(in oklab, ${hex}`);
    expect(halo).toContain('transparent');
  });
});
