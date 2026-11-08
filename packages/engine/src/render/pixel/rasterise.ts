/**
 * A frame snapshot to a grid of paint ids.
 *
 * This is the pixel style's whole picture of a character, and it is shared by
 * the live renderer and the static one: both rasterise here, then turn the
 * grid into markup in `emit.ts`. Everything is composited into one buffer in
 * painter's order, so a cell holds exactly one paint and "same colour" cells
 * can be merged into one path without overdraw.
 */
import { BELT_GLYPH_SIZE } from '../../motion/belts.js';
import { ribbonColor, ribbonRuns } from '../../particles.js';
import type { FrameSnapshot, TrailFrame } from '../../sim/snapshot.js';
import type { EyeShape } from '../../face/placement.js';
import { withoutFineParts } from '../fine-parts.js';
import {
  FACE_ACCENTS,
  getFaceDesign,
  isFaceAccent,
  type FaceLayer,
  type FacePaint,
  type Rgb,
} from '../../face/drawn/index.js';
import { PIXEL_SHOWN, rasteriseDrawn, rasteriseInMouth } from './drawn.js';
import { glyphShift, rasteriseEyes, rasteriseGlyph, rasteriseStroke, type Poly } from './face.js';
import { FEATURE_TOKEN, GLINT_TOKEN, PUPIL_TOKEN } from './options.js';
import { PIXEL_GLYPHS } from './glyphs.js';
import {
  apply,
  compose,
  meanScale,
  rotateAboutCentre,
  scaleAboutCentre,
  toBuffer,
  translation,
  type Affine,
  type PixelGrid,
} from './grid.js';
import { alphaLevel, type PaintTable, type Tint } from './paints.js';
import { fillBodyParts, paintAccessories } from './parts.js';
import { addCoverage, fillCentres, fillDisc, strokeArc, strokePolyline, type Put } from './raster.js';
import { CELL_EDGE, CELL_GLINT, CELL_LIGHT, CELL_SHADOW, classify, ladderFor } from './shade.js';

export type PixelVariant = 'crisp' | 'dot' | 'block';

export interface RasterSettings {
  grid: PixelGrid;
  shades: number;
  outline: boolean;
  variant: PixelVariant;
  /** Direction of a gradient ink in degrees, or null when the ink is one colour. */
  gradient: number | null;
  /** The eye cut-out, and what the face features are drawn in. */
  eye: Tint;
  /** What the cute face is drawn in. Absent: the cut-out colour. */
  face?: Tint;
}

/** The cute face's cheeks. A cell holds exactly one paint, so there is no translucent pink: this is a pre-blended flat one. */
const PIXEL_BLUSH = '#FF9DBB';

/** How far a drawn iris deepens the ink, as a shade tone. */
const IRIS_TONE = -0.45;
/** Channel step a display's light is snapped to, so a colour easing between moods passes through a few paints, not hundreds. */
const LIGHT_STEP = 32;

const hex2 = (v: number): string =>
  Math.round(Math.min(255, Math.max(0, v)))
    .toString(16)
    .padStart(2, '0');

/** A lit display colour, snapped to `LIGHT_STEP`. */
function lightHex([r, g, b]: Rgb): string {
  const snap = (v: number): number => Math.round(v / LIGHT_STEP) * LIGHT_STEP;
  return `#${hex2(snap(r))}${hex2(snap(g))}${hex2(snap(b))}`.toUpperCase();
}

/** What a drawn face's paint role is in cells. */
function drawnTint(role: FacePaint, light: Rgb | undefined, settings: RasterSettings, band: number): Tint {
  if (isFaceAccent(role)) return { kind: 'css', value: FACE_ACCENTS[role] };
  switch (role) {
    case 'face':
      return settings.face ?? settings.eye;
    case 'pupil':
      return { kind: 'css', value: PUPIL_TOKEN };
    case 'feature':
      return { kind: 'css', value: FEATURE_TOKEN };
    case 'glint':
      return { kind: 'css', value: GLINT_TOKEN };
    case 'iris':
      return { kind: 'ink', band, tone: IRIS_TONE };
    default:
      return { kind: 'css', value: light ? lightHex(light) : FACE_ACCENTS.glass };
  }
}

