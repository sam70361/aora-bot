/**
 * Shapes for drawn faces, as points.
 *
 * Everything a drawn eye is made of is one of two things. A region between a
 * top and a bottom profile (a white, a pupil, a lens) is a `Band`, and bands
 * intersect by taking the lower top and the higher bottom at every x — which
 * is how a pupil is clipped to a white and a white to its lids without any
 * polygon clipping, and why a lid closing over an eye is one continuous
 * shape. A line (a brow, a lash, a stitch) is a `ribbon`: a centreline
 * outlined to its weight with round caps, so every renderer only fills.
 */
import type { Point } from '../../core/types.js';

/** A region between two profiles over `[x0, x1]`. Outside the interval a profile is not consulted. */
export interface Band {
  x0: number;
  x1: number;
  top(x: number): number;
  bottom(x: number): number;
}

/** Columns a band is sampled at: cosine-spaced, so round ends are as fine as straight middles. */
const BAND_COLUMNS = 24;

/** The region inside an ellipse. */
export function ellipseBand(cx: number, cy: number, rx: number, ry: number): Band {
  const half = (x: number): number => ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / Math.max(rx, 1e-6)) ** 2));
  return { x0: cx - rx, x1: cx + rx, top: (x) => cy - half(x), bottom: (x) => cy + half(x) };
}

/** Everything between two profiles, at any x. */
export function lidBand(top: (x: number) => number, bottom: (x: number) => number): Band {
  return { x0: -Infinity, x1: Infinity, top, bottom };
}

/** A rounded rectangle of half-size `w` by `h` and corner radius `r`, centred on `(cx, cy)`. */
export function roundedRectBand(cx: number, cy: number, w: number, h: number, r: number): Band {
  const k = Math.max(0, Math.min(r, w, h));
  const half = (x: number): number => {
    const dx = Math.abs(x - cx) - (w - k);
    return dx > 0 ? h - k + Math.sqrt(Math.max(0, k * k - dx * dx)) : h;
  };
  return { x0: cx - w, x1: cx + w, top: (x) => cy - half(x), bottom: (x) => cy + half(x) };
}

/** The region inside a convex polygon. */
export function convexBand(points: readonly Point[]): Band {
  const xs = points.map(([x]) => x);
  const cross = (x: number, pick: (a: number, b: number) => number, start: number): number => {
    let y = start;
    for (let i = 0; i < points.length; i++) {
      const [x0, y0] = points[i]!;
      const [x1, y1] = points[(i + 1) % points.length]!;
      if (x < Math.min(x0, x1) || x > Math.max(x0, x1) || x0 === x1) continue;
      y = pick(y, y0 + ((y1 - y0) * (x - x0)) / (x1 - x0));
    }
    return y;
  };
  return {
    x0: Math.min(...xs),
    x1: Math.max(...xs),
    top: (x) => cross(x, Math.min, Infinity),
    bottom: (x) => cross(x, Math.max, -Infinity),
  };
}

/** The part every band has in common. */
export function meet(...bands: Band[]): Band {
  return {
    x0: Math.max(...bands.map((b) => b.x0)),
    x1: Math.min(...bands.map((b) => b.x1)),
    top: (x) => Math.max(...bands.map((b) => b.top(x))),
    bottom: (x) => Math.min(...bands.map((b) => b.bottom(x))),
  };
}

/**
 * A band as one closed outline, top edge left to right then bottom edge back.
 * Where the band is empty the bottom is held at the top, so a lid closing
 * over an eye thins it to a line instead of tearing it into pieces. Empty
 * everywhere, it is `null`.
 */
export function bandRing(band: Band, columns = BAND_COLUMNS): Point[] | null {
  if (!(band.x1 > band.x0) || !Number.isFinite(band.x0) || !Number.isFinite(band.x1)) return null;
  const top: Point[] = [];
  const bottom: Point[] = [];
  let open = false;
  for (let i = 0; i <= columns; i++) {
    const u = 0.5 - 0.5 * Math.cos((Math.PI * i) / columns);
    const x = band.x0 + (band.x1 - band.x0) * u;
    const t = band.top(x);
    const b = Math.max(t, band.bottom(x));
    // A column a polygon band only grazes at its end has no profile there; it is left out, not drawn at infinity.
    if (!Number.isFinite(t) || !Number.isFinite(b)) continue;
    if (b - t > 1e-4) open = true;
    top.push([x, t]);
    bottom.push([x, b]);
  }
  if (!open) return null;
  bottom.reverse();
  return top.concat(bottom);
}

/**
 * A line of half-width `half` along `points`, outlined, with round caps at
 * both ends; `closed` joins the ends instead. `half` may be one width or one
 * per point, for a line that tapers.
 */
