import type { FamilyArt } from './art.js';

export const COAL: FamilyArt<'coal'> = {
  // A lump of coal: ten flat faces meeting at blunt corners, each corner rounded off by 5. The broken, uneven
  // edge is the whole idea; it stays a lump rather than a gem because no two faces are the same length.
  chunk: {
    body: 'M18.7 44.8Q20 40 23 36L29 28Q32 24 36.6 22.1L47.4 17.9Q52 16 56.8 17.4L67.2 20.6Q72 22 74.8 26.2L81.2 35.8Q84 40 84.5 45L85.5 57Q86 62 83.4 66.3L76.6 77.7Q74 82 69.1 83.2L54.9 86.8Q50 88 45.2 86.7L32.8 83.3Q28 82 25.1 77.9L16.9 66.1Q14 62 15.3 57.2Z',
    face: [50, 56],
  },
  // A rounder ball of coal: fourteen short faces at radii between 34 and 39, rounded off by 7, so the edge is
  // bumpy all the way round without a corner anywhere.
  lump: {
    body: 'M46.6 16.2Q53.6 16.2 60.4 17.6L63 18.1Q69.8 19.6 73.9 25.3L75.3 27.3Q79.4 33 83.2 38.9L84.9 41.3Q88.7 47.2 86.8 53.9L86 56.7Q84.1 63.5 80.8 69.7L79.8 71.7Q76.5 77.8 70 80.5L68.1 81.3Q61.6 84 55.1 86.4L52.7 87.3Q46.2 89.8 39.9 86.8L37.5 85.7Q31.2 82.7 25.4 78.8L23 77.1Q17.2 73.2 16.4 66.2L16.1 63.3Q15.3 56.3 15.1 49.3L15.1 47.2Q14.9 40.2 18.9 34.5L20.2 32.6Q24.2 26.9 29.6 22.4L31.6 20.7Q37 16.3 44 16.2Z',
    face: [50, 54],
  },
};
