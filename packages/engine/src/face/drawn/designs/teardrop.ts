/**
 * `teardrop`: tall dark drops.
 *
 * Each eye is one upright drop painted straight onto the body, round at the
 * top and a little narrower below, with a single light high on the outer
 * side. Anger and sorrow press a slanted lid down over the top, a smile is a
 * raised arc and a shut eye a lowered one.
 */
import type { Point } from '../../../core/types.js';
import { STATE_CUTE_EYES, STATE_CUTE_MOUTH } from '../../../motion/states.js';
import { CUTE_MOUTHS } from '../../features.js';
import { circleRing, place, quad, ribbon, starRing } from '../geometry.js';
import { CUTE_MOUTH_GLYPHS } from '../glyphs.js';
import { fallingTear, LayerList, looking, unit, vocabulary } from '../reading.js';
import type { DrawnEye, EyeContext, FaceDesign, FaceLayer } from '../types.js';

/** The drop's half-width and half-height, in dot radii. */
const RX = 1.75;
const RY = 2.05;
/** How much narrower the drop is at the bottom than at the top. */
const TAPER = 0.18;
const LIFT = 0.45;
const SEPARATION = 5.5;
const MOUTH_GAP = 0.9;
const LOOK = { k: 0.5, limit: 0.5 } as const;
const BLINK_FLOOR = 0.08;
const SAMPLES = 32;

type Field = 'open' | 'sc' | 'px' | 'py' | 'lid' | 'lidA' | 'arc' | 'shut' | 'x' | 'star' | 'tear';

const REST: DrawnEye<Field> = {
  open: 1,
  sc: 1,
  px: 0,
  py: 0,
  lid: 0,
  lidA: 0,
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
        sc: read.size > 1.2 ? 1.15 : read.size < 0.8 ? 0.8 : 1,
        px: gx,
        py: gy,
      };
    case 'smile':
      return { arc: 1, py: -0.1 };
    case 'closed':
      return { shut: 1 };
    case 'mad':
      return { lid: 0.4, lidA: 0.45, py: 0.1 };
    case 'sad':
      return { lid: 0.32, lidA: -0.4, tear: 1, py: 0.15 };
    case 'cross':
      return { x: 1 };
    case 'star':
      return { star: 1 };
  }
});

/** The drop about its own centre: round on top, a little narrower below. */
function drop(rx: number, ry: number): Point[] {
  return Array.from({ length: SAMPLES }, (_, i) => {
    const t = (i / SAMPLES) * Math.PI * 2;
    const y = Math.cos(t);
    return [rx * Math.sin(t) * (1 - TAPER * Math.max(0, y)), ry * y] as Point;
  });
}

function eye(s: DrawnEye<Field>, ctx: EyeContext): FaceLayer[] {
  const w = ctx.weight;
  const rx = RX * s.sc;
  const ry = RY * s.sc;
  const cx = s.px + ctx.look[0];
  const cy = s.py + ctx.look[1];
  const squash = Math.max(BLINK_FLOOR, s.open * unit(ctx.blink));
  const lidAt = (x: number): number => cy - ry + s.lid * 2 * ry + s.lidA * (x - cx);
  const ring = drop(rx, ry).map(([x, y]) => [cx + x, cy + y * squash] as Point);
  const lidded = s.lid > 0.004 ? ring.map(([x, y]) => [x, Math.max(y, lidAt(x))] as Point) : ring;
  const shown = 1 - unit(Math.max(s.arc, s.shut, s.x, s.star));
  const lit = shown * unit((squash - 0.45) / 0.3) * (1 - unit(s.lid * 3.5));

  const out = new LayerList();
  out.add('feature', [lidded], shown);
  out.add('glint', [circleRing(cx - rx * 0.3, cy - ry * 0.4 * squash, rx * 0.3, 14)], lit);
  out.add(
    'feature',
    [ribbon(quad([cx - 1.6, cy + 0.55], [cx, cy - 1.4], [cx + 1.6, cy + 0.55]), 0.3 * w)],
    s.arc,
  );
  out.add(
    'feature',
    [ribbon(quad([cx - 1.55, cy - 0.15], [cx, cy + 1.1], [cx + 1.55, cy - 0.15]), 0.27 * w)],
    s.shut,
  );
  out.add(
    'feature',
    [
      ribbon(
        [
          [cx - 1, cy - 1],
          [cx + 1, cy + 1],
        ],
        0.28 * w,
      ),
      ribbon(
        [
          [cx + 1, cy - 1],
          [cx - 1, cy + 1],
        ],
        0.28 * w,
      ),
    ],
    s.x,
  );
  out.add('gold', [place(starRing(1.2, 0.46), cx, cy)], s.star);
  fallingTear(out, ctx, s.tear, cx - 0.7, cy + ry * 0.7, cy + ry + 2.2);
  return out.layers;
}

export const TEARDROP: FaceDesign<Field> = {
  id: 'teardrop',
  layout: {
    lift: LIFT,
    separation: SEPARATION,
    minSeparation: 4.3,
    mouthDrop: RY - LIFT + MOUTH_GAP,
    mouthScale: 0.9,
    mouthWeight: 1,
    blush: { x: 4.4, y: 2.3 },
    gazeShift: 1,
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
      open: '●',
      wide: '⬤',
      small: '•',
      half: '◒',
      look: '●',
      smile: '◠',
      closed: '◡',
      mad: ['◣', '◢'],
      sad: ['◢', '◣'],
      cross: ['＞', '＜'],
      star: '★',
    },
    mouths: CUTE_MOUTH_GLYPHS,
  },
  eye,
};
