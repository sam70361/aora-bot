/**
 * The Halloween skins, `doodle` and `grainy`, as media of the vector series,
 * built from the shared skin blocks (`../shared/skins.ts`). Every colour comes
 * from the character's ink: the die-cut edge is a vivid sticker colour from the
 * far side of the hue wheel and leans into the state's mood, the ink line is
 * the ink taken most of the way to a deep violet black, the crayon fill lets
 * a paper of its colour show through its grain, and the grainy shade and
 * light are the ink taken towards deep violet and towards white, laid thinly
 * over the fill.
 */
import type { MediumContext, MediumPaint } from '../../render/vector/media.js';
import type { FaceInk, MoodAccent } from '../extras/index.js';
import { pastel } from '../shared/paints.js';
import { crescent, grownUnderlay, hatchShade, partRing, pieceFill, smallWidth } from '../shared/skins.js';
import type { ThemeVariant } from '../types.js';
import { GRAINY_DECOR } from './decor.js';

/** The doodle's widths, as shares of `strokeWidth`, and the share of the core's thinnest line its lines keep. */
const DOODLE = { line: 0.3, partLine: 0.22, minLine: 0.7, hatchOpacity: 0.45 } as const;

/**
 * The paper a crayon fill leaves showing through its grain, as OKLCH
 * lightness steps from the fill: lighter under a colour up to `pale`, so its
 * tooth shows as light streaks, and darker under a paler one, where light
 * streaks would not show.
 */
const PAPER = { lift: 0.18, drop: 0.09, pale: 0.78 } as const;

const paperOf = (color: string): string =>
  color.startsWith('url(')
    ? color
    : `oklch(from ${color} calc(l + ${PAPER.lift} - clamp(0, (l - ${PAPER.pale}) * 100, 1) * ${PAPER.lift + PAPER.drop}) calc(c * 0.9) h)`;

/**
 * The die-cut edge, as a printed sticker sheet's: a vivid colour, never a
 * pastel. Its hue is across the wheel from the ink, turned further for warm
 * and pale inks (which land on violet) and less for dark and violet ones
 * (which land on lime and yellow); its lightness is where that hue is most
 * vivid, light for lime and yellow and deep for violet and blue.
 */
const EDGE = {
  chroma: 0.19,
  turn: 200,
  swing: 30,
  swingAt: 70,
  lightness: 0.74,
  lift: 0.14,
  lightestAt: 115,
} as const;

const edgeHue = `(h + ${EDGE.turn} + ${EDGE.swing} * cos((h - ${EDGE.swingAt}) * 1deg))`;

const edgeOf = (solid: string): string =>
  solid.startsWith('url(')
    ? '#8F5CF2'
    : `oklch(from ${solid} calc(${EDGE.lightness} + ${EDGE.lift} * cos((${edgeHue} - ${EDGE.lightestAt}) * 1deg)) ${EDGE.chroma} calc${edgeHue})`;

/**
 * How the edge leans with the state: further into each mood's tint than the
 * core's lean, kept as vivid as the calm edge and in a lightness band that
 * reads on either page.
 */
const EDGE_MOODS: MoodAccent = { share: 1.3, chroma: 0.17, lightness: [0.6, 0.88] };

/**
 * What uncoloured hair is shaded towards: a deep warm shade of the ink on a
 * light body and a pale one on a dark body, so a crease, a wing or a bandage
 * is a deeper tone of its own colour rather than a greyed one.
 */
const hairShadeOf = (paint: MediumPaint): string =>
  paint.solid.startsWith('url(')
    ? '#000'
    : `oklch(from ${paint.solid} clamp(0.42, (0.6 - l) * 100, 0.94) calc(c * 0.8 + 0.06) calc(h - 12))`;

/**
 * The grainy skin's light, from the upper left, for a piece 200 units across, and its paints: the shade is the
 * ink taken most of the way to a deep violet, the light the ink washed almost to white.
 */
const GRAINY = {
  shade: [-20, -15],
  shadeColor: '#2B0F4D',
  shadeMix: 85,
  shadeOpacity: 0.3,
  light: [3.5, 4],
  lightWash: 92,
  lightOpacity: 0.3,
  /** The light edge is left off where a shape unit is under this many pixels: it would be under a pixel. */
  lightMinPx: 0.22,
} as const;

