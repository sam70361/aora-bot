/**
 * The Easter skin, `pastel` (粉彩蜡笔): the figure coloured in with pastel
 * wax crayons and cut out of the sheet with a margin of paper left round it.
 * A dark crayon line runs round the figure and round every piece on it, its
 * weight rising and falling as a hand-drawn line does and the paper's tooth
 * breaking it here and there; the shade is hatched, a few pale strokes catch
 * the light, and the wax leaves streaks and lets the paper's tooth show
 * through. The paper is a near-white tint of the ink, and its margin takes a
 * pastel tint of the state's mood; the line is a dark, quiet shade of the ink.
 */
import type { Ring } from '../../core/types.js';
import type { MediumContext, MediumPiece } from '../../render/vector/media.js';
import type { FrameSnapshot } from '../../sim/snapshot.js';
import { grownRings } from '../outline-field.js';
import { pastel } from '../shared/paints.js';
import {
  grownUnderlay,
  hatchShade,
  insideRing,
  partRing,
  pieceFill,
  pxPerUnit,
  smallWidth,
} from '../shared/skins.js';
import type { ThemeVariant } from '../types.js';

/**
 * Crayon sizes in shape units: the paper margin and the least hole it keeps
 * open (Wicker's handle, in square units), the line round the figure and
 * round each piece, how far the margin and the line wander in and out along
 * the edge, the longest stretch of edge between two wandered points, and the
 * smallest piece the wax grain is laid on.
 */
const CRAYON = {
  paper: 8.5,
  opening: 1000,
  line: 3.8,
  partLine: 2,
  wander: 2.6,
  step: 4.5,
  grainMin: 50,
  shade: { gap: 4.6, width: 1.5, angle: 36, opacity: 0.36 },
  light: { gap: 6.5, width: 2.2, angle: 36, opacity: 0.55 },
} as const;

/**
 * The paper's tooth breaking the crayon line: rows of paper pits along the
 * line, each at a share of the line's width out from the figure and `width`
 * across, with the pits' lengths and the gaps between them in shape units.
 */
const TOOTH = {
  rows: [
    { at: 0.3, width: 0.9, seed: 29 },
    { at: 0.68, width: 1.1, seed: 47 },
  ],
  pit: [0, 1.8],
  gap: [2, 11],
  count: 40,
} as const;

/**
 * The wax laid on thicker in streaks along the stroke: short strokes in the
 * line's colour scattered inside each grained piece at `angle`, in two
 * weights (how many to each 1000 square units, width and opacity), their
 * lengths in shape units, shown from `minPx` pixels per shape unit. Strokes
 * rather than a patterned fill, so a live figure does not paint another
 * pattern on every frame.
 */
const WAX = {
  angle: -34,
  length: [3, 12],
  weights: [
    { density: 3.2, width: 0.8, opacity: 0.15, seed: 61 },
    { density: 1.2, width: 1.5, opacity: 0.1, seed: 67 },
  ],
  minPx: 0.3,
} as const;

/** How far the paper is washed towards white: the margin, and the tooth showing through the wax. */
const PAPER = { margin: 92, tooth: 90 } as const;

/** How far an uncoloured leaf is washed towards white, so it reads as pastel wax like the sheet's own leaf. */
const LEAF_WASH = 40;

/** The crayon line: the ink darkened and quietened, so it reads as one dark stick on every pastel. */
const crayonLine = (solid: string): string =>
  solid.startsWith('url(') ? '#000' : `oklch(from ${solid} calc(l * 0.36) calc(c * 0.45 + 0.025) h)`;

/**
 * What hair is shaded towards in wax: a deeper tone rather than black, as a
 * pastel stick does not go dark, and a lighter one on a dark ink. It keeps
 * the ink's hue, except on a warm ink (35 to 115 degrees), where it takes
 * chocolate's, as the sheet shaded its butter and carrot towards chocolate:
 * butter hair comes out caramel, lilac hair a dusky lilac. The core lays 40%
 * of it over the ink, so it sits 0.425 from the ink in lightness, for hair
 * 0.17 deeper (or lighter) than the ink.
 */
const waxHairShade = (solid: string, fallback: string): string =>
  solid.startsWith('url(')
    ? fallback
    : `oklch(from ${solid} calc(l - 0.425 + 0.85 * clamp(0, (0.5 - l) * 100, 1)) calc(c * 0.65) ` +
      `calc(h + (45 - h) * clamp(0, (h - 25) / 10, 1) * clamp(0, (125 - h) / 10, 1)))`;

/*
 * A slow wave over shape space, between -1 and 1. It depends only on where a
 * point is, so the paper margin and the line beside it wander together.
 */
