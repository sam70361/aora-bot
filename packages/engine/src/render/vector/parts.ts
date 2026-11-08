/**
 * The figure's other pieces, drawn in every vector variant.
 *
 * A body is one ring; ears, an antenna and leaves are not. They arrive in the
 * snapshot as `body.parts`, already under the body transform, and this module
 * is the only place the vector style knows what to do with them, so the
 * variant code in `build.ts` just asks for layers:
 *
 * - `behind`: the pieces that are more of the body's ink, painted under it;
 * - `front`: accessories (`leaf`, `inner`, `hair`), painted over it;
 * - `silhouette`: for the outlined variants, the body and its same-ink pieces
 *   as one outline, so an ear is not walled off from the head by a stroke.
 *
 * `sticker` and `paper` add the pieces to their own layers through
 * `partsPaper` and `partsShadow`.
 */
import { LEAF_COLOR } from '../../core/leaf.js';
import { smoothClosedPath } from '../../math/path-builder.js';
import type { PartColor, Point, Ring } from '../../core/types.js';
import type { FrameSnapshot, PartFrame } from '../../sim/snapshot.js';
import type { PartColorPaint } from '../part-color.js';
import { node, r2, type SceneNode } from '../scene.js';
import type { ExtrasScene } from '../../themes/extras-hook.js';

/**
 * The leaf's paint in a live scene: a token, so a host re-tints it and the
 * React layer can lighten it for a green body without the engine knowing
 * which colour the character is.
 */
export const LEAF_TOKEN = `var(--aora-leaf, ${LEAF_COLOR})`;

/** How much white is mixed into the ink for the inside of an ear. */
export const INNER_WHITE = 0.45;

/** How much of the hair shade (black, or white on a dark black body) is laid over the ink for hair on a filled body. */
export const HAIR_SHADE_OPACITY = 0.4;

/** Opacity below which a piece is not worth a node. */
const VISIBLE = 0.01;

/** Width of the ring round a part with its own colour, in shape units; half of it shows outside the part. */
export const PART_RIM_WIDTH = 4;

export interface PartPaint {
  /** The body's paint, as resolved by the scene. */
  ink: string;
  /** The leaf's paint. */
  leaf: string;
  /** What hair is shaded towards. */
  hairShade: string;
  /** Stroke width of the outlined variants, in shape units. */
  strokeWidth: number;
  /** A live scene keeps its nodes; a static one drops what is at its default. */
  live: boolean;
  /** A part's own colour and its ring, as the scene resolves them. */
  partColor: (color: PartColor) => PartColorPaint;
  /** The line an outlined variant draws a colour in: shifted towards the page's contrast, as its face is. */
  line: (color: string) => string;
  /** How a part's signature motion plays (a theme's extras); without it every part is drawn at rest. */
  motion?: ExtrasScene;
}

/** A part's nodes as its motion moves them, or as they are. */
const movedPart = (part: PartFrame, nodes: SceneNode[], motion?: ExtrasScene) =>
  motion && part.motion ? motion.part(part, nodes) : nodes;

/** Whether a piece is more of the body: its ink, and no colour of its own. */
export const isBodyPiece = (part: PartFrame): boolean => part.tone === 'body' && part.color === undefined;

export interface PartLayers {
  behind: SceneNode[];
  front: SceneNode[];
  /** Path data replacing the body's, for an outlined variant that merged its pieces; else `null`. */
  silhouette: string | null;
}

const NONE: PartLayers = { behind: [], front: [], silhouette: null };

const smooth = new WeakMap<Ring, string>();

/** Smooth path for a part's outline, remembered by the identity of the array, as the body's is. */
export function partPath(outline: Ring): string {
  let d = smooth.get(outline);
  if (d === undefined) {
    d = smoothClosedPath(outline);
    smooth.set(outline, d);
  }
  return d;
}

const alphaOf = (part: PartFrame, live: boolean): number | undefined =>
  !live && part.opacity >= 1 ? undefined : r2(part.opacity);

/** Whether the part is drawn at all this frame; a live scene draws it anyway, hidden. */
const shown = (part: PartFrame, live: boolean): boolean => live || part.opacity > VISIBLE;

