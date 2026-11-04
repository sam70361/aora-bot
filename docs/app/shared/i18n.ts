import { useI18n as useSiteI18n, useLang } from '@rspress/core/runtime';
import type * as messages from 'i18n';

/** Every key in `docs/i18n.json`. */
export type MessageKey = keyof typeof messages;

/**
 * `useI18n` typed against the site's own message file.
 *
 * Rspress leaves the key type open until you hand it the message module; doing
 * that once here means every component gets completion and a compile error on
 * a missing key, instead of each repeating the generic.
 */
export const useI18n = (): ((key: MessageKey, params?: Record<string, string>) => string) =>
  useSiteI18n<typeof messages>();

/** Data that carries both languages, as the engine's cast and emotion tables do. */
export interface Bilingual {
  zh: string;
  en: string;
}

export interface Localized {
  /** The reader's language. */
  pick(text: Bilingual): string;
  /** The other one, for a secondary line. */
  other(text: Bilingual): string;
  /** The reader's language first, with the English gloss after it on a Chinese page. */
  both(text: Bilingual): string;
  /** A name with a gloss in brackets, the bracket style of the reader's language; no gloss if it repeats the name. */
  pair(name: string, gloss: string): string;
}

/**
 * Choose between the two languages of a `{ zh, en }` value.
 *
 * Page copy goes through `useI18n` and `i18n.json`. This is for the data the
 * engine ships in both languages, which has no message key to look up.
 */
export function useLocalized(): Localized {
  const zh = useLang() === 'zh';
  const pair = (name: string, gloss: string) =>
    !gloss || gloss.toLowerCase() === name.toLowerCase()
      ? name
      : zh
        ? `${name}（${gloss}）`
        : `${name} (${gloss})`;
  return {
    pick: (text) => (zh ? text.zh : text.en),
    other: (text) => (zh ? text.en : text.zh),
    both: (text) => (zh ? pair(text.zh, text.en) : text.en),
    pair,
  };
}
