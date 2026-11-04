/**
 * HUD dials: a `HudSpec` and a time in, a frame of primitives out.
 *
 * The ring between the body and the viewBox is an instrument, not a halo.
 * Each kind is a track, a fill and a printed figure — the same number
 * `formatHud` would put on a status bar — so a host that shows both cannot
 * disagree with itself. The body stays a clean silhouette: the face lives
 * on the state layer, the dial lives outside it.
 *
 * Pure, like the belts: the same `(spec, tMs)` always gives the same frame.
 */
import { clamp } from '../math/easing.js';
import { polylinesPath } from '../math/polyline.js';
import { CENTER, type Point } from '../core/types.js';
import { formatHud } from './format.js';
import type { HudSpec } from './spec.js';

/** A circular arc. Angles in radians, 0 at three o'clock, increasing clockwise. */
export interface HudArc {
  x: number;
  y: number;
  r: number;
  start: number;
  end: number;
  opacity: number;
  width: number;
  /** Track arcs use a square cap so they read as an instrument, not a ribbon. */
  cap?: 'butt' | 'round';
}

/** An axis-aligned filled rectangle. */
export interface HudBar {
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
}

/** A straight stroked segment. */
export interface HudTick {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
}

/** A filled dot. */
export interface HudPip {
  x: number;
  y: number;
  r: number;
  opacity: number;
}

/** Anything the five primitives above cannot say: a sparkline, a tick mark, a trace. */
export interface HudPath {
  d: string;
  opacity: number;
}

/** A printed figure in the ring — the 屏显 half of a dial. */
export interface HudGlyph {
  x: number;
  y: number;
  text: string;
  size: number;
  opacity: number;
  anchor?: 'start' | 'middle' | 'end';
}

/**
 * One or more open polylines drawn together at one opacity: a sparkline, a
 * check mark, a cross (two lines). The points are in shape space.
 */
export interface HudStroke {
  lines: Point[][];
  opacity: number;
}

/**
 * A HUD frame as primitives, with every shape given as numbers or points.
 *
 * This is what a frame snapshot carries. `HudFrame` is the same frame with
 * the polylines written out as SVG path data.
 */
export interface HudPrimitives {
  arcs: HudArc[];
  bars: HudBar[];
  ticks: HudTick[];
  pips: HudPip[];
  strokes: HudStroke[];
  glyphs: HudGlyph[];
}

export interface HudFrame {
  arcs: HudArc[];
  bars: HudBar[];
  ticks: HudTick[];
  pips: HudPip[];
  paths: HudPath[];
  glyphs: HudGlyph[];
}

export interface HudContext {
  /** Body radius in shape units. The dial sits just outside it. */
  radius: number;
  /** Fitted eye radius. Stroke weight is derived from it, so the HUD matches the face. */
  eyeRadius: number;
  /** Resolved stroke weight as a fraction of the eye radius — see `resolveLineWeight`. */
  lineWeight: number;
  /** Snap every value; draw no sweep, no travel, no pulse. */
  reducedMotion?: boolean;
  /**
   * Print the figure in the ring. Off on chips — type at 76px is noise, and
   * the plate beside the character is the readable half.
   */
  print?: boolean;
}

/** Below this CSS size the ring keeps the track and drops the glyphs. */
export const HUD_PRINT_MIN_PX = 110;

/** Tabular face for the printed figure. */
export const HUD_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const TAU = Math.PI * 2;
/** Twelve o'clock. Every dial starts here, because every clock does. */
const TOP = -Math.PI / 2;

const emptyFrame = (): HudPrimitives => ({
  arcs: [],
  bars: [],
  ticks: [],
  pips: [],
  strokes: [],
  glyphs: [],
});

/** Three-quarter turn, gapped at the foot — how a dial is read at a glance. */
const GAUGE = Math.PI * 1.5;

/**
 * Evaluate a HUD at `tMs` milliseconds.
 *
 * `tMs` is the renderer's own clock, not wall time. The one kind that needs
 * wall time — `clock` — takes it as data, so this stays a pure function.
 */
