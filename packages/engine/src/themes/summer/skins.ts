/**
 * The Summer skin, `soda` (汽水波普): a soda-pop print. A bold ink line runs
 * round the figure and round every piece on it, a second copy of the
 * silhouette is printed off register in one of the sheet's print colours
 * (teal, coral or lemon) across the hue wheel from the ink, a crisp gloss
 * bean sits up and to the left of the face where the body's edge is the
 * figure's own outline and clear of the face, and a halftone screen
 * shades the body's side away from the light, big dots near the edge and
 * small ones further in. Pieces drawn behind the body in a colour of their
 * own stand free of the silhouette and the plate, each in its own ink ring.
 * The plate leans into the state's mood.
 */
import type { Ring } from '../../core/types.js';
import type { MediumContext, MediumPiece } from '../../render/vector/media.js';
import { deepOf } from '../shared/paints.js';
import {
  crescent,
  edgeStreak,
  grownUnderlay,
  insideRing,
  partRing,
  pieceFill,
  pxPerUnit,
  smallWidth,
} from '../shared/skins.js';
import type { ThemeVariant } from '../types.js';

/** Print sizes in shape units: the ink line round the figure and round each piece, and the plate's offset. */
const PRINT = {
  ink: 4.4,
  partInk: 2.8,
  plateShift: [9, 10],
  gloss: { toward: [-0.62, -0.78], depth: 11, length: 34, width: 9 },
  glossColor: '#FFFDF6',
  /** The face's clearance the gloss keeps out of: the face box grown by these factors. */
  faceClear: [1.08, 1.12],
  dots: { gap: 9, small: 1.7, large: 3.1, opacity: 0.3 },
  /** Shifts of the halftone's two screens, for a piece 200 units across: small dots far in, large near the edge. */
  screens: { small: [-26, -30], large: [-11, -13] },
  /** The halftone is left off where a shape unit is under this many pixels: the dots would turn to a grey wash. */
  dotsMinPx: 0.35,
} as const;

/**
 * How warm an ink is, from 0 (hues round blue and green) to 1 (hues round red and yellow), switching over within
 * about 20 degrees of the two hues square to a red-orange.
 */
const WARMTH = 'clamp(0, 0.5 + 1.5 * cos(calc((h - 30) * 1deg)), 1)';

/** How dark an ink is, from 0 at mid lightness and above to 1 at a deep sea green and below. */
const DARKNESS = 'clamp(0, (0.6 - l) * 8, 1)';

/**
 * The sheet's three print colours, chosen across the wheel from the ink: teal (`#1FBFB4`) under a warm ink, coral
 * (`#FF7657`) under a cool one, and lemon (`#FFD84A`) under a dark one.
 */
const plateOf = (solid: string): string =>
  solid.startsWith('url(')
    ? '#1FBFB4'
    : `oklch(from ${solid} calc(0.74 + 0.14 * ${DARKNESS}) ` +
      `calc((0.17 - 0.045 * ${WARMTH}) * (1 - ${DARKNESS}) + 0.16 * ${DARKNESS}) ` +
      `calc((34 + 153 * ${WARMTH}) * (1 - ${DARKNESS}) + 93 * ${DARKNESS}))`;

/** The least chroma the plate keeps once leaned into a mood: a lean towards a hue across from it would grey it. */
const PLATE_CHROMA = 0.13;

/** The cosine of the turn at a ring point beyond which the point is a sharp corner: about 35 degrees. */
const SHARP_TURN = 0.82;

/**
 * A ring with two points close in on each side of every sharp corner (an ear's tip, a spike), so the curve through
 * its midpoints cuts the corner by a sixteenth of an edge instead of a half and the fill reaches the grown ink line.
 */
function hugging(ring: Ring): Ring {
  const n = ring.length;
  const near = (p: Ring[number], q: Ring[number]) =>
    [p[0] + (q[0] - p[0]) / 8, p[1] + (q[1] - p[1]) / 8] as const;
  return ring.flatMap((p, i) => {
    const a = ring[(i + n - 1) % n]!;
    const b = ring[(i + 1) % n]!;
    const [ux, uy, vx, vy] = [p[0] - a[0], p[1] - a[1], b[0] - p[0], b[1] - p[1]];
    const cos = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy) || 1);
    return cos < SHARP_TURN ? [near(p, a), p, near(p, b)] : [p];
  });
}

const fillOf = (ctx: MediumContext, piece: MediumPiece, fill: string) =>
  pieceFill(
    ctx,
    { ...piece, ring: ctx.kit.remember(piece.ring, 'soda-hug', () => hugging(piece.ring)) },
    fill,
  );

const inkOf = (solid: string): string => deepOf(solid, 0.3);

/** The body itself: the last of the figure's body-tone pieces, drawn after every piece behind it. */
const bodyOf = (ctx: MediumContext): MediumPiece | undefined =>
  ctx.pieces.find((piece, i, all) => piece.tone === 'body' && all[i + 1]?.tone !== 'body');

/** A piece drawn behind the body in a colour of its own, such as a lifted lid or a wing. */
const standsBehind = (piece: MediumPiece, ctx: MediumContext): boolean =>
  piece.tone === 'body' && piece.color !== ctx.paint.ink;

function screened(ctx: MediumContext, piece: MediumPiece) {
  if (!ctx.prefix || pxPerUnit(ctx) < PRINT.dotsMinPx) return [];
  return [
    crescent(ctx, piece, PRINT.screens.small, `url(#${ctx.prefix}-soda-small)`, 1),
    crescent(ctx, piece, PRINT.screens.large, `url(#${ctx.prefix}-soda-large)`, 1),
  ];
}

