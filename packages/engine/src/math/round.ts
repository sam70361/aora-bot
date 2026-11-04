/**
 * Round to a number of decimal places.
 *
 * One function with a precision argument, because every renderer needs the
 * same operation at a different cost-to-accuracy point: attribute values are
 * kept to two places, path coordinates to three, and a projection matrix to
 * four, since a matrix entry multiplies a coordinate worth hundreds.
 */
export const roundTo = (n: number, decimals = 2): number => {
  const k = 10 ** decimals;
  return Math.round(n * k) / k;
};
