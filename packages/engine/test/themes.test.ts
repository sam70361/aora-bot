// @vitest-environment happy-dom
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { CAST, allCast, castMember, type CastId } from '../src/core/cast.js';
import { getInkVars, getSwatchCss } from '../src/core/palette.js';
import {
  ALL_COLOR_IDS,
  COLOR_IDS,
  CORE_COLOR_IDS,
  SHAPE_IDS,
  UNLISTED_COLOR_IDS,
  type ColorId,
  type ShapeId,
} from '../src/core/types.js';
import { MOOD_LEAN, STATE_MOODS, moodOf, type StateMood } from '../src/motion/mood.js';
import { CHARACTER_STATES, type CharacterState } from '../src/motion/states.js';
import { createCharacter } from '../src/render/character.js';
import { partColorPair, rimHex } from '../src/render/part-color.js';
import { renderStaticSvg } from '../src/render/static-svg.js';
import { defineShapeWithProps, getShape } from '../src/shapes/registry.js';
import { acceptsVariant, allVariants, getStyle, listStyles, paramsForVariant } from '../src/styles/index.js';
import {
  THEME_MANIFEST,
  THEME_MEMBER_KINDS,
  ThemeNotInstalledError,
  defineTheme,
  getTheme,
  installTheme,
  isThemeInstalled,
  loadTheme,
  themeChoices,
  themeDefault,
  themeLabel,
  themeLook,
  themesNeeded,
} from '../src/themes/index.js';
import { oklch } from '../src/themes/extras/colour.js';
import { HALLOWEEN } from '../src/themes/halloween/index.js';

/*
 * A theme lives in its own entry and reaches the engine by `installTheme` or
 * `loadTheme`. Before that, its ids are known but do not draw, and say so;
 * after it, they draw everywhere, and nothing only a theme names is in a
 * default list.
 */

const own = HALLOWEEN.cast.map((member) => member.id);

describe('before the theme is installed', () => {
  it('knows its ids and says which theme they need', () => {
    expect(isThemeInstalled('halloween')).toBe(false);
    expect(themesNeeded({ shape: 'spook' })).toEqual(['halloween']);
    expect(themesNeeded({ preset: 'floaty', variant: 'grainy', style: 'vector' })).toEqual(['halloween']);
    expect(themesNeeded({ shape: 'mochi', variant: 'solid', color: 'night' })).toEqual([]);
  });

  it('fails clearly in every synchronous call that names one', () => {
    expect(() => getShape('spook')).toThrow(ThemeNotInstalledError);
    expect(() => castMember('floaty')).toThrow(ThemeNotInstalledError);
    expect(() => renderStaticSvg({ shape: 'pumpkin' })).toThrow(/loadTheme\('halloween'\)/);
    expect(() => renderStaticSvg({ variant: 'doodle' })).toThrow(ThemeNotInstalledError);
    expect(() => createCharacter(document.createElement('div'), { variant: 'grainy' })).toThrow(
      ThemeNotInstalledError,
    );
    expect(castMember('nobody')).toBeNull();
    expect(() => getShape('nobody' as ShapeId)).toThrow(/Unknown shape/);
    expect(() => themeLook('halloween', 'mochi')).toThrow(ThemeNotInstalledError);
    expect(() => themeLook('nope', 'mochi')).toThrow(/Unknown theme/);
  });

  it('leaves the core free of the theme', () => {
    expect(allVariants(getStyle('vector'))).not.toContain('doodle');
    expect(allCast().some((member) => member.id === 'floaty')).toBe(false);
  });
});

describe('installing', () => {
  it('refuses an entry that lacks a swatch for a colour the manifest gives its theme', () => {
    const owner = THEME_MANIFEST.find((entry) => entry.colors.length > 0)!;
    expect(() =>
      installTheme({ ...HALLOWEEN, definition: { ...HALLOWEEN.definition, id: owner.id }, colors: [] }),
    ).toThrow(new RegExp(`colour "${owner.colors[0]}"`));
    expect(isThemeInstalled(owner.id)).toBe(false);
  });
});

