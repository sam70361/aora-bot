import { LocaleProvider } from '@aora-bot/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SurfaceLocaleProvider, surfaceEnUS, surfaceZhCN, useSurfaceLocale } from '../src/locale/index.js';
import { TEMPLATE_ERROR_KEYS } from '../src/template/normalizeTemplateDraft.js';

const keys = (table: Record<string, string>) => Object.keys(table).sort();

function Probe() {
  const { id, t } = useSurfaceLocale();
  return (
    <p>
      {id}:{t('template.title')}
    </p>
  );
}

describe('surface locale', () => {
  it('has identical, non-empty keys in both languages', () => {
    expect(keys(surfaceZhCN)).toEqual(keys(surfaceEnUS));
    for (const [key, value] of [...Object.entries(surfaceEnUS), ...Object.entries(surfaceZhCN)]) {
      expect(value, key).not.toBe('');
    }
  });

  it('covers every key the template errors point at', () => {
    for (const key of Object.values(TEMPLATE_ERROR_KEYS)) expect(surfaceEnUS[key], key).toBeTruthy();
  });

  it('falls back to English outside a provider', () => {
    expect(renderToString(<Probe />)).toContain(surfaceEnUS['template.title']);
  });

  it('follows the react package locale provider', () => {
    const html = renderToString(
      <LocaleProvider locale="zh-CN">
        <Probe />
      </LocaleProvider>,
    );
    expect(html).toContain(surfaceZhCN['template.title']);
  });

  it('applies overrides, merging nested providers', () => {
    const html = renderToString(
      <SurfaceLocaleProvider overrides={{ 'template.title': 'Outer' }}>
        <SurfaceLocaleProvider overrides={{ 'template.name': 'Inner' }}>
          <Probe />
        </SurfaceLocaleProvider>
      </SurfaceLocaleProvider>,
    );
    expect(html).toContain('Outer');
  });
});
