/**
 * `specs`: bright eyes behind a pair of round wire glasses.
 *
 * A white with a warm iris in the body's own ink, a dark pupil and one
 * light, inside a round frame joined by an arched bridge. The glasses
 * follow the eyes' gaze most of the way and the eyes look about inside
 * them; a blink lets the frame dip and settle, and now and then a streak of
 * light sweeps across the lenses. The marks a smile, a shut eye, an x or a
 * star make are drawn inside the lens.
 */
import type { Point } from '../../../core/types.js';
import { STATE_CUTE_EYES, STATE_CUTE_MOUTH } from '../../../motion/states.js';
import { CUTE_MOUTHS } from '../../features.js';
import {
  bandRing,
  circleRing,
  convexBand,
  ellipseBand,
  lidBand,
  meet,
  place,
  quad,
  ribbon,
  sparkleRing,
  starRing,
  type Band,
} from '../geometry.js';
import { CUTE_MOUTH_GLYPHS } from '../glyphs.js';
import { clockOf, fallingTear, LayerList, looking, unit, vocabulary } from '../reading.js';
import type { DrawnEye, EyeContext, FaceDesign, FaceLayer } from '../types.js';

/** The white's half-size, in dot radii. */
const RX = 1.45;
const RY = 1.75;
const IRIS = 1.08;
const PUPIL = 0.5;
/** The lens: its radius, the frame's half-weight and how far the frame dips in a blink. */
const LENS = { r: 2.35, frame: 0.18, dip: 0.3 } as const;
const LIFT = 0.4;
const SEPARATION = 5.7;
const MOUTH_GAP = 0.7;
const LOOK = { k: 0.45, limit: 0.45 } as const;
const BALL_GAZE = 0.6;
/** One sweep of light across the lenses every `period` seconds, taking `share` of it. */
const SWEEP = { period: 5.2, share: 0.12 } as const;
const SHUT_FROM = 0.4;
const SHUT_SPAN = 0.3;

type Field = 'open' | 'sc' | 'px' | 'py' | 'tilt' | 'arc' | 'shut' | 'x' | 'star' | 'tear' | 'pupil';

const REST: DrawnEye<Field> = {
  open: 1,
  sc: 1,
  px: 0,
  py: 0,
  tilt: 0,
  arc: 0,
  shut: 0,
  x: 0,
  star: 0,
  tear: 0,
  pupil: 1,
};

const EXPRESSIONS = vocabulary<Field>(REST, (read) => {
  const [gx, gy] = looking(read.off, LOOK.k, LOOK.limit);
  const wide = read.size > 1.2;
  const small = read.size < 0.8;
  switch (read.kind) {
    case 'open':
      return {
        open: read.open,
        sc: wide ? 1.08 : small ? 0.92 : 1,
        pupil: wide ? 0.75 : small ? 0.6 : 1,
        px: gx,
        py: gy,
      };
    case 'smile':
      return { arc: 1 };
    case 'closed':
      return { shut: 1 };
    case 'mad':
      return { open: 0.75, tilt: 0.42, pupil: 0.85, py: 0.1 };
    case 'sad':
      return { open: 0.85, tilt: -0.3, tear: 1, py: 0.15 };
    case 'cross':
      return { x: 1 };
    case 'star':
      return { star: 1 };
  }
});

/** How far the frame has dipped in a blink, from how open the eye is. */
const dipOf = (open: number): number => LENS.dip * (1 - unit(open));