/**
 * The lab sheet's warm yellow face on every body up to the bat's violet (OKLCH lightness under 0.62 on either
 * page), in the face rule's own dark ink on the brown and every lighter one, where the rule would leave a dark
 * face on the violet too.
 */
const FACE_INK: FaceInk = { light: '#FFE27A', dark: '#2B2420', split: 0.62 };

const doodleInk = (ctx: MediumContext): string => ctx.kit.mixPaint(ctx.paint.solid, '#1A1226', 72);

const lineWidth = (ctx: MediumContext, share: number): number =>
  Math.max(ctx.params.strokeWidth * share, ctx.minLine * DOODLE.minLine);

const doodle: ThemeVariant = {
  style: 'vector',
  variant: 'doodle',
  reads: ['strokeWidth', 'stickerWidth', 'grain', 'hatching'],
  medium: {
    darkFace: true,
    faceInk: FACE_INK,
    followsMood: true,
    moodAccent: EDGE_MOODS,
    hairShade: hairShadeOf,
    grainedFills: true,
    pigment: true,
    grain: {
      tile: 40,
      angle: 0,
      opacity: 0.7,
      body: 0,
      specks: { count: 36, r: [0.4, 0.9] },
      streaks: { count: 90, length: [2, 5], width: 0.8, angle: -32, spread: 10 },
      seed: 67,
    },

    /** The die-cut edge and the ink line round the whole figure, the edge shrinking at small sizes. */
    underlay(frame, pieces, ctx) {
      const ink = lineWidth(ctx, DOODLE.line);
      const edge = smallWidth(ctx, ctx.params.stickerWidth, 0.6);
      return grownUnderlay(frame, pieces, ctx, [
        { by: edge + ink, fill: edgeOf(ctx.paint.solid), accent: true },
        { by: ink, fill: doodleInk(ctx) },
      ]);
    },

    /**
     * A crayon-grained fill over a paper of its colour, which shows through
     * the grain, with its shadow side hatched in the ink line; a piece over
     * the body is ringed in it.
     */
    paint(piece, ctx) {
      const ink = doodleInk(ctx);
      return [
        ...(piece.mass ? [] : [partRing(ctx, piece, lineWidth(ctx, DOODLE.partLine), ink)]),
        ...(ctx.params.grain > 0 ? [pieceFill(ctx, piece, paperOf(piece.color))] : []),
        pieceFill(ctx, piece, ctx.fill(piece)),
        ...(ctx.params.hatching
          ? [hatchShade(ctx, piece, { color: ink, opacity: DOODLE.hatchOpacity })]
          : []),
      ];
    },
  },
};

/*
 * Grainy has no edge or accent to lean: its shade and light are the light on
 * it, not the character's mood, so it does not follow the state.
 */
const grainy: ThemeVariant = {
  style: 'vector',
  variant: 'grainy',
  reads: ['grain'],
  decor: GRAINY_DECOR,
  medium: {
    faceInk: FACE_INK,
    grainedFills: true,
    pigment: true,
    grain: { tile: 32, angle: 17, opacity: 0.85, body: 0, specks: { count: 170, r: [0.3, 0.75] }, seed: 71 },

    /** Flat colour with no line: a hard shade cut from the piece moved towards the light, and a thin light edge. */
    paint(piece, ctx) {
      const lit = ctx.minLine === 0 || 0.85 / ctx.minLine >= GRAINY.lightMinPx;
      const shade = ctx.kit.mixPaint(ctx.paint.solid, GRAINY.shadeColor, GRAINY.shadeMix);
      return [
        pieceFill(ctx, piece, ctx.fill(piece), 0),
        crescent(ctx, piece, GRAINY.shade, shade, GRAINY.shadeOpacity),
        lit
          ? crescent(ctx, piece, GRAINY.light, pastel(ctx.paint.solid, GRAINY.lightWash), GRAINY.lightOpacity)
          : null,
      ].filter((n) => n !== null);
    },
  },
};

export const SKINS: readonly ThemeVariant[] = [doodle, grainy];
