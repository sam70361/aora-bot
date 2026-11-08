/**
 * What the built-in drawn faces are built with, lent to a face defined
 * outside the core (`defineFace`): the eye geometry, the reading of the cute
 * expressions into a design's own numbers, and the shared tables a design
 * names rather than copies.
 */
import { CUTE_MOUTHS } from '../features.js';
import { STATE_CUTE_EYES, STATE_CUTE_MOUTH } from '../../motion/states.js';
import {
  arcPoints,
  bandRing,
  circleRing,
  convexBand,
  dashes,
  dropRing,
  ellipseBand,
  ellipseRing,
  heartRing,
  lidBand,
  meet,
  place,
  quad,
  ribbon,
  roundedRectBand,
  sparkleRing,
  starRing,
} from './geometry.js';
import { CUTE_MOUTH_GLYPHS } from './glyphs.js';
import {
  clockOf,
  fallingTear,
  LayerList,
  looking,
  noise,
  pulse,
  readCuteEye,
  shutness,
  smooth,
  unit,
  vocabulary,
} from './reading.js';

export const FACE_KIT = {
  // Outlines, in dot radii about the eye's centre.
  circleRing,
  ellipseRing,
  starRing,
  sparkleRing,
  dropRing,
  heartRing,
  arcPoints,
  quad,
  ribbon,
  place,
  dashes,
  // Regions met and traced: a white cut by a lid, an iris inside a white.
  ellipseBand,
  lidBand,
  roundedRectBand,
  convexBand,
  meet,
  bandRing,
  // Reading the cute expressions, and time.
  vocabulary,
  readCuteEye,
  looking,
  LayerList,
  fallingTear,
  shutness,
  clockOf,
  unit,
  smooth,
  pulse,
  noise,
  // The cute face's tables, to name rather than copy.
  STATE_CUTE_EYES,
  STATE_CUTE_MOUTH,
  CUTE_MOUTHS,
  CUTE_MOUTH_GLYPHS,
} as const;

export type FaceKit = typeof FACE_KIT;
