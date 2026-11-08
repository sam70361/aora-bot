/**
 * A live character drawn in layers, in the DOM: the stack of boxes and SVGs
 * the scene's layers (`SceneLayers`) are written into, the HTML boxes the
 * animated groups are lifted onto, and the stylesheet a page's characters
 * share for their keyframes.
 *
 * Only a character that plays a theme's decorations or motions, or wears a
 * theme's skin, is drawn in layers, so this is the extras' and not the
 * core's: the core draws its own characters in one tree.
 */
import type { FrameSnapshot } from '../../sim/snapshot.js';
import type { SceneNode } from '../../render/scene.js';
import type { SceneLayers } from '../../render/vector/build.js';
import type { ExtrasStage, FigureWrap } from '../extras-hook.js';
import { K } from './kit.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XHTML_NS = 'http://www.w3.org/1999/xhtml';
const FILL = 'position:absolute;inset:0;width:100%;height:100%';
const n3 = (v: number): number => Math.round(v * 1000) / 1000;

/* ------------------------------------------------------------------ sheet */

/**
 * One `<style>` per document or shadow root, in its head or at the root,
 * which every character adds its keyframes to once. A rule is never taken
 * out: the keyframes are named by a hash of their frames, so a page only
 * ever has as many as its themes have distinct motions, and a character
 * that comes back finds its own still there.
 */
const MARK = 'data-aora-motion';

interface Sheet {
  style: HTMLStyleElement;
  rules: Set<string>;
}

const sheets = new WeakMap<Node, Sheet>();

function sheetFor(root: Node): Sheet | null {
  let sheet = sheets.get(root);
  if (sheet?.style.isConnected) return sheet;
  const doc = root.ownerDocument ?? (root as Document);
  const parent =
    typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot
      ? root
      : (doc.head ?? doc.documentElement);
  if (!parent) return null;
  const style = doc.createElement('style');
  style.setAttribute(MARK, '');
  parent.appendChild(style);
  sheet = { style, rules: new Set() };
  sheets.set(root, sheet);
  return sheet;
}

/**
 * Make sure the stylesheet of the document or shadow root `element` is in
 * has every one of `rules`. Nothing happens while the element is not in a
 * document: it is asked again on its next frame.
 */
export function shareRules(element: Element, rules: readonly string[]): void {
  if (rules.length === 0 || !element.isConnected) return;
  const sheet = sheetFor(element.getRootNode());
  if (!sheet) return;
  let added = '';
  for (const rule of rules) {
    if (sheet.rules.has(rule)) continue;
    sheet.rules.add(rule);
    added += rule;
  }
  if (added) sheet.style.appendChild(sheet.style.ownerDocument.createTextNode(added));
}

/* ------------------------------------------------------------------ boxes */

/*
 * A layer as HTML boxes, so the browser composites what plays in CSS (a
 * theme's decorations, a moving piece, an emitter's stream) instead of
 * painting the layer again on every frame.
 *
 * Every group on the way down to a group that plays an animation becomes a
 * box with the group's transform, opacity and style as CSS; whatever does
 * not play is drawn in a small SVG at that point, in the same coordinates.
 * A box's own CSS pixel is a unit of the drawing box, so the keyframes a
 * group plays in SVG play the same on its box. A group with a mask, a
 * filter, a clip or a paint of its own stays SVG, and whatever plays inside
 * it is painted as it plays.
 */
const BOX = 'position:absolute;left:0;top:0;transform-origin:0 0';
/** No viewBox: one user unit is one CSS pixel of the box it is in, and it shows past its corner. */
const DRAWING = 'position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible';
/** What a group may carry and still become a box. */
const LIFTS = new Set(['transform', 'opacity', 'style', 'class']);

/** An SVG transform list as CSS, which needs units and has no rotation about a point. */
export function cssTransform(svg: string): string {
  let out = '';
  for (const [, name, args] of svg.matchAll(/(\w+)\(([^)]*)\)/g)) {
    const v = args!
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    let css: string;
    switch (name) {
      case 'translate':
        css = `translate(${n3(v[0]!)}px,${n3(v[1] ?? 0)}px)`;
        break;
      case 'rotate':
        css =
          v.length >= 3
            ? `translate(${n3(v[1]!)}px,${n3(v[2]!)}px) rotate(${n3(v[0]!)}deg) translate(${n3(-v[1]!)}px,${n3(-v[2]!)}px)`
            : `rotate(${n3(v[0]!)}deg)`;
        break;
      case 'scale':
        css = `scale(${n3(v[0]!)},${n3(v[1] ?? v[0]!)})`;
        break;
      case 'skewX':
      case 'skewY':
        css = `${name}(${n3(v[0]!)}deg)`;
        break;
      case 'matrix':
        css = `matrix(${v.map(n3).join(',')})`;
        break;
      default:
        css = '';
    }
    out += out && css ? ` ${css}` : css;
  }
  return out;
}

