import {
  CHARACTER_STATES,
  COLOR_IDS,
  SHAPE_IDS,
  STATE_GROUPS,
  getInkColorCss,
  type ColorId,
  type FaceStyle,
} from '@aora-bot/react';
import { mulberry32 } from '@aora-bot/engine';
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Preset } from '../shared/share.js';
import type { StyleChoice } from './registry.js';
import {
  TileShop,
  tileKey,
  type PageValues,
  type ShopReply,
  type ShopRequest,
  type TileArt,
} from './wall-art.js';

/** The whole field turns by this much; the console in front of it stays upright. */
const TILT_DEG = -6;

/** A tile and the gap after it, in px. Narrow screens get smaller ones. */
const TILE_PX = 96;
const GAP_PX = 12;
const TILE_PX_NARROW = 64;
const GAP_PX_NARROW = 8;
const NARROW_QUERY = '(width < 900px)';

/** A character fills this share of its tile. */
const MARK_SHARE = 0.72;

/** Each row drifts at its own speed, in px per second: slow enough to read as drifting, never as scrolling. */
const SPEED_PX_MIN = 14;
const SPEED_PX_MAX = 22;

/** The stills that read well held still: a held face is what a tile shows, so it should be an expression. */
const STILL_STATE_GROUP = 'feeling';
const STILL_STATE_EXTRA: readonly string[] = ['idle'];

/**
 * The line-art wall: every tile drawn as one line, in the ink that turns with
 * the page (dark on light paper, light on dark), so the field reads as a
 * sketchbook page behind the character rather than as colour.
 */
const LINE_ART: readonly StyleChoice[] = [{ style: 'vector', variant: 'outline' }];
const LINE_INK: ColorId = 'black';

/** The wall waits for the page to go idle before drawing, but no longer than this, in ms. */
const IDLE_TIMEOUT_MS = 1500;

/** Tile images loaded per task. */
const DECODE_BATCH = 4;

type TileSpec = Pick<Preset, 'shape' | 'color' | 'state'> & { id: number };

interface RowSpec {
  id: number;
  style: string;
  variant: string;
  tiles: TileSpec[];
  /** Seconds for one trip of half the row, which is one seamless loop. */
  durationS: number;
  /** Where in the loop the row stands at rest, 0–1, so no two rows start in line. */
  phase: number;
  reverse: boolean;
}

interface Metrics {
  /** The size of the rotated box, wide and tall enough that its turned corners still cover the wall. */
  fieldW: number;
  fieldH: number;
  rows: number;
  /** Tiles in one half of a row; the row draws it twice. */
  perHalf: number;
  tile: number;
  gap: number;
}

