/**
 * `brow`: big white eyes with pupils under bold brows.
 *
 * The brows carry the mood. They stay apart in every state — `browIn` is how
 * far each inner tip stops short of the midline — and only anger pulls them
 * past it into one V. A brow also presses the upper lid down where it sits
 * low, so a frown narrows the eye without a lid of its own.
 *
 * The eye is drawn in eye units, where the white is 1 wide and `TALL` high,
 * and grown by `SIZE` into dot radii; layout numbers are dot radii.
 */
import { CUTE_MOUTHS } from '../../features.js';
import { STATE_CUTE_EYES, STATE_CUTE_MOUTH } from '../../../motion/states.js';
import type { Point } from '../../../core/types.js';
import { bandRing, ellipseBand, lidBand, meet, place, quad, ribbon, starRing } from '../geometry.js';
import { CUTE_MOUTH_GLYPHS } from '../glyphs.js';
import { LayerList, shutness, unit, vocabulary } from '../reading.js';
import type { DrawnEye, EyeContext, FaceDesign, FaceLayer } from '../types.js';

/** The white's half-width, in dot radii. */
const SIZE = 2.2;
/** The white's height over its width. */
const TALL = 1.12;
const SEPARATION = 5.8;
const LIFT = 0.45;
/** Clear space between the bottom of the whites and the mouth, in dot radii. */
const MOUTH_GAP = 1.5;
/** Thickness of a brow at its widest, in eye units. */
const BROW_WEIGHT = 0.5;
/** Where a brow starts, outside the white, in eye units. */
const BROW_OUTER = -1.28;
/** Where both lids meet when the eye shuts. */
const SHUT = 0.8;
/** Gap between the lids, at the middle, below which the eye reads as shut and its lash shows. */
const SHUT_GAP = 0.3;
/** Share of the gaze the pupils follow, beyond what moves the whole eye. */
const PUPIL_GAZE = 0.5;

type Field =
  | 'browY'
  | 'browA'
  | 'browT'
  | 'browIn'
  | 'lidY'
  | 'lidA'
  | 'lowY'
  | 'lowK'
  | 'px'
  | 'py'
  | 'pr'
  | 'sc'
  | 'cross'
  | 'star';

const REST: DrawnEye<Field> = {
  browY: -1.2,
  browA: 0.08,
  browT: 1,
  browIn: 0.9,
  lidY: -1.4,
  lidA: 0,
  lowY: 1.4,
  lowK: 0,
  px: 0,
  py: 0,
  pr: 0.42,
  sc: 1,
  cross: 0,
  star: 0,
};

const EXPRESSIONS = vocabulary<Field>(REST, (read) => {
  switch (read.kind) {
    case 'open': {
      const wide = read.size > 1.2;
      const browA = wide ? -0.1 : REST.browA;
      return {
        ...(wide ? { browY: -1.52, browA, sc: 1.08, pr: 0.3 } : null),
        ...(read.size < 0.8 ? { pr: 0.22 } : null),
        lidY: -1.4 + (1 - read.open) * 2.3,
        lidA: browA * 0.4,
        lowY: 1.4 - (1 - read.open) * 0.4,
        px: read.off[0] * 0.4,
        py: read.off[1] * 0.4,
      };
    }
    case 'smile':
      return { browY: -1.36, browA: -0.1, lowY: 0.25, lowK: 0.55, px: read.off[0] * 0.3, py: -0.35 };
    case 'closed':
      return { browY: -1.05, browA: -0.04, lidY: 0.78, lowY: 0.78 };
    case 'mad':
      return {
        browY: -0.72,
        browA: 0.52,
        browT: 1.2,
        browIn: -0.2,
        lidY: -0.42,
        lidA: 0.5,
        pr: 0.36,
        px: 0.22,
        py: 0.18,
      };
    case 'sad':
      return { browY: -1.28, browA: -0.45, lidY: -0.62, lidA: -0.42, py: 0.28 };
    case 'cross':
      return { browY: -1.35, browA: -0.18, cross: 1 };
    case 'star':
      return { browY: -1.42, browA: -0.12, star: 1, pr: 0.58 };
  }
});

/**
 * The brow's inner tip, in eye units: the midline, `mid` dot radii from the
 * eye's centre, less the brow's own gap. Measured from where the midline
 * really is, so brows on eyes brought closer together still keep apart.
 */
const browInner = (s: DrawnEye<Field>, mid: number): number => (mid - s.browIn) / SIZE;

const along = (x: number, x0: number, x1: number): number => unit((x - x0) / (x1 - x0));

/** Half the brow's thickness at x, for a brow ending at `tip`: it swells towards the nose and tapers to round tips. */
function browHalf(x: number, s: DrawnEye<Field>, tip: number): number {
  const u = along(x, BROW_OUTER, tip);
  const outer = Math.sqrt(Math.min(1, u / 0.3));
  const inner = Math.sqrt(Math.min(1, (1 - u) / 0.12));
  return (BROW_WEIGHT * s.browT * (0.45 + 0.55 * u) * outer * inner) / 2;
}

