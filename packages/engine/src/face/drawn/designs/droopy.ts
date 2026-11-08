/**
 * `droopy`: eyes that are always half open.
 *
 * The upper lid is a flat cut across the white, the pupils sit low and there
 * are bags beneath: nothing is worth the effort. The mood is in small
 * changes — a slanting lid for anger, a drooping one for sorrow — and in the
 * one moment the face wakes up: startled, the lids fly open and the pupils
 * shrink to pinpricks. Frightened, a drop of sweat runs down one side.
 */
import { STATE_CUTE_EYES, STATE_CUTE_MOUTH } from '../../../motion/states.js';
import { lerp } from '../../../math/easing.js';
import { CUTE_MOUTHS } from '../../features.js';
import { CUTE_MOUTH_GLYPHS } from '../glyphs.js';
import { blinkLids, LID_REST, lidEye, type LidEyeConfig, type LidField } from '../lid-eye.js';
import { fright, startle, vocabulary } from '../reading.js';
import type { DrawnPair, FaceDesign } from '../types.js';

const EYE: LidEyeConfig = {
  rx: 1.45,
  tall: 1,
  rim: 0.11,
  lid: 0.3,
  lash: 0.26,
  cross: 0.24,
  shut: 0.55,
  bag: true,
};
/** Where the upper lid rests: just above the middle of the white. */
const REST_LID = -0.05;
const LIFT = 0.2;
const SEPARATION = 5.6;
const MOUTH_GAP = 1.1;

const forms = vocabulary<LidField>({ ...LID_REST, pr: 0.68, py: 0.4, bag: 1 }, (read) => {
  switch (read.kind) {
    case 'open': {
      const w = startle(read.size);
      const f = fright(read.size);
      const x = Math.max(w, f);
      return {
        sc: 1 + 0.12 * w - 0.1 * f,
        pr: lerp(0.68, 0.3, x),
        py: lerp(0.4 + read.off[1] * 0.4, 0.05, x),
        px: read.off[0] * 0.5 * (1 - x),
        bag: 1 - w,
        sweat: f,
        ...blinkLids(read.open, lerp(lerp(REST_LID, -0.2, f), -1.1, w), EYE.shut),
      };
    }
    case 'smile':
      return { lidY: 0.12, lowY: 0.7, lowK: -0.4, py: -0.15, pr: 0.58, px: read.off[0] * 0.3, bag: 1.4 };
    case 'closed':
      return { lidY: EYE.shut, lowY: EYE.shut };
    case 'mad':
      return { lidY: -0.4, lidA: 0.62, pr: 0.6, px: 0.28, py: 0.3 };
    case 'sad':
      return { lidY: -0.1, lidA: -0.55, pr: 0.68, py: 0.6, bag: 1.4 };
    case 'cross':
      return { lidY: -0.85, sc: 1.05, cross: 1, markR: 0.6, bag: 0.4 };
    case 'star':
      return { lidY: -0.9, sc: 1.05, star: 1, markR: 0.9, bag: 0.4 };
  }
});

/** The sweat of a frightened eye runs down one side of the face only. */
const oneSided = ([left, right]: DrawnPair<LidField>): DrawnPair<LidField> => [{ ...left, sweat: 0 }, right];

export const DROOPY: FaceDesign<LidField> = {
  id: 'droopy',
  layout: {
    lift: LIFT,
    separation: SEPARATION,
    minSeparation: 3.6,
    mouthDrop: EYE.rx * 1.1 + 0.3 - LIFT + MOUTH_GAP,
    mouthScale: 1,
    mouthWeight: 1,
    blush: { x: 4.5, y: 1.95 },
    gazeShift: 0.4,
  },
  expressions: { ...forms, dotSmall: oneSided(forms.dotSmall) },
  classes: {},
  states: STATE_CUTE_EYES,
  mouths: CUTE_MOUTHS,
  stateMouth: STATE_CUTE_MOUTH,
  mouthPaint: 'feature',
  quietFx: [],
  kaomoji: {
    eyes: {
      open: '◒',
      wide: '◉',
      small: '◦',
      half: '◒',
      look: '◒',
      smile: '◡',
      closed: '－',
      mad: ['◣', '◢'],
      sad: ['◞', '◟'],
      cross: ['＞', '＜'],
      star: '✦',
    },
    mouths: CUTE_MOUTH_GLYPHS,
  },
  eye: lidEye(EYE),
};
