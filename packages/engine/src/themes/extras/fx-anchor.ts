/**
 * Where a theme's shape has its state effects: the top right, as `fx.ts`
 * lays them out, unless the figure itself is there.
 *
 * The effects are laid out against the box, and a figure whose props reach
 * into the top right (a crown, a bow, a hat's tip, a tower) has the Zz or the
 * sweat drawn over them. Read against the figure's outline (its body and
 * every part), such a shape takes the free corner instead: the layout
 * mirrored to the top left, or moved a little, whichever keeps the effect
 * clearest of the figure and inside the box. A shape whose top right is free
 * keeps the layout exactly as it was.
 */
import type { FxKind, ShapeDef } from '../../core/types.js';
import type { FxItem } from '../../motion/fx.js';
import { K } from './kit.js';
import { clearance, silhouetteOf, type Silhouette } from './silhouette.js';

/** How an effect is placed on a shape: mirrored about the centre, then moved by (dx, dy). */
export interface FxPlacement {
  mirror: boolean;
  dx: number;
  dy: number;
}

/** A circle an effect covers: centre and radius, in shape units. */
export type Footprint = readonly [number, number, number];

const AS_LAID: FxPlacement = { mirror: false, dx: 0, dy: 0 };

/** The kinds not laid out in the top-right margin: a tear rides the eye, gathering sparkles circle the body. */
const ELSEWHERE: ReadonlySet<FxKind> = new Set<FxKind>(['tear', 'gather']);

/** How far clear of the figure an effect is kept, in shape units: it moves a little round where it rests. */
const MARGIN = 4;

/** Shifts tried when neither corner is clear, in shape units. */
const SHIFTS = [0, -4, 4, -8, 8, -12, 12];

function itemFootprint(item: FxItem): Footprint[] {
  const { x, y, size: s } = item;
  switch (item.shape) {
    case 'z':
      return [[x, y, s * 0.72]];
    case 'heart':
      return [[x, y - s * 0.2, s * 1.3]];
    case 'bang':
      return [
        [x, y + 4 * s, 4 * s],
        [x, y + 12 * s, 4 * s],
        [x, y + 19.5 * s, 3 * s],
      ];
    case 'line': {
      const r = (item.width ?? 2) / 2 + 1;
      const x2 = item.x2 ?? x;
      const y2 = item.y2 ?? y;
      return [
        [x, y, r],
        [(x + x2) / 2, (y + y2) / 2, r],
        [x2, y2, r],
      ];
    }
    case 'arc': {
      const w = (item.width ?? 0) / 2;
      const sweep = item.sweep ?? 360;
      if (sweep >= 359) return [[x, y, s + w]];
      // A partial arc covers its stroke, not the disc it bounds.
      return [0, 1 / 3, 2 / 3, 1].map((k): Footprint => {
        const a = (((item.start ?? 0) + sweep * k) * Math.PI) / 180;
        return [x + Math.sin(a) * s, y - Math.cos(a) * s, w + 1];
      });
    }
    case 'pencil':
      return [[x, y, 12]];
    default:
      return [[x, y, s]];
  }
}

/** Where an effect's pieces rest, as circles. */
function footprintOf(kind: FxKind): Footprint[] {
  return K.evaluateFx(kind, 0, { settled: true }).items.flatMap(itemFootprint);
}

/** How far the circles reach into the figure, and how far out of the box the shape is drawn in. */
function cost(
  circles: readonly Footprint[],
  figure: Silhouette,
  scale: number,
): { overlap: number; outside: number } {
  const { center: c, viewBox: box } = K;
  const lo = (b: number) => c + (b - c) / scale;
  const x0 = lo(box.minX);
  const y0 = lo(box.minY);
  const x1 = lo(box.minX + box.width);
  const y1 = lo(box.minY + box.height);
  let overlap = 0;
  let outside = 0;
  for (const [x, y, r] of circles) {
    overlap += Math.max(0, r + MARGIN - clearance(figure, x, y, r + MARGIN + 1));
    outside +=
      Math.max(0, x0 - (x - r)) +
      Math.max(0, x + r - x1) +
      Math.max(0, y0 - (y - r)) +
      Math.max(0, y + r - y1);
  }
  return { overlap, outside };
}