/**
 * Whether the gloss has a place on the body: it is left off where most of the stretch of edge it would follow is a
 * seam against another piece or lies under one, and where its middle would fall within the face's clearance.
 */
function glossShows(ctx: MediumContext, body: MediumPiece): boolean {
  return ctx.kit.remember(body.ring, `soda-gloss:${ctx.pieces.length}`, () => {
    const { toward, depth, length } = PRINT.gloss;
    const { x: fx, y: fy, sx, sy } = ctx.face;
    const len = Math.hypot(toward[0], toward[1]);
    const [ux, uy] = [toward[0] / len, toward[1] / len];
    let at = body.ring[0]!;
    let best = -Infinity;
    for (const p of body.ring) {
      const score = ((p[0] - fx) * ux + (p[1] - fy) * uy) / (Math.hypot(p[0] - fx, p[1] - fy) || 1);
      if (score > best) [best, at] = [score, p];
    }
    const out = Math.hypot(at[0] - fx, at[1] - fy) || 1;
    const [nx, ny] = [(at[0] - fx) / out, (at[1] - fy) / out];
    const others = ctx.pieces.filter((piece) => piece !== body).map((piece) => piece.ring);
    const covered = (inward: number) =>
      [-0.4, -0.2, 0, 0.2, 0.4].filter((along) => {
        const p = [
          at[0] - nx * inward - ny * along * length,
          at[1] - ny * inward + nx * along * length,
        ] as const;
        return others.some((ring) => insideRing(p, ring));
      }).length;
    const [gx, gy] = PRINT.faceClear;
    const [mx, my] = [(at[0] - nx * depth - fx) / (sx * gx), (at[1] - ny * depth - fy) / (sy * gy)];
    return covered(-PRINT.ink) < 3 && covered(depth) < 3 && mx * mx + my * my >= 1;
  });
}

const soda: ThemeVariant = {
  style: 'vector',
  variant: 'soda',
  reads: [],
  medium: {
    followsMood: true,
    moodAccent: { chroma: PLATE_CHROMA },
    /**
     * The face in the print's dark ink on every body down to the popsicle's pink (OKLCH lightness 0.6 on either
     * page), in the gloss's white on the lagoon one below. The sheet's colours keep their tone on a dark page, so
     * the face keeps its own rather than the page's.
     */
    faceInk: { dark: '#1E2530', light: '#FFFDF6', split: 0.6 },

    /** The two dot screens, 45 degrees, in the ink. */
    defs(prefix, paint) {
      const { gap, small, large, opacity } = PRINT.dots;
      const screen = (id: string, r: number) => ({
        tag: 'pattern',
        attrs: {
          id,
          width: gap,
          height: gap,
          patternUnits: 'userSpaceOnUse',
          patternTransform: 'rotate(45)',
        },
        children: [
          {
            tag: 'circle',
            attrs: { cx: gap / 2, cy: gap / 2, r, fill: inkOf(paint.solid), 'fill-opacity': opacity },
          },
        ],
      });
      return [screen(`${prefix}-soda-small`, small), screen(`${prefix}-soda-large`, large)];
    },

    /**
     * The plate printed off register, then the ink line round the figure, both without the pieces behind it and
     * without the pieces that play a motion, which carry their own ink ring as they move.
     */
    underlay(frame, pieces, ctx) {
      const solid = ctx.paint.solid;
      const by = smallWidth(ctx, PRINT.ink, 1);
      const printed = pieces.filter((piece) => !standsBehind(piece, ctx) && !piece.moving);
      const [plate] = grownUnderlay(frame, printed, ctx, [{ by, fill: plateOf(solid), accent: true }]);
      const [line] = grownUnderlay(frame, printed, ctx, [{ by, fill: inkOf(solid) }]);
      const [dx, dy] = PRINT.plateShift.map((v) => ctx.kit.f1(smallWidth(ctx, v, 1.5)));
      return [ctx.kit.node('g', { transform: `translate(${dx} ${dy})` }, [plate!]), line!];
    },

    /**
     * Flat print: each laid-on piece, each piece behind and each moving piece in its ink ring, the body ringed
     * again over the pieces behind it, and the halftone shade and the gloss on the body alone.
     */
    paint(piece, ctx) {
      const solid = ctx.paint.solid;
      const isBody = piece === bodyOf(ctx);
      const ringed = isBody
        ? ctx.pieces.some((other) => standsBehind(other, ctx))
        : piece.moving || standsBehind(piece, ctx) || (piece.tone !== 'body' && piece.tone !== 'hair');
      const width = isBody ? smallWidth(ctx, PRINT.ink, 1) : smallWidth(ctx, PRINT.partInk, 0.6);
      return [
        ringed ? partRing(ctx, piece, width, inkOf(solid)) : null,
        fillOf(ctx, piece, ctx.fill(piece)),
        ...(isBody ? screened(ctx, piece) : []),
        isBody && glossShows(ctx, piece)
          ? edgeStreak(ctx, piece, {
              ...PRINT.gloss,
              width: smallWidth(ctx, PRINT.gloss.width, 1.2),
              color: PRINT.glossColor,
            })
          : null,
      ].filter((n) => n !== null);
    },
  },
};

export const SKINS: readonly ThemeVariant[] = [soda];
