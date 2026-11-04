/**
 * A tiny retained scene: the one description of "what is on screen" that both
 * a live renderer and a static one are built from.
 *
 * A style builds a tree of `SceneNode`s from a frame snapshot. The live
 * renderer reconciles that tree into real DOM, touching only what changed;
 * the static renderer serialises it to a string. Because both consume the
 * same tree, a belt or a HUD is described exactly once per style.
 */
import { roundTo } from '../math/round.js';

export type AttrValue = string | number | undefined;

export interface SceneNode {
  tag: string;
  /** Attributes in the order they should be written. `undefined` means absent. */
  attrs?: Record<string, AttrValue>;
  children?: SceneNode[];
  /** Text content, for `<text>`. */
  text?: string;
  /**
   * A group that exists so a list has a stable parent in the DOM. The string
   * form has no use for it and splices its children into the parent.
   */
  fragment?: boolean;
  /**
   * How the string form lays out children.
   * - `inline` (default): straight after one another, no whitespace.
   * - `block`: one per line, indented, closing tag on its own line.
   * - `hang`: one per line, but the closing tag follows the last child directly.
   */
  layout?: 'inline' | 'block' | 'hang';
}

export const node = (
  tag: string,
  attrs?: Record<string, AttrValue>,
  children?: SceneNode[],
  extra?: Pick<SceneNode, 'fragment' | 'layout' | 'text'>,
): SceneNode => ({ tag, attrs, children, ...extra });

/** Attribute precision shared by every renderer: two decimals. */
export const r2 = (n: number): number => roundTo(n, 2);

const ATTRIBUTE_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '"': '&quot;',
  '<': '&lt;',
  '>': '&gt;',
};

/**
 * Make a string safe inside a double-quoted attribute.
 *
 * Callers pass colours, which are usually `#hex` or `var(--token)`. But a
 * colour can come from user settings, and `"` or `<` in one would otherwise
 * close the attribute and inject markup into an SVG that may be inlined.
 */
export function escapeAttribute(value: string): string {
  return value.replace(/[&"<>]/g, (c) => ATTRIBUTE_ESCAPES[c] ?? c);
}

export function escapeText(value: string): string {
  return value.replace(/[&<]/g, (c) => (c === '&' ? '&amp;' : '&lt;'));
}

/** Children with fragments spliced in, recursively. */
function expand(children: readonly SceneNode[] | undefined): SceneNode[] {
  const out: SceneNode[] = [];
  for (const child of children ?? []) {
    if (child.fragment) out.push(...expand(child.children));
    else out.push(child);
  }
  return out;
}

/** Serialise a node to markup. `indent` is the column its opening tag sits at. */
export function serializeNode(n: SceneNode, indent = 0): string {
  let open = `<${n.tag}`;
  for (const [key, value] of Object.entries(n.attrs ?? {})) {
    if (value !== undefined) open += ` ${key}="${escapeAttribute(String(value))}"`;
  }

  const children = expand(n.children);
  if (children.length === 0 && n.text === undefined) return `${open}/>`;
  if (n.text !== undefined) return `${open}>${escapeText(n.text)}</${n.tag}>`;

  const layout = n.layout ?? 'inline';
  if (layout === 'inline') {
    return `${open}>${children.map((c) => serializeNode(c, indent)).join('')}</${n.tag}>`;
  }
  const pad = ' '.repeat(indent + 2);
  const body = children.map((c) => `\n${pad}${serializeNode(c, indent + 2)}`).join('');
  return layout === 'block'
    ? `${open}>${body}\n${' '.repeat(indent)}</${n.tag}>`
    : `${open}>${body}</${n.tag}>`;
}
