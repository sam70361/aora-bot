import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** A theme's entry resolves to its source, as `tsconfig.json` maps it, so the tests run without a build. */
export const themeAlias = {
  find: /^@aora-bot\/engine\/themes\/(.+)$/,
  replacement: fileURLToPath(new URL('./src/themes/$1/index.ts', import.meta.url)),
};

export default defineConfig({
  resolve: { alias: [themeAlias] },
});