describe('loading', () => {
  it('loads through the manifest, once, and installs idempotently', async () => {
    const [a, b] = await Promise.all([loadTheme('halloween'), loadTheme('halloween')]);
    expect(a).toBe(b);
    expect(isThemeInstalled('halloween')).toBe(true);
    expect(installTheme(HALLOWEEN)).toBe(a);
    expect(getTheme('halloween')).toBe(a);
    await expect(loadTheme('nope')).rejects.toThrow(/Unknown theme/);
  });
});

describe('the Halloween theme', () => {
  const halloween = HALLOWEEN.definition;

  it('names a cast the engine has, its own members and borrowed listed ones', () => {
    for (const id of halloween.cast) expect(castMember(id), id).not.toBeNull();
    expect(halloween.cast.filter((id) => CAST.some((m) => m.id === id))).toEqual(['jelly', 'flap', 'luna']);
    expect(halloween.cast.slice(0, 23)).toEqual(own);
  });

  it('offers every dimension as a list, starting where the lab did', () => {
    expect(themeDefault(halloween.style)).toEqual({ style: 'vector', variant: 'doodle' });
    expect(themeDefault(halloween.face)).toBe('cute');
    expect(themeChoices(halloween.color)).toEqual(expect.arrayContaining(['night', 'cream']));
    for (const member of halloween.cast.map((id) => castMember(id)!)) {
      expect(themeChoices(halloween.color), member.id).toContain(member.color);
    }
  });

  it('paints the lab night and cream characters in those colours', () => {
    for (const id of ['coal', 'bubbles', 'dangle', 'creaky', 'lanternmiso'])
      expect(castMember(id)!.color, id).toBe('night');
    for (const id of ['floaty', 'wraps', 'rattle', 'patch', 'witchmochi'])
      expect(castMember(id)!.color, id).toBe('cream');
    expect(getShape('witchmochi').parts.find((part) => part.prop)?.color).toBe('violet');
  });

  it('refuses a theme that names what the engine does not know', () => {
    const base = { ...halloween, id: 'broken' };
    expect(() => defineTheme({ ...base, style: { open: [{ style: 'vector', variant: 'nope' }] } })).toThrow(
      /does not know/,
    );
    expect(() => defineTheme({ ...base, color: { open: [] } })).toThrow(/offers nothing/);
    expect(() => defineTheme({ ...base, cast: [] })).toThrow(/cast is empty/);
    expect(getTheme('broken')).toBeNull();
  });
});

describe('visibility once installed', () => {
  it('keeps theme skins out of the listed variants and accepts them by id', () => {
    const vector = getStyle('vector');
    expect(vector.variants).not.toContain('doodle');
    expect(allVariants(vector)).toEqual([...vector.variants, 'doodle', 'grainy']);
    expect(acceptsVariant(vector, 'grainy')).toBe(true);
    for (const style of listStyles()) expect(style.variants).not.toContain('doodle');
    expect(Object.keys(paramsForVariant(vector, 'doodle')).sort()).toEqual(
      ['grain', 'hatching', 'stickerWidth', 'strokeWidth'].sort(),
    );
  });

  it('keeps theme characters out of the listed roster', () => {
    for (const shape of HALLOWEEN.cast.map((member) => member.shape)) expect(SHAPE_IDS).not.toContain(shape);
    expect(CAST.some((member) => own.includes(member.id))).toBe(false);
  });

  it('draws a theme character in any colour, style, variant and face', () => {
    for (const color of CORE_COLOR_IDS) {
      expect(renderStaticSvg({ shape: 'spook', color, variant: 'doodle' })).not.toContain('NaN');
      expect(renderStaticSvg({ shape: 'spook', color, variant: 'grainy' })).not.toContain('NaN');
    }
    for (const style of listStyles()) {
      for (const variant of allVariants(style)) {
        const svg = renderStaticSvg({ shape: 'witchmochi', style: style.id, variant, face: 'glossy' });
        expect(svg, `${style.id}/${variant}`).not.toContain('NaN');
      }
    }
  });

  it.each(HALLOWEEN.cast.map((member) => member.shape))('builds %s live in both skins', (shape) => {
    for (const variant of ['doodle', 'grainy']) {
      const host = document.createElement('div');
      const character = createCharacter(host, { shape, variant, reducedMotion: true });
      expect(character.element.outerHTML).not.toContain('NaN');
      character.destroy();
    }
  });

  it('draws the skins the same every time', () => {
    for (const variant of ['doodle', 'grainy']) {
      for (const sizePx of [24, 48, undefined]) {
        expect(
          renderStaticSvg({ shape: 'spook', color: 'cream', variant, state: 'happy', sizePx }),
        ).toMatchSnapshot(`${variant} ${sizePx ?? 'any'}`);
      }
    }
  });
});

