// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VIEWBOX_STR } from '../src/core/types.js';
import { fnv1a32 } from '../src/math/hash.js';
import { CHARACTER_STATES } from '../src/motion/states.js';
import { buildCells, CELL, COLOUR_ROLES, createCharGrid, CUTOUT_ROLES } from '../src/render/ascii/cells.js';
import { CHARSETS } from '../src/render/ascii/charsets.js';
import { composeStatic } from '../src/render/ascii/compose.js';
import { applyEffect, ASCII_EFFECTS } from '../src/render/ascii/effects.js';
import {
  ASCII_CHARSET_IDS,
  ASCII_DEFAULTS,
  ASCII_FILL_IDS,
  asciiVariantOf,
  readAsciiOptions,
} from '../src/render/ascii/options.js';
import { renderAsciiText } from '../src/render/ascii/text.js';
import { createCharacter } from '../src/render/character.js';
import { pixelGrid } from '../src/render/pixel/grid.js';
import { createPaintTable } from '../src/render/pixel/paints.js';
import { PIXEL_BLUSH } from '../src/render/pixel/rasterise.js';
import { buildStillFrame, renderStaticSvg } from '../src/render/static-svg.js';
import { SHAPE_IDS } from '../src/core/types.js';
import { createSimulation } from '../src/sim/simulation.js';
import {
  getStyle,
  paramsForVariant,
  resolveStyleOptions,
  validateStyleOptions,
} from '../src/styles/index.js';

/*
 * The ascii series. It rasterises like the pixel one and regroups the result
 * into character cells, so the tests go from the glyph tables up: the
 * charsets, the cells built from a paint buffer, the effects, then the
 * renderers and the plain-text form. Static output is deterministic, so
 * the per-state pictures are frozen as hashes with a few full documents and
 * texts beside them to show what a hash stands for.
 */

const FRAME_MS = 16;
const SNAPSHOT_SHAPES = ['blob', 'hex', 'cloud'] as const;
const VARIANTS = ['ansi', 'mono', 'crt'] as const;

const ascii = (options: Parameters<typeof renderStaticSvg>[0] = {}) =>
  renderStaticSvg({ style: 'ascii', ...options });

const hash = (s: string) => fnv1a32(s).toString(16).padStart(8, '0');

const unescape = (text: string) => text.replace(/&lt;/g, '<').replace(/&amp;/g, '&');

/** Every `<tspan>` of a document: its `x` list and its text. */
function tspans(svg: string): { xs: number[]; text: string }[] {
  return [...svg.matchAll(/<tspan x="([^"]*)" y="[^"]*">([^<]*)<\/tspan>/g)].map((m) => ({
    xs: m[1]!.split(' ').map(Number),
    text: unescape(m[2]!),
  }));
}

describe('ascii style definition', () => {
  const style = getStyle('ascii');

  it('declares its variants, defaults and parameter ranges', () => {
    expect(style.variants).toEqual(['ansi', 'mono', 'crt']);
    expect(style.defaultVariant).toBe('ansi');
    expect(style.defaults).toEqual({
      cols: 28,
      charset: 'ascii',
      fill: 'shade',
      effect: 'decode',
      fps: 12,
      glow: true,
    });
    expect(style.params).toMatchSnapshot();
  });

  it('clamps and snaps parameters, and reports what it fixed', () => {
    expect(
      resolveStyleOptions(style, {
        cols: 999,
        fps: 7.4,
        charset: 'runes',
        fill: 3,
        effect: 'spin',
        glow: 'on',
      }),
    ).toEqual({ ...ASCII_DEFAULTS, cols: 64, fps: 7 });
    expect(resolveStyleOptions(style, { cols: 2 })).toMatchObject({ cols: 12 });
    expect(validateStyleOptions(style, { cols: 999, charset: 'runes', bogus: 1 }).map((i) => i.key)).toEqual([
      'cols',
      'charset',
      'bogus',
    ]);
    expect(validateStyleOptions(style, { charset: 'braille', fill: 'hollow', effect: 'glitch' })).toEqual([]);
  });

  it('lists glow only for the crt variant', () => {
    const keys = (variant: string) => Object.keys(paramsForVariant(style, variant));
    expect(keys('ansi')).toEqual(['cols', 'charset', 'fill', 'effect', 'fps']);
    expect(keys('mono')).toEqual(['cols', 'charset', 'fill', 'effect', 'fps']);
    expect(keys('crt')).toEqual(['cols', 'charset', 'fill', 'effect', 'fps', 'glow']);
  });

  it('reads whatever a renderer is handed, and names a foreign variant ansi', () => {
    expect(readAsciiOptions({})).toEqual(ASCII_DEFAULTS);
    expect(
      readAsciiOptions({ cols: Number.NaN, charset: 'x', fill: null, effect: 4, fps: '12', glow: 1 }),
    ).toEqual(ASCII_DEFAULTS);
    expect(readAsciiOptions({ cols: 20.4, charset: 'block', glow: false })).toMatchObject({
      cols: 20,
      charset: 'block',
      glow: false,
    });
    expect(asciiVariantOf('outline')).toBe('ansi');
    expect(asciiVariantOf('crt')).toBe('crt');
  });
});

