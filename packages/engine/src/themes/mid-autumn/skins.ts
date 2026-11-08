/**
 * The Mid-Autumn skin, `lantern` (夜灯暖光): the figure as a paper lantern lit
 * from inside on a festival night. A stepped halo of the ink's warm light
 * spreads round the figure and leans into the state's mood; a thin edge ring
 * sits on it, ink on a light page and light on a dark one. In the fill, a
 * warm rim catches the lower left, a cool night shade the upper right, the
 * light glows from a little above the middle, and washi fibre and faint
 * bamboo ribs lie over the paper. The face is drawn in dark ink, light only
 * on a dark ink.
 */
import type { Ring } from '../../core/types.js';
import type { MediumContext, MediumPiece } from '../../render/vector/media.js';
import type { FrameSnapshot } from '../../sim/snapshot.js';
import { deepOf } from '../shared/paints.js';
import { crescent, grownUnderlay, insideRing, pieceFill, pxPerUnit, smallWidth } from '../shared/skins.js';
import type { ThemeVariant } from '../types.js';

/**
 * The halo's levels in shape units, outermost first, the opacity each adds, and the edge ring's reach. The
 * outermost level stays within the viewbox margin, so a static document keeps the whole halo. Each outline is
 * thinned to points no further off its contour than `tolerance` of its level (the edge ring's `edgeTolerance`),
 * since a static document writes every point a contour keeps.
 */
const HALO = {
  levels: [24, 18, 12.5, 8, 4.5],
  opacity: [0.08, 0.1, 0.13, 0.17, 0.24],
  tolerance: 0.05,
  edge: 1.6,
  edgeOpacity: 0.8,
  edgeTolerance: 0.2,
} as const;

/**
 * The light on the paper: the warm rim and the cool shade as crescents shifted off the piece (for a piece 200
 * units across), each step with the opacity it adds, so the light is strongest at the very edge.
 */
const LIGHT = {
  rim: [
    [8, -9, 0.3],
    [4.5, -5, 0.36],
    [2, -2.25, 0.5],
  ],
  rimColor: '#FFCC61',
  shade: [
    [-16, 15, 0.15],
    [-8, 7.5, 0.17],
  ],
  shadeColor: '#171A4D',
  ribs: { gap: 21, width: 1.2, opacity: 0.07 },
} as const;

/**
 * The paper's texture, one pattern laid over the body: long light washi fibres in two directions, a few dark
 * ones and fine dark specks. A plain pattern of strokes rather than grained fills, which a live scene would have
 * to raster again under every moving piece.
 */
const WASHI = {
  tile: 96,
  angle: 24,
  seed: 5,
  /** Fewest pixels per shape unit at which the fibres are drawn; below it they only blur the fill. */
  minPx: 0.24,
  sets: [
    { color: '#FFF7E2', opacity: 0.5, count: 16, length: [10, 26], width: 0.55, turn: 0 },
    { color: '#FFF7E2', opacity: 0.3, count: 22, length: [6, 16], width: 0.45, turn: 0 },
    { color: '#FFF7E2', opacity: 0.3, count: 10, length: [8, 18], width: 0.45, turn: -82 },
    { color: '#1D1830', opacity: 0.12, count: 10, length: [6, 14], width: 0.5, turn: 46 },
    { color: '#1D1830', opacity: 0.16, count: 36, length: [0.3, 0.9], width: 0.7, turn: 24 },
  ],
} as const;

/** How much stronger the halo is round a character whose light is the point of it. */
const HALO_GAIN: Readonly<Record<string, number>> = { 'ma-moon': 1.5 };

/** Lamplight gold, the hue a dark ink glows in, and the one character whose dark shell glows jade instead. */
const GOLD_HUE = 78;
const GLOW_HUE: Readonly<Record<string, number>> = { 'ma-crab': 165 };

/** 1 on a dark ink (OKLCH lightness under 0.4), 0 on any other, inside a relative colour. */
const DARK_INK = 'clamp(0, (0.4 - l) * 1000, 1)';

/**
 * The ink's own light, its hue pulled halfway to lamplight gold, so red
 * glows orange and cream glows gold; the way round the wheel turns between
 * indigo and violet, so pink and violet glow warm instead of cyan. A dark
 * ink glows in the lamplight itself (`toward`), as a night-blue lantern
 * does. A paler ink glows softer. Bright on a dark page, deeper on a light
 * one, where a pale glow would vanish into the paper.
 */
const glowOf = (solid: string, toward = GOLD_HUE): string => {
  if (solid.startsWith('url(')) return '#FFD27A';
  const half = `mod(h + ${GOLD_HUE}, 360) / 2`;
  const hue = `calc(${half} + ${DARK_INK} * (${toward} - ${half}))`;
  return (
    `light-dark(oklch(from ${solid} 0.74 clamp(0.14, c + 0.06, 0.19) ${hue}), ` +
    `oklch(from ${solid} 0.82 clamp(0.13, c + 0.07, 0.2) ${hue}))`
  );
};

