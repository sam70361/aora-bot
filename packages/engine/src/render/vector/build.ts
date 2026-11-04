/**
 * The vector style's scene: smooth SVG paths, built from a frame snapshot.
 *
 * Both the live renderer and the static one call `build`, so the body, face,
 * belt, HUD and particles are described once. The two differ only in the
 * context they pass: a live scene keeps every node a later frame might want
 * (hidden, not absent), so the DOM can be updated in place; a static scene is
 * the culled, flattened form that reads well as a string.
 */
import { HAIR_SHADE_TOKEN } from '../../core/palette.js';
import { CENTER, type Ring } from '../../core/types.js';
import { eyePath, type EyeShape, type FeatureShape } from '../../face/placement.js';
import type { FxFrame, FxItem } from '../../motion/fx.js';
import { HUD_FONT } from '../../hud/dials.js';
import { BELT_GLYPH_SIZE } from '../../motion/belts.js';
import { bangGlyphPath, pencilGlyphPath } from '../../motion/glyphs.js';
import { PathBuilder, smoothClosedPath } from '../../math/path-builder.js';
import { polylinePath, polylinesPath } from '../../math/polyline.js';
import { tangentTransformString } from '../../math/pose.js';
import type { FaceFrame, FrameSnapshot, HudSnapshot } from '../../sim/snapshot.js';
import { node, r2, type SceneNode } from '../scene.js';
import { paperNodes, trailNodes } from './particles.js';
import {
  bodyPieces,
  LEAF_TOKEN,
  partLayers,
  partsPaper,
  partsShadow,
  type BodyPiece,
  type PartLayers,
} from './parts.js';

/** The theme's foreground token: the default body ink. */
export const INK_TOKEN = 'var(--aora-fg, currentColor)';

/**
 * The colour of the eye cut-outs. `--aora-bg` is what a host sets to re-theme
 * the holes; it defaults to `--aora-bg-base` in the stylesheet, and the
 * fallback here is that token's own default, so an unstyled page agrees with
 * a styled one.
 */
export const EYE_TOKEN = 'var(--aora-bg, var(--aora-bg-base, #fcfcfc))';

/**
 * The sticker's paper: its border, its eyes and the ring round its badge.
 *
 * Deliberately not `--aora-bg`. A sticker is a physical thing with its own
 * white edge, so it stays light on a dark page instead of dissolving into it;
 * a host re-tints the paper with `--aora-paper`.
 */
export const PAPER_TOKEN = 'var(--aora-paper, #fff)';

/** The sticker's face: its paper, unless the host has a body that turns white (black, on a dark page). */
export const STICKER_FACE_TOKEN = `var(--aora-face-sticker, ${PAPER_TOKEN})`;

/**
 * What a hollow body's face is mixed towards: black on a light page, white on
 * a dark one. An outline or a glass body is mostly page, so a face in its bare
 * ink is no stronger than its tint, and a pale ink (yellow, gray) all but
 * vanishes; a step towards the page's own contrast keeps it the ink's colour
 * and still lets it read.
 */
export const FACE_SHIFT_TOKEN = 'light-dark(#000, #fff)';
const FACE_SHIFT = 22;

/**
 * The cute face's own colour. A host that sets `--aora-face` (white, for every
 * hue but black) gets the white face; without it the face is a cut-out in
 * the page colour, which reads on any body.
 */
export const FACE_TOKEN = 'var(--aora-face, var(--aora-bg, var(--aora-bg-base, #fcfcfc)))';

/** The soft variant's face: a dark brown, with a host override for a black body. */
export const SOFT_FACE_TOKEN = 'var(--aora-face-soft, #2B2420)';

/** The riso variant's second ink. `--aora-ink2` swaps it, as pink needs. */
export const RISO_TOKEN = 'var(--aora-ink2, #FF78A6)';

/** How much black is laid over the ink to make the paper variant's cast shadow. */
const PAPER_SHADOW_DARKNESS = 0.32;

/** The sticker's drop shadow, in shape units: small, soft and straight down. */
const STICKER_SHADOW = { dy: 3.5, blur: 3, opacity: 0.2 };

/** An outlined mouth is drawn a little finer than the filled mouth's own stroke (2.6 against 3). */
const MOUTH_OUTLINE_SHARE = 0.87;

/** The two variants whose body is a line, so the face and the effects take the ink instead of their own colours. */
const isHollow = (variant: string): boolean => variant === 'outline' || variant === 'glass';

/** How much of the ink fills an outlined body. */
const OUTLINE_FILL = 0.08;

/**
 * The glass body: a see-through tint of the ink inside a fine rim. It is a
 * material, not a line drawing, so the rim is a fraction of the outline's
 * width and the tint is several times the outline's faint fill.
 */
const GLASS = { tint: 0.34, rim: 0.42, rimOpacity: 0.9, sheen: 0.3, edgeLight: 0.9 };

/** Cheek colours: pink on a body, the ink itself on an outline. Faint: a flush, not a sticker. */
const BLUSH = { color: '#FFB3C7', opacity: 0.6 };
const BLUSH_SOFT = { color: '#FF7E9D', opacity: 0.45 };
const BLUSH_HOLLOW_OPACITY = 0.16;

/** The riso variant's misregistration, as a fixed direction (3.4 : 2.6) scaled by `risoOffset`. */
const RISO_DIRECTION = [0.794, 0.608] as const;

/** Halftone dots: spacing, radius and slant, in shape units (scaled to a 229 box). */
const HALFTONE = { pitch: 7.8, radius: 1.7, angle: 30, opacity: 0.42 };

/** Width of the stroke that separates the badge from whatever is under it. */
const BADGE_RING = 8;