export function ribbon(points: readonly Point[], half: number | readonly number[], closed = false): Point[] {
  const n = points.length;
  if (n === 0) return [];
  const width = (i: number): number => Math.max(0, typeof half === 'number' ? half : (half[i] ?? 0));
  if (n === 1) return circleRing(points[0]![0], points[0]![1], width(0), 10);
  const normal = (i: number): Point => {
    const prev = points[closed ? (i - 1 + n) % n : Math.max(0, i - 1)]!;
    const next = points[closed ? (i + 1) % n : Math.min(n - 1, i + 1)]!;
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = points[i]!;
    const [nx, ny] = normal(i);
    const w = width(i);
    left.push([x + nx * w, y + ny * w]);
    right.push([x - nx * w, y - ny * w]);
  }
  if (closed) {
    // An outline ring: the outer side round, then the inner side back, as one even-odd shape.
    const rightStart = right[0]!;
    right.reverse();
    return left.concat([left[0]!], [rightStart], right);
  }
  const cap = (at: Point, from: Point, w: number): Point[] => {
    const a = Math.atan2(from[1] - at[1], from[0] - at[0]);
    const out: Point[] = [];
    for (let i = 1; i < 6; i++) {
      const t = a + Math.PI / 2 + (Math.PI * i) / 6;
      out.push([at[0] + Math.cos(t) * w, at[1] + Math.sin(t) * w]);
    }
    return out;
  };
  const end = cap(points[n - 1]!, points[n - 2]!, width(n - 1));
  const start = cap(points[0]!, points[1]!, width(0));
  right.reverse();
  return left.concat(end, right, start);
}

/** A circle as `n` points. */
export function circleRing(cx: number, cy: number, r: number, n = 20): Point[] {
  return ellipseRing(cx, cy, r, r, n);
}

/** An ellipse as `n` points. */
export function ellipseRing(cx: number, cy: number, rx: number, ry: number, n = 24): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Point;
  });
}

/** A quadratic curve from `p0` to `p2` pulled towards `p1`, as `n + 1` points. */
export function quad(p0: Point, p1: Point, p2: Point, n = 12): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return [
      u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
      u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    ] as Point;
  });
}

/** An arc of a circle from angle `a0` to `a1` (radians, y down), as points. */
export function arcPoints(cx: number, cy: number, r: number, a0: number, a1: number, n = 16): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Point;
  });
}

/** A star of `points` tips with the given outer and inner radius, first tip straight up. */
export function starRing(r: number, inner: number, points = 5): Point[] {
  return Array.from({ length: points * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const rr = i % 2 ? r * inner : r;
    return [Math.cos(a) * rr, Math.sin(a) * rr] as Point;
  });
}

/** A four-pointed sparkle whose sides are pulled in to `k` of its reach. */
export function sparkleRing(r: number, k = 0.14): Point[] {
  const tips: Point[] = [
    [0, -r],
    [r, 0],
    [0, r],
    [-r, 0],
  ];
  const out: Point[] = [];
  for (let i = 0; i < 4; i++) {
    const a = tips[i]!;
    const b = tips[(i + 1) % 4]!;
    const pull: Point = [(a[0] + b[0]) * k, (a[1] + b[1]) * k];
    out.push(...quad(a, pull, b, 6).slice(0, -1));
  }
  return out;
}

/** A drop, point up, of half-width `w`, from `-w * 1.2` to `w * 1.2`. */
export function dropRing(w: number): Point[] {
  const tip: Point = [0, -w * 1.2];
  const right = quad(tip, [w * 0.95, -w * 0.1], [w, w * 0.45], 6);
  const bottom = arcPoints(0, w * 0.45, w, 0, Math.PI, 10).slice(1, -1);
  const left = quad([-w, w * 0.45], [-w * 0.95, -w * 0.1], tip, 6).slice(0, -1);
  return right.concat(bottom, left);
}

/** A heart of half-width `s`, point down: the classic parametric heart curve, scaled from its 16-unit half-width. */
export function heartRing(s: number, n = 28): Point[] {
  const k = s / 16;
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    return [x * k, (y - 2.5) * k] as Point;
  });
}

/** Move, rotate (radians) and scale a ring about the origin, in that order: scale, rotate, then translate. */
export function place(
  ring: readonly Point[],
  dx: number,
  dy: number,
  scale = 1,
  rotate = 0,
  sy = scale,
): Point[] {
  const c = Math.cos(rotate);
  const s = Math.sin(rotate);
  return ring.map(([x, y]) => {
    const px = x * scale;
    const py = y * sy;
    return [dx + px * c - py * s, dy + px * s + py * c] as Point;
  });
}

/**
 * Cut a line into dashes of length `on` with gaps of `off`, measured along
 * it, as separate lines.
 */
export function dashes(points: readonly Point[], on: number, off: number): Point[][] {
  const out: Point[][] = [];
  let current: Point[] = [];
  let inDash = true;
  // What is left of the current dash or gap. Counted down rather than taken modulo the period, so rounding cannot stall it.
  let left = on;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len <= 0) continue;
    const at = (k: number): Point => [a[0] + ((b[0] - a[0]) * k) / len, a[1] + ((b[1] - a[1]) * k) / len];
    let t = 0;
    while (len - t > 1e-9) {
      const step = Math.min(len - t, left);
      if (inDash) {
        if (current.length === 0) current.push(at(t));
        current.push(at(t + step));
      }
      t += step;
      left -= step;
      if (left <= 1e-9) {
        if (inDash && current.length > 1) out.push(current);
        if (inDash) current = [];
        inDash = !inDash;
        left = inDash ? on : off;
      }
    }
  }
  if (current.length > 1) out.push(current);
  return out;
}
