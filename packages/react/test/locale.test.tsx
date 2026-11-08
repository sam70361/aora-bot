import {
  BELT_KINDS,
  CHARACTER_STATES,
  COLOR_IDS,
  EYE_TOPOLOGY_IDS,
  FACE_STYLES,
  getStyle,
  HUD_KINDS,
  MOUTH_IDS,
  SHAPE_IDS,
  STYLE_IDS,
} from '@aora-bot/engine';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { enUS, LocaleProvider, useLabel, useLocale, zhCN, type LocaleKey } from '../src/locale/index.js';

/*
 * The locale is mostly generated from the engine's identifier lists, which
 * moves the risk: a missing string is caught by the compiler, but a family
 * that silently stops covering a list is not. These tests are about coverage
 * and parity rather than about any particular translation.
 */

const keys = (table: Record<string, string>) => Object.keys(table).sort();

describe('locale', () => {
  it('has identical keys in both languages', () => {
    expect(keys(zhCN)).toEqual(keys(enUS));
  });

  it('has no empty strings', () => {
    for (const [key, value] of Object.entries({ ...enUS })) expect(value, key).not.toBe('');
    for (const [key, value] of Object.entries(zhCN)) expect(value, key).not.toBe('');
  });

  it.each([
    ['shape', SHAPE_IDS],
    ['color', COLOR_IDS],
    ['state', CHARACTER_STATES],
    ['stateDesc', CHARACTER_STATES],
    ['belt', BELT_KINDS],
    ['mouth', MOUTH_IDS],
    ['hud', HUD_KINDS],
    ['expression', EYE_TOPOLOGY_IDS],
    ['face', FACE_STYLES],
  ])('covers every %s the engine defines', (family, ids) => {
    for (const id of ids) {
      const key = `${family}.${id}` as LocaleKey;
      expect(enUS[key], key).toBeTruthy();
      expect(zhCN[key], key).toBeTruthy();
    }
  });

  it('names every variant and every parameter of the built-in series', () => {
    // Series are an open registry, so these keys are not checked by the compiler.
    for (const id of STYLE_IDS) {
      const style = getStyle(id);
      const wanted = [
        ...style.variants.map((variant) => `variant.${variant}`),
        ...Object.keys(style.params).map((param) => `param.${id}.${param}`),
      ];
      for (const key of wanted) {
        expect(enUS[key as LocaleKey], key).toBeTruthy();
        expect(zhCN[key as LocaleKey], key).toBeTruthy();
      }
    }
  });

  it('translates shape and mouth ids', () => {
    expect(enUS['shape.hex']).toBe('Hexagon');
    expect(zhCN['shape.hex']).toBe('六边');
    expect(zhCN['shape.mochi']).toBe('麻薯');
    expect(zhCN['shape.bunny']).toBeTruthy();
    expect(zhCN['mouth.hum']).toBeTruthy();
    expect(zhCN['mouth.tight']).toBeTruthy();
  });

  it('takes the HUD names from the engine rather than keeping a second copy', () => {
    expect(enUS['hud.context']).toBe('Context');
    expect(zhCN['hud.context']).toBe('上下文');
  });
});

function Labels() {
  const label = useLabel();
  const { id } = useLocale();
  return (
    <p>
      {id}:{label.shape('pebble')}/{label.color('violet')}/{label.state('humming')}/{label.belt('pencil')}/
      {label.hud('progress')}/{label.mouth('tight')}/{label.expression('wink')}/{label.stateDesc('idle')}
    </p>
  );
}

describe('useLabel', () => {
  it('looks up an id in every family', () => {
    const html = renderToString(<Labels />);
    expect(html).toContain('Pebble');
    expect(html).toContain('Violet');
    expect(html).toContain('Humming');
    expect(html).toContain('Pencil');
    expect(html).toContain('Progress');
    expect(html).toContain('Tight');
    expect(html).toContain('Wink');
    expect(html).toContain(enUS['stateDesc.idle']);
  });

  it('names the face, the nose, the series and the variant, and falls back to the id for an open registry', () => {
    function Open() {
      const label = useLabel();
      const names = [
        label.face('cute'),
        label.nose('hook'),
        label.style('pixel'),
        label.variant('riso'),
        label.style('custom'),
        label.variant('nope', 'Fallback'),
        label.stateGroup('more', 'Elsewhere'),
      ];
      return <p>{names.join('/')}</p>;
    }
    const names = [enUS['face.cute'], enUS['nose.hook'], enUS['style.pixel'], enUS['variant.riso']];
    expect(renderToString(<Open />)).toContain([...names, 'custom', 'Fallback', 'Elsewhere'].join('/'));
  });

  it('follows the provider', () => {
    const html = renderToString(
      <LocaleProvider locale="zh-CN">
        <Labels />
      </LocaleProvider>,
    );
    expect(html).toContain('石子');
    expect(html).toContain('哼歌');
    expect(html).toContain('铅笔');
  });

  it('honours an override for a generated key', () => {
    const html = renderToString(
      <LocaleProvider overrides={{ 'shape.pebble': 'Stone' }}>
        <Labels />
      </LocaleProvider>,
    );
    expect(html).toContain('Stone');
  });
});