const playing = new WeakMap<SceneNode, boolean>();

/**
 * Whether a node, or anything in it, plays a CSS animation or eases a
 * change: an eased group stays the same box whether or not it plays.
 */
function plays(n: SceneNode): boolean {
  let found = playing.get(n);
  if (found === undefined) {
    const style = n.attrs?.style;
    found =
      (typeof style === 'string' && (style.includes('animation:') || style.includes('transition:'))) ||
      (n.children?.some(plays) ?? false);
    playing.set(n, found);
  }
  return found;
}

const liftable = (n: SceneNode): boolean =>
  n.tag === 'g' && Object.keys(n.attrs ?? {}).every((key) => LIFTS.has(key) || key.startsWith('data-'));

function boxOf(group: SceneNode, before = ''): SceneNode {
  const attrs = group.attrs ?? {};
  const style = [BOX];
  const transform = attrs.transform === undefined ? '' : cssTransform(String(attrs.transform));
  if (before || transform) style.push(`transform:${[before, transform].filter(Boolean).join(' ')}`);
  if (attrs.opacity !== undefined) style.push(`opacity:${attrs.opacity}`);
  if (attrs.style !== undefined) style.push(String(attrs.style));
  const own: Record<string, string | number | undefined> = { style: style.join(';') };
  for (const [key, value] of Object.entries(attrs))
    if (key === 'class' || key.startsWith('data-')) own[key] = value;
  return K.node('div', own, boxed(group.children ?? []));
}

/** Children as boxes for what plays, and drawings for each run of what does not. */
function boxed(children: readonly SceneNode[]): SceneNode[] {
  const out: SceneNode[] = [];
  let still: SceneNode[] = [];
  const draw = () => {
    if (still.length > 0) out.push(K.node('svg', { style: DRAWING }, still));
    still = [];
  };
  for (const child of children) {
    if (plays(child) && liftable(child)) {
      draw();
      out.push(boxOf(child));
    } else {
      still.push(child);
    }
  }
  draw();
  return out;
}

const lifted = new WeakMap<SceneNode, { scale: number; node: SceneNode }>();

/**
 * A layer's root group as boxes, its corner at the drawing box's, in a frame
 * `scale` CSS pixels to the unit; the same node for the same layer and scale.
 */
export function inBoxes(group: SceneNode, scale = 1): SceneNode {
  let found = lifted.get(group);
  if (found?.scale !== scale) {
    const shift = `translate(${-K.viewBox.minX}px,${-K.viewBox.minY}px)`;
    found = { scale, node: boxOf(group, scale === 1 ? shift : `scale(${scale}) ${shift}`) };
    lifted.set(group, found);
  }
  return found.node;
}

/* ------------------------------------------------------------------ stack */

/** One layer of a layered character: an SVG of the whole drawing box and its root group. */
interface Layer {
  svg: SVGSVGElement;
  root: SVGGElement;
}

/**
 * A character drawn in layers, in a `<foreignObject>` over the root's own
 * group, which keeps the back layer. Each layer is an SVG of its own in an
 * HTML box, so the browser composites the boxes: the body's motion is a
 * transform of the box that holds its layers, and the figure's own motions
 * are CSS animations of the boxes inside it, so neither paints the textured
 * skin again.
 */
interface Stack {
  /**
   * At the size the character is shown, one unit to the CSS pixel: its own
   * transform undoes the root's viewBox. WebKit paints the composited boxes
   * in a `<foreignObject>` without the SVG's transform, so they are only
   * where every browser shows them when that transform comes to nothing.
   */
  object: SVGForeignObjectElement;
  /**
   * The drawing box at the size it is shown: a layer paints its filters and
   * patterns at the size it is shown, as one tree does, not at the drawing
   * box's to be shrunk after.
   */
  frame: HTMLDivElement;
  /** CSS pixels of the frame per unit of the drawing box. */
  scale: number;
  body: HTMLDivElement;
  /** The boxes the figure's motions play on, outermost first; the layers are in the last. */
  boxes: HTMLDivElement[];
  /** The layers that play in CSS are HTML boxes (`inBoxes`); the others are SVGs. */
  below: HTMLDivElement;
  skin: Layer;
  above: HTMLDivElement;
  face: Layer;
  streams: HTMLDivElement;
  front: Layer;
  decor: HTMLDivElement;
  /** What was last written to the body's box and the figure's, so a still frame writes nothing. */
  transform: string;
  figure: (FigureWrap | undefined)[];
}

function layer(doc: Document, name: string, style: string): Layer {
  const { minX, minY, width, height } = K.viewBox;
  const svg = doc.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  svg.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('style', style);
  svg.setAttribute('data-aora-layer', name);
  const root = doc.createElementNS(SVG_NS, 'g') as SVGGElement;
  svg.appendChild(root);
  return { svg, root };
}