const WAVES = [
  [0.24, 0.07, 0, 0.42],
  [-0.11, 0.33, 2.1, 0.26],
  [0.47, -0.38, 4.2, 0.18],
  [0.93, 0.71, 1.3, 0.14],
] as const;
const wave = (x: number, y: number): number =>
  WAVES.reduce((sum, [fx, fy, phase, weight]) => sum + weight * Math.sin(fx * x + fy * y + phase), 0);

/** A ring with points added wherever two lie further apart than `step`, so a short wave has points to move. */
function dense(ring: Ring, step: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

/**
 * A ring pushed out and pulled in along its normal by `amp` times the wave,
 * with a point at least every `step` units.
 */
function wandered(given: Ring, amp: number, step: number = CRAYON.step): [number, number][] {
  const ring = dense(given, step);
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    area += a[0] * b[1] - b[0] * a[1];
  }
  const wind = area > 0 ? 1 : -1;
  return ring.map(([x, y], i) => {
    const a = ring[(i - 1 + ring.length) % ring.length]!;
    const b = ring[(i + 1) % ring.length]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = ((b[1] - a[1]) / len) * wind;
    const ny = (-(b[0] - a[0]) / len) * wind;
    const d = amp * wave(x, y);
    return [x + nx * d, y + ny * d];
  });
}

/** A sheet's outline (`UnderlaySheet.shape`) as a crayon leaves it, wandering `amp` either side of the grown edge. */
const crayonEdge =
  (ctx: MediumContext, amp: number) =>
  (rings: Ring[]): string =>
    rings.map((ring) => ctx.kit.closedCurve(wandered(ring, amp))).join('');

/** A seeded source of numbers in a range, rounded to a tenth. */
function seeded(from: number): (range: readonly [number, number]) => number {
  let seed = from;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return ([a, b]) => Math.round((a + rand() * (b - a)) * 10) / 10;
}

/** A row of the tooth's pits, as a `stroke-dasharray`: seeded, so every figure breaks its line alike. */
function toothDash(seed: number): string {
  const between = seeded(seed);
  return Array.from({ length: TOOTH.count }, () => `${between(TOOTH.pit)} ${between(TOOTH.gap)}`).join(' ');
}

const TOOTH_DASHES = TOOTH.rows.map((row) => toothDash(row.seed));

/** Wax streaks scattered inside a ring: seeded, and kept only where both ends fall inside it. */
function streaksIn(
  ring: Ring,
  density: number,
  seed: number,
  size: { cx: number; cy: number; size: number },
): string {
  const between = seeded(seed);
  const dx = Math.cos((WAX.angle * Math.PI) / 180);
  const dy = Math.sin((WAX.angle * Math.PI) / 180);
  const half = size.size / 2;
  const tries = Math.round(((size.size * size.size) / 1000) * density);
  let d = '';
  for (let k = 0; k < tries; k++) {
    const x = Math.round(between([size.cx - half, size.cx + half]));
    const y = Math.round(between([size.cy - half, size.cy + half]));
    const length = between(WAX.length);
    const sx = Math.round(dx * length * 10) / 10;
    const sy = Math.round(dy * length * 10) / 10;
    if (!insideRing([x, y], ring) || !insideRing([x + sx, y + sy], ring)) continue;
    d += `M${x} ${y}l${sx} ${sy}`;
  }
  return d;
}

/** The wax streaks over a grained piece, where the character is shown large enough for them to read. */
function waxOver(
  ctx: MediumContext,
  piece: MediumPiece,
  color: string,
): ReturnType<MediumContext['kit']['node']>[] {
  if (pxPerUnit(ctx) < WAX.minPx) return [];
  const { node, remember, extentOf } = ctx.kit;
  const strength = Math.min(1, ctx.params.grain);
  const extent = remember(piece.ring, 'extent', () => extentOf(piece.ring));
  return WAX.weights.map(({ density, width, opacity, seed }) =>
    node('path', {
      d: remember(piece.ring, `wax${seed}`, () => streaksIn(piece.ring, density, seed, extent)),
      fill: 'none',
      stroke: color,
      'stroke-width': width,
      'stroke-opacity': Math.round(opacity * strength * 100) / 100,
      'stroke-linecap': 'round',
    }),
  );
}

/**
 * The paper's tooth showing through the crayon line: rows of pits along the
 * line, which wander with it. A row follows the line's slow waves only and
 * is drawn straight between its points, which keeps it inside the line at a
 * fraction of the path's length. Left out while the outline is a belt's
 * morph, and where the character is too small for a pit to show.
 */
