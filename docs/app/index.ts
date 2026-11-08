/*
 * The app pages, registered for mdx as `@app` (see `builderConfig.resolve.alias`
 * in `rspress.config.ts`). `theme/` is only the Rspress shell and the components
 * embedded in documentation; the pages below are applications that happen to be
 * served by the same site.
 *
 * Each page has an entry of its own — `@app` for the home page, `@app/sponsor`
 * and `@app/themes` — because a route's chunk is built from what its mdx
 * imports, and one barrel for every page would load them all with each.
 */
export { Home } from './home/Home.js';