/** Reusable buffers for one grid size. */
export interface Scratch {
  size: number;
  body: Uint8Array;
  tone: Uint8Array;
  face: Uint8Array;
  quad: Float64Array;
}

export function createScratch(size: number): Scratch {
  return {
    size,
    body: new Uint8Array(size * size),
    tone: new Uint8Array(size * size),
    face: new Uint8Array(size * size),
    quad: new Float64Array(8),
  };
}

const TAU = Math.PI * 2;

/** Points to buffer coordinates through `m`, into a polygon. */
function mapPoints(points: readonly (readonly [number, number])[], m: Affine): Poly {
  const xy = new Float64Array(points.length * 2);
  for (let i = 0; i < points.length; i++) apply(m, points[i]![0], points[i]![1], xy, i * 2);
  return { xy, n: points.length };
}

function mapFlat(flat: readonly number[], m: Affine): Poly {
  const n = flat.length / 2;
  const xy = new Float64Array(flat.length);
  for (let i = 0; i < n; i++) apply(m, flat[i * 2]!, flat[i * 2 + 1]!, xy, i * 2);
  return { xy, n };
}

/** An eye or feature's own sphere projection, as an affine. */
function tangentAffine(t: EyeShape['transform']): Affine {
  const [a, b, c, d] = t.matrix;
  return [a, b, c, d, t.x - a * t.pivotX - c * t.pivotY, t.y - b * t.pivotX - d * t.pivotY];
}

