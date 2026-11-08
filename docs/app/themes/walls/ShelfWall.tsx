import type { CharacterState } from '@aora-bot/react';
import { getTheme, mulberry32 } from '@aora-bot/engine';
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ALBUMS, buildAlbum, type ThemeCard } from '../catalog.js';
import { lookFor } from '../looks/index.js';
import { decodedUrl, pageValues, pageVarsOf, stillDrawer, toImage } from './images.js';
import { whenIdle } from './still.js';

/** The whole field turns by this much; the shelf's title and booklets stay upright. */
const TILT_DEG = -7;

/** A tile and the gap after it, in px. Narrow screens get smaller ones. */
const TILE_PX = 92;
const GAP_PX = 14;
const TILE_PX_NARROW = 62;
const GAP_PX_NARROW = 10;
const NARROW_QUERY = '(width < 900px)';

/** Each row drifts at its own speed, in px per second: slower than the home wall, since this one is a backdrop. */
const SPEED_PX_MIN = 8;
const SPEED_PX_MAX = 13;

/** How long the wall waits for the main thread before it goes on anyway, in ms. */
const START_TIMEOUT_MS = 3000;

/** How often the wall looks again for a theme no booklet has installed yet, in ms. */
const RECHECK_MS = 1500;

/** A tile: the `member`-th card of a theme. Known from the manifest, so the rows are laid out before any theme loads. */
interface Slot {
  album: string;
  member: number;
  key: string;
}