/** The vector series' parameters, read out of a resolved `styleOptions`. */
export interface VectorParams {
  /** Stroke width of the outlined variants, in shape units. */
  strokeWidth: number;
  /** How far the sticker's border reaches beyond the body, in shape units. */
  stickerWidth: number;
  /** Whether the sticker casts its soft shadow. */
  stickerShadow: boolean;
  /** Distance of the paper variant's hard shadow, in shape units. */
  paperOffset: number;
  /** Direction of that shadow in degrees, clockwise from +x (90 is straight down). */
  paperAngle: number;
  /** Tilt of the whole paper figure, in degrees. */
  paperTilt: number;
  /** Whether the soft variant stands on a ground shadow. */
  softShadow: boolean;
  /** Whether the soft variant carries a gloss highlight. */
  softGloss: boolean;
  /** Distance between the riso variant's two inks, in shape units. */
  risoOffset: number;
  /** Whether the riso variant is screened with halftone dots. */
  risoHalftone: boolean;
}

/**
 * `styleOptions` arrives resolved: every key present, clamped to its range.
 * Reading it here once keeps the scene free of casts.
 */
export function readVectorParams(options: Record<string, unknown>): VectorParams {
  return {
    strokeWidth: Number(options.strokeWidth),
    stickerWidth: Number(options.stickerWidth),
    stickerShadow: options.stickerShadow === true,
    paperOffset: Number(options.paperOffset),
    paperAngle: Number(options.paperAngle),
    paperTilt: Number(options.paperTilt),
    softShadow: options.softShadow === true,
    softGloss: options.softGloss === true,
    risoOffset: Number(options.risoOffset),
    risoHalftone: options.risoHalftone === true,
  };
}

/** Gradient endpoints in `objectBoundingBox` units for a ramp running at `angle` degrees. */
export function inkGradientVector(angle = 135): { x1: number; y1: number; x2: number; y2: number } {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad) / 2;
  const dy = Math.sin(rad) / 2;
  return { x1: r2(0.5 - dx), y1: r2(0.5 - dy), x2: r2(0.5 + dx), y2: r2(0.5 + dy) };
}

export interface VectorSceneContext {
  mode: 'live' | 'static';
  /** Id for the root group. */
  sourceId?: string;
  /** Id of the clip that keeps the face inside the body. Live only. */
  clipId?: string;
  /** Id to give a gradient ink, when the scene has to define one itself. Live only. */
  inkId?: string;
  /** Id of the sticker's drop-shadow filter. Without one the sticker has no shadow. */
  shadowId?: string;
  /** Body paint, resolved by the caller. Absent: derived from the snapshot's ink. */
  ink?: string;
  /** Eye cut-out colour in the solid variant. Defaults to `EYE_TOKEN`. */
  eyeFill?: string;
  /** Colour of the cute face on a filled body. Defaults to `FACE_TOKEN`. */
  faceFill?: string;
  /** Colour of the cute face in the soft variant. Defaults to `SOFT_FACE_TOKEN`. */
  softFaceFill?: string;
  /** Colour of the face and eyes in the sticker variant. Defaults to `STICKER_FACE_TOKEN`. */
  stickerFaceFill?: string;
  /** What a hollow body's face is mixed towards. Defaults to `FACE_SHIFT_TOKEN`. */
  faceShift?: string;
  /** What hair is shaded towards on a filled body. Defaults to `HAIR_SHADE_TOKEN`. */
  hairShade?: string;
  /** The body's ink as a solid paint, for strokes too thin for a gradient. Defaults to `ink`. */
  solidInk?: string;
  /**
   * Ids for the defs the soft, glass and riso variants need: a light gradient
   * and a body clip (soft and glass, one at a time) and a halftone (riso).
   * Without them the soft and glass bodies are plain and riso has no halftone.
   */
  softId?: string;
  halftoneId?: string;
  glossId?: string;
  /** Paint of the leaf accessory. Defaults to the leaf token. */
  leaf?: string;
  /**
   * Paint for the belt's dots, rings and glyphs. Defaults to a flat ink
   * override if there is one, else the foreground token.
   */
  beltPaint?: string;
  /** Read on every build, so a live renderer can change them between frames. */
  readonly params: VectorParams;
}

/**
 * The two belt glyphs, built once.
 *
 * They are drawn at a fixed size and scaled by the belt frame, so there is
 * exactly one path string each for the lifetime of the module rather than one
 * per character per frame.
 */
const GLYPH_PATHS: Record<'pencil' | 'bang', string> = {
  pencil: pencilGlyphPath(BELT_GLYPH_SIZE),
  bang: bangGlyphPath(BELT_GLYPH_SIZE),
};

/**
 * Smooth path for an outline, remembered by the identity of the array.
 *
 * A plain shape hands over the registry's own outline every frame, so the
 * spline is fitted once per shape; a belt's morphing ring is a new array each
 * frame and is fitted each frame.
 */
const bodyPaths = new WeakMap<Ring, string>();
function bodyPath(outline: Ring): string {
  let d = bodyPaths.get(outline);
  if (d === undefined) {
    d = smoothClosedPath(outline);
    bodyPaths.set(outline, d);
  }
  return d;
}

export interface VectorScene {
  build(frame: FrameSnapshot): SceneNode;
}