export function evaluateHud(spec: HudSpec, tMs: number, ctx: HudContext): HudFrame {
  const { strokes, ...rest } = evaluateHudPrimitives(spec, tMs, ctx);
  return { ...rest, paths: strokes.map((s) => ({ d: polylinesPath(s.lines), opacity: s.opacity })) };
}

/** `evaluateHud` without the SVG: polylines stay as points. */
export function evaluateHudPrimitives(spec: HudSpec, tMs: number, ctx: HudContext): HudPrimitives {
  const frame = emptyFrame();
  const reduced = ctx.reducedMotion === true;
  const print = ctx.print !== false;
  const t = reduced ? 0 : (Number.isFinite(tMs) ? tMs : 0) / 1000;
  const reading = formatHud(spec, Number.isFinite(tMs) ? tMs : 0);

  // The ring the whole HUD lives in.
  const inner = ctx.radius + 3;
  const outer = ctx.radius + 21;
  const mid = (inner + outer) / 2;
  const band = (outer - inner) / 2;
  const width = Math.max(0.6, ctx.lineWeight * ctx.eyeRadius);
  const pip = Math.max(1.2, width * 0.8);
  const gaugeFrom = TOP - GAUGE / 2;

  /** A point on a ring of radius `r` at `angle`. */
  const at = (angle: number, r: number): [number, number] => [
    CENTER + Math.cos(angle) * r,
    CENTER + Math.sin(angle) * r,
  ];

  const ring = (r: number, opacity: number, start = 0, end = TAU, cap: HudArc['cap'] = 'round'): HudArc => ({
    x: CENTER,
    y: CENTER,
    r,
    start,
    end,
    opacity,
    width,
    cap,
  });

  const spoke = (angle: number, from: number, to: number, opacity: number): HudTick => {
    const [x1, y1] = at(angle, from);
    const [x2, y2] = at(angle, to);
    return { x1, y1, x2, y2, opacity };
  };

  const figure = (text: string, x = CENTER, y = CENTER + mid, size = 13): void => {
    if (!print || !text) return;
    frame.glyphs.push({ x, y, text, size, opacity: 0.92, anchor: 'middle' });
  };

  switch (spec.kind) {
    case 'progress': {
      const value = clamp(spec.value, 0, 1);
      frame.arcs.push(ring(mid, 0.28, gaugeFrom, gaugeFrom + GAUGE, 'butt'));
      if (value > 0) frame.arcs.push(ring(mid, 1, gaugeFrom, gaugeFrom + value * GAUGE, 'butt'));
      const [hx, hy] = at(gaugeFrom + value * GAUGE, mid);
      frame.pips.push({ x: hx, y: hy, r: pip * 1.15, opacity: 1 });
      figure(reading.value);
      break;
    }

    case 'timer': {
      const total = spec.totalMs > 0 ? spec.totalMs : 0;
      const left = total > 0 ? clamp(spec.remainingMs / total, 0, 1) : 0;
      frame.arcs.push(ring(mid, 0.28, gaugeFrom, gaugeFrom + GAUGE, 'butt'));
      if (left > 0) frame.arcs.push(ring(mid, 1, gaugeFrom, gaugeFrom + left * GAUGE, 'butt'));
      for (let i = 0; i <= 4; i++) {
        frame.ticks.push(spoke(gaugeFrom + (i / 4) * GAUGE, i % 2 === 0 ? inner : mid, outer, 0.28));
      }
      if (left > 0 && left < 0.1 && !reduced) {
        frame.arcs.push(
          ring(mid + band * 0.45, 0.4 + 0.35 * Math.sin(t * 6), gaugeFrom, gaugeFrom + left * GAUGE, 'butt'),
        );
      }
      figure(reading.value);
      break;
    }

    case 'clock': {
      const epoch = spec.date ?? tMs;
      const minutes = (epoch / 60_000) % 720;
      const hourAngle = TOP + (minutes / 720) * TAU;
      const minuteAngle = TOP + ((minutes % 60) / 60) * TAU;

      frame.arcs.push(ring(mid, 0.26));
      for (let i = 0; i < 4; i++) {
        frame.ticks.push(spoke(TOP + (i / 4) * TAU, mid, outer, 0.4));
      }
      const [hx, hy] = at(hourAngle, mid);
      const [mx, my] = at(minuteAngle, mid);
      frame.pips.push({ x: hx, y: hy, r: pip * 1.45, opacity: 1 });
      frame.pips.push({ x: mx, y: my, r: pip, opacity: 0.8 });
      figure(reading.value, CENTER, CENTER + mid, 13);
      break;
    }

    case 'voice': {
      const level = clamp(spec.level, 0, 1);
      const bands = clamp(Math.round(spec.bands ?? 5), 1, 9);
      const speaking = spec.mode === 'speaking';
      const barW = Math.max(1.6, width * 1.2);
      const gap = barW * 2.1;
      const baseline = CENTER + mid;
      for (let i = 0; i < bands; i++) {
        const seed = i * 1.37;
        const wobble = reduced
          ? 0.6
          : 0.5 + 0.3 * Math.sin(t * (speaking ? 9 : 5) + seed) + 0.2 * Math.sin(t * 3.3 + seed * 2);
        const h = Math.max(barW, band * 2 * level * clamp(wobble, 0.12, 1) * (speaking ? 1.15 : 0.85));
        frame.bars.push({
          x: CENTER + (i - (bands - 1) / 2) * gap - barW / 2,
          y: baseline - h / 2,
          w: barW,
          h,
          opacity: 0.5 + level * 0.5,
        });
      }
      figure(reading.value, CENTER - mid * 0.82, baseline, 11);
      break;
    }

    case 'context': {
      const cells = 12;
      const used = spec.total > 0 ? clamp(spec.used / spec.total, 0, 1) : 0;
      const filled = Math.round(used * cells);
      for (let i = 0; i < cells; i++) {
        const a = gaugeFrom + ((i + 0.5) / cells) * GAUGE;
        const [x, y] = at(a, mid);
        const on = i < filled;
        const warn = used > 0.85 && on && i >= filled - 1 && !reduced;
        frame.pips.push({
          x,
          y,
          r: on ? pip * 1.1 : pip * 0.65,
          opacity: on ? (warn ? 0.55 + 0.4 * Math.sin(t * 5) : 0.95) : 0.18,
        });
      }
      figure(reading.value, CENTER, CENTER + mid, 12);
      break;
    }

    case 'balance': {
      const magnitude = Math.abs(spec.value);
      const columns = clamp(1 + Math.floor(Math.log10(Math.max(1, magnitude))), 1, 6);
      const barW = Math.max(1.6, width * 1.1);
      const gap = barW * 2.2;
      const baseline = CENTER + outer;
      const pulse = spec.low && !reduced ? 0.55 + 0.45 * Math.sin(t * 5.4) : 1;
      for (let i = 0; i < columns; i++) {
        const h = band * (0.6 + (i / Math.max(1, columns - 1)) * 1.4);
        frame.bars.push({
          x: CENTER + (i - (columns - 1) / 2) * gap - barW / 2,
          y: baseline - h,
          w: barW,
          h,
          opacity: (spec.low ? 0.45 : 0.9) * pulse,
        });
      }
      if (spec.low) {
        frame.pips.push({ x: CENTER, y: CENTER + inner, r: pip * 1.15, opacity: pulse });
      }
      figure(reading.value);
      break;
    }

    case 'gauge': {
      const value = spec.max > 0 ? clamp(spec.value / spec.max, 0, 1) : 0;
      frame.arcs.push(ring(mid, 0.28, gaugeFrom, gaugeFrom + GAUGE, 'butt'));
      if (value > 0) frame.arcs.push(ring(mid, 1, gaugeFrom, gaugeFrom + GAUGE * value, 'butt'));
      for (let i = 0; i <= 4; i++) {
        frame.ticks.push(spoke(gaugeFrom + (i / 4) * GAUGE, i % 2 === 0 ? inner : mid, outer, 0.28));
      }
      const [nx, ny] = at(gaugeFrom + GAUGE * value, mid);
      frame.pips.push({ x: nx, y: ny, r: pip * 1.35, opacity: 1 });
      figure(reading.value);
      break;
    }

    case 'kpi': {
      const series = spec.series ?? [];
      const left = CENTER - mid * 0.55;
      const right = CENTER + mid * 0.72;
      const baseline = CENTER + mid;

      if (series.length > 1) {
        let lo = Infinity;
        let hi = -Infinity;
        for (const v of series) {
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
        const range = hi - lo || 1;
        const line: Point[] = [];
        let lastX = left;
        let lastY = baseline;
        for (let i = 0; i < series.length; i++) {
          const x = left + ((right - left) * i) / (series.length - 1);
          const y = baseline + band - ((series[i]! - lo) / range) * band * 2;
          line.push([x, y]);
          lastX = x;
          lastY = y;
        }
        frame.strokes.push({ lines: [line], opacity: 0.9 });
        frame.pips.push({ x: lastX, y: lastY, r: pip * 1.15, opacity: 1 });
      } else {
        frame.ticks.push({ x1: left, y1: baseline, x2: right, y2: baseline, opacity: 0.3 });
        frame.pips.push({ x: right, y: baseline, r: pip * 1.15, opacity: 1 });
      }

      const delta = spec.delta ?? 0;
      if (delta !== 0) {
        const h = band * clamp(Math.abs(delta) / (Math.abs(spec.value) || 1), 0.2, 1.6);
        const barW = Math.max(1.6, width * 1.2);
        frame.bars.push({
          x: right + barW * 1.6,
          y: delta > 0 ? baseline - h : baseline,
          w: barW,
          h,
          opacity: 0.85,
        });
      }
      figure(reading.value, CENTER - mid * 0.82, baseline, 12);
      break;
    }

    case 'notify': {
      const count = clamp(Math.round(spec.count), 0, 99);
      const shown = Math.min(count, 4);
      frame.arcs.push(ring(mid, 0.28, gaugeFrom, gaugeFrom + GAUGE, 'butt'));
      for (let i = 0; i < shown; i++) {
        const a = gaugeFrom + ((i + 1) / (shown + 1)) * GAUGE;
        const [x, y] = at(a, mid);
        const newest = i === shown - 1 && !reduced;
        frame.pips.push({
          x,
          y,
          r: pip * (newest ? 1.35 + 0.2 * Math.sin(t * 4.2) : 1.15),
          opacity: 1,
        });
      }
      figure(reading.value);
      break;
    }

    case 'sync': {
      frame.arcs.push(ring(mid, 0.28, gaugeFrom, gaugeFrom + GAUGE, 'butt'));
      switch (spec.state) {
        case 'syncing': {
          const head = gaugeFrom + ((t * 0.9) % 1) * GAUGE;
          frame.arcs.push(ring(mid, 1, head - 1.1, head, 'butt'));
          const [x, y] = at(head, mid);
          frame.pips.push({ x, y, r: pip, opacity: 1 });
          break;
        }
        case 'done': {
          frame.strokes.push({ lines: checkLines(CENTER, CENTER - mid, band), opacity: 1 });
          break;
        }
        case 'error': {
          frame.strokes.push({ lines: crossLines(CENTER, CENTER - mid, band * 0.8), opacity: 1 });
          break;
        }
        default:
          break;
      }
      figure(reading.value);
      break;
    }
  }

  return frame;
}

/** A tick mark centred on a point. */
function checkLines(cx: number, cy: number, size: number): Point[][] {
  return [
    [
      [cx - size, cy],
      [cx - size * 0.25, cy + size * 0.65],
      [cx + size, cy - size * 0.7],
    ],
  ];
}

/** A cross centred on a point: two lines. */
function crossLines(cx: number, cy: number, size: number): Point[][] {
  return [
    [
      [cx - size, cy - size],
      [cx + size, cy + size],
    ],
    [
      [cx + size, cy - size],
      [cx - size, cy + size],
    ],
  ];
}
