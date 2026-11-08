/**
 * The Christmas skin, `felt`: every piece cut from felt and glued to a backing
 * sheet a little larger than the figure, padded soft at the edges, woolly in
 * the fill and sewn round with a blanket stitch. The backing stands off the
 * ink as a second sheet of felt would and leans into the state's mood; the
 * thread is cream on a dark piece and red on a light one, as the sheet sewed.
 *
 * A live figure is drawn again every frame, so what a piece draws is worked
 * out once per outline and character and handed back as the same nodes, and
 * nothing is filled with a pattern or filtered: a pattern is drawn again at
 * every new scale of a squash.
 */
import type { MediumContext, MediumPiece } from '../../render/vector/media.js';
import {
  crescent,
  grownUnderlay,
  insetLine,
  pieceFill,
  pxPerUnit,
  smallWidth,
  thickness,
} from '../shared/skins.js';
import { insetRings } from '../outline-field.js';
import type { ThemeVariant } from '../types.js';
import { woolImage, type WoolSpec } from './wool.js';

type Node = ReturnType<MediumContext['kit']['node']>;

/**
 * Felt sizes in shape units: the backing's reach past the figure and the
 * fewest pixels it keeps when small, where the stitch's dashes and its
 * running thread lie inside a piece, their widths and dashes, and the
 * narrowest and the smallest piece worth sewing: a knob, a nose or a berry is
 * left plain. The sizes only decide for a piece the art does not mark
 * `plain`; a plain piece is never sewn.
 */
const FELT = {
  back: 7,
  backMinPx: 2,
  tick: { inset: 5, width: 6, dash: [1.5, 5.2] },
  line: { inset: 8.9, width: 1.3 },
  minGirth: 15,
  minSpan: 40,
  /** Stitches are left off where a shape unit is under this many pixels: they would blur into the edge. */
  stitchMinPx: 0.2,
} as const;

/**
 * Soft padding: shade below and to the right, light above and to the left,
 * one crescent each (`shift` for a piece 200 units across), on a piece at
 * least `minSize` across: on a berry or a button it would only muddy the
 * colour.
 */
const PAD = {
  shade: [-6, -7.5],
  light: [3.8, 4.9],
  shadeColor: '#2A0F0A',
  lightColor: '#FFFAEB',
  opacity: 0.2,
  minSize: 24,
} as const;

/**
 * The wool laid over the felt (`wool.ts`), one tile in shape units: soft
 * light clouds a felt sheet is mottled with, light and dark specks, and
 * stray fibres lying every which way. The tile is one bitmap in the
 * character's defs, gathered `cover` by `cover` into a block; the body and
 * every piece at least `minPart` across lay one block centred on themselves
 * under a clip to their outline. Left off where a shape unit is under
 * `minPx` pixels, where it would only grey the fill.
 */
const WOOL = {
  tile: 96,
  cover: 3,
  density: 1.6,
  clouds: { count: 7, r: [13, 24], opacity: 0.13 },
  specks: { count: 500, r: [0.35, 0.7], opacity: 0.3 },
  darkSpecks: { count: 450, r: [0.35, 0.7], opacity: 0.18 },
  fibres: { count: 600, length: [1.6, 4.5], width: 0.45, opacity: 0.3 },
  dark: { count: 450, length: [1.6, 4], width: 0.45, opacity: 0.16 },
  seed: 3,
  minPx: 0.25,
  minPart: 12,
} as const satisfies WoolSpec & { cover: number; minPx: number; minPart: number };

/**
 * The wool tile's data URL, drawn the first time a felt character needs it,
 * and the block of `cover` by `cover` tiles a live piece lays as one image:
 * a `use` of the block in the defs is cloned and laid out again whenever it
 * moves.
 */
let woolHref: string | undefined;
let woolBlock: string | undefined;

/** `make` kept per input, for the colour expressions a frame asks for again and again. */
function memo(make: (a: string, b: string) => string): (a: string, b?: string) => string {
  const kept = new Map<string, string>();
  return (a, b = '') => {
    const key = `${a}|${b}`;
    let out = kept.get(key);
    if (out === undefined) {
      if (kept.size > 256) kept.clear();
      out = make(a, b);
      kept.set(key, out);
    }
    return out;
  };
}

