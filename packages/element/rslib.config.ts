import { defineConfig } from '@rslib/core';

export default defineConfig({
  source: {
    // Points at the build config so declaration output is rooted at `src`.
    tsconfigPath: './tsconfig.build.json',
  },
  lib: [
    {
      id: 'library',
      format: 'esm',
      syntax: 'es2022',
      dts: true,
      source: {
        entry: {
          index: './src/index.ts',
        },
      },
      output: {
        target: 'web',
      },
    },
    {
      // One file that carries the engine with it, for a `<script type="module">` tag.
      id: 'cdn',
      format: 'esm',
      syntax: 'es2022',
      autoExternal: false,
      source: {
        entry: {
          'aora-bot': './src/cdn.ts',
        },
      },
      output: {
        target: 'web',
        minify: true,
      },
    },
  ],
});
