import { CAST, STYLE_IDS, castMember, renderStaticSvg } from '@aora-bot/engine/static';
import { describe, expect, it } from 'vitest';
import { avatarFromUrl } from './_avatar.js';

const at = (query: string) => avatarFromUrl(new URL(`http://x/api/avatar?${query}`));

function svgFor(query: string): string {
  const result = at(query);
  if (!result.ok) throw new Error(result.message);
  return result.svg;
}

function rootTag(svg: string): string {
  return /^<svg[^>]*>/.exec(svg)![0];
}

describe('avatarFromUrl', () => {
  it('renders the named member for a cast id', () => {
    const luna = castMember('luna')!;
    expect(svgFor('id=luna')).toBe(renderStaticSvg({ shape: luna.shape, color: luna.color, sizePx: 128 }));
  });

  it('reads the id from the public path as well as from the rewrite query', () => {
    const viaPath = avatarFromUrl(new URL('http://x/avatar/caf%C3%A9.svg'));
    expect(viaPath).toEqual(at(`id=${encodeURIComponent('café')}`));
    expect(viaPath.ok).toBe(true);
  });

  it('accepts the id with or without the .svg suffix', () => {
    expect(svgFor('id=alice.svg')).toBe(svgFor('id=alice'));
  });

  it('is deterministic for an arbitrary id', () => {
    expect(svgFor('id=alice')).toBe(svgFor('id=alice'));
  });

  it('picks a cast member for an arbitrary id and spreads ids across the cast', () => {
    const members = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const svg = svgFor(`id=user-${i}`);
      const member = CAST.find(
        (m) => svg === renderStaticSvg({ shape: m.shape, color: m.color, sizePx: 128 }),
      );
      expect(member, `user-${i}`).toBeDefined();
      members.add(member!.id);
    }
    expect(members.size).toBeGreaterThan(CAST.length * 0.8);
  });

  it('gives different ids different characters', () => {
    const outputs = new Set(
      ['alice', 'bob', 'carol', 'dave', 'erin', 'frank'].map((id) => svgFor(`id=${id}`)),
    );
    expect(outputs.size).toBeGreaterThan(1);
  });

  it('clamps size to 16..1024 and defaults to 128', () => {
    const size = (query: string) => /width="(\d+)" height="(\d+)"/.exec(rootTag(svgFor(query)))!.slice(1);
    expect(size('id=a')).toEqual(['128', '128']);
    expect(size('id=a&size=300')).toEqual(['300', '300']);
    expect(size('id=a&size=1')).toEqual(['16', '16']);
    expect(size('id=a&size=-40')).toEqual(['16', '16']);
    expect(size('id=a&size=99999')).toEqual(['1024', '1024']);
  });

  it.each(STYLE_IDS)('renders the %s style', (style) => {
    const svg = svgFor(`id=a&style=${style}`);
    expect(svg).not.toBe(svgFor('id=a&style=vector&variant=outline'));
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
  });

  it('applies variant and state', () => {
    expect(svgFor('id=a&variant=outline')).not.toBe(svgFor('id=a'));
    expect(svgFor('id=a&state=sad')).not.toBe(svgFor('id=a'));
  });

  it('lets shape, color and face override the cast member', () => {
    const luna = castMember('luna')!;
    const shaped = svgFor('id=luna&shape=blob&color=pink&face=eyes');
    expect(shaped).toBe(renderStaticSvg({ shape: 'blob', color: 'pink', face: 'eyes', sizePx: 128 }));
    expect(shaped).not.toBe(svgFor('id=luna'));
    expect(svgFor('id=luna&color=pink')).toBe(
      renderStaticSvg({ shape: luna.shape, color: 'pink', sizePx: 128 }),
    );
    expect(svgFor('id=luna&face=line')).toBe(
      renderStaticSvg({ shape: luna.shape, color: luna.color, face: 'line', sizePx: 128 }),
    );
  });

  it('derives the nose from the overridden shape and colour', () => {
    const derived = svgFor('id=luna&shape=blob&color=pink&face=line');
    expect(derived).toBe(renderStaticSvg({ shape: 'blob', color: 'pink', face: 'line', sizePx: 128 }));
    expect(derived).not.toBe(
      renderStaticSvg({ shape: 'blob', color: 'pink', face: 'line', nose: null, sizePx: 128 }),
    );
  });

  it('reads style parameters by their declared type', () => {
    const luna = castMember('luna')!;
    const pixel = (query: string) => svgFor(`id=luna&style=pixel&${query}`);
    expect(pixel('grid=16')).toBe(
      renderStaticSvg({
        shape: luna.shape,
        color: luna.color,
        style: 'pixel',
        styleOptions: { grid: 16 },
        sizePx: 128,
      }),
    );
    expect(pixel('grid=16')).not.toBe(pixel(''));
    expect(pixel('outline=false')).not.toBe(pixel(''));
    expect(pixel('outline=0')).toBe(pixel('outline=false'));
    expect(pixel('outline=1')).toBe(pixel('outline=true'));
    expect(svgFor('id=a&variant=paper&paperOffset=12')).not.toBe(svgFor('id=a&variant=paper'));
    expect(svgFor('id=a&style=kaomoji&weight=700')).not.toBe(svgFor('id=a&style=kaomoji'));
  });

  it.each([
    'shape=nope',
    'shape=',
    'color=nope',
    'face=nope',
    'style=pixel&grid=abc',
    'style=pixel&grid=',
    'style=pixel&grid=999',
    'style=pixel&outline=maybe',
    'paperOffset=999',
    'strokeWidth=NaN',
    'style=kaomoji&tail=2',
  ])('rejects %s', (query) => {
    const result = at(`id=a&${query}`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
  });

  it('names the parameter that failed', () => {
    const result = at('id=a&style=pixel&grid=999');
    expect(result).toEqual({ ok: false, message: expect.stringContaining('grid: ') });
  });

  it.each([
    'style=nope',
    'style=',
    'variant=nope',
    'style=pixel&variant=outline',
    'state=nope',
    'size=abc',
    'size=12.5',
    'size=',
  ])('rejects %s', (query) => {
    const result = at(`id=a&${query}`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
  });

  it('rejects a missing, empty or over-long id', () => {
    expect(at('').ok).toBe(false);
    expect(at('id=').ok).toBe(false);
    expect(at('id=.svg').ok).toBe(false);
    expect(at(`id=${'a'.repeat(129)}`).ok).toBe(false);
    expect(at(`id=${'a'.repeat(128)}`).ok).toBe(true);
    expect(avatarFromUrl(new URL('http://x/avatar/%E0%A4%A.svg')).ok).toBe(false);
  });

  it('ignores parameters it does not know', () => {
    expect(svgFor('id=a&v=2')).toBe(svgFor('id=a'));
    expect(svgFor('id=a&style=kaomoji&grid=16')).toBe(svgFor('id=a&style=kaomoji'));
  });

  it('is a standalone SVG: namespace present, no script, no external references', () => {
    for (const style of STYLE_IDS) {
      const svg = svgFor(`id=<script>alert(1)</script>&style=${style}`);
      expect(rootTag(svg)).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).not.toContain('<script');
      expect(svg).not.toMatch(/href=|@import|url\(\s*["']?https?:/);
      expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    }
  });
});