export function createVectorScene(ctx: VectorSceneContext): VectorScene {
  const live = ctx.mode === 'live';
  /*
   * Once a line face has been asked for, its nose and mouth nodes stay in the
   * scene and are hidden by opacity when not wanted. Dropping them would make
   * every switch back to the eyes-only face destroy and rebuild them. A
   * default-face character never gets them at all.
   */
  let featureNodes = false;

  /** Static markup leaves out what is at its default; the live DOM is always explicit. */
  const opacity = (v: number): number | undefined => (!live && v >= 1 ? undefined : r2(v));
  /** A node a static scene drops when it is invisible. */
  const keep = (visible: boolean): boolean => live || visible;
  /**
   * A hollow body's face paint. A gradient cannot be mixed, and a
   * `currentColor` ink is a single-colour line drawing that has to stay in
   * the text colour, so both are used as they are.
   */
  const hollowFace = (solid: string): string =>
    solid.startsWith('url(') || solid === 'currentColor'
      ? solid
      : `color-mix(in oklab, ${solid}, ${ctx.faceShift ?? FACE_SHIFT_TOKEN} ${FACE_SHIFT}%)`;
  const stickerFace = ctx.stickerFaceFill ?? STICKER_FACE_TOKEN;

  function build(frame: FrameSnapshot): SceneNode {
    const ink = resolveInk(frame, ctx);
    const variant = frame.variant;
    const hollow = variant === 'outline' || variant === 'glass';
    // Outlined bodies are not a filled mass, so cut-out eyes would vanish: the
    // eyes and features switch to the ink instead. A sticker's eyes are its
    // paper, whatever the page behind it is.
    const eyeFill = hollow
      ? hollowFace(ctx.solidInk ?? ink)
      : variant === 'sticker'
        ? stickerFace
        : (ctx.eyeFill ?? EYE_TOKEN);
    const belt = ctx.beltPaint ?? flatInk(frame) ?? INK_TOKEN;
    const d = bodyPath(frame.body.outline);
    const parts = partLayers(frame, {
      ink,
      leaf: ctx.leaf ?? LEAF_TOKEN,
      hairShade: ctx.hairShade ?? HAIR_SHADE_TOKEN,
      strokeWidth: ctx.params.strokeWidth,
      live,
    });

    const body = node('path', bodyAttrs(frame, ink, parts.silhouette ?? d));
    const children: SceneNode[] = [];
    if (live && ctx.clipId) children.push(defs(frame, d));

    children.push(
      node('g', undefined, trailNodes(frame.trails, 'back'), { fragment: true }),
      node('g', undefined, beltRings(frame, belt), { fragment: true }),
    );
    if (variant === 'soft' && ctx.params.softShadow) children.push(groundShadow(frame));
    if (variant === 'paper') {
      // The shadow turns with the body, so both sit in one tilted group.
      const tilt = ctx.params.paperTilt;
      children.push(
        node(
          'g',
          tilt === 0 ? undefined : { transform: `rotate(${r2(tilt)} ${CENTER} ${CENTER})` },
          [paperShadow(frame, ink, d), bodyGroup(frame, body, eyeFill, d, ink, parts)],
          { fragment: tilt === 0 },
        ),
      );
    } else {
      children.push(bodyGroup(frame, body, eyeFill, d, ink, parts));
    }
    children.push(
      node('g', undefined, beltDots(frame, belt), { fragment: true }),
      node('g', undefined, beltGlyphs(frame, belt), { fragment: true }),
    );
    if (live || frame.fx?.space === 'scene') children.push(fxLayer(frame, 'scene', hollow));
    if (keep(frame.hud.primitives !== null)) children.push(hudLayer(frame.hud, ink));
    children.push(
      node('g', undefined, trailNodes(frame.trails, 'front'), { fragment: true }),
      node('g', undefined, paperNodes(frame.particles), { fragment: true }),
    );

    const scale = frame.shapeScale;
    return node(
      'g',
      {
        id: ctx.sourceId || undefined,
        transform: `translate(${CENTER} ${CENTER}) scale(${scale}) translate(${-CENTER} ${-CENTER})`,
      },
      children,
      { layout: 'hang' },
    );
  }

  function defs(frame: FrameSnapshot, d: string): SceneNode {
    const children = [node('clipPath', { id: ctx.clipId }, [node('path', { d })])];
    const ink = frame.ink;
    if (ink && 'from' in ink) {
      // `objectBoundingBox` units, so the gradient follows the body as it
      // shrinks into a belt core rather than staying pinned to the viewBox.
      children.push(
        node('linearGradient', { id: ctx.inkId, ...inkGradientVector(ink.angle) }, [
          node('stop', { offset: 0, 'stop-color': ink.from }),
          node('stop', { offset: 1, 'stop-color': ink.to }),
        ]),
      );
    }
    return node('defs', undefined, children);
  }

  function bodyAttrs(
    frame: FrameSnapshot,
    ink: string,
    d: string,
  ): Record<string, string | number | undefined> {
    const width = ctx.params.strokeWidth;
    switch (frame.variant) {
      case 'outline':
        // A faint fill of the ink behind the line: the face needs something to sit on.
        return {
          d,
          fill: ink,
          'fill-opacity': r2(OUTLINE_FILL * (frame.body.coreOpacity ?? 1)),
          stroke: ink,
          'stroke-width': width,
          'stroke-linejoin': 'round',
        };
      case 'glass':
        return {
          d,
          fill: ink,
          'fill-opacity': r2(GLASS.tint * (frame.body.coreOpacity ?? 1)),
          stroke: ink,
          'stroke-width': r2(width * GLASS.rim),
          'stroke-opacity': GLASS.rimOpacity,
          'stroke-linejoin': 'round',
        };
      default: {
        const core = frame.body.coreOpacity;
        return { d, fill: ink, 'fill-opacity': core === null ? undefined : r2(core) };
      }
    }
  }

  /** The body's spring-driven transform, or `atRest` when a static document can leave it out. */
  function bodyMotion(b: FrameSnapshot['body']): { transform: string; atRest: boolean } {
    const transform = `translate(${r2(b.x)} ${r2(b.y)}) rotate(${r2(b.rotation)} ${CENTER} ${CENTER}) translate(${CENTER} ${CENTER}) scale(${r2(b.scaleX)} ${r2(b.scaleY)}) translate(${-CENTER} ${-CENTER})`;
    // At rest the wrapper does nothing, and a string without it is what a
    // static document has always looked like.
    const atRest =
      !live &&
      r2(b.x) === 0 &&
      r2(b.y) === 0 &&
      r2(b.rotation) === 0 &&
      r2(b.scaleX) === 1 &&
      r2(b.scaleY) === 1;
    return { transform, atRest };
  }

  function bodyGroup(
    frame: FrameSnapshot,
    body: SceneNode,
    eyeFill: string,
    d: string,
    ink: string,
    parts: PartLayers,
  ): SceneNode {
    const sticker = frame.variant === 'sticker';
    const children: SceneNode[] = [];
    // First, so the border and the shadow ride the same squash and rotation as
    // the body they wrap.
    if (sticker) children.push(stickerLayer(frame, d));
    children.push(...bodyLayers(frame, body, d, parts));

    const faceGroup = face(frame.face, eyeFill, frame.variant, ink);
    if (faceGroup) children.push(faceGroup);
    // Effects that belong to the face (a tear) ride the body's own motion.
    if (live || frame.fx?.space === 'face') children.push(fxLayer(frame, 'face', isHollow(frame.variant)));

    const ring = sticker ? PAPER_TOKEN : EYE_TOKEN;
    const badge = frame.badge;
    if (badge) {
      children.push(
        node('circle', {
          cx: r2(badge.x),
          cy: r2(badge.y),
          r: r2(badge.r),
          fill: badge.color,
          stroke: ring,
          'stroke-width': BADGE_RING,
          opacity: 1,
        }),
      );
    } else if (live) {
      children.push(node('circle', { r: 18, stroke: ring, 'stroke-width': BADGE_RING, opacity: 0 }));
    }

    const { transform, atRest } = bodyMotion(frame.body);
    return node('g', atRest ? undefined : { transform }, children, { fragment: atRest });
  }

  /**
   * The sticker's border and shadow: the body's outline and the badge's circle
   * painted as paper, wider than they are.
   *
   * The border is the outline stroked at twice the edge width, so half of it
   * is under the body and the other half is the visible edge. It is one
   * silhouette for body and badge, which is what makes the badge look stuck
   * on rather than sitting inside the border.
   */
  function stickerLayer(frame: FrameSnapshot, d: string): SceneNode {
    const { stickerWidth: edge, stickerShadow } = ctx.params;
    const core = frame.body.coreOpacity;
    const shadowed = stickerShadow && ctx.shadowId !== undefined;

    const children: SceneNode[] = [];
    if (shadowed) {
      children.push(
        node('defs', undefined, [
          node(
            'filter',
            {
              id: ctx.shadowId,
              x: '-25%',
              y: '-25%',
              width: '150%',
              height: '160%',
              'color-interpolation-filters': 'sRGB',
            },
            [
              node('feDropShadow', {
                dx: 0,
                dy: STICKER_SHADOW.dy,
                stdDeviation: STICKER_SHADOW.blur,
                'flood-color': '#000',
                'flood-opacity': STICKER_SHADOW.opacity,
              }),
            ],
          ),
        ]),
      );
    }

    children.push(
      node('path', {
        d,
        fill: PAPER_TOKEN,
        stroke: PAPER_TOKEN,
        'stroke-width': r2(edge * 2),
        'stroke-linejoin': 'round',
        opacity: core === null ? undefined : r2(core),
      }),
      node('g', undefined, partsPaper(frame, PAPER_TOKEN, edge, live), { fragment: true }),
    );

    const badge = frame.badge;
    if (badge) {
      children.push(
        node('circle', {
          cx: r2(badge.x),
          cy: r2(badge.y),
          r: r2(badge.r + BADGE_RING / 2 + edge),
          fill: PAPER_TOKEN,
          opacity: 1,
        }),
      );
    } else if (live) {
      children.push(node('circle', { r: 18, fill: PAPER_TOKEN, opacity: 0 }));
    }

    return node('g', { filter: shadowed ? `url(#${ctx.shadowId})` : undefined }, children);
  }

  /**
   * The paper variant's hard shadow: the body again, in a darker shade of its
   * own ink, shifted by a fixed vector.
   *
   * The darker shade is black laid over a copy in the ink, not a computed
   * colour. That works for a token (`var(--aora-fg)`), a flat colour and a
   * gradient alike, which `color-mix` cannot do for the last. The shift is
   * applied outside the body's transform, so the shadow keeps squashing and
   * turning with the body while its direction stays put, like a light that
   * does not move when the paper does.
   */
  function paperShadow(frame: FrameSnapshot, ink: string, d: string): SceneNode {
    const { paperOffset, paperAngle } = ctx.params;
    const angle = (paperAngle * Math.PI) / 180;
    const core = frame.body.coreOpacity;
    const layers = [
      node('path', { d, fill: ink, 'fill-opacity': core === null ? undefined : r2(core) }),
      node('path', { d, fill: '#000', 'fill-opacity': r2(PAPER_SHADOW_DARKNESS * (core ?? 1)) }),
      node('g', undefined, partsShadow(frame, ink, PAPER_SHADOW_DARKNESS, live), { fragment: true }),
    ];
    const { transform, atRest } = bodyMotion(frame.body);
    const moved = node('g', atRest ? undefined : { transform }, layers, { fragment: atRest });
    const shift = `translate(${r2(Math.cos(angle) * paperOffset)} ${r2(Math.sin(angle) * paperOffset)})`;
    return node('g', { transform: shift }, [moved]);
  }

  /** One cheek, eye or mouth of the cute face as a node; a shape that is not there yet keeps a hidden one live. */
  function cuteShape(
    shape: EyeShape | undefined,
    closed: boolean,
    attrs: Record<string, string | number | undefined>,
    alpha: number,
  ): SceneNode | null {
    if (!shape || alpha < 0.005) return live ? node('path', { ...attrs, opacity: 0 }) : null;
    return node('path', {
      d: shape.extras ? eyePath(shape) : polylinePath(shape.points, closed),
      transform: tangentTransformString(shape.transform),
      ...attrs,
      opacity: shape.visible ? r2(alpha) : 0,
    });
  }

  /** The cute face: cheeks, then eyes, then the mouth, painted in the variant's face colour. */
  function cuteFace(f: FaceFrame, variant: string, ink: string): SceneNode[] {
    const g = f.geometry;
    const hollow = isHollow(variant);
    const soft = variant === 'soft';
    const solid = ctx.solidInk ?? ink;
    // A sticker's face is cut from the same paper as its border, whatever colour
    // the page asks for, unless the body itself turns paper-white.
    const paint = hollow
      ? hollowFace(solid)
      : soft
        ? (ctx.softFaceFill ?? SOFT_FACE_TOKEN)
        : variant === 'sticker'
          ? stickerFace
          : (ctx.faceFill ?? FACE_TOKEN);
    const blush = hollow ? { color: solid, opacity: BLUSH_HOLLOW_OPACITY } : soft ? BLUSH_SOFT : BLUSH;

    const children: SceneNode[] = [];
    const add = (n: SceneNode | null): void => void (n && children.push(n));

    add(cuteShape(g?.blush?.left, true, { fill: blush.color }, blush.opacity * f.blush));
    add(cuteShape(g?.blush?.right, true, { fill: blush.color }, blush.opacity * f.blush));
    add(cuteShape(g?.left, true, { fill: paint }, 1));
    add(cuteShape(g?.right, true, { fill: paint }, 1));

    const mouth = g?.mouth;
    // An outlined body draws its mouth as an outline even when it is open; a filled one fills it.
    const weight = hollow ? (g?.mouthWeight ?? 0) * MOUTH_OUTLINE_SHARE : (g?.mouthStroke ?? 0);
    add(
      cuteShape(
        mouth,
        true,
        {
          fill: hollow ? 'none' : paint,
          stroke: paint,
          'stroke-width': r2(weight),
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        },
        (mouth?.opacity ?? 1) * f.cute,
      ),
    );
    return children;
  }

  function face(f: FaceFrame, eyeFill: string, variant: string, ink: string): SceneNode | null {
    if (!keep(f.opacity > 0.01 && f.geometry !== null)) return null;
    const g = f.geometry;

    const attrs = {
      'data-aora-face': '',
      'clip-path': live && ctx.clipId ? `url(#${ctx.clipId})` : undefined,
      opacity: opacity(f.opacity),
    };
    if (f.cute > 0.005 || f.style === 'cute') {
      return node('g', attrs, cuteFace(f, variant, ink), { layout: 'block' });
    }

    const eye = (shape: EyeShape | undefined): SceneNode =>
      node(
        'path',
        shape
          ? {
              d: eyePath(shape),
              transform: tangentTransformString(shape.transform),
              fill: eyeFill,
              opacity: shape.visible ? 1 : 0,
            }
          : { fill: eyeFill },
      );
    const children = [eye(g?.left), eye(g?.right)];

    featureNodes ||= f.style === 'line' || f.features;
    if (featureNodes) {
      const lineWidth = g?.lineWidth ?? 0;
      const fade = f.featureFade;
      const nose = feature(f.features ? g?.nose : undefined, lineWidth, f.lineBlend * fade, eyeFill);
      const mouth = feature(f.features ? g?.mouth : undefined, lineWidth, f.lineBlend, eyeFill);
      if (nose) children.push(nose);
      if (mouth) children.push(mouth);
    }

    return node('g', attrs, children, { layout: 'block' });
  }

  /** A stroked nose or mouth. Hidden features keep their node in a live scene. */
  function feature(
    shape: FeatureShape | undefined,
    lineWidth: number,
    alpha: number,
    stroke: string,
  ): SceneNode | null {
    if (!shape || alpha < 0.005) {
      if (!live) return null;
      return node('path', {
        fill: 'none',
        stroke,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        opacity: 0,
      });
    }
    return node('path', {
      d: polylinePath(shape.points, shape.closed),
      transform: tangentTransformString(shape.transform),
      fill: 'none',
      stroke,
      'stroke-width': r2(lineWidth),
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: shape.visible ? r2(alpha) : 0,
    });
  }

  /**
   * What sits on the body besides the face, for the variants that paint more
   * than one layer. Every other variant is just the body.
   */
  function bodyLayers(frame: FrameSnapshot, body: SceneNode, d: string, parts: PartLayers): SceneNode[] {
    const core = frame.body.coreOpacity;
    const lit = core === null ? undefined : r2(core);
    const behind = node('g', undefined, parts.behind, { fragment: true });
    const front = node('g', undefined, parts.front, { fragment: true });
    if (frame.variant === 'soft') return softLayers(frame, body, d, lit, behind, front);
    if (frame.variant === 'riso') return risoLayers(frame, body, d, lit, behind, front);
    if (frame.variant === 'glass') return glassLayers(frame, body, parts.silhouette ?? d, lit, behind, front);
    return [behind, body, front];
  }

  /**
   * The glass variant: light on a see-through body. A white wash fades down
   * from the top and the same light catches the inside of the upper rim, both
   * clipped to the silhouette (body and same-ink pieces together, so an ear is
   * the same glass as the head). No spot highlight: at a fixed place in the
   * box it landed on the eye of every shape whose face sits high.
   */
  function glassLayers(
    frame: FrameSnapshot,
    body: SceneNode,
    outline: string,
    lit: number | undefined,
    behind: SceneNode,
    front: SceneNode,
  ): SceneNode[] {
    const { softId: lightId, glossId: clipId } = ctx;
    if (!lightId || !clipId) return [behind, body, front];
    const box = outlineBox(frame.body.outline);
    const light = `url(#${lightId})`;
    const defsNode = node('defs', undefined, [
      node(
        'linearGradient',
        { id: lightId, x1: 0, y1: r2(box.y), x2: 0, y2: r2(box.y + box.h), gradientUnits: 'userSpaceOnUse' },
        [
          node('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 1 }),
          node('stop', { offset: 0.55, 'stop-color': '#fff', 'stop-opacity': 0 }),
        ],
      ),
      node('clipPath', { id: clipId }, [node('path', { d: outline })]),
    ]);
    const shine = node('g', { 'clip-path': `url(#${clipId})`, opacity: lit }, [
      node('path', { d: outline, fill: light, opacity: GLASS.sheen }),
      // Stroked across the edge and clipped, so only its inner half shows: light caught inside the rim.
      node('path', {
        d: outline,
        fill: 'none',
        stroke: light,
        'stroke-width': r2(ctx.params.strokeWidth * 0.9),
        opacity: GLASS.edgeLight,
      }),
    ]);
    return [defsNode, behind, body, shine, front];
  }

  /** The same overlay over the body and over each piece that is more of its ink, so they are shaded as one. */
  function overBody(
    pieces: readonly BodyPiece[],
    d: string,
    lit: number | undefined,
    attrs: Record<string, string | number | undefined>,
  ): SceneNode[] {
    return [
      node('path', { d, ...attrs, opacity: lit }),
      ...pieces.map((piece) =>
        node('path', {
          d: piece.d,
          ...attrs,
          opacity: lit === undefined ? piece.opacity : r2((piece.opacity ?? 1) * lit),
        }),
      ),
    ];
  }

  /**
   * The soft variant: the flat body under a radial wash (light top-left, dark
   * bottom-right) and a small gloss. Both are overlays rather than a
   * gradient from the ink, so they work on a token, a colour or a gradient.
   *
   * The wash is laid over the body's same-ink pieces as well, and its gradient
   * is fitted to the body's box rather than each path's own, so an ear takes
   * the shade of where it sits on the figure.
   */
  function softLayers(
    frame: FrameSnapshot,
    body: SceneNode,
    d: string,
    lit: number | undefined,
    behind: SceneNode,
    front: SceneNode,
  ): SceneNode[] {
    const { softId, glossId } = ctx;
    if (!softId) return [behind, body, front];
    const box = outlineBox(frame.body.outline);
    const stop = (offset: number, color: string, alpha: number): SceneNode =>
      node('stop', { offset, 'stop-color': color, 'stop-opacity': alpha });
    const defsChildren = [
      node(
        'radialGradient',
        {
          id: softId,
          cx: 0.36,
          cy: 0.3,
          r: 0.78,
          gradientUnits: 'userSpaceOnUse',
          gradientTransform: `translate(${r2(box.x)} ${r2(box.y)}) scale(${r2(box.w)} ${r2(box.h)})`,
        },
        [stop(0, '#fff', 0.55), stop(0.52, '#fff', 0), stop(0.52, '#000', 0), stop(1, '#000', 0.22)],
      ),
    ];
    const gloss = ctx.params.softGloss && glossId;
    if (gloss) defsChildren.push(node('clipPath', { id: glossId }, [node('path', { d })]));

    const layers = [
      node('defs', undefined, defsChildren),
      behind,
      body,
      ...overBody(bodyPieces(frame, live), d, lit, { fill: `url(#${softId})` }),
    ];
    if (gloss) {
      const cx = r2(box.x + box.w * 0.3);
      const cy = r2(box.y + box.h * 0.27);
      layers.push(
        node(
          'g',
          { 'clip-path': `url(#${glossId})` },
          [
            node('ellipse', {
              cx,
              cy,
              rx: r2(box.w * 0.09),
              ry: r2(box.w * 0.053),
              fill: '#fff',
              opacity: r2(0.55 * (lit ?? 1)),
              transform: `rotate(-32 ${cx} ${cy})`,
            }),
          ],
          { layout: 'inline' },
        ),
      );
    }
    layers.push(front);
    return layers;
  }

  /**
   * The riso variant: two inks printed slightly out of register, the body's
   * own multiplied over a second one, and screened with halftone dots.
   *
   * The body's same-ink pieces are printed with it, in the second ink, the
   * wash and the screen alike; accessories in their own colour go over the
   * print, as a third, properly registered pass.
   */
  function risoLayers(
    frame: FrameSnapshot,
    body: SceneNode,
    d: string,
    lit: number | undefined,
    behind: SceneNode,
    front: SceneNode,
  ): SceneNode[] {
    const { risoOffset, risoHalftone } = ctx.params;
    const { halftoneId } = ctx;
    const pieces = bodyPieces(frame, live);
    const second = node(
      'g',
      { transform: `translate(${r2(RISO_DIRECTION[0] * risoOffset)} ${r2(RISO_DIRECTION[1] * risoOffset)})` },
      overBody(pieces, d, undefined, { fill: RISO_TOKEN, 'fill-opacity': lit }),
    );
    // The white wash lightens the ink as a mixed colour would, without needing a computed one.
    const printed = node('g', { opacity: 0.92, style: 'mix-blend-mode:multiply' }, [
      behind,
      body,
      ...overBody(pieces, d, undefined, {
        fill: '#fff',
        'fill-opacity': r2(0.18 * (frame.body.coreOpacity ?? 1)),
      }),
    ]);
    const stack = [second, printed];

    const layers: SceneNode[] = [];
    if (risoHalftone && halftoneId) {
      layers.push(
        node('defs', undefined, [
          node(
            'pattern',
            {
              id: halftoneId,
              width: HALFTONE.pitch,
              height: HALFTONE.pitch,
              patternUnits: 'userSpaceOnUse',
              patternTransform: `rotate(${HALFTONE.angle})`,
            },
            [
              node('circle', {
                cx: HALFTONE.pitch / 2,
                cy: HALFTONE.pitch / 2,
                r: HALFTONE.radius,
                fill: '#fff',
                'fill-opacity': HALFTONE.opacity,
              }),
            ],
          ),
        ]),
      );
      stack.push(...overBody(pieces, d, lit, { fill: `url(#${halftoneId})` }));
    }
    layers.push(node('g', { style: 'isolation:isolate' }, stack), front);
    return layers;
  }

  /** The soft variant's shadow on the ground: a flat ellipse under the body that stays put when the body hops. */
  function groundShadow(frame: FrameSnapshot): SceneNode {
    // The figure's box, not the head's: an ear or a tail that reaches lower or wider than the body stands on the shadow too.
    const box = bodyPieces(frame, live).reduce(
      (acc, piece) => joinBoxes(acc, outlineBox(piece.outline)),
      outlineBox(frame.body.outline),
    );
    const fade = 1 - (frame.belt?.blend ?? 0);
    const rx = box.w * 0.42;
    return node('ellipse', {
      cx: r2(box.x + box.w / 2),
      cy: r2(box.y + box.h - 3),
      rx: r2(rx),
      ry: r2(rx * 0.133),
      fill: '#000',
      opacity: r2(0.12 * fade),
    });
  }

  /**
   * The mood effect's pieces. The layer is always there in a live scene, so
   * the DOM keeps its place when an effect comes and goes.
   */
  function fxLayer(frame: FrameSnapshot, space: FxFrame['space'], hollow: boolean): SceneNode {
    const fx = frame.fx;
    const items = fx && fx.space === space ? fx.items : [];
    // An outlined character throws its effects in the ink as well; the rest keep their own colour.
    const paint =
      hollow || fx?.color == null ? (ctx.solidInk ?? ctx.beltPaint ?? flatInk(frame) ?? INK_TOKEN) : fx.color;
    const nodes = items.filter((item) => keep(item.opacity > 0.01)).map((item) => fxItem(item, paint));
    return node('g', { 'data-aora-fx': '', style: live ? 'pointer-events:none' : undefined }, nodes, {
      fragment: !live && nodes.length === 0,
    });
  }

  function fxItem(item: FxItem, paint: string): SceneNode {
    const { x, y, size: s, opacity: alpha } = item;
    const stroke = {
      fill: 'none',
      stroke: paint,
      'stroke-width': r2(item.width ?? 0),
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: r2(alpha),
    };
    switch (item.shape) {
      case 'z':
        return node('path', {
          d: `M${r2(x - s / 2)} ${r2(y - s / 2)}h${r2(s)}l${r2(-s)} ${r2(s)}h${r2(s)}`,
          ...stroke,
        });
      case 'star':
        return node('path', { d: starPath(x, y, s), fill: paint, opacity: r2(alpha) });
      case 'heart':
        return node('path', { d: heartPath(x, y, s), fill: paint, opacity: r2(alpha) });
      case 'drop':
        return node('path', { d: dropPath(x, y, s), fill: paint, opacity: r2(alpha) });
      case 'bang':
        return node(
          'g',
          { transform: `translate(${r2(x)} ${r2(y)}) scale(${r2(s)})`, fill: paint, opacity: r2(alpha) },
          [
            node('rect', { x: -2.3, y: 0, width: 4.6, height: 14, rx: 2.3 }),
            node('circle', { cx: 0, cy: 19.5, r: 2.6 }),
          ],
        );
      case 'line':
        return node('path', { d: `M${r2(x)} ${r2(y)}L${r2(item.x2 ?? x)} ${r2(item.y2 ?? y)}`, ...stroke });
      case 'dot':
        return node('circle', { cx: r2(x), cy: r2(y), r: r2(s), fill: paint, opacity: r2(alpha) });
      case 'pencil':
        return node('path', {
          d: GLYPH_PATHS.pencil,
          fill: paint,
          opacity: r2(alpha),
          transform: `translate(${r2(x)} ${r2(y)}) rotate(${r2(item.rotation ?? 0)}) scale(${r2(s)})`,
        });
      case 'arc': {
        // A dashed circle turned to its start, the way the belt's rings are.
        const circumference = 2 * Math.PI * s;
        const on = ((item.sweep ?? 0) / 360) * circumference;
        return node('circle', {
          cx: r2(x),
          cy: r2(y),
          r: r2(s),
          ...stroke,
          'stroke-dasharray': `${r2(on)} ${r2(circumference - on)}`,
          transform: `rotate(${r2((item.start ?? 0) - 90)} ${r2(x)} ${r2(y)})`,
        });
      }
    }
  }

  function beltRings(frame: FrameSnapshot, paint: string): SceneNode[] {
    const belt = frame.belt;
    if (!belt) return [];
    return belt.rings
      .filter((ring) => keep(ring.opacity > 0.01 && ring.r > 0.1))
      .map((ring) => {
        const cx = r2(ring.x);
        const cy = r2(ring.y);
        return node('circle', {
          cx,
          cy,
          r: r2(Math.max(0.1, ring.r)),
          fill: 'none',
          stroke: paint,
          'stroke-width': r2(ring.width),
          'stroke-linecap': 'round',
          opacity: r2(ring.opacity * belt.blend),
          'stroke-dasharray': ring.dash ? `${ring.dash.on} ${ring.dash.period}` : undefined,
          transform: ring.dash ? `rotate(-90 ${cx} ${cy})` : undefined,
        });
      });
  }

  function beltDots(frame: FrameSnapshot, paint: string): SceneNode[] {
    const belt = frame.belt;
    if (!belt) return [];
    return belt.dots
      .filter((dot) => keep(dot.opacity > 0.01))
      .map((dot) =>
        node('circle', {
          cx: r2(dot.x),
          cy: r2(dot.y),
          r: r2(dot.r),
          fill: paint,
          opacity: r2(dot.opacity * belt.blend),
        }),
      );
  }

  function beltGlyphs(frame: FrameSnapshot, paint: string): SceneNode[] {
    const belt = frame.belt;
    if (!belt) return [];
    return belt.glyphs
      .filter((g) => keep(g.opacity > 0.01))
      .map((g) =>
        node('path', {
          d: GLYPH_PATHS[g.kind],
          fill: paint,
          opacity: r2(g.opacity * belt.blend),
          // The glyph is built centred on the origin, so its own transform is
          // where it is, which way up it is and how big it is — in that order.
          transform: `translate(${r2(g.x)} ${r2(g.y)}) rotate(${r2(g.rotation)}) scale(${r2(g.scale)})`,
        }),
      );
  }

  function hudLayer(hud: HudSnapshot, ink: string): SceneNode {
    const p = hud.primitives;
    const frag = (nodes: SceneNode[]) => node('g', undefined, nodes, { fragment: true });
    const stroke = r2(hud.strokeWidth);

    const arcs =
      p?.arcs
        .filter((a) => keep(a.opacity > 0.01 && a.r > 0.1))
        .map((a) =>
          node('path', {
            d: new PathBuilder().arcTo(a.x, a.y, Math.max(0.1, a.r), a.start, a.end).toString(),
            fill: 'none',
            stroke: ink,
            'stroke-width': r2(a.width),
            'stroke-linecap': a.cap ?? 'round',
            opacity: r2(a.opacity),
          }),
        ) ?? [];

    const ticks =
      p?.ticks
        .filter((t) => keep(t.opacity > 0.01))
        .map((t) =>
          node('line', {
            x1: r2(t.x1),
            y1: r2(t.y1),
            x2: r2(t.x2),
            y2: r2(t.y2),
            stroke: ink,
            'stroke-width': stroke,
            'stroke-linecap': 'round',
            opacity: r2(t.opacity),
          }),
        ) ?? [];

    const bars =
      p?.bars
        .filter((b) => keep(b.opacity > 0.01 && b.w > 0.01 && b.h > 0.01))
        .map((b) =>
          node('rect', {
            x: r2(b.x),
            y: r2(b.y),
            width: r2(Math.max(0.1, b.w)),
            height: r2(Math.max(0.1, b.h)),
            rx: r2(Math.min(b.w, b.h) / 2),
            fill: ink,
            opacity: r2(b.opacity),
          }),
        ) ?? [];

    const strokes =
      p?.strokes
        .map((s) => ({ s, d: polylinesPath(s.lines) }))
        .filter(({ s, d }) => keep(s.opacity > 0.01 && d !== ''))
        .map(({ s, d }) =>
          node('path', {
            d,
            fill: 'none',
            stroke: ink,
            'stroke-width': stroke,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            opacity: r2(s.opacity),
          }),
        ) ?? [];

    const pips =
      p?.pips
        .filter((pip) => keep(pip.opacity > 0.01 && pip.r > 0.01))
        .map((pip) =>
          node('circle', {
            cx: r2(pip.x),
            cy: r2(pip.y),
            r: r2(Math.max(0.1, pip.r)),
            fill: ink,
            opacity: r2(pip.opacity),
          }),
        ) ?? [];

    const glyphs =
      p?.glyphs
        .filter((g) => keep(g.opacity > 0.01 && g.text !== ''))
        .map((g) =>
          node(
            'text',
            {
              x: r2(g.x),
              y: r2(g.y),
              'text-anchor': g.anchor ?? 'middle',
              'dominant-baseline': 'central',
              'font-family': HUD_FONT,
              'font-size': r2(g.size),
              'font-weight': 600,
              fill: ink,
              opacity: r2(g.opacity),
            },
            undefined,
            { text: g.text },
          ),
        ) ?? [];

    return node(
      'g',
      {
        'data-aora-hud': '',
        opacity: opacity(hud.opacity),
        style: live ? 'pointer-events:none' : undefined,
      },
      [frag(arcs), frag(ticks), frag(bars), frag(strokes), frag(pips), frag(glyphs)],
    );
  }

  return { build };
}

/** A body's bounding box, remembered by the identity of its outline like the smooth path is. */
type Box = { x: number; y: number; w: number; h: number };
const outlineBoxes = new WeakMap<Ring, Box>();
function outlineBox(outline: Ring): Box {
  let box = outlineBoxes.get(outline);
  if (!box) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of outline) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    box = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    outlineBoxes.set(outline, box);
  }
  return box;
}