/**
 * The backing sheet's felt, as the sheet cut it: cream under a mid or dark
 * ink, and a deep colour under a light one, so a cream or gold figure still
 * stands off a light page. The deep colour is red under a gold ink, as every
 * gold figure was backed; it turns any other warm ink toward the greens and a
 * cool one a step back, so cream and peach sit on pine and ice on spruce,
 * clear of the red a light figure is trimmed with. `LIGHT_INK` is the ink
 * lightness where cream gives way to deep, `COOL_HUE` the hue where a warm
 * ink gives way to a cool one, `GOLD` the hues and least chroma of a gold.
 */
const LIGHT_INK = 0.72;
const COOL_HUE = 150;
const GOLD = { from: 66, to: 112, chroma: 0.08 } as const;
/** The sheet's cream, red and deep lightness, in OKLCH. */
const CREAM = { l: 0.958, c: 0.031, h: 84.6 } as const;
const RED = { l: 0.573, c: 0.186, h: 23.6 } as const;
const DEEP_L = 0.5;
const n3 = (n: number): number => Math.round(n * 1000) / 1000;
const backing = memo((solid) => {
  if (solid.startsWith('url(')) return '#fff';
  const light = `clamp(0, (l - ${LIGHT_INK}) * 100, 1)`;
  const cool = `clamp(0, (h - ${COOL_HUE}) * 100, 1)`;
  const gold =
    `(clamp(0, (c - ${GOLD.chroma}) * 50, 1) * clamp(0, (h - ${GOLD.from}) * 0.25, 1) * ` +
    `clamp(0, (${GOLD.to} - h) * 0.25, 1))`;
  const deepHue = `(h + 75 - 135 * ${cool})`;
  return (
    `oklch(from ${solid} ` +
    `calc(${CREAM.l} - ${n3(CREAM.l - DEEP_L)} * ${light} + ${n3(RED.l - DEEP_L)} * ${light} * ${gold}) ` +
    `calc(${CREAM.c} + (max(c, 0.11) - ${CREAM.c}) * ${light} + (${RED.c} - max(c, 0.11)) * ${light} * ${gold}) ` +
    `calc(${CREAM.h} + ${light} * (${deepHue} - ${CREAM.h} + ${gold} * (${RED.h} - ${deepHue}))))`
  );
});

/** The lightness of a piece above which it is sewn in the sheet's red thread rather than its cream one. */
const LIGHT_PIECE = 0.735;
const THREAD = { l: 0.962, c: 0.038, h: 83.8 } as const;
const threadOn = memo((solid) => {
  if (solid.startsWith('url(')) return '#fff';
  const light = `clamp(0, (l - ${LIGHT_PIECE}) * 100, 1)`;
  return (
    `oklch(from ${solid} calc(${THREAD.l} - ${n3(THREAD.l - RED.l)} * ${light}) ` +
    `calc(${THREAD.c} + ${n3(RED.c - THREAD.c)} * ${light}) calc(${THREAD.h} - ${n3(THREAD.h - RED.h)} * ${light}))`
  );
});

/**
 * The sheet's pine, for a leaf with no colour of its own (a borrowed gift's
 * ribbon), lifted on a green body so the leaf stays apart from it.
 */
const PINE = { l: 0.51, c: 0.094, h: 157, lift: 0.25 } as const;
const leafOn = memo((solid, fallback) => {
  if (solid.startsWith('url(')) return fallback;
  const green = 'clamp(0, (h - 115) / 20, 1) * clamp(0, (195 - h) / 20, 1) * clamp(0, (c - 0.05) * 20, 1)';
  return `oklch(from ${solid} calc(${PINE.l} + ${PINE.lift} * ${green}) ${PINE.c} ${PINE.h})`;
});

/** A ring's box, kept with it. */
const extent = (ctx: MediumContext, piece: MediumPiece) =>
  ctx.kit.remember(piece.ring, 'extent', () => ctx.kit.extentOf(piece.ring));

