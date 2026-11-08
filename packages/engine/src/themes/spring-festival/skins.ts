/**
 * The Spring Festival skin, `papercut` (剪纸): the figure cut from paper and
 * pasted on a second sheet with a pinked edge, a thin cut line round it and
 * round every piece laid on it, a hard drop step where the cut paper stands
 * off the sheet, a row of crescent cut-outs (月牙纹) just inside the body's
 * edge through which the sheet shows, and paper in the fills: pale fibre,
 * cloudy pulp and dark flecks. The sheet is one of the festival's two papers,
 * red under a light ink and gold under any other, and leans into the state's
 * mood while staying as vivid as the papers themselves.
 */
import type { MediumContext, MediumPiece } from '../../render/vector/media.js';
import { pastel } from '../shared/paints.js';
import {
  crescentAt,
  edgeMarks,
  grownUnderlay,
  partRing,
  pieceFill,
  pinked,
  pxPerUnit,
  shiftedCopy,
  smallWidth,
} from '../shared/skins.js';
import type { ThemeVariant } from '../types.js';

/**
 * Paper sizes in shape units: the sheet's reach past the figure and its
 * teeth, the cut lines' widths, the drop step, and the cut-outs' radius,
 * spacing, depth past the radius and clearance.
 */
const PAPER = {
  sheet: 11,
  teeth: { amp: 3.6, period: 8.5 },
  cut: 2.6,
  partCut: 1.7,
  drop: [3.5, 4.5],
  dropOpacity: 0.32,
  holes: { r: 8.5, gap: 30, depth: 4.3, clear: 8.5 },
  /** Cut-outs are left off where a shape unit is under this many pixels: they would close up. */
  holeMinPx: 0.3,
  /** How much white the paper under a grained fill carries, so the grain shows as pale fibre. */
  pulp: 45,
} as const;

/**
 * The paper's body over the fills, on one tile in shape units: soft blots of
 * thicker pulp, fine dark flecks and a few long fibres in the flecks' colour. Left off where a
 * shape unit is under `minPx` pixels, where it would only smudge the fill.
 */
const PULP = {
  tile: 120,
  angle: 17,
  seed: 61,
  minPx: 0.27,
  blots: { color: '#fff7e6', opacity: 0.24, count: 11, r: [9, 22] },
  flecks: { color: '#3a0d0d', opacity: 0.28, count: 170, r: [0.3, 0.85] },
  fibres: { opacity: 0.18, count: 7, length: [7, 18], width: 0.35 },
} as const;

/**
 * Which of the festival's two papers the sheet is, from the ink in oklch, 0
 * for gold and 1 for red: red under a light ink (lightness from 0.725, so
 * yellow, cream and blush on either page) and under an orange one (hue 33 to
 * 61 and lightness from 0.65, so orange and brown), gold under any other. An
 * orange on gold fades into its sheet.
 */
const RED_SHEET =
  'max(clamp(0, (l - 0.725) * 100, 1), clamp(0, h - 33, 1) * clamp(0, 61 - h, 1) * clamp(0, (l - 0.65) * 100, 1))';

/**
 * Members the lab cut on gold whatever their ink, by shape: their red props
 * run along the figure's edge, where a red sheet would swallow them.
 */
const GOLD_SHAPES: ReadonlySet<string> = new Set(['sf-kiki-tiger', 'sf-maru-collar', 'sf-nook-couplets']);

/** Whether each frame is cut on gold, by the frame's pieces, which the underlay sees first and every paint after it. */
const goldOf = new WeakMap<readonly MediumPiece[], boolean>();

/** The sheet: gold or red as the ink asks (`RED_SHEET`), or gold. */
const sheetOf = (solid: string, gold = false): string => {
  if (solid.startsWith('url(')) return '#e0312b';
  if (gold) return `oklch(from ${solid} 0.818 0.15 80)`;
  const red = RED_SHEET;
  return `oklch(from ${solid} calc(0.818 - 0.226 * ${red}) calc(0.15 + 0.061 * ${red}) calc(80 - 52 * ${red}))`;
};