export function rasterise(
  snapshot: FrameSnapshot,
  settings: RasterSettings,
  table: PaintTable,
  scratch: Scratch,
  paint: Uint16Array,
): void {
  const { grid } = settings;
  const size = grid.size;
  // A cell is the finest mark the grid can make, so detail is kept or left out by the grid's width.
  const frame = withoutFineParts(snapshot, size);
  paint.fill(0);

  let current = 0;
  const put: Put = (col, row) => {
    if (col >= 0 && row >= 0 && col < size && row < size) paint[row * size + col] = current;
  };
  const select = (tint: Tint, opacity = 1): boolean => {
    const alpha = alphaLevel(opacity);
    if (alpha <= 0) return false;
    current = table.id(tint, alpha);
    return true;
  };

  const root = compose(toBuffer(grid), scaleAboutCentre(frame.shapeScale, frame.shapeScale));
  const k = meanScale(root);
  const b = frame.body;
  const bodyM = compose(
    root,
    compose(
      translation(b.x, b.y),
      compose(rotateAboutCentre(b.rotation), scaleAboutCentre(b.scaleX, b.scaleY)),
    ),
  );

  const bands = settings.gradient === null ? 1 : Math.max(1, Math.round(settings.shades));
  const inkTint = (band = Math.floor(bands / 2), tone = 0): Tint => ({ kind: 'ink', band, tone });

  const point = (m: Affine, x: number, y: number): [number, number] => {
    apply(m, x, y, scratch.quad, 0);
    return [scratch.quad[0]!, scratch.quad[1]!];
  };

  const stroke = (
    pts: readonly (readonly [number, number])[],
    m: Affine,
    r: number,
    closed = false,
  ): void => {
    const poly = mapPoints(pts, m);
    strokePolyline(poly.xy, poly.n, closed, r, put);
  };

  const trails = (list: readonly TrailFrame[], side: 'back' | 'front'): void => {
    for (const trail of list) {
      if (!select({ kind: 'css', value: ribbonColor(trail.hue) }, trail.opacity)) continue;
      for (const [start, end] of ribbonRuns(trail.points, side)) {
        stroke(
          trail.points.slice(start, end + 1).map((p) => [p.x, p.y] as const),
          root,
          Math.max(0.5, (trail.size * k) / 3),
        );
      }
    }
  };

  trails(frame.trails, 'back');

  const belt = frame.belt;
  if (belt) {
    for (const ring of belt.rings) {
      if (ring.r <= 0.1 || !select(inkTint(), ring.opacity * belt.blend)) continue;
      const [cx, cy] = point(root, ring.x, ring.y);
      const dash = ring.dash ? { on: ring.dash.on * k, period: ring.dash.period * k } : undefined;
      // A dashed ring starts at twelve o'clock and runs clockwise.
      strokeArc(
        cx,
        cy,
        ring.r * k,
        -Math.PI / 2,
        TAU - Math.PI / 2,
        Math.max(0.5, (ring.width * k) / 2),
        put,
        dash,
      );
    }
  }

  drawBody(frame, settings, table, scratch, paint, bodyM, bands, put, (id) => (current = id));

  if (belt) {
    for (const dot of belt.dots) {
      if (!select(inkTint(), dot.opacity * belt.blend)) continue;
      const [x, y] = point(root, dot.x, dot.y);
      fillDisc(x, y, dot.r * k, put);
    }
    for (const g of belt.glyphs) {
      if (!select(inkTint(), g.opacity * belt.blend)) continue;
      const m = compose(
        root,
        compose(
          translation(g.x, g.y),
          compose(rotationAbout((g.rotation * Math.PI) / 180), uniform(g.scale * BELT_GLYPH_SIZE)),
        ),
      );
      stampGlyph(g.kind, m, size, put);
    }
  }

  drawHud(frame, root, k, select, put, inkTint);
  drawFx(frame, frame.fx?.space === 'face' ? bodyM : root, size, select, put, Math.floor(bands / 2));
  trails(frame.trails, 'front');

  for (const p of frame.particles) {
    if (!select({ kind: 'css', value: p.color }, p.opacity)) continue;
    const [x, y] = point(root, p.x, p.y);
    const s = p.size * k;
    if (p.kind === 'strip') {
      const half = (p.size * 2.2 * k) / 2 - s / 2;
      const dx = Math.cos(p.rotation) * half;
      const dy = Math.sin(p.rotation) * half;
      scratch.quad[0] = x - dx;
      scratch.quad[1] = y - dy;
      scratch.quad[2] = x + dx;
      scratch.quad[3] = y + dy;
      strokePolyline(scratch.quad.subarray(0, 4) as Float64Array, 2, false, Math.max(0.5, s / 2), put);
    } else if (p.kind === 'star' && s >= 1.2) {
      const col = Math.floor(x);
      const row = Math.floor(y);
      put(col, row);
      put(col - 1, row);
      put(col + 1, row);
      put(col, row - 1);
      put(col, row + 1);
    } else {
      fillDisc(x, y, s / 2, put);
    }
  }
}

/** The effects as pixel glyphs: `#` is a lit cell. */
const FX_GLYPHS = {
  zSmall: ['###', '.#.', '###'],
  zBig: ['####', '..#.', '.#..', '####'],
  star: ['.#.', '###', '.#.'],
  heart: ['#.#', '###', '.#.'],
  drop: ['#', '#'],
  bang: ['##', '##', '##', '..', '##'],
  block: ['##', '##'],
} as const satisfies Record<string, readonly string[]>;

/** Below this an arc is an orbiting block, not a stroked curve. */
const SHORT_ARC = 60;

