import { useLang, useSite } from '@rspress/core/runtime';

/**
 * Prefix a site-relative path with the current language.
 *
 * Rspress does this for markdown links at build time, but theme components
 * link at runtime and get no such treatment — the theme `Link` only applies
 * `base`. Reading the default language from site data rather than hard-coding
 * it means swapping the default locale in `rspress.config.ts` needs no
 * follow-up here.
 */
export function useLocalePath(): (path: string) => string {
  const lang = useLang();
  const { site } = useSite();
  const prefix = lang && lang !== site.lang ? `/${lang}` : '';
  return (path) => (path.startsWith('/') ? `${prefix}${path}` : path);
}