/** The blanket stitch round a piece that is sewn: dashes across the edge and a running thread inside them. */
function stitches(ctx: MediumContext, piece: MediumPiece): Node[] {
  if (piece.plain || pxPerUnit(ctx) < FELT.stitchMinPx) return [];
  const { remember } = ctx.kit;
  if (remember(piece.ring, 'thickness', () => thickness(piece.ring)) < FELT.minGirth) return [];
  if (extent(ctx, piece).size < FELT.minSpan) return [];
  const thread = threadOn(piece.color.startsWith('url(') ? ctx.paint.solid : piece.color);
  return remember(piece.ring, `felt-stitch:${ctx.settled}:${thread}`, () =>
    [
      ticks(ctx, piece, thread),
      insetLine(ctx, piece, FELT.line.inset, {
        stroke: thread,
        'stroke-width': FELT.line.width,
        'stroke-opacity': 0.8,
      }),
    ].filter((n) => n !== null),
  );
}

/**
 * The stitch's dashes across the edge, cut as filled quads along the inset
 * outline: a dashed stroke is dashed again every time it is rastered.
 */
function ticks(ctx: MediumContext, piece: MediumPiece, thread: string): Node | null {
  if (!ctx.settled) return null;
  const { node, remember, f1 } = ctx.kit;
  const {
    inset,
    width,
    dash: [on, off],
  } = FELT.tick;
  const d = remember(piece.ring, `felt-ticks${inset}`, () => {
    let out = '';
    for (const ring of insetRings([piece.ring], inset)) {
      const n = ring.length;
      const cum = [0];
      for (let i = 1; i <= n; i++) {
        const a = ring[i - 1]!;
        const b = ring[i % n]!;
        cum.push(cum[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1]));
      }
      const total = cum[n]!;
      let k = 0;
      const at = (s: number): [number, number] => {
        while (k < n - 1 && cum[k + 1]! < s) k++;
        const a = ring[k]!;
        const b = ring[(k + 1) % n]!;
        const seg = cum[k + 1]! - cum[k]!;
        const t = seg > 0 ? (s - cum[k]!) / seg : 0;
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      };
      for (let s = 0; s < total; s += on + off) {
        const [px, py] = at(s);
        const [qx, qy] = at(Math.min(total, s + on));
        const len = Math.hypot(qx - px, qy - py) || 1;
        const nx = (-(qy - py) / len) * (width / 2);
        const ny = ((qx - px) / len) * (width / 2);
        out +=
          `M${f1(px + nx)} ${f1(py + ny)}L${f1(qx + nx)} ${f1(qy + ny)}` +
          `L${f1(qx - nx)} ${f1(qy - ny)}L${f1(px - nx)} ${f1(py - ny)}Z`;
      }
    }
    return out;
  });
  return d ? node('path', { d, fill: thread }) : null;
}

/**
 * The wool over a piece: one block of the tile centred on it, clipped to it.
 * A static block's clip sits on a group round its `use`: a browser moves a
 * `use`'s own clip by its `x` and `y`.
 */
function wool(ctx: MediumContext, piece: MediumPiece, index: number): Node[] {
  if (!ctx.prefix || pxPerUnit(ctx) < WOOL.minPx) return [];
  const { cx, cy, size } = extent(ctx, piece);
  if (piece.key !== 'body' && size < WOOL.minPart) return [];
  const grain = Math.min(1, ctx.params.grain);
  if (grain <= 0) return [];
  const id = `${ctx.prefix}-wool${index}`;
  const { node, remember, closedCurve, f1 } = ctx.kit;
  const span = WOOL.cover * WOOL.tile;
  const at = { x: f1(cx - span / 2), y: f1(cy - span / 2) };
  const clip = { 'clip-path': `url(#${id})`, opacity: grain < 1 ? grain : undefined };
  return [
    node('clipPath', { id }, [
      node('path', { d: remember(piece.ring, 'curve', () => closedCurve(piece.ring)) }),
    ]),
    ctx.live
      ? node('image', {
          href: (woolBlock ??= woolImage(WOOL, WOOL.cover)),
          ...at,
          width: span,
          height: span,
          preserveAspectRatio: 'none',
          ...clip,
        })
      : node('g', clip, [node('use', { href: `#${ctx.prefix}-wool`, ...at })]),
  ];
}

