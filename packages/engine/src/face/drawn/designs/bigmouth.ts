/**
 * `bigmouth`: bead eyes set high, and a mouth twice the size that does the
 * talking.
 *
 * The mouths are the cute ones, grown by `mouthScale` and drawn heavier, and
 * this face wears one in every state. An open mouth grows a tongue, and one
 * with a flat top shows a row of teeth. The bead eyes say what is left with
 * small brows: raised for surprise and fright, slanted for anger and
 * sorrow.
 */
import type { CuteMouthId } from '../../../core/types.js';
import { STATE_CUTE_EYES, STATE_CUTE_MOUTH, type CharacterState } from '../../../motion/states.js';
import { CUTE_MOUTHS, mouthProfile } from '../../features.js';
import { bandRing, ellipseBand, meet, place, quad, ribbon, starRing } from '../geometry.js';
import { LayerList, unit, vocabulary } from '../reading.js';
import type { DrawnEye, EyeContext, FaceDesign, FaceLayer, MouthContext } from '../types.js';

/** The bead's radius, in dot radii. */
const BEAD = 0.72;
const LIFT = 0.9;
const SEPARATION = 4.7;
const MOUTH_GAP = 1.7;
const MOUTH_SCALE = 1.9;
/** A closed mouth grown at full line weight reads as a moustache, so the weight grows less than the mouth. */
const MOUTH_WEIGHT = 1.3;
/** Openness, in dot radii, from which a tongue shows, and over how much more it fills. */
const TONGUE = { from: 1, span: 1.5 } as const;
/** Openness from which teeth show under a flat upper lip, and over how much more they fill. */
const TEETH = { from: 1.2, span: 1.2 } as const;
/** The bead's flattest blink. */
const BLINK_FLOOR = 0.12;

type Field =
  'bead' | 'bw' | 'bo' | 'smile' | 'closed' | 'cross' | 'star' | 'brow' | 'ba' | 'by' | 'ax' | 'ay';

const REST: DrawnEye<Field> = {
  bead: 0,
  bw: BEAD,
  bo: 1,
  smile: 0,
  closed: 0,
  cross: 0,
  star: 0,
  brow: 0,
  ba: 0,
  by: -1.4,
  ax: 0,
  ay: 0,
};

const EXPRESSIONS = vocabulary<Field>(REST, (read) => {
  switch (read.kind) {
    case 'open':
      return {
        bead: 1,
        bw: BEAD * Math.min(1.2, Math.max(0.8, 0.75 + read.size * 0.25)),
        bo: Math.max(BLINK_FLOOR, read.open),
        ax: read.off[0] * 0.4,
        ay: read.off[1] * 0.4,
        ...(read.size > 1.2
          ? { brow: 1, by: -1.7, ba: 0 }
          : read.size < 0.8
            ? { brow: 1, by: -1.45, ba: -0.3 }
            : null),
      };
    case 'smile':
      return { smile: 1 };
    case 'closed':
      return { closed: 1 };
    case 'mad':
      return { bead: 1, brow: 1, ba: 0.42, by: -1.2, ax: 0.15 };
    case 'sad':
      return { bead: 1, brow: 1, ba: -0.4, by: -1.3, ay: 0.2 };
    case 'cross':
      return { cross: 1 };
    case 'star':
      return { star: 1 };
  }
});

