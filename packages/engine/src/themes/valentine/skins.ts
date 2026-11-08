/**
 * The Valentine skin, `candy` (糖果亮面): every piece a boiled sweet. The
 * edge sinks into a deeper, richer copy of the piece's colour, as light
 * travels further through the candy there, and the body's rim leans into the
 * state's mood; a soft glow gathers on the far side from the light, a white
 * band of light runs inside the edge under it, and sugar glints are scattered
 * over the surface.
 */
import { crescentRings, insetRings } from '../outline-field.js';
import type { MediumContext, MediumPiece } from '../../render/vector/media.js';
import { crescent, edgeStreak, pxPerUnit, smallWidth } from '../shared/skins.js';
import type { ThemeVariant } from '../types.js';

/** Candy sizes in shape units: the rim on the body and on smaller pieces, the glow and the light. */
const CANDY = {
  /**
   * The rim, outermost band first: how far in each band ends and how much of the deep colour it holds.
   * The bands step down, as the deep colour fades inward from the edge.
   */
  rim: [
    [5.5, 52],
    [11, 24],
  ],
  partRim: [[3.5, 44]],
  /** A piece under this many units across takes the smaller rim. */
  partSize: 90,
  /**
   * The far side's glow: what each copy moved toward the light leaves uncovered, stacked so it fades inward. A
   * smaller piece takes one step, which is all it has room to show.
   */
  glow: {
    shifts: [
      [-16, -18],
      [-10, -11],
      [-5, -5.5],
    ],
    opacity: 0.09,
  },
  partGlow: { shifts: [[-10, -11]], opacity: 0.16 },
  /**
   * The light: the band between two copies of the piece moved away from the light, `from` and `to` units, so it
   * runs inside every edge that faces the light. On the body it fades out across the figure from the lit corner
   * (`spot`, in shape space); a piece shorter than `minSize` across takes the short streak instead.
   */
  light: { from: [6, 7], to: [15, 17], opacity: 0.92 },
  partLight: { from: [2.6, 3], to: [6, 7], opacity: 0.7, minSize: 16 },
  spot: { cx: 72, cy: 60, r: 92 },
  partStreak: { toward: [-0.68, -0.73], depth: 2.2, length: 7, width: 1.8, opacity: 0.75 },
  sugar: { tile: 150, glints: 26, seed: 14 },
  /** Sugar is left off where a shape unit is under this many pixels: the glints would read as dust. */
  sugarMinPx: 0.45,
} as const;

/** A small seeded generator, so the sugar is the same scatter in every render. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sparklePath(x: number, y: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const k = i % 2 ? r * 0.22 : r;
    pts.push(`${i ? 'L' : 'M'}${(x + k * Math.cos(a)).toFixed(1)} ${(y + k * Math.sin(a)).toFixed(1)}`);
  }
  return `${pts.join('')}Z`;
}

/**
 * One tile of the sugar: a sparse scatter of crystals, about a third of them four-point glints and the rest
 * specks, each kept clear of the tile's edge so no glint is cut. The tile is wider than most of a figure, so
 * its repeat does not show as a grid.
 */
const SUGAR = (() => {
  const { tile, glints, seed } = CANDY.sugar;
  const r = seeded(seed);
  const out: { tag: 'path' | 'circle'; attrs: Record<string, string | number> }[] = [];
  for (let i = 0; i < glints; i++) {
    const glint = r() < 0.34;
    const size = glint ? 1.9 + r() * 2.1 : 0.55 + r() * 0.65;
    const x = size + r() * (tile - 2 * size);
    const y = size + r() * (tile - 2 * size);
    const opacity = Math.round((glint ? 0.7 + r() * 0.3 : 0.45 + r() * 0.4) * 100) / 100;
    out.push(
      glint
        ? { tag: 'path', attrs: { d: sparklePath(x, y, size), fill: '#FFFFFF', 'fill-opacity': opacity } }
        : {
            tag: 'circle',
            attrs: {
              cx: Math.round(x * 10) / 10,
              cy: Math.round(y * 10) / 10,
              r: Math.round(size * 100) / 100,
              fill: '#FFFFFF',
              'fill-opacity': opacity,
            },
          },
    );
  }
  return out;
})();

/**
 * The candy's rim colour: the colour multiplied by itself, as light deepens through boiled sugar, laid over the
 * colour by `share` percent. Channels are mixed in sRGB, where the multiply is taken.
 */
const richOf = (color: string, share: number): string =>
  `color-mix(in srgb, ${color}, rgb(from ${color} calc(r * r / 255) calc(g * g / 255) calc(b * b / 255)) ${share}%)`;

type Node = ReturnType<MediumContext['kit']['node']>;

/** Whether a piece is painted in the body's own ink: the body and its same-ink parts, whose rim follows the mood. */
const inInk = (ctx: MediumContext, piece: MediumPiece): boolean =>
  piece.color === ctx.paint.ink || piece.color.startsWith('url(');

/**
 * The piece's rim bands, each inside the last, then its fill. A piece too thin for its first band is all fill;
 * one too thin for a later band ends in that band. Only the body's ink leans into the mood: a leaf, a lid or a
 * chocolate coat keeps its own deep colour, as the state shows on the figure's edge.
 */