/** The brow's centreline: a straight slope with a slight arch. */
const browLine = (x: number, s: DrawnEye<Field>, tip: number): number =>
  s.browY + x * Math.tan(s.browA) - 0.14 * Math.sin(Math.PI * along(x, BROW_OUTER, tip));

function eye(spec: DrawnEye<Field>, ctx: EyeContext): FaceLayer[] {
  // A blink brings both lids to where they meet when the eye shuts.
  const b = unit(ctx.blink);
  const s = { ...spec, lidY: SHUT + (spec.lidY - SHUT) * b, lowY: SHUT + (spec.lowY - SHUT) * b };
  const x1 = browInner(s, ctx.mid);
  const upper = (x: number): number =>
    Math.max(browLine(x, s, x1) + browHalf(x, s, x1) * 0.9, s.lidY + x * Math.tan(s.lidA));
  const lower = (x: number): number => s.lowY - s.lowK * (1 - x * x);
  const white = meet(ellipseBand(0, 0, s.sc, TALL * s.sc), lidBand(upper, lower));
  const shut = shutness(lower(0) - upper(0), SHUT_GAP);

  const lim = Math.max(0, s.sc - s.pr - 0.1);
  const gx = s.px + (ctx.look[0] * PUPIL_GAZE) / SIZE;
  const gy = s.py + (ctx.look[1] * PUPIL_GAZE) / SIZE;
  const len = Math.hypot(gx, gy);
  const k = len > lim ? lim / len : 1;
  const px = gx * k;
  const py = gy * k;
  const mark = unit(s.cross + s.star);
  const pr = s.pr * (1 - mark);

  const out = new LayerList();
  const grow = (ring: Point[] | null): Point[] | null => ring && place(ring, 0, 0, SIZE);
  const whiteRing = bandRing(white);
  out.add('face', [grow(whiteRing)], 1, { plate: true });
  out.add('pupil', [grow(bandRing(meet(white, ellipseBand(px, py, pr, pr))))]);
  out.add(
    'face',
    [grow(bandRing(meet(white, ellipseBand(px - pr * 0.32, py - pr * 0.36, pr * 0.3, pr * 0.3))))],
    1,
    {
      detail: true,
    },
  );
  const r = 0.42;
  const markWeight = 0.1 * ctx.weight;
  out.add(
    'pupil',
    [
      grow(
        ribbon(
          [
            [-r, -r],
            [r, r],
          ],
          markWeight,
        ),
      ),
      grow(
        ribbon(
          [
            [r, -r],
            [-r, r],
          ],
          markWeight,
        ),
      ),
    ],
    s.cross,
  );
  const star = starRing(s.pr, 0.42, 4);
  out.add('gold', [grow(star)], s.star);
  out.add('pupil', [grow(ribbon(star, 0.04 * ctx.weight, true))], s.star);
  if (whiteRing)
    out.add('pupil', [grow(ribbon(whiteRing, 0.035 * ctx.weight, true))], 0.55 * (1 - shut), {
      detail: true,
    });

  const ly = (s.lidY + s.lowY) / 2;
  out.add(
    'feature',
    [grow(ribbon(quad([-0.95, ly - 0.12], [0, ly + 0.3], [0.95, ly - 0.12]), 0.08 * ctx.weight))],
    shut,
  );

  const xs = Array.from({ length: 21 }, (_, i) => BROW_OUTER + ((x1 - BROW_OUTER) * i) / 20);
  const top = xs.map((x) => [x, browLine(x, s, x1) - browHalf(x, s, x1)] as Point);
  const bottom = xs.map((x) => [x, browLine(x, s, x1) + browHalf(x, s, x1)] as Point);
  bottom.reverse();
  out.add('feature', [grow(top.concat(bottom))]);
  return out.layers;
}

export const BROW: FaceDesign<Field> = {
  id: 'brow',
  layout: {
    lift: LIFT,
    separation: SEPARATION,
    minSeparation: 5,
    mouthDrop: SIZE * TALL - LIFT + MOUTH_GAP,
    mouthScale: 1,
    mouthWeight: 1,
    blush: { x: 4.6, y: 2.75 },
    gazeShift: 0.5,
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
      open: 'ō',
      wide: 'Ō',
      small: '°',
      half: '¬',
      look: 'ō',
      smile: 'ᵔ',
      closed: '－',
      mad: ['ò', 'ó'],
      sad: ['ó', 'ò'],
      cross: ['＞', '＜'],
      star: '★',
    },
    mouths: CUTE_MOUTH_GLYPHS,
  },
  eye,
};
