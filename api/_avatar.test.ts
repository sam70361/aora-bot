import {
  CAST,
  STYLE_IDS,
  castMember,
  fnv1a32,
  getTheme,
  mulberry32,
  renderStaticSvg,
} from '@aora-bot/engine/static';
import { describe, expect, it } from 'vitest';
import { AVATAR_POOL, AVATAR_POOL_BASE, THEME_POOL_BASE, avatarFromUrl, poolIndex } from './_avatar.js';

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
    const bySvg = new Map(
      CAST.map((m) => [renderStaticSvg({ shape: m.shape, color: m.color, face: m.face, sizePx: 128 }), m.id]),
    );
    const members = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const member = bySvg.get(svgFor(`id=user-${i}`));
      expect(member, `user-${i}`).toBeDefined();
      members.add(member!);
    }
    expect(members.size).toBeGreaterThan(CAST.length * 0.8);
  });

  it('pools every cast member exactly once', () => {
    expect(new Set(AVATAR_POOL).size).toBe(AVATAR_POOL.length);
    expect([...AVATAR_POOL].sort()).toEqual(CAST.map((m) => m.id).sort());
  });

  it('keeps the base pool assignment of a single uniform draw', () => {
    for (let i = 0; i < 500; i++) {
      const id = `user-${i}`;
      expect(poolIndex(id, AVATAR_POOL_BASE)).toBe(Math.floor(mulberry32(fnv1a32(id))() * AVATAR_POOL_BASE));
    }
  });

  it('moves an id only onto members added as the pool grows', () => {
    let moved = 0;
    const total = 4000;
    for (let i = 0; i < total; i++) {
      const id = `user-${i}`;
      for (let size = AVATAR_POOL_BASE; size < AVATAR_POOL.length; size++) {
        const before = poolIndex(id, size);
        const after = poolIndex(id, size + 1);
        if (after !== before) expect(after).toBe(size);
      }
      if (poolIndex(id, AVATAR_POOL.length) !== poolIndex(id, AVATAR_POOL_BASE)) moved++;
    }
    const expected = (AVATAR_POOL.length - AVATAR_POOL_BASE) / AVATAR_POOL.length;
    expect(Math.abs(moved / total - expected)).toBeLessThan(0.03);
  });

  it('pins an id to a smaller pool with the pool parameter', () => {
    for (let i = 0; i < 50; i++) {
      const member = castMember(AVATAR_POOL[poolIndex(`user-${i}`, AVATAR_POOL_BASE)]!)!;
      expect(svgFor(`id=user-${i}&pool=${AVATAR_POOL_BASE}`)).toBe(
        renderStaticSvg({ shape: member.shape, color: member.color, sizePx: 128 }),
      );
    }
    expect(svgFor(`id=a&pool=${AVATAR_POOL.length}`)).toBe(svgFor('id=a'));
  });

  it('keeps theme characters out of the default pool', () => {
    for (const id of getTheme('halloween')!.cast) {
      if (!CAST.some((m) => m.id === id)) expect(AVATAR_POOL, id).not.toContain(id);
    }
  });

  it('picks from a theme cast with the same consistent hash', { timeout: 60000 }, () => {
    const { cast } = getTheme('halloween')!;
    expect(THEME_POOL_BASE.halloween).toBeLessThanOrEqual(cast.length);
    const picked = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const id = `user-${i}`;
      const member = castMember(cast[poolIndex(id, cast.length, THEME_POOL_BASE.halloween)]!)!;
      picked.add(member.id);
      expect(svgFor(`id=${id}&theme=halloween`)).toBe(
        renderStaticSvg({
          shape: member.shape,
          color: member.color,
          variant: 'doodle',
          state: 'happy',
          face: 'cute',
          sizePx: 128,
        }),
      );
    }
    expect(picked.size).toBeGreaterThan(cast.length * 0.8);
  });

  it('fills what a theme request leaves out from the theme, and lets every parameter override it', () => {
    const { cast } = getTheme('halloween')!;
    const member = castMember(cast[poolIndex('ana', cast.length, THEME_POOL_BASE.halloween)]!)!;
    expect(svgFor('id=ana&theme=halloween&variant=solid&state=angry&color=blue&face=glossy')).toBe(
      renderStaticSvg({
        shape: member.shape,
        color: 'blue',
        variant: 'solid',
        state: 'angry',
        face: 'glossy',
        sizePx: 128,
      }),
    );
    expect(svgFor('id=ana&theme=halloween&style=pixel')).toBe(
      renderStaticSvg({
        shape: member.shape,
        color: member.color,
        style: 'pixel',
        state: 'happy',
        sizePx: 128,
      }),
    );
    expect(svgFor('id=ana&theme=halloween&shape=mochi')).toBe(
      renderStaticSvg({
        shape: 'mochi',
        color: member.color,
        variant: 'doodle',
        state: 'happy',
        sizePx: 128,
      }),
    );
  });

  it('shows a borrowed member in the colour its theme gives it', () => {
    const lucky = castMember('lucky')!;
    expect(lucky.color).not.toBe('mint');
    expect(svgFor('id=lucky&theme=easter')).toBe(
      renderStaticSvg({
        shape: lucky.shape,
        color: 'mint',
        variant: 'pastel',
        state: 'happy',
        face: 'cute',
        sizePx: 128,
      }),
    );
  });

  it('accepts theme characters, skins and the unlisted colours by id with every other parameter', () => {
    expect(svgFor('id=floaty')).toBe(renderStaticSvg({ shape: 'spook', color: 'cream', sizePx: 128 }));
    expect(svgFor('id=a&color=night&variant=grainy')).toBe(
      renderStaticSvg({
        shape: castMember(AVATAR_POOL[poolIndex('a', AVATAR_POOL.length)]!)!.shape,
        color: 'night',
        variant: 'grainy',
        sizePx: 128,
      }),
    );
    expect(svgFor('id=a&shape=witchmochi&color=pink&variant=doodle&face=glossy&state=angry')).toBe(
      renderStaticSvg({
        shape: 'witchmochi',
        color: 'pink',
        variant: 'doodle',
        face: 'glossy',
        state: 'angry',
        sizePx: 128,
      }),
    );
    expect(at('id=a&variant=grainy').ok).toBe(true);
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
    'pool=abc',
    'pool=',
    'pool=10',
    'pool=9999',
    'theme=nope',
    'theme=',
    'theme=halloween&pool=46',
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
