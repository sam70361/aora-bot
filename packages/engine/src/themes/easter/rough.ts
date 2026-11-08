/**
 * Crayon roughness for the doodles' paths: a path is followed point by point
 * a short step apart and each point is pushed a little either side of it, so
 * an edge wanders the way a wax stick's does. It stands in for the lab's
 * rough-edge filter, which decorations do not take.
 *
 * The path language read is the subset the doodles are written in: `M`,
 * `L`, `H`, `V`, `C`, `S`, `Q`, `T`, `A` and `Z`, absolute or relative,
 * with numbers repeated after a command as SVG allows.
 */

type Pt = [number, number];

/** A path's subpaths as points along them, and whether each one closes. */
interface Run {
  points: Pt[];
  closed: boolean;
}

/** How many straight steps a curve is followed in. */
const CURVE_STEPS = 12;

const ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

function tokens(d: string): (string | number)[] {
  const out: (string | number)[] = [];
  for (const m of d.matchAll(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g)) {
    const t = m[0];
    out.push(/[A-Za-z]/.test(t) ? t : Number(t));
  }
  return out;
}

/** The points of an elliptical arc from `a` (SVG's endpoint form), the end included. */
function arcPoints(a: Pt, rx: number, ry: number, turn: number, large: number, sweep: number, b: Pt): Pt[] {
  if (rx === 0 || ry === 0) return [b];
  const phi = (turn * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (a[0] - b[0]) / 2;
  const dy = (a[1] - b[1]) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;
  let Rx = Math.abs(rx);
  let Ry = Math.abs(ry);
  const grow = (x1 * x1) / (Rx * Rx) + (y1 * y1) / (Ry * Ry);
  if (grow > 1) {
    Rx *= Math.sqrt(grow);
    Ry *= Math.sqrt(grow);
  }
  const num = Rx * Rx * Ry * Ry - Rx * Rx * y1 * y1 - Ry * Ry * x1 * x1;
  const den = Rx * Rx * y1 * y1 + Ry * Ry * x1 * x1;
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cx1 = (k * Rx * y1) / Ry;
  const cy1 = (-k * Ry * x1) / Rx;
  const cx = cos * cx1 - sin * cy1 + (a[0] + b[0]) / 2;
  const cy = sin * cx1 + cos * cy1 + (a[1] + b[1]) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number) =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t0 = angle(1, 0, (x1 - cx1) / Rx, (y1 - cy1) / Ry);
  let span = angle((x1 - cx1) / Rx, (y1 - cy1) / Ry, (-x1 - cx1) / Rx, (-y1 - cy1) / Ry);
  if (!sweep && span > 0) span -= 2 * Math.PI;
  if (sweep && span < 0) span += 2 * Math.PI;
  const n = Math.max(4, Math.ceil((Math.abs(span) / (Math.PI / 2)) * 6));
  const out: Pt[] = [];
  for (let i = 1; i <= n; i++) {
    const t = t0 + (span * i) / n;
    const ex = Rx * Math.cos(t);
    const ey = Ry * Math.sin(t);
    out.push([cos * ex - sin * ey + cx, sin * ex + cos * ey + cy]);
  }
  return out;
}

