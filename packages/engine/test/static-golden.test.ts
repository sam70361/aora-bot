// @vitest-environment happy-dom
/**
 * Static output is pinned: the hashes in `static-golden.json` were taken
 * from the engine before live characters were drawn in layers, and every
 * static document of the core's variants and shapes must still hash the
 * same, byte for byte. They were taken again once the uid came to name the
 * look as well, the documents otherwise unchanged.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCharacter, fnv1a32, installTheme, renderStaticSvg } from '../src/index.js';
import golden from './static-golden.json';
import { FIXTURE, FLAG, ROCKER } from './extras-fixture.js';

const STATES = ['idle', 'happy', 'sleeping', 'celebrate', 'thinking', 'excited', 'sad'] as const;
const hash = (svg: string): string => fnv1a32(svg).toString(36);

describe('static output', () => {
  it('is byte-identical to the documents pinned before the layered live renderer', () => {
    const entries = Object.entries(golden as Record<string, string>);
    expect(entries.length).toBeGreaterThan(400);
    const differ: string[] = [];
    for (const [key, want] of entries) {
      const [, variant, shape, state] = key.split('|');
      const svg = renderStaticSvg({
        shape: shape as 'mochi',
        variant: variant as 'solid',
        state: state as 'idle',
        color: 'orange',
        sizePx: 120,
      });
      if (hash(svg) !== want) differ.push(key);
    }
    expect(differ).toEqual([]);
  });

  describe('of a theme', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.body.replaceChildren();
    });

    it('stays the same whether or not live characters are drawn in layers on the page', () => {
      installTheme(FIXTURE);
      const looks = [
        { shape: FLAG, variant: 'fixdoodle' },
        { shape: ROCKER, variant: 'solid' },
        { shape: 'mochi', variant: 'fixdoodle' },
      ] as const;
      const render = () =>
        looks.flatMap((look) =>
          STATES.map((state) => renderStaticSvg({ ...look, state, color: 'orange', sizePx: 120 })),
        );
      const before = render();
      for (const svg of before) {
        expect(svg).not.toContain('foreignObject');
        expect(svg).not.toContain('aora-anim');
      }
      vi.useFakeTimers({
        toFake: [
          'setTimeout',
          'clearTimeout',
          'requestAnimationFrame',
          'cancelAnimationFrame',
          'performance',
        ],
      });
      const characters = looks.map((look) => {
        const host = document.createElement('div');
        document.body.appendChild(host);
        return createCharacter(host, { ...look, state: 'happy', reducedMotion: false });
      });
      vi.advanceTimersByTime(100);
      expect(characters[0]!.element.querySelector('foreignObject')).not.toBeNull();
      expect(render()).toEqual(before);
      for (const character of characters) character.destroy();
    });
  });
});
