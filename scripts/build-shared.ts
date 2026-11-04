/**
 * Build settings shared by the React packages' rslib configs and the docs
 * site's rspress config, so they cannot drift apart.
 */

/**
 * Browsers that support `light-dark()`, oklch, nesting and container queries.
 *
 * Left to its default targets the CSS transformer rewrites `light-dark()` into
 * a `prefers-color-scheme` switch, which ignores the `color-scheme` the page
 * sets and so breaks the one dark-mode mechanism the tokens rely on. Every
 * stylesheet is therefore shipped as written.
 */
export const BROWSERSLIST = [
  'chrome >= 123',
  'edge >= 123',
  'firefox >= 120',
  'safari >= 17.5',
  'ios_saf >= 17.5',
];

/**
 * The common part of a React package's library build.
 *
 * `jsx: automatic` is explicit because without it the bundle is emitted with
 * `React.createElement` and no `React` binding, which fails at the first render
 * in a consumer: rslib does not read `jsx` from the tsconfig.
 */
export const reactLib = {
  format: 'esm' as const,
  syntax: 'es2022' as const,
  tools: {
    swc: { jsc: { transform: { react: { runtime: 'automatic' as const } } } },
  },
  output: {
    target: 'web' as const,
    cssModules: { auto: false },
    overrideBrowserslist: BROWSERSLIST,
  },
};