interface RowSpec {
  id: number;
  /** Each tile's place in the walk across all rows, and the slot it shows. */
  tiles: { at: number; slot: Slot }[];
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

/** The first `members` cards of every theme, a theme at a time, so neighbouring tiles always come from different albums. */
function slotsOf(members: number): Slot[] {
  return Array.from({ length: members }, (_, member) =>
    ALBUMS.filter((album) => member < album.cards.length).map((album) => ({
      album: album.id,
      member,
      key: `${album.id}-${member}`,
    })),
  ).flat();
}

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

function buildRows(slots: readonly Slot[], { rows, perHalf, tile, gap }: Metrics): RowSpec[] {
  if (slots.length === 0) return [];
  const random = mulberry32(7);
  const halfPx = perHalf * (tile + gap);
  return Array.from({ length: rows }, (_row, row) => {
    const speed = SPEED_PX_MIN + random() * (SPEED_PX_MAX - SPEED_PX_MIN);
    return {
      id: row,
      // One walk across all rows: the tile under any other comes from a different theme.
      tiles: Array.from({ length: perHalf }, (_tile, i) => {
        const at = row * perHalf + i;
        return { at, slot: slots[at % slots.length]! };
      }),
      durationS: Math.round(halfPx / speed),
      phase: (row * 0.618034 + random() * 0.12) % 1,
      reverse: row % 2 === 1,
    };
  });
}

const sameMetrics = (a: Metrics | null, b: Metrics) =>
  a !== null && (Object.keys(b) as (keyof Metrics)[]).every((key) => a[key] === b[key]);

/** A theme's cover cloth, for the soft pool under each of its tiles. */
const poolOf = (album: string) => {
  const [light, dark] = lookFor(album).palette.cover;
  return `light-dark(${light}, ${dark})`;
};

/**
 * The shelf's backdrop: tilted rows of members from every theme, each drawn in
 * its own theme's look, drifting behind the title. Decoration only.
 *
 * Its box is the CSS's, so nothing moves when it fills. The wall loads no
 * theme: it shows the members of the themes the booklets have installed, from
 * the stills their windows drew (a still they have not is drawn in the
 * worker), each turned into a decoded image once, after first paint, one per
 * idle slice. Twenty-odd images serve a hundred tiles. The rows hold only the
 * tiles whose image is in, so the themes in so far share them evenly, and a
 * theme whose booklet installs it later joins then. The wall stays painted but
 * invisible until its first images are in, then fades in. Motion is a CSS
 * transform per row, paused off screen and in a hidden tab, and still under
 * `prefers-reduced-motion`.
 */
export const ShelfWall = memo(function ShelfWall({ members, sizePx }: { members: number; sizePx: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [images, setImages] = useState<ReadonlyMap<string, string>>(() => new Map());
  const slots = useMemo(() => slotsOf(members), [members]);

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

  // Make the images, one per idle slice, from the themes the booklets have installed; the rows show those made so far.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const waiting = new Set(slots.map((slot) => slot.album));
    const jobs: { slot: Slot; card: ThemeCard; state: CharacterState }[] = [];
    const made = new Map<string, string>();
    const values: Record<string, string> = {};
    const drawer = stillDrawer();
    let live = true;
    let cancel: (() => void) | null = null;
    let timer = 0;
    const collect = () => {
      for (const id of waiting) {
        const theme = getTheme(id);
        if (!theme) continue;
        waiting.delete(id);
        const built = buildAlbum(theme);
        for (const slot of slots) {
          const card = slot.album === id ? built.cards[slot.member] : undefined;
          if (card) jobs.push({ slot, card, state: built.defaultState });
        }
      }
    };
    const image = async ({ slot, card, state }: (typeof jobs)[number]) => {
      const svg = await drawer.draw({ theme: slot.album, card, state, sizePx });
      const missing = pageVarsOf(svg).filter((name) => !(name in values));
      if (missing.length > 0) Object.assign(values, pageValues(el, missing));
      return decodedUrl(toImage(svg, card.preset.color, values, { bleed: 0, boxPx: sizePx }));
    };
    const step = () => {
      cancel = whenIdle(() => {
        cancel = null;
        collect();
        const job = jobs.shift();
        if (!job) {
          if (waiting.size > 0) timer = window.setTimeout(step, RECHECK_MS);
          return;
        }
        image(job).then(
          (url) => {
            if (!live) {
              URL.revokeObjectURL(url);
              return;
            }
            made.set(job.slot.key, url);
            // The rows change once a batch is in, not per image, and only with whole themes' worth of tiles.
            if (jobs.length === 0) setImages(new Map(made));
            step();
          },
          (error: unknown) => {
            console.error(error);
            if (live) step();
          },
        );
      }, START_TIMEOUT_MS);
    };
    step();
    return () => {
      live = false;
      cancel?.();
      clearTimeout(timer);
      drawer.close();
      for (const url of made.values()) URL.revokeObjectURL(url);
      setImages(new Map());
    };
  }, [slots, sizePx]);

  // Only tiles whose image is in, in the wall's own order: the themes in so far share the rows evenly.
  const shown = useMemo(() => slots.filter((slot) => images.has(slot.key)), [slots, images]);
  const rows = useMemo(() => (metrics ? buildRows(shown, metrics) : []), [shown, metrics]);
  const ready = rows.length > 0;

  return (
    <div
      ref={host}
      className="site-themes__wall"
      aria-hidden="true"
      data-site-wall="shelf"
      data-ready={ready || undefined}
      style={
        {
          '--site-wall-tile': `${metrics?.tile ?? TILE_PX}px`,
          '--site-wall-gap': `${metrics?.gap ?? GAP_PX}px`,
          '--site-wall-tilt': `${TILT_DEG}deg`,
        } as CSSProperties
      }
    >
      {metrics && (
        <div className="site-themes__wallField" style={{ width: metrics.fieldW, height: metrics.fieldH }}>
          {rows.map((row) => (
            <div
              key={row.id}
              className="site-themes__wallRow"
              data-reverse={row.reverse || undefined}
              style={
                {
                  '--site-wall-dur': `${row.durationS}s`,
                  '--site-wall-phase': row.phase.toFixed(3),
                } as CSSProperties
              }
            >
              {[0, 1].map((copy) =>
                row.tiles.map(({ at, slot }) => (
                  <span
                    key={`${copy}-${at}`}
                    className="site-themes__wallTile"
                    style={{ '--site-wall-pool': poolOf(slot.album) } as CSSProperties}
                  >
                    <span
                      className="site-themes__wallMark"
                      style={{ borderImageSource: `url("${images.get(slot.key)}")` }}
                    />
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
