/**
 * `pie`: the pie-cut eyes of old rubber-hose cartoons.
 *
 * Tall white ovals in a heavy outline, with black pupils that have a wedge
 * cut out of them for their shine. A slanting lid is anger, a drooping one
 * sorrow; a smile pushes the lower lid up; a shut eye is a lash line with
 * three lashes; the x and the star are drawn with the same heavy line.
 */
import { lerp } from '../../../math/easing.js';
import { STATE_CUTE_EYES, STATE_CUTE_MOUTH } from '../../../motion/states.js';
import { CUTE_MOUTHS } from '../../features.js';
import { CUTE_MOUTH_GLYPHS } from '../glyphs.js';
import { blinkLids, LID_NONE, LID_REST, lidEye, type LidEyeConfig, type LidField } from '../lid-eye.js';
import { fright, startle, vocabulary } from '../reading.js';
import type { FaceDesign } from '../types.js';

const EYE: LidEyeConfig = {
  rx: 1.25,
  tall: 1.38,
  rim: 0.22,
  lid: 0.26,
  lash: 0.22,
  cross: 0.3,
  shut: 0.35,
  wedge: true,
  ticks: true,
  outlined: true,
};
const LIFT = 0.55;
const SEPARATION = 5;
const MOUTH_GAP = 0.9;

export const PIE: FaceDesign<LidField> = {
  id: 'pie',
  layout: {
    lift: LIFT,
    separation: SEPARATION,
    minSeparation: 3.2,
    mouthDrop: EYE.rx * EYE.tall * 1.1 + 0.15 - LIFT + MOUTH_GAP,
    mouthScale: 1,
    mouthWeight: 1,
    blush: { x: 4.1, y: 1.9 },
    gazeShift: 0.4,
  },
  expressions: vocabulary<LidField>({ ...LID_REST, pr: 0.74, pt: 1.36, py: 0.3 }, (read) => {
    switch (read.kind) {
      case 'open': {
        const w = startle(read.size);
        const f = fright(read.size);
        const x = Math.max(w, f);
        return {
          sc: 1 + 0.1 * w - 0.1 * f,
          pr: lerp(0.74, 0.46, x),
          py: lerp(0.3 + read.off[1] * 0.4, 0.05, x),
          px: read.off[0] * 0.4 * (1 - x),
          lidA: -0.12 * f,
          ...blinkLids(read.open, lerp(-LID_NONE, -1.1, f), EYE.shut),
        };
      }
      case 'smile':
        return { lowY: 0.55, lowK: 0.3, py: -0.15 };
      case 'closed':
        return { lidY: EYE.shut, lowY: EYE.shut };
      case 'mad':
        return { lidY: -0.6, lidA: 0.78, px: 0.2, py: 0.35 };
      case 'sad':
        return { lidY: -0.5, lidA: -0.7, py: 0.55 };
      case 'cross':
        return { cross: 1, markR: 0.6 };
      case 'star':
        return { star: 1, markR: 1 };
    }
  }),
  classes: {},
  states: STATE_CUTE_EYES,
  mouths: CUTE_MOUTHS,
  stateMouth: STATE_CUTE_MOUTH,
  mouthPaint: 'feature',
  quietFx: [],
  kaomoji: {
    eyes: {
      open: '◔',
      wide: 'O',
      small: '◦',
      half: '◓',
      look: '◔',
      smile: '◠',
      closed: '－',
      mad: ['◣', '◢'],
      sad: ['◥', '◤'],
      cross: ['＞', '＜'],
      star: '★',
    },
    mouths: CUTE_MOUTH_GLYPHS,
  },
  eye: lidEye(EYE),
};