describe('charsets', () => {
  const masks = Array.from({ length: 256 }, (_, i) => i);
  const single = (glyph: string) => [...glyph].length === 1 && glyph.length === 1;

  it('writes braille from the dot bits, one code point to the byte', () => {
    const { edge, mark } = CHARSETS.braille;
    expect(edge(0xff)).toBe('⣿');
    expect(edge(0b00000001)).toBe('⠁');
    // Row 3, column 1: the last dot.
    expect(edge(1 << (3 * 2 + 1))).toBe('⢀');
    expect(edge(0)).toBe('\u2800');
    for (const mask of masks) {
      let dots = 0;
      const table = [0x01, 0x08, 0x02, 0x10, 0x04, 0x20, 0x40, 0x80];
      for (let i = 0; i < 8; i++) if (mask & (1 << i)) dots |= table[i]!;
      expect(edge(mask).codePointAt(0)).toBe(0x2800 + dots);
      expect(mark(mask)).toBe(edge(mask));
    }
  });

  it('writes blocks from the quadrants a cell reaches into', () => {
    const { edge, wall } = CHARSETS.block;
    expect(edge(0)).toBe(' ');
    expect(edge(0xff)).toBe('█');
    // One sub-cell lights its whole quadrant: top-left, top-right, bottom-left, bottom-right.
    expect(edge(1 << 0)).toBe('▘');
    expect(edge(1 << (1 * 2 + 1))).toBe('▝');
    expect(edge(1 << (3 * 2 + 0))).toBe('▖');
    expect(edge(1 << (2 * 2 + 1))).toBe('▗');
    expect(edge(0x0f)).toBe('▀');
    expect(edge(0xf0)).toBe('▄');
    expect(edge(0x55)).toBe('▌');
    expect(edge(0xaa)).toBe('▐');
    expect(wall('top')).toBe('▀');
    expect(wall('right')).toBe('▐');
  });

  it('reads an ascii boundary by where its ink sits', () => {
    const { edge, mark, fill } = CHARSETS.ascii;
    expect(edge(0)).toBe(' ');
    expect(edge(0xff)).toBe(fill(0.5, 0, 0));
    expect(edge(0xc0)).toBe('_'); // a sliver along the bottom
    expect(edge(0x03)).toBe('-'); // a sliver along the top: the base of a body
    expect(edge(0xf0)).toBe('-'); // the lower half
    expect(edge(0x0f)).toBe('-'); // the upper half
    expect(edge(0xaa)).toBe('('); // ink on the right: the left side of a body
    expect(edge(0x55)).toBe(')');
    expect(edge(0xee)).toBe('|'); // nearly all of it, on the right
    expect(mark(0xff)).toBe('O');
    expect(mark(0x0f)).toBe('O');
    expect(mark(0b00110000)).toBe('-'); // a thin level line
    expect(mark(0b11000000)).toBe('_'); // along the bottom of the cell
    expect(mark(0b01000000)).toBe('.');
    expect(mark(0b00000001)).toBe("'");
    expect(mark(0b00010101)).toBe('|'); // an upright stroke down one side
    expect(mark(0b00001001)).toBe('\\'); // a stroke falling to the right
    expect(mark(0b00000110)).toBe('/');
    expect(mark(0b00000111)).toBe('o');
  });

  it('draws a cell the body all but fills as interior, unless what is missing is a side', () => {
    const { solid } = CHARSETS.ascii;
    expect(solid?.(0xfc)).toBe(true); // all but the top row
    expect(solid?.(0x3f)).toBe(true); // all but the bottom row
    expect(solid?.(0xfe)).toBe(true); // all but a corner
    expect(solid?.(0xee)).toBe(false); // the right column and half the left: an upright edge
    expect(solid?.(0xf0)).toBe(false);
    expect(CHARSETS.block.solid).toBeUndefined();
    expect(CHARSETS.braille.solid).toBeUndefined();
  });

  it('draws a mirrored boundary as the mirrored glyph', () => {
    const mirror = (mask: number) => {
      let out = 0;
      for (let row = 0; row < 4; row++) {
        if (mask & (1 << (row * 2))) out |= 1 << (row * 2 + 1);
        if (mask & (1 << (row * 2 + 1))) out |= 1 << (row * 2);
      }
      return out;
    };
    const swap: Record<string, string> = { '(': ')', ')': '(', '/': '\\', '\\': '/' };
    for (const mask of masks) {
      const glyph = CHARSETS.ascii.edge(mask);
      expect(CHARSETS.ascii.edge(mirror(mask)), `mask ${mask}`).toBe(swap[glyph] ?? glyph);
    }
  });

  it('ramps fill from lit to deep', () => {
    const ramp = ';=+xX#%@';
    expect(CHARSETS.ascii.fill(1, 0, 0)).toBe(';');
    expect(CHARSETS.ascii.fill(0, 0, 0)).toBe('@');
    expect(CHARSETS.ascii.fill(0.5, 0, 0)).toBe('X');
    // The body never borrows a glyph an edge, a feature or an effect is written with.
    for (const glyph of ramp) expect("_-'.()|/\\Oo*zZ!♥").not.toContain(glyph);
    const levels = [1, 0.8, 0.6, 0.4, 0.2, 0].map((l) => ramp.indexOf(CHARSETS.ascii.fill(l, 0, 0)));
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    expect(CHARSETS.block.fill(1, 0, 0)).toBe('░');
    expect(CHARSETS.block.fill(0, 0, 0)).toBe('█');
    expect(CHARSETS.braille.fill(0, 0, 0)).toBe('⣿');
    expect(CHARSETS.braille.fill(0, 3, 1)).toBe('⣿');
  });

  it('dithers braille fill so a mid tone is half the dots, in a pattern that alternates between cells', () => {
    const { fill } = CHARSETS.braille;
    const dots = (glyph: string) => (glyph.codePointAt(0)! - 0x2800).toString(2).replace(/0/g, '').length;
    const levels = [1, 0.75, 0.5, 0.25, 0].map((l) => dots(fill(l, 0, 0)));
    expect(levels[0]).toBe(1);
    expect(levels[4]).toBe(8);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    expect(dots(fill(0.5, 0, 0))).toBe(dots(fill(0.5, 1, 0)));
    expect(fill(0.5, 0, 0)).not.toBe(fill(0.5, 1, 0));
    expect(fill(0.5, 0, 0)).not.toBe(fill(0.5, 0, 1));
    expect(fill(0.5, 0, 0)).toBe(fill(0.5, 1, 1));
  });

  it.each(ASCII_CHARSET_IDS)('writes one code point per glyph in %s', (id) => {
    const set = CHARSETS[id];
    for (const mask of masks) {
      expect(single(set.edge(mask)), `edge ${mask}`).toBe(true);
      expect(single(set.mark(mask)), `mark ${mask}`).toBe(true);
    }
    for (const level of [0, 0.13, 0.5, 0.87, 1]) {
      for (const [col, row] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ] as const) {
        expect(single(set.fill(level, col, row)), `fill ${level}`).toBe(true);
      }
    }
    for (const side of ['left', 'right', 'top', 'bottom'] as const) expect(single(set.wall(side))).toBe(true);
    expect(set.noise.length).toBeGreaterThan(3);
    expect([...set.noise].every(single)).toBe(true);
  });
});

