/**
 * `glossy`: big wet eyes.
 *
 * Each eye is one dark, shining surface painted straight onto the body, with
 * two or three large highlights and a line of light along the bottom. Wide
 * eyes shine brighter; sad ones brim over and a tear slides down. A smile is
 * an arc with a sparkle, a shut eye a lash line.
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
} from '../geometry.js';
import { CUTE_MOUTH_GLYPHS } from '../glyphs.js';
import { fallingTear, LayerList, looking, spread, unit, vocabulary } from '../reading.js';
import type { DrawnEye, EyeContext, FaceDesign, FaceLayer } from '../types.js';

/** The eye's half-size, in dot radii. */
const RX = 2.3;
const RY = 2.5;
const LIFT = 0.5;
const SEPARATION = 5.8;
const MOUTH_GAP = 0.9;
/** How far the eye's offset may carry it inside its opening. */
const LOOK = { k: 0.5, limit: 0.5 } as const;
/** Share of the gaze the shining surface follows. */
const SURFACE_GAZE = 0.3;
/** Below this openness the eye reads as shut and its lash shows. */
const SHUT_FROM = 0.4;
const SHUT_SPAN = 0.3;

type Field =
  'open' | 'sc' | 'px' | 'py' | 'tilt' | 'glow' | 'shine' | 'arc' | 'x' | 'star' | 'brow' | 'browA' | 'tear';

const REST: DrawnEye<Field> = {
  open: 1,
  sc: 1,
  px: 0,
  py: 0,
  tilt: 0,
  glow: 1,
  shine: 0.4,
  arc: 0,
  x: 0,
  star: 0,
  brow: 0,
  browA: 0,
  tear: 0,
};

const EXPRESSIONS = vocabulary<Field>(REST, (read) => {
  const [gx, gy] = looking(read.off, LOOK.k, LOOK.limit);
  switch (read.kind) {
    case 'open':
      return {
        open: read.open,
        sc: Math.min(1.1, Math.max(0.78, 0.55 + 0.45 * read.size)),
        glow: read.size > 1.2 ? 1.12 : read.size < 0.8 ? 0.8 : 1,
        px: gx,
        py: gy,
      };
    case 'smile':
      return { arc: 1, px: gx * 0.4, py: gy * 0.4 - 0.1 };
    case 'closed':
      return { open: 0 };
    case 'mad':
      return { open: 0.78, tilt: 0.5, glow: 0.75, shine: 0.2, brow: 1, browA: 0.42, py: 0.1 };
    case 'sad':
      return { open: 0.88, tilt: -0.3, glow: 1.2, shine: 1, brow: 1, browA: -0.42, tear: 1, py: 0.12 };
    case 'cross':
      return { x: 1 };
    case 'star':
      return { star: 1 };
  }
});

function eye(s: DrawnEye<Field>, ctx: EyeContext): FaceLayer[] {
  const w = ctx.weight;
  const open = s.open * unit(ctx.blink);
  const lid = -RY + (1 - open) * 2 * RY;
  const sag = 0.35 * (1 - open) ** 2;
  const top = (x: number): number => lid + s.tilt * x + sag * (1 - (x / RX) ** 2);
  const opening = meet(
    ellipseBand(0, 0, RX, RY),
    lidBand(top, () => Infinity),
  );
  const px = s.px + ctx.look[0] * SURFACE_GAZE;
  const py = s.py + ctx.look[1] * SURFACE_GAZE;
  const surface = meet(opening, ellipseBand(px, py, RX * s.sc, RY * s.sc));
  const shown = 1 - unit(Math.max(s.arc, s.x));
  const shut = unit((SHUT_FROM - open) / SHUT_SPAN);

  const out = new LayerList();
  out.add('feature', [bandRing(surface)], shown);
  // A line of light along the bottom of the surface, just inside its edge.
  const a = Math.PI * 0.36;
  const shine = spread(a, Math.PI - a, 12).map(
    (t) => [px + Math.cos(t) * RX * 0.88 * s.sc, py + Math.sin(t) * RY * 0.88 * s.sc] as Point,
  );
  out.add('glint', [ribbon(shine, 0.08 * w)], s.shine * shown * unit(open * 2), { detail: true });
  // The highlights sit a little against the gaze, as a reflection does.
  const lx = px - s.px * 0.25;
  const ly = py - s.py * 0.25;
  const light = (cx: number, cy: number, r: number): Point[] | null =>
    bandRing(meet(surface, ellipseBand(lx + cx * s.glow, ly + cy * s.glow, r * s.glow, r * s.glow)));
  out.add('glint', [light(-0.8, -0.95, 0.8)], shown);
  out.add('glint', [light(0.88, 0.72, 0.38), light(1.3, -0.3, 0.2)], shown, { detail: true });
  out.add('gold', [place(starRing(1.15, 0.46), px, py, s.sc)], s.star);

  const dx = s.px * 0.6;
  const dy = s.py * 0.6;
  const lash = [
    ribbon(place(quad([-1.5, -0.3], [0, 1.05], [1.5, -0.3]), dx, dy), 0.25 * w),
    ribbon(
      place(
        [
          [-1.5, -0.3],
          [-2, -0.85],
        ],
        dx,
        dy,
      ),
      0.25 * w,
    ),
    ribbon(
      place(
        [
          [-0.9, 0.4],
          [-1.15, 1.05],
        ],
        dx,
        dy,
      ),
      0.25 * w,
    ),
  ];
  out.add('feature', lash, shut * (1 - s.arc) * (1 - s.x));
  out.add('feature', [ribbon(place(quad([-1.55, 0.65], [0, -1.55], [1.55, 0.65]), dx, dy), 0.25 * w)], s.arc);
  out.add('glint', [place(sparkleRing(0.62), -1.35 + dx, -1.55 + dy)], s.arc);
  out.add(
    'feature',
    [
      ribbon(
        place(
          [
            [-1.05, -1.05],
            [1.05, 1.05],
          ],
          dx,
          dy,
        ),
        0.275 * w,
      ),
      ribbon(
        place(
          [
            [1.05, -1.05],
            [-1.05, 1.05],
          ],
          dx,
          dy,
        ),
        0.275 * w,
      ),
    ],
    s.x,
  );

  const by = -RY * s.sc - 0.7;
  const rise = Math.tan(s.browA) * 0.85;
  out.add(
    'feature',
    [
      ribbon(
        [
          [-0.85, by - rise],
          [0.85, by + rise],
        ],
        0.2 * w,
      ),
    ],
    s.brow,
  );
  fallingTear(out, ctx, s.tear, -1.05, 1.5, 3.7);
  return out.layers;
}

export const GLOSSY: FaceDesign<Field> = {
  id: 'glossy',
  layout: {
    lift: LIFT,
    separation: SEPARATION,
    minSeparation: 5.2,
    mouthDrop: RY - LIFT + MOUTH_GAP,
    mouthScale: 1,
    mouthWeight: 1,
    blush: { x: 4.75, y: 2.55 },
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
      open: '◕',
      wide: '◉',
      small: '•',
      half: '◔',
      look: '◕',
      smile: 'ᵔ',
      closed: '－',
      mad: ['ò', 'ó'],
      sad: '╥',
      cross: ['＞', '＜'],
      star: '✧',
    },
    mouths: CUTE_MOUTH_GLYPHS,
  },
  eye,
};
