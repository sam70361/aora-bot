/**
 * The Halloween family as fields in a 100 x 100 box: the source the generator
 * bakes into `src/themes/halloween/art.generated.ts`.
 *
 * A drawn character is a body field, a face centre and parts. A part's zone is
 * cut to the body so it shares the body's edge, unless it is `free` (a piece
 * that stands on its own) or `inset` (a mark kept that far inside the edge).
 * A prop character is a member of the roster scaled by `scale` about `at`, and
 * props drawn in the same box in front of it.
 */
import type { ColorId, PartTone, ShapeId } from '../../src/core/types.js';
import {
  above,
  below,
  blend,
  box,
  chain,
  circle,
  ellipse,
  grow,
  meet,
  minus,
  poly,
  shell,
  stroke,
  union,
  type Field,
  type Pt,
} from './sdf.js';

export interface SourcePart {
  tone: PartTone;
  zone: Field;
  color?: ColorId;
  free?: boolean;
  inset?: number;
  /** The smallest display width the part is drawn at (`ShapePart.minPx`). */
  minPx?: number;
  /** Whether a skin leaves the part undecorated (`ShapePart.plain`). */
  plain?: boolean;
  /** The signature motion the part plays (`ArtPart.motion`), and the point it turns about. */
  motion?: string;
  pivot?: Pt;
}

/** The signature motions a whole figure plays (`DrawnArt.motion`), and the point they turn about. */
interface FigureMotion {
  motion?: string | readonly string[];
  pivot?: Pt;
}

export interface DrawnSource extends FigureMotion {
  body: Field;
  face: Pt;
  parts: readonly SourcePart[];
}

export interface PropSource extends FigureMotion {
  base: ShapeId;
  at: Pt;
  scale: number;
  props: readonly SourcePart[];
  drop?: readonly number[];
  tint?: Readonly<Record<number, ColorId>>;
}

const part = (tone: PartTone, zone: Field, extra: Omit<SourcePart, 'tone' | 'zone'> = {}): SourcePart => ({
  tone,
  zone,
  ...extra,
});

/**
 * The ghost's tail: it leaves the body's right side well above the hem and
 * sweeps out to an upturned tip, and the wide blend runs the side into it.
 */
function ghostTail(): Field {
  return chain(
    [
      [68, 64],
      [76, 75],
      [85, 81],
      [91, 79],
      [94, 73],
    ],
    8.5,
    2.6,
  );
}

function wispTail(): Field {
  return chain(
    [
      [40, 48],
      [47, 63],
      [56, 74],
      [68, 80],
      [80, 79],
      [88, 70],
      [89, 60],
      [84, 53],
    ],
    17,
    2.6,
  );
}

function treeTrunk(): Field {
  return blend(
    7,
    poly(
      [
        [45, 38],
        [55, 38],
        [68, 70],
        [32, 70],
      ],
      3,
    ),
    ellipse(50, 79, 32, 16),
    stroke(22, 87, 8, 94, 5, 3.2),
    stroke(78, 87, 92, 94, 5, 3.2),
    stroke(40, 90, 35, 97, 4.4, 3),
    stroke(60, 90, 65, 97, 4.4, 3),
  );
}

function treeBranches(): Field {
  return union(
    chain(
      [
        [47, 44],
        [41, 28],
        [28, 19],
        [12, 19],
      ],
      5.6,
      2.8,
    ),
    stroke(37, 25, 35, 3, 3, 2.1),
    chain(
      [
        [53, 44],
        [59, 28],
        [72, 19],
        [88, 21],
      ],
      5.6,
      2.8,
    ),
    stroke(63, 25, 67, 2, 3, 2.1),
  );
}

function strawHat(): Field {
  return union(ellipse(50, 34, 33, 6, -4), box(50, 23, 14, 10, 6));
}

function scareArms(): Field {
  return stroke(16, 66, 84, 66, 3.2);
}

/** Straw at both ends of the arm and under the hat brim. */
function strawTufts(): Field {
  const fan = (x: number, y: number, m: number): Field =>
    union(
      stroke(x, y, x - 9 * m, y - 6, 2.3, 1.6),
      stroke(x, y, x - 10 * m, y + 1, 2.3, 1.6),
      stroke(x, y, x - 8 * m, y + 8, 2.3, 1.6),
    );
  return union(
    fan(16, 66, 1),
    fan(84, 66, -1),
    stroke(28, 39, 22, 46, 2.2, 1.6),
    stroke(72, 39, 78, 46, 2.2, 1.6),
  );
}

