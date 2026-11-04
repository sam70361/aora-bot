import type { FamilyArt } from './art.js';

export const SEA: FamilyArt<'sea'> = {
  // A round body (rx 33, ry 30) and a plump forked tail (30 wide, 57 tall) at the back. The face sits on the
  // front half of the body. The tail is the whole idea: big enough to read at 16 px.
  fish: {
    body: 'M9 52A33 30 0 1 1 75 52A33 30 0 1 1 9 52Z',
    parts: [
      {
        tone: 'body',
        d: 'M64 52C70 44 76 34 86 26C93 21 97 26 96 33C95 40 91 46 91 52C91 58 95 64 96 71C97 78 93 83 86 78C76 70 70 60 64 52Z',
      },
    ],
    face: [38, 52],
  },
  // A round head (r 31) over four tapering tentacles whose tips curl outward and up: the curl is what says octopus
  // rather than jellyfish or ghost. The outer pair leaves the head low on its sides, the inner pair from under it,
  // with gaps of 4 or more between them so they stay apart at 24 px.
  octopus: {
    body: 'M19 38A31 31 0 1 1 81 38A31 31 0 1 1 19 38Z',
    parts: [
      {
        tone: 'body',
        d: 'M23.1 51L21 56.8L18.9 62.1L16.8 66.5L14.8 70L13 72.3L11.6 73.5L10.3 74L8 73.5L6 73L4 73.5L2.5 75L2 77L2.5 79L4 80.5L8.9 82.8L14.3 82.9L19.3 80.9L23.5 77.5L27.2 73.2L30.6 68.3L33.8 62.8L36.9 57Z',
      },
      {
        tone: 'body',
        d: 'M36 59.6L35.9 65.2L35.5 70.2L34.9 74.6L34 78.1L32.9 80.8L31.7 82.7L30.2 83.8L28 84.5L26.2 85L24.9 86.3L24.5 88L25 89.8L26.3 91.1L28 91.5L32.7 91.1L36.9 89.1L40.2 85.9L42.7 81.9L44.7 77.2L46.1 72L47.2 66.4L48 60.4Z',
      },
      {
        tone: 'body',
        d: 'M52 60.4L52.8 66.4L53.9 72L55.3 77.2L57.3 81.9L59.8 85.9L63.1 89.1L67.3 91.1L72 91.5L73.7 91.1L75 89.8L75.5 88L75.1 86.3L73.8 85L72 84.5L69.8 83.8L68.3 82.7L67.1 80.8L66 78.1L65.1 74.6L64.5 70.2L64.1 65.2L64 59.6Z',
      },
      {
        tone: 'body',
        d: 'M63.1 57L66.2 62.8L69.4 68.3L72.8 73.2L76.5 77.5L80.7 80.9L85.7 82.9L91.1 82.8L96 80.5L97.5 79L98 77L97.5 75L96 73.5L94 73L92 73.5L89.7 74L88.4 73.5L87 72.3L85.2 70L83.2 66.5L81.1 62.1L79 56.8L76.9 51Z',
      },
    ],
    face: [50, 40],
  },
};