/** Fills the cells a belt glyph covers through m: coverage at half a cell or more, and at least the best cell. */
function stampGlyph(kind: 'pencil' | 'bang', m: Affine, size: number, put: Put): void {
  const cover = new Float32Array(size * size);
  let any = false;
  for (const part of PIXEL_GLYPHS[kind]) {
    const poly = mapFlat(part, m);
    addCoverage(poly.xy, poly.n, size, cover, 4);
  }
  let best = 0;
  let bestAt = 0;
  for (let i = 0; i < cover.length; i++) {
    if (cover[i]! >= 0.4) {
      put(i % size, Math.floor(i / size));
      any = true;
    }
    if (cover[i]! > best) {
      best = cover[i]!;
      bestAt = i;
    }
  }
  if (!any && best > 0) put(bestAt % size, Math.floor(bestAt / size));
}

/** A mood's effect, one glyph per piece. A piece is as tall as its glyph, however large the shape is meant to be. */
function drawFx(
  frame: FrameSnapshot,
  m: Affine,
  size: number,
  select: (tint: Tint, opacity?: number) => boolean,
  put: Put,
  band: number,
): void {
  const fx = frame.fx;
  if (!fx || fx.items.length === 0) return;
  const tint: Tint = fx.color ? { kind: 'css', value: fx.color } : { kind: 'fx', band };
  const at = (x: number, y: number): [number, number] => [
    m[0] * x + m[2] * y + m[4],
    m[1] * x + m[3] * y + m[5],
  ];
  const stamp = (rows: readonly string[], cx: number, top: number): void => {
    const left = Math.round(cx - rows[0]!.length / 2);
    const first = Math.round(top);
    rows.forEach((line, dy) => {
      for (let dx = 0; dx < line.length; dx++) if (line[dx] === '#') put(left + dx, first + dy);
    });
  };

  for (const item of fx.items) {
    if (!select(tint, item.opacity)) continue;
    const [x, y] = at(item.x, item.y);
    const reach = item.size * meanScale(m);
    switch (item.shape) {
      case 'z':
        stamp(reach >= 4.5 ? FX_GLYPHS.zBig : FX_GLYPHS.zSmall, x, y - (reach >= 4.5 ? 2 : 1.5));
        break;
      case 'star':
        if (reach >= 2) stamp(FX_GLYPHS.star, x, y - 1.5);
        else put(Math.floor(x), Math.floor(y));
        break;
      case 'heart':
        stamp(FX_GLYPHS.heart, x, y - 1.5);
        break;
      case 'drop':
        stamp(FX_GLYPHS.drop, x, y - 1);
        break;
      case 'bang':
        stamp(FX_GLYPHS.bang, x, y);
        break;
      case 'line': {
        const [x2, y2] = at(item.x2 ?? item.x, item.y2 ?? item.y);
        strokePolyline(new Float64Array([x, y, x2, y2]), 2, false, 0.5, put);
        break;
      }
      case 'arc': {
        const sweep = item.sweep ?? 0;
        if (sweep < SHORT_ARC) {
          // The orbiting block of the pixel "working": the leading end of the arc.
          const a = (((item.start ?? 0) + sweep) * Math.PI) / 180;
          stamp(FX_GLYPHS.block, x + Math.sin(a) * reach, y - Math.cos(a) * reach - 1);
        } else {
          const from = (((item.start ?? 0) - 90) * Math.PI) / 180;
          const half = Math.max(0.5, ((item.width ?? 0) * meanScale(m)) / 2);
          strokeArc(x, y, reach, from, from + (sweep * Math.PI) / 180, half, put);
        }
        break;
      }
      case 'dot':
        fillDisc(x, y, Math.max(0.75, reach), put);
        break;
      case 'pencil': {
        const lean = ((item.rotation ?? 0) * Math.PI) / 180;
        const glyphToCell = compose(
          m,
          compose(
            translation(item.x, item.y),
            compose(rotationAbout(lean), uniform(item.size * BELT_GLYPH_SIZE)),
          ),
        );
        stampGlyph('pencil', glyphToCell, size, put);
        break;
      }
    }
  }
}

function uniform(s: number): Affine {
  return [s, 0, 0, s, 0, 0];
}