describe('cells from a paint buffer', () => {
  const grid = pixelGrid(24);
  const { size } = grid;
  const table = createPaintTable();
  const ink = table.id({ kind: 'ink', band: 1, tone: 0 }, 1);
  const feature = table.id({ kind: 'css', value: '#2B2420' }, 1);
  const blush = table.id({ kind: 'css', value: PIXEL_BLUSH }, 1);
  const options = (fill: 'shade' | 'solid' | 'hollow') => ({ ...ASCII_DEFAULTS, fill });

  const rect = (paint: Uint16Array, x0: number, y0: number, x1: number, y1: number, id: number) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) paint[y * size + x] = id;
  };
  const body = () => {
    const paint = new Uint16Array(size * size);
    rect(paint, 0, 0, size, size, ink);
    return paint;
  };
  const at = (cells: ReturnType<typeof buildCells>, col: number, row: number) =>
    cells.glyph[row * cells.cols + col];

  it('groups the sub-grid into cells 2 wide and 4 tall', () => {
    const cells = buildCells(body(), table, grid, options('solid'), COLOUR_ROLES);
    expect(cells.cols).toBe(Math.ceil(size / 2));
    expect(cells.rows).toBe(Math.ceil(size / 4));
    expect(cells.glyph).toHaveLength(cells.cols * cells.rows);
    expect(cells.paint).toHaveLength(cells.cols * cells.rows);
  });

  it('writes a full cell by the fill option', () => {
    const solid = buildCells(body(), table, grid, options('solid'), COLOUR_ROLES);
    expect(new Set(solid.glyph)).toEqual(new Set(['@']));
    expect(solid.kind.every((k) => k === CELL.fill)).toBe(true);
    expect(solid.paint.every((p) => p === ink)).toBe(true);

    const ramp = '.:-=+*#%@';
    const shade = buildCells(body(), table, grid, options('shade'), COLOUR_ROLES);
    // Light falls from the upper left, so the lit side is made of lighter glyphs than the shaded one.
    expect(ramp.indexOf(at(shade, 3, 2)!)).toBeLessThan(ramp.indexOf(at(shade, 10, 4)!));
    expect(new Set(shade.glyph).size).toBeGreaterThan(4);
  });

  it('leaves a hollow body empty inside and walls it where it meets the outside', () => {
    const cells = buildCells(body(), table, grid, options('hollow'), COLOUR_ROLES);
    expect(at(cells, 7, 3)).toBe('');
    expect(at(cells, 0, 3)).toBe('|');
    expect(at(cells, cells.cols - 1, 3)).toBe('|');
    expect(at(cells, 7, 0)).toBe('-');
    expect(at(cells, 7, cells.rows - 1)).toBe('-');
    expect(cells.paint[3 * cells.cols + 7]).toBe(0);
    const block = buildCells(body(), table, grid, options('hollow'), COLOUR_ROLES);
    expect(block.glyph.filter((g) => g !== '').length).toBeLessThan(cells.glyph.length / 2);
  });

  it('walls a hollow body with the charset`s own glyphs', () => {
    const cells = buildCells(body(), table, grid, { ...options('hollow'), charset: 'block' }, COLOUR_ROLES);
    expect(at(cells, 0, 3)).toBe('▌');
    expect(at(cells, 7, 0)).toBe('▀');
  });

  it('writes a partial cell as an edge of what it covers', () => {
    const paint = new Uint16Array(size * size);
    rect(paint, 0, 0, size, 2, ink); // the top half of the first row of cells
    const cells = buildCells(paint, table, grid, options('shade'), COLOUR_ROLES);
    expect(at(cells, 4, 0)).toBe('-');
    expect(cells.kind[4]).toBe(CELL.edge);
    expect(at(cells, 4, 1)).toBe('');
  });

  it('shows the mark that covers most of a cell, and the cheeks as body', () => {
    const paint = body();
    rect(paint, 4, 8, 6, 9, feature);
    paint[9 * size + 4] = feature; // three sub-cells of a mark in cell (2, 2)
    paint[8 * size + 10] = blush;
    paint[9 * size + 10] = blush;
    paint[8 * size + 11] = blush;
    const cells = buildCells(paint, table, grid, options('shade'), COLOUR_ROLES);
    expect(at(cells, 2, 2)).toBe('o');
    expect(cells.kind[2 * cells.cols + 2]).toBe(CELL.mark);
    expect(cells.paint[2 * cells.cols + 2]).toBe(feature);
    // Pink is a body colour: that cell is still a body cell, in the colour most of it has.
    expect(cells.kind[2 * cells.cols + 5]).toBe(CELL.fill);
    expect(cells.paint[2 * cells.cols + 5]).toBe(ink);
  });

  it('cuts a mark out of the body but keeps one that is off it', () => {
    const paint = new Uint16Array(size * size);
    rect(paint, 0, 0, 20, size, ink);
    rect(paint, 8, 8, 10, 12, feature); // a whole cell of mark in the middle of the body
    rect(paint, 24, 0, 26, 4, feature); // a whole cell of mark beside it
    const kept = buildCells(paint, table, grid, options('shade'), COLOUR_ROLES);
    expect(at(kept, 4, 2)).toBe('O');
    expect(at(kept, 12, 0)).toBe('O');
    const cut = buildCells(paint, table, grid, options('shade'), CUTOUT_ROLES);
    expect(at(cut, 4, 2)).toBe('');
    expect(cut.kind[2 * cut.cols + 4]).toBe(CELL.empty);
    expect(at(cut, 12, 0)).toBe('O');
  });

  it('draws the face on a hollow body even where the body is one ink', () => {
    const paint = body();
    rect(paint, 8, 8, 10, 12, feature);
    expect(at(buildCells(paint, table, grid, options('hollow'), CUTOUT_ROLES), 4, 2)).toBe('O');
  });

  it('paints a hollow face in the body`s colour, since it sits on the page rather than the body', () => {
    const paint = body();
    const tear = table.id({ kind: 'fx', band: 0 }, 1);
    rect(paint, 8, 8, 10, 12, feature);
    rect(paint, 12, 8, 14, 12, tear);
    rect(paint, 24, 0, 26, 4, feature);
    const hollow = buildCells(paint, table, grid, options('hollow'), COLOUR_ROLES);
    expect(hollow.paint[2 * hollow.cols + 4]).toBe(ink);
    expect(hollow.paint[2 * hollow.cols + 6]).toBe(tear);
    const shade = buildCells(paint, table, grid, options('shade'), COLOUR_ROLES);
    expect(shade.paint[2 * shade.cols + 4]).toBe(feature);
  });
});