/** A shade and a light crescent inside the edge of a piece large enough to be padded. */
function padding(ctx: MediumContext, piece: MediumPiece): Node[] {
  if (!ctx.settled || extent(ctx, piece).size < PAD.minSize) return [];
  return [
    crescent(ctx, piece, PAD.shade, PAD.shadeColor, PAD.opacity),
    crescent(ctx, piece, PAD.light, PAD.lightColor, PAD.opacity),
  ].filter((n) => n !== null);
}

/**
 * What a piece last drew, per character and piece, with the outline and the
 * inputs it was drawn for: handed back as the same nodes, a frame that
 * changes nothing costs the live scene one look at each. Bounded, because
 * every character brings ids of its own.
 */
const drawnKept = new Map<string, { ring: MediumPiece['ring']; inputs: string; nodes: Node[] }>();

/** A felt fill, the wool over it, soft padding at the edges, and the blanket stitch round a piece that is sewn. */
function feltPiece(ctx: MediumContext, piece: MediumPiece): Node[] {
  const index = ctx.pieces.indexOf(piece);
  const key = `${ctx.prefix ?? ''}:${index}`;
  const inputs =
    `${piece.color}|${ctx.paint.solid}|${ctx.settled}|${ctx.live}|${ctx.params.grain}|` + pxPerUnit(ctx);
  const kept = drawnKept.get(key);
  if (kept?.ring === piece.ring && kept.inputs === inputs) return kept.nodes;
  const layers = [...wool(ctx, piece, index), ...padding(ctx, piece), ...stitches(ctx, piece)];
  const fill = pieceFill(ctx, piece, piece.color);
  const nodes = layers.length ? [fill, ctx.kit.node('g', {}, layers)] : [fill];
  if (drawnKept.size > 2048) drawnKept.clear();
  drawnKept.set(key, { ring: piece.ring, inputs, nodes });
  return nodes;
}

const felt: ThemeVariant = {
  style: 'vector',
  variant: 'felt',
  reads: ['grain'],
  medium: {
    followsMood: true,
    moodAccent: { share: 1.4, chroma: 0.11, moods: { heated: { lightness: [0.68, 0.82] } } },
    /**
     * The face in dark yarn on every body down to the gingerbread's brown (OKLCH lightness 0.61 on either page),
     * in cream on the crimson, pine, cocoa and night ones below. The sheet's colours keep their tone on a dark
     * page, so the face keeps its own rather than the page's.
     */
    faceInk: { dark: '#2B1A16', light: '#FFF6E4', split: 0.61 },
    leaf: (paint) => leafOn(paint.solid, paint.leaf),

    /** The wool tile, and the block of it a piece lays. */
    defs(prefix) {
      woolHref ??= woolImage(WOOL);
      const { tile, cover } = WOOL;
      const copies: { tag: string; attrs: Record<string, string | number> }[] = [];
      for (let i = 0; i < cover; i++)
        for (let j = 0; j < cover; j++)
          copies.push({ tag: 'use', attrs: { href: `#${prefix}-wool-tile`, x: i * tile, y: j * tile } });
      return [
        {
          tag: 'image',
          attrs: {
            id: `${prefix}-wool-tile`,
            href: woolHref,
            width: tile,
            height: tile,
            preserveAspectRatio: 'none',
          },
        },
        { tag: 'g', attrs: { id: `${prefix}-wool` }, children: copies },
      ];
    },

    /** The backing sheet, the figure grown by its reach, shrinking at small sizes. */
    underlay(frame, pieces, ctx) {
      return grownUnderlay(frame, pieces, ctx, [
        { by: smallWidth(ctx, FELT.back, FELT.backMinPx), fill: backing(ctx.paint.solid), accent: true },
      ]);
    },

    paint: (piece, ctx) => feltPiece(ctx, piece),
  },
};

export const SKINS: readonly ThemeVariant[] = [felt];
