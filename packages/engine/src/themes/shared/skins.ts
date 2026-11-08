/**
 * Skin building blocks shared by the themes: the pieces a theme's medium is
 * made of, so two themes that need the same mechanism (a die-cut edge, a
 * backing sheet, a hatched shade, an offset crescent) share one
 * implementation. Everything here draws through the kit the core lends a
 * medium and the stateless outline geometry beside it, so a theme entry that
 * uses it still carries no state of the engine.
 */
import type { Ring } from '../../core/types.js';
import type { MediumContext, MediumPiece } from '../../render/vector/media.js';
import type { FrameSnapshot } from '../../sim/snapshot.js';
import { crescentRings, grownRings, insetRings } from '../outline-field.js';

type Node = ReturnType<MediumContext['kit']['node']>;

/** Pixels per shape unit at the size the character is shown, or `Infinity` where the size is unknown. */
export const pxPerUnit = (ctx: MediumContext): number => (ctx.minLine > 0 ? 0.85 / ctx.minLine : Infinity);

/**
 * A width that shrinks with the character below `full` px per shape unit
 * (about 100 px wide) to `share` of itself, but never under `minPx` pixels
 * nor over its full width.
 */
export function smallWidth(
  ctx: MediumContext,
  width: number,
  minPx: number,
  full = 0.36,
  share = 0.4,
): number {
  const px = pxPerUnit(ctx);
  if (!Number.isFinite(px)) return width;
  const scale = Math.min(1, Math.max(share, px / full));
  return Math.min(width, Math.max(width * scale, minPx / px));
}

/** How thick a ring is across: twice its area over its perimeter, which is its width for a strip. */
export function thickness(ring: Ring): number {
  let area = 0;
  let perimeter = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    area += a[0] * b[1] - b[0] * a[1];
    perimeter += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return perimeter > 0 ? Math.abs(area) / perimeter : 0;
}

/** One sheet of a grown underlay: the figure grown by `by`, painted `fill`. */
export interface UnderlaySheet {
  by: number;
  fill: string;
  opacity?: number;
  /** Whether the sheet is the medium's accent, which leans into the state's mood when the medium follows it. */
  accent?: boolean;
  /** A path of the grown outline, worked from its rings, in place of the smooth curve through them. */
  shape?: (rings: Ring[]) => string;
  /**
   * The least area, in square shape units, of a hole the sheet keeps open
   * (`grownRings`); by default one six times the growth across.
   */
  opening?: number;
}

/**
 * Sheets under the whole figure, each the figure grown by its width, as one
 * outline each, so touching pieces share one edge: a die-cut edge and an ink
 * line, a felt backing, a paper sheet, a stepped glow. Worked out once per
 * outline, and stroked instead while a belt is morphing the body or a piece
 * is fading.
 */
export function grownUnderlay(
  frame: FrameSnapshot,
  pieces: readonly MediumPiece[],
  ctx: MediumContext,
  sheets: readonly UnderlaySheet[],
): Node[] {
  const { node, remember, ringsPath, closedCurve, f1 } = ctx.kit;
  const rings = pieces.map((piece) => piece.ring);
  const whole = ctx.settled && pieces.every((piece) => (piece.opacity ?? 1) >= 0.999);
  return sheets.map((sheet, i) => {
    const by = f1(sheet.by);
    const paint = sheet.accent ? ctx.accent(sheet.fill) : { fill: sheet.fill, style: undefined };
    if (whole) {
      const d = remember(
        frame.body.outline,
        `sheet${i}:${by}:${rings.length}:${sheet.shape ? 's' : 'c'}:${sheet.opening ?? ''}`,
        () => {
          const grown = grownRings(rings, by, sheet.opening);
          return sheet.shape ? sheet.shape(grown) : ringsPath(grown);
        },
      );
      return node('path', {
        d,
        fill: paint.fill,
        'fill-rule': 'evenodd',
        opacity: sheet.opacity,
        style: paint.style,
      });
    }
    return node(
      'g',
      {
        fill: paint.fill,
        stroke: paint.fill,
        'stroke-width': f1(by * 2),
        'stroke-linejoin': 'round',
        opacity: sheet.opacity,
        style: paint.style,
      },
      pieces.map((piece) =>
        node('path', {
          d: remember(piece.ring, 'curve', () => closedCurve(piece.ring)),
          opacity: piece.opacity,
        }),
      ),
    );
  });
}

