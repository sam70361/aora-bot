import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SHAPE_IDS, enUS, zhCN, type LocaleKey } from '../src/index.js';
import { CharacterMark } from '../src/index.js';

/* Every character is labelled, and the mark draws the shape it is given. */

describe('roster labels', () => {
  it.each(SHAPE_IDS)('names %s in both languages', (id) => {
    const key = `shape.${id}` as LocaleKey;
    expect(enUS[key]).toBeTruthy();
    expect(zhCN[key]).toBeTruthy();
  });
});

describe('shapes on the mark', () => {
  it('draws the shape it is given', () => {
    expect(renderToString(<CharacterMark shape="gem" color="blue" />)).toContain('data-shape="gem"');
  });

  it('defaults to mochi', () => {
    expect(renderToString(<CharacterMark color="blue" />)).toContain('data-shape="mochi"');
  });

  it('sets the leaf colour next to the ink', () => {
    expect(renderToString(<CharacterMark shape="sprout" color="blue" />)).toContain('--aora-leaf:#34B36B');
  });
});