export function partLayers(frame: FrameSnapshot, paint: PartPaint): PartLayers {
  const parts = frame.body.parts;
  // A live scene keeps the two groups even with nothing in them, so a change of
  // shape adds and removes children of a stable parent.
  if (parts.length === 0) return paint.live ? { behind: [], front: [], silhouette: null } : NONE;

  const hollow = frame.variant === 'outline' || frame.variant === 'glass';
  const behind: SceneNode[] = [];
  const front: SceneNode[] = [];
  let silhouette: string | null = null;

  if (hollow) {
    const merged = mergedOutline(frame.body.outline, parts);
    if (merged) silhouette = smoothClosedPath(merged);
  }

  for (const part of parts) {
    if (!shown(part, paint.live)) continue;
    const d = partPath(part.outline);
    const opacity = alphaOf(part, paint.live);
    const put = (layer: SceneNode[], nodes: SceneNode[]): void => {
      if (part.motion) layer.push(...movedPart(part, nodes, paint.motion));
      else layer.push(...nodes);
    };

    if (part.color !== undefined) {
      put(part.tone === 'body' ? behind : front, colouredPart(frame, part, d, opacity, paint, hollow));
      continue;
    }
    if (part.tone === 'body') {
      // Already inside the silhouette when the outline was merged.
      if (silhouette !== null) continue;
      put(behind, [
        node(
          'path',
          hollow ? hollowAttrs(frame, d, paint.ink, paint, opacity) : { d, fill: paint.ink, opacity },
        ),
      ]);
    } else if (hollow) {
      // Outlined, a leaf is drawn as an outline and the inside of an ear is left out.
      if (part.tone === 'leaf') put(front, [node('path', hollowAttrs(frame, d, paint.ink, paint, opacity))]);
      if (part.tone === 'hair') {
        put(front, [
          node('path', {
            d,
            fill: paint.ink,
            stroke: paint.ink,
            'stroke-width': paint.strokeWidth,
            'stroke-linejoin': 'round',
            opacity,
          }),
        ]);
      }
    } else if (part.tone === 'hair') {
      put(front, [
        node('path', { d, fill: paint.ink, opacity }),
        node('path', { d, fill: paint.hairShade, 'fill-opacity': HAIR_SHADE_OPACITY, opacity }),
      ]);
    } else if (part.tone === 'leaf') {
      put(front, [node('path', { d, fill: paint.leaf, opacity })]);
    } else {
      // White over the ink rather than a computed mix: that works for a token,
      // a flat colour and a gradient alike, which `color-mix` cannot do for the last.
      put(front, [
        node('path', { d, fill: paint.ink, opacity }),
        node('path', { d, fill: '#fff', 'fill-opacity': INNER_WHITE, opacity }),
      ]);
    }
  }

  return { behind, front, silhouette };
}

/**
 * A part in its own colour. Filled, it is laid flat in that colour, whatever
 * its tone, and ringed in its derived line, the ring under the fill so only
 * its outer half shows. Outlined, it is a line in its colour, as the body is a
 * line in the ink.
 */
function colouredPart(
  frame: FrameSnapshot,
  part: PartFrame,
  d: string,
  opacity: number | undefined,
  paint: PartPaint,
  hollow: boolean,
): SceneNode[] {
  const own = paint.partColor(part.color!);
  if (hollow) {
    if (part.tone === 'inner') return [];
    const line = paint.line(own.fill);
    if (part.tone !== 'hair') return [node('path', hollowAttrs(frame, d, line, paint, opacity))];
    return [
      node('path', {
        d,
        fill: line,
        stroke: line,
        'stroke-width': paint.strokeWidth,
        'stroke-linejoin': 'round',
        opacity,
      }),
    ];
  }
  return [
    node('path', {
      d,
      fill: own.fill,
      stroke: own.rim,
      'stroke-width': PART_RIM_WIDTH,
      'stroke-linejoin': 'round',
      'paint-order': 'stroke',
      opacity,
    }),
  ];
}