const place = (circles: readonly Footprint[], { mirror, dx, dy }: FxPlacement): Footprint[] =>
  circles.map(([x, y, r]) => [(mirror ? 2 * K.center - x : x) + dx, y + dy, r]);

const figures = new WeakMap<ShapeDef, Silhouette>();
const placements = new WeakMap<ShapeDef, Map<FxKind, FxPlacement>>();

/** The figure's outline, body and parts, as `clearance` reads it. */
export function figureOf(shape: ShapeDef): Silhouette {
  let figure = figures.get(shape);
  if (!figure) {
    figure = silhouetteOf([shape.outline, ...shape.parts.map((part) => part.outline)]);
    figures.set(shape, figure);
  }
  return figure;
}

/** Where `kind` sits on `shape` drawn at `scale`: as laid out, unless the figure is in its way. */
export function fxPlacement(shape: ShapeDef, kind: FxKind, scale: number): FxPlacement {
  if (ELSEWHERE.has(kind) || shape.parts.length === 0) return AS_LAID;
  let byKind = placements.get(shape);
  if (!byKind) placements.set(shape, (byKind = new Map()));
  let found = byKind.get(kind);
  if (found) return found;
  const figure = figureOf(shape);
  const circles = footprintOf(kind);
  const laid = cost(circles, figure, scale);
  found = AS_LAID;
  // Only a figure that is in the way moves it; the margin alone never does.
  const blocked = circles.some(([x, y, r]) => clearance(figure, x, y, r + 1) < r * 0.5);
  if (blocked) {
    // An effect laid out reaching past the box may keep doing so; a move is never made to pull it in.
    const score = ({ overlap, outside }: { overlap: number; outside: number }, dx: number, dy: number) =>
      overlap + Math.max(0, outside - laid.outside) * 2 + (Math.abs(dx) + Math.abs(dy)) * 0.05;
    let best = score(laid, 0, 0);
    let bestOverlap = laid.overlap;
    for (const mirror of [false, true]) {
      for (const dy of SHIFTS) {
        for (const dx of SHIFTS) {
          const option = { mirror, dx, dy };
          const placed = cost(place(circles, option), figure, scale);
          const value = score(placed, dx, dy);
          if (value < best - 0.5) {
            best = value;
            bestOverlap = placed.overlap;
            found = option;
          }
        }
      }
    }
    // A move that only shaves a little off is not worth the effect leaving its corner.
    if (found !== AS_LAID && bestOverlap > laid.overlap * 0.6) found = AS_LAID;
  }
  byKind.set(kind, found);
  return found;
}

/** Whether a placement leaves the effect where it was laid out. */
export const asLaid = (placement: FxPlacement): boolean =>
  !placement.mirror && placement.dx === 0 && placement.dy === 0;

/** The circles `kind` covers on `shape`, where it is placed: what a mood decoration keeps clear of. */
export function fxFootprint(shape: ShapeDef, kind: FxKind, scale: number): Footprint[] {
  if (ELSEWHERE.has(kind)) return [];
  return place(footprintOf(kind), fxPlacement(shape, kind, scale));
}

const placers = new WeakMap<FxPlacement, (item: FxItem, opacity: number) => FxItem>();

/** What places an effect's pieces as `placement` says, fading them to `opacity`. */
export function placerOf(placement: FxPlacement): (item: FxItem, opacity: number) => FxItem {
  let placer = placers.get(placement);
  if (!placer) {
    const { mirror, dx, dy } = placement;
    const x = (v: number) => (mirror ? 2 * K.center - v : v) + dx;
    placer = (item, opacity) => ({
      ...item,
      x: x(item.x),
      y: item.y + dy,
      ...(item.x2 === undefined ? null : { x2: x(item.x2) }),
      ...(item.y2 === undefined ? null : { y2: item.y2 + dy }),
      ...(mirror && item.rotation !== undefined ? { rotation: -item.rotation } : null),
      ...(mirror && item.start !== undefined ? { start: -item.start - (item.sweep ?? 0) } : null),
      opacity,
    });
    placers.set(placement, placer);
  }
  return placer;
}