describe('static ascii output', () => {
  it.each(SNAPSHOT_SHAPES)('freezes every state of %s as a hash', (shape) => {
    const hashes = Object.fromEntries(
      CHARACTER_STATES.map((state) => [state, hash(ascii({ shape, state }))]),
    );
    expect(hashes).toMatchSnapshot();
  });

  it.each(SNAPSHOT_SHAPES)('draws a different picture for most states of %s', (shape) => {
    const distinct = new Set(CHARACTER_STATES.map((state) => ascii({ shape, state })));
    expect(distinct.size).toBeGreaterThan(CHARACTER_STATES.length / 2);
  });

  it.each(VARIANTS)('freezes a full %s document', (variant) => {
    expect(ascii({ shape: 'blob', state: 'happy', variant })).toMatchSnapshot();
  });

  it('draws every charset and every fill differently', () => {
    const charsets = ASCII_CHARSET_IDS.map((charset) =>
      ascii({ shape: 'blob', state: 'happy', styleOptions: { charset } }),
    );
    expect(new Set(charsets).size).toBe(ASCII_CHARSET_IDS.length);
    const fills = ASCII_FILL_IDS.map((fill) =>
      ascii({ shape: 'blob', state: 'happy', styleOptions: { fill } }),
    );
    expect(new Set(fills).size).toBe(ASCII_FILL_IDS.length);
    for (const charset of ASCII_CHARSET_IDS) {
      for (const fill of ASCII_FILL_IDS) {
        expect(ascii({ shape: 'blob', styleOptions: { charset, fill } })).toContain('<text');
      }
    }
  });

  it('is deterministic', () => {
    for (const variant of VARIANTS) {
      const a = ascii({ shape: 'tofu', state: 'curious', variant, color: 'blue' });
      const b = ascii({ shape: 'tofu', state: 'curious', variant, color: 'blue' });
      expect(a).toBe(b);
    }
  });

  it('draws the same glyphs whatever size it is rendered at, and finer ones with more columns', () => {
    const strip = (svg: string) => svg.replace(/ (width|height)="[^"]*"/g, '');
    expect(strip(ascii({ shape: 'blob', sizePx: 16 }))).toBe(strip(ascii({ shape: 'blob', sizePx: 480 })));
    const glyphs = (svg: string) => tspans(svg).reduce((n, t) => n + t.text.length, 0);
    const coarse = glyphs(ascii({ shape: 'blob', styleOptions: { cols: 16 } }));
    const fine = glyphs(ascii({ shape: 'blob', styleOptions: { cols: 48 } }));
    expect(fine).toBeGreaterThan(coarse * 2);
  });

  it('gives every glyph its own x and never writes a space', () => {
    for (const variant of VARIANTS) {
      for (const charset of ASCII_CHARSET_IDS) {
        const rows = tspans(ascii({ shape: 'cloud', state: 'sleeping', variant, styleOptions: { charset } }));
        expect(rows.length).toBeGreaterThan(5);
        for (const row of rows) {
          expect([...row.text]).toHaveLength(row.xs.length);
          expect(row.text).not.toMatch(/[ \u2800]/);
          // Cell centres are odd sub-cell units, in increasing order.
          expect(row.xs.every((x) => Number.isInteger(x) && x % 2 === 1)).toBe(true);
          expect(row.xs).toEqual([...row.xs].sort((a, b) => a - b));
        }
      }
    }
  });

  it('writes the monospace stack and centres each glyph on its x', () => {
    const svg = ascii({ shape: 'blob' });
    expect(svg).toContain(
      `font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"`,
    );
    expect(svg).toContain('text-anchor="middle"');
    expect(svg).toContain('dominant-baseline="central"');
    expect(svg).toContain(`viewBox="${VIEWBOX_STR}"`);
    expect(svg).not.toContain('NaN');
  });

  it('escapes the glyphs that are markup', () => {
    // The noise sets hold `&` and `<`; they never reach static output, but a glyph that is markup must be safe.
    const svg = ascii({ shape: 'blob', state: 'happy' });
    expect(svg).not.toMatch(/<tspan[^>]*>[^<]*[&](?!amp;|lt;)/);
  });

  it('writes one element for the one ink of mono, and one per paint in ansi', () => {
    const count = (svg: string) => (svg.match(/<text\b/g) ?? []).length;
    expect(count(ascii({ shape: 'blob', state: 'idle', variant: 'mono' }))).toBe(1);
    expect(count(ascii({ shape: 'blob', state: 'happy', variant: 'ansi' }))).toBeGreaterThan(2);
  });

  it('dresses crt as a dark screen with scanlines and, by default, a glow', () => {
    const lit = ascii({ shape: 'blob', variant: 'crt' });
    expect(lit).toContain('color-scheme:dark');
    expect(lit).toContain('<pattern');
    expect(lit).toContain('#17181D');
    expect(lit).toContain('<feGaussianBlur');
    expect(lit).toContain('filter="url(#');
    const flat = ascii({ shape: 'blob', variant: 'crt', styleOptions: { glow: false } });
    expect(flat).not.toContain('feGaussianBlur');
    expect(ascii({ shape: 'blob', variant: 'ansi' })).not.toContain('<pattern');
  });

  it('keeps the colours of the pixel series: cheeks, effects and a face that turns with the page', () => {
    const happy = ascii({ shape: 'blob', state: 'happy', color: 'blue' });
    expect(happy).toContain('#FF9DBB');
    expect(happy).toContain('#FF6F91');
    expect(ascii({ shape: 'blob', state: 'sad', color: 'blue' })).toContain('#7CC7FF');
    expect(ascii({ shape: 'blob', state: 'idle', color: 'black' })).toMatch(
      /\.\S+ \{ fill: #[0-9A-F]{6}; \}/,
    );
  });

  it('switches ink with the colour scheme, unless the ink is flat', () => {
    expect(ascii({ shape: 'blob' })).toContain('prefers-color-scheme: dark');
    expect(ascii({ shape: 'blob', colorScheme: 'page' })).toContain('light-dark(');
    expect(ascii({ shape: 'blob', flat: true })).not.toContain('prefers-color-scheme');
    expect(ascii({ shape: 'blob', variant: 'mono' })).toContain('prefers-color-scheme: dark');
  });

  it('ignores a variant of another series', () => {
    // The ids are hashed from the options, so they carry the variant that was asked for.
    const picture = (svg: string) => svg.replace(/\ba[a-z0-9]+-(\d+)/g, 'id-$1');
    expect(picture(ascii({ shape: 'blob', variant: 'solid' as never }))).toBe(
      picture(ascii({ shape: 'blob' })),
    );
  });
});

describe('every shape', () => {
  it.each(SHAPE_IDS)('renders %s without throwing, for every variant', (shape) => {
    for (const variant of VARIANTS) {
      const svg = ascii({ shape, state: 'idle', variant });
      expect(svg).toContain('<text');
      expect(svg).not.toContain('NaN');
    }
  });
});

describe('ascii cells of a character', () => {
  const cellsOf = (
    variant: (typeof VARIANTS)[number],
    options: Parameters<typeof renderStaticSvg>[0] = {},
  ) => {
    const { frame, context } = buildStillFrame({
      style: 'ascii',
      shape: 'blob',
      state: 'idle',
      variant,
      ...options,
    });
    return composeStatic(frame, context).cells;
  };

  it('writes the eyes as marks in ansi and cuts them out of the body in mono', () => {
    const ansi = cellsOf('ansi');
    const mono = cellsOf('mono');
    const eyes = [...ansi.kind].flatMap((kind, i) => (kind === CELL.mark ? [i] : []));
    expect(eyes.length).toBeGreaterThanOrEqual(2);
    expect(eyes.every((i) => /^[Oo.'_|/\\-]$/.test(ansi.glyph[i]!))).toBe(true);
    expect(eyes.some((i) => ansi.glyph[i] === 'O')).toBe(true);
    // Where ansi has a mark in the middle of the body, mono has a hole.
    const holes = eyes.filter((i) => mono.glyph[i] === '');
    expect(holes.length).toBeGreaterThanOrEqual(2);
    expect([...mono.kind].filter((k) => k === CELL.mark)).toHaveLength(0);
    // The rest of the body is the same picture.
    const body = ansi.glyph.map((g, i) => (eyes.includes(i) ? '' : g));
    expect(mono.glyph.filter((g, i) => g !== body[i] && !eyes.includes(i)).length).toBeLessThan(6);
  });

  it('draws the face on a hollow mono body', () => {
    const cells = cellsOf('mono', { styleOptions: { fill: 'hollow' } });
    expect(cells.glyph.some((g) => g === 'O')).toBe(true);
  });
});

describe('ascii effects stamped on the picture', () => {
  const plain = (options: Parameters<typeof renderAsciiText>[0] = {}) =>
    renderAsciiText({ shape: 'blob', ...options });

  it('writes the Zz of a sleeper', () => {
    expect(plain({ state: 'sleeping' })).toMatch(/[zZ]/);
    expect(plain({ state: 'idle' })).not.toMatch(/[zZ]/);
  });

  it('writes the heart of a happy character', () => {
    expect(plain({ state: 'happy' })).toContain('♥');
    expect(plain({ state: 'idle' })).not.toContain('♥');
  });

  it('writes the bang of an alert and the stars of a celebration', () => {
    expect(plain({ state: 'alerting' })).toContain('!');
    expect(plain({ state: 'celebrate' })).toContain('*');
  });

  it('writes an effect in the colour the pixel series gives it', () => {
    const svg = ascii({ shape: 'blob', state: 'happy', color: 'blue' });
    const heart = /<text[^>]*fill="#FF6F91"[^>]*>(.*?)<\/text>/.exec(svg);
    expect(heart?.[1]).toContain('♥');
  });
});

describe('ascii effects', () => {
  const charset = CHARSETS.ascii;
  const make = () => {
    const grid = createCharGrid(12, 8);
    for (let i = 0; i < grid.glyph.length; i++) {
      if (i % 12 < 2 || i % 12 > 9) continue;
      grid.glyph[i] = '+';
      grid.paint[i] = 1;
      grid.kind[i] = CELL.fill;
    }
    return grid;
  };
  const ctx = (time: number, extra = {}) => ({
    time,
    fps: 12,
    seed: 'effects',
    stateSince: 0,
    charset,
    settled: false,
    ...extra,
  });
  const changed = (a: ReturnType<typeof make>, b: ReturnType<typeof make>) =>
    a.glyph.reduce((n, g, i) => n + (g === b.glyph[i] ? 0 : 1), 0);

  it('lists an effect for every id but none', () => {
    expect(Object.keys(ASCII_EFFECTS)).toEqual(['decode', 'shimmer', 'glitch']);
  });

  it.each(['decode', 'shimmer', 'glitch'] as const)(
    '%s gives the same grid for the same inputs',
    (effect) => {
      for (const time of [0.03, 0.31, 0.45, 1.2, 7.5]) {
        const a = make();
        const b = make();
        applyEffect(a, effect, ctx(time));
        applyEffect(b, effect, ctx(time));
        expect(a, `${effect} at ${time}`).toEqual(b);
      }
    },
  );

  it.each(['decode', 'shimmer', 'glitch'] as const)('%s leaves a settled frame alone', (effect) => {
    for (const time of [0.03, 0.2, 0.4, 1.2]) {
      const grid = make();
      applyEffect(grid, effect, ctx(time, { settled: true }));
      expect(grid).toEqual(make());
    }
  });

  it('plays no effect for none', () => {
    const grid = make();
    applyEffect(grid, 'none', ctx(0.01));
    expect(grid).toEqual(make());
  });

  it('scrambles a decoding grid just after the state changed and resolves it within 0.45 s', () => {
    const start = make();
    const early = make();
    applyEffect(early, 'decode', ctx(0.02));
    const body = start.glyph.filter((g) => g !== '').length;
    expect(changed(early, start)).toBeGreaterThan(body * 0.8);
    for (let i = 0; i < early.glyph.length; i++) {
      if (start.glyph[i] === '') expect(early.glyph[i]).toBe('');
      else expect(charset.noise).toContain(early.glyph[i]);
    }
    // Paint and kind stay where they were.
    expect(early.paint).toEqual(start.paint);

    let last = body;
    for (const time of [0.1, 0.2, 0.3, 0.4]) {
      const grid = make();
      applyEffect(grid, 'decode', ctx(time));
      const left = changed(grid, start);
      expect(left).toBeLessThanOrEqual(last);
      last = left;
    }
    for (const time of [0.45, 0.46, 3]) {
      const grid = make();
      applyEffect(grid, 'decode', ctx(time));
      expect(grid).toEqual(start);
    }
  });

  it('decodes from when the state changed, not from the start of time', () => {
    const grid = make();
    applyEffect(grid, 'decode', ctx(10.02, { stateSince: 10 }));
    expect(changed(grid, make())).toBeGreaterThan(0);
    const later = make();
    applyEffect(later, 'decode', ctx(10.6, { stateSince: 10 }));
    expect(later).toEqual(make());
  });

  it('resolves the top of a decoding grid before the bottom', () => {
    let top = 0;
    let bottom = 0;
    for (let k = 0; k < 20; k++) {
      const grid = make();
      applyEffect(grid, 'decode', ctx(0.2, { seed: `s${k}` }));
      grid.glyph.forEach((g, i) => {
        if (g === '+' || g === '') return;
        if (i < grid.glyph.length / 2) top++;
        else bottom++;
      });
    }
    expect(bottom).toBeGreaterThan(top);
  });

  it('sweeps a band of light across the body now and then', () => {
    const lit = (time: number) => {
      const grid = make();
      applyEffect(grid, 'shimmer', ctx(time));
      return grid.glyph.filter((g) => g === CHARSETS.ascii.fill(1, 0, 0)).length;
    };
    expect(lit(0.45)).toBeGreaterThan(0);
    expect(lit(1.5)).toBe(0);
    expect(lit(3.2 + 0.45)).toBe(lit(0.45));
    // Only fill cells take the light.
    const grid = make();
    grid.kind[grid.cols * 2 + 4] = CELL.edge;
    applyEffect(grid, 'shimmer', ctx(0.45));
    expect(grid.glyph[grid.cols * 2 + 4]).toBe('+');
  });

  it('glitches in a few slots out of a hundred, by slipping rows and scrambling cells', () => {
    let glitching = 0;
    const slots = 600;
    for (let slot = 0; slot < slots; slot++) {
      const grid = make();
      applyEffect(grid, 'glitch', ctx(slot / 12 + 0.01));
      if (changed(grid, make()) > 0 || grid.glyph.some((g, i) => g !== '' && g !== '+' && i >= 0)) {
        glitching++;
        // Everything that is left is a glyph, the noise or a body cell; nothing was invented.
        for (const g of grid.glyph) expect(g === '' || g === '+' || charset.noise.includes(g)).toBe(true);
      }
    }
    expect(glitching).toBeGreaterThan(slots * 0.01);
    expect(glitching).toBeLessThan(slots * 0.15);
  });

  it('keeps a slot the same until the next one', () => {
    for (let slot = 0; slot < 100; slot++) {
      const a = make();
      const b = make();
      applyEffect(a, 'glitch', ctx(slot / 12 + 0.001));
      applyEffect(b, 'glitch', ctx(slot / 12 + 0.08));
      expect(a).toEqual(b);
    }
  });
});

describe('live ascii renderer', () => {
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

  const style = getStyle('ascii');
  const frames = (state: string, variant = 'ansi') => {
    const sim = createSimulation({
      shape: 'blob',
      state: state as never,
      variant,
      seed: 'live',
      compensateEyes: false,
      displaySizePx: 240,
    });
    const out: ReturnType<typeof sim.snapshot>[] = [];
    for (let i = 0; i < 40; i++) {
      sim.step(0.016 * 3);
      out.push(sim.snapshot());
    }
    sim.dispose();
    return out;
  };
  const textOf = (root: Element) => [...root.querySelectorAll('tspan')].map((t) => t.textContent).join('');

  it('mounts one SVG, draws glyphs, and removes it on destroy', () => {
    const host = mount();
    const character = createCharacter(host, { style: 'ascii', shape: 'blob', reducedMotion: true });

    expect(host.children).toHaveLength(1);
    expect(host.firstElementChild).toBe(character.element);
    expect(character.element.getAttribute('viewBox')).toBe(VIEWBOX_STR);
    expect(character.element.querySelectorAll('text').length).toBeGreaterThan(0);
    expect(character.element.querySelector('tspan')?.getAttribute('x')).toBeTruthy();

    character.destroy();
    expect(host.children).toHaveLength(0);
  });

  it('draws each variant', () => {
    for (const variant of VARIANTS) {
      const host = mount();
      const character = createCharacter(host, { style: 'ascii', variant, shape: 'hex', reducedMotion: true });
      const svg = character.element;
      expect(svg.querySelectorAll('text').length, variant).toBeGreaterThan(0);
      expect(svg.querySelector('pattern') !== null, variant).toBe(variant === 'crt');
      expect(svg.querySelector('filter') !== null, variant).toBe(variant === 'crt');
      if (variant === 'mono') expect(svg.querySelectorAll('text')).toHaveLength(1);
      character.destroy();
    }
  });

  it('leaves out the glow when asked', () => {
    const host = mount();
    const character = createCharacter(host, {
      style: 'ascii',
      variant: 'crt',
      reducedMotion: true,
      styleOptions: { glow: false },
    });
    expect(character.element.querySelector('filter')).toBeNull();
    character.destroy();
  });

  it('keeps animating on a quantised clock without ever writing NaN', () => {
    const host = mount();
    const character = createCharacter(host, {
      style: 'ascii',
      shape: 'blob',
      state: 'excited',
      styleOptions: { fps: 12 },
    });
    const before = character.element.innerHTML;
    for (let i = 0; i < 60; i++) {
      vi.advanceTimersByTime(FRAME_MS);
      expect(character.element.innerHTML).not.toContain('NaN');
    }
    expect(character.element.innerHTML).not.toBe(before);
    character.destroy();
  });

  it('draws the same frame twice without touching the DOM the second time', () => {
    for (const effect of ['none', 'decode', 'shimmer', 'glitch']) {
      const host = mount();
      const live = style.createRenderer(host, {
        seed: 'idem',
        styleOptions: resolveStyleOptions(style, { effect }),
      });
      const all = frames('idle');
      const frame = all[3]!;
      live.draw(frame);

      const observer = new MutationObserver(() => {});
      observer.observe(live.element, {
        attributes: true,
        childList: true,
        subtree: true,
        characterData: true,
      });
      live.draw(frame);
      live.draw(frame);
      expect(observer.takeRecords(), effect).toHaveLength(0);
      observer.disconnect();
      live.destroy();
    }
  });

  it('leaves the DOM alone for a frame that falls in the same motion slot', () => {
    const host = mount();
    const live = style.createRenderer(host, {
      seed: 'slot',
      styleOptions: resolveStyleOptions(style, { fps: 4, effect: 'none' }),
    });
    const all = frames('idle');
    live.draw(all[0]!);
    const observer = new MutationObserver(() => {});
    observer.observe(live.element, { attributes: true, childList: true, subtree: true, characterData: true });
    const next = all.find(
      (f) => f.time !== all[0]!.time && Math.floor(f.time * 4) === Math.floor(all[0]!.time * 4),
    );
    expect(next).toBeDefined();
    live.draw(next!);
    expect(observer.takeRecords()).toHaveLength(0);
    observer.disconnect();
    live.destroy();
  });

  it('decodes into the picture after a state change and then stays still', () => {
    const host = mount();
    const decoding = style.createRenderer(host, {
      seed: 'decode',
      styleOptions: resolveStyleOptions(style, { effect: 'decode', fps: 0 }),
    });
    const plain = style.createRenderer(mount(), {
      seed: 'decode',
      styleOptions: resolveStyleOptions(style, { effect: 'none', fps: 0 }),
    });
    const all = frames('idle');
    const first = all[0]!;
    decoding.draw(first);
    plain.draw(first);
    expect(textOf(decoding.element)).not.toBe(textOf(plain.element));
    expect(textOf(decoding.element)).toHaveLength(textOf(plain.element).length);

    const settled = all[all.length - 1]!;
    expect(settled.time - first.time).toBeGreaterThan(0.45);
    decoding.draw(settled);
    plain.draw(settled);
    expect(textOf(decoding.element)).toBe(textOf(plain.element));

    // A new state decodes again, from where it changed.
    const next = frames('happy').at(-1)!;
    const shifted = { ...next, time: settled.time + 0.016 };
    decoding.draw(shifted);
    plain.draw(shifted);
    expect(textOf(decoding.element)).not.toBe(textOf(plain.element));
    decoding.destroy();
    plain.destroy();
  });

  it('does not play an effect on a settled frame', () => {
    const host = mount();
    const live = style.createRenderer(host, { seed: 's', styleOptions: resolveStyleOptions(style) });
    const plain = style.createRenderer(mount(), {
      seed: 's',
      styleOptions: resolveStyleOptions(style, { effect: 'none' }),
    });
    const frame = { ...frames('idle')[0]!, settled: true };
    live.draw(frame);
    plain.draw(frame);
    expect(textOf(live.element)).toBe(textOf(plain.element));
    live.destroy();
    plain.destroy();
  });

  it('lays a different grid with styleOptions, live and through configure', () => {
    const host = mount();
    const character = createCharacter(host, {
      style: 'ascii',
      shape: 'blob',
      reducedMotion: true,
      styleOptions: { cols: 16 },
    });
    const coarse = textOf(character.element).length;
    character.update({ styleOptions: { cols: 48 } });
    const fine = textOf(character.element).length;
    expect(coarse).toBeGreaterThan(0);
    expect(fine).toBeGreaterThan(coarse * 2);
    expect(character.element.innerHTML).not.toContain('NaN');
    character.destroy();
  });

  it('redraws the frame on screen when the charset or fill changes', () => {
    const host = mount();
    const live = style.createRenderer(host, {
      seed: 'cfg',
      styleOptions: resolveStyleOptions(style, { effect: 'none' }),
    });
    live.draw(frames('idle')[5]!);
    const letters = textOf(live.element);
    live.configure(resolveStyleOptions(style, { effect: 'none', charset: 'braille' }));
    const braille = textOf(live.element);
    expect(braille).not.toBe(letters);
    expect(braille).toMatch(/[\u2800-\u28ff]/);
    live.configure(resolveStyleOptions(style, { effect: 'none', charset: 'ascii', fill: 'hollow' }));
    expect(textOf(live.element).length).toBeLessThan(letters.length);
    live.destroy();
  });

  it('switches series at runtime without touching the simulation', () => {
    const host = mount();
    const character = createCharacter(host, { shape: 'blob', state: 'happy', reducedMotion: true });
    const vector = character.element;
    character.update({ style: 'ascii', variant: 'crt' });
    expect(character.element).not.toBe(vector);
    expect(vector.isConnected).toBe(false);
    expect(character.element.querySelector('text')).not.toBeNull();
    expect(character.element.querySelector('pattern')).not.toBeNull();
    character.update({ style: 'vector' });
    expect(character.element.querySelector('text')).toBeNull();
    character.destroy();
    expect(host.children).toHaveLength(0);
  });

  it('writes the id of the source group, for a mirror to use', () => {
    const host = mount();
    const live = style.createRenderer(host, {
      seed: 'src',
      sourceId: 'mark-1',
      styleOptions: resolveStyleOptions(style),
    });
    live.draw(frames('idle')[0]!);
    expect(live.element.querySelector('#mark-1')).not.toBeNull();
    live.destroy();
  });
});

describe('live and static agree', () => {
  it('draw the same glyphs in the same places for the same frame', () => {
    const style = getStyle('ascii');
    for (const variant of VARIANTS) {
      for (const charset of ASCII_CHARSET_IDS) {
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
        const styleOptions = resolveStyleOptions(style, { charset });
        const live = style.createRenderer(host, { seed: 'consistency', styleOptions });
        live.draw(frame);
        const markup = style.renderStatic(frame, { color: 'black', flat: true, uid: 'x', styleOptions });

        // The colours are written differently (CSS against hex); the glyphs and where they sit are not.
        const liveRows = [...host.querySelectorAll('tspan')]
          .map((t) => `${t.getAttribute('y')}|${t.getAttribute('x')}|${t.textContent}`)
          .sort();
        const staticRows = [...markup.matchAll(/<tspan x="([^"]*)" y="([^"]*)">([^<]*)<\/tspan>/g)]
          .map((m) => `${m[2]}|${m[1]}|${unescape(m[3]!)}`)
          .sort();
        expect(liveRows.length, `${variant}/${charset}`).toBeGreaterThan(0);
        expect(liveRows, `${variant}/${charset}`).toEqual(staticRows);
        live.destroy();
        host.remove();
      }
    }
  });
});

describe('renderAsciiText', () => {
  // eslint-disable-next-line no-control-regex
  const ESC = String.fromCharCode(27);
  const strip = (text: string) => text.replace(new RegExp(`${ESC}\\[[\\d;]*m`, 'g'), '');

  it('draws the character as lines of text', () => {
    const text = renderAsciiText({ shape: 'blob', state: 'happy' });
    const lines = text.split('\n');
    expect(lines.length).toBeGreaterThan(8);
    expect(text).toMatch(/O/);
    expect(text).not.toContain('NaN');
    for (const line of lines) expect(line).not.toMatch(/ $/);
    // No blank line at either end.
    expect(lines[0]).not.toBe('');
    expect(lines.at(-1)).not.toBe('');
  });

  it('is deterministic', () => {
    for (const ansi of [false, true]) {
      const options = { shape: 'tofu', state: 'curious', color: 'blue', ansi } as const;
      expect(renderAsciiText(options)).toBe(renderAsciiText(options));
    }
  });

  it('freezes a few pictures', () => {
    expect(renderAsciiText({ shape: 'blob', state: 'idle' })).toMatchSnapshot();
    expect(renderAsciiText({ shape: 'cloud', state: 'sleeping' })).toMatchSnapshot();
    expect(
      renderAsciiText({ shape: 'mochi', state: 'happy', styleOptions: { charset: 'braille' } }),
    ).toMatchSnapshot();
    expect(
      renderAsciiText({
        shape: 'hex',
        state: 'thinking',
        variant: 'mono',
        styleOptions: { charset: 'block', fill: 'hollow' },
      }),
    ).toMatchSnapshot();
  });

  it('is the picture of the static document, as text', () => {
    const options = { shape: 'blob', state: 'thinking' } as const;
    const document = tspans(ascii(options));
    const text = renderAsciiText(options);
    const glyphs = (s: string) =>
      [...s]
        .filter((c) => c !== ' ' && c !== '\n')
        .sort()
        .join('');
    expect(glyphs(text)).toBe(glyphs(document.map((t) => t.text).join('')));
  });

  it('is always the ascii series, whatever style is asked', () => {
    expect(renderAsciiText({ shape: 'blob', style: 'pixel' })).toBe(renderAsciiText({ shape: 'blob' }));
  });

  it('colours runs of one colour in 24-bit codes, and nothing else', () => {
    const plain = renderAsciiText({ shape: 'blob', state: 'happy', color: 'blue' });
    const text = renderAsciiText({ shape: 'blob', state: 'happy', color: 'blue', ansi: true });
    expect(text).toContain('\x1b[38;2;');
    expect(strip(text)).toBe(plain);
    for (const line of text.split('\n')) {
      if (line.includes('\x1b[38;2;')) expect(line.endsWith('\x1b[0m')).toBe(true);
    }
    // Cheeks and the heart have colours of their own: #FF9DBB and #FF6F91.
    expect(text).toContain('\x1b[38;2;255;157;187m');
    expect(text).toContain('\x1b[38;2;255;111;145m');
    expect(plain).not.toContain('\x1b');
  });

  it('writes mono in one ink', () => {
    const text = renderAsciiText({ shape: 'blob', state: 'happy', variant: 'mono', ansi: true });
    const codes = new Set(text.match(new RegExp(`${ESC}\\[38;2;[\\d;]+m`, 'g')));
    expect(codes.size).toBe(1);
  });

  it('writes the other charsets', () => {
    expect(renderAsciiText({ shape: 'blob', styleOptions: { charset: 'braille' } })).toMatch(
      /[\u2801-\u28ff]/,
    );
    expect(renderAsciiText({ shape: 'blob', styleOptions: { charset: 'block' } })).toMatch(/[▀▄█▌▐░▒▓]/);
  });

  it('draws more columns for more columns', () => {
    const width = (text: string) => Math.max(...text.split('\n').map((l) => l.length));
    expect(width(renderAsciiText({ shape: 'blob', styleOptions: { cols: 48 } }))).toBeGreaterThan(
      width(renderAsciiText({ shape: 'blob', styleOptions: { cols: 16 } })) * 2,
    );
  });
});
