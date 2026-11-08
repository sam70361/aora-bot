import { describe, expect, it } from 'vitest';
import { renderStaticSvg, type StaticOptions } from '../src/render/static-svg.js';

const uidOf = (svg: string): string =>
  /class="(a[0-9a-z]+)"/.exec(svg)?.[1] ?? /\.(a[0-9a-z]+)[ -]/.exec(svg)![1]!;

const SERIES: [string, StaticOptions][] = [
  ['vector solid', { shape: 'mochi', color: 'black' }],
  ['vector glass', { shape: 'mochi', color: 'blue', variant: 'glass' }],
  ['vector soft on black', { shape: 'mochi', color: 'black', variant: 'soft' }],
  ['pixel crisp', { shape: 'mochi', color: 'blue', style: 'pixel', variant: 'crisp' }],
  ['kaomoji', { shape: 'mochi', color: 'black', style: 'kaomoji' }],
];

describe('StaticOptions.colorScheme', () => {
  it.each(SERIES)('%s: the default is the OS media query, byte for byte', (_name, options) => {
    const system = renderStaticSvg(options);
    expect(renderStaticSvg({ ...options, colorScheme: 'system' })).toBe(system);
    expect(system).toContain('@media (prefers-color-scheme: dark)');
    expect(system).not.toContain('light-dark(');
  });

  it.each(SERIES)('%s: page resolves through light-dark() and has no media query', (_name, options) => {
    const page = renderStaticSvg({ ...options, colorScheme: 'page' });
    expect(page).toContain('light-dark(');
    expect(page).not.toContain('prefers-color-scheme');
  });

  it.each(SERIES)('%s: the two schemes never share class names', (_name, options) => {
    const system = renderStaticSvg(options);
    const page = renderStaticSvg({ ...options, colorScheme: 'page' });
    expect(uidOf(page)).not.toBe(uidOf(system));
  });

  it('puts both halves of the pair in the rule, light first', () => {
    const page = renderStaticSvg({ shape: 'mochi', color: 'blue', colorScheme: 'page' });
    expect(page).toMatch(/--a[0-9a-z]+-ink: light-dark\(#[0-9a-f]{6}, #[0-9a-f]{6}\);/i);
  });

  it('lights the LED panel in the dark page ink on either page: nothing to switch', () => {
    for (const colorScheme of ['system', 'page'] as const) {
      const svg = renderStaticSvg({
        shape: 'mochi',
        color: 'black',
        style: 'pixel',
        variant: 'dot',
        colorScheme,
      });
      expect(svg).toContain('color-scheme:dark');
      expect(svg).not.toContain('prefers-color-scheme');
      expect(svg).not.toContain('light-dark(');
    }
  });

  it('leaves a flat or caller-owned ink alone: nothing to switch', () => {
    for (const options of [{ flat: true }, { ink: { flat: 'currentColor' } }] satisfies StaticOptions[]) {
      expect(renderStaticSvg({ ...options, colorScheme: 'page' })).not.toContain('light-dark(');
    }
  });
});