function hollowAttrs(
  frame: FrameSnapshot,
  d: string,
  stroke: string,
  paint: PartPaint,
  opacity: number | undefined,
): Record<string, string | number | undefined> {
  const attrs: Record<string, string | number | undefined> = {
    d,
    fill: frame.variant === 'glass' ? stroke : 'none',
    'fill-opacity': frame.variant === 'glass' ? 0.16 : undefined,
    stroke,
    'stroke-width': paint.strokeWidth,
    'stroke-linejoin': 'round',
    opacity,
  };
  return attrs;
}

export interface BodyPiece {
  d: string;
  outline: Ring;
  /** `undefined` where a static document can leave it out. */
  opacity: number | undefined;
}

/**
 * The pieces that are more of the body's ink, for the variants that lay
 * several passes over the body (soft's wash, riso's second ink and screen):
 * each pass has to cover them with the body, or an ear would keep the flat
 * paint while the head around it was shaded.
 */
export function bodyPieces(frame: FrameSnapshot, live: boolean): BodyPiece[] {
  return frame.body.parts
    .filter((part) => isBodyPiece(part) && shown(part, live))
    .map((part) => ({ d: partPath(part.outline), outline: part.outline, opacity: alphaOf(part, live) }));
}

/** Every piece, as paper under the sticker's border: the stroke is twice the edge, half of it hidden. */
export function partsPaper(
  frame: FrameSnapshot,
  paper: string,
  edge: number,
  live: boolean,
  motion?: ExtrasScene,
): SceneNode[] {
  return frame.body.parts
    .filter((part) => shown(part, live))
    .flatMap((part) =>
      movedPart(
        part,
        [
          node('path', {
            d: partPath(part.outline),
            fill: paper,
            stroke: paper,
            'stroke-width': r2(edge * 2),
            'stroke-linejoin': 'round',
            opacity: alphaOf(part, live),
          }),
        ],
        motion,
      ),
    );
}

/** Every piece, in the ink and then in black over it, as the paper variant's hard shadow. */
export function partsShadow(
  frame: FrameSnapshot,
  ink: string,
  darkness: number,
  live: boolean,
  motion?: ExtrasScene,
): SceneNode[] {
  const out: SceneNode[] = [];
  for (const part of frame.body.parts) {
    if (!shown(part, live)) continue;
    const d = partPath(part.outline);
    const opacity = alphaOf(part, live);
    out.push(
      ...movedPart(
        part,
        [
          node('path', { d, fill: ink, opacity }),
          node('path', { d, fill: '#000', 'fill-opacity': r2(darkness), opacity }),
        ],
        motion,
      ),
    );
  }
  return out;
}

/**
 * The body and its same-ink pieces as one outline, for a line drawn round the
 * whole figure; `null` when there is nothing to merge or the merge fails.
 */
export function mergedSilhouette(frame: FrameSnapshot): Ring | null {
  return mergedOutline(frame.body.outline, frame.body.parts);
}

// ---------------------------------------------------------------- the union

const merged = new WeakMap<Ring, Ring | null>();

/**
 * The body and its same-ink pieces as one outline, or `null` when there is
 * nothing to merge or the pieces are mid-fade.
 *
 * Only a frame where every piece is fully there merges: a fading ear drawn
 * into the outline would drag the whole silhouette in and out. The result is
 * cached by the body's own ring, which is the registry's array for a plain
 * shape and a fresh one while a belt takes over — and a belt takes the pieces
 * away first.
 */
function mergedOutline(body: Ring, parts: readonly PartFrame[]): Ring | null {
  const same = parts.filter(isBodyPiece);
  if (same.length === 0 || same.some((part) => part.opacity < 0.999)) return null;

  const cached = merged.get(body);
  if (cached !== undefined) return cached;

  let ring: Ring | null = body;
  for (const part of same) {
    ring = ring && unionOutline(ring, part.outline);
  }
  merged.set(body, ring);
  return ring;
}

type Crossing = { edgeA: number; tA: number; edgeB: number; tB: number; point: Point };

/** Positive-area winding, so both outlines run the same way round. */
function wound(points: readonly Point[]): Point[] {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum >= 0 ? [...points] : points.map((_, i) => points[points.length - 1 - i]!);
}

