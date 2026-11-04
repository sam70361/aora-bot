import type { ColorId } from './types.js';

/**
 * The green of a leaf accessory (`ShapePart` tone `leaf`), and the lighter one
 * it takes on a green body so the two do not merge. It is not part of the
 * palette: a leaf is green whatever the character's colour is.
 */
export const LEAF_COLOR = '#34B36B';
export const LEAF_COLOR_ON_GREEN = '#7BCB5A';

export const getLeafColor = (id: ColorId): string => (id === 'green' ? LEAF_COLOR_ON_GREEN : LEAF_COLOR);
