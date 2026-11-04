import { defineConfig } from '@rslib/core';

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
  },
});