function rotationAbout(radians: number): Affine {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [cos, sin, -sin, cos, 0, 0];
}

function drawBody(
  frame: FrameSnapshot,
  settings: RasterSettings,
  table: PaintTable,
  scratch: Scratch,
  paint: Uint16Array,
  bodyM: Affine,
  bands: number,
  put: Put,
  setCurrent: (id: number) => void,
): void {
  const { grid } = settings;
  const size = grid.size;
  const b = frame.body;
  const alpha = alphaLevel(b.coreOpacity ?? 1);
  if (alpha <= 0) return;

  const mask = scratch.body;
  mask.fill(0);
  const outline = mapPoints(b.outline, bodyM);
  fillCentres(outline.xy, outline.n, size, mask);
  fillBodyParts(frame, bodyM, size, mask);

  const ladder = ladderFor(settings.shades);
  const leds = settings.variant === 'dot';
  const tones = scratch.tone;
  classify(mask, size, tones);

  let minCol = size;
  let maxCol = -1;
  let minRow = size;
  let maxRow = -1;
  if (settings.gradient !== null) {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (!mask[row * size + col]) continue;
        if (col < minCol) minCol = col;
        if (col > maxCol) maxCol = col;
        if (row < minRow) minRow = row;
        if (row > maxRow) maxRow = row;
      }
    }
  }
  const angle = ((settings.gradient ?? 0) * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const w = Math.max(1, maxCol - minCol + 1);
  const h = Math.max(1, maxRow - minRow + 1);

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const i = row * size + col;
      if (!mask[i]) continue;
      let tone = 0;
      let band = Math.floor(bands / 2);
      if (settings.gradient !== null) {
        const t = ((col + 0.5 - minCol) / w - 0.5) * cos + ((row + 0.5 - minRow) / h - 0.5) * sin + 0.5;
        band = Math.min(bands - 1, Math.max(0, Math.floor(t * bands)));
      }
      const cls = tones[i];
      // A lit LED does not get darker at the rim: the plate behind it already
      // is, and a dim dot on a dark panel simply disappears.
      if (cls === CELL_EDGE) tone = settings.outline && !leds ? ladder.edge : 0;
      else if (settings.gradient === null) {
        if (cls === CELL_LIGHT) tone = ladder.light;
        else if (cls === CELL_GLINT) tone = ladder.glint;
        else if (cls === CELL_SHADOW && !leds) tone = ladder.shadow;
      }
      paint[i] = table.id({ kind: 'ink', band, tone }, alpha);
    }
  }
  paintAccessories(frame, bodyM, size, paint, table, scratch.face, Math.floor(bands / 2));

  const face = frame.face;
  const eyePaint = table.id(settings.eye, 1);
  const g = face.geometry;
  if (face.opacity >= 0.5 && g) {
    // The face sits inside the body: a cell the body does not have gets no
    // eye. `taken` remembers which feature wrote each cell, so the nose can
    // keep a cell clear of the eyes and the mouth of both: at this size
    // features that touch merge into one smear.
    const taken = scratch.face;
    taken.fill(0);
    const EYE = 1;
    const NOSE = 2;
    const MOUTH = 4;
    const near = (col: number, row: number, kinds: number): boolean =>
      ((col >= 0 && col < size && row >= 0 && row < size ? taken[row * size + col]! : 0) & kinds) !== 0 ||
      (col > 0 && (taken[row * size + col - 1]! & kinds) !== 0) ||
      (col < size - 1 && (taken[row * size + col + 1]! & kinds) !== 0) ||
      (row > 0 && (taken[(row - 1) * size + col]! & kinds) !== 0) ||
      (row < size - 1 && (taken[(row + 1) * size + col]! & kinds) !== 0);
    const writer =
      (kind: number, clear: number): Put =>
      (col, row) => {
        if (col < 0 || row < 0 || col >= size || row >= size || !mask[row * size + col]) return;
        if (clear !== 0 && near(col, row, clear)) return;
        paint[row * size + col] = eyePaint;
        taken[row * size + col]! |= kind;
      };

    const eyePoly = (shape: EyeShape): Poly | null => {
      if (!shape.visible) return null;
      const m = compose(bodyM, tangentAffine(shape.transform));
      const poly = mapPoints(shape.points, m);
      if (shape.extras) poly.extras = shape.extras.map((ring) => mapPoints(ring, m));
      return poly;
    };

    if (face.cute >= 0.5) {
      // The cute face is white on the body: its own paint, eyes first, then the mouth, then cheeks in what is left.
      const features = table.id(settings.face ?? settings.eye, 1);
      const writeCute =
        (kind: number, clear: number, id: number): Put =>
        (col, row) => {
          if (col < 0 || row < 0 || col >= size || row >= size || !mask[row * size + col]) return;
          if (clear !== 0 && near(col, row, clear)) return;
          paint[row * size + col] = id;
          taken[row * size + col]! |= kind;
        };
      let axis =
        (g.eyeOpacity ?? 1) >= PIXEL_SHOWN
          ? rasteriseEyes(eyePoly(g.left), eyePoly(g.right), { size, put: writeCute(EYE, 0, features) })
          : null;

      // A drawn face lays its own eyes over the plain ones, and paints its mouth in its own role.
      const layerPaint = (layer: FaceLayer): number =>
        table.id(drawnTint(layer.paint, layer.light, settings, Math.floor(bands / 2)), 1);
      const putDrawn = (col: number, row: number, id: number): void => {
        if (col < 0 || row < 0 || col >= size || row >= size || !mask[row * size + col]) return;
        paint[row * size + col] = id;
        taken[row * size + col]! |= EYE;
      };
      const drawn = g.drawn ? rasteriseDrawn(g.drawn, bodyM, size, putDrawn, layerPaint) : null;
      if (drawn) axis = drawn.axis ?? axis;
      // A cell holds one paint, so the mouth takes the paint of the design that holds most of the face.
      const design = drawn ? getFaceDesign(drawn.design.style) : null;
      const mouthPaint = design
        ? table.id(drawnTint(design.mouthPaint, undefined, settings, Math.floor(bands / 2)), 1)
        : features;

      const mouth = g.mouth;
      if (mouth?.visible && (mouth.opacity ?? 1) >= 0.5) {
        const poly = mapPoints(mouth.points, compose(bodyM, tangentAffine(mouth.transform)));
        rasteriseGlyph(poly, axis, { size, put: writeCute(MOUTH, EYE, mouthPaint) });
        if (drawn)
          rasteriseInMouth(drawn.design, mouth, bodyM, glyphShift(poly, axis), size, putDrawn, layerPaint);
      }

      const blush = g.blush;
      if (blush && face.blush >= 0.5) {
        const putBlush = writeCute(0, EYE | MOUTH, table.id({ kind: 'css', value: PIXEL_BLUSH }, 1));
        for (const cheek of [blush.left, blush.right]) {
          if (cheek.visible) rasteriseGlyph(eyePoly(cheek)!, axis, { size, put: putBlush });
        }
      }
    } else {
      const axis = rasteriseEyes(eyePoly(g.left), eyePoly(g.right), { size, put: writer(EYE, 0) });

      const radius = Math.max(0.5, (g.lineWidth * meanScale(bodyM)) / 2);
      if (face.features) {
        const nose = g.nose;
        if (nose?.visible && face.lineBlend * face.featureFade >= 0.5) {
          const poly = mapPoints(nose.points, compose(bodyM, tangentAffine(nose.transform)));
          rasteriseStroke(poly, nose.closed, radius, axis, writer(NOSE, EYE));
        }
        const mouth = g.mouth;
        if (mouth?.visible && face.lineBlend >= 0.5) {
          const poly = mapPoints(mouth.points, compose(bodyM, tangentAffine(mouth.transform)));
          rasteriseStroke(poly, mouth.closed, radius, axis, writer(MOUTH, EYE | NOSE));
        }
      }
    }
  }

  const badge = frame.badge;
  if (badge) {
    const [x, y] = [
      bodyM[0] * badge.x + bodyM[2] * badge.y + bodyM[4],
      bodyM[1] * badge.x + bodyM[3] * badge.y + bodyM[5],
    ];
    const k = meanScale(bodyM);
    // The ring round the badge is the eye colour: it separates the dot from the body.
    const ring = settings.variant === 'dot' ? 0 : eyePaint;
    setCurrent(ring);
    fillDisc(x, y, (badge.r + 4) * k, put);
    setCurrent(table.id({ kind: 'css', value: badge.color }, 1));
    fillDisc(x, y, badge.r * k, put);
  }
}

