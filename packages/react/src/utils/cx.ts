/**
 * Join class names, dropping the falsy ones.
 *
 * Deliberately not a dependency: every component in the kit needs this and
 * nothing else from that family of helpers, and a library that pulls in a
 * package to concatenate strings is a library that has to be audited for it.
 */
export const cx = (...values: (string | false | null | undefined)[]): string =>
  values.filter(Boolean).join(' ');