/** A piece laid over the body ringed in `color`, `width` out from its edge: filled, or stroked while it moves. */
export function partRing(ctx: MediumContext, piece: MediumPiece, width: number, color: string): Node {
  const { node, remember, ringsPath, closedCurve, f1 } = ctx.kit;
  const w = f1(width);
  return node('path', {
    d: remember(piece.ring, `ring${w}${ctx.settled}`, () =>
      ctx.settled ? ringsPath(grownRings([piece.ring], w)) : closedCurve(piece.ring),
    ),
    fill: color,
    ...(ctx.settled ? null : { stroke: color, 'stroke-width': f1(w * 2), 'stroke-linejoin': 'round' }),
  });
}

/**
 * A piece's fill, thickened in its own colour where it is thinner than
 * `minPx` pixels across, so a wick, a stalk or a swirl stays drawn at 24 px.
 */
export function pieceFill(ctx: MediumContext, piece: MediumPiece, fill: string, minPx = 1): Node {
  const { node, remember, closedCurve, f1 } = ctx.kit;
  const { ring } = piece;
  const px = pxPerUnit(ctx);
  const thin = Number.isFinite(px) ? minPx / px - remember(ring, 'thickness', () => thickness(ring)) : 0;
  return node('path', {
    d: remember(ring, 'curve', () => closedCurve(ring)),
    fill,
    ...(thin > 0 && !piece.mass
      ? { stroke: piece.color, 'stroke-width': f1(thin), 'stroke-linejoin': 'round' }
      : null),
  });
}

/** The side of a piece away from the light, or with `lit` the side toward it, hatched in `color`. */
export function hatchShade(
  ctx: MediumContext,
  piece: MediumPiece,
  {
    color,
    opacity,
    gap = 4.2,
    width = 1.5,
    angle = 38,
    seed = 3,
    lit = false,
  }: {
    color: string;
    opacity: number;
    gap?: number;
    width?: number;
    angle?: number;
    seed?: number;
    lit?: boolean;
  },
): Node {
  const { node, remember, extentOf, hatchPath } = ctx.kit;
  const { ring } = piece;
  const d = remember(ring, `hatch${angle}:${gap}:${seed}${lit ? ':lit' : ''}`, () => {
    const s = Math.max(6, extentOf(ring).size * 0.1) * (lit ? -1 : 1);
    return hatchPath(ring, { angle, gap, ragged: 1.5, seed, shade: [-s * 0.66, -s * 0.75] });
  });
  return node('path', {
    d,
    stroke: color,
    'stroke-width': width,
    'stroke-linecap': 'round',
    'stroke-opacity': opacity,
  });
}

/**
 * What of a piece the piece moved by `shift` does not cover, filled: a hard
 * shade or a light edge, sized to the piece (the shift is for a piece 200
 * units across). Nothing while a belt is morphing the body.
 */
export function crescent(
  ctx: MediumContext,
  piece: MediumPiece,
  shift: readonly [number, number],
  fill: string,
  opacity: number,
): Node | null {
  if (!ctx.settled) return null;
  const { node, remember, ringsPath, extentOf, f1 } = ctx.kit;
  const { ring } = piece;
  const k = f1(Math.min(1, Math.max(0.3, extentOf(ring).size / 200)));
  const [dx, dy] = shift;
  return node('path', {
    d: remember(ring, `crescent${dx}:${dy}:${k}`, () => ringsPath(crescentRings(ring, dx * k, dy * k))),
    fill,
    'fill-opacity': opacity,
  });
}

type Pt = readonly [number, number];