describe('state-following accents', () => {
  it('reads each state its mood from how the engine already sorts it', () => {
    expect(moodOf('happy')).toBe('bright');
    expect(moodOf('laughing')).toBe('bright');
    expect(moodOf('angry')).toBe('heated');
    expect(moodOf('refusing')).toBe('heated');
    expect(moodOf('sad')).toBe('low');
    expect(moodOf('surprised')).toBe('tense');
    expect(moodOf('sleeping')).toBe('drowsy');
    expect(moodOf('thinking')).toBe('calm');
    expect(moodOf('idle')).toBe('calm');
    for (const state of CHARACTER_STATES) expect(STATE_MOODS).toContain(moodOf(state));
  });

  /** The tint the doodle skin leans a mood into: its own, where its `moodAccent` gives one, else the core's. */
  const tintOf = (mood: StateMood): string =>
    HALLOWEEN.variants.find((skin) => skin.variant === 'doodle')!.medium.moodAccent?.moods?.[mood]?.tint ??
    MOOD_LEAN[mood]!.tint;

  it('leans the doodle edge into the mood, from the ink, statically', () => {
    const edge = (state: CharacterState, color: ColorId = 'orange') =>
      /<path d="[^"]+" fill="(color-mix[^"]*|oklch[^"]*)"/.exec(
        renderStaticSvg({ shape: 'pumpkin', color, variant: 'doodle', state }),
      )![1]!;
    expect(edge('idle')).toMatch(/^oklch\(from /);
    expect(edge('angry')).toContain(tintOf('heated'));
    expect(edge('sleeping')).toContain(tintOf('drowsy'));
    expect(edge('happy')).toContain(tintOf('bright'));
    expect(edge('angry', 'night')).toContain('oklch(from');
    expect(edge('angry')).toMatch(/max\(c, 0\.\d+\)/);
    expect(edge('idle')).not.toContain('max(c');
    expect(renderStaticSvg({ shape: 'pumpkin', variant: 'grainy', state: 'angry' })).not.toContain(
      tintOf('heated'),
    );
  });

  it('eases the edge between moods in a live scene', () => {
    const host = document.createElement('div');
    const character = createCharacter(host, {
      shape: 'pumpkin',
      variant: 'doodle',
      state: 'happy',
      reducedMotion: true,
    });
    expect(host.innerHTML).toContain('transition:fill');
    expect(host.innerHTML).toContain(tintOf('bright'));
    character.update({ state: 'angry' });
    character.destroy();
  });
});

