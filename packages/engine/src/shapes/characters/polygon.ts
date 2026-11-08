import { loop, type FamilyArt } from './art.js';

export const POLYGON: FamilyArt<'polygon'> = {
  hex: loop('hex'),
  onigiri: {
    body: 'M50 20C58 20 64 25 69 33L85 62C91 73 88 88 73 88H27C12 88 9 73 15 62L31 33C36 25 42 20 50 20Z',
    face: [50, 62],
  },
  // A crown, a girdle and a pavilion with every corner rounded, the bottom tip the most, and the edges
  // bowed a little.
  gem: {
    body: loop('gem').body,
    face: [50, 60],
  },
};
