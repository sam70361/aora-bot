import type { FamilyArt } from './art.js';

export const OBJECT: FamilyArt<'object'> = {
  // Walls (60 x 42) under a pitched roof and a chimney. The roof and the chimney are `hair`, so the outlined
  // variants keep them; a round `inner` window sits in the gable.
  cottage: {
    body: 'M75.8 31.6L88.7 43A4 4 0 0 1 86 50H82.5A2.5 2.5 0 0 0 80 52.4V82A6 6 0 0 1 74 88H26A6 6 0 0 1 20 82V52A2.5 2.5 0 0 0 17.5 50H14A4 4 0 0 1 11.3 43L47.3 11A4 4 0 0 1 52.7 11L60.8 18.3A2.5 2.5 0 0 0 65 16.4V14A2 2 0 0 1 67 12H73A2 2 0 0 1 75 14V30A2.5 2.5 0 0 0 75.8 31.6Z',
    parts: [
      {
        tone: 'hair',
        d: 'M75.8 31.6L88.7 43A4 4 0 0 1 86 50H14A4 4 0 0 1 11.3 43L47.3 11A4 4 0 0 1 52.7 11L60.8 18.3A2.5 2.5 0 0 0 65 16.4V14A2 2 0 0 1 67 12H73A2 2 0 0 1 75 14V30A2.5 2.5 0 0 0 75.8 31.6Z',
      },
      { tone: 'inner', d: 'M54.2 33A4.2 4.2 0 0 1 45.8 33A4.2 4.2 0 0 1 54.2 33Z' },
    ],
    face: [50, 69],
  },
  // A rounded rectangle (80 x 58, corners r 24) with a tail at the bottom left, filleted into it.
  chat: {
    body: 'M19.1 69.8A24 24 0 0 1 10 51V41A24 24 0 0 1 34 17H66A24 24 0 0 1 90 41V51A24 24 0 0 1 66 75H43.7A5 5 0 0 0 40.5 76.2L21.6 91.9A2.5 2.5 0 0 1 17.6 89.4L20.9 74.9A5 5 0 0 0 19.1 69.8Z',
    face: [50, 46],
  },
  // A box (64 x 54) under a wider lid in `hair`, and a `leaf` bow on top: two loops, a knot and two short tails
  // over the lid.
  gift: {
    body: 'M82 50.2V85A6 6 0 0 1 76 91H24A6 6 0 0 1 18 85V50.2A3 3 0 0 0 16.2 47.5A5.5 5.5 0 0 1 13 42.5V37.5A5.5 5.5 0 0 1 18.5 32H81.5A5.5 5.5 0 0 1 87 37.5V42.5A5.5 5.5 0 0 1 83.8 47.5A3 3 0 0 0 82 50.2Z',
    parts: [
      {
        tone: 'hair',
        d: 'M81.5 32A5.5 5.5 0 0 1 87 37.5V42.5A5.5 5.5 0 0 1 81.5 48H18.5A5.5 5.5 0 0 1 13 42.5V37.5A5.5 5.5 0 0 1 18.5 32H81.5Z',
      },
      {
        tone: 'leaf',
        d: 'M48.3 35.7L45 41.6A3.4 3.4 0 1 1 39.1 38.2L41.9 33.9A2 2 0 0 0 40.2 30.8L35.3 31A8 8 0 1 1 40.1 16.8L46.4 22A2 2 0 0 0 48.3 22.3A5 5 0 0 1 51.7 22.3A2 2 0 0 0 53.6 22L59.9 16.8A8 8 0 1 1 64.7 31L59.8 30.8A2 2 0 0 0 58.1 33.9L60.9 38.2A3.4 3.4 0 1 1 55 41.6L51.7 35.7A2 2 0 0 0 48.3 35.7Z',
      },
    ],
    face: [50, 69],
  },
  // A round glass (r 30) on a tapered neck, and a screw base in `hair` with a pale `inner` thread; an `inner`
  // glint sits on the glass.
  bulb: {
    body: 'M41 89A4 4 0 0 1 37 85V77A4 4 0 0 1 37.3 75.5A3 3 0 0 0 37.5 73.6L35.7 65.5A3 3 0 0 0 34.3 63.6A30 30 0 0 1 20 38A30 30 0 0 1 80 38A30 30 0 0 1 65.7 63.6A3 3 0 0 0 64.3 65.5L62.5 73.6A3 3 0 0 0 62.7 75.5A4 4 0 0 1 63 77V85A4 4 0 0 1 59 89A3 3 0 0 0 56 92A2 2 0 0 1 54 93H46A2 2 0 0 1 44 91A3 3 0 0 0 41 89Z',
    parts: [
      {
        tone: 'hair',
        d: 'M62.5 74A3 3 0 0 0 62.7 75.5A4 4 0 0 1 63 77V85A4 4 0 0 1 59 89A3 3 0 0 0 56 92A2 2 0 0 1 54 93H46A2 2 0 0 1 44 91A3 3 0 0 0 41 89A4 4 0 0 1 37 85V77A4 4 0 0 1 37.3 75.5A3 3 0 0 0 37.5 74H62.5Z',
      },
      { tone: 'inner', d: 'M41.5 81.2A1.2 1.2 0 0 1 41.5 78.8H58.5A1.2 1.2 0 0 1 58.5 81.2H41.5Z' },
      { tone: 'inner', d: 'M25.1 36A25 25 0 0 1 46 13.3V19.4A24 24 0 0 0 30.8 36H25.1Z' },
    ],
    face: [50, 39],
  },
};