/** The smallest box holding both. */
function joinBoxes(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}
/** A four-pointed star with concave sides, for the sparkles. */
const starPath = (x: number, y: number, r: number): string =>
  `M${r2(x)} ${r2(y - r)}Q${r2(x)} ${r2(y)} ${r2(x + r)} ${r2(y)}Q${r2(x)} ${r2(y)} ${r2(x)} ${r2(y + r)}` +
  `Q${r2(x)} ${r2(y)} ${r2(x - r)} ${r2(y)}Q${r2(x)} ${r2(y)} ${r2(x)} ${r2(y - r)}Z`;

const heartPath = (x: number, y: number, s: number): string =>
  `M${r2(x)} ${r2(y + s * 0.9)}C${r2(x - s * 1.6)} ${r2(y - s * 0.1)} ${r2(x - s * 0.8)} ${r2(y - s * 1.3)} ${r2(x)} ${r2(y - s * 0.45)}` +
  `C${r2(x + s * 0.8)} ${r2(y - s * 1.3)} ${r2(x + s * 1.6)} ${r2(y - s * 0.1)} ${r2(x)} ${r2(y + s * 0.9)}Z`;

const dropPath = (x: number, y: number, s: number): string =>
  `M${r2(x)} ${r2(y - s)}C${r2(x + s * 0.85)} ${r2(y + s * 0.2)} ${r2(x + s * 0.85)} ${r2(y + s)} ${r2(x)} ${r2(y + s)}` +
  `C${r2(x - s * 0.85)} ${r2(y + s)} ${r2(x - s * 0.85)} ${r2(y + s * 0.2)} ${r2(x)} ${r2(y - s)}Z`;

/** A flat ink override, which the belt follows; a gradient is not worth putting on a dot. */
function flatInk(frame: FrameSnapshot): string | undefined {
  const ink = frame.ink;
  return ink && 'flat' in ink ? ink.flat : undefined;
}

/** The paint for the body: a colour, a gradient reference, or the token. */
function resolveInk(frame: FrameSnapshot, ctx: VectorSceneContext): string {
  if (ctx.ink !== undefined) return ctx.ink;
  const ink = frame.ink;
  if (!ink) return INK_TOKEN;
  if ('flat' in ink) return ink.flat;
  return `url(#${ctx.inkId})`;
}
