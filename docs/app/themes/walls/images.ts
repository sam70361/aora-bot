import { getInkColorCss, type CharacterState, type ColorId } from '@aora-bot/react';
import type { ThemeCard } from '../catalog.js';
import { hasStill, stillOf, whenIdle } from './still.js';

/*
 * The walls' stills as images.
 *
 * An inline still is thousands of nodes with a stylesheet of their own: every
 * swap parses, styles and repaints them, and the sticker's die-cut edge, a
 * filter, is redrawn with them. An image is one node. The browser decodes it
 * once, off the page's style and layout, and showing another one is a change
 * of source that the compositor can cross-fade.
 *
 * An image cannot see the page, so what the drawing reads from it travels
 * inside it: the page's custom properties as they compute where the image
 * sits, and `color-scheme: light dark`, which hands the image the scheme of
 * the element showing it, so the `light-dark()` pairs inside follow the
 * site's theme switch as an inline still does. A sticker's die-cut edge and
 * shadow are drawn inside the image too, as the same filter in the image's
 * own units, so they cost nothing once it is decoded.
 */

/** The page's values a drawing reads, by custom property name. */
export type PageValues = Readonly<Record<string, string>>;

/** A sticker's die-cut edge, in CSS px of the box the still fills, and its paper. */
export interface DieCut {
  edgePx: number;
  paper: string;
}

/** How far the sticker's shadow drops and how soft it is, in CSS px: the CSS `drop-shadow(0 4px 4px)` it replaces. */
const SHADOW_DY_PX = 4;
const SHADOW_BLUR_PX = 4;
const SHADOW_ALPHA = 0.32;

const PAGE_VAR = /var\((--aora-[\w-]+)/g;

/** The page properties a drawing reads. */
export const pageVarsOf = (svg: string): string[] => [
  ...new Set(Array.from(svg.matchAll(PAGE_VAR), (m) => m[1]!)),
];

/** The values of `names` as they compute on `element`. */
export function pageValues(element: Element, names: Iterable<string>): PageValues {
  const style = getComputedStyle(element);
  const values: Record<string, string> = {};
  for (const name of names) {
    const value = style.getPropertyValue(name).trim();
    if (value) values[name] = value;
  }
  return values;
}

const attr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const num = (n: number) => String(Math.round(n * 1000) / 1000);

/**
 * A still as a self-contained SVG document. Its box grows by `bleed` (a share
 * of the box on each side) so a die-cut edge and shadow stay in the picture;
 * the image is placed that much past its box to match, and `clip` keeps the
 * drawing itself to its old box, as an inline still is. `boxPx` is the CSS
 * size of the box the inline still filled, which sets the die-cut in the
 * drawing's own units.
 */
export function toImage(
  svg: string,
  color: ColorId,
  values: PageValues,
  { bleed, boxPx, cut, clip }: { bleed: number; boxPx: number; cut?: DieCut; clip?: boolean },
): string {
  const end = svg.indexOf('>');
  let open = svg.slice(0, end);
  const close = svg.lastIndexOf('</svg>');
  let body = svg.slice(end + 1, close);
  const box = /\sviewBox="([^"]+)"/
    .exec(open)?.[1]
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (box && box.length === 4 && box.every(Number.isFinite)) {
    const [x, y, w, h] = box as [number, number, number, number];
    const grow = 1 + bleed * 2;
    const area = [x - w * bleed, y - h * bleed, w * grow, h * grow].map(num);
    open = open
      .replace(/\sviewBox="[^"]+"/, ` viewBox="${area.join(' ')}"`)
      .replace(
        /\s(width|height)="([\d.]+)"/g,
        (_m, side: string, size: string) => ` ${side}="${num(Number(size) * grow)}"`,
      );
    // An inline still is clipped to its box; the bleed is for the die-cut alone.
    if (clip) {
      body = `<clipPath id="box"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath><g clip-path="url(#box)">${body}</g>`;
    }
    if (cut) {
      const unit = w / boxPx;
      const [fx, fy, fw, fh] = area;
      body =
        `<defs><filter id="die" filterUnits="userSpaceOnUse" x="${fx}" y="${fy}" width="${fw}" height="${fh}" color-interpolation-filters="sRGB">` +
        `<feMorphology in="SourceAlpha" operator="dilate" radius="${num(cut.edgePx * unit)}" result="grow"/>` +
        `<feFlood style="flood-color:${attr(cut.paper)}"/><feComposite in2="grow" operator="in" result="edge"/>` +
        `<feMerge result="cut"><feMergeNode in="edge"/><feMergeNode in="SourceGraphic"/></feMerge>` +
        `<feDropShadow in="cut" dx="0" dy="${num(SHADOW_DY_PX * unit)}" stdDeviation="${num((SHADOW_BLUR_PX / 2) * unit)}" flood-color="#000" flood-opacity="${SHADOW_ALPHA}"/>` +
        `</filter></defs><g filter="url(#die)">${body}</g>`;
    }
  }
  const declarations = ['color-scheme:light dark'];
  for (const name of pageVarsOf(svg)) {
    // A still sets the ink on itself, over whatever the page says.
    const value = name === '--aora-fg' ? getInkColorCss(color) : values[name];
    if (value) declarations.push(`${name}:${value}`);
  }
  const style = attr(declarations.join(';'));
  open = /\sstyle="/.test(open) ? open.replace(/\sstyle="/, ` style="${style};`) : `${open} style="${style}"`;
  return `${open}>${body}</svg>`;
}

