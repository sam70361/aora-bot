import {
  CHARACTER_STATES,
  COLOR_IDS,
  SHAPE_IDS,
  STATE_GROUPS,
  getInkColorCss,
  type FaceStyle,
} from '@aora-bot/react';
import { mulberry32 } from '@aora-bot/engine';
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Preset } from '../shared/share.js';
import { StillMark } from './StillMark.js';
import type { StyleChoice } from './registry.js';

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

function buildRows(styles: readonly StyleChoice[], { rows, perHalf, tile, gap }: Metrics): RowSpec[] {
  const series = interleave(styles);
  if (series.length === 0) return [];
  const shapeAt = lapped(SHAPE_IDS, 11);
  const colorAt = lapped(COLOR_IDS, 23);
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

interface WallProps {
  styles: StyleChoice[];
  face: FaceStyle;
}

/**
 * The background: rows of small characters, tilted, each row one style and
 * each drifting its own way at its own pace. A tile has no card: each
 * character sits in a soft pool of its own ink that fades to nothing, so the
 * field reads as characters and not as a grid of boxes.
 *
 * Every tile is a static SVG — no engine, no timer, no per-frame script — and
 * the only motion is a CSS transform on each row, which the compositor runs
 * alone. The rows pause when the wall is off screen or the page is hidden, and
 * stand still under `prefers-reduced-motion`. Drawn on the client only: it is
 * decoration, and a server-rendered field of characters would be a great deal
 * of markup nobody asked for.
 */
export const Wall = memo(function Wall({ styles, face }: WallProps) {
  const host = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

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

  const rows = useMemo(() => (metrics ? buildRows(styles, metrics) : []), [styles, metrics]);
  const markPx = metrics ? Math.round(metrics.tile * MARK_SHARE) : 0;

  return (
    <div
      ref={host}
      className="site-home__wall"
      aria-hidden="true"
      data-ready={rows.length > 0 || undefined}
      style={
        {
          '--site-tile': `${metrics?.tile ?? TILE_PX}px`,
          '--site-gap': `${metrics?.gap ?? GAP_PX}px`,
          '--site-tilt': `${TILT_DEG}deg`,
        } as CSSProperties
      }
    >
      {metrics && (
        <div className="site-home__field" style={{ width: metrics.fieldW, height: metrics.fieldH }}>
          {rows.map((row) => (
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
                    <StillMark
                      shape={tile.shape}
                      color={tile.color}
                      state={tile.state}
                      style={row.style}
                      variant={row.variant}
                      face={face}
                      sizePx={markPx}
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
