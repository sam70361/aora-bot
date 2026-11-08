import {
  DEFAULT_STYLE_ID,
  castMember,
  getStyle,
  getTheme,
  themeDefault,
  type CastId,
} from '@aora-bot/engine';
import { DEFAULT_FACE, type Preset } from './share.js';
import { AVATAR_ORIGIN, ELEMENT_SCRIPT, SNIPPET_SIZE_PX, type SnippetFormat } from './snippet.js';

/*
 * Snippets for a theme's card, named by its member rather than spelled out by
 * shape and colour. A module of its own so that the console, which never
 * shows a theme's card, does not carry it.
 */

/** A theme's member as the theme draws it, in the state on screen. */
export interface ThemedCard {
  theme: string;
  member: CastId;
  /** The member's look under the theme, with the state on screen. */
  preset: Preset;
}

/**
 * The card as props or attributes, named by its member: the member supplies
 * its own shape, colour and face, so only what the theme changes from those
 * and what differs from the component's defaults is written.
 */
function themedFields(card: ThemedCard): [name: string, value: string][] {
  const { preset } = card;
  const member = castMember(card.member);
  const fields: [string, string][] = [];
  if (member?.shape !== preset.shape) fields.push(['shape', preset.shape]);
  if (member?.color !== preset.color) fields.push(['color', preset.color]);
  if (preset.style !== DEFAULT_STYLE_ID) fields.push(['style', preset.style]);
  if (preset.variant !== getStyle(preset.style).defaultVariant) fields.push(['variant', preset.variant]);
  if (preset.state !== 'idle') fields.push(['state', preset.state]);
  if ((member?.face ?? DEFAULT_FACE) !== preset.face) fields.push(['face', preset.face]);
  return fields;
}

const REACT_NAMES: Record<string, string> = { style: 'styleId' };
const HTML_NAMES: Record<string, string> = { style: 'style-id' };

const themedProps = (card: ThemedCard): string[] => [
  `preset="${card.member}"`,
  ...themedFields(card).map(([name, value]) => `${REACT_NAMES[name] ?? name}="${value}"`),
];

const themedAttributes = (card: ThemedCard): string[] => [
  `character="${card.member}"`,
  ...themedFields(card).map(([name, value]) => `${HTML_NAMES[name] ?? name}="${value}"`),
];

/**
 * The card as a link to the avatar endpoint. `theme` fills every parameter
 * the link leaves out, so only a state other than the theme's own is written.
 */
export function themedAvatarUrlFor(card: ThemedCard): string {
  const url = new URL(`/avatar/${card.member}.svg`, AVATAR_ORIGIN);
  url.searchParams.set('theme', card.theme);
  const theme = getTheme(card.theme);
  if (!theme || card.preset.state !== themeDefault(theme.state))
    url.searchParams.set('state', card.preset.state);
  return url.toString();
}

/** What the chip shows for a theme's card. */
export function themedLineFor(format: SnippetFormat, card: ThemedCard): string {
  if (format === 'react') return `<CharacterMark ${themedProps(card).join(' ')} />`;
  if (format === 'html') return `<aora-bot ${themedAttributes(card).join(' ')}></aora-bot>`;
  return themedAvatarUrlFor(card);
}

/** What copying a theme's card gives. A named member loads its theme by itself, so no theme import is written. */
export function themedCopyFor(format: SnippetFormat, card: ThemedCard): string {
  if (format === 'react') {
    return [
      `import { CharacterMark } from '@aora-bot/react';`,
      `import '@aora-bot/react/styles.css';`,
      ``,
      `<CharacterMark`,
      ...themedProps(card).map((prop) => `  ${prop}`),
      `  sizePx={${SNIPPET_SIZE_PX}}`,
      `/>`,
    ].join('\n');
  }
  if (format === 'html') {
    const tag = `<aora-bot ${[...themedAttributes(card), `size="${SNIPPET_SIZE_PX}"`].join(' ')}></aora-bot>`;
    return [ELEMENT_SCRIPT, tag].join('\n');
  }
  return themedAvatarUrlFor(card);
}
