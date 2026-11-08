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
  // A big round head (r 35) over a hem of three soft lobes (r 12.5 to 13) and two small nub arms, leaning 5 degrees
  // as it drifts. The notches between the lobes are shallow and filleted, so the hem stays one soft edge at 24 px.
  ghost: {
    body: 'M16.9 53.4A35 35 0 1 1 84 56.4A2.5 2.5 0 0 0 86.2 59.7A4.5 4.5 0 0 1 90 65.9L81.2 86.8A13 13 0 0 1 59.9 90.9A2.5 2.5 0 0 0 56.4 90.8A12.5 12.5 0 0 1 37.5 89.2A2.5 2.5 0 0 0 34 88.6A13 13 0 0 1 13.9 81.5L8.5 62A4.5 4.5 0 0 1 13.9 56.4A2.5 2.5 0 0 0 16.9 53.4Z',
    face: [51, 43],
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
  // A round planet (r 31) in a tilted ring (an ellipse 80 x 21, 7 wide) drawn in `hair`. The ring is cut away
  // where it passes behind the planet and stands clear of it at the sides, so the two read apart.
  planet: {
    body: 'M81 46A31 31 0 0 1 19 46A31 31 0 0 1 81 46Z',
    parts: [
      {
        tone: 'hair',
        d: 'M80.5 44.1A30.6 30.6 0 0 0 79.6 38.1A43.5 14 -10 0 1 92.8 45.4A43.5 14 -10 0 1 7.2 60.6A43.5 14 -10 0 1 19.5 47.8A30.6 30.6 0 0 0 20.5 54A36.5 7 -10 0 0 14.1 59.3A36.5 7 -10 0 0 85.9 46.7A36.5 7 -10 0 0 80.5 44.1Z',
      },
    ],
    face: [50, 39],
  },
};
