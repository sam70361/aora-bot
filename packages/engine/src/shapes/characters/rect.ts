import type { FamilyArt } from './art.js';

export const RECT: FamilyArt<'rect'> = {
  tofu: {
    body: 'M28 32H72Q86 32 86 46V74Q86 88 72 88H28Q14 88 14 74V46Q14 32 28 32Z',
    face: [50, 61],
  },
  pill: {
    body: 'M36 36H64A24 24 0 0 1 64 84H36A24 24 0 0 1 36 36Z',
    face: [50, 60],
  },
};