/** Points every `spacing` units round a closed ring, and its length. */
function resample(ring: Ring, spacing: number): { pts: Pt[]; total: number } {
  const cum = [0];
  for (let i = 1; i <= ring.length; i++) {
    const a = ring[i - 1]!;
    const b = ring[i % ring.length]!;
    cum.push(cum[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[ring.length]!;
  const count = Math.max(24, Math.round(total / spacing));
  const pts: Pt[] = [];
  let k = 0;
  for (let n = 0; n < count; n++) {
    const s = (total * n) / count;
    while (cum[k + 1]! < s) k++;
    const a = ring[k]!;
    const b = ring[(k + 1) % ring.length]!;
    const seg = cum[k + 1]! - cum[k]!;
    const t = seg > 0 ? (s - cum[k]!) / seg : 0;
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return { pts, total };
}

/** +1 where a ring runs clockwise on screen (its outward normal is the tangent turned left), else -1. */
function winding(ring: readonly Pt[]): number {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area > 0 ? 1 : -1;
}

/** The unit tangent and outward normal at point i of a ring of the given winding. */
function frameAt(pts: readonly Pt[], i: number, wind: number): { t: Pt; n: Pt } {
  const a = pts[(i - 1 + pts.length) % pts.length]!;
  const b = pts[(i + 1) % pts.length]!;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const t: Pt = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  return { t, n: [t[1] * wind, -t[0] * wind] };
}

/** Whether a point lies inside a ring. */
export function insideRing([x, y]: Pt, ring: Ring): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j]!;
    const [bx, by] = ring[i]!;
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) hit = !hit;
  }
  return hit;
}

/** How far a point lies from a ring's edge. */
export function distanceToRing([x, y]: Pt, ring: Ring): number {
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j]!;
    const [bx, by] = ring[i]!;
    const ex = bx - ax;
    const ey = by - ay;
    const t = Math.min(1, Math.max(0, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey || 1)));
    best = Math.min(best, Math.hypot(x - ax - ex * t, y - ay - ey * t));
  }
  return best;
}

const pathOf = (pts: readonly Pt[], f1: (n: number) => number): string =>
  pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`).join('') + 'Z';

/**
 * An outline's `shape` (`UnderlaySheet.shape`) cut with pinking shears:
 * teeth `amp` high and about `period` apart pushed out from every ring.
 */
export function pinked(ctx: MediumContext, amp: number, period: number): (rings: Ring[]) => string {
  return (rings) =>
    rings
      .map((ring) => {
        const { pts, total } = resample(ring, Math.min(1.2, period / 6));
        const wind = winding(ring);
        const teeth = Math.max(8, Math.round(total / period));
        const out = pts.map((p, i): Pt => {
          const { n } = frameAt(pts, i, wind);
          const phase = (i / pts.length) * teeth;
          const tri = 1 - Math.abs(2 * (phase - Math.floor(phase)) - 1);
          return [p[0] + n[0] * amp * tri, p[1] + n[1] * amp * tri];
        });
        return pathOf(out, ctx.kit.f1);
      })
      .join('');
}

/** Where a mark sits on a piece: its centre, the edge's tangent there and its outward normal. */
export interface EdgeMark {
  at: Pt;
  t: Pt;
  n: Pt;
}

/**
 * Places `depth` inside a piece's edge, about `gap` apart, where the piece
 * is at least `depth` thick, outside the face's ellipse grown by `clear`
 * and under none of the figure's other pieces of another tone.
 */
export function edgeMarks(
  ctx: MediumContext,
  piece: MediumPiece,
  { gap, depth, clear }: { gap: number; depth: number; clear: number },
): EdgeMark[] {
  const { ring } = piece;
  const { pts } = resample(ring, 0.8);
  const wind = winding(ring);
  const step = Math.max(1, Math.round(gap / 0.8));
  const { x: fx, y: fy, sx, sy } = ctx.face;
  const covers = ctx.pieces
    .filter((other) => other !== piece && other.tone !== 'body')
    .map((other) => other.ring);
  const marks: EdgeMark[] = [];
  for (let i = 0; i < pts.length; i += step) {
    const { t, n } = frameAt(pts, i, wind);
    const at: Pt = [pts[i]![0] - n[0] * depth, pts[i]![1] - n[1] * depth];
    if (distanceToRing(at, ring) < depth - 0.6) continue;
    if (((at[0] - fx) / (sx * 1.12 + clear)) ** 2 + ((at[1] - fy) / (sy * 1.12 + clear)) ** 2 < 1) continue;
    if (covers.some((cover) => insideRing(at, cover))) continue;
    marks.push({ at, t, n });
  }
  return marks;
}

/**
 * A streak of light following a piece's edge `depth` inside it: centred
 * where a ray in direction `toward` leaves the piece, from the face on the
 * body and from its own centre on any other piece, running `length` along
 * the edge, stroked `width` wide with round ends. A gloss bean, a candy
 * streak.
 */
export function edgeStreak(
  ctx: MediumContext,
  piece: MediumPiece,
  {
    toward,
    depth,
    length,
    width,
    color,
    opacity,
  }: { toward: Pt; depth: number; length: number; width: number; color: string; opacity?: number },
): Node | null {
  if (!ctx.settled) return null;
  const { node, remember, extentOf, f1 } = ctx.kit;
  const { ring } = piece;
  const own = extentOf(ring);
  const [fx, fy] = piece.key === 'body' ? [ctx.face.x, ctx.face.y] : [own.cx, own.cy];
  const key = `streak${f1(toward[0])}:${f1(toward[1])}:${f1(depth)}:${f1(length)}:${f1(fx)}:${f1(fy)}`;
  const d = remember(ring, key, () => {
    const { pts } = resample(ring, 1);
    const wind = winding(ring);
    const len = Math.hypot(toward[0], toward[1]) || 1;
    const [ux, uy] = [toward[0] / len, toward[1] / len];
    let best = 0;
    let bestScore = -Infinity;
    pts.forEach(([x, y], i) => {
      const dx = x - fx;
      const dy = y - fy;
      const score = (dx * ux + dy * uy) / (Math.hypot(dx, dy) || 1);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    const half = Math.max(1, Math.round(length / 2));
    const line: Pt[] = [];
    for (let k = -half; k <= half; k++) {
      const i = (best + k + pts.length) % pts.length;
      const { n } = frameAt(pts, i, wind);
      const at: Pt = [pts[i]![0] - n[0] * depth, pts[i]![1] - n[1] * depth];
      if (insideRing(at, ring)) line.push(at);
    }
    return line.length > 1 ? line.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`).join('') : '';
  });
  if (!d) return null;
  return node('path', {
    d,
    fill: 'none',
    stroke: color,
    'stroke-width': f1(width),
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-opacity': opacity,
  });
}

