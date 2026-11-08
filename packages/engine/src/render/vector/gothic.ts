/**
 * Gothic: a dark storybook drawing. The colour is darkened from the edge in,
 * the side away from the light is hatched and cross-hatched in ink, and every
 * piece is ringed by a brushed ink line that swells on the shadow side and
 * thins where the brush lifts. The fills carry the paper's grain.
 *
 * Everything here is worked out once per outline and kept with it, as the
 * other media's geometry is.
 */
import type { Ring } from '../../core/types.js';
import { fnv1a32, mulberry32 } from '../../math/hash.js';
import type { SceneNode } from '../scene.js';
import type { GrainSpec, MediumContext, MediumPiece } from './media.js';

/** The paper: fine specks and short streaks, turned so the repeat lines up with nothing. */
export const GOTHIC_GRAIN: GrainSpec = {
  tile: 36,
  angle: 17,
  opacity: 0.5,
  body: 0,
  specks: { count: 120, r: [0.4, 1.1] },
  streaks: { count: 40, length: [2, 6], width: 0.7, angle: -20, spread: 30 },
  seed: 71,
};

/** The ink every line is drawn in: a warm black. */
const INK = '#17110d';
/** The shadow side: down and to the right, away from the light. */
const SHADOW = [Math.SQRT1_2, Math.SQRT1_2] as const;
/** The darkened edge: two strokes inside the piece, as shares of its size. */
const RIM = { opacity: 0.13, widths: [0.3, 0.14] } as const;
/** The brushed line: its width as a share of the piece, how much it varies, and how much heavier it is in shadow. */
const BAND = { base: 0.03, vary: 0.45, heavy: 0.9, minSize: 60 } as const;
/** The smallest piece that is hatched, in shape units: below it the strokes are a grey haze. */
const HATCH_MIN = 40;
/** The most points a ring is drawn through, so the brushed line stays a light path. */
const MAX_POINTS = 96;

const seedOf = (ring: Ring): number => {
  let h = 2166136261;
  for (let i = 0; i < ring.length; i += 5) {
    h = Math.imul(h ^ Math.round(ring[i]![0] * 10), 16777619);
    h = Math.imul(h ^ Math.round(ring[i]![1] * 10), 16777619);
  }
  return h >>> 0;
};

const thin = (ring: Ring): Ring => {
  if (ring.length <= MAX_POINTS) return ring;
  const step = ring.length / MAX_POINTS;
  return Array.from({ length: MAX_POINTS }, (_, i) => ring[Math.floor(i * step)]!);
};

/** A smooth loop of noise in [0, 1] over `n` points, through `knots` random values. */
const loopNoise = (n: number, knots: number, rand: () => number) => {
  const k = Array.from({ length: knots }, rand);
  return (i: number): number => {
    const t = (i / n) * knots;
    const a = Math.floor(t);
    const s = (1 - Math.cos((t - a) * Math.PI)) / 2;
    return k[a % knots]! * (1 - s) + k[(a + 1) % knots]! * s;
  };
};

/** Outward unit normals of a closed ring. */
function normals(ring: Ring): [number, number][] {
  const n = ring.length;
  let cx = 0;
  let cy = 0;
  for (const [x, y] of ring) {
    cx += x / n;
    cy += y / n;
  }
  const out = ring.map((_, i): [number, number] => {
    const a = ring[(i - 1 + n) % n]!;
    const b = ring[(i + 1) % n]!;
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    return [ty / l, -tx / l];
  });
  const outward = out.reduce((s, v, i) => s + v[0] * (ring[i]![0] - cx) + v[1] * (ring[i]![1] - cy), 0);
  return outward < 0 ? out.map(([x, y]) => [-x, -y]) : out;
}

/**
 * The brushed line round a ring, as a filled band between two offset rings:
 * thicker on the shadow side and where the noise swells, thinner where the
 * brush lifts.
 */
function brushedBand(ctx: MediumContext, ring: Ring, size: number, seed: number): string {
  const r = thin(ring);
  const nrm = normals(r);
  const noise = loopNoise(r.length, 9, mulberry32(seed));
  const width = (i: number): number =>
    size *
    BAND.base *
    (1 - BAND.vary + 2 * BAND.vary * noise(i)) *
    (1 + BAND.heavy * Math.max(0, nrm[i]![0] * SHADOW[0] + nrm[i]![1] * SHADOW[1]));
  const offset = (k: number): Ring =>
    r.map(([x, y], i) => [x + nrm[i]![0] * width(i) * k, y + nrm[i]![1] * width(i) * k]);
  const inner = offset(-0.45);
  inner.reverse();
  return ctx.kit.closedCurve(offset(0.55)) + ctx.kit.closedCurve(inner);
}

export function paintGothic(piece: MediumPiece, ctx: MediumContext): SceneNode[] {
  const { kit } = ctx;
  const { ring } = piece;
  const { size } = kit.extentOf(ring);
  const seed = seedOf(ring);
  const d = kit.remember(ring, 'curve', () => kit.closedCurve(ring));
  const clip = `${ctx.prefix ?? 'aora'}-gothic-${fnv1a32(d).toString(36)}`;
  const out: SceneNode[] = [
    kit.node('clipPath', { id: clip }, [kit.node('path', { d })]),
    kit.node('path', { d, fill: ctx.fill(piece) }),
    kit.node(
      'g',
      { 'clip-path': `url(#${clip})` },
      RIM.widths.map((w) =>
        kit.node('path', {
          d,
          stroke: '#000',
          'stroke-opacity': RIM.opacity,
          'stroke-width': kit.f1(size * w),
        }),
      ),
    ),
  ];
  if (ctx.params.hatching && size >= HATCH_MIN) {
    const hatch = kit.remember(ring, 'gothic-hatch', () =>
      kit.hatchPath(ring, {
        angle: 58,
        gap: size * 0.045,
        ragged: size * 0.035,
        seed: seed % 997,
        shade: [-size * 0.2, -size * 0.24],
      }),
    );
    const cross = kit.remember(ring, 'gothic-cross', () =>
      kit.hatchPath(ring, {
        angle: -32,
        gap: size * 0.05,
        ragged: size * 0.04,
        seed: (seed >> 3) % 997,
        shade: [-size * 0.1, -size * 0.12],
      }),
    );
    const stroke = (path: string, width: number, opacity: number) =>
      kit.node('path', {
        d: path,
        stroke: INK,
        'stroke-width': kit.f1(Math.max(1, size * width)),
        'stroke-opacity': opacity,
        'stroke-linecap': 'round',
      });
    out.push(stroke(hatch, 0.009, 0.55), stroke(cross, 0.008, 0.4));
  }
  out.push(
    kit.node('path', {
      d: kit.remember(ring, 'gothic-band', () => brushedBand(ctx, ring, Math.max(size, BAND.minSize), seed)),
      fill: INK,
      'fill-rule': 'evenodd',
    }),
  );
  return out;
}