function contains(polygon: readonly Point[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

interface Node {
  point: Point;
  /** Index into the crossings, for a node that is where the two outlines cross. */
  crossing?: number;
  /** Whether the stretch to the next node lies outside the other outline. */
  outside: boolean;
}

/** An outline's vertices with the crossings spliced in along its edges, each stretch classified. */
function withCrossings(
  polygon: readonly Point[],
  crossings: readonly Crossing[],
  other: readonly Point[],
  side: 'A' | 'B',
): Node[] {
  const nodes: Node[] = [];
  const n = polygon.length;
  const onEdge = (i: number) =>
    crossings
      .map((c, index) => ({ c, index }))
      .filter(({ c }) => (side === 'A' ? c.edgeA : c.edgeB) === i)
      .sort((x, y) => (side === 'A' ? x.c.tA - y.c.tA : x.c.tB - y.c.tB));

  for (let i = 0; i < n; i++) {
    nodes.push({ point: polygon[i]!, outside: false });
    for (const { c, index } of onEdge(i)) nodes.push({ point: c.point, crossing: index, outside: false });
  }
  for (let k = 0; k < nodes.length; k++) {
    const a = nodes[k]!.point;
    const b = nodes[(k + 1) % nodes.length]!.point;
    nodes[k]!.outside = !contains(other, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  return nodes;
}

/**
 * The outline of the union of two overlapping closed outlines, or `null` when
 * they do not cross cleanly — in which case the caller strokes them apart.
 *
 * Walk the first outline's stretches that lie outside the second until a
 * crossing, step onto the second there, and keep going until the start comes
 * round again. Both are wound the same way, so at a crossing the second's
 * next stretch is the one that leaves the first.
 */
export function unionOutline(first: readonly Point[], second: readonly Point[]): Ring | null {
  const A = wound(first);
  const B = wound(second);
  const crossings: Crossing[] = [];

  for (let i = 0; i < A.length; i++) {
    const a0 = A[i]!;
    const a1 = A[(i + 1) % A.length]!;
    for (let j = 0; j < B.length; j++) {
      const b0 = B[j]!;
      const b1 = B[(j + 1) % B.length]!;
      const rx = a1[0] - a0[0];
      const ry = a1[1] - a0[1];
      const sx = b1[0] - b0[0];
      const sy = b1[1] - b0[1];
      const denom = rx * sy - ry * sx;
      if (Math.abs(denom) < 1e-12) continue;
      const tA = ((b0[0] - a0[0]) * sy - (b0[1] - a0[1]) * sx) / denom;
      const tB = ((b0[0] - a0[0]) * ry - (b0[1] - a0[1]) * rx) / denom;
      // Half-open, so a crossing that lands on a vertex belongs to one edge only.
      if (tA < 0 || tA >= 1 || tB < 0 || tB >= 1) continue;
      crossings.push({ edgeA: i, tA, edgeB: j, tB, point: [a0[0] + rx * tA, a0[1] + ry * tA] });
    }
  }
  if (crossings.length < 2 || crossings.length % 2 !== 0) return null;

  const nodesA = withCrossings(A, crossings, B, 'A');
  const nodesB = withCrossings(B, crossings, A, 'B');
  const at = (nodes: Node[], crossing: number) => nodes.findIndex((n) => n.crossing === crossing);

  const start = nodesA.findIndex((n) => n.crossing !== undefined && n.outside);
  if (start < 0) return null;

  const out: Point[] = [];
  let onA = true;
  let k = start;
  for (let guard = 0; guard < (nodesA.length + nodesB.length) * 2; guard++) {
    const nodes = onA ? nodesA : nodesB;
    out.push(nodes[k]!.point);
    k = (k + 1) % nodes.length;

    const arrived = nodes[k]!;
    if (arrived.crossing === undefined) continue;

    onA = !onA;
    const next = onA ? nodesA : nodesB;
    k = at(next, arrived.crossing);
    if (k < 0 || !next[k]!.outside) return null;
    // Back where it began: the outline is closed.
    if (onA && k === start) return out;
  }
  return null;
}
