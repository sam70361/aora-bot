import type { FamilyArt } from './art.js';

/*
 * Cartoon heads: one round face (rx 32, ry 31) under five haircuts. The hair
 * is a `hair` part, so a filled body shows it a step darker and an outlined
 * one fills it in solid, the way a line drawing of a head does. Bangs stop at
 * y 44 and the face sits lower than on a plain circle, so the eyes are always
 * clear of them; what sticks out past the head (a bun, the bob's sides, the
 * spikes) is what tells the five apart at 24 px.
 */
const HEAD = 'M18 56A32 31 0 1 1 82 56A32 31 0 1 1 18 56Z';

export const PEOPLE: FamilyArt<'people'> = {
  // Straight bangs and sides that fall past the jaw, outside the head.
  bob: {
    body: HEAD,
    parts: [
      {
        tone: 'hair',
        d: 'M13 76C11 48 24 20 50 20C76 20 89 48 87 76C86.5 80 82 81 80.5 77.5L79 52C75 46.5 64 44 50 44C36 44 25 46.5 21 52L19.5 77.5C18 81 13.5 80 13 76Z',
      },
    ],
    face: [50, 69],
  },
  // A cap of hair with a round bun on the crown.
  topknot: {
    body: HEAD,
    parts: [
      {
        tone: 'hair',
        d: 'M18 54C18 35 32 23.5 50 23.5C68 23.5 82 35 82 54C76 45 64 41 50 41C36 41 24 45 18 54Z',
      },
      { tone: 'hair', d: 'M39 15A11 11 0 1 1 61 15A11 11 0 1 1 39 15Z' },
    ],
    face: [50, 67],
  },
  // Four rounded spikes standing up off the cap.
  spiky: {
    body: HEAD,
    parts: [
      {
        tone: 'hair',
        d: 'M18 54C18 42 21 35 26 30C22 25 21 19 23 15C29 17 34 20 37 23C38 17 41 11 45 8C49 12 52 17 53 22C57 17 62 13 68 12C68 18 67 23 65 26C71 25 76 25 80 27C79 31 77 34 75 36C79 41 82 47 82 54C76 45 64 41 50 41C36 41 24 45 18 54Z',
      },
    ],
    face: [50, 67],
  },
  // A cloud of curls round the top of the head, bumping out past its edge.
  curly: {
    body: HEAD,
    parts: [
      {
        tone: 'hair',
        d: 'M14 62C9 57 10 49 15 46C12 39 17 31 24 30C25 22 33 17 40 20C44 14 56 14 60 20C67 17 75 22 76 30C83 31 88 39 85 46C90 49 91 57 86 62C83 53 76 46 66 44C61 47 55 47 50 44C45 47 39 47 34 44C24 46 17 53 14 62Z',
      },
    ],
    face: [50, 69],
  },
  // A cap of hair and a round bun low on each side.
  twinbuns: {
    body: HEAD,
    parts: [
      {
        tone: 'hair',
        d: 'M18 54C18 35 32 23.5 50 23.5C68 23.5 82 35 82 54C76 45 64 41 50 41C36 41 24 45 18 54Z',
      },
      { tone: 'hair', d: 'M8 49A9.5 9.5 0 1 1 27 49A9.5 9.5 0 1 1 8 49Z' },
      { tone: 'hair', d: 'M73 49A9.5 9.5 0 1 1 92 49A9.5 9.5 0 1 1 73 49Z' },
    ],
    face: [50, 67],
  },
};
