/**
 * Belt glyphs: the two small objects a belt can hand the character.
 *
 * Everything else a belt draws is a circle or an arc, which the renderer can
 * emit directly. A pencil and an exclamation mark are the two cases where the
 * meaning lives in the outline, so they are built here — procedurally, from
 * `PathBuilder`, never as a baked path string — and shared by the live
 * renderer and the static one so a frozen character shows the same object as
 * a running one.
 *
 * Both are drawn centred on the origin and upright, with `size` as the total
 * height. Position, rotation and scale come from the belt frame, so a glyph
 * can be rebuilt once per size rather than once per frame.
 */
import { PathBuilder } from '../math/path-builder.js';

/**
 * A pencil, pointing down.
 *
 * Three parts in two subpaths: the eraser cap floats above a gap, and the
 * barrel runs into the tip as one closed outline. The gap is what makes the
 * cap read as a separate part at sixteen pixels — an inner line would need a
 * second colour, and this set has one ink.
 */
export function pencilGlyphPath(size: number): string {
  const half = size / 2;
  const width = size * 0.27;
  const halfWidth = width / 2;
  const cap = size * 0.15;
  const gap = size * 0.06;
  const tip = size * 0.24;
  // Barrel corners stay well under half the width so the shoulders read as
  // soft rather than as a capsule.
  const round = width * 0.32;

  const b = new PathBuilder();

  // Eraser cap: a short rounded block above the barrel.
  b.moveTo(-halfWidth + round, -half);
  b.lineTo(halfWidth - round, -half);
  b.quadTo(halfWidth, -half, halfWidth, -half + round);
  b.lineTo(halfWidth, -half + cap);
  b.lineTo(-halfWidth, -half + cap);
  b.lineTo(-halfWidth, -half + round);
  b.quadTo(-halfWidth, -half, -halfWidth + round, -half);
  b.close();

  // Barrel and tip.
  const barrelTop = -half + cap + gap;
  const shoulder = half - tip;
  b.moveTo(-halfWidth, barrelTop);
  b.lineTo(halfWidth, barrelTop);
  b.lineTo(halfWidth, shoulder);
  b.lineTo(0, half);
  b.lineTo(-halfWidth, shoulder);
  b.close();

  return b.toString();
}

/**
 * An exclamation mark: a tapered capsule over a round dot.
 *
 * The taper is what separates it from a plain bar — a constant-width stroke
 * with a dot under it reads as a lower-case "i".
 */
export function bangGlyphPath(size: number): string {
  const half = size / 2;
  const top = size * 0.2;
  const waist = size * 0.13;
  const dot = size * 0.11;
  const gap = size * 0.12;

  const stemBottom = half - dot * 2 - gap;

  const b = new PathBuilder();

  // Stem: wide at the crown, narrowing towards the foot, capped round.
  b.moveTo(-top / 2, -half + top / 2);
  b.arcTo(0, -half + top / 2, top / 2, Math.PI, Math.PI * 2);
  b.lineTo(waist / 2, stemBottom);
  b.arcTo(0, stemBottom, waist / 2, 0, Math.PI);
  b.close();

  // Dot.
  b.moveTo(dot, half - dot);
  b.arcTo(0, half - dot, dot, 0, Math.PI * 2);
  b.close();

  return b.toString();
}
