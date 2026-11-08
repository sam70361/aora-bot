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
  // A half avocado: a top circle (r 27) over two lobes (r 23), joined by shallow fillets. The skin and the green
  // flesh under it are two bands of even width that follow the edge, and the round `hair` pit sits low, so the face
  // has the top to itself.
  avocado: {
    body: 'M23.3 39.3A27 27 0 1 1 76.7 39.3A9 9 0 0 0 80.1 47.8A23 23 0 0 1 70.7 88.5L58.3 91.1A40 40 0 0 1 41.7 91.1L29.3 88.5A23 23 0 0 1 19.9 47.8A9 9 0 0 0 23.3 39.3Z',
    parts: [
      {
        tone: 'leaf',
        d: 'M25.8 38.9A24.5 24.5 0 1 1 74.2 38.9A11.5 11.5 0 0 0 78.5 49.8A20.5 20.5 0 0 1 70.2 86.1L57.7 88.7A37.5 37.5 0 0 1 42.3 88.7L29.8 86.1A20.5 20.5 0 0 1 21.5 49.8A11.5 11.5 0 0 0 25.8 38.9L29.8 38.2A15.5 15.5 0 0 1 23.9 52.9A16.5 16.5 0 0 0 30.6 82.1L43.1 84.8A33.5 33.5 0 0 0 56.9 84.8L69.4 82.1A16.5 16.5 0 0 0 76.1 52.9A15.5 15.5 0 0 1 70.2 38.2A20.5 20.5 0 1 0 29.8 38.2L25.8 38.9Z',
      },
      {
        tone: 'hair',
        d: 'M23.3 39.3A27 27 0 1 1 76.7 39.3A9 9 0 0 0 80.1 47.8A23 23 0 0 1 70.7 88.5L58.3 91.1A40 40 0 0 1 41.7 91.1L29.3 88.5A23 23 0 0 1 19.9 47.8A9 9 0 0 0 23.3 39.3L25.8 38.9A11.5 11.5 0 0 1 21.5 49.8A20.5 20.5 0 0 0 29.8 86.1L42.3 88.7A37.5 37.5 0 0 0 57.7 88.7L70.2 86.1A20.5 20.5 0 0 0 78.5 49.8A11.5 11.5 0 0 1 74.2 38.9A24.5 24.5 0 1 0 25.8 38.9L23.3 39.3Z',
      },
      { tone: 'hair', d: 'M40 75.5A10 10 0 1 1 60 75.5A10 10 0 1 1 40 75.5Z' },
      { tone: 'inner', d: 'M42.9 74A3.3 2.1 -35 1 1 48.3 70.2A3.3 2.1 -35 1 1 42.9 74Z' },
    ],
    face: [50, 46],
  },
  // A wedge of watermelon: a flat top over a deep round belly. The rind is a `leaf` band and the pale flesh inside
  // it an `inner` band, both following the edge; three `hair` seeds sit low, well clear of the eyes.
  melon: {
    body: 'M7 35A5 5 0 0 1 12 30H88A5 5 0 0 1 93 35V42A23 23 0 0 1 90.2 53L78.1 75.3A32 32 0 0 1 21.9 75.3L9.8 53A23 23 0 0 1 7 42Z',
    parts: [
      {
        tone: 'leaf',
        d: 'M93 37V42A23 23 0 0 1 90.2 53L78.1 75.3A32 32 0 0 1 21.9 75.3L9.8 53A23 23 0 0 1 7 42V37H12.7A18 18 0 0 0 14.2 50.6L26.3 72.9A27 27 0 0 0 73.7 72.9L85.8 50.6A18 18 0 0 0 87.3 37Z',
      },
      {
        tone: 'inner',
        d: 'M87.3 37A18 18 0 0 1 85.8 50.6L73.7 72.9A27 27 0 0 1 26.3 72.9L14.2 50.6A18 18 0 0 1 12.7 37H16.4A14.5 14.5 0 0 0 17.3 48.9L29.3 71.2A23.5 23.5 0 0 0 70.7 71.2L82.7 48.9A14.5 14.5 0 0 0 83.6 37Z',
      },
      { tone: 'hair', d: 'M27.2 61.5A2.3 3.5 40 1 1 30.8 64.5A2.3 3.5 40 1 1 27.2 61.5Z' },
      { tone: 'hair', d: 'M47.7 79A2.3 3.5 0 1 1 52.3 79A2.3 3.5 0 1 1 47.7 79Z' },
      { tone: 'hair', d: 'M69.2 64.5A2.3 3.5 -40 1 1 72.8 61.5A2.3 3.5 -40 1 1 69.2 64.5Z' },
    ],
    face: [50, 54],
  },
};
