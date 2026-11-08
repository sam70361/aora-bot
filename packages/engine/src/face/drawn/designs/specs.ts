/**
 * `specs`: dark eyes behind a pair of round glasses.
 *
 * One dark eye with one light inside a small, bold round frame, the two
 * frames joined by a flat bridge. The eyes look about inside the lenses; a
 * blink lets the frame dip and settle. The marks a smile, a shut eye, an x
 * or a star make are drawn inside the lens.
 */
import { STATE_CUTE_EYES, STATE_CUTE_MOUTH } from '../../../motion/states.js';
import { CUTE_MOUTHS } from '../../features.js';
import {
  bandRing,
  circleRing,
  ellipseBand,
  lidBand,
  meet,
  place,
  quad,
  ribbon,
  sparkleRing,
  starRing,
} from '../geometry.js';
import { CUTE_MOUTH_GLYPHS } from '../glyphs.js';
import { fallingTear, LayerList, looking, unit, vocabulary } from '../reading.js';
import type { DrawnEye, EyeContext, FaceDesign, FaceLayer } from '../types.js';

/** The eye's half-size, in dot radii. */
const RX = 0.95;
const RY = 1.2;
/** The lens: its radius, the frame's half-weight and how far the frame dips in a blink. */
const LENS = { r: 2.05, frame: 0.24, dip: 0.3 } as const;
/** The bridge: its height at the frames and at the middle, above the lens centre. */
const BRIDGE = { ends: -0.45, middle: -0.75 } as const;
const LIFT = 0.4;
const SEPARATION = 5.2;
const MOUTH_GAP = 0.7;
const LOOK = { k: 0.45, limit: 0.45 } as const;
const BALL_GAZE = 0.6;
const SHUT_FROM = 0.4;
const SHUT_SPAN = 0.3;

type Field = 'open' | 'sc' | 'px' | 'py' | 'tilt' | 'arc' | 'shut' | 'x' | 'star' | 'tear';

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
};

const EXPRESSIONS = vocabulary<Field>(REST, (read) => {
  const [gx, gy] = looking(read.off, LOOK.k, LOOK.limit);
  switch (read.kind) {
    case 'open':
      return {
        open: read.open,
        sc: read.size > 1.2 ? 1.12 : read.size < 0.8 ? 0.85 : 1,
        px: gx,
        py: gy,
      };
    case 'smile':
      return { arc: 1 };
    case 'closed':
      return { shut: 1 };
    case 'mad':
      return { open: 0.75, tilt: 0.42, py: 0.1 };
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
  const shut = unit((SHUT_FROM - open) / SHUT_SPAN);
  const shown = 1 - unit(Math.max(s.arc, s.shut, s.x, s.star));
  const fy = dipOf(open);

  const cx = s.px + ctx.look[0] * BALL_GAZE;
  const cy = s.py + ctx.look[1] * BALL_GAZE;
  const rx = RX * s.sc;
  const ry = RY * s.sc;
  const lid = cy - ry + (1 - open) * 2 * ry;
  const ball = meet(
    ellipseBand(cx, cy, rx, ry),
    lidBand(
      (x) => lid + s.tilt * (x - cx),
      () => Infinity,
    ),
  );

  const out = new LayerList();
  out.add('feature', [bandRing(ball)], shown * (1 - shut));
  out.add(
    'glint',
    [circleRing(cx - rx * 0.36, cy - ry * 0.4, rx * 0.3, 12)],
    shown * (1 - shut) * unit((open - 0.55) / 0.25),
  );

  out.add('feature', [ribbon(quad([-1.25, 0.5], [0, -1.25], [1.25, 0.5]), 0.27 * w)], s.arc);
  out.add('glint', [place(sparkleRing(0.45), -1.25, -1.15)], s.arc, { detail: true });
  out.add(
    'feature',
    [ribbon(quad([-1.25, -0.2], [0, 0.95], [1.25, -0.2]), 0.25 * w)],
    Math.max(s.shut, shut * shown),
  );
  out.add(
    'feature',
    [
      ribbon(
        [
          [-0.85, -0.85],
          [0.85, 0.85],
        ],
        0.26 * w,
      ),
      ribbon(
        [
          [0.85, -0.85],
          [-0.85, 0.85],
        ],
        0.26 * w,
      ),
    ],
    s.x,
  );
  out.add('gold', [place(starRing(1.1, 0.46), 0, 0)], s.star);

  out.add('feature', [ribbon(circleRing(0, fy, LENS.r, 32), LENS.frame * w, true)]);
  fallingTear(out, ctx, s.tear, -0.8, LENS.r + fy - 0.2, LENS.r + 2.4);
  return out.layers;
}

/** The bridge between the lenses, dipping with the frame. */
function plate(left: DrawnEye<Field>, right: DrawnEye<Field>, ctx: EyeContext): FaceLayer[] {
  const fy = dipOf(Math.min(left.open, right.open) * unit(ctx.blink));
  const inner = ctx.mid - LENS.r * 0.97;
  const out = new LayerList();
  out.add('feature', [
    ribbon(
      quad([-inner, fy + BRIDGE.ends], [0, fy + BRIDGE.middle], [inner, fy + BRIDGE.ends]),
      LENS.frame * ctx.weight,
    ),
  ]);
  return out.layers;
}

export const SPECS: FaceDesign<Field> = {
  id: 'specs',
  layout: {
    lift: LIFT,
    separation: SEPARATION,
    minSeparation: 2 * LENS.r + 0.4,
    mouthDrop: LENS.r - LIFT + MOUTH_GAP,
    mouthScale: 0.9,
    mouthWeight: 1,
    blush: { x: 4.4, y: 2.7 },
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
