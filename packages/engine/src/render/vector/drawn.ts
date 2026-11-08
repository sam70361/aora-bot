/**
 * Drawn faces as vector nodes.
 *
 * Every layer is a filled outline with a paint role; the variant decides
 * what each role is painted with (`DrawnPalette`, resolved in `build.ts`
 * beside the cute face's own colours), so a drawn face picks up a variant's
 * treatment without knowing which variant it is in.
 */
import {
  getFaceDesign,
  type DrawnFaceGeometry,
  type DrawnShape,
  type FaceLayer,
  type FacePaint,
  type Rgb,
} from '../../face/drawn/index.js';
import type { TangentTransform } from '../../math/pose.js';
import { tangentTransformString } from '../../math/pose.js';
import { polylinePath } from '../../math/polyline.js';
import { node, r2, type SceneNode } from '../scene.js';

/** What each paint role is in the current variant. */
export interface DrawnPalette {
  paint(role: FacePaint, light?: Rgb): string;
  /** The rim a plate gets on a body that is a line, or `null` where plates need none. */
  rim: { paint: string; width: number } | null;
}

/** A light colour as CSS. */
export const lightCss = ([r, g, b]: Rgb): string => `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;

const ringsPath = (rings: FaceLayer['rings']): string =>
  rings.map((ring) => polylinePath(ring, true)).join('');

function layerNode(
  layer: FaceLayer,
  transform: TangentTransform,
  alpha: number,
  palette: DrawnPalette,
): SceneNode {
  const rim = layer.plate ? palette.rim : null;
  return node('path', {
    d: ringsPath(layer.rings),
    transform: tangentTransformString(transform),
    fill: palette.paint(layer.paint, layer.light),
    'fill-rule': layer.holes ? 'evenodd' : undefined,
    stroke: rim?.paint,
    'stroke-width': rim ? r2(rim.width) : undefined,
    'stroke-linejoin': rim ? 'round' : undefined,
    opacity: r2(Math.min(1, layer.opacity * alpha)),
  });
}

function shapeNodes(shape: DrawnShape | undefined, alpha: number, palette: DrawnPalette): SceneNode[] {
  if (!shape || !shape.visible) return [];
  return shape.layers.map((layer) => layerNode(layer, shape.transform, alpha, palette));
}

/** A drawn face's plates and eyes, each design faded by its share of the face. */
export function drawnEyeNodes(
  drawn: readonly DrawnFaceGeometry[],
  alpha: number,
  palette: DrawnPalette,
): SceneNode[] {
  return drawn.flatMap((d) => [
    ...shapeNodes(d.plate, d.opacity * alpha, palette),
    ...shapeNodes(d.left, d.opacity * alpha, palette),
    ...shapeNodes(d.right, d.opacity * alpha, palette),
  ]);
}

/**
 * The mouth's paint while faces share the face: each face's own mouth paint
 * — the plain face's for the share no drawn design holds (`plain`), each
 * design's for its own — mixed by those shares, so a switch from a white
 * mouth to a dark one passes through the colours between.
 */
export function drawnMouthPaint(
  drawn: readonly DrawnFaceGeometry[],
  plainShare: number,
  plain: string,
  palette: DrawnPalette,
): string {
  const shares = [
    { paint: plain, weight: plainShare },
    ...drawn.map((d) => ({ paint: palette.paint(getFaceDesign(d.style).mouthPaint), weight: d.opacity })),
  ].filter((s) => s.weight > 0.001);
  if (shares.length === 0) return plain;
  let paint = shares[0]!.paint;
  let weight = shares[0]!.weight;
  for (const next of shares.slice(1)) {
    const total = weight + next.weight;
    if (next.paint !== paint) {
      const pct = Math.round((next.weight / total) * 100);
      paint =
        pct >= 100 ? next.paint : pct <= 0 ? paint : `color-mix(in oklab, ${paint}, ${next.paint} ${pct}%)`;
    }
    weight = total;
  }
  return paint;
}

/** What a drawn face puts inside its mouth, carried by the mouth's own transform. */
export function drawnMouthNodes(
  drawn: readonly DrawnFaceGeometry[],
  mouth: { transform: TangentTransform; visible: boolean } | undefined,
  alpha: number,
  palette: DrawnPalette,
): SceneNode[] {
  if (!mouth?.visible) return [];
  return drawn.flatMap((d) =>
    (d.inMouth ?? []).map((layer) => layerNode(layer, mouth.transform, d.opacity * alpha, palette)),
  );
}
