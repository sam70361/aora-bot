import type { SceneNode } from './scene.js';

export const SVG_NS = 'http://www.w3.org/2000/svg';
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

/** What was last written to each element, so a frame only touches what changed. */
const written = new WeakMap<Element, Map<string, string>>();
/** The node each element was last made to look like: a scene hands a kept node over again for a part that did not change. */
const synced = new WeakMap<Element, SceneNode>();

/**
 * Make `el` look like `node`: attributes, text and children. A `div` node is
 * an HTML element, so a layered scene can hold SVG in HTML boxes.
 *
 * Children are matched by position and tag. Lists in a scene (particles, HUD
 * primitives, belt dots) change length every frame, and reusing the nodes
 * that are still wanted keeps allocation near zero in steady state; a tag
 * mismatch at some position replaces just that one node.
 */
export function syncElement(el: Element, node: SceneNode): void {
  if (synced.get(el) === node) return;
  synced.set(el, node);
  let prev = written.get(el);
  if (!prev) {
    prev = new Map();
    written.set(el, prev);
  }

  const attrs = node.attrs ?? {};
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined) continue;
    const next = String(value);
    if (prev.get(key) !== next) {
      el.setAttribute(key, next);
      prev.set(key, next);
    }
  }
  for (const key of prev.keys()) {
    if (attrs[key] === undefined) {
      el.removeAttribute(key);
      prev.delete(key);
    }
  }

  if (node.text !== undefined) {
    if (el.textContent !== node.text) el.textContent = node.text;
    return;
  }
  syncChildren(el, node.children ?? []);
}

export function syncChildren(parent: Element, nodes: readonly SceneNode[]): void {
  while (parent.childElementCount > nodes.length) parent.lastElementChild!.remove();

  // A sibling walk, not `children[i]`: a live collection is slow to index.
  let child = parent.firstElementChild;
  for (const wanted of nodes) {
    if (child && synced.get(child) === wanted) {
      child = child.nextElementSibling;
      continue;
    }
    if (!child || child.localName !== wanted.tag) {
      // A layered scene's boxes are HTML; everything else a scene draws is SVG.
      const fresh = document.createElementNS(wanted.tag === 'div' ? XHTML_NS : SVG_NS, wanted.tag);
      if (child) child.replaceWith(fresh);
      else parent.appendChild(fresh);
      child = fresh;
    }
    syncElement(child, wanted);
    child = child.nextElementSibling;
  }
}

export function createSvgElement<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag);
}