function eye(s: DrawnEye<Field>, ctx: EyeContext): FaceLayer[] {
  const w = ctx.weight;
  const bo = s.bo * Math.max(BLINK_FLOOR, Math.min(1, ctx.blink));
  const ax = s.ax + ctx.look[0] * 0.3;
  const ay = s.ay + ctx.look[1] * 0.3;
  const out = new LayerList();
  out.add('feature', [bandRing(ellipseBand(ax, ay, s.bw, s.bw * bo))], s.bead);
  out.add(
    'glint',
    [bandRing(ellipseBand(ax - s.bw * 0.3, ay - s.bw * 0.34 * bo, s.bw * 0.3, s.bw * 0.3 * bo))],
    s.bead * unit((bo - 0.4) / 0.2),
    {
      detail: true,
    },
  );
  out.add('feature', [ribbon(quad([-0.8, 0.25], [0, -0.95], [0.8, 0.25]), 0.17 * w)], s.smile);
  out.add('feature', [ribbon(quad([-0.75, -0.05], [0, 0.55], [0.75, -0.05]), 0.15 * w)], s.closed);
  out.add(
    'feature',
    [
      ribbon(
        [
          [-0.45, -0.45],
          [0.45, 0.45],
        ],
        0.11 * w,
      ),
      ribbon(
        [
          [0.45, -0.45],
          [-0.45, 0.45],
        ],
        0.11 * w,
      ),
    ],
    s.cross,
  );
  const star = starRing(0.85, 0.46);
  out.add('gold', [star], s.star);
  out.add('feature', [ribbon(star, 0.05 * w, true)], s.star);
  out.add(
    'feature',
    [
      ribbon(
        place(
          [
            [-0.62, 0],
            [0.62, 0],
          ],
          -0.05,
          s.by,
          1,
          s.ba,
        ),
        0.12 * w,
      ),
    ],
    s.brow,
  );
  return out.layers;
}

/** A tongue in every open mouth, and teeth along a flat upper lip. */
function inMouth({ mouth }: MouthContext): FaceLayer[] {
  const opening = mouthProfile(mouth, 1);
  const out = new LayerList();
  const tongue = unit((mouth.open - TONGUE.from) / TONGUE.span);
  const height = mouth.open;
  const low = opening.bottom(0);
  const ry = height * 0.5 * tongue;
  out.add(
    'tongue',
    [bandRing(meet(opening, ellipseBand(0, low + height * 0.02 - ry * 0.35, mouth.width * 0.54, ry)))],
    tongue,
  );
  const flat = 1 - unit((mouth.upper ?? 0.38) / 0.38);
  const teeth = flat * unit((mouth.open - TEETH.from) / TEETH.span);
  const reach = mouth.width * 0.48;
  out.add(
    'glint',
    [
      bandRing(
        meet(opening, {
          x0: -reach,
          x1: reach,
          top: (x) => opening.top(x) - 0.2,
          bottom: (x) => opening.top(x) + height * 0.34 * teeth,
        }),
      ),
    ],
    teeth,
  );
  return out.layers;
}

/** Every state wears a mouth here: those the cute face leaves bare get the nearest one that suits them. */
const BARE: Partial<Record<CharacterState, CuteMouthId>> = {
  idle: 'smile',
  sleeping: 'dot',
  drowsy: 'flat',
  'powering-down': 'flat',
  listening: 'smile',
  reading: 'flat',
  writing: 'cat',
  working: 'flat',
  loading: 'o',
  progress: 'flat',
  radar: 'dot',
  orbit: 'smile',
  uploading: 'smile',
  waiting: 'flat',
};

export const BIGMOUTH: FaceDesign<Field> = {
  id: 'bigmouth',
  layout: {
    lift: LIFT,
    separation: SEPARATION,
    minSeparation: 3.2,
    mouthDrop: BEAD - LIFT + MOUTH_GAP,
    mouthScale: MOUTH_SCALE,
    mouthWeight: MOUTH_WEIGHT,
    blush: { x: 4.3, y: 1.2 },
    gazeShift: 0.6,
  },
  expressions: EXPRESSIONS,
  classes: {},
  states: STATE_CUTE_EYES,
  mouths: CUTE_MOUTHS,
  stateMouth: { ...STATE_CUTE_MOUTH, ...BARE },
  mouthPaint: 'feature',
  quietFx: [],
  kaomoji: {
    eyes: {
      open: '•',
      wide: '°',
      small: '˙',
      half: '-',
      look: '•',
      smile: '^',
      closed: '－',
      mad: ['•̀', '•́'],
      sad: ['•́', '•̀'],
      cross: ['＞', '＜'],
      star: '★',
    },
    mouths: {
      none: '◡',
      smile: '◡',
      cat: 'ω',
      grin: 'ᗜ',
      laugh: '▽',
      flat: '▭',
      frown: '︵',
      o: 'O',
      dot: 'o',
      wavy: '〰',
      smirk: '◡',
      pout: 'з',
    },
  },
  eye,
  inMouth,
};