/** The cut lines: one deep red under every ink. */
const cutOf = (solid: string): string =>
  solid.startsWith('url(') ? '#7e1219' : `oklch(from ${solid} 0.38 0.14 24)`;

/** The drop step's shade. */
const dropOf = (solid: string): string =>
  solid.startsWith('url(') ? '#330808' : `oklch(from ${solid} 0.2 0.07 24)`;

/** The crescents along the body's edge, as one path. */
function crescents(ctx: MediumContext, piece: MediumPiece): string {
  const { remember, f1 } = ctx.kit;
  const { x, y, sx, sy } = ctx.face;
  const { r, gap, depth, clear } = PAPER.holes;
  return remember(piece.ring, `papercut:${f1(x)}:${f1(y)}:${f1(sx)}:${f1(sy)}:${ctx.pieces.length}`, () =>
    edgeMarks(ctx, piece, { gap, depth: r + depth, clear })
      .map((mark) => crescentAt(mark, r, f1))
      .join(''),
  );
}

/** A small generator for the fixed pulp layout. */
const rand = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const u32 = (n: number): number[] => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];

function pngChunk(type: string, data: ArrayLike<number>): number[] {
  const body = [...type].map((ch) => ch.charCodeAt(0)).concat(Array.from(data));
  let c = 0xffffffff;
  for (const b of body) c = CRC[(c ^ b) & 0xff]! ^ (c >>> 8);
  return [...u32(data.length), ...body, ...u32((c ^ 0xffffffff) >>> 0)];
}

/**
 * An 8-bit RGBA PNG of `size` x `size` pixels from its filtered rows (a 0
 * before each row), as a data URL. Stored rather than compressed: the encoder
 * stays short and needs nothing that the browser and Node do not both have.
 */
function png(size: number, raw: Uint8Array): string {
  const zlib = [0x78, 0x01];
  for (let at = 0; at < raw.length; at += 0xffff) {
    const len = Math.min(0xffff, raw.length - at);
    zlib.push(at + len >= raw.length ? 1 : 0, len & 0xff, len >>> 8, ~len & 0xff, (~len >>> 8) & 0xff);
    for (let i = 0; i < len; i++) zlib.push(raw[at + i]!);
  }
  let [a, b] = [1, 0];
  for (const byte of raw) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  zlib.push(...u32(((b << 16) | a) >>> 0));
  const bytes = [
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...pngChunk('IHDR', [...u32(size), ...u32(size), 8, 6, 0, 0, 0]),
    ...pngChunk('IDAT', zlib),
    ...pngChunk('IEND', []),
  ];
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.slice(i, i + 0x8000));
  return `data:image/png;base64,${btoa(binary)}`;
}

/** Pixels per shape unit in the pulp's picture: the browser scales it down for anything smaller than 300 px. */
const PULP_DENSITY = 1.25;

/**
 * The pulp tile's blots, flecks and fibres, laid out once and rasterised
 * into one RGBA PNG. A live scene repaints a moving figure every frame, and a
 * browser rasterises a vector pattern tile again at every new scale, for each
 * piece it fills; a bitmap tile is drawn from its image cache. Everything
 * wraps round the tile's edges, so the tiles meet without a seam.
 */
