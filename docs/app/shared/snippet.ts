import { DEFAULT_STYLE_ID, getStyle } from '@aora-bot/engine';
import { DEFAULT_FACE, type Preset } from './share.js';

/** The size every copied React snippet renders at. */
const SNIPPET_SIZE_PX = 96;

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
