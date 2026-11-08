/**
 * `shades`: a pair of rounded sunglasses over the eyes.
 *
 * The lenses are dark glass in a frame, and through them small light eyes
 * still do everything the face does: blink, smile, cry, cross, turn to
 * stars. Anger and sorrow tilt the lenses. Asleep, the glasses are pushed up
 * the head and the shut eyes show beneath.
 */
import type { Point } from '../../../core/types.js';
import { STATE_CUTE_EYES, STATE_CUTE_MOUTH } from '../../../motion/states.js';
import { CUTE_MOUTHS } from '../../features.js';
import {
  bandRing,
  convexBand,
  ellipseBand,
  meet,
  quad,
  ribbon,
  sparkleRing,
  starRing,
  type Band,
} from '../geometry.js';
import { CUTE_MOUTH_GLYPHS } from '../glyphs.js';
import { clockOf, fallingTear, LayerList, looking, unit, vocabulary } from '../reading.js';
import type { DrawnEye, EyeContext, FaceDesign, FaceLayer } from '../types.js';

/** A lens: half-width, half-height and the radius of its upper corners, in dot radii. */
const LENS = { w: 2.3, h: 1.75, corner: 0.7 } as const;
const SEPARATION = 5.3;
const LIFT = 0;
const MOUTH_GAP = 0.8;
/**
 * How the glasses ride up the head when the eyes shut: rise, turn (degrees)
 * and shrink, and how far up they have to be to count as off the face.
 */
const PUSHED_UP = { rise: 3.5, turn: 7, shrink: 0.08, leaves: 0.5 } as const;
/** The little eye seen through the lens. */
const BEAD = 0.75;
const LOOK = { k: 0.7, limit: 0.55 } as const;
const FRAME = 0.21;

type Field =
  | 'rot'
  | 'sc'
  | 'dy'
  | 'dot'
  | 'dr'
  | 'open'
  | 'px'
  | 'py'
  | 'smile'
  | 'shut'
  | 'x'
  | 'star'
  | 'brow'
  | 'browA'
  | 'tear'
  | 'up';

const REST: DrawnEye<Field> = {
  rot: 0,
  sc: 1,
  dy: 0,
  dot: 1,
  dr: 1,
  open: 1,
  px: 0,
  py: 0,
  smile: 0,
  shut: 0,
  x: 0,
  star: 0,
  brow: 0,
  browA: 0,
  tear: 0,
  up: 0,
};

const EXPRESSIONS = vocabulary<Field>(REST, (read) => {
  const [gx, gy] = looking(read.off, LOOK.k, LOOK.limit);
  const wide = read.size > 1.2;
  const small = read.size < 0.8;
  switch (read.kind) {
    case 'open':
      return {
        open: read.open,
        sc: wide ? 1.12 : small ? 0.9 : 1,
        dr: wide ? 0.85 : small ? 0.7 : 1,
        px: gx,
        py: gy,
        dy: wide ? -0.25 : 0,
      };
    case 'smile':
      return { dot: 0, smile: 1, dy: -0.2, sc: 1.04 };
    case 'closed':
      return { dot: 0, shut: 1, up: 1 };
    case 'mad':
      return { rot: 13, dr: 0.8, brow: 1, browA: 0.42, py: 0.25 };
    case 'sad':
      return { rot: -9, sc: 0.94, dr: 1.12, brow: 1, browA: -0.42, tear: 1, py: 0.25, dy: 0.1 };
    case 'cross':
      return { dot: 0, x: 1 };
    case 'star':
      return { dot: 0, star: 1, sc: 1.05 };
  }
});

/** A lens: flat on top with rounded corners, curving to a soft point at the bottom. */
const LENS_BAND: Band = {
  x0: -LENS.w,
  x1: LENS.w,
  top: (x) => {
    const dx = Math.abs(x) - (LENS.w - LENS.corner);
    return -LENS.h + (dx > 0 ? LENS.corner - Math.sqrt(Math.max(0, LENS.corner ** 2 - dx * dx)) : 0);
  },
  bottom: (x) => LENS.h * (0.1 + 0.9 * Math.sqrt(Math.max(0, 1 - (x / LENS.w) ** 2))),
};

/** An affine map as a function on rings: rotate (radians) and scale about the origin, then move. */
const mover =
  (dx: number, dy: number, scale: number, rotate: number) =>
  (ring: readonly Point[]): Point[] => {
    const c = Math.cos(rotate) * scale;
    const s = Math.sin(rotate) * scale;
    return ring.map(([x, y]) => [dx + x * c - y * s, dy + x * s + y * c] as Point);
  };

/**
 * The glasses' own lift up the head, about the middle of the face; `mid` is
 * where that is from this eye, `nose` turns the tilt the same way on screen.
 */
const pushedUp = (up: number, mid: number, nose: number) => {
  const turn = (-PUSHED_UP.turn * up * nose * Math.PI) / 180;
  const shrink = 1 - PUSHED_UP.shrink * up;
  const inner = mover(0, 0, shrink, turn);
  return (ring: readonly Point[]): Point[] =>
    inner(ring.map(([x, y]) => [x - mid, y] as Point)).map(
      ([x, y]) => [x + mid, y - PUSHED_UP.rise * up] as Point,
    );
};

