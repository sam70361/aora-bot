import { DEFAULT_STYLE_ID, getStyle } from '@aora-bot/engine';
import { DEFAULT_FACE, type Preset } from './share.js';

/** The size every copied React and HTML snippet renders at. */
const SNIPPET_SIZE_PX = 96;

const AVATAR_ORIGIN = 'https://aora-bot.vercel.app';
const ELEMENT_SCRIPT = `<script type="module" src="https://cdn.jsdelivr.net/npm/@aora-bot/element"></script>`;

const literal = (value: unknown): string => (typeof value === 'string' ? `'${value}'` : String(value));

/**
 * What the character on screen needs written down; anything at the
 * component's default is left out, so the snippet is the shortest thing that
 * produces the character.
 */
function propsFor(preset: Preset): string[] {
  const props = [`shape="${preset.shape}"`, `color="${preset.color}"`];
  if (preset.style !== DEFAULT_STYLE_ID) props.push(`styleId="${preset.style}"`);
  if (preset.variant !== getStyle(preset.style).defaultVariant) props.push(`variant="${preset.variant}"`);
  if (preset.state !== 'idle') props.push(`state="${preset.state}"`);
  if (preset.face !== DEFAULT_FACE) props.push(`face="${preset.face}"`);
  const params = Object.entries(preset.params);
  if (params.length > 0) {
    props.push(`styleOptions={{ ${params.map(([key, value]) => `${key}: ${literal(value)}`).join(', ')} }}`);
  }
  return props;
}

/** The one-line tag, for the chip that sits next to the character. */
export const tagFor = (preset: Preset): string => `<CharacterMark ${propsFor(preset).join(' ')} />`;

/**
 * The preset as a `CharacterMark`, with the imports it needs.
 *
 * It is generated from the same preset the character on the page is drawn
 * from, so what is copied is the character that was built.
 */
export function snippetFor(preset: Preset): string {
  return [
    `import { CharacterMark } from '@aora-bot/react';`,
    `import '@aora-bot/react/styles.css';`,
    ``,
    `<CharacterMark`,
    ...propsFor(preset).map((prop) => `  ${prop}`),
    `  sizePx={${SNIPPET_SIZE_PX}}`,
    `/>`,
  ].join('\n');
}

/** The same character as an `<aora-bot>` element, on one line. */
export function htmlTagFor(preset: Preset, extra: string[] = []): string {
  const attributes = [`shape="${preset.shape}"`, `color="${preset.color}"`];
  if (preset.style !== DEFAULT_STYLE_ID) attributes.push(`style-id="${preset.style}"`);
  if (preset.variant !== getStyle(preset.style).defaultVariant)
    attributes.push(`variant="${preset.variant}"`);
  if (preset.state !== 'idle') attributes.push(`state="${preset.state}"`);
  if (preset.face !== DEFAULT_FACE) attributes.push(`face="${preset.face}"`);
  if (Object.keys(preset.params).length > 0)
    attributes.push(`style-options='${JSON.stringify(preset.params)}'`);
  return `<aora-bot ${[...attributes, ...extra].join(' ')}></aora-bot>`;
}

/** The element's script and the tag, ready to paste into a page. */
export const htmlSnippetFor = (preset: Preset): string =>
  [ELEMENT_SCRIPT, htmlTagFor(preset, [`size="${SNIPPET_SIZE_PX}"`])].join('\n');

/**
 * The preset as a link to the avatar endpoint.
 *
 * The state is always written: the endpoint draws the resting face, which is
 * not what `idle` looks like, when none is given.
 */
export function avatarUrlFor(preset: Preset): string {
  const url = new URL(`/avatar/${preset.shape}-${preset.color}.svg`, AVATAR_ORIGIN);
  const query = url.searchParams;
  query.set('shape', preset.shape);
  query.set('color', preset.color);
  if (preset.face !== DEFAULT_FACE) query.set('face', preset.face);
  if (preset.style !== DEFAULT_STYLE_ID) query.set('style', preset.style);
  if (preset.variant !== getStyle(preset.style).defaultVariant) query.set('variant', preset.variant);
  query.set('state', preset.state);
  for (const [key, value] of Object.entries(preset.params)) query.set(key, String(value));
  return url.toString();
}

export type SnippetFormat = 'react' | 'html' | 'avatar';

export const SNIPPET_FORMATS: readonly SnippetFormat[] = ['react', 'html', 'avatar'];

/** What the chip shows for a format: the character's own markup, or its link, on one line. */
export function lineFor(format: SnippetFormat, preset: Preset): string {
  return format === 'react' ? tagFor(preset) : format === 'html' ? htmlTagFor(preset) : avatarUrlFor(preset);
}

/** What copying gives: the whole snippet, imports and script included, or the link itself. */
export function copyFor(format: SnippetFormat, preset: Preset): string {
  return format === 'react'
    ? snippetFor(preset)
    : format === 'html'
      ? htmlSnippetFor(preset)
      : avatarUrlFor(preset);
}