/**
 * What uncoloured hair is shaded towards: a deep shade of the ink, so hair
 * on a light paper is a darker tone of that paper, warm inks (35 to 115
 * degrees) turning towards the baked crust's hue as the sheet shaded its
 * cream and gold. The shade deepens and greys as the ink does, from 0.65 of
 * a pale ink's lightness to 0.3 of a red's, as the sheet shaded its pale
 * papers towards crust and its red ones towards the night ink. On a dark ink
 * it is a pale jade light, as the sheet lit the crab's legs.
 */
const hairShadeOf = (solid: string): string => {
  if (solid.startsWith('url(')) return solid;
  const warm = 'clamp(0, (h - 35) / 10, 1) * clamp(0, (115 - h) / 10, 1)';
  const light = {
    l: 'l * clamp(0.3, (l - 0.6) * 2 + 0.3, 0.65)',
    c: 'clamp(0.03, 0.14 - c * 0.5, 0.1)',
    h: `h + (52 - h) * ${warm}`,
  };
  const dark = { l: '0.8', c: '0.1', h: `mod(h + ${GOLD_HUE}, 360) / 2` };
  const pick = (key: 'l' | 'c' | 'h') =>
    `calc(${light[key]} + ${DARK_INK} * (${dark[key]} - (${light[key]})))`;
  return `oklch(from ${solid} ${pick('l')} ${pick('c')} ${pick('h')})`;
};

/** A small generator for the fixed fibre layout. */
const rand = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** The fibre tile's paths, one per set, laid out once. */
const fibres = (() => {
  const r = rand(WASHI.seed);
  const f1 = (n: number) => Math.round(n * 10) / 10;
  return WASHI.sets.map((set) => {
    const a = (set.turn * Math.PI) / 180;
    let d = '';
    for (let i = 0; i < set.count; i++) {
      const len = set.length[0] + r() * (set.length[1] - set.length[0]);
      const x = r() * WASHI.tile;
      const y = r() * WASHI.tile;
      const bow = (r() - 0.5) * 2.4;
      const dx = Math.cos(a) * len;
      const dy = Math.sin(a) * len;
      d += `M${f1(x)} ${f1(y)}q${f1(dx / 2 - Math.sin(a) * bow)} ${f1(dy / 2 + Math.cos(a) * bow)} ${f1(dx)} ${f1(dy)}`;
    }
    return { d, set };
  });
})();

/** The light inside the lantern, over a piece's fill, where the character has defs to hold the gradient. */
function innerLight(ctx: MediumContext, piece: MediumPiece) {
  if (!ctx.prefix) return null;
  const { node, remember, closedCurve } = ctx.kit;
  return node('path', {
    d: remember(piece.ring, 'curve', () => closedCurve(piece.ring)),
    fill: `url(#${ctx.prefix}-lantern-core)`,
  });
}

/** Washi fibres over a piece, where the character has defs and is shown large enough for them to read. */
function washi(ctx: MediumContext, piece: MediumPiece) {
  if (!ctx.prefix || !ctx.settled || ctx.params.grain <= 0 || pxPerUnit(ctx) < WASHI.minPx) return null;
  const { node, remember, closedCurve } = ctx.kit;
  return node('path', {
    d: remember(piece.ring, 'curve', () => closedCurve(piece.ring)),
    fill: `url(#${ctx.prefix}-lantern-washi)`,
    opacity: ctx.params.grain < 1 ? ctx.params.grain : undefined,
  });
}

/**
 * The pieces the halo grows from: the body and every still piece that reaches out of it. A piece inside the body
 * grows inside the body grown by as much, so leaving it out changes no halo and spares its edges every distance.
 * A piece with a signature motion (a pestle, a hat, a swinging lamp) leaves the still halo out of its reach, so
 * it carries no glow away with it.
 */
function reaching(frame: FrameSnapshot, pieces: readonly MediumPiece[], ctx: MediumContext): MediumPiece[] {
  const body = frame.body.outline;
  const moving = pieces.filter((piece) => piece.moving).length;
  const keep = ctx.kit.remember(body, `lantern-reach${pieces.length}:${moving}`, () =>
    pieces.map(
      (piece) =>
        piece.ring === body || (!piece.moving && !piece.ring.every((point) => insideRing(point, body))),
    ),
  );
  return pieces.filter((_, i) => keep[i]);
}