function shuffled<T>(list: readonly T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * An endless walk through `list` that shows every item once before any repeats,
 * each lap in a new seeded order — so a row of thirty-odd shapes never leaves one out.
 */
function lapped<T>(list: readonly T[], seed: number): (index: number) => T {
  const laps: T[][] = [];
  return (index) => {
    const lap = Math.floor(index / list.length);
    while (laps.length <= lap) laps.push(shuffled(list, mulberry32(seed + laps.length * 977)));
    return laps[lap]![index % list.length]!;
  };
}

/** The series taken in turn, so neighbouring rows are never the same family. */
function interleave(choices: readonly StyleChoice[]): StyleChoice[] {
  const bySeries = new Map<string, StyleChoice[]>();
  for (const choice of choices) bySeries.set(choice.style, [...(bySeries.get(choice.style) ?? []), choice]);
  const queues = [...bySeries.values()];
  const out: StyleChoice[] = [];
  for (let i = 0; out.length < choices.length; i++) {
    for (const queue of queues) if (i < queue.length) out.push(queue[i]!);
  }
  return out;
}

function stillStates() {
  const wanted = new Set<string>([
    ...(STATE_GROUPS.find((g) => g.id === STILL_STATE_GROUP)?.states ?? []),
    ...STILL_STATE_EXTRA,
  ]);
  const states = CHARACTER_STATES.filter((state) => wanted.has(state));
  return states.length > 0 ? states : CHARACTER_STATES;
}

/** How much field the wall needs once it is turned, and how many tiles that is. */
function measure(width: number, height: number, narrow: boolean): Metrics {
  const tile = narrow ? TILE_PX_NARROW : TILE_PX;
  const gap = narrow ? GAP_PX_NARROW : GAP_PX;
  const pitch = tile + gap;
  const angle = (Math.abs(TILT_DEG) * Math.PI) / 180;
  const fieldW = Math.ceil(width * Math.cos(angle) + height * Math.sin(angle));
  const fieldH = Math.ceil(width * Math.sin(angle) + height * Math.cos(angle));
  const rows = Math.ceil((fieldH + gap) / pitch);
  return { fieldW, fieldH: rows * pitch - gap, rows, perHalf: Math.ceil(fieldW / pitch), tile, gap };
}

function buildRows(
  styles: readonly StyleChoice[],
  ink: ColorId | undefined,
  { rows, perHalf, tile, gap }: Metrics,
): RowSpec[] {
  const series = interleave(styles);
  if (series.length === 0) return [];
  const shapeAt = lapped(SHAPE_IDS, 11);
  const colorAt = ink ? () => ink : lapped(COLOR_IDS, 23);
  const stateAt = lapped(stillStates(), 37);
  const random = mulberry32(5);
  const halfPx = perHalf * (tile + gap);

  return Array.from({ length: rows }, (_row, row) => {
    // One walk across all rows: the same character does not turn up twice within a screen.
    const tiles = Array.from({ length: perHalf }, (_tile, i) => {
      const at = row * perHalf + i;
      return { id: at, shape: shapeAt(at), color: colorAt(at), state: stateAt(at) };
    });
    const speed = SPEED_PX_MIN + random() * (SPEED_PX_MAX - SPEED_PX_MIN);
    return {
      id: row,
      ...series[row % series.length]!,
      tiles,
      durationS: Math.round(halfPx / speed),
      // The golden step spreads the rows' rest positions, so no two columns line up.
      phase: (row * 0.618034 + random() * 0.12) % 1,
      reverse: row % 2 === 1,
    };
  });
}

const sameMetrics = (a: Metrics | null, b: Metrics) =>
  a !== null && (Object.keys(b) as (keyof Metrics)[]).every((key) => a[key] === b[key]);

const artOf = (row: RowSpec, tile: TileSpec, face: FaceStyle, sizePx: number): TileArt => ({
  shape: tile.shape,
  color: tile.color,
  state: tile.state,
  style: row.style,
  variant: row.variant,
  face,
  sizePx,
});

interface Shop {
  draw: (tiles: TileArt[]) => Promise<string[]>;
  encode: (keys: string[], values: PageValues) => Promise<[string, string][]>;
  close: () => void;
}

/** A request before the shop numbers it, kept apart per kind of request. */
type Unsent<T> = T extends unknown ? Omit<T, 'id'> : never;

const yieldToPage = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** The same work on this thread, a tile per task, for a browser that will not start the worker. */
function shopHere(): Shop {
  const shop = new TileShop();
  return {
    draw: (tiles) => shop.draw(tiles, yieldToPage),
    encode: async (keys, values) => shop.encode(keys, values),
    close: () => {},
  };
}

function shopInWorker(): Shop {
  const worker = new Worker(new URL('./wall.worker.ts', import.meta.url));
  const waiting = new Map<
    number,
    { resolve: (reply: ShopReply) => void; reject: (error: unknown) => void }
  >();
  let next = 0;
  worker.addEventListener('message', ({ data }: MessageEvent<ShopReply>) => {
    const pending = waiting.get(data.id);
    waiting.delete(data.id);
    if (data.type === 'error') pending?.reject(new Error(data.message));
    else pending?.resolve(data);
  });
  worker.addEventListener('error', (event) => {
    for (const pending of waiting.values()) pending.reject(event);
    waiting.clear();
  });
  const ask = (request: Unsent<ShopRequest>) =>
    new Promise<ShopReply>((resolve, reject) => {
      const id = next++;
      waiting.set(id, { resolve, reject });
      worker.postMessage({ ...request, id }, []);
    });
  return {
    draw: async (tiles) => {
      const reply = await ask({ type: 'draw', tiles });
      return reply.type === 'names' ? reply.names : [];
    },
    encode: async (keys, values) => {
      const reply = await ask({ type: 'encode', keys, values });
      return reply.type === 'urls' ? reply.urls : [];
    },
    close: () => worker.terminate(),
  };
}

/** What the drawings read from the page, as it computes where a tile sits. */
function readPage(probe: Element, names: readonly string[]): PageValues {
  const style = getComputedStyle(probe);
  const pairs: [string, string][] = [
    ['color', style.color],
    ...names.map((name): [string, string] => [name, style.getPropertyValue(name).trim()]),
  ];
  return Object.fromEntries(pairs.filter(([, value]) => value));
}

/**
 * Loaded and decoded, so a tile is never shown blank; the images are kept until the field showing them is up.
 * An SVG image is parsed on this thread as it loads, so they load a few per task: a whole wall at once is one long task.
 */
async function decodeAll(urls: Iterable<string>, live: () => boolean): Promise<HTMLImageElement[]> {
  const sources = [...new Set(urls)];
  const images: HTMLImageElement[] = [];
  for (let at = 0; at < sources.length && live(); at += DECODE_BATCH) {
    const batch = sources.slice(at, at + DECODE_BATCH).map((src) => Object.assign(new Image(), { src }));
    // oxlint-disable-next-line no-await-in-loop -- one batch per task is the point
    await Promise.all(batch.map((image) => image.decode().catch(() => undefined))).then(yieldToPage);
    images.push(...batch);
  }
  return images;
}

function whenIdle(run: () => void): () => void {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(run, 0);
  return () => clearTimeout(id);
}

interface Field {
  metrics: Metrics;
  rows: RowSpec[];
  urls: ReadonlyMap<string, string>;
}

interface WallProps {
  styles: StyleChoice[];
  face: FaceStyle;
  /** Draw every tile as line art in one ink, instead of each row in its own style and colour. */
  lineArt?: boolean;
}

/**
 * The background: rows of small characters, tilted, each row one style and
 * each drifting its own way at its own pace. A tile has no card: each
 * character sits in a soft pool of its own ink that fades to nothing, so the
 * field reads as characters and not as a grid of boxes.
 *
 * Every tile is a still drawing shown as an image (`wall-art.ts`) — no
 * engine, no timer, no per-frame script — and the only motion is a CSS
 * transform on each row, which the compositor runs alone. The drawings are
 * made off the main thread once the page is idle, and the field appears, with
 * its fade, only when every image is decoded. The rows pause when the wall is
 * off screen or the page is hidden, and stand still under
 * `prefers-reduced-motion`. Drawn on the client only: it is decoration, and a
 * server-rendered field of characters would be a great deal of markup nobody
 * asked for.
 */
export const Wall = memo(function Wall({ styles, face, lineArt = false }: WallProps) {
  const host = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const shop = useRef<Shop | null>(null);
  const held = useRef<HTMLImageElement[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [field, setField] = useState<Field | null>(null);

  // Fit the field to the box, and again whenever the box or the breakpoint moves.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const fit = () => {
      const next = measure(el.clientWidth, el.clientHeight, window.matchMedia(NARROW_QUERY).matches);
      setMetrics((current) => (sameMetrics(current, next) ? current : next));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Rows run only while the wall is on screen and the page is in front.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let visible = true;
    const sync = () => el.toggleAttribute('data-paused', !visible || document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry!.isIntersecting;
      sync();
    });
    observer.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  useEffect(
    () => () => {
      shop.current?.close();
      shop.current = null;
    },
    [],
  );

  const rows = useMemo(
    () => (metrics ? buildRows(lineArt ? LINE_ART : styles, lineArt ? LINE_INK : undefined, metrics) : []),
    [styles, lineArt, metrics],
  );

  // Draw this layout's tiles, then swap the field in whole. A theme whose values
  // are not `light-dark()` pairs changes what the images carry, so they are
  // encoded again when the page's scheme or theme class changes them.
  useEffect(() => {
    const el = probe.current;
    if (!metrics || rows.length === 0 || !el) return;
    const sizePx = Math.round(metrics.tile * MARK_SHARE);
    const arts = new Map<string, TileArt>();
    for (const row of rows) {
      for (const tile of row.tiles) {
        const art = artOf(row, tile, face, sizePx);
        arts.set(tileKey(art), art);
      }
    }
    const keys = [...arts.keys()];
    let live = true;
    let names: string[] | null = null;
    let carried = '';

    const show = async (from: Shop, drawn: string[]) => {
      const values = readPage(el, drawn);
      carried = JSON.stringify(values);
      const urls = new Map(await from.encode(keys, values));
      const images = await decodeAll(urls.values(), () => live);
      if (!live) return;
      held.current = images;
      setField({ metrics, rows, urls });
    };
    const run = async (from: Shop) => {
      names = await from.draw([...arts.values()]);
      if (live) await show(from, names);
    };
    const start = () => {
      if (!shop.current) {
        try {
          shop.current = shopInWorker();
        } catch {
          shop.current = shopHere();
        }
      }
      run(shop.current)
        .catch(() => {
          shop.current?.close();
          shop.current = shopHere();
          return run(shop.current);
        })
        .catch((error: unknown) => console.error(error));
    };
    const cancelIdle = whenIdle(start);

    const recheck = () => {
      if (names && shop.current && JSON.stringify(readPage(el, names)) !== carried)
        void show(shop.current, names);
    };
    const themeObserver = new MutationObserver(recheck);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    scheme.addEventListener('change', recheck);
    return () => {
      live = false;
      cancelIdle();
      themeObserver.disconnect();
      scheme.removeEventListener('change', recheck);
    };
  }, [rows, metrics, face]);

  const shown = field?.metrics;
  const markPx = shown ? Math.round(shown.tile * MARK_SHARE) : 0;

  return (
    <div
      ref={host}
      className="site-home__wall"
      aria-hidden="true"
      data-ready={field !== null || undefined}
      data-lineart={lineArt || undefined}
      style={
        {
          '--site-tile': `${shown?.tile ?? TILE_PX}px`,
          '--site-gap': `${shown?.gap ?? GAP_PX}px`,
          '--site-tilt': `${TILT_DEG}deg`,
        } as CSSProperties
      }
    >
      <span ref={probe} className="aora-mark" hidden />
      {field && shown && (
        <div className="site-home__field" style={{ width: shown.fieldW, height: shown.fieldH }}>
          {field.rows.map((row) => (
            <div
              key={row.id}
              className="site-home__row"
              data-reverse={row.reverse || undefined}
              style={
                { '--site-dur': `${row.durationS}s`, '--site-phase': row.phase.toFixed(3) } as CSSProperties
              }
            >
              {[0, 1].map((copy) =>
                row.tiles.map((tile) => (
                  <span
                    key={`${copy}-${tile.id}`}
                    className="site-home__tile"
                    style={{ '--site-tile-ink': getInkColorCss(tile.color) } as CSSProperties}
                  >
                    <span
                      className="aora-mark aora-mark--still"
                      data-shape={tile.shape}
                      data-color={tile.color}
                      data-state={tile.state}
                      style={{ width: markPx, height: markPx }}
                    >
                      <img
                        src={field.urls.get(tileKey(artOf(row, tile, face, markPx)))}
                        alt=""
                        draggable={false}
                      />
                    </span>
                  </span>
                )),
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
