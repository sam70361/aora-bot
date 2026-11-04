import type { FamilyArt } from './art.js';

export const CRITTER: FamilyArt<'critter'> = {
  cat: {
    body: 'M24 42L21 17L41 30C47 28.5 53 28.5 59 30L79 17L76 42C84 49 88 56 88 64C88 80 72 88 50 88C28 88 12 80 12 64C12 56 16 49 24 42Z',
    face: [50, 62],
  },
  bunny: {
    body: 'M50 34C72 34 86 50 86 66C86 80 72 88 50 88C28 88 14 80 14 66C14 50 28 34 50 34Z',
    parts: [
      { tone: 'body', d: 'M33 44C27 34 25 14 31 9C37 5 43 18 44 38Z' },
      { tone: 'body', d: 'M67 44C73 34 75 14 69 9C63 5 57 18 56 38Z' },
      { tone: 'inner', d: 'M34 36C31 28 30 18 32 14C35 15 38 24 39 35Z' },
      { tone: 'inner', d: 'M66 36C69 28 70 18 68 14C65 15 62 24 61 35Z' },
    ],
    face: [50, 64],
  },
  bear: {
    body: 'M50 28C73 28 88 44 88 62C88 80 72 88 50 88C28 88 12 80 12 62C12 44 27 28 50 28Z',
    parts: [
      { tone: 'body', d: 'M26 17A12 12 0 1 1 26 41A12 12 0 1 1 26 17Z' },
      { tone: 'body', d: 'M74 17A12 12 0 1 1 74 41A12 12 0 1 1 74 17Z' },
      { tone: 'inner', d: 'M26 24A6 6 0 1 1 26 36A6 6 0 1 1 26 24Z' },
      { tone: 'inner', d: 'M74 24A6 6 0 1 1 74 36A6 6 0 1 1 74 24Z' },
    ],
    face: [50, 63],
  },
  chick: {
    body: 'M50 24C72 24 86 40 86 60C86 78 72 88 50 88C28 88 14 78 14 60C14 40 28 24 50 24Z',
    parts: [
      { tone: 'body', d: 'M41.6 23.6A3.8 8.5 -25 1 1 48.4 20.4A3.8 8.5 -25 1 1 41.6 23.6Z' },
      { tone: 'body', d: 'M52.6 19.4A3.8 8 25 1 1 59.4 22.6A3.8 8 25 1 1 52.6 19.4Z' },
      { tone: 'body', d: 'M7.2 63.5A7 12 -12 1 1 20.8 60.5A7 12 -12 1 1 7.2 63.5Z' },
      { tone: 'body', d: 'M79.2 60.5A7 12 12 1 1 92.8 63.5A7 12 12 1 1 79.2 60.5Z' },
      { tone: 'body', d: 'M29 90A9 4.5 0 1 1 47 90A9 4.5 0 1 1 29 90Z' },
      { tone: 'body', d: 'M53 90A9 4.5 0 1 1 71 90A9 4.5 0 1 1 53 90Z' },
    ],
    face: [50, 58],
  },
  penguin: {
    body: 'M50 14C72 14 84 32 84 56C84 78 72 90 50 90C28 90 16 78 16 56C16 32 28 14 50 14Z',
    parts: [
      { tone: 'body', d: 'M19.1 44.5A16 7.5 105 1 1 10.9 75.5A16 7.5 105 1 1 19.1 44.5Z' },
      { tone: 'body', d: 'M80.9 44.5A16 7.5 75 1 1 89.1 75.5A16 7.5 75 1 1 80.9 44.5Z' },
      { tone: 'inner', d: 'M33 72A17 16 0 1 1 67 72A17 16 0 1 1 33 72Z' },
    ],
    face: [50, 36],
  },
  // A wide head with two ears folded out to the sides (nothing like the cat's points or the bear's discs) and a
  // big pale `inner` snout where the mouth is. The face is fitted above the snout.
  pig: {
    body: 'M50 28C73 28 88 44 88 62C88 80 72 88 50 88C28 88 12 80 12 62C12 44 27 28 50 28Z',
    parts: [
      { tone: 'body', d: 'M46 32C38 24 26 20 15 25C13 33 19 43 30 44Z' },
      { tone: 'body', d: 'M54 32C62 24 74 20 85 25C87 33 81 43 70 44Z' },
      { tone: 'inner', d: 'M30 71A20 13.5 0 1 1 70 71A20 13.5 0 1 1 30 71Z' },
    ],
    face: [50, 58],
  },
  // A round body with two tall, round-tipped ears and a big brush of a tail curling up beside it. The tail is body
  // ink, so the silhouette is a fox (not a second cat) even in `outline`; the ear linings, the tail tip and the
  // chin are the pale `inner` details.
  fox: {
    body: 'M44 32C64 32 76 47 76 64C76 80 63 88 44 88C25 88 12 80 12 64C12 47 24 32 44 32Z',
    parts: [
      { tone: 'body', d: 'M16 50C14 38 15 26 20 18C22 15 25 14 28 16C33 21 38 29 40 36Z' },
      { tone: 'body', d: 'M72 50C74 38 73 26 68 18C66 15 63 14 60 16C55 21 50 29 48 36Z' },
      { tone: 'inner', d: 'M21 38C20 31 21 25 24 21C27 24 30 29 32 34Z' },
      { tone: 'inner', d: 'M67 38C68 31 67 25 64 21C61 24 58 29 56 34Z' },
      { tone: 'body', d: 'M62 86C78 88 92 78 95 62C97 52 95 43 91 37C87 45 81 51 75 55C70 59 66 66 64 72Z' },
      { tone: 'inner', d: 'M91 37C94 41 96 48 96 55C92 54 88 50 86 45Z' },
      { tone: 'inner', d: 'M22 76C28 71 36 71 44 76C52 71 60 71 66 76C64 84 55 88 44 88C33 88 24 84 22 76Z' },
    ],
    face: [44, 60],
  },
};
