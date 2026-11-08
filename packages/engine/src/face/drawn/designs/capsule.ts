/**
 * `capsule`: two tall capsules, standing straight, and the cute face's mouth.
 *
 * Each eye is one dark capsule painted straight onto the body, the pair
 * mirrored about the nose. The capsules carry most of a state: joy makes
 * them taller and tips their tops together, sorrow tips them together and
 * lower, anger tips them apart, wide eyes swell into round dots, and a shut
 * eye lies down flat. A blink squashes the capsule where it stands.
 */
import type { Point } from '../../../core/types.js';
import { STATE_CUTE_EYES, STATE_CUTE_MOUTH } from '../../../motion/states.js';
import { CUTE_MOUTHS } from '../../features.js';
import { place, ribbon, starRing } from '../geometry.js';
import { CUTE_MOUTH_GLYPHS } from '../glyphs.js';
import { fallingTear, LayerList, looking, unit, vocabulary } from '../reading.js';
import type { DrawnEye, EyeContext, FaceDesign, FaceLayer } from '../types.js';

/** The capsule's half-width and half-length, in dot radii. */
const HW = 0.9;
const HL = 2.05;
/** The round dot a startled capsule swells into. */
const ROUND = { hw: 1.55, hl: 1.85 } as const;
/** How a shut eye lies: thinner than the capsule and nearly as long. */
const FLAT = { hw: 0.42, hl: 1.75 } as const;
const LIFT = 0.55;
const SEPARATION = 4.4;
const MOUTH_GAP = 0.75;
const LOOK = { k: 0.9, limit: 0.9 } as const;
/** The flattest a blink squashes a capsule, as a share of its height. */
const BLINK_FLOOR = 0.08;

type Field = 'open' | 'sc' | 'round' | 'lean' | 'shut' | 'px' | 'py' | 'x' | 'star' | 'tear';

const REST: DrawnEye<Field> = {
  open: 1,
  sc: 1,
  round: 0,
  lean: 0,
  shut: 0,
  px: 0,
  py: 0,
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
        round: read.size > 1.2 ? 1 : 0,
        sc: read.size < 0.8 ? 0.75 : 1,
        px: gx,
        py: gy,
      };
    case 'smile':
      return { sc: 1.12, lean: 0.32, py: -0.15 };
    case 'closed':
      return { shut: 1, py: 0.2 };
    case 'mad':
      return { lean: -0.42, py: 0.1 };
    case 'sad':
      return { sc: 0.88, lean: 0.36, py: 0.35, tear: 1 };
    case 'cross':
      return { x: 1 };
    case 'star':
      return { star: 1 };
  }
});

/** A capsule standing upright about the origin: two half-circles joined by straight sides. */
function capsule(hw: number, hl: number): Point[] {
  const reach = Math.max(0, hl - hw);
  const n = 12;
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (Math.PI * i) / n;
    out.push([Math.cos(a) * hw, -reach + Math.sin(a) * hw]);
  }
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * i) / n;
    out.push([Math.cos(a) * hw, reach + Math.sin(a) * hw]);
  }
  return out;
}

function eye(s: DrawnEye<Field>, ctx: EyeContext): FaceLayer[] {
  const w = ctx.weight;
  const flat = s.shut;
  const round = s.round * (1 - flat);
  const hw = s.sc * (HW + (ROUND.hw - HW) * round + (FLAT.hw - HW) * flat);
  const full = s.sc * (HL + (ROUND.hl - HL) * round + (FLAT.hl - HL) * flat);
  const hl = Math.max(hw, full * (1 - (1 - s.open) * 0.65 * (1 - flat)));
  // `lean` turns the top towards the nose, so the pair always leans as a mirror image; a shut eye lies flat.
  const turn = s.lean * (1 - flat) + (Math.PI / 2) * flat;
  const squash = 1 - (1 - Math.max(BLINK_FLOOR, unit(ctx.blink))) * (1 - flat);
  const cx = s.px + ctx.look[0];
  const cy = s.py + ctx.look[1];
  const shown = 1 - unit(Math.max(s.x, s.star));

  const out = new LayerList();
  const body = place(capsule(hw, hl), 0, 0, 1, turn).map(([x, y]) => [cx + x, cy + y * squash] as Point);
  out.add('feature', [body], shown);
  out.add(
    'feature',
    [
      ribbon(
        [
          [cx - 1.05, cy - 1.05],
          [cx + 1.05, cy + 1.05],
        ],
        0.3 * w,
      ),
      ribbon(
        [
          [cx + 1.05, cy - 1.05],
          [cx - 1.05, cy + 1.05],
        ],
        0.3 * w,
      ),
    ],
    s.x,
  );
  out.add('gold', [place(starRing(1.25, 0.46), cx, cy)], s.star);
  fallingTear(out, ctx, s.tear, cx - 0.5, cy + hl * 0.6, cy + hl + 2.2);
  return out.layers;
}

export const CAPSULE: FaceDesign<Field> = {
  id: 'capsule',
  layout: {
    lift: LIFT,
    separation: SEPARATION,
    minSeparation: 3.1,
    mouthDrop: HL - LIFT + MOUTH_GAP,
    mouthScale: 0.95,
    mouthWeight: 1,
    blush: { x: 3.9, y: 2.2 },
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
      open: '▮',
      wide: '●',
      small: '▪',
      half: '▬',
      look: '▮',
      smile: ['/', '\\'],
      closed: '－',
      mad: ['＼', '／'],
      sad: '╥',
      cross: ['＞', '＜'],
      star: '★',
    },
    mouths: CUTE_MOUTH_GLYPHS,
  },
  eye,
};
