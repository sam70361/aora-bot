import type { FamilyArt } from './art.js';

export const GARDEN: FamilyArt<'garden'> = {
  sprout: {
    body: 'M50 34C72 34 86 50 86 66C86 80 72 88 50 88C28 88 14 80 14 66C14 50 28 34 50 34Z',
    parts: [
      {
        tone: 'leaf',
        d: 'M51 35C50 25 54 17 62 14C69 12 75 14 77 15C76 23 69 30 60 31C56 31 53 32 51 35Z',
      },
      { tone: 'leaf', d: 'M49 35C47 29 41 25 33 25C32 31 38 35 47 36Z' },
    ],
    face: [50, 64],
  },
  // A wide cap over a short stalk, and nothing else: spots on the cap sat at eye height and read as more eyes.
  mushroom: {
    body: 'M50 20C74 20 91 34 91 52C91 60 84 64 74 64C70 64 68 66 68 70V78C68 86 62 90 50 90C38 90 32 86 32 78V70C32 66 30 64 26 64C16 64 9 60 9 52C9 34 26 20 50 20Z',
    face: [50, 52],
  },
  // A round-bottomed nut under a cap that overhangs it by 10 on each side. The cap is body ink, so the overhang
  // is in the outline too, with a lighter `inner` crown inset in it, and a stub of stalk on top.
  acorn: {
    body: 'M16 36H84C86 62 74 90 50 90C26 90 14 62 16 36Z',
    parts: [
      { tone: 'body', d: 'M45 20V9Q45 5 50 5Q55 5 55 9V20Z' },
      { tone: 'body', d: 'M6 38C6 24 26 18 50 18C74 18 94 24 94 38C94 42 91 44 87 44H13C9 44 6 42 6 38Z' },
      {
        tone: 'inner',
        d: 'M11 37C11 27 28 22.5 50 22.5C72 22.5 89 27 89 37C89 38.5 88 39.5 86.5 39.5H13.5C12 39.5 11 38.5 11 37Z',
      },
    ],
    face: [50, 68],
  },
  // A fat column (44 wide, round top) with two thick arms (12) that go out and up, one higher than the other.
  // The slits between arm and column are 10 wide so they stay open at 24 px. A tall, flat-seated body: it tips little.
  cactus: {
    body: 'M28 32A22 22 0 0 1 72 32V80Q72 90 62 90H38Q28 90 28 80Z',
    parts: [
      { tone: 'body', d: 'M32 58H18V42A6 6 0 0 0 6 42V62Q6 70 14 70H32Z' },
      { tone: 'body', d: 'M68 46H82V32A6 6 0 0 1 94 32V50Q94 58 86 58H68Z' },
    ],
    face: [50, 54],
  },
  // A narrow top (r 14) flaring through long fillets into two lobes (r 21), like a pear, under a `leaf` cap that
  // hangs down in three soft points and a thick slanted stalk.
  eggplant: {
    body: 'M38.1 31.4A14 14 0 1 1 65.8 32.3A18 18 0 0 0 74.5 50.8A21 21 0 0 1 63.2 90L37.2 89A21 21 0 0 1 28.4 49.3A18 18 0 0 0 38.1 31.4Z',
    parts: [
      {
        tone: 'leaf',
        d: 'M32.5 46.4A18 18 0 0 0 38.1 31.4A14 14 0 1 1 65.8 32.3A18 18 0 0 0 70.4 47.5A3.5 3.5 0 0 1 67 46.3L64 42.5A2.5 2.5 0 0 0 60.1 42.5L54.9 49.2A3.5 3.5 0 0 1 49.3 49.1L44.8 42.6A2.5 2.5 0 0 0 40.9 42.3L37.4 46.2A3.5 3.5 0 0 1 32.5 46.4Z',
      },
      { tone: 'leaf', d: 'M56.1 24.7L59.1 10.7A3.2 3.2 0 0 0 52.9 9.3L49.9 23.3A3.2 3.2 0 0 0 56.1 24.7Z' },
    ],
    face: [51, 68],
  },
};
