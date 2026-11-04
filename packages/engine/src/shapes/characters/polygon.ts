import { loop, type FamilyArt } from './art.js';

export const POLYGON: FamilyArt<'polygon'> = {
  hex: loop('hex'),
  onigiri: {
    body: 'M50 20C58 20 64 25 69 33L85 62C91 73 88 88 73 88H27C12 88 9 73 15 62L31 33C36 25 42 20 50 20Z',
    face: [50, 62],
  },
  // A crown, a girdle and a pavilion with every corner rounded, the bottom tip the most, and the edges
  // bowed a little. The crown is only hinted, by the narrow `inner` highlight.
  gem: {
    body: loop('gem').body,
    parts: [
      { tone: 'inner', d: 'M42 28H58Q62 28 63 31L67 36Q68 39 65 39H35Q32 39 33 36L37 31Q38 28 42 28Z' },
    ],
    face: [50, 60],
  },
};