const pulpImage = (() => {
  const r = rand(PULP.seed);
  const { tile, blots, flecks, fibres } = PULP;
  const between = ([a, b]: readonly [number, number]) => a + r() * (b - a);
  const size = Math.round(tile * PULP_DENSITY);
  const k = size / tile;
  const light = new Float32Array(size * size);
  const dark = new Float32Array(size * size);
  /** Lays `alpha(d)` over a box in tile units, `d` being a pixel centre's distance from the mark in pixels. */
  const stamp = (
    layer: Float32Array,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    alpha: (px: number, py: number) => number,
  ) => {
    for (let py = Math.floor(y0 * k) - 1; py <= Math.ceil(y1 * k) + 1; py++) {
      for (let px = Math.floor(x0 * k) - 1; px <= Math.ceil(x1 * k) + 1; px++) {
        const a = alpha(px + 0.5, py + 0.5);
        if (a <= 0) continue;
        const i = (((py % size) + size) % size) * size + (((px % size) + size) % size);
        layer[i] = Math.max(layer[i]!, a);
      }
    }
  };
  for (let i = 0; i < blots.count; i++) {
    const [x, y, s] = [r() * tile, r() * tile, between(blots.r)];
    stamp(
      light,
      x - s,
      y - s,
      x + s,
      y + s,
      (px, py) => blots.opacity * (1 - Math.hypot(px - x * k, py - y * k) / (s * k)),
    );
  }
  for (let i = 0; i < flecks.count; i++) {
    const [x, y, s] = [r() * tile, r() * tile, between(flecks.r)];
    stamp(
      dark,
      x - s,
      y - s,
      x + s,
      y + s,
      (px, py) =>
        flecks.opacity * Math.min(1, Math.max(0, 0.5 - (Math.hypot(px - x * k, py - y * k) - s * k))),
    );
  }
  for (let i = 0; i < fibres.count; i++) {
    const a = r() * Math.PI * 2;
    const len = between(fibres.length);
    const [x, y] = [r() * (tile - 2 * len) + len, r() * (tile - 2 * len) + len];
    const bow = (r() - 0.5) * len * 0.5;
    const [dx, dy] = [Math.cos(a) * len, Math.sin(a) * len];
    const [cx, cy] = [x + dx / 2 - Math.sin(a) * bow, y + dy / 2 + Math.cos(a) * bow];
    const half = Math.max(fibres.width / 2, 0.5 / k);
    for (let t = 0; t <= 1; t += 0.5 / (len * k)) {
      const u = 1 - t;
      const [fx, fy] = [
        u * u * x + 2 * u * t * cx + t * t * (x + dx),
        u * u * y + 2 * u * t * cy + t * t * (y + dy),
      ];
      stamp(
        dark,
        fx - half,
        fy - half,
        fx + half,
        fy + half,
        (px, py) =>
          fibres.opacity * Math.min(1, Math.max(0, 0.5 - (Math.hypot(px - fx * k, py - fy * k) - half * k))),
      );
    }
  }
  const rgb = (hex: string) => [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
  const [lc, dc] = [rgb(blots.color), rgb(flecks.color)];
  const raw = new Uint8Array(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = py * size + px;
      const [al, ad] = [light[i]!, dark[i]!];
      const alpha = ad + al * (1 - ad);
      const o = py * (size * 4 + 1) + 1 + px * 4;
      for (let c = 0; c < 3; c++) {
        raw[o + c] = alpha > 0 ? Math.round((dc[c]! * ad + lc[c]! * al * (1 - ad)) / alpha) : 0;
      }
      raw[o + 3] = Math.round(alpha * 255);
    }
  }
  return png(size, raw);
})();

/** The pulp's def id: the grain strength is in it, so two settings inlined in one page keep apart. */
const pulpId = (prefix: string, grain: number) => `${prefix}-papercut-pulp${Math.round(grain * 10)}`;

/**
 * The pulp over the body's paper, where the character has defs and is shown large enough for it to read. The
 * pieces laid on the body go without: on them it barely shows, and each would be one more tile to draw every
 * frame of a live scene.
 */
function pulp(ctx: MediumContext, piece: MediumPiece) {
  if (!piece.mass || !ctx.prefix || ctx.params.grain <= 0 || pxPerUnit(ctx) < PULP.minPx) return null;
  const { node, remember, closedCurve } = ctx.kit;
  return node('path', {
    d: remember(piece.ring, 'curve', () => closedCurve(piece.ring)),
    fill: `url(#${pulpId(ctx.prefix, ctx.params.grain)})`,
  });
}

/**
 * A piece's fill over pale paper of its own colour, so the grain's specks show fibre rather than the cut line under
 * it, with the pulp over it.
 */