/** An image's markup as a URL that lives until it is revoked, decoded before it is handed back, so showing it costs nothing. */
export async function decodedUrl(image: string): Promise<string> {
  const url = URL.createObjectURL(new Blob([image], { type: 'image/svg+xml' }));
  const probe = new Image();
  probe.src = url;
  try {
    await probe.decode();
  } catch {
    // A decode that fails still leaves a usable URL: the image then decodes when it is shown.
  }
  return url;
}

/** What a still is drawn from: the card, its state and its size. */
export interface StillJob {
  theme: string;
  card: ThemeCard;
  state: CharacterState;
  sizePx: number;
}

export interface StillRequest {
  id: number;
  theme: string;
  mark: Pick<ThemeCard['preset'], 'shape' | 'color' | 'style' | 'variant' | 'face'> & {
    nose?: ThemeCard['nose'];
  };
  state: CharacterState;
  sizePx: number;
}

export type StillReply = { id: number; svg: string } | { id: number; error: string };

/** Draws stills one at a time, in a worker where the browser will start one, else on this thread in idle slices. */
export interface StillDrawer {
  draw(job: StillJob): Promise<string>;
  close(): void;
}

function drawHere(): StillDrawer {
  const cancels = new Set<() => void>();
  return {
    draw: (job) =>
      new Promise((resolve, reject) => {
        const cancel = whenIdle(() => {
          cancels.delete(cancel);
          try {
            resolve(stillOf(job.card, job.state, job.sizePx));
          } catch (error) {
            reject(error);
          }
        });
        cancels.add(cancel);
      }),
    close: () => {
      for (const cancel of cancels) cancel();
      cancels.clear();
    },
  };
}

/**
 * The drawer the walls use. A still the page has drawn already (a card's, a
 * booklet's) is taken from it as it is. Any other is drawn in a worker, started
 * at the first such still, so a wall that needs none never fetches it; the
 * worker loads the engine's static half and the theme's entry, both already in
 * the browser's cache, and draws there. A theme it cannot draw falls back to
 * this thread, one still per idle slice.
 */
export function stillDrawer(): StillDrawer {
  const here = drawHere();
  const pending = new Map<
    number,
    { job: StillJob; resolve: (svg: string) => void; reject: (error: unknown) => void }
  >();
  let next = 0;
  let worker: Worker | null = null;
  let broken = false;
  const fallBack = (id: number) => {
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    here.draw(entry.job).then(entry.resolve, entry.reject);
  };
  const start = (): Worker | null => {
    if (broken) return null;
    if (worker) return worker;
    try {
      worker = new Worker(new URL('./stills.worker.ts', import.meta.url));
    } catch {
      broken = true;
      return null;
    }
    worker.addEventListener('message', ({ data }: MessageEvent<StillReply>) => {
      if ('svg' in data) {
        pending.get(data.id)?.resolve(data.svg);
        pending.delete(data.id);
      } else fallBack(data.id);
    });
    worker.addEventListener('error', () => {
      broken = true;
      for (const id of pending.keys()) fallBack(id);
    });
    return worker;
  };
  return {
    draw: (job) => {
      if (hasStill(job.card, job.state, job.sizePx))
        return Promise.resolve(stillOf(job.card, job.state, job.sizePx));
      const drawer = start();
      if (!drawer) return here.draw(job);
      return new Promise((resolve, reject) => {
        const id = next++;
        pending.set(id, { job, resolve, reject });
        const { shape, color, style, variant, face } = job.card.preset;
        const request: StillRequest = {
          id,
          theme: job.theme,
          mark: { shape, color, style, variant, face, nose: job.card.nose },
          state: job.state,
          sizePx: job.sizePx,
        };
        drawer.postMessage(request, []);
      });
    },
    close: () => {
      worker?.terminate();
      pending.clear();
      here.close();
    },
  };
}
