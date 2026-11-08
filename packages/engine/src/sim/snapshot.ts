import type { InkPaint, StyleVariant } from '../core/options.js';
import type { FaceStyle, PartColor, PartMotionRef, PartTone, Ring, ShapeId } from '../core/types.js';
import type { FaceGeometry } from '../face/placement.js';
import type { HudPrimitives } from '../hud/dials.js';
import type { BeltDot, BeltGlyph } from '../motion/belts.js';
import type { FxFrame } from '../motion/fx.js';
import type { CharacterState } from '../motion/states.js';
import type { TrailPoint } from '../particles.js';

/**
 * One frame of a character, as data.
 *
 * Everything a renderer needs and nothing it has to compute: geometry is
 * points in shape space plus transform parameters, colours are descriptions
 * (`ink`, token names) rather than resolved values, and no field holds an SVG
 * path or transform string. A renderer may draw it as smooth vectors, snap it
 * to a grid, or hand it to a canvas; the simulation does not know which.
 *
 * Arrays and the shape outline are shared with the simulation where that is
 * safe (`body.outline` is the registry's own array when the body is a plain
 * shape), so a snapshot is a read-only view — a renderer must not mutate it.
 */
export interface FrameSnapshot {
  state: CharacterState;
  shape: ShapeId;
  /** Optical scale applied to the whole figure about the centre of shape space. */
  shapeScale: number;
  /** Seconds of simulated time. */
  time: number;
  /**
   * Whether nothing may move: reduced motion, or a still character (static
   * output). A renderer that animates something of its own (a theme's mood
   * decorations, its parts' motions) draws its rest pose. Absent is `false`.
   */
  settled?: boolean;
  /** Paint variant, interpreted by the style (`solid` / `outline` / `glass` for `vector`). */
  variant: StyleVariant;
  /** Body paint override; `null` means the theme's foreground token. */
  ink: InkPaint | null;
  body: BodyFrame;
  face: FaceFrame;
  /** The belt overlay, or `null` while the body is a body. */
  belt: BeltSnapshot | null;
  /** The cute face's mood effect, or `null` when the state has none. */
  fx: FxFrame | null;
  hud: HudSnapshot;
  /** Corner badge, or `null` while hidden. */
  badge: BadgeFrame | null;
  particles: readonly ParticleFrame[];
  trails: readonly TrailFrame[];
}

export interface BodyFrame {
  /**
   * Closed outline in shape space, untransformed. A plain shape reuses
   * `ShapeDef.outline` (same array, so renderers can cache by identity); while
   * a belt takes over it is a fresh ring morphing to a circle.
   */
  outline: Ring;
  /** Shape's bounding radius, for renderers that size things against it. */
  radius: number;
  /**
   * Body transform, applied outermost first: translate by `(x, y)`, rotate by
   * `rotation` degrees about the centre of shape space, then scale about the
   * centre by `(scaleX, scaleY)`. `scaleY` carries the squash.
   */
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  /** Opacity of the belt core, or `null` when there is no belt. */
  coreOpacity: number | null;
  /**
   * The figure's other pieces — ears, an antenna, leaves — each an outline in
   * shape space under the body transform above. They are drawn with the body
   * and never morph: the belt takes them away and a change of shape
   * cross-fades them, which is what `opacity` carries.
   */
  parts: readonly PartFrame[];
}

export interface PartFrame {
  tone: PartTone;
  outline: Ring;
  /** The part's own colour (`ShapePart.color`), absent where it takes its tone's. */
  color?: PartColor;
  /** The smallest display width it is drawn at (`ShapePart.minPx`). */
  minPx?: number;
  /** Whether a skin leaves it undecorated (`ShapePart.plain`). */
  plain?: boolean;
  /** The signature motion it plays (`ShapePart.motion`). */
  motion?: PartMotionRef;
  opacity: number;
}

export interface FaceFrame {
  /** The face style that was asked for, whether or not features are showing yet. */
  style: FaceStyle;
  /** Opacity of the whole face; it fades out as a belt or a HUD takes the body. */
  opacity: number;
  /** `null` while the face is hidden, which is when it is not worth computing. */
  geometry: FaceGeometry | null;
  /** 0 = eyes only, 1 = full line face. */
  lineBlend: number;
  /** Dips to 0 and recovers when the nose is swapped. Multiplies the nose opacity. */
  featureFade: number;
  /** Whether nose and mouth are far enough into line mode to be worth drawing. */
  features: boolean;
  /** 0 = not the cute face, 1 = fully cute. Eases when the face style changes live. */
  cute: number;
  /** How flushed the cheeks are, 0..1, already scaled by `cute`. */
  blush: number;
}

export interface BeltSnapshot {
  /** How far the body has given way to the belt, 0..1. */
  blend: number;
  dots: readonly BeltDot[];
  rings: readonly BeltRingFrame[];
  glyphs: readonly BeltGlyph[];
}

export interface BeltRingFrame {
  x: number;
  y: number;
  r: number;
  width: number;
  opacity: number;
  /**
   * A partial ring: `on` units of the circumference drawn out of every
   * `period`, starting at twelve o'clock and running clockwise.
   */
  dash?: { on: number; period: number };
}

export interface HudSnapshot {
  /** Opacity of the dial layer. */
  opacity: number;
  /** `null` when there is no dial to draw. */
  primitives: HudPrimitives | null;
  /** Stroke weight for ticks and polylines, in shape units. */
  strokeWidth: number;
}

export interface BadgeFrame {
  color: string;
  x: number;
  y: number;
  r: number;
}

export interface ParticleFrame {
  x: number;
  y: number;
  size: number;
  /** Radians. */
  rotation: number;
  kind: 'dot' | 'strip' | 'star';
  color: string;
  opacity: number;
}

/**
 * A ribbon flung off a spin. It passes behind the body and in front of it, so
 * a renderer draws the points with `z < 0` before the body and the rest after.
 */
export interface TrailFrame {
  /** Degrees; the colour is the renderer's to derive. */
  hue: number;
  /** Width at the head, in shape units. The tail is half as wide. */
  size: number;
  opacity: number;
  /** The swept arc, tail first. Depth `z` is positive towards the viewer. */
  points: readonly TrailPoint[];
}