function eye(s: DrawnEye<Field>, ctx: EyeContext): FaceLayer[] {
  const w = ctx.weight;
  const open = s.open * unit(ctx.blink);
  const rx = RX * s.sc;
  const ry = RY * s.sc;
  const lid = -ry + (1 - open) * 2 * ry;
  const top = (x: number): number => lid + s.tilt * x;
  const white = meet(
    ellipseBand(0, 0, rx, ry),
    lidBand(top, () => Infinity),
  );
  const marks = unit(Math.max(s.arc, s.shut, s.x, s.star));
  const shown = 1 - marks;
  const shut = unit((SHUT_FROM - open) / SHUT_SPAN);
  const fy = dipOf(open);
  const t = clockOf(ctx);

  const out = new LayerList();
  out.add('face', [bandRing(white)], shown * (1 - shut), { plate: true });

  const bx = s.px + ctx.look[0] * BALL_GAZE;
  const by = s.py + ctx.look[1] * BALL_GAZE + 0.1;
  const inBall = (band: Band): Point[] | null => bandRing(meet(white, band));
  const k = s.sc;
  out.add('iris', [inBall(ellipseBand(bx, by, IRIS * k, IRIS * k))], shown);
  const pr = PUPIL * s.pupil * k;
  out.add('pupil', [inBall(ellipseBand(bx, by, pr, pr))], shown);
  out.add('face', [inBall(ellipseBand(bx - 0.4 * k, by - 0.46 * k, 0.36 * k, 0.36 * k))], shown);

  out.add('feature', [ribbon(quad([-1.35, 0.55], [0, -1.35], [1.35, 0.55]), 0.27 * w)], s.arc);
  out.add('glint', [place(sparkleRing(0.5), -1.35, -1.25)], s.arc, { detail: true });
  out.add(
    'feature',
    [ribbon(quad([-1.35, -0.2], [0, 1], [1.35, -0.2]), 0.25 * w)],
    Math.max(s.shut, shut * shown),
  );
  out.add(
    'feature',
    [
      ribbon(
        [
          [-0.9, -0.9],
          [0.9, 0.9],
        ],
        0.26 * w,
      ),
      ribbon(
        [
          [0.9, -0.9],
          [-0.9, 0.9],
        ],
        0.26 * w,
      ),
    ],
    s.x,
  );
  out.add('gold', [place(starRing(1.2, 0.46), 0, 0)], s.star);

  const lens = ellipseBand(0, fy, LENS.r - LENS.frame, LENS.r - LENS.frame);
  const streak = (x: number, width: number): Point[] | null =>
    bandRing(
      meet(
        lens,
        convexBand(
          place(
            [
              [x, -LENS.r * 1.6],
              [x + width, -LENS.r * 1.6],
              [x + width, LENS.r * 1.6],
              [x, LENS.r * 1.6],
            ],
            0,
            fy,
            1,
            (24 * Math.PI) / 180,
          ),
        ),
      ),
    );
  const phase = ((t + ctx.order * 0.06) % SWEEP.period) / SWEEP.period;
  if (!ctx.settled && phase < SWEEP.share) {
    const p = phase / SWEEP.share;
    out.add('face', [streak((p * 2 - 1) * LENS.r * 1.3 - 0.4, 0.8)], 0.5 * Math.sin(Math.PI * p), {
      detail: true,
    });
  }
  out.add('feature', [ribbon(circleRing(0, fy, LENS.r, 32), LENS.frame * w, true)]);
  fallingTear(out, ctx, s.tear, -0.8, LENS.r + fy - 0.2, LENS.r + 2.4);
  return out.layers;
}

/** The bridge between the lenses, dipping with the frame. */
function plate(left: DrawnEye<Field>, right: DrawnEye<Field>, ctx: EyeContext): FaceLayer[] {
  const fy = dipOf(Math.min(left.open, right.open) * unit(ctx.blink));
  const a = (25 * Math.PI) / 180;
  const inner = ctx.mid - LENS.r * Math.cos(a);
  const rise = fy - LENS.r * Math.sin(a);
  const out = new LayerList();
  out.add('feature', [
    ribbon(quad([-inner, rise], [0, rise - 0.55], [inner, rise]), LENS.frame * ctx.weight),
  ]);
  return out.layers;
}

export const SPECS: FaceDesign<Field> = {
  id: 'specs',
  layout: {
    lift: LIFT,
    separation: SEPARATION,
    minSeparation: 2 * LENS.r + 0.35,
    mouthDrop: LENS.r - LIFT + MOUTH_GAP,
    mouthScale: 0.9,
    mouthWeight: 1,
    blush: { x: 4.6, y: 2.9 },
    gazeShift: 0.6,
  },
  expressions: EXPRESSIONS,
  classes: {},
  states: STATE_CUTE_EYES,
  mouths: CUTE_MOUTHS,
  stateMouth: STATE_CUTE_MOUTH,
  mouthPaint: 'feature',
  quietFx: ['tear'],
  kaomoji: {
    eyes: {
      open: '◎',
      wide: '◉',
      small: '◦',
      half: '◓',
      look: '◎',
      smile: '◠',
      closed: '－',
      mad: ['ò', 'ó'],
      sad: '╥',
      cross: ['＞', '＜'],
      star: '★',
    },
    mouths: CUTE_MOUTH_GLYPHS,
  },
  eye,
  plate,
};
