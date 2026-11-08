/**
 * `button`: four-hole buttons sewn on for eyes.
 *
 * A button cannot roll its eye, only shift on its thread: a blink squashes
 * it, anger and sorrow tilt it under a stitched brow. Everything that is not
 * an open eye — a smile, a shut eye, an x, a star — is stitched onto the
 * body in running stitches, the star as a felt patch.
 */
import type { Point } from '../../../core/types.js';
import { STATE_CUTE_EYES, STATE_CUTE_MOUTH } from '../../../motion/states.js';
import { CUTE_MOUTHS } from '../../features.js';
import { circleRing, dashes, quad, ribbon, starRing } from '../geometry.js';
import { CUTE_MOUTH_GLYPHS } from '../glyphs.js';
import { LayerList, looking, unit, vocabulary } from '../reading.js';
import type { DrawnEye, EyeContext, FaceDesign, FaceLayer } from '../types.js';

/** The button's radius, in dot radii. */
const R = 1.9;
const LIFT = 0.4;
const SEPARATION = 5.7;
const MOUTH_GAP = 1;
/** A running stitch: dash, gap and half-width. */
const STITCH = { on: 0.7, off: 0.45, half: 0.21 } as const;
/** The thread holes, and the ring they sit in. */
const HOLE = { at: 0.5, r: 0.23 } as const;
const RIM_RING = 1.24;
const LOOK = { k: 0.3, limit: 0.3 } as const;
/** The flattest a blink squashes a button. */
const BLINK_FLOOR = 0.1;

type Field =
  'sc' | 'sy' | 'px' | 'py' | 'rot' | 'squash' | 'arc' | 'closed' | 'x' | 'star' | 'brow' | 'browA';

const REST: DrawnEye<Field> = {
  sc: 1,
  sy: 1,
  px: 0,
  py: 0,
  rot: 0,
  squash: 1,
  arc: 0,
  closed: 0,
  x: 0,
  star: 0,
  brow: 0,
  browA: 0,
};

const EXPRESSIONS = vocabulary<Field>(REST, (read) => {
  const [gx, gy] = looking(read.off, LOOK.k, LOOK.limit);
  switch (read.kind) {
    case 'open':
      return {
        sc:
          read.size < 0.8
            ? 0.82
            : read.size > 1.2
              ? 1.12
              : Math.min(1.12, Math.max(0.8, 0.55 + 0.45 * read.size)),
        sy: Math.min(1, Math.max(0.1, 0.1 + read.open * 1.05)),
        px: gx,
        py: gy,
      };
    case 'smile':
      return { arc: 1 };
    case 'closed':
      return { closed: 1 };
    case 'mad':
      return { rot: 24, squash: 0.8, brow: 1, browA: 0.3 };
    case 'sad':
      return { rot: -24, squash: 0.84, brow: 1, browA: -0.3, py: 0.2 };
    case 'cross':
      return { x: 1 };
    case 'star':
      return { star: 1 };
  }
});

/** A line in running stitches. */
const stitched = (
  points: Point[],
  weight: number,
  on: number = STITCH.on,
  off: number = STITCH.off,
): Point[][] => dashes(points, on, off).map((dash) => ribbon(dash, STITCH.half * weight));