function drawHud(
  frame: FrameSnapshot,
  root: Affine,
  k: number,
  select: (tint: Tint, opacity?: number) => boolean,
  put: Put,
  inkTint: () => Tint,
): void {
  const hud = frame.hud;
  const p = hud.primitives;
  if (!p || hud.opacity <= 0) return;
  const pen = Math.max(0.5, (hud.strokeWidth * k) / 2);
  const at = (x: number, y: number): [number, number] => [
    root[0] * x + root[2] * y + root[4],
    root[1] * x + root[3] * y + root[5],
  ];

  for (const a of p.arcs) {
    if (a.r <= 0.1 || !select(inkTint(), a.opacity * hud.opacity)) continue;
    const [cx, cy] = at(a.x, a.y);
    strokeArc(cx, cy, a.r * k, a.start, a.end, Math.max(0.5, (a.width * k) / 2), put);
  }
  for (const t of p.ticks) {
    if (!select(inkTint(), t.opacity * hud.opacity)) continue;
    const [x1, y1] = at(t.x1, t.y1);
    const [x2, y2] = at(t.x2, t.y2);
    strokePolyline(new Float64Array([x1, y1, x2, y2]), 2, false, pen, put);
  }
  for (const bar of p.bars) {
    if (!select(inkTint(), bar.opacity * hud.opacity)) continue;
    const [x0, y0] = at(bar.x, bar.y);
    const x1 = x0 + bar.w * k;
    const y1 = y0 + bar.h * k;
    const c0 = Math.ceil(x0 - 0.5);
    const c1 = Math.ceil(x1 - 0.5);
    const r0 = Math.ceil(y0 - 0.5);
    const r1 = Math.ceil(y1 - 0.5);
    // A bar thinner than a cell still gets one, where its middle is.
    const cols = c1 > c0 ? [c0, c1] : [Math.floor((x0 + x1) / 2), Math.floor((x0 + x1) / 2) + 1];
    const rowsRange = r1 > r0 ? [r0, r1] : [Math.floor((y0 + y1) / 2), Math.floor((y0 + y1) / 2) + 1];
    for (let row = rowsRange[0]!; row < rowsRange[1]!; row++) {
      for (let col = cols[0]!; col < cols[1]!; col++) put(col, row);
    }
  }
  for (const s of p.strokes) {
    if (!select(inkTint(), s.opacity * hud.opacity)) continue;
    for (const line of s.lines) {
      const xy = new Float64Array(line.length * 2);
      for (let i = 0; i < line.length; i++) {
        const [x, y] = at(line[i]![0], line[i]![1]);
        xy[i * 2] = x;
        xy[i * 2 + 1] = y;
      }
      strokePolyline(xy, line.length, false, pen, put);
    }
  }
  for (const pip of p.pips) {
    if (!select(inkTint(), pip.opacity * hud.opacity)) continue;
    const [x, y] = at(pip.x, pip.y);
    fillDisc(x, y, pip.r * k, put);
  }
}