function scareShirt(): Field {
  return poly(
    [
      [37, 71],
      [63, 71],
      [69, 90],
      [31, 90],
    ],
    4,
  );
}

function grassMound(): Field {
  return union(
    ellipse(50, 91, 40, 7),
    poly(
      [
        [16, 88],
        [21, 77],
        [26, 88],
      ],
      1.2,
    ),
    poly(
      [
        [36, 88],
        [40, 80],
        [44, 88],
      ],
      1.2,
    ),
    poly(
      [
        [66, 88],
        [72, 76],
        [77, 88],
      ],
      1.2,
    ),
  );
}

function spiderLegs(): Field {
  const side = (m: number): Field => {
    const X = (x: number): number => (m > 0 ? x : 100 - x);
    return union(
      chain(
        [
          [X(33), 57],
          [X(21), 48],
          [X(13), 53],
        ],
        3.6,
        2.6,
      ),
      chain(
        [
          [X(31), 67],
          [X(17), 65],
          [X(9), 72],
        ],
        3.6,
        2.6,
      ),
      chain(
        [
          [X(34), 77],
          [X(23), 83],
          [X(19), 92],
        ],
        3.6,
        2.6,
      ),
    );
  };
  return union(side(1), side(-1));
}

/** Folded wings that stand a little proud of the body, which keeps the owl from reading as a cat. */
function owlWings(): Field {
  return union(ellipse(19, 64, 8, 18, 18), ellipse(81, 64, 8, 18, -18));
}

function owlFeet(): Field {
  return union(ellipse(42, 92, 6, 3.5), ellipse(58, 92, 6, 3.5));
}

function pailCandy(): Field {
  return union(
    stroke(37, 40, 31, 17, 1.8),
    circle(29, 14, 8),
    ellipse(62, 34, 8, 6, -15),
    ellipse(52, 37, 3.4, 4.6, -15),
    ellipse(72, 31, 3.4, 4.6, -15),
  );
}

/** Small collar points beside the cheeks and a short cape flaring under the body. */
function cape(): Field {
  return union(
    poly(
      [
        [22, 64],
        [13, 40],
        [24, 49],
      ],
      1.8,
    ),
    poly(
      [
        [78, 64],
        [87, 40],
        [76, 49],
      ],
      1.8,
    ),
    poly(
      [
        [34, 79],
        [66, 79],
        [76, 93],
        [24, 93],
      ],
      3,
    ),
  );
}

function batWings(): Field {
  const wing = (m: number): Field => {
    const X = (x: number): number => (m > 0 ? x : 100 - x);
    return minus(
      poly(
        [
          [X(34), 46],
          [X(4), 34],
          [X(3), 58],
          [X(14), 64],
          [X(32), 66],
        ],
        2,
      ),
      union(circle(X(10), 70, 6.5), circle(X(23), 73, 6.5)),
    );
  };
  return union(wing(1), wing(-1));
}

function goo(): Field {
  return union(
    circle(36, 37, 8),
    circle(52, 34, 10),
    circle(66, 38, 7),
    stroke(28, 44, 28, 54, 3.2, 3.8),
    stroke(71, 44, 71, 51, 2.8, 3.2),
  );
}

/** A witch hat's cone, its brim centred on (cx, by), scaled by s. */
function hatCone(cx: number, by: number, s: number): Field {
  const p = (x: number, y: number): Pt => [cx + x * s, by + y * s];
  return chain([p(0, -4), p(4, -20), p(10, -32), p(22, -40), p(30, -36)], 15 * s, 2.5 * s);
}

function hat(cx: number, by: number, s: number): Field {
  return union(ellipse(cx, by, 34 * s, 6.5 * s, -5), hatCone(cx, by, s));
}

function wrappers(): Field {
  const side = (m: number): Field => {
    const X = (x: number): number => (m > 0 ? x : 100 - x);
    return union(
      poly(
        [
          [X(32), 50],
          [X(8), 35],
          [X(6), 65],
        ],
        2.5,
      ),
      circle(X(8), 38, 5),
      circle(X(5), 50, 5),
      circle(X(8), 62, 5),
    );
  };
  return union(side(1), side(-1));
}

function roofs(): Field {
  return union(
    poly(
      [
        [18, 50],
        [49, 20],
        [76, 50],
      ],
      3,
    ),
    box(74, 42, 8, 18, 2),
    poly(
      [
        [63, 26],
        [77, 4],
        [86, 26],
      ],
      2,
    ),
  );
}

/** The mummy's round body, without the loose end, which moves on its own. */
const mummyBody = (): Field => ellipse(50, 55, 34, 36);

