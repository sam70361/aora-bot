/**
 * Generate API metadata from the library's TypeScript sources.
 *
 * Props tables written by hand drift the moment someone adds an optional prop
 * and forgets the docs. Reading them out of the compiler means the table is
 * either correct or the build fails.
 *
 * Output: theme/generated/api.json
 */
import ts from 'typescript';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ApiData, ApiSource, ComponentEntry, PropEntry, ValueEntry } from '../api-schema.js';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');

const ENTRIES = [
  resolve(repo, 'packages/react/src/index.ts'),
  resolve(repo, 'packages/surfaces/src/index.ts'),
  resolve(repo, 'packages/engine/src/index.ts'),
];

const program = ts.createProgram(ENTRIES, {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  strict: true,
  skipLibCheck: true,
});

const checker = program.getTypeChecker();

/** Strip the leading asterisks and normalise whitespace in a doc comment. */
function docOf(symbol: ts.Symbol | undefined): string {
  if (!symbol) return '';
  return ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
}

function tagOf(symbol: ts.Symbol | undefined, name: string): string | undefined {
  const tag = symbol?.getJsDocTags(checker).find((t) => t.name === name);
  return tag ? ts.displayPartsToString(tag.text ?? []).trim() : undefined;
}

/** Render a type as source text, collapsing whitespace so it fits a table cell. */
function typeText(type: ts.Type): string {
  return checker
    .typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.InTypeAlias)
    .replace(/\s+/g, ' ');
}

/** Pull the default value out of a destructuring pattern in a function signature. */
function defaultsFromComponent(sourceFile: ts.SourceFile, componentName: string): Record<string, string> {
  const defaults: Record<string, string> = {};

  const visit = (node: ts.Node): void => {
    const isTarget =
      (ts.isFunctionDeclaration(node) && node.name?.text === componentName) ||
      (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === componentName);

    if (isTarget) {
      const fn = resolveFunction(node);
      const param = fn?.parameters[0];

      if (param && ts.isObjectBindingPattern(param.name)) {
        for (const element of param.name.elements) {
          if (element.initializer && ts.isIdentifier(element.name)) {
            defaults[element.name.text] = element.initializer.getText(sourceFile);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return defaults;
}

function resolveFunction(node: ts.Node): ts.SignatureDeclaration | null {
  if (ts.isFunctionDeclaration(node)) return node;
  if (!ts.isVariableDeclaration(node) || !node.initializer) return null;

  const { initializer } = node;
  return ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer) ? initializer : null;
}

function collectProps(interfaceSymbol: ts.Symbol, defaults: Record<string, string>): PropEntry[] {
  const type = checker.getDeclaredTypeOfSymbol(interfaceSymbol);
  const fallback = interfaceSymbol.valueDeclaration ?? interfaceSymbol.declarations?.[0];

  return checker
    .getPropertiesOfType(type)
    .filter((prop) => !prop.getName().startsWith('_'))
    .flatMap<PropEntry>((prop) => {
      // Without a declaration there is no location to resolve the type at, and
      // a prop we cannot type is worse in the table than one that is absent.
      const location = prop.declarations?.[0] ?? fallback;
      if (!location) return [];

      const propType = checker.getTypeOfSymbolAtLocation(prop, location);
      const optional = (prop.getFlags() & ts.SymbolFlags.Optional) !== 0;

      return [
        {
          name: prop.getName(),
          type: typeText(propType).replace(/ \| undefined$/, ''),
          required: !optional,
          default: defaults[prop.getName()] ?? tagOf(prop, 'default') ?? null,
          description: docOf(prop),
          deprecated: tagOf(prop, 'deprecated') ?? null,
        },
      ];
    })
    .sort((a, b) => {
      if (a.required !== b.required) return a.required ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function sourcePackage(fileName: string): ApiSource {
  if (fileName.includes('packages/engine')) return 'engine';
  if (fileName.includes('packages/surfaces')) return 'surfaces';
  return 'react';
}

const components: Record<string, ComponentEntry> = {};
const values: Record<string, ValueEntry> = {};

for (const entry of ENTRIES) {
  const sourceFile = program.getSourceFile(entry);
  if (!sourceFile) continue;

  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) continue;

  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const resolved = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    const declaration = resolved.declarations?.[0];
    if (!declaration) continue;

    const name = exported.getName();
    const declarationFile = declaration.getSourceFile();

    // Props interfaces become component entries.
    if (ts.isInterfaceDeclaration(declaration) && name.endsWith('Props')) {
      const componentName = name.replace(/Props$/, '');
      components[componentName] = {
        name: componentName,
        description: docOf(resolved),
        props: collectProps(resolved, defaultsFromComponent(declarationFile, componentName)),
      };
      continue;
    }

    // Functions, constants and hooks become reference entries.
    if (
      ts.isFunctionDeclaration(declaration) ||
      ts.isVariableDeclaration(declaration) ||
      ts.isClassDeclaration(declaration)
    ) {
      const type = checker.getTypeOfSymbolAtLocation(resolved, declaration);
      const rendered = typeText(type);
      const isComponent = /^[A-Z]/.test(name) && rendered.includes('Element');

      values[name] = {
        name,
        kind: isComponent
          ? 'component'
          : name.startsWith('use')
            ? 'hook'
            : ts.isFunctionDeclaration(declaration) || rendered.includes('=>')
              ? 'function'
              : 'constant',
        type: rendered,
        description: docOf(resolved),
        source: sourcePackage(declarationFile.fileName),
      };
    }
  }
}

// Attach descriptions from the component function to its props entry, since
// the prose usually lives on the function rather than on the interface.
for (const [name, entry] of Object.entries(components)) {
  if (!entry.description && values[name]?.description) entry.description = values[name].description;
}

const data: ApiData = { components, values };

const out = join(here, '../theme/generated');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'api.json'), `${JSON.stringify(data, null, 2)}\n`, 'utf8');

const componentCount = Object.keys(components).length;
const valueCount = Object.keys(values).length;
const propCount = Object.values(components).reduce((n, c) => n + c.props.length, 0);
console.log(`extract-api: ${componentCount} components (${propCount} props), ${valueCount} other exports`);