function createStack(doc: Document, scale: number): Stack {
  const { minX, minY, width } = K.viewBox;
  // Unrounded: a frame shown at not quite its own size is resampled, and blurs.
  const side = width * scale;
  const object = doc.createElementNS(SVG_NS, 'foreignObject') as SVGForeignObjectElement;
  object.setAttribute('width', String(side));
  object.setAttribute('height', String(side));
  object.setAttribute(
    'transform',
    scale === 1 ? `translate(${minX} ${minY})` : `translate(${minX} ${minY}) scale(${width / side})`,
  );
  object.setAttribute('style', 'overflow:visible');
  const box = (style: string, name?: string): HTMLDivElement => {
    const div = doc.createElementNS(XHTML_NS, 'div') as HTMLDivElement;
    div.setAttribute('style', style);
    if (name) div.setAttribute('data-aora-layer', name);
    return div;
  };
  const frame = box(`position:relative;width:${side}px;height:${side}px`);
  const body = box(`${FILL};transform-origin:50% 50%;will-change:transform`, 'body');
  const figure = box(FILL);
  const plain = `${FILL};overflow:visible`;
  const stack: Stack = {
    object,
    frame,
    scale,
    body,
    boxes: [figure],
    below: box(FILL, 'below'),
    // A layer of its own, so a face or a moving piece that changes does not paint the skin again.
    skin: layer(doc, 'skin', `${plain};will-change:transform`),
    above: box(FILL, 'above'),
    face: layer(doc, 'face', plain),
    streams: box(FILL, 'streams'),
    front: layer(doc, 'front', plain),
    decor: box(FILL, 'decor'),
    transform: '',
    figure: [],
  };
  figure.append(stack.below, stack.skin.svg, stack.above, stack.face.svg);
  body.append(figure, stack.streams);
  frame.append(body, stack.front.svg, stack.decor);
  object.appendChild(frame);
  return stack;
}

/** The body's spring motion as a transform of the box its layers are in, which turns and stretches about its middle. */
function bodyTransform(frame: FrameSnapshot): string {
  const b = frame.body;
  const share = (frame.shapeScale * 100) / K.viewBox.width;
  return `translate(${n3(b.x * share)}%,${n3(b.y * share)}%) rotate(${n3(b.rotation)}deg) scale(${n3(b.scaleX)},${n3(b.scaleY)})`;
}

/** Give the figure one box per motion it plays, each wrapping the next; a box no motion needs stays and plays none. */
function playFigure(stack: Stack, wanted: readonly FigureWrap[]): void {
  const { boxes } = stack;
  while (boxes.length < wanted.length) {
    const inner = boxes[boxes.length - 1]!;
    const next = inner.ownerDocument.createElementNS(XHTML_NS, 'div') as HTMLDivElement;
    next.setAttribute('style', FILL);
    next.append(...Array.from(inner.childNodes));
    inner.appendChild(next);
    boxes.push(next);
  }
  for (let i = 0; i < boxes.length; i++) {
    const wrap = wanted[i];
    if (stack.figure[i] === wrap) continue;
    stack.figure[i] = wrap;
    const box = boxes[i]!;
    if (wrap) {
      box.setAttribute('class', wrap.class);
      box.setAttribute('style', `${FILL};${wrap.style}`);
    } else {
      box.removeAttribute('class');
      box.setAttribute('style', FILL);
    }
  }
}

/** The layers of one live character, in its root `svg`. */
export function createStage(svg: SVGSVGElement): ExtrasStage {
  let stack: Stack | null = null;
  return {
    draw(frame: FrameSnapshot, layers: SceneLayers, shownPx: number) {
      const scale = shownPx > 0 ? shownPx / K.viewBox.width : 1;
      // The browser keeps a layer that will move at the scale it was first drawn at, so a new size is a new stack.
      if (stack && stack.scale !== scale) {
        stack.object.remove();
        stack = null;
      }
      stack ??= createStack(svg.ownerDocument, scale);
      const s = stack;
      if (s.object.parentNode !== svg) svg.appendChild(s.object);
      K.sync(s.below, inBoxes(layers.below, scale));
      K.sync(s.skin.root, layers.skin);
      K.sync(s.above, inBoxes(layers.above, scale));
      K.sync(s.face.root, layers.face);
      K.sync(s.streams, inBoxes(layers.streams, scale));
      K.sync(s.front.root, layers.front);
      K.sync(s.decor, inBoxes(layers.decor, scale));
      playFigure(s, layers.figure);
      const transform = bodyTransform(frame);
      if (transform !== s.transform) {
        s.transform = transform;
        s.body.style.transform = transform;
      }
    },
    remove() {
      stack?.object.remove();
    },
    get shown() {
      return stack?.object.parentNode === svg;
    },
  };
}
