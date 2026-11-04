/*
 * One clipboard call, and one length for the "copied" acknowledgement.
 *
 * `navigator.clipboard` rejects rather than throws when a page is not focused
 * or the permission is denied, and a copy button that silently does nothing is
 * worse than one that says it failed — so the promise is resolved to a boolean
 * the caller has to look at.
 */

/** Copy `text`, reporting whether it landed. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * How long a copy button keeps saying "Copied".
 *
 * Long enough to be read after the eye has moved back to the code, short
 * enough that the button is offering its own label again before the reader
 * wants to press it twice.
 */
export const COPIED_RESET_MS = 1600;
