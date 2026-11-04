import type { FamilyArt } from './art.js';

export const FRUIT: FamilyArt<'fruit'> = {
  // A near-circular bulb (r 32) and a smaller top circle (r 17) leaning a little to the right, joined on
  // each side by one concave arc (r 30): a gentle S, a round bottom, nothing like the bell's skirt.
  pear: {
    body: 'M37.1 29A17 17 0 0 1 69.8 32.3A30 30 0 0 0 75.5 45.7A32 32 0 1 1 28.8 41A30 30 0 0 0 37.1 29Z',
    parts: [
      { tone: 'body', d: 'M50 25Q49 17 51.5 12Q54 10 55.5 13Q55 18 56 25Z' },
      { tone: 'leaf', d: 'M55 16C58 8 67 5 75 7C74 16 65 21 56 19Z' },
    ],
    face: [50, 67],
  },
  // Two shoulder lobes (r 20) and a round seat, with a deep dimple between the lobes for the stem; no dimple
  // at the bottom, so it can tip like the rest. The stem is a thick slanted bar (7 wide), the leaf one soft petal.
  apple: {
    body: 'M50 38C54 30 61 25 69 25C83 25 91 36 91 50C91 70 74 90 50 90C26 90 9 70 9 50C9 36 17 25 31 25C39 25 46 30 50 38Z',
    parts: [
      { tone: 'body', d: 'M46.5 40C45 31 46 22 51 14L57 16C53 23 53 31 54 40Z' },
      { tone: 'leaf', d: 'M54 22C58 13 68 10 76 13C75 22 65 26 55 24Z' },
    ],
    face: [50, 62],
  },
  // A plump shield, wide at the shoulders and rounded to a soft tip, under a crown of three leaf ovals; the
  // crown is what makes it a strawberry. Seven `inner` seeds ride the rim, clear of the face.
  strawberry: {
    body: 'M50 31C62 31 76 31 82 35C90 38 92 48 89 58C85 72 70 88 56 91C52.5 91.7 47.5 91.7 44 91C30 88 15 72 11 58C8 48 10 38 18 35C24 31 38 31 50 31Z',
    parts: [
      { tone: 'leaf', d: 'M43.5 26A6.5 11 0 1 1 56.5 26A6.5 11 0 1 1 43.5 26Z' },
      { tone: 'leaf', d: 'M20.9 35.9A13 6 -22 1 1 45.1 26.1A13 6 -22 1 1 20.9 35.9Z' },
      { tone: 'leaf', d: 'M54.9 26.1A13 6 22 1 1 79.1 35.9A13 6 22 1 1 54.9 26.1Z' },
      { tone: 'inner', d: 'M26 46.9A2.2 3.4 -25 1 1 30 45.1A2.2 3.4 -25 1 1 26 46.9Z' },
      { tone: 'inner', d: 'M70 45.1A2.2 3.4 25 1 1 74 46.9A2.2 3.4 25 1 1 70 45.1Z' },
      { tone: 'inner', d: 'M17.3 62.4A2.2 3.4 -40 1 1 20.7 59.6A2.2 3.4 -40 1 1 17.3 62.4Z' },
      { tone: 'inner', d: 'M79.3 59.6A2.2 3.4 40 1 1 82.7 62.4A2.2 3.4 40 1 1 79.3 59.6Z' },
      { tone: 'inner', d: 'M28 75.9A2.2 3.4 -25 1 1 32 74.1A2.2 3.4 -25 1 1 28 75.9Z' },
      { tone: 'inner', d: 'M68 74.1A2.2 3.4 25 1 1 72 75.9A2.2 3.4 25 1 1 68 74.1Z' },
      { tone: 'inner', d: 'M47.8 85A2.2 3.4 0 1 1 52.2 85A2.2 3.4 0 1 1 47.8 85Z' },
    ],
    face: [50, 60],
  },
  // Two circles (r 30 wears the face, r 23 beside it) hung from two thick stalks (6.5 wide) that meet at a leaf.
  // The stalks and the second cherry are body ink behind the body; the face stays on the big one.
  cherry: {
    body: 'M3 67A30 30 0 1 1 63 67A30 30 0 1 1 3 67Z',
    parts: [
      { tone: 'body', d: 'M50 72A23 23 0 1 1 96 72A23 23 0 1 1 50 72Z' },
      { tone: 'body', d: 'M35.7 41.8L54.7 13.8A3.3 3.3 0 0 0 49.3 10.2L30.3 38.2A3.3 3.3 0 0 0 35.7 41.8Z' },
      { tone: 'body', d: 'M75.9 48.5L56.9 10.5A3.3 3.3 0 0 0 51.1 13.5L70.1 51.5A3.3 3.3 0 0 0 75.9 48.5Z' },
      { tone: 'leaf', d: 'M54 14C60 4 74 2 84 8C80 18 66 22 54 16Z' },
    ],
    face: [33, 67],
  },
};
