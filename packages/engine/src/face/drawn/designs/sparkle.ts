/**
 * `sparkle`: tall, shining anime eyes.
 *
 * A white oval under a heavy upper lash with a flick at the outer corner,
 * and inside it an iris in the body's own colour, deepened, glowing paler at
 * the bottom, with a dark pupil and a cluster of highlights. Frightened, the
 * pupil shrinks; sad, the highlights swell and a tear slides down.
 */
import type { Point } from '../../../core/types.js';
import { STATE_CUTE_EYES, STATE_CUTE_MOUTH } from '../../../motion/states.js';
import { CUTE_MOUTHS } from '../../features.js';
import {
  bandRing,
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
import { fallingTear, LayerList, looking, spread, unit, vocabulary } from '../reading.js';
import type { DrawnEye, EyeContext, FaceDesign, FaceLayer } from '../types.js';

/** The white's half-size, in dot radii. */
const RX = 1.85;
const RY = 2.5;
/** The iris, centred a little low in the white. */
const IRIS = { cy: 0.2, rx: 1.4, ry: 1.85 } as const;
const PUPIL = { cy: 0.15, rx: 0.62, ry: 0.88 } as const;
const LIFT = 0.5;
const SEPARATION = 5.7;
const MOUTH_GAP = 0.9;
const LOOK = { k: 0.4, limit: 0.36 } as const;
const BALL_GAZE = 0.3;
const SHUT_FROM = 0.4;
const SHUT_SPAN = 0.3;

type Field =
  | 'open'
  | 'sc'
  | 'px'
  | 'py'
  | 'ir'
  | 'tilt'
  | 'glow'
  | 'arc'
  | 'x'
  | 'star'
  | 'brow'
  | 'browA'
  | 'tear'
  | 'pupil';

const REST: DrawnEye<Field> = {
  open: 1,
  sc: 1,
  px: 0,
  py: 0,
  ir: 1,
  tilt: 0,
  glow: 1,
  arc: 0,
  x: 0,
  star: 0,
  brow: 0,
  browA: 0,
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
        sc: wide ? 1.08 : small ? 0.94 : 1,
        ir: wide ? 0.94 : small ? 0.72 : 1,
        pupil: wide ? 0.7 : small ? 0.62 : 1,
        px: gx,
        py: gy,
      };
    case 'smile':
      return { arc: 1 };
    case 'closed':
      return { open: 0 };
    case 'mad':
      return { open: 0.8, tilt: 0.42, ir: 0.84, pupil: 0.8, glow: 0.7, brow: 1, browA: 0.4, py: 0.05 };
    case 'sad':
      return {
        open: 0.9,
        tilt: -0.24,
        ir: 1.06,
        pupil: 1.1,
        glow: 1.25,
        brow: 1,
        browA: -0.4,
        tear: 1,
        py: 0.12,
      };
    case 'cross':
      return { x: 1 };
    case 'star':
      return { star: 1 };
  }
});