function paperFill(ctx: MediumContext, piece: MediumPiece) {
  const fill = pieceFill(ctx, piece, ctx.fill(piece));
  if (ctx.params.grain <= 0 || piece.color.startsWith('url(')) return [fill];
  const color = piece.color === ctx.paint.ink ? ctx.paint.solid : piece.color;
  return [pieceFill(ctx, piece, pastel(color, PAPER.pulp)), fill, pulp(ctx, piece)].filter((n) => n !== null);
}

const papercut: ThemeVariant = {
  style: 'vector',
  variant: 'papercut',
  reads: ['grain'],
  medium: {
    followsMood: true,
    /**
     * The festival's papers are vivid: a full lean, or one towards a grey tint, would wash the sheet out to salmon,
     * beige or mauve.
     */
    moodAccent: { chroma: 0.15, share: 0.75 },
    darkFace: true,
    /** The sheet's ink on a light or mid body and warm gold on a dark one, so the face always reads. */
    faceInk: { light: '#ffe08a', dark: '#2a1a1c' },
    grainedFills: true,
    grain: {
      tile: 48,
      angle: 0,
      opacity: 0.5,
      body: 0,
      specks: { count: 60, r: [0.3, 0.7] },
      streaks: { count: 110, length: [3, 9], width: 0.35, angle: 0, spread: 180 },
      seed: 41,
    },

    /** The pulp tile, its picture faded by a grain under full strength. */
    defs(prefix, _paint, params) {
      if (params.grain <= 0) return [];
      const { tile, angle } = PULP;
      return [
        {
          tag: 'pattern',
          attrs: {
            id: pulpId(prefix, params.grain),
            patternUnits: 'userSpaceOnUse',
            width: tile,
            height: tile,
            patternTransform: `rotate(${angle})`,
          },
          children: [
            {
              tag: 'image',
              attrs: {
                href: pulpImage,
                width: tile,
                height: tile,
                preserveAspectRatio: 'none',
                opacity: params.grain < 1 ? params.grain : undefined,
              },
            },
          ],
        },
      ];
    },

    /** The sheet with its pinked edge, the drop step, and the cut line round the whole figure. */
    underlay(frame, pieces, ctx) {
      const solid = ctx.paint.solid;
      const gold = GOLD_SHAPES.has(frame.shape);
      goldOf.set(pieces, gold);
      const [sheet] = grownUnderlay(frame, pieces, ctx, [
        {
          by: smallWidth(ctx, PAPER.sheet, 2),
          fill: sheetOf(solid, gold),
          accent: true,
          shape:
            pxPerUnit(ctx) < PAPER.holeMinPx ? undefined : pinked(ctx, PAPER.teeth.amp, PAPER.teeth.period),
        },
      ]);
      const [cut] = grownUnderlay(frame, pieces, ctx, [
        { by: smallWidth(ctx, PAPER.cut, 0.7), fill: cutOf(solid) },
      ]);
      const body = pieces.filter((piece) => piece.tone === 'body');
      return [
        sheet!,
        shiftedCopy(ctx, body, PAPER.drop, {
          fill: dropOf(solid),
          opacity: ctx.settled ? PAPER.dropOpacity : 0,
        }),
        cut!,
      ];
    },

    /** Cut paper: the body with the sheet showing through its crescents, every laid-on piece ringed by its own cut line. */
    paint(piece, ctx) {
      if (piece.tone === 'body') {
        const out = paperFill(ctx, piece);
        if (piece.key !== 'body' || !ctx.settled || pxPerUnit(ctx) < PAPER.holeMinPx) return out;
        const d = crescents(ctx, piece);
        if (!d) return out;
        const { fill, style } = ctx.accent(sheetOf(ctx.paint.solid, goldOf.get(ctx.pieces)));
        return [...out, ctx.kit.node('path', { d, fill, style })];
      }
      return [
        partRing(ctx, piece, smallWidth(ctx, PAPER.partCut, 0.5), cutOf(ctx.paint.solid)),
        ...paperFill(ctx, piece),
      ];
    },
  },
};

export const SKINS: readonly ThemeVariant[] = [papercut];