/** A path as runs of points, its curves followed in short straight steps. */
function runs(d: string): Run[] {
  const list = tokens(d);
  const out: Run[] = [];
  let run = null as Run | null;
  let at: Pt = [0, 0];
  let start: Pt = [0, 0];
  let control: Pt | null = null;
  let quad: Pt | null = null;
  let command = 'M';
  let i = 0;
  const num = () => list[i++] as number;
  const begin = (p: Pt) => {
    run = { points: [p], closed: false };
    out.push(run);
    start = p;
  };
  const add = (p: Pt) => {
    if (!run) begin(at);
    run?.points.push(p);
  };
  const cubic = (c1: Pt, c2: Pt, end: Pt) => {
    const p0 = at;
    for (let s = 1; s <= CURVE_STEPS; s++) {
      const t = s / CURVE_STEPS;
      const u = 1 - t;
      add([
        u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * end[0],
        u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * end[1],
      ]);
    }
  };
  const quadratic = (c: Pt, end: Pt) => {
    const p0 = at;
    for (let s = 1; s <= CURVE_STEPS; s++) {
      const t = s / CURVE_STEPS;
      const u = 1 - t;
      add([
        u * u * p0[0] + 2 * u * t * c[0] + t * t * end[0],
        u * u * p0[1] + 2 * u * t * c[1] + t * t * end[1],
      ]);
    }
  };
  while (i < list.length) {
    if (typeof list[i] === 'string') command = list[i++] as string;
    const upper = command.toUpperCase();
    const rel = command !== upper;
    const base: Pt = rel ? at : [0, 0];
    const pt = (): Pt => {
      const x = num();
      const y = num();
      return [base[0] + x, base[1] + y];
    };
    if (upper !== 'Z' && i + ARGS[upper]! > list.length) break;
    switch (upper) {
      case 'M': {
        const p = pt();
        begin(p);
        at = p;
        command = rel ? 'l' : 'L';
        control = quad = null;
        continue;
      }
      case 'L':
        at = pt();
        add(at);
        break;
      case 'H':
        at = [(rel ? at[0] : 0) + num(), at[1]];
        add(at);
        break;
      case 'V':
        at = [at[0], (rel ? at[1] : 0) + num()];
        add(at);
        break;
      case 'C': {
        const c1 = pt();
        const c2 = pt();
        const end = pt();
        cubic(c1, c2, end);
        at = end;
        control = c2;
        quad = null;
        continue;
      }
      case 'S': {
        const c1: Pt = control ? [2 * at[0] - control[0], 2 * at[1] - control[1]] : at;
        const c2 = pt();
        const end = pt();
        cubic(c1, c2, end);
        at = end;
        control = c2;
        quad = null;
        continue;
      }
      case 'Q': {
        const c = pt();
        const end = pt();
        quadratic(c, end);
        at = end;
        quad = c;
        control = null;
        continue;
      }
      case 'T': {
        const c: Pt = quad ? [2 * at[0] - quad[0], 2 * at[1] - quad[1]] : at;
        const end = pt();
        quadratic(c, end);
        at = end;
        quad = c;
        control = null;
        continue;
      }
      case 'A': {
        const rx = num();
        const ry = num();
        const turn = num();
        const large = num();
        const sweep = num();
        const end = pt();
        for (const p of arcPoints(at, rx, ry, turn, large, sweep, end)) add(p);
        at = end;
        break;
      }
      case 'Z':
        if (run) run.closed = true;
        at = start;
        run = null;
        break;
      default:
        i++;
    }
    control = quad = null;
  }
  return out.filter((r) => r.points.length > 1);
}

/** Points a step apart along a run, the run's ends kept. */
function resample(points: readonly Pt[], closed: boolean, step: number): Pt[] {
  const all = closed ? [...points, points[0]!] : points;
  const out: Pt[] = [all[0]!];
  let carry = 0;
  for (let i = 1; i < all.length; i++) {
    const a = all[i - 1]!;
    const b = all[i]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let s = step - carry;
    while (s < len) {
      out.push([a[0] + ((b[0] - a[0]) * s) / len, a[1] + ((b[1] - a[1]) * s) / len]);
      s += step;
    }
    carry = len - (s - step);
  }
  if (!closed) out.push(all[all.length - 1]!);
  else if (out.length > 2) {
    const last = out[out.length - 1]!;
    if (Math.hypot(last[0] - out[0]![0], last[1] - out[0]![1]) < step * 0.4) out.pop();
  }
  return out;
}

const f1 = (n: number) => Math.round(n * 10) / 10;

/**
 * A path made rough: every subpath followed `step` units apart, each point
 * pushed up to `amp` either side along the path's normal by two seeded
 * waves, a closed one meeting itself without a seam. Straight between the
 * points, which at this step reads as a drawn line.
 */
export function rough(d: string, seed: number, amp = 0.45, step = 0.9): string {
  let out = '';
  runs(d).forEach((run, k) => {
    const pts = resample(run.points, run.closed, step);
    const n = pts.length;
    if (n < 2) return;
    const phase1 = ((seed * 37 + k * 11) % 100) / 15.9;
    const phase2 = ((seed * 53 + k * 29) % 100) / 15.9;
    // Whole cycles round a closed subpath, so its start and end are pushed alike.
    const turns1 = run.closed ? Math.max(1, Math.round((n * step) / 3.4)) : (n * step) / 3.4;
    const turns2 = run.closed ? Math.max(2, Math.round((n * step) / 1.5)) : (n * step) / 1.5;
    const moved = pts.map((p, i) => {
      const prev = pts[run.closed ? (i - 1 + n) % n : Math.max(0, i - 1)]!;
      const next = pts[run.closed ? (i + 1) % n : Math.min(n - 1, i + 1)]!;
      const tx = next[0] - prev[0];
      const ty = next[1] - prev[1];
      const len = Math.hypot(tx, ty) || 1;
      const t = i / n;
      const push =
        amp *
        (0.65 * Math.sin(2 * Math.PI * turns1 * t + phase1) +
          0.35 * Math.sin(2 * Math.PI * turns2 * t + phase2));
      return [p[0] - (ty / len) * push, p[1] + (tx / len) * push] as Pt;
    });
    out += `M${f1(moved[0]![0])} ${f1(moved[0]![1])}L${moved
      .slice(1)
      .map(([x, y]) => `${f1(x)} ${f1(y)}`)
      .join(' ')}${run.closed ? 'Z' : ''}`;
  });
  return out;
}
