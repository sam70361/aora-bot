import { defineConfig } from '@rslib/core';
import { reactLib } from '../../scripts/build-shared.ts';

export default defineConfig({
  source: {
    tsconfigPath: './tsconfig.build.json',
  },
  lib: [
    {
      ...reactLib,
      id: 'client',
      dts: true,
      source: {
        entry: {
          index: './src/index.ts',
          styles: './src/styles/index.css',
        },
      },
      // Everything on the main entry touches the DOM or React state, so it is
      // a client boundary under the Next App Router.
      banner: { js: "'use client';" },
    },
    {
      ...reactLib,
      id: 'static',
      dts: true,
      source: {
        entry: {
          static: './src/static.ts',
        },
      },
      // Deliberately no banner. This entry exists so a Server Component can
      // render avatars; marking it a client boundary would defeat the point.
    },
  ],
});
