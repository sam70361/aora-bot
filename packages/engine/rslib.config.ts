import { defineConfig } from '@rslib/core';
import { THEME_MANIFEST } from './src/themes/manifest.ts';

export default defineConfig({
  source: {
    // Points at the build config so declaration output is rooted at `src`.
    // The default config also includes `test`, which pushes every `.d.ts` down
    // into `dist/src/` and leaves the package `types` entry dangling.
    tsconfigPath: './tsconfig.build.json',
    entry: {
      index: './src/index.ts',
      static: './src/static.ts',
      agent: './src/agent.ts',
      labels: './src/labels.ts',
      // Every shipped theme is an entry of its own (`@aora-bot/engine/themes/<id>`).
      ...Object.fromEntries(THEME_MANIFEST.map(({ id }) => [`themes/${id}`, `./src/themes/${id}/index.ts`])),
      // What draws a theme's decorations and motions, shared by the theme entries that bring it.
      'themes/extras': './src/themes/extras/index.ts',
    },
  },
  lib: [
    {
      format: 'esm',
      syntax: 'es2022',
      dts: true,
    },
  ],
  output: {
    target: 'web',
    externals: [
      // A theme loads through the package's own subpath, never bundled into the core's entries.
      /^@aora-bot\/engine\/themes\//,
      // A theme entry reads the extras from their own entry beside it, so a page loads them once for every theme.
      ({ request, context }, callback) => {
        if (request === '../extras/index.js' && context && !/[\\/]themes[\\/]extras$/.test(context)) {
          callback(undefined, './extras.js');
          return;
        }
        callback();
      },
    ],
  },
});
