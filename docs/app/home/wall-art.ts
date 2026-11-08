import {
  getInkColorCss,
  loadThemes,
  renderStaticSvg,
  themesNeeded,
  type CharacterState,
  type ColorId,
  type FaceStyle,
  type ShapeId,
} from '@aora-bot/engine/static';

/*
 * The wall's tiles as images.
 *
 * A tile is the same drawing `StillMark` inlines, handed to the page as an
 * `<img>`: three hundred inline SVGs bring thousands of nodes and a
 * stylesheet each into the document, and every frame the big character
 * animates or the swatch changes, the browser walks all of them again. An
 * image is one node, styled once.
 *
 * An image cannot see the page, so what the drawing reads from it travels
 * inside it: the page's custom properties as they compute where the tile sits,
 * and `color-scheme: light dark`, which hands the image the scheme of the
 * element showing it — the `light-dark()` pairs inside then follow the site's
 * theme switch as an inline drawing does.
 *
 * Drawing runs in a worker where there is one (`wall.worker.ts`), so none of
 * it lands on the thread that answers the console.
 */

export interface TileArt {
  shape: ShapeId;
  color: ColorId;
  state: CharacterState;
  style: string;
  variant: string;
  face: FaceStyle;
  sizePx: number;
}

export const tileKey = (t: TileArt): string =>
  `${t.style}|${t.variant}|${t.shape}|${t.color}|${t.state}|${t.face}|${t.sizePx}`;

/** Room an image keeps past its box on each side, as a share of the box: an inline mark draws with `overflow: visible`, an image clips to its edge. */
export const BLEED = 0.25;

/** The page's values a set of drawings reads, by property name, plus `color` for `currentColor`. */
export type PageValues = Readonly<Record<string, string>>;

const PAGE_VAR = /var\((--aora-[\w-]+)/g;
const pageVars = (svg: string): string[] => Array.from(svg.matchAll(PAGE_VAR), (m) => m[1]!);

const attr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const num = (n: number) => String(Math.round(n * 1000) / 1000);

function toImage(svg: string, color: ColorId, values: PageValues): string {
  const end = svg.indexOf('>');
  let open = svg.slice(0, end);
  const box = /\sviewBox="([^"]+)"/
    .exec(open)?.[1]
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (box && box.length === 4 && box.every(Number.isFinite)) {
    const [x, y, w, h] = box as [number, number, number, number];
    const grow = 1 + BLEED * 2;
    open = open
      .replace(
        /\sviewBox="[^"]+"/,
        ` viewBox="${[x - w * BLEED, y - h * BLEED, w * grow, h * grow].map(num).join(' ')}"`,
      )
      .replace(
        /\s(width|height)="([\d.]+)"/g,
        (_m, side: string, size: string) => ` ${side}="${num(Number(size) * grow)}"`,
      );
  }
  const declarations = ['color-scheme:light dark'];
  if (values.color) declarations.push(`color:${values.color}`);
  for (const name of new Set(pageVars(svg))) {
    // `StillMark` sets the ink on the mark itself, over whatever the page says.
    const value = name === '--aora-fg' ? getInkColorCss(color) : values[name];
    if (value) declarations.push(`${name}:${value}`);
  }
  const style = attr(declarations.join(';'));
  open = /\sstyle="/.test(open) ? open.replace(/\sstyle="/, ` style="${style};`) : `${open} style="${style}"`;
  return `data:image/svg+xml,${encodeURIComponent(open + svg.slice(end))}`;
}

/**
 * Draws tiles once and turns them into image URLs for given page values.
 * The drawings are kept, so a change of values (a theme that does not use
 * `light-dark()`) only re-encodes.
 */
export class TileShop {
  private readonly drawn = new Map<string, { svg: string; color: ColorId }>();

  /** Draws what is missing and names the page properties the drawings read. `pause` lets a caller on the main thread yield between tiles. */
  async draw(tiles: readonly TileArt[], pause?: () => Promise<void>): Promise<string[]> {
    const themes = new Set(tiles.flatMap((t) => themesNeeded(t)));
    if (themes.size > 0) await loadThemes([...themes]);
    const names = new Set<string>();
    for (const tile of tiles) {
      const key = tileKey(tile);
      let entry = this.drawn.get(key);
      if (!entry) {
        // oxlint-disable-next-line no-await-in-loop -- one tile per task is the point
        if (pause) await pause();
        // The options `StillMark` draws with, so a tile is the mark it replaces.
        const svg = renderStaticSvg({ ...tile, colorScheme: 'page' });
        entry = { svg, color: tile.color };
        this.drawn.set(key, entry);
      }
      for (const name of pageVars(entry.svg)) names.add(name);
    }
    names.delete('--aora-fg');
    return [...names];
  }

  encode(keys: readonly string[], values: PageValues): [string, string][] {
    return keys.flatMap((key) => {
      const entry = this.drawn.get(key);
      return entry ? [[key, toImage(entry.svg, entry.color, values)]] : [];
    });
  }
}

export type ShopRequest =
  | { id: number; type: 'draw'; tiles: TileArt[] }
  | { id: number; type: 'encode'; keys: string[]; values: PageValues };

export type ShopReply =
  | { id: number; type: 'names'; names: string[] }
  | { id: number; type: 'urls'; urls: [string, string][] }
  | { id: number; type: 'error'; message: string };