describe('member kinds', () => {
  it('says what every member is to the theme, with the base of each combination', () => {
    const { members, cast } = HALLOWEEN.definition;
    expect(members.map((member) => member.id)).toEqual(cast);
    expect(members.filter((member) => member.kind === 'new')).toHaveLength(20);
    expect(members.filter((member) => member.kind === 'combo')).toEqual([
      { id: 'witchmochi', kind: 'combo', base: 'mochi' },
      { id: 'lanternmiso', kind: 'combo', base: 'miso' },
      { id: 'nightcapluna', kind: 'combo', base: 'luna' },
    ]);
    expect(members.filter((member) => member.kind === 'borrowed').map((member) => member.id)).toEqual([
      'jelly',
      'flap',
      'luna',
    ]);
    for (const member of members) expect(THEME_MEMBER_KINDS).toContain(member.kind);
  });
});

describe('every shipped theme', () => {
  it.each(THEME_MANIFEST.map((entry) => [entry.id, entry] as const))(
    '%s lists its cards in the manifest as its definition casts them',
    async (id, entry) => {
      const theme = await loadTheme(id);
      expect(entry.cards).toEqual(theme.cast);
      for (const card of theme.cast) expect(castMember(card), card).not.toBeNull();
    },
  );

  it.each(THEME_MANIFEST.map((entry) => entry.id))('%s opens every engine state', async (id) => {
    const theme = await loadTheme(id);
    expect([...themeChoices(theme.state)].sort()).toEqual([...CHARACTER_STATES].sort());
  });

  it.each(THEME_MANIFEST.map((entry) => entry.id))(
    '%s offers the colour each member is shown in, a borrowed one’s own if it gives one',
    async (id) => {
      const theme = await loadTheme(id);
      for (const member of theme.members) {
        const color = (member.kind === 'borrowed' ? member.color : undefined) ?? castMember(member.id)!.color;
        expect(themeChoices(theme.color), member.id).toContain(color);
        expect(themeLook(theme, member.id)!.color, member.id).toBe(color);
      }
    },
  );

  it('lists only members the engine knows as cards', () => {
    expectTypeOf<(typeof THEME_MANIFEST)[number]['cards'][number]>().toExtend<CastId>();
  });
});

describe('theme states', () => {
  const base = { ...HALLOWEEN.definition, id: 'states' };

  it('opens every state when a theme leaves them out, from idle or where it starts', () => {
    const { state: _, ...rest } = base;
    const all = defineTheme(rest).state;
    expect(themeDefault(all)).toBe('idle');
    expect(themeChoices(all)).toHaveLength(CHARACTER_STATES.length);
    const started = defineTheme({ ...base, state: { start: 'happy' } }).state;
    expect(themeDefault(started)).toBe('happy');
    expect([...themeChoices(started)].sort()).toEqual([...CHARACTER_STATES].sort());
    expect(defineTheme({ ...base, state: { fixed: 'sad' } }).state).toEqual({ fixed: 'sad' });
    expect(() => defineTheme({ ...base, state: { start: 'nope' as CharacterState } })).toThrow(
      /does not know/,
    );
  });
});

describe('the theme look', () => {
  it('fills what a host leaves out from the theme, as the avatar API does', async () => {
    const theme = await loadTheme('halloween');
    const coal = castMember('coal')!;
    expect(themeLook('halloween', 'coal')).toEqual({
      shape: coal.shape,
      color: coal.color,
      face: themeDefault(theme.face),
      style: 'vector',
      variant: 'doodle',
      state: themeDefault(theme.state),
    });
    expect(themeLook(theme, 'coal')).toEqual(themeLook('halloween', 'coal'));
    expect(themeLook('halloween', 'nobody')).toBeNull();
  });

  it('picks one of the theme colours by the seed when the member’s own is not offered', async () => {
    const theme = await loadTheme('halloween');
    const narrow = { ...theme, color: { open: ['cyan', 'pink', 'gray'] as ColorId[] } };
    const colors = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f'].map((seed) => themeLook(narrow, 'mochi', seed)!.color),
    );
    for (const color of colors) expect(themeChoices(narrow.color)).toContain(color);
    expect(colors.size).toBeGreaterThan(1);
    expect(themeLook(narrow, 'mochi')!.color).toBe(themeLook(narrow, 'mochi', 'mochi')!.color);
    expect(themeLook({ ...theme, shape: { fixed: 'spook' } }, 'mochi')!.shape).toBe('spook');
  });

  it('dresses a borrowed member in the colour the theme gives it', async () => {
    const theme = await loadTheme('halloween');
    const members = theme.members.map((member) =>
      member.id === 'jelly' ? { ...member, kind: 'borrowed' as const, color: 'cream' as const } : member,
    );
    expect(themeLook({ ...theme, members }, 'jelly')!.color).toBe('cream');
    expect(themeLook(theme, 'jelly')!.color).toBe(castMember('jelly')!.color);
    expect(() =>
      defineTheme({
        ...theme,
        id: 'dressed',
        members: members.map((m) => (m.id === 'jelly' ? { ...m, color: 'nope' as ColorId } : m)),
      }),
    ).toThrow(/does not know/);
  });
});