/** A ring with every point dropped that lies within `tolerance` of the line its kept neighbours draw. */
function simplified(ring: Ring, tolerance: number): Ring {
  const n = ring.length;
  if (n < 8) return ring;
  const [x0, y0] = ring[0]!;
  let far = 0;
  let reach = 0;
  ring.forEach(([x, y], i) => {
    const d = Math.hypot(x - x0, y - y0);
    if (d > reach) {
      reach = d;
      far = i;
    }
  });
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[far] = 1;
  const spans: [number, number][] = [
    [0, far],
    [far, n],
  ];
  while (spans.length > 0) {
    const [a, b] = spans.pop()!;
    const p = ring[a]!;
    const q = ring[b % n]!;
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    let worst = -1;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const r = ring[i]!;
      const d = Math.abs((q[0] - p[0]) * (p[1] - r[1]) - (p[0] - r[0]) * (q[1] - p[1])) / len;
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (worst > tolerance) {
      keep[at] = 1;
      spans.push([a, at], [at, b]);
    }
  }
  return ring.filter((_, i) => keep[i]);
}

function ribs(ctx: MediumContext, piece: MediumPiece) {
  if (!ctx.settled) return null;
  const { node, remember, hatchPath } = ctx.kit;
  const { gap, width, opacity } = LIGHT.ribs;
  return node('path', {
    d: remember(piece.ring, `ribs${gap}`, () => hatchPath(piece.ring, { angle: 0, gap, ragged: 2, seed: 7 })),
    stroke: deepOf(ctx.paint.solid, 0.3),
    'stroke-width': width,
    'stroke-opacity': opacity,
  });
}

const lantern: ThemeVariant = {
  style: 'vector',
  variant: 'lantern',
  reads: ['grain'],
  medium: {
    followsMood: true,
    moodAccent: { chroma: 0.15 },
    deepBlush: true,

    hairShade: (paint) => hairShadeOf(paint.solid),

    /** The glow inside the paper, warm and strongest a little above the middle of each piece, and the washi. */
    defs(prefix) {
      return [
        {
          tag: 'radialGradient',
          attrs: { id: `${prefix}-lantern-core`, cx: 0.5, cy: 0.42, r: 0.55 },
          children: [
            { tag: 'stop', attrs: { offset: 0, 'stop-color': '#FFF6D8', 'stop-opacity': 0.42 } },
            { tag: 'stop', attrs: { offset: 0.55, 'stop-color': '#FFE2A0', 'stop-opacity': 0.14 } },
            { tag: 'stop', attrs: { offset: 1, 'stop-color': '#FFD27A', 'stop-opacity': 0 } },
          ],
        },
        {
          tag: 'pattern',
          attrs: {
            id: `${prefix}-lantern-washi`,
            patternUnits: 'userSpaceOnUse',
            width: WASHI.tile,
            height: WASHI.tile,
            patternTransform: `rotate(${WASHI.angle})`,
          },
          children: fibres.map(({ d, set }) => ({
            tag: 'path',
            attrs: {
              d,
              fill: 'none',
              stroke: set.color,
              'stroke-opacity': set.opacity,
              'stroke-width': set.width,
              'stroke-linecap': 'round',
            },
          })),
        },
      ];
    },

    /** The stepped halo, outermost first, and the edge ring round the whole figure. */
    underlay(frame, pieces, ctx) {
      const glow = glowOf(ctx.paint.solid, GLOW_HUE[frame.shape]);
      const gain = HALO_GAIN[frame.shape] ?? 1;
      const outline = (tolerance: number) => (rings: Ring[]) =>
        ctx.kit.ringsPath(rings.map((ring) => simplified(ring, tolerance)));
      return grownUnderlay(frame, reaching(frame, pieces, ctx), ctx, [
        ...HALO.levels.map((by, i) => ({
          by: smallWidth(ctx, by, by / 6),
          fill: glow,
          opacity: HALO.opacity[i]! * gain,
          accent: true,
          shape: outline(by * HALO.tolerance),
        })),
        {
          by: smallWidth(ctx, HALO.edge, 0.6),
          fill: `light-dark(${deepOf(ctx.paint.solid, 0.3)}, ${glow})`,
          opacity: HALO.edgeOpacity,
          shape: outline(HALO.edgeTolerance),
        },
      ]);
    },

    /**
     * Lit paper: the fill, the inner light, the washi, and on the body the ribs. Only the body's mass takes the
     * night shade and the warm rim; on the marks and props laid over it they would outline every small piece.
     */
    paint(piece, ctx) {
      const body = piece.key === 'body';
      const mass = body || piece.tone === 'body';
      return [
        pieceFill(ctx, piece, ctx.fill(piece)),
        ...(mass
          ? LIGHT.shade.map(([dx, dy, opacity]) => crescent(ctx, piece, [dx, dy], LIGHT.shadeColor, opacity))
          : []),
        innerLight(ctx, piece),
        ...(mass
          ? LIGHT.rim.map(([dx, dy, opacity]) => crescent(ctx, piece, [dx, dy], LIGHT.rimColor, opacity))
          : []),
        body ? washi(ctx, piece) : null,
        body ? ribs(ctx, piece) : null,
      ].filter((n) => n !== null);
    },
  },
};

export const SKINS: readonly ThemeVariant[] = [lantern];
