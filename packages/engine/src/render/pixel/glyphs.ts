/**
 * The two belt objects as polygons, for the rasteriser.
 *
 * `motion/glyphs.ts` draws them as curves, which is right for a vector style
 * and useless to a grid: at six cells tall a rounded cap and a tapered stem
 * are the same few cells as a rectangle and a trapezoid. These are those
 * rectangles and trapezoids, in the same proportions, centred on the origin
 * with a total height of 1.
 */
export const PIXEL_GLYPHS: Record<'pencil' | 'bang', readonly (readonly number[])[]> = {
  pencil: [
    // Eraser cap, then a gap, then barrel and tip.
    [-0.135, -0.5, 0.135, -0.5, 0.135, -0.35, -0.135, -0.35],
    [-0.135, -0.29, 0.135, -0.29, 0.135, 0.26, 0, 0.5, -0.135, 0.26],
  ],
  bang: [
    // Stem, widest at the crown, and the dot.
    [-0.1, -0.5, 0.1, -0.5, 0.065, 0.16, -0.065, 0.16],
    [-0.11, 0.28, 0.11, 0.28, 0.11, 0.5, -0.11, 0.5],
  ],
};