/** Where the loose bandage end leaves the body: it flutters about this point. */
const WRAP_ROOT: Pt = [77, 27];

/**
 * The loose bandage end, with the fillet that joins it to the body. Its cut
 * crosses the body's edge only close to the root, so the turn barely moves
 * that crossing.
 */
function looseEnd(): Field {
  const end = chain(
    [
      [74, 28],
      [86, 23],
      [95, 28],
    ],
    3.6,
    2.6,
  );
  return meet(blend(5, mummyBody(), end), union(circle(WRAP_ROOT[0], WRAP_ROOT[1], 9), box(91, 26, 11, 9)));
}

/** The drawn members, in roster order. */
export const HALLOWEEN_DRAWN = {
  spook: {
    body: blend(
      11,
      blend(
        5,
        circle(50, 40, 27),
        box(50, 60, 27, 18, 8),
        circle(32, 80, 8.5),
        circle(48, 82, 8.5),
        circle(64, 80, 8),
        ellipse(19, 52, 9, 6, -35),
        ellipse(80, 50, 8, 6, 30),
      ),
      ghostTail(),
    ),
    face: [50, 47],
    parts: [
      part('inner', stroke(85, 47, 90, 26, 1.8), { free: true }),
      part('leaf', circle(91, 21, 9), { free: true, color: 'orange' }),
      part('inner', meet(shell(circle(91, 21, 4.6), 1.2), above(23)), { free: true, color: 'orange' }),
    ],
    motion: 'hover',
    pivot: [50, 88],
  },
  pumpkin: {
    body: blend(
      3,
      ellipse(50, 61, 23, 29),
      ellipse(32, 63, 20, 26),
      ellipse(68, 63, 20, 26),
      chain(
        [
          [50, 36],
          [51, 26],
          [56, 19],
        ],
        5,
        3.6,
      ),
      ellipse(37, 29, 8, 4.5, 20),
    ),
    face: [50, 62],
    parts: [
      part(
        'leaf',
        meet(
          union(
            chain(
              [
                [50, 36],
                [51, 26],
                [56, 19],
              ],
              5.4,
              4,
            ),
            ellipse(37, 29, 8.5, 5, 20),
          ),
          above(33),
        ),
      ),
      part(
        'leaf',
        chain(
          [
            [57, 21],
            [65, 17],
            [70, 22],
            [66, 27],
          ],
          1.5,
        ),
        { free: true },
      ),
      part('hair', meet(shell(ellipse(50, 61, 23, 29), 0.9), union(above(47), below(76))), { inset: 2.4 }),
    ],
  },
  nightcat: {
    body: blend(
      4,
      ellipse(46, 63, 30, 26),
      poly(
        [
          [20, 52],
          [22, 22],
          [41, 39],
        ],
        3,
      ),
      poly(
        [
          [72, 52],
          [70, 22],
          [51, 39],
        ],
        3,
      ),
      chain(
        [
          [70, 80],
          [84, 81],
          [92, 72],
          [93, 60],
          [95, 50],
          [102, 46],
        ],
        4.6,
        3.4,
      ),
    ),
    face: [46, 63],
    parts: [
      part(
        'inner',
        poly(
          [
            [25, 44],
            [26, 30],
            [35, 39],
          ],
          1.2,
        ),
      ),
      part(
        'inner',
        poly(
          [
            [67, 44],
            [66, 30],
            [57, 39],
          ],
          1.2,
        ),
      ),
    ],
  },
  batling: {
    body: blend(
      3,
      circle(50, 55, 23),
      poly(
        [
          [36, 40],
          [37, 28],
          [46, 35],
        ],
        2,
      ),
      poly(
        [
          [64, 40],
          [63, 28],
          [54, 35],
        ],
        2,
      ),
      batWings(),
    ),
    face: [50, 57],
    parts: [part('hair', minus(batWings(), circle(50, 55, 23.6)))],
    motion: 'flap',
    pivot: [50, 55],
  },
  cauldron: {
    body: blend(
      3,
      ellipse(50, 67, 34, 24),
      box(50, 44, 38, 6, 5.5),
      box(33, 90, 6, 4, 2),
      box(67, 90, 6, 4, 2),
      goo(),
    ),
    face: [50, 69],
    parts: [
      part('inner', box(50, 44, 38.6, 6.6, 5.5)),
      part('leaf', grow(goo(), 0.4), { motion: 'brew' }),
      part('leaf', circle(25, 22, 3.2), { free: true }),
      part('leaf', circle(78, 17, 4.2), { free: true }),
    ],
  },
  witch: {
    body: blend(4, ellipse(50, 74, 34, 20), circle(50, 64, 22), hat(50, 52, 1)),
    face: [50, 73],
    parts: [
      part('leaf', grow(hat(50, 52, 1), 0.4), { color: 'violet' }),
      part('hair', meet(hatCone(50, 52, 1), box(50, 45, 24, 3.4)), { color: 'yellow' }),
    ],
  },
  toffee: {
    body: blend(4, circle(50, 50, 25), wrappers()),
    face: [50, 52],
    parts: [
      part('leaf', minus(wrappers(), circle(50, 50, 25.6)), { color: 'violet' }),
      ...(
        [
          [33, 37, 3.4],
          [67, 63, 3.4],
          [64, 31, 2.8],
          [36, 67, 2.8],
        ] as const
      ).map(([x, y, r]) => part('inner', circle(x, y, r))),
    ],
  },
  manor: {
    body: blend(2.5, box(46, 70, 26, 22, 5), roofs()),
    face: [46, 72],
    parts: [
      part('leaf', meet(roofs(), above(50)), { color: 'violet' }),
      part('leaf', box(74, 41, 3.4, 4.4, 1.6), { color: 'yellow', motion: 'glow' }),
    ],
  },
  wisp: {
    body: blend(6, circle(36, 35, 27), ellipse(11, 52, 7, 5, -35), wispTail()),
    face: [36, 37],
    parts: [],
    motion: 'drift',
    pivot: [36, 35],
  },
  deadtree: {
    body: blend(3, treeTrunk(), treeBranches()),
    face: [50, 76],
    parts: [part('hair', ellipse(56, 50, 2.6, 3.6))],
  },
  scarecrow: {
    body: blend(
      3,
      circle(50, 54, 23),
      strawHat(),
      scareArms(),
      strawTufts(),
      scareShirt(),
      stroke(50, 90, 50, 99, 3),
    ),
    face: [50, 55],
    parts: [
      part('leaf', grow(scareShirt(), 0.4), { color: 'lilac' }),
      part('inner', box(58, 83, 4.6, 4, 1)),
      part('leaf', grow(union(strawHat(), strawTufts()), 0.4), { color: 'yellow' }),
      part('leaf', meet(box(50, 23, 14.4, 10.4, 6), box(50, 30, 16, 2.6)), { color: 'lilac' }),
    ],
  },
  tombstone: {
    body: blend(3, union(circle(50, 40, 27), box(50, 64, 27, 24, 3)), grassMound()),
    face: [50, 57],
    parts: [
      part('hair', meet(shell(circle(50, 40, 21), 1), above(45))),
      part('leaf', grow(grassMound(), 0.4)),
    ],
  },
  candycorn: {
    body: poly(
      [
        [50, 10],
        [84, 84],
        [16, 84],
      ],
      9,
    ),
    face: [50, 58],
    parts: [
      part('leaf', (x, y) => 72 + 0.006 * (x - 50) ** 2 - y, { color: 'yellow' }),
      part('inner', (x, y) => y - (34 + 0.006 * (x - 50) ** 2)),
    ],
  },
  mummy: {
    body: mummyBody(),
    face: [50, 54],
    parts: [
      part('body', looseEnd(), { free: true, motion: 'flutter', pivot: WRAP_ROOT }),
      ...(
        [
          [22, 0.22],
          [81, 0.18],
          [90, -0.22],
        ] as const
      ).map(([c, slope]) =>
        part(
          'hair',
          shell((x, y) => y - (c + slope * (x - 50)), 1.5),
        ),
      ),
    ],
  },
  skull: {
    body: blend(5, circle(50, 40, 31), box(50, 74, 15, 11, 5)),
    face: [50, 46],
    parts: [
      part('leaf', union(ellipse(67, 17, 7, 4.6, 25), ellipse(81, 17, 7, 4.6, -25), circle(74, 17, 3)), {
        free: true,
        color: 'pink',
      }),
      ...[43, 50, 57].map((x) => part('hair', stroke(x, 78, x, 86, 1.1))),
    ],
    motion: 'chatter',
    pivot: [50, 85],
  },
  spider: {
    body: blend(3, circle(50, 65, 21), spiderLegs(), stroke(50, 46, 50, 10, 1.4)),
    face: [50, 65],
    parts: [],
    motion: 'sway',
    pivot: [50, 10],
  },
  owl: {
    body: blend(
      4,
      ellipse(50, 58, 29, 33),
      poly(
        [
          [25, 36],
          [22, 20],
          [38, 30],
        ],
        2.5,
      ),
      poly(
        [
          [75, 36],
          [78, 20],
          [62, 30],
        ],
        2.5,
      ),
      owlWings(),
      owlFeet(),
    ),
    face: [50, 52],
    parts: [
      part('inner', ellipse(50, 77, 14, 12)),
      part('hair', grow(owlWings(), 0.4)),
      part('leaf', grow(owlFeet(), 0.4), { color: 'orange' }),
    ],
  },
  pail: {
    body: blend(
      3,
      poly(
        [
          [22, 46],
          [78, 46],
          [72, 90],
          [28, 90],
        ],
        5,
      ),
      box(50, 45, 33, 5.5, 4.5),
      pailCandy(),
    ),
    face: [50, 68],
    parts: [
      part('inner', box(50, 45, 33.6, 6.1, 4.5)),
      part('inner', stroke(37, 40, 31, 17, 1.8), { free: true }),
      part(
        'leaf',
        union(
          circle(29, 14, 8),
          ellipse(62, 34, 8, 6, -15),
          ellipse(52, 37, 3.4, 4.6, -15),
          ellipse(72, 31, 3.4, 4.6, -15),
        ),
        { free: true, color: 'violet' },
      ),
      part('inner', meet(shell(circle(29, 14, 4), 1.1), above(16)), { free: true, color: 'violet' }),
    ],
  },
  candle: {
    body: blend(3, box(50, 63, 21, 28, 7), box(50, 92, 30, 5, 4)),
    face: [50, 66],
    parts: [
      part(
        'inner',
        union(
          above(41),
          stroke(35, 38, 35, 50, 3.6, 4),
          stroke(59, 38, 59, 54, 3.2, 3.6),
          stroke(66, 38, 66, 46, 2.6, 3),
        ),
      ),
      part('hair', box(50, 92, 30.6, 5.6, 4), { color: 'violet' }),
      part('hair', stroke(50, 35, 50, 28, 1.3), { free: true }),
      part(
        'leaf',
        union(
          circle(50, 20, 7),
          poly(
            [
              [50, 4],
              [44.5, 17],
              [55.5, 17],
            ],
            1,
          ),
        ),
        { free: true, color: 'yellow', motion: 'flicker', pivot: [50, 27] },
      ),
    ],
  },
  vampire: {
    body: blend(4, circle(50, 50, 31), cape()),
    face: [50, 54],
    parts: [
      part('hair', (x, y) => y - (33 - 0.55 * Math.abs(x - 50))),
      part('leaf', grow(cape(), 0.4), { color: 'violet' }),
    ],
  },
} satisfies Record<string, DrawnSource>;