function rimmed(ctx: MediumContext, piece: MediumPiece, small: boolean): Node[] {
  const { node, remember, closedCurve, ringsPath, f1 } = ctx.kit;
  const { ring } = piece;
  const curve = remember(ring, 'curve', () => closedCurve(ring));
  // The body's ink may be a token or a gradient; its solid copy is the one colour a rim can deepen.
  const leans = inInk(ctx, piece);
  const own = leans ? ctx.paint.solid : piece.color;
  const bands = small ? CANDY.partRim : CANDY.rim;
  const deepest = bands[bands.length - 1]![0];
  const k = smallWidth(ctx, deepest, 0.8) / deepest;
  const insets = bands.map(([by]) => {
    const at = f1(by * k);
    return ctx.settled ? remember(ring, `candy${at}`, () => ringsPath(insetRings([ring], at))) : '';
  });
  if (!insets[0]) return [node('path', { d: curve, fill: ctx.fill(piece) })];
  const out: Node[] = [];
  let outline = curve;
  for (const [i, [, share]] of bands.entries()) {
    const deep = richOf(own, share);
    const rim = leans ? ctx.accent(deep) : { fill: deep, style: undefined };
    out.push(node('path', { d: outline, fill: rim.fill, style: rim.style }));
    if (!insets[i]) return out;
    outline = insets[i]!;
  }
  out.push(node('path', { d: outline, fill: ctx.fill(piece) }));
  return out;
}

/**
 * The band of light inside the edges that face the light: what the piece moved `to` away from the light leaves
 * uncovered, less what the piece moved `from` leaves, painted even-odd. On the body it is filled with the spot,
 * which fades it out across the figure from the lit corner.
 */
function lightBand(
  ctx: MediumContext,
  piece: MediumPiece,
  { from, to, opacity }: { from: readonly [number, number]; to: readonly [number, number]; opacity: number },
  fill: string,
): Node | null {
  if (!ctx.settled) return null;
  const { node, remember, ringsPath } = ctx.kit;
  const { ring } = piece;
  const d = remember(
    ring,
    `candy-light${from.join(':')}:${to.join(':')}`,
    () => ringsPath(crescentRings(ring, to[0], to[1])) + ringsPath(crescentRings(ring, from[0], from[1])),
  );
  if (!d) return null;
  return node('path', { d, fill, 'fill-rule': 'evenodd', 'fill-opacity': opacity });
}

const candy: ThemeVariant = {
  style: 'vector',
  variant: 'candy',
  reads: [],
  medium: {
    followsMood: true,
    /**
     * A cheerful lean warms a dark rim without lifting it into a pale ring, and keeps enough colour that the warmth
     * reads as caramel rather than brown: chocolate stays chocolate.
     */
    moodAccent: { moods: { bright: { lift: 0.12, chroma: 0.1 } } },
    /**
     * The sheet's face: its dark ink on every body down to the red (OKLCH lightness 0.6 on either page), its pale
     * blush on the wine, chocolate, plum and night ones below.
     */
    faceInk: { dark: '#2B1A22', light: '#FFF0F3', split: 0.59 },

    /** The sugar, a sparse tile of white glints and specks, and the spot the body's light fades with. */
    defs(prefix) {
      const { tile } = CANDY.sugar;
      const { cx, cy, r } = CANDY.spot;
      return [
        {
          tag: 'pattern',
          attrs: { id: `${prefix}-candy-sugar`, width: tile, height: tile, patternUnits: 'userSpaceOnUse' },
          children: [...SUGAR],
        },
        {
          tag: 'radialGradient',
          attrs: { id: `${prefix}-candy-spot`, gradientUnits: 'userSpaceOnUse', cx, cy, r },
          children: [
            { tag: 'stop', attrs: { offset: 0, 'stop-color': '#FFFFFF' } },
            { tag: 'stop', attrs: { offset: 0.55, 'stop-color': '#FFFFFF', 'stop-opacity': 0.85 } },
            { tag: 'stop', attrs: { offset: 1, 'stop-color': '#FFFFFF', 'stop-opacity': 0 } },
          ],
        },
      ];
    },

    /**
     * A boiled sweet: rim and fill, the far-side glow, the light inside the lit edge and the sugar. A part laid
     * over the body takes the smaller candy whatever its size, as a separate sweet set on the larger one.
     */
    paint(piece, ctx) {
      const { node, remember, closedCurve, extentOf } = ctx.kit;
      const { size } = remember(piece.ring, 'extent', () => extentOf(piece.ring));
      const small = !piece.mass || size < CANDY.partSize;
      const sugar =
        ctx.prefix && !small && pxPerUnit(ctx) >= CANDY.sugarMinPx
          ? node('path', {
              d: remember(piece.ring, 'curve', () => closedCurve(piece.ring)),
              fill: `url(#${ctx.prefix}-candy-sugar)`,
            })
          : null;
      const glow = small ? CANDY.partGlow : CANDY.glow;
      const light = !small
        ? ctx.prefix
          ? lightBand(ctx, piece, CANDY.light, `url(#${ctx.prefix}-candy-spot)`)
          : null
        : size >= CANDY.partLight.minSize
          ? lightBand(ctx, piece, CANDY.partLight, '#FFFFFF')
          : edgeStreak(ctx, piece, {
              ...CANDY.partStreak,
              width: smallWidth(ctx, CANDY.partStreak.width, 0.8),
              color: '#FFFFFF',
            });
      return [
        ...rimmed(ctx, piece, small),
        ...glow.shifts.map((shift) => crescent(ctx, piece, shift, '#FFFFFF', glow.opacity)),
        light,
        sugar,
      ].filter((n) => n !== null);
    },
  },
};

export const SKINS: readonly ThemeVariant[] = [candy];
