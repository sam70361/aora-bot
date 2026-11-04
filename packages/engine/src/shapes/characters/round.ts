import { loop, type FamilyArt } from './art.js';

export const ROUND: FamilyArt<'round'> = {
  mochi: {
    body: 'M50 26C74 26 88 44 88 63C88 80 73 88 50 88C27 88 12 80 12 63C12 44 26 26 50 26Z',
    face: [50, 60],
  },
  // The plain circle (r 36), seated on the same baseline as the mochi: no flat seat, no peak, nothing to explain.
  circle: {
    body: 'M14 52A36 36 0 1 1 86 52A36 36 0 1 1 14 52Z',
    face: [50, 54],
  },
  blob: loop('blob'),
  pebble: loop('pebble'),
  egg: loop('egg'),
  // A steamed bun: a squat dome drawn up to a soft peak, with three short creases running down from its tip. The
  // peak is in the silhouette, so it is a bun and not a second mochi in every variant; the creases are the
  // filled-variant detail, and stop well above the eyes.
  bun: {
    body: 'M50 27C55 27 58 33 64 37C79 42 90 55 90 69C90 82 74 88 50 88C26 88 10 82 10 69C10 55 21 42 36 37C42 33 45 27 50 27Z',
    parts: [
      { tone: 'inner', d: 'M48.6 31C45.5 35.5 41.5 39.5 36.5 43C42.5 41.5 47 38 50.2 33.5Z' },
      { tone: 'inner', d: 'M51.4 31C54.5 35.5 58.5 39.5 63.5 43C57.5 41.5 53 38 49.8 33.5Z' },
      { tone: 'inner', d: 'M50 31.5C48.4 35 48.4 39 50 43C51.6 39 51.6 35 50 31.5Z' },
    ],
    face: [50, 64],
  },
};