/** Members of the roster wearing a prop. */
export const HALLOWEEN_PROPS = {
  witchmochi: {
    base: 'mochi',
    at: [50, 63],
    scale: 0.74,
    props: [
      part('leaf', hat(47, 35, 0.88), { color: 'violet' }),
      part('leaf', meet(hatCone(47, 35, 0.88), box(47, 29, 20, 3)), { color: 'orange' }),
    ],
  },
  lanterncat: {
    base: 'cat',
    at: [42, 47],
    scale: 0.78,
    props: [
      part('leaf', blend(2, ellipse(77, 81, 12, 11), ellipse(68, 82, 9, 10), ellipse(86, 82, 9, 10)), {
        color: 'orange',
      }),
      part('leaf', stroke(77, 71, 79, 65, 2.2)),
      part(
        'leaf',
        union(
          poly(
            [
              [69, 79],
              [72, 74],
              [75, 79],
            ],
            0.6,
          ),
          poly(
            [
              [79, 79],
              [82, 74],
              [85, 79],
            ],
            0.6,
          ),
        ),
        { color: 'yellow', motion: 'glow' },
      ),
      part(
        'leaf',
        poly(
          [
            [69, 84],
            [85, 84],
            [81, 89],
            [77, 87],
            [73, 89],
          ],
          0.6,
        ),
        { color: 'yellow', motion: 'glow' },
      ),
    ],
  },
  nightcapmoon: {
    base: 'crescent',
    at: [56, 58],
    scale: 0.72,
    props: [
      part(
        'leaf',
        union(
          ellipse(42, 28, 15, 5, -28),
          chain(
            [
              [42, 25],
              [33, 13],
              [21, 9],
              [13, 15],
              [10, 26],
            ],
            10,
            2.6,
          ),
        ),
        { color: 'violet' },
      ),
      part('inner', circle(10, 29, 5)),
    ],
  },
} satisfies Record<string, PropSource>;