/*
 * A crescent of radius 1 bulging toward +y: the unit disc less a disc of
 * radius 0.867 centred 0.633 above it, met at (±0.858, -0.513).
 */
const CRESCENT = { meet: [0.858, -0.513], inner: 0.867 } as const;

/** A crescent cut-out (月牙纹) of radius `r` at a mark, its bulge toward the edge. */
export function crescentAt({ at, t, n }: EdgeMark, r: number, f1: (n: number) => number): string {
  const place = (u: number, v: number): Pt => [
    at[0] + (u * t[0] + v * n[0]) * r,
    at[1] + (u * t[1] + v * n[1]) * r,
  ];
  const flip = t[0] * n[1] - t[1] * n[0] < 0;
  const [mx, my] = CRESCENT.meet;
  const [ax, ay] = place(-mx, my);
  const [bx, by] = place(mx, my);
  const ri = f1(CRESCENT.inner * r);
  return (
    `M${f1(ax)} ${f1(ay)}A${f1(r)} ${f1(r)} 0 1 ${flip ? 1 : 0} ${f1(bx)} ${f1(by)}` +
    `A${ri} ${ri} 0 0 ${flip ? 0 : 1} ${f1(ax)} ${f1(ay)}Z`
  );
}

/**
 * The figure's body silhouette moved by `shift`, painted `color` at
 * `opacity`: a hard drop step under a cut-out sheet, an off-register plate.
 */
export function shiftedCopy(
  ctx: MediumContext,
  pieces: readonly MediumPiece[],
  shift: readonly [number, number],
  attrs: Record<string, string | number | undefined>,
): Node {
  const { node, remember, closedCurve, f1 } = ctx.kit;
  return node(
    'g',
    { transform: `translate(${f1(shift[0])} ${f1(shift[1])})`, ...attrs },
    pieces.map((piece) =>
      node('path', {
        d: remember(piece.ring, 'curve', () => closedCurve(piece.ring)),
        opacity: piece.opacity,
      }),
    ),
  );
}

/** A ring drawn `by` inside a piece's edge, as an open stroke: a stitch line, a cut line. */
export function insetLine(
  ctx: MediumContext,
  piece: MediumPiece,
  by: number,
  attrs: Record<string, string | number | undefined>,
): Node | null {
  if (!ctx.settled) return null;
  const { node, remember, ringsPath, f1 } = ctx.kit;
  const d = remember(piece.ring, `inset${f1(by)}`, () => ringsPath(insetRings([piece.ring], by)));
  return d ? node('path', { d, ...attrs }) : null;
}
