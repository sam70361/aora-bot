/**
 * Drawn faces in text.
 *
 * A drawn face writes `left eye + mouth + right eye`, each from its own
 * table: the eye from the kind of eye the state's first expression is, the
 * mouth from the state's mouth. Most faces share the cute mouths' glyphs
 * below and say so; the eyes are always the face's own.
 */
import type { CuteMouthId } from '../../core/types.js';

/** One glyph per cute mouth. `none` is a narrow space, so the eyes stay apart. */
export const CUTE_MOUTH_GLYPHS: Record<CuteMouthId, string> = {
  none: ' ',
  smile: 'ᴗ',
  cat: 'ω',
  grin: '▽',
  laugh: 'ᗜ',
  flat: '_',
  frown: '︿',
  o: 'o',
  dot: '.',
  wavy: '﹏',
  smirk: '‿',
  pout: 'ε',
};
