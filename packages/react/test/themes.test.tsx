// @vitest-environment happy-dom
import { isThemeInstalled, loadTheme } from '@aora-bot/engine';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { CharacterMark } from '../src/mark/CharacterMark.js';
import { CharacterStageProvider, StagedMark } from '../src/stage/CharacterStage.js';

/*
 * A mark that names a theme's character, member or skin holds its box, loads
 * the theme through the manifest and draws when it arrives. The order of
 * these tests matters: the first runs before anything has loaded the theme.
 */

let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.replaceChildren();
});

function render(ui: React.ReactNode): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(ui));
  return host;
}

/** Wait for the theme's entry to load and the mark to draw with it. */
async function settle(): Promise<void> {
  await act(async () => {
    await loadTheme('halloween');
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('a mark naming a theme', () => {
  it('holds its box, loads the theme and then draws', async () => {
    expect(isThemeInstalled('halloween')).toBe(false);
    const host = render(<CharacterMark shape="pumpkin" variant="doodle" sizePx={64} />);
    const mark = host.querySelector<HTMLElement>('.aora-mark')!;
    expect(mark.querySelector('svg')).toBeNull();
    expect(mark.style.width).toBe('64px');
    expect(mark.style.aspectRatio).toBe('1 / 1');

    await settle();
    expect(isThemeInstalled('halloween')).toBe(true);
    expect(mark.querySelector('svg')).not.toBeNull();
    expect(mark.dataset.variant).toBe('doodle');
    expect(mark.style.aspectRatio).toBe('');
  });

  it('draws a theme member by preset once installed, at once', () => {
    const host = render(<CharacterMark preset="floaty" />);
    const mark = host.querySelector<HTMLElement>('.aora-mark')!;
    expect(mark.dataset.shape).toBe('spook');
    expect(mark.dataset.color).toBe('cream');
    expect(mark.querySelector('svg')).not.toBeNull();
  });

  it('draws a theme character inside a stage', () => {
    const host = render(
      <CharacterStageProvider>
        <StagedMark shape="spook" variant="grainy" sizePx={40} />
      </CharacterStageProvider>,
    );
    expect(host.querySelector('[data-shape="spook"]')).not.toBeNull();
  });
});
