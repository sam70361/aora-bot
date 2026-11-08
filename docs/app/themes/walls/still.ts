import { renderStaticSvg, type CharacterState } from '@aora-bot/react';
import { mulberry32 } from '@aora-bot/engine';
import { markOf, type ThemeCard } from '../catalog.js';

/*
 * What the exhibition draws its stills with. A still is a card by the same
 * rule as the card itself (`themeLook` through `buildAlbum`), so a theme's
 * skin, colours and face reach the walls with nothing here naming them.
 */

const stills = new Map<string, string>();

const keyOf = (card: ThemeCard, state: CharacterState, sizePx: number) => {
  const { shape, color, style, variant, face } = card.preset;
  return [card.id, shape, color, style, variant, face, card.nose, state, sizePx].join('|');
};

/**
 * A card's still in one state, inlined the way `StillMark` inlines it: the eye
 * cut-outs and the ink read the page's custom properties, so one string serves
 * both colour modes. Drawn once per page: a themed still can take a frame or
 * more to draw, and a booklet, a card, the shelf's wall and a sticker all ask
 * for the same ones.
 */
export function stillOf(card: ThemeCard, state: CharacterState, sizePx: number): string {
  const key = keyOf(card, state, sizePx);
  let still = stills.get(key);
  if (still === undefined) {
    still = renderStaticSvg({
      ...markOf(card.preset, card.nose),
      state,
      sizePx,
      colorScheme: 'page',
    });
    stills.set(key, still);
  }
  return still;
}

/** Whether `stillOf` has this one already, so asking for it costs nothing. */
export const hasStill = (card: ThemeCard, state: CharacterState, sizePx: number): boolean =>
  stills.has(keyOf(card, state, sizePx));

/**
 * Run `task` once the main thread is idle, or after `timeout` ms at the latest.
 * Returns the cancel. One still costs one task, so a wall fills one tile per
 * call and never holds the thread for a whole wall.
 */
export function whenIdle(task: () => void, timeout = 2000): () => void {
  if ('requestIdleCallback' in window) {
    const handle = window.requestIdleCallback(task, { timeout });
    return () => window.cancelIdleCallback(handle);
  }
  // Safari has no idle callback: just after a paint is the nearest thing, most of a frame before the next.
  let timer = 0;
  const frame = requestAnimationFrame(() => {
    timer = window.setTimeout(task, 0);
  });
  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
  };
}

/** `list` in a seeded order: the same order on every visit. */
export function shuffled<T>(list: readonly T[], seed: number): T[] {
  const random = mulberry32(seed);
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
