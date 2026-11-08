import { LINE_TOKEN } from '../../core/palette.js';
import { CENTER, SHAPE_SPACE } from '../../core/types.js';
import type { FrameSnapshot } from '../../sim/snapshot.js';
import { node, r2, type SceneNode } from '../scene.js';
import { faceText, kaomoji, measureEms, wrapperFor } from './table.js';

/** The kaomoji series' parameters, as `resolveStyleOptions` hands them over. */
export interface KaomojiOptions {
  /** Font weight of the text. */
  weight: number;
  /** Whether the mood's mark after the closing bracket is written. */
  tail: boolean;
}

export const KAOMOJI_DEFAULTS: Readonly<KaomojiOptions> = { weight: 500, tail: true };

/**
 * The parameters from a resolved options bag. The registry has already
 * clamped and defaulted them, but a renderer can be handed any record by
 * someone calling its factory directly, so a missing key falls back too.
 */
export function readKaomojiOptions(raw: Record<string, unknown>): KaomojiOptions {
  const weight = raw.weight;
  const tail = raw.tail;
  return {
    weight: typeof weight === 'number' && Number.isFinite(weight) ? weight : KAOMOJI_DEFAULTS.weight,
    tail: typeof tail === 'boolean' ? tail : KAOMOJI_DEFAULTS.tail,
  };
}

/** Text is a font, not a path: these are looked up on the host and fall back to any sans-serif. */
const FONT_FAMILY = "ui-sans-serif, system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif";

/** The line is sized to fill this much of shape space, and never beyond `MAX_FONT`. */
const FILL = 0.92;
const MAX_FONT = 72;

/** The `bubble` variant's plate: padding as a fraction of the font size, and how strong the tint is. */
const PLATE_PAD = { x: 0.55, y: 0.5 };
const PLATE_OPACITY = 0.12;

/** A body paint as a single colour: a gradient ink writes its first stop. The text is a line on the page. */
export function inkOf(frame: FrameSnapshot): string {
  const ink = frame.ink;
  if (!ink) return LINE_TOKEN;
  return 'flat' in ink ? ink.flat : ink.from;
}

/**
 * One snapshot as a scene: the line of text, carried by the body's transform
 * so every behaviour that moves a body (a hop, a squash, a tilt) moves the
 * text. The face, the belts, the dials and the particles have no picture here:
 * the text is the whole character.
 */
export function buildKaomojiScene(
  frame: FrameSnapshot,
  ink: string,
  options: KaomojiOptions,
  sourceId?: string,
): SceneNode {
  const b = frame.body;
  const [open, close] = wrapperFor(frame.shape);
  const text = options.tail
    ? kaomoji(frame.shape, frame.state, frame.face.style)
    : `${open}${faceText(frame.state, frame.face.style)}${close}`;
  const ems = measureEms(text);
  const size = Math.min(MAX_FONT, (SHAPE_SPACE * FILL) / Math.max(ems, 1));

  const scale = frame.shapeScale;
  const placed = `translate(${CENTER} ${CENTER}) scale(${r2(scale)}) translate(${-CENTER} ${-CENTER})`;
  const moved = `translate(${r2(b.x)} ${r2(b.y)}) rotate(${r2(b.rotation)} ${CENTER} ${CENTER}) translate(${CENTER} ${CENTER}) scale(${r2(b.scaleX)} ${r2(b.scaleY)}) translate(${-CENTER} ${-CENTER})`;

  const children: SceneNode[] = [];
  if (frame.variant === 'bubble') {
    const width = ems * size + size * PLATE_PAD.x * 2;
    const height = size * (1 + PLATE_PAD.y);
    children.push(
      node('rect', {
        x: r2(CENTER - width / 2),
        y: r2(CENTER - height / 2),
        width: r2(width),
        height: r2(height),
        rx: r2(height / 2),
        fill: ink,
        opacity: PLATE_OPACITY,
      }),
    );
  }
  children.push(
    node(
      'text',
      {
        x: CENTER,
        y: CENTER,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-family': FONT_FAMILY,
        'font-size': r2(size),
        'font-weight': options.weight,
        fill: ink,
      },
      undefined,
      { text },
    ),
  );

  return node('g', { id: sourceId || undefined, transform: placed }, [
    node('g', { transform: moved }, children),
  ]);
}