function eye(s: DrawnEye<Field>, ctx: EyeContext): FaceLayer[] {
  const w = ctx.weight;
  const lens = mover(0, s.dy, s.sc, (s.rot * Math.PI) / 180);
  const rig = pushedUp(s.up, ctx.mid, ctx.nose);
  const onLens = (ring: Point[] | null): Point[] | null => ring && rig(lens(ring));
  const through = 1 - s.up;
  const t = clockOf(ctx);

  const out = new LayerList();
  const glass = bandRing(LENS_BAND);
  out.add('glass', [onLens(glass)], 1, { plate: true });

  const px = s.px + ctx.look[0] * LOOK.k;
  const py = s.py + ctx.look[1] * LOOK.k + 0.1;
  const open = s.open * unit(ctx.blink);
  const bead = BEAD * s.dr;
  out.add(
    'face',
    [onLens(bandRing(meet(LENS_BAND, ellipseBand(px, py, bead, Math.max(0.05, bead * open)))))],
    s.dot * through,
  );
  const lineHalf = 0.21 * w;
  out.add('face', [onLens(ribbon(quad([-1, 0.4], [0, -1], [1, 0.4]), lineHalf))], s.smile * through);
  out.add('face', [onLens(ribbon(quad([-1, -0.2], [0, 0.95], [1, -0.2]), lineHalf))], s.shut * through);
  out.add(
    'face',
    [
      onLens(
        ribbon(
          [
            [-0.8, -0.8],
            [0.8, 0.8],
          ],
          0.25 * w,
        ),
      ),
      onLens(
        ribbon(
          [
            [0.8, -0.8],
            [-0.8, 0.8],
          ],
          0.25 * w,
        ),
      ),
    ],
    s.x * through,
  );
  out.add('gold', [onLens(starRing(1.2, 0.46))], s.star * through);
  const rise = Math.tan(s.browA);
  out.add(
    'face',
    [
      onLens(
        ribbon(
          [
            [-1, -0.95 - rise],
            [1, -0.95 + rise],
          ],
          0.19 * w,
        ),
      ),
    ],
    s.brow * through,
  );
  // Two slanted streaks of reflected light across the glass.
  const streak = (x: number, width: number): Point[] | null =>
    bandRing(
      meet(
        LENS_BAND,
        convexBand(
          mover(
            0,
            0,
            1,
            (28 * Math.PI) / 180,
          )([
            [x, -2.2],
            [x + width, -2.2],
            [x + width, 1],
            [x, 1],
          ]),
        ),
      ),
    );
  out.add('face', [onLens(streak(-1.6, 0.5))], 0.4, { detail: true });
  out.add('face', [onLens(streak(-0.75, 0.24))], 0.3, { detail: true });
  out.add('feature', [onLens(glass && ribbon(glass, FRAME * w, true))]);

  const twinkle = 0.85 + 0.15 * Math.sin(t * 5 + ctx.order);
  const spark = mover(LENS.w - 0.3, -LENS.h + 0.1, twinkle, 0)(sparkleRing(0.7));
  out.add('glint', [onLens(spark)], Math.max(s.smile, s.star));

  const tears = new LayerList();
  fallingTear(tears, ctx, s.tear, 0.9, LENS.h + 0.3, LENS.h + 2.2);
  for (const { paint, rings, opacity, ...rest } of tears.layers)
    out.add(paint, rings.map(onLens), opacity, rest);
  // Glasses pushed up the head have left the face, as a hat has: the face is not fitted to make room for them.
  if (s.up >= PUSHED_UP.leaves) for (const layer of out.layers) layer.loose = true;

  // Under the pushed-up glasses, the shut eyes themselves.
  const bare = unit(s.up * 1.2 - 0.2);
  out.add(
    'feature',
    [
      ribbon(quad([-1.45, -0.3], [0, 1.2], [1.45, -0.3]), 0.23 * w),
      ribbon(
        [
          [-1.45, -0.3],
          [-2, -0.8],
        ],
        0.15 * w,
      ),
      ribbon(
        [
          [-0.9, 0.5],
          [-1.2, 1.2],
        ],
        0.15 * w,
      ),
    ],
    bare,
  );
  return out.layers;
}

/** The bridge and the temples, which ride up with the lenses. */
function plate(left: DrawnEye<Field>, right: DrawnEye<Field>, ctx: EyeContext): FaceLayer[] {
  const up = (left.up + right.up) / 2;
  const rig = pushedUp(up, 0, 1);
  const edge = ctx.mid + LENS.w;
  const out = new LayerList();
  out.add(
    'feature',
    [
      rig(ribbon(quad([-0.45, -0.55], [0, -1], [0.45, -0.55]), 0.23 * ctx.weight)),
      rig(
        ribbon(
          [
            [-edge, -0.9],
            [-edge - 0.85, -1.15],
          ],
          0.23 * ctx.weight,
        ),
      ),
      rig(
        ribbon(
          [
            [edge, -0.9],
            [edge + 0.85, -1.15],
          ],
          0.23 * ctx.weight,
        ),
      ),
    ],
    1,
    { loose: up >= PUSHED_UP.leaves },
  );
  return out.layers;
}

export const SHADES: FaceDesign<Field> = {
  id: 'shades',
  layout: {
    lift: LIFT,
    separation: SEPARATION,
    minSeparation: 5,
    mouthDrop: LENS.h - LIFT + MOUTH_GAP,
    mouthScale: 1,
    mouthWeight: 1,
    blush: { x: 4.6, y: 2.25 },
    gazeShift: 0.25,
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
      open: ['⌐■', '■'],
      wide: ['⌐■', '■'],
      small: ['⌐■', '■'],
      half: ['⌐■', '■'],
      look: ['⌐■', '■'],
      smile: ['⌐■', '■'],
      closed: '－',
      mad: ['◤', '◥'],
      sad: ['◢', '◣'],
      cross: ['＞', '＜'],
      star: ['⌐★', '★'],
    },
    mouths: CUTE_MOUTH_GLYPHS,
  },
  eye,
  plate,
};