function eye(s: DrawnEye<Field>, ctx: EyeContext): FaceLayer[] {
  const w = ctx.weight;
  const sy = s.sy * Math.max(BLINK_FLOOR, Math.min(1, ctx.blink));
  const rot = (s.rot * Math.PI) / 180;
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  const px = s.px + ctx.look[0] * LOOK.k;
  const py = s.py + ctx.look[1] * LOOK.k;
  // Tilted and squashed on its thread, then shifted and scaled with the eye.
  const sew = (ring: Point[]): Point[] =>
    ring.map(([x, y]) => {
      const ty = y * s.squash;
      const rx = x * c - ty * sn;
      const ry = x * sn + ty * c;
      return [px + rx * s.sc, py + ry * s.sc * sy] as Point;
    });
  const gone = unit(Math.max(s.arc, s.closed, s.x, s.star));
  const shown = 1 - gone;

  const out = new LayerList();
  out.add('pupil', [sew(circleRing(0.14, 0.26, R))], shown * 0.2, { detail: true });
  const disc = sew(circleRing(0, 0, R, 28));
  out.add('bone', [disc], shown, { plate: true });
  out.add('feature', [ribbon(disc, 0.08 * w, true)], shown);
  out.add('thread', [ribbon(sew(circleRing(0, 0, RIM_RING, 24)), 0.06 * w, true)], shown * 0.4, {
    detail: true,
  });
  const holes: Point[][] = [];
  for (const hx of [-HOLE.at, HOLE.at])
    for (const hy of [-HOLE.at, HOLE.at]) holes.push(sew(circleRing(hx, hy, HOLE.r, 10)));
  out.add('glass', holes, shown);
  out.add(
    'thread',
    [
      ribbon(
        sew([
          [-HOLE.at, -HOLE.at],
          [HOLE.at, HOLE.at],
        ]),
        0.1 * w,
      ),
      ribbon(
        sew([
          [HOLE.at, -HOLE.at],
          [-HOLE.at, HOLE.at],
        ]),
        0.1 * w,
      ),
    ],
    shown,
  );
  out.add('face', [ribbon(sew(quad([-1.3, -0.35], [-1.1, -1], [-0.4, -1.3], 8)), 0.1 * w)], shown * 0.85, {
    detail: true,
  });

  out.add('feature', stitched(quad([-1.7, 0.7], [0, -1.9], [1.7, 0.7], 20), w), s.arc);
  out.add('feature', stitched(quad([-1.7, -0.4], [0, 1.5], [1.7, -0.4], 20), w), s.closed);
  out.add(
    'feature',
    [
      ...stitched(
        [
          [-1.45, -1.45],
          [1.45, 1.45],
        ],
        w,
      ),
      ...stitched(
        [
          [1.45, -1.45],
          [-1.45, 1.45],
        ],
        w,
      ),
    ],
    s.x,
  );
  const felt = starRing(2.05, 0.46);
  out.add('gold', [felt], s.star);
  out.add('feature', [ribbon(felt, 0.08 * w, true)], s.star);
  const seam = starRing(1.45, 0.46);
  out.add('feature', stitched([...seam, seam[0]!], w * 0.43, 0.4, 0.32), s.star);
  const rise = Math.tan(s.browA) * 1.5;
  out.add(
    'feature',
    stitched(
      [
        [-1.5, -2.65 - rise],
        [1.5, -2.65 + rise],
      ],
      w,
    ),
    s.brow,
  );
  return out.layers;
}

export const BUTTON: FaceDesign<Field> = {
  id: 'button',
  layout: {
    lift: LIFT,
    separation: SEPARATION,
    minSeparation: 4.4,
    mouthDrop: R - LIFT + MOUTH_GAP,
    mouthScale: 1,
    mouthWeight: 1,
    blush: { x: 4.6, y: 2.2 },
    gazeShift: 0.3,
  },
  expressions: EXPRESSIONS,
  classes: {},
  states: STATE_CUTE_EYES,
  mouths: CUTE_MOUTHS,
  stateMouth: STATE_CUTE_MOUTH,
  mouthPaint: 'feature',
  quietFx: [],
  kaomoji: {
    eyes: {
      open: '⊕',
      wide: '⊕',
      small: '⊙',
      half: '⊖',
      look: '⊕',
      smile: '^',
      closed: '－',
      mad: ['⊘', '⊘'],
      sad: ['⊖', '⊖'],
      cross: ['＞', '＜'],
      star: '✶',
    },
    mouths: CUTE_MOUTH_GLYPHS,
  },
  eye,
};