describe('theme colours', () => {
  it('are drawn and named once their theme is installed, and never listed', async () => {
    const owned = THEME_MANIFEST.flatMap((theme) => theme.colors.map((color) => [theme.id, color] as const));
    expect(owned.length).toBeGreaterThan(0);
    await Promise.all(owned.map(([theme]) => loadTheme(theme)));
    for (const [, color] of owned) {
      expect(COLOR_IDS).not.toContain(color);
      expect(ALL_COLOR_IDS).toContain(color);
      expect(themeLabel('color', color)).toMatchObject({ en: expect.any(String), zh: expect.any(String) });
      expect(renderStaticSvg({ shape: 'mochi', color })).not.toContain('NaN');
    }
  });
});

describe('palette', () => {
  it('leaves every colour the core paints to the core, never to a theme', () => {
    for (const entry of THEME_MANIFEST)
      for (const color of entry.colors) expect(CORE_COLOR_IDS, `${entry.id} ${color}`).not.toContain(color);
  });

  it('lists night nowhere by default, lists cream, and accepts both everywhere', () => {
    expect(COLOR_IDS).not.toContain('night');
    expect(COLOR_IDS).toContain('cream');
    expect(ALL_COLOR_IDS).toEqual([
      ...COLOR_IDS,
      ...UNLISTED_COLOR_IDS,
      ...THEME_MANIFEST.flatMap((theme) => theme.colors),
    ]);
    for (const style of listStyles()) {
      for (const variant of allVariants(style)) {
        for (const color of ['night', 'cream'] as const) {
          expect(renderStaticSvg({ shape: 'mochi', color, style: style.id, variant })).not.toContain('NaN');
        }
      }
    }
  });

  it('keeps night dark on a dark page and gives it the dark-body face', () => {
    const vars = getInkVars('night');
    expect(vars['--aora-fg']).not.toContain('#FFFFFF');
    expect(vars['--aora-face']).toBe('#FFFFFF');
    expect(vars['--aora-face-soft']).toBe('#FFFFFF');
    expect(vars['--aora-hair-shade']).toBe('#FFFFFF');
  });

  it('gives cream and yellow the light-body face black has on a dark page', () => {
    for (const color of ['cream', 'yellow'] as const) {
      const vars = getInkVars(color);
      expect(vars['--aora-face'], color).toBe('#2B2420');
      expect(vars['--aora-face-pupil'], color).toBe('#FFFFFF');
      expect(vars['--aora-face-glint'], color).toBe('#FFFFFF');
      // The grainy skin splits its face by the body's lightness, with the rule's light-body face at the dark end.
      const svg = renderStaticSvg({ color, variant: 'grainy', state: 'happy' });
      const [dark] = oklch('#2B2420');
      expect(svg).toContain('clamp(0, (0.62 - l) * 1000, 1)');
      expect(svg).toContain(`calc(${Math.round(dark * 1000) / 1000} + `);
    }
  });

  it('draws effects in the face colour where the ink is lost on the page', () => {
    expect(getInkVars('cream')['--aora-fx']).toBe('light-dark(#2B2420, #EADBB9)');
    expect(getInkVars('night')['--aora-fx']).toBe('light-dark(#2A2433, #FFFFFF)');
    for (const color of ['blue', 'yellow', 'orange', 'black'] as const)
      expect(getInkVars(color)['--aora-fx'], color).toBeUndefined();
  });

  it('keeps black inverting, with its face cut out of the page', () => {
    expect(getInkVars('black')).toEqual({
      '--aora-fg': 'light-dark(#1F1F1F, #FFFFFF)',
      '--aora-face-soft': 'light-dark(#FFFFFF, #2B2420)',
      '--aora-face-sticker': 'light-dark(#FFFFFF, #1F1F1F)',
      '--aora-hair-shade': 'light-dark(#FFFFFF, #000000)',
      '--aora-face-pupil': 'light-dark(#2B2420, #FFFFFF)',
      '--aora-face-glint': 'light-dark(#2B2420, #FFFFFF)',
      '--aora-ink2': 'light-dark(#FF78A6, #FFFFFF)',
    });
    expect(getInkVars('blue')).toEqual({ '--aora-fg': expect.any(String), '--aora-face': '#FFFFFF' });
  });

  it('draws lines on the page in a deeper or lighter ink where the ink is too faint there', () => {
    const cream = getInkVars('cream')['--aora-ink-line']!;
    expect(cream).toMatch(/^light-dark\(#[0-9A-F]{6}, #EADBB9\)$/);
    expect(getInkVars('night')['--aora-ink-line']).toMatch(/^light-dark\(#2A2433, #[0-9A-F]{6}\)$/);
    for (const color of ['blue', 'orange', 'black', 'navy'] as const)
      expect(getInkVars(color)['--aora-ink-line'], color).toBeUndefined();
    // Cream's line on a light page keeps its hue: still warmer in red than in blue.
    const [r, , b] = [1, 3, 5].map((i) => Number.parseInt(cream.slice(12 + i, 14 + i), 16));
    expect(r!).toBeGreaterThan(b!);
    expect(renderStaticSvg({ color: 'cream', variant: 'outline' })).toContain('-line: ');
    expect(renderStaticSvg({ color: 'cream', style: 'kaomoji', flat: true })).not.toContain('#F1E2C1');
  });

  it('gives a cut-out face eyes that read on a body that would swallow the page', () => {
    expect(getInkVars('cream')['--aora-eye']).toBe('#2B2420');
    expect(getInkVars('night')['--aora-eye']).toBe('#FFFFFF');
    for (const color of ['blue', 'black'] as const)
      expect(getInkVars(color)['--aora-eye'], color).toBeUndefined();
    expect(renderStaticSvg({ color: 'cream', face: 'eyes' })).toContain('fill="#2B2420"');
  });

  it('edges a filled body in a hairline on a page it all but matches', () => {
    expect(getInkVars('cream')['--aora-rim']).toMatch(/^light-dark\(#[0-9A-F]{6}, transparent\)$/);
    expect(getInkVars('ivory')['--aora-rim']).toMatch(/^light-dark\(#[0-9A-F]{6}, transparent\)$/);
    expect(getInkVars('night')['--aora-rim']).toMatch(/^light-dark\(transparent, #[0-9A-F]{6}\)$/);
    for (const color of ['blue', 'black', 'yellow', 'pink', 'blush'] as const)
      expect(getInkVars(color)['--aora-rim'], color).toBeUndefined();
    const solid = renderStaticSvg({ color: 'ivory', flat: true });
    expect(solid).toContain('vector-effect="non-scaling-stroke"');
    // A line variant is its own edge, and a drawing medium draws its own.
    expect(renderStaticSvg({ color: 'ivory', variant: 'outline' })).not.toContain('-rim');
    expect(renderStaticSvg({ color: 'ivory', variant: 'pencil' })).not.toContain('-rim');
    expect(renderStaticSvg({ color: 'blue' })).not.toContain('non-scaling-stroke');
  });

  it('prints a light ink over itself in riso, and pink over gold', () => {
    expect(getInkVars('cream')['--aora-ink2']).toBe('light-dark(#F1E2C1, #EADBB9)');
    expect(getInkVars('pink')['--aora-ink2']).toBe('#F5B428');
    expect(getInkVars('blue')['--aora-ink2']).toBeUndefined();
  });

  it('shows black as the colour it is on the page in a picker chip', () => {
    expect(getSwatchCss('black')).toBe('light-dark(#1F1F1F, #FFFFFF)');
    expect(getSwatchCss('cream')).toBe('#E9D9B6');
  });
});

describe('small sizes', () => {
  /** The width of the doodle's die-cut edge, read off the underlay's first path. */
  const edgeOf = (sizePx: number | undefined): number => {
    const svg = renderStaticSvg({ shape: 'mochi', color: 'orange', variant: 'doodle', sizePx });
    const d = /<path d="([^"]+)" fill="oklch/.exec(svg)![1]!;
    const xs = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).filter((_, i) => i % 2 === 0).map(Number);
    return Math.max(...xs) - Math.min(...xs);
  };

  it('shrinks the doodle edge at small sizes without losing it', () => {
    const full = edgeOf(undefined);
    expect(edgeOf(24)).toBeLessThan(full);
    expect(edgeOf(48)).toBeLessThan(full);
    // The full edge and ink line reach 15 units out on either side of the body.
    expect(edgeOf(24)).toBeGreaterThan(full - 2 * 15);
  });

  it('thickens a thin part to a pixel at small sizes', () => {
    const svg = renderStaticSvg({ shape: 'candle', color: 'pink', variant: 'doodle', sizePx: 24 });
    expect(svg).toMatch(/stroke-width="\d/);
    // The mood decorations, drawn from 64 px, stroke their own glyphs.
    const large = renderStaticSvg({ shape: 'candle', color: 'pink', variant: 'doodle', sizePx: 400 }).replace(
      /<g data-aora-decor[\s\S]*$/,
      '',
    );
    expect(large.match(/stroke-linejoin="round"/g)?.length ?? 0).toBeLessThan(
      svg.match(/stroke-linejoin="round"/g)?.length ?? 0,
    );
  });

  it('rings a small pixel part from outside, where it has no edge cells of its own to spare', () => {
    const svg = renderStaticSvg({ shape: 'skull', color: 'cream', style: 'pixel', variant: 'crisp' });
    expect(svg).toContain(rimHex(partColorPair('pink')!.light));
  });
});

describe('part colours', () => {
  it('paints a palette colour in its ink, ringed in a line derived from it', () => {
    expect(partColorPair('violet')).toEqual({ light: '#846BEC', dark: '#7962D9' });
    expect(partColorPair('#123456')).toEqual({ light: '#123456', dark: '#123456' });
    expect(partColorPair('currentColor')).toBeNull();
    expect(rimHex('#1F1F1F') > '#1F1F1F').toBe(true);
    expect(rimHex('#FFFFFF') < '#FFFFFF').toBe(true);
  });

  it('draws a violet hat on a violet body with its ring', () => {
    const svg = renderStaticSvg({ shape: 'witchmochi', color: 'violet' });
    expect(svg).toContain('paint-order="stroke"');
    expect(svg).toContain(rimHex('#846BEC'));
  });

  it('draws a coloured part as a line in its colour on an outlined body', () => {
    const svg = renderStaticSvg({ shape: 'witch', color: 'green', variant: 'outline' });
    expect(svg).toContain('#846BEC');
    expect(svg).not.toContain('paint-order');
  });
});

describe('props', () => {
  it('defines a character as a base plus props', () => {
    const ring: [number, number][] = Array.from({ length: 24 }, (_, i) => [
      50 + 12 * Math.cos((i / 24) * Math.PI * 2),
      20 + 8 * Math.sin((i / 24) * Math.PI * 2),
    ]);
    const shape = defineShapeWithProps('bun-with-beret', {
      base: 'bun',
      at: [50, 60],
      scale: 0.7,
      props: [{ tone: 'leaf', color: 'red', outline: ring }],
    });
    expect(shape.parts.at(-1)).toMatchObject({ tone: 'leaf', color: 'red', prop: true });
    expect(renderStaticSvg({ shape: 'bun-with-beret' as ShapeId, color: 'yellow' })).toContain('paint-order');
  });

  it('lays a hair part of its own colour flat in that colour', () => {
    const ring: [number, number][] = Array.from({ length: 24 }, (_, i) => [
      50 + 12 * Math.cos((i / 24) * Math.PI * 2),
      20 + 8 * Math.sin((i / 24) * Math.PI * 2),
    ]);
    defineShapeWithProps('bun-with-cap', {
      base: 'bun',
      at: [50, 60],
      scale: 0.7,
      props: [{ tone: 'hair', color: 'red', outline: ring }],
    });
    const shades = (svg: string) => svg.split('fill-opacity="0.4"').length;
    const svg = renderStaticSvg({ shape: 'bun-with-cap' as ShapeId, color: 'yellow' });
    expect(svg).toContain(partColorPair('red')!.light);
    expect(shades(svg)).toBe(shades(renderStaticSvg({ shape: 'bun', color: 'yellow' })));
  });

  it('leaves a fine part out of a character shown smaller than it allows', () => {
    const ring: [number, number][] = Array.from({ length: 24 }, (_, i) => [
      50 + 12 * Math.cos((i / 24) * Math.PI * 2),
      20 + 8 * Math.sin((i / 24) * Math.PI * 2),
    ]);
    defineShapeWithProps('bun-with-fine-beret', {
      base: 'bun',
      at: [50, 60],
      scale: 0.7,
      props: [{ tone: 'leaf', color: 'red', outline: ring, minPx: 48 }],
    });
    const at = (sizePx?: number) =>
      renderStaticSvg({ shape: 'bun-with-fine-beret' as ShapeId, color: 'yellow', sizePx });
    expect(at(24)).not.toContain('paint-order');
    expect(at(48)).toContain('paint-order');
    expect(at()).toContain('paint-order');
  });
});

describe('the main entry', () => {
  const built = join(process.cwd(), 'dist', 'index.js');

  it.skipIf(!existsSync(built))('carries no theme art or skin, only the manifest', () => {
    const main = readFileSync(built, 'utf8');
    const loop = (HALLOWEEN.art.spook as { body: { loop: string } }).body.loop.slice(0, 40);
    expect(main).not.toContain(loop);
    expect(main).not.toContain('doodle-under');
    expect(main).not.toContain('Lollipop ghost');
    expect(main).toMatch(/import\(["']@aora-bot\/engine\/themes\/halloween["']\)/);
    const staticEntry = readFileSync(built.replace('index.js', 'static.js'), 'utf8');
    expect(staticEntry).not.toContain(loop);
  });

  const labels = join(process.cwd(), 'dist', 'labels.js');
  it.skipIf(!existsSync(labels))('leaves the labels entry free of shapes, renderers and theme art', () => {
    const text = readFileSync(labels, 'utf8');
    expect(text.length).toBeLessThan(40_000);
    for (const mark of [
      'createVectorScene',
      'renderStaticSvg',
      'computeFaceGeometry',
      'registerArt',
      'doodle-under',
    ])
      expect(text, mark).not.toContain(mark);
  });
});
