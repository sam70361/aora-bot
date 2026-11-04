import { loop, type FamilyArt } from './art.js';

export const FIGURE: FamilyArt<'figure'> = {
  star: loop('star'),
  heart: loop('heart'),
  flame: {
    body: 'M50 10C53 26 78 40 80 62C82 80 68 90 50 90C32 90 18 80 20 62C21 52 28 46 33 40C35 48 39 52 43 52C40 36 44 22 50 10Z',
    face: [50, 66],
    leftDX: -2,
  },
  bell: {
    body: 'M50 16C66 16 74 30 74 46C74 60 82 68 88 76C91 81 88 86 83 86H17C12 86 9 81 12 76C18 68 26 60 26 46C26 30 34 16 50 16Z',
    parts: [{ tone: 'body', d: 'M44 88A6 6 0 1 0 56 88A6 6 0 1 0 44 88Z' }],
    face: [50, 56],
  },
  ghost: {
    body: 'M50 14C72 14 86 30 86 52V84Q80 78 74 84Q68 90 62 84Q56 78 50 84Q44 90 38 84Q32 78 26 84Q20 90 14 84V52C14 30 28 14 50 14Z',
    face: [50, 50],
  },
  bot: {
    body: 'M24 32H76Q88 32 88 44V76Q88 88 76 88H24Q12 88 12 76V44Q12 32 24 32Z',
    parts: [
      { tone: 'body', d: 'M47 33V19H53V33Z' },
      { tone: 'body', d: 'M50 8A6 6 0 1 1 50 20A6 6 0 1 1 50 8Z' },
    ],
    face: [50, 60],
  },
  // A circle (r 41) with a bite taken by a smaller one (r 30) offset up and to the right, so the body is
  // fat at the belly (about 42 thick) and ends in two horns whose tips are rounded (r 10). The axis is
  // tilted 50 degrees; the face sits on the belly.
  crescent: {
    body: 'M19.5 22.8A41 41 0 1 0 81.4 74.7A10 10 0 0 0 71 59.8A30 30 0 0 1 35.9 30.3A10 10 0 0 0 19.5 22.8Z',
    face: [33.1, 69.3],
  },
  // A tapered cup (wide at the top), a lid that overhangs it and a thick slanted straw. The lid is body ink with a
  // lighter `inner` top, so the outline variants keep it; three `inner` pearls sit in the bottom.
  boba: {
    body: 'M22 38L28 82Q29 90 38 90H62Q71 90 72 82L78 38Z',
    parts: [
      { tone: 'body', d: 'M63.2 29.4L73.2 7.4A3.5 3.5 0 0 0 66.8 4.6L56.8 26.6A3.5 3.5 0 0 0 63.2 29.4Z' },
      {
        tone: 'body',
        d: 'M14 38C14 26 30 22 50 22C70 22 86 26 86 38C86 42 84 44 80 44H20C16 44 14 42 14 38Z',
      },
      {
        tone: 'inner',
        d: 'M18 37C18 29.5 32 26 50 26C68 26 82 29.5 82 37C82 38.5 81 39.5 79.5 39.5H20.5C19 39.5 18 38.5 18 37Z',
      },
      { tone: 'inner', d: 'M31.5 83A4.5 4.5 0 1 1 40.5 83A4.5 4.5 0 1 1 31.5 83Z' },
      { tone: 'inner', d: 'M45.5 85A4.5 4.5 0 1 1 54.5 85A4.5 4.5 0 1 1 45.5 85Z' },
      { tone: 'inner', d: 'M59.5 83A4.5 4.5 0 1 1 68.5 83A4.5 4.5 0 1 1 59.5 83Z' },
    ],
    face: [50, 62],
  },
};
