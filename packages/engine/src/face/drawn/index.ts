/**
 * The drawn faces, by id.
 */
import {
  FACE_STYLES,
  markDefinedFace,
  type CuteMouthId,
  type DrawnFaceStyle,
  type MouthSpec,
} from '../../core/types.js';
import { lerp } from '../../math/easing.js';
import type { CharacterState } from '../../motion/states.js';
import { cuteNameFor } from '../topologies.js';
import { BIGMOUTH } from './designs/bigmouth.js';
import { BROW } from './designs/brow.js';
import { BUTTON } from './designs/button.js';
import { CAPSULE } from './designs/capsule.js';
import { DROOPY } from './designs/droopy.js';
import { GLOSSY } from './designs/glossy.js';
import { PIE } from './designs/pie.js';
import { SCREEN } from './designs/screen.js';
import { SHADES } from './designs/shades.js';
import { SPARKLE } from './designs/sparkle.js';
import { SPECS } from './designs/specs.js';
import { SYMBOL } from './designs/symbol.js';
import { TEARDROP } from './designs/teardrop.js';
import {
  CUTE_EYE_CLASSES,
  type AnyFaceDesign,
  type DrawnEye,
  type DrawnPair,
  type EyeClass,
  type Glyph,
} from './types.js';

export const FACE_DESIGNS: Record<DrawnFaceStyle, AnyFaceDesign> = {
  brow: BROW,
  glossy: GLOSSY,
  sparkle: SPARKLE,
  button: BUTTON,
  shades: SHADES,
  droopy: DROOPY,
  bigmouth: BIGMOUTH,
  pie: PIE,
  screen: SCREEN,
  symbol: SYMBOL,
  capsule: CAPSULE,
  teardrop: TEARDROP,
  specs: SPECS,
};

/** Faces a host or a theme defined, by id. */
const DEFINED = new Map<string, AnyFaceDesign>();
/** Their names, for a picker or a menu. */
const DEFINED_LABELS = new Map<string, { en: string; zh: string }>();

/** A drawn face's design: a built-in one, or one defined with `defineFace`. */
export const getFaceDesign = (id: DrawnFaceStyle): AnyFaceDesign =>
  (FACE_DESIGNS as Partial<Record<string, AnyFaceDesign>>)[id] ?? DEFINED.get(id)!;

/**
 * Define a drawn face under `design.id`, or replace one defined before: a
 * complete face of the cute family, with its own eyes, expressions, mouths
 * and text glyphs (`FaceDesign`), drawn by every series. It is then accepted
 * as `face: id` everywhere a face is.
 *
 * Its fit to each body is worked out the first time the pair is drawn, from
 * the extent of the design over all its states, so it keeps to narrow bodies
 * and under hair as the built-in faces do. The built-in faces, `cute`,
 * `eyes` and `line` cannot be replaced.
 */
export function defineFace(
  design: AnyFaceDesign,
  options: { label?: { en: string; zh: string } } = {},
): void {
  const { id } = design;
  if ((FACE_STYLES as readonly string[]).includes(id)) throw new Error(`"${id}" is a built-in face`);
  DEFINED.set(id, design);
  if (options.label) DEFINED_LABELS.set(id, options.label);
  else DEFINED_LABELS.delete(id);
  markDefinedFace(id);
}

/** The faces defined with `defineFace`, in the order they were defined. */
export const definedFaces = (): readonly string[] => [...DEFINED.keys()];

/** A defined face's name, or `null` for a face with none (or a built-in one, which the locale names). */
export const definedFaceLabel = (id: string): { en: string; zh: string } | null =>
  DEFINED_LABELS.get(id) ?? null;

const expressionsOf = (design: AnyFaceDesign): Record<string, DrawnPair> => design.expressions;

/**
 * The pair an expression name means on a design: its own name, or the cute
 * name nearest a line-face one, or the design's resting eye.
 */
export function drawnPairFor(design: AnyFaceDesign, name: string): DrawnPair {
  const table = expressionsOf(design);
  return table[name] ?? table[cuteNameFor(name)] ?? table.dot!;
}

/** The expression a state shows at step `index` of its cycle on a design. */
export function drawnPairForState(design: AnyFaceDesign, state: CharacterState, index: number): DrawnPair {
  const list = design.states[state] ?? ['dot'];
  return drawnPairFor(design, list[index % list.length] ?? 'dot');
}

/** The mouth a state wears on a design, or a pinned one by name when the design has it. */
export function drawnMouthFor(design: AnyFaceDesign, state: CharacterState, pinned?: string): MouthSpec {
  const own = pinned ? (design.mouths as Record<string, MouthSpec>)[pinned] : undefined;
  return own ?? design.mouths[design.stateMouth[state] as CuteMouthId];
}

function morphEye(a: DrawnEye, b: DrawnEye, t: number): DrawnEye {
  const out: Record<string, number> = {};
  for (const key of Object.keys(b)) out[key] = lerp(a[key] ?? b[key]!, b[key]!, t);
  return out;
}

/** Blend two pairs of the same design. Every field is independent, so the result is always a valid eye. */
export function morphDrawnPair(a: DrawnPair, b: DrawnPair, t: number): DrawnPair {
  return [morphEye(a[0], b[0], t), morphEye(a[1], b[1], t)];
}

/** What kind each eye of an expression is, for text. */
export function eyeClassesFor(design: AnyFaceDesign, name: string): readonly [EyeClass, EyeClass] {
  const own = (design.classes as Record<string, readonly [EyeClass, EyeClass]>)[name];
  return own ?? CUTE_EYE_CLASSES[cuteNameFor(name)] ?? CUTE_EYE_CLASSES.dot;
}

const glyphFor = (glyph: Glyph, side: 0 | 1): string => (typeof glyph === 'string' ? glyph : glyph[side]);

/**
 * A drawn face in text for a state: the eyes of the state's first
 * expression, each written as its kind of eye (or the design's own glyph
 * for an expression that has one), either side of the state's mouth.
 */
export function drawnFaceText(design: AnyFaceDesign, state: CharacterState): string {
  const name = design.states[state]?.[0] ?? 'dot';
  const { eyes, special, mouths } = design.kaomoji;
  const own = (special as Partial<Record<string, Glyph>> | undefined)?.[name];
  const [left, right] = eyeClassesFor(design, name);
  const mouth = mouths[design.stateMouth[state] as CuteMouthId];
  return `${glyphFor(own ?? eyes[left], 0)}${mouth}${glyphFor(own ?? eyes[right], 1)}`;
}

export type {
  AnyFaceDesign,
  DrawnEye,
  DrawnPair,
  EyeClass,
  FaceDesign,
  FaceLayer,
  FacePaint,
  FaceAccent,
  Rgb,
} from './types.js';
export { CUTE_EYE_CLASSES, EYE_CLASSES, FACE_ACCENTS, FACE_PAINTS, isFaceAccent } from './types.js';
export type { DrawnFaceGeometry, DrawnShape, DrawnInput, DrawnEntry } from './place.js';