function toothPits(
  frame: FrameSnapshot,
  pieces: readonly MediumPiece[],
  ctx: MediumContext,
  line: number,
  amp: number,
): ReturnType<MediumContext['kit']['node']>[] {
  if (!ctx.settled || pieces.some((piece) => (piece.opacity ?? 1) < 0.999) || pxPerUnit(ctx) < 0.5) return [];
  const { node, remember, f1 } = ctx.kit;
  const stroke = pastel(ctx.paint.solid, PAPER.tooth);
  return TOOTH.rows.map((row, i) => {
    const by = f1(line * row.at);
    const d = remember(frame.body.outline, `tooth:${by}:${f1(amp)}:${pieces.length}`, () =>
      grownRings(
        pieces.map((piece) => piece.ring),
        by,
      )
        .map(
          (ring) =>
            `M${wandered(ring, amp * row.at, Infinity)
              .map(([x, y]) => `${f1(x)} ${f1(y)}`)
              .join('L')}Z`,
        )
        .join(''),
    );
    return node('path', {
      d,
      fill: 'none',
      stroke,
      'stroke-width': row.width,
      'stroke-dasharray': TOOTH_DASHES[i],
      'stroke-linecap': 'round',
    });
  });
}

const pastelCrayon: ThemeVariant = {
  style: 'vector',
  variant: 'pastel',
  reads: ['grain'],
  medium: {
    followsMood: true,
    grainedFills: true,
    grain: {
      tile: 40,
      angle: -34,
      opacity: 0.85,
      body: 0,
      specks: { count: 90, r: [0.35, 0.9] },
      streaks: { count: 90, length: [2, 6], width: 0.7, angle: -34, spread: 16 },
      seed: 57,
    },

    hairShade: (paint) => waxHairShade(paint.solid, paint.hairShade),
    leaf: (paint) => pastel(paint.leaf, LEAF_WASH),
    /**
     * The face in dark crayon on every pastel body (OKLCH lightness 0.6 and over on either page), in paper white
     * on the cocoa one. The pastels keep their tone on a dark page, so the face keeps its own rather than the page's.
     */
    faceInk: { dark: '#33262B', light: '#FFF8EE', split: 0.6 },

    /**
     * The margin is paper tinted with the mood: light enough to stay paper
     * on either page, coloured enough to tell one mood from another.
     */
    moodAccent: { share: 1.2, chroma: 0.07, lightness: { light: [0.82, 0.92], dark: [0.84, 0.95] } },

    /** The paper margin and the crayon line round the whole figure, the paper's tooth breaking the line. */
    underlay(frame, pieces, ctx) {
      const solid = ctx.paint.solid;
      const amp = smallWidth(ctx, CRAYON.wander, 0);
      const edge = crayonEdge(ctx, amp);
      const line = smallWidth(ctx, CRAYON.line, 0.8);
      const sheets = grownUnderlay(frame, pieces, ctx, [
        {
          by: smallWidth(ctx, CRAYON.paper, 1.5),
          fill: pastel(solid, PAPER.margin),
          accent: true,
          shape: edge,
          opening: CRAYON.opening,
        },
        { by: line, fill: crayonLine(solid), shape: edge },
      ]);
      return [...sheets, ...toothPits(frame, pieces, ctx, line, amp)];
    },

    /**
     * Wax over paper: each piece's own line, the paper under the wax (what
     * the grain lets through), the fill and its streaks, the hatched shade
     * and the pale strokes on the lit side. A small piece is filled flat: its grain would
     * not show, and every grained fill is a pattern the browser paints again
     * on each frame of a live scene.
     */
    paint(piece, ctx) {
      const solid = ctx.paint.solid;
      const line = crayonLine(solid);
      const { remember, extentOf } = ctx.kit;
      const grained =
        ctx.params.grain > 0 &&
        (piece.key === 'body' ||
          remember(piece.ring, 'extent', () => extentOf(piece.ring)).size >= CRAYON.grainMin);
      return [
        piece.tone === 'body' ? null : partRing(ctx, piece, smallWidth(ctx, CRAYON.partLine, 0.6), line),
        grained ? pieceFill(ctx, piece, pastel(solid, PAPER.tooth)) : null,
        pieceFill(ctx, piece, grained ? ctx.fill(piece) : piece.color),
        ...(grained ? waxOver(ctx, piece, line) : []),
        hatchShade(ctx, piece, { color: line, ...CRAYON.shade }),
        hatchShade(ctx, piece, { color: '#FFFFFF', seed: 8, lit: true, ...CRAYON.light }),
      ].filter((n) => n !== null);
    },
  },
};

export const SKINS: readonly ThemeVariant[] = [pastelCrayon];
