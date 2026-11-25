/**
 * Check the frontmatter of every page before the site is built.
 *
 * Rspress swallows a frontmatter it cannot parse: the page builds with none,
 * so a `pageType: custom` page silently falls back to the doc layout and the
 * build still passes. An unquoted `: ` inside a description is enough. This
 * parses every page with the parser Rspress uses and fails the build instead.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { grayMatter } from '@rspress/shared/gray-matter';

const here = dirname(fileURLToPath(import.meta.url));
const docs = resolve(here, '..');
const content = join(docs, 'content');

/** The page types Rspress knows (`PageType` in `@rspress/shared`). */
const PAGE_TYPES = new Set(['home', 'doc', 'doc-wide', 'custom', '404', 'blank']);

const pages = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pages(path);
    return /\.mdx?$/.test(entry.name) ? [path] : [];
  });

/** Where a YAML error points, as a line of the page: the YAML starts on the opening `---` line, after the dashes. */
const lineOf = (error: unknown): number | undefined => {
  const line = (error as { mark?: { line?: number } }).mark?.line;
  return typeof line === 'number' ? line + 1 : undefined;
};

const problems: string[] = [];
const files = pages(content);

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  if (!/^---\r?\n/.test(source)) continue;
  const name = relative(docs, file).replaceAll('\\', '/');
  let data: Record<string, unknown>;
  try {
    data = grayMatter(source).data;
  } catch (error) {
    const line = lineOf(error);
    const reason = (error as { reason?: string }).reason ?? String(error);
    problems.push(`${name}${line ? `:${line}` : ''}: the frontmatter is not valid YAML (${reason}).`);
    continue;
  }
  const { pageType } = data;
  if (pageType !== undefined && !PAGE_TYPES.has(String(pageType))) {
    problems.push(`${name}: unknown pageType "${String(pageType)}".`);
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  console.error(
    `\n${problems.length} page(s) with a broken frontmatter. Quote a value that contains ": " or starts with a special character.`,
  );
  process.exit(1);
}

console.log(`Frontmatter: ${files.length} pages checked.`);
