import type { StaticColorScheme } from '../core/options.js';
/** One rule of a static SVG's `<style>`: the properties that differ between light and dark. */
export interface SchemeRule {
  selector: string;
  decls: { prop: string; light: string; dark: string }[];
}

const block = (rule: SchemeRule, pick: (d: SchemeRule['decls'][number]) => string, indent: string): string =>
  `${indent}${rule.selector} { ${rule.decls.map((d) => `${d.prop}: ${pick(d)};`).join(' ')} }`;

/**
 * The `<style>` that switches a static SVG's ink between light and dark, or
 * `''` when there are no rules.
 *
 * `system` follows the OS through a `prefers-color-scheme` media query, which
 * is right for an `<img>` or a data URL: there the SVG is its own document and
 * cannot see the page. `page` writes `light-dark()` instead, which the
 * inherited `color-scheme` resolves, so an SVG inlined into a page with its own
 * theme switch follows the page rather than the OS.
 *
 * `base` says the light value is not already written in the markup (a custom
 * property on the root, unlike a `fill` attribute), so `system` has to declare
 * it before the media query overrides it. `page` never needs it: one rule
 * carries both values.
 */
export function schemeStyle(scheme: StaticColorScheme, rules: SchemeRule[], base: boolean): string {
  if (rules.length === 0) return '';
  const lines: string[] = [];
  if (scheme === 'page') {
    for (const rule of rules) lines.push(block(rule, (d) => `light-dark(${d.light}, ${d.dark})`, '    '));
  } else {
    if (base) for (const rule of rules) lines.push(block(rule, (d) => d.light, '    '));
    lines.push('    @media (prefers-color-scheme: dark) {');
    for (const rule of rules) lines.push(block(rule, (d) => d.dark, '      '));
    lines.push('    }');
  }
  return `<style>\n${lines.join('\n')}\n  </style>`;
}

/**
 * The flat palette ink, as a custom property on the root.
 *
 * Not a gradient with two equal stops: a gradient in `objectBoundingBox` units
 * paints nothing on a path with no height, and a dial's tick or a mouth's flat
 * line is exactly that.
 */
export function paletteInk(
  scheme: StaticColorScheme,
  uid: string,
  light: string,
  dark: string,
  extra: SchemeRule['decls'] = [],
): string {
  return schemeStyle(
    scheme,
    [{ selector: `.${uid}`, decls: [{ prop: `--${uid}-ink`, light, dark }, ...extra] }],
    true,
  );
}
