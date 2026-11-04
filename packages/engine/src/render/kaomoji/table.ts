/**
 * The kaomoji series' vocabulary: what is written for a shape in a state.
 *
 * A character is `wrapper(face)tail`. The wrapper belongs to the shape (a
 * cloud wears a cloud, a ghost its arms), the face and the tail to the state.
 * The faces keep the cute face's grammar: dot eyes for attention, arcs for
 * contentment, crosses for refusal. `kaomoji()` is the plain-text form, for
 * chat lines and terminals; the series draws the same string as SVG `<text>`.
 */
import type { ShapeId } from '../../core/types.js';
import type { CharacterState } from '../../motion/states.js';

/** What goes either side of the face. */
export type Wrapper = readonly [open: string, close: string];

/** The wrapper of a shape that has no entry of its own. */
export const DEFAULT_WRAPPER: Wrapper = ['(', ')'];

/** Wrappers for the shapes that dress up (a few of the roster); every other shape is a plain pair of brackets. */
export const SHAPE_WRAPPERS: Partial<Record<ShapeId, Wrapper>> = {
  cat: ['ฅ(', ')ฅ'],
  bunny: ['૮(', ')ა'],
  bear: ['ʕ', 'ʔ'],
  crescent: ['☾(', ')'],
  gem: ['◇(', ')'],
  clover: ['✤(', ')'],
  bot: ['[', ']'],
  tofu: ['[', ']'],
  ghost: ['༼ ', ' ༽'],
  sprout: ['ʚ(', ')ɞ'],
  cloud: ['☁(', ')'],
  heart: ['♡(', ')'],
  star: ['☆(', ')'],
  flower: ['✿(', ')'],
  onigiri: ['△(', ')'],
  pill: ['⊂(', ')⊃'],
  hex: ['⬡(', ')'],
  leaf: ['❀(', ')'],
  flame: ['♨(', ')'],
  bell: ['♪(', ')'],
  apple: ['◖(', ')◗'],
  strawberry: ['∴(', ')∴'],
  cherry: ['⚬(', ')⚬'],
  acorn: ['⌒(', ')'],
  cactus: ['٩(', ')۶'],
  fish: ['(', ')><'],
  octopus: ['〜(', ')〜'],
  pig: ['∪(', ')∪'],
  fox: ['/(', ')\\'],
  boba: ['◦(', ')◦'],
};

/** The face inside the wrapper, for every state. */
export const STATE_FACES: Record<CharacterState, string> = {
  idle: '・ω・',
  sleeping: '－ω－',
  drowsy: '˘ω˘',
  bored: '・_・',
  waking: '°ω°',
  'powering-down': '－_－',
  listening: '・ᴗ・',
  thinking: '・_・',
  searching: '◉_◉',
  reading: '・‿・',
  writing: '•̀ᴗ•́',
  working: '•̀ᴗ•́',
  loading: '・ᴗ・',
  progress: '•̀ᴗ•́',
  radar: '◉_◉',
  orbit: '・ᴗ・',
  dictating: '・o・',
  uploading: '^▽^',
  sending: '・ᴗ・',
  receiving: '°▽°',
  messaging: '・ᴗ・',
  waiting: '・_・',
  spawning: '°ᴗ°',
  composing: '・ᴗ・',
  dragging: '°o°',
  happy: '^▽^',
  excited: '≧▽≦',
  laughing: 'ᵔ◡ᵔ',
  playful: '^ω~',
  proud: 'ˊᗜˋ',
  celebrate: '★▽★',
  bouncing: '^ᴗ^',
  shy: '〃ω〃',
  sad: '；ω；',
  angry: 'ò_ó',
  confused: '◔_◔',
  suspicious: '¬_¬',
  surprised: '°□°',
  scared: '°△°',
  curious: '・o・',
  humming: '‾ᴗ‾',
  alerting: '°□°',
  notifying: '・▽・',
  refusing: '＞_＜',
};

/** What follows the closing wrapper: the mood's effect, as a mark. Empty when the state has none. */
export const STATE_TAILS: Record<CharacterState, string> = {
  idle: '',
  sleeping: ' zZ',
  drowsy: ' z',
  bored: '',
  waking: ' !',
  'powering-down': ' …',
  listening: '',
  thinking: '?',
  searching: ' ?',
  reading: '',
  writing: ' ✎',
  working: 'و',
  loading: ' …',
  progress: ' …',
  radar: '',
  orbit: '',
  dictating: ' ♪',
  uploading: ' ↑',
  sending: ' ➤',
  receiving: ' ↓',
  messaging: ' ✉',
  waiting: ' …',
  spawning: ' ✧',
  composing: ' ✎',
  dragging: '',
  happy: ' ♪',
  excited: '!',
  laughing: ' ♪',
  playful: ' ~',
  proud: ' ✧',
  celebrate: ' ✧',
  bouncing: ' ~',
  shy: '',
  sad: '',
  angry: ' !',
  confused: '?',
  suspicious: '',
  surprised: '!!',
  scared: ' !',
  curious: ' ?',
  humming: ' ♪',
  alerting: ' !',
  notifying: ' !',
  refusing: ' !',
};

/** The wrapper a shape wears. */
export function wrapperFor(shape: ShapeId): Wrapper {
  return SHAPE_WRAPPERS[shape] ?? DEFAULT_WRAPPER;
}

/** The character as one line of text: `(・ω・)`, `☁(^▽^) ♪`, `ฅ(・ω・)ฅ`. */
export function kaomoji(shape: ShapeId, state: CharacterState): string {
  const [open, close] = wrapperFor(shape);
  return `${open}${STATE_FACES[state]}${close}${STATE_TAILS[state]}`;
}

/**
 * Width of a line in ems, roughly. Glyphs are looked up in whatever font the
 * host has, so this only has to be close enough to size the text to its box:
 * Latin and punctuation are narrow, full-width forms and CJK a whole em, the
 * kaomoji letters (ω, ᴗ, ▽) in between, and combining marks take no room.
 */
export function measureEms(text: string): number {
  let ems = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x300 && code <= 0x36f) continue;
    if (code < 0x250) ems += code === 0x20 ? 0.3 : 0.58;
    else if (code >= 0x2e80 || (code >= 0xff00 && code <= 0xffef)) ems += 1;
    else ems += 0.8;
  }
  return ems;
}