function eye(s: DrawnEye<Field>, ctx: EyeContext): FaceLayer[] {
  const w = ctx.weight;
  const open = s.open * unit(ctx.blink);
  const rx = RX * s.sc;
  const ry = RY * s.sc;
  const lid = -ry + (1 - open) * 2 * ry;
  const sag = 0.4 * (1 - open) ** 2;
  const top = (x: number): number => lid + s.tilt * x + sag * (1 - (x / rx) ** 2);
  const white = meet(
    ellipseBand(0, 0, rx, ry),
    lidBand(top, () => Infinity),
  );
  const shown = 1 - unit(Math.max(s.arc, s.x));
  const shut = unit((SHUT_FROM - open) / SHUT_SPAN);
  const lines = shown * (1 - shut);

  const out = new LayerList();
  const whiteRing = bandRing(white);
  out.add('face', [whiteRing], shown, { plate: true });

  // The ball: iris, pupil and lights, moved by the gaze and grown by `ir`.
  const bx = s.px + ctx.look[0] * BALL_GAZE;
  const by = s.py + ctx.look[1] * BALL_GAZE;
  const k = s.ir;
  const inBall = (band: Band): Point[] | null => bandRing(meet(white, band));
  const iris = ellipseBand(bx, by + IRIS.cy * k, IRIS.rx * k, IRIS.ry * k);
  const irisRing = inBall(iris);
  out.add('iris', [irisRing], shown);
  const glowTop = (x: number): number => by + k * (0.95 + 0.35 * (1 - ((x - bx) / (1.05 * k)) ** 2));
  const glowBottom = (x: number): number => by + k * (0.95 + 0.7 * (1 - ((x - bx) / (1.05 * k)) ** 2));
  out.add(
    'face',
    [inBall(meet(iris, { x0: bx - 1.05 * k, x1: bx + 1.05 * k, top: glowTop, bottom: glowBottom }))],
    shown * 0.38,
    {
      detail: true,
    },
  );
  const pr = s.pupil * k;
  out.add(
    'pupil',
    [inBall(ellipseBand(bx, by + PUPIL.cy * k, PUPIL.rx * pr, PUPIL.ry * pr))],
    shown * (1 - s.star),
  );
  if (irisRing) out.add('pupil', [ribbon(irisRing, 0.07 * w, true)], shown * 0.45, { detail: true });
  const g = s.glow * k;
  out.add('face', [inBall(ellipseBand(bx - 0.52 * g, by - 0.62 * g, 0.52 * g, 0.6 * g))], shown);
  out.add('face', [inBall(ellipseBand(bx + 0.62 * g, by + 0.78 * g, 0.24 * g, 0.24 * g))], shown, {
    detail: true,
  });
  out.add('face', [place(sparkleRing(0.42 * g), bx + 0.52 * g, by - 0.1 * g)], shown * (1 - shut), {
    detail: true,
  });
  out.add('gold', [place(starRing(1.15, 0.46), bx, by, k)], s.star * shown);

  // The lines: lash along the lid, its flick, the lower rim, and the marks a closed eye becomes.
  const xs = spread(-rx, rx, 18);
  const upper = xs.map((x) => [x, Math.max(top(x), white.top(x))] as Point);
  out.add('feature', [ribbon(upper, 0.31 * w)], lines);
  const corner = upper[1]!;
  out.add(
    'feature',
    [
      ribbon(
        [
          [corner[0] + 0.1, corner[1]],
          [corner[0] - 0.5, corner[1] - 0.42],
        ],
        0.21 * w,
      ),
    ],
    lines,
  );
  out.add(
    'feature',
    [
      ribbon(
        xs.map((x) => [x, white.bottom(x)] as Point),
        0.05 * w,
      ),
    ],
    lines * 0.4,
    { detail: true },
  );
  out.add(
    'feature',
    [
      ribbon(place(quad([-1.5, -0.3], [0, 1.05], [1.5, -0.3]), 0, 0, s.sc), 0.26 * w),
      ribbon(
        place(
          [
            [-1.5, -0.3],
            [-2.05, -0.9],
          ],
          0,
          0,
          s.sc,
        ),
        0.26 * w,
      ),
      ribbon(
        place(
          [
            [-0.9, 0.4],
            [-1.15, 1.05],
          ],
          0,
          0,
          s.sc,
        ),
        0.26 * w,
      ),
    ],
    shown * shut,
  );
  out.add(
    'feature',
    [ribbon(place(quad([-1.45, 0.7], [0, -1.7], [1.45, 0.7]), 0, 0, s.sc), 0.29 * w)],
    s.arc,
  );
  out.add('face', [place(sparkleRing(0.6), -1.3 * s.sc, -1.55 * s.sc)], s.arc);
  out.add(
    'feature',
    [
      ribbon(
        [
          [-0.95, -0.95],
          [0.95, 0.95],
        ],
        0.29 * w,
      ),
      ribbon(
        [
          [0.95, -0.95],
          [-0.95, 0.95],
        ],
        0.29 * w,
      ),
    ],
    s.x,
  );
  const browY = -ry - 0.8;
  const rise = Math.tan(s.browA) * 0.95;
  out.add(
    'feature',
    [
      ribbon(
        [
          [-0.95, browY - rise],
          [0.95, browY + rise],
        ],
        0.21 * w,
      ),
    ],
    s.brow,
  );
  fallingTear(out, ctx, s.tear, -0.9, 1.4, 3.8);
  return out.layers;
}

export const SPARKLE: FaceDesign<Field> = {
  id: 'sparkle',
  layout: {
    lift: LIFT,
    separation: SEPARATION,
    minSeparation: 4.3,
    mouthDrop: RY - LIFT + MOUTH_GAP,
    mouthScale: 1,
    mouthWeight: 1,
    blush: { x: 4.5, y: 2.55 },
    gazeShift: 0.4,
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
      open: '✧',
      wide: '✪',
      small: '⋆',
      half: '-',
      look: '✧',
      smile: '^',
      closed: '－',
      mad: ['ò', 'ó'],
      sad: 'ಥ',
      cross: ['＞', '＜'],
      star: '★',
    },
    mouths: CUTE_MOUTH_GLYPHS,
  },
  eye,
};
