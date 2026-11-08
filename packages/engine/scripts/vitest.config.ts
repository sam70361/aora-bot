import { defineConfig } from 'vitest/config';
import { themeAlias } from '../vitest.config.js';

/** Runs the engine's generator scripts, which are kept out of the test run. */
export default defineConfig({
  resolve: { alias: [themeAlias] },
  test: { include: ['scripts/generate-*.ts'] },
});
