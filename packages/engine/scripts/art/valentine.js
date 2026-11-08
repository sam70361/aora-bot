/**
 * The Valentine theme as fields in a 100 x 100 box, drawn in the lab's candy sheet and kept as it was drawn there:
 * the source `generate:faces` bakes into `src/themes/valentine/`. The sheet names each part by its colour rather
 * than its tone; `VALENTINE_SOURCE` turns that into the engine's parts, and places each combination's props from
 * its member's fitted face box as the lab did. A part's `move` names the signature motion it rides, turned about that
 * motion's pivot in `moves`; how each motion moves is declared in `src/themes/valentine/motions.ts`. `motion` and
 * `verdict` are the lab page's notes and are not read here.
 */
import { castMember } from '../../src/core/cast.ts';
import { CENTER } from '../../src/core/types.ts';
import { getShape } from '../../src/shapes/registry.ts';
import {
  above,
  below,
  blend,
  box,
  chain,
  circle,
  ellipse,
  grow,
  leftOf,
  meet,
  poly,
  shell,
  stroke,
  union,
} from './sdf.ts';
import { labTheme } from './lab.ts';

/** The sheet's limited palette. Every colour on the page comes from here. */
const VL = {
  rose: '#ec4561',
  wine: '#a3203d',
  blush: '#ffb6c8',
  cream: '#fff3e6',
  choc: '#6e3b2b',
  gold: '#f4b740',
  lilac: '#c8b0f2',
  plum: '#8a62c4',
  sage: '#68bd78',
  ink: '#2b1a22',
};

// ---- Field helpers ------------------------------------------------------------------------------------

/** A field rotated by `deg` about (cx, cy). */
function turn(f, cx, cy, deg) {
  const c = Math.cos((deg * Math.PI) / 180);
  const s = Math.sin((deg * Math.PI) / 180);
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    return f(cx + dx * c + dy * s, cy - dx * s + dy * c);
  };
}

// The classic parametric heart, x in -16..16, y from about -12 at the lobes to 17 at the point.
const HEART_PTS = Array.from({ length: 72 }, (_, i) => {
  const t = (i / 72) * 2 * Math.PI;
  return [
    16 * Math.sin(t) ** 3,
    -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - 2.5,
  ];
});

/** A heart about (cx, cy) with half-width w, point down, a little squatter than the formula's. */
function heart(cx, cy, w) {
  const k = w / 16;
  const r = w * 0.05;
  const s = (w - r) / w;
  return poly(
    HEART_PTS.map(([x, y]) => [cx + x * k * s, cy + y * k * s * 0.9]),
    r,
  );
}

/** Feathers fanning out of a root: one ellipse per [angle in degrees, length], `w` thick. */
function fan([rx, ry], feathers, w, k = 1.6) {
  return blend(
    k,
    ...feathers.map(([deg, len]) => {
      const a = (deg * Math.PI) / 180;
      return ellipse(rx + (Math.cos(a) * len) / 2, ry + (Math.sin(a) * len) / 2, len / 2, w, deg);
    }),
  );
}

/** A bow: two rounded loops, a knot and two short tails, centred on (cx, cy). */
function bow(cx, cy, s) {
  return union(
    poly(
      [
        [cx - 1.5 * s, cy],
        [cx - 9 * s, cy - 5.2 * s],
        [cx - 9 * s, cy + 4.6 * s],
      ],
      1.8 * s,
    ),
    poly(
      [
        [cx + 1.5 * s, cy],
        [cx + 9 * s, cy - 5.2 * s],
        [cx + 9 * s, cy + 4.6 * s],
      ],
      1.8 * s,
    ),
    stroke(cx - 1, cy + 1, cx - 4.5 * s, cy + 8 * s, 1.5 * s, 1.2 * s),
    stroke(cx + 1, cy + 1, cx + 4.5 * s, cy + 8 * s, 1.5 * s, 1.2 * s),
    circle(cx, cy, 2.8 * s),
  );
}

/** A pointed leaf from a to b, `w` at its widest: the lens two circles share. */
function leaf([ax, ay], [bx, by], w) {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const half = Math.hypot(bx - ax, by - ay) / 2;
  const R = (half * half + w * w) / (2 * w);
  const nx = -(by - ay) / (2 * half);
  const ny = (bx - ax) / (2 * half);
  const o = R - w;
  return meet(circle(mx + nx * o, my + ny * o, R), circle(mx - nx * o, my - ny * o, R));
}

/** A four-point sparkle. */
function sparkle(cx, cy, R, r = R * 0.28) {
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const k = i % 2 ? r : R;
    pts.push([cx + k * Math.cos(a), cy + k * Math.sin(a)]);
  }
  return poly(pts, 0.5);
}

/** An envelope: paper, the flap's V and a heart seal, turned by `deg`. */
function envelope(cx, cy, hw, hh, deg) {
  const t = (f) => turn(f, cx, cy, deg);
  return {
    paper: t(box(cx, cy, hw, hh, 1.6)),
    flap: t(
      chain(
        [
          [cx - hw + 1.8, cy - hh + 1.8],
          [cx, cy + hh * 0.15],
          [cx + hw - 1.8, cy - hh + 1.8],
        ],
        1,
      ),
    ),
    seal: t(heart(cx, cy + hh * 0.12, Math.min(hw, hh) * 0.42)),
  };
}

// ---- The new characters -------------------------------------------------------------------------------

/*
 * Fields are in a 100 x 100 box. Each part is [colour, zone, opts]: the zone is cut from the body unless `free`,
 * `behind` paints it under the body, `inset` keeps it that far inside the edge, and `move` names the signature
 * motion it rides. `moves` gives each motion's pivot (box units), shared by every piece that rides it.
 */
export const VALENTINE = [
  {
    id: 'vl-bonbon',
    zh: '巧巧',
    en: 'Bonbon',
    group: 'new',
    concept: '心形巧克力礼盒，玫红盒盖带一道金边和一只金蝴蝶结，盒身是腮红粉，脸画在盒身上。',
    motion: '盒盖从左边掀起一角，露出里面的松露巧克力，停一拍，再「啪」地扣回去。',
    verdict:
      '心形剪影加上一道深色盒盖，24 像素一眼就是「一盒心」，和引擎里实心的心心分得开；巧克力只在掀盖时露出来。',
    paint: { fill: VL.blush },
    face: [50, 68],
    body: () => heart(50, 58, 40),
    parts: [
      ['cream', above(46.5), { inset: 2.6 }],
      [
        'choc',
        union(
          circle(29.5, 38.5, 6.2),
          circle(43.5, 42.5, 4.2),
          circle(56.5, 42.5, 4.2),
          circle(70.5, 38.5, 6.2),
        ),
        { inset: 3.4 },
      ],
      ['rose', bonbonLid(), { free: true, move: 'lid' }],
      ['gold', meet(bonbonLid(), below(45.2)), { free: true, move: 'lid' }],
      ['gold', bow(31, 28, 0.95), { free: true, move: 'lid' }],
    ],
    moves: { lid: [91, 48] },
  },
  {
    id: 'vl-rose',
    zh: '瑰瑰',
    en: 'Rosy',
    group: 'new',
    concept: '一枝红玫瑰：花苞顶上一圈花瓣尖，中间卷着深红的花心，两侧包着外层花瓣，绿茎上一左一右两片叶子。',
    motion: '外层两片花瓣向外舒展一下，像在伸懒腰，两片叶子跟着前后扇动。',
    verdict:
      '扇贝形花顶加绿茎，24 像素读作一朵红花；卷曲的花心和深红外瓣在 48 像素以上才把它从郁金香里分出来。',
    paint: { fill: VL.rose },
    face: [50, 47],
    body: () => blend(3, roseBloom(), stroke(50, 60, 50, 95, 3.6)),
    parts: [
      [
        'wine',
        meet(grow(roseBloom(), 0.5), ellipse(20.5, 50, 8, 15.5, 14), below(31)),
        { free: true, move: 'petalL' },
      ],
      [
        'wine',
        meet(grow(roseBloom(), 0.5), ellipse(79.5, 50, 8, 15.5, -14), below(31)),
        { free: true, move: 'petalR' },
      ],
      ['wine', roseSwirl(), { inset: 1 }],
      ['sage', stroke(50, 62, 50, 96, 3.8)],
      ['sage', union(ellipse(43, 64.5, 7.5, 3, 24), ellipse(57, 64.5, 7.5, 3, -24)), { free: true }],
      ['sage', leaf([50, 85], [28, 75], 6), { free: true, move: 'leafL' }],
      ['sage', leaf([50, 79], [72, 69], 6), { free: true, move: 'leafR' }],
    ],
    moves: { petalL: [28, 63], petalR: [72, 63], leafL: [50, 85], leafR: [50, 79] },
  },
  {
    id: 'vl-cherub',
    zh: '丘丘',
    en: 'Dimple',
    group: 'new',
    concept:
      '圆滚滚的小天使：奶油色胖身子，一头金色小卷发，头顶翘着一撮卷毛，背后一对淡紫小翅膀，围着粉色小布兜，两只小手横握一支心形箭头的箭。',
    motion: '小翅膀飞快地扑扇三下，箭顺着箭杆往前一戳，像在瞄准。',
    verdict: '卷发和两侧翅膀撑起剪影，24 像素是「带翅膀的小圆子」；心形箭头是红色的一点，在小图里也能看到。',
    paint: { fill: VL.cream },
    face: [50, 57],
    body: () => cherubBody(),
    parts: [
      ['lilac', cherubWing(1), { free: true, behind: true, move: 'wingL' }],
      ['lilac', cherubWing(-1), { free: true, behind: true, move: 'wingR' }],
      [
        'gold',
        union(
          ...[204, 226, 248, 270, 292, 314, 336].map((deg) =>
            circle(
              50 + 24.5 * Math.cos((deg * Math.PI) / 180),
              49 + 24.5 * Math.sin((deg * Math.PI) / 180),
              9.5,
            ),
          ),
        ),
      ],
      ['gold', cherubCurl(), { free: true }],
      ['blush', below(78.5)],
      ['gold', stroke(21, 90, 79, 61, 2.2), { free: true, move: 'arrow' }],
      [
        'blush',
        union(
          turn(ellipse(18, 87.5, 5.6, 2.6), 18, 87.5, 62),
          turn(ellipse(22.5, 93, 5.6, 2.6), 22.5, 93, 62),
        ),
        { free: true, move: 'arrow' },
      ],
      ['rose', turn(heart(84, 58.5, 7.4), 84, 58.5, -117), { free: true, move: 'arrow' }],
      ['cream', union(circle(68, 66.5, 4.6), circle(35, 83, 4.4)), { free: true }],
    ],
    moves: { wingL: [29, 47], wingR: [71, 47], arrow: [50, 75] },
  },
  {
    id: 'vl-ring',
    zh: '戒戒',
    en: 'Vow',
    group: 'new',
    concept:
      '打开的戒指盒：淡紫丝绒盒身配一条奶油色软垫，深紫盒盖立在后面，金戒指托着一颗大钻石，旁边亮着一颗星光。',
    motion: '盒盖「咔」地合上，戒指缩进软垫，再弹开，戒指跟着跳出来，钻石边上的星光一闪。',
    verdict:
      '方盒加立起的盒盖是很稳的剪影，金圈和白钻在 24 像素还能认出是戒指；盒盖放在身体后面，脸只占盒身。',
    paint: { fill: VL.lilac },
    face: [50, 78],
    body: () => box(50, 75, 31, 16, 7),
    parts: [
      ['plum', box(50, 40, 29, 17.5, 8), { free: true, behind: true, move: 'lid' }],
      ['lilac', box(50, 39.5, 23, 12.5, 5), { free: true, behind: true, move: 'lid' }],
      ['cream', meet(above(65), grow(box(50, 75, 31, 16, 7), 1))],
      ['plum', stroke(41, 61.6, 59, 61.6, 1.3), { free: true }],
      ['gold', circle(50, 50.5, 8.8), { free: true, move: 'ring' }],
      ['lilac', circle(50, 50.5, 6.2), { free: true, move: 'ring' }],
      [
        'cream',
        poly(
          [
            [41, 36],
            [45.4, 29.6],
            [54.6, 29.6],
            [59, 36],
            [50, 45.5],
          ],
          1,
        ),
        { free: true, move: 'ring' },
      ],
      [
        'lilac',
        union(
          stroke(42.5, 35.8, 57.5, 35.8, 0.75),
          chain(
            [
              [46.5, 30.5],
              [48, 35.8],
              [50, 43.5],
            ],
            0.6,
          ),
          chain(
            [
              [53.5, 30.5],
              [52, 35.8],
              [50, 43.5],
            ],
            0.6,
          ),
        ),
        { free: true, move: 'ring' },
      ],
      ['gold', sparkle(67, 27, 6.5), { free: true, move: 'spark' }],
    ],
    moves: { lid: [50, 57.5], ring: [50, 62], spark: [67, 27] },
  },
  {
    id: 'vl-dove',
    zh: '鸽鸽',
    en: 'Coo',
    group: 'new',
    concept:
      '送信的小白鸽：奶油色圆身子，尾羽往左下翘，两只淡紫翅膀高高举起，金色小嘴叼着一封粉色情书，信上封着红心。',
    motion: '翅膀扇两下，叼着的信像钟摆一样跟着晃，晃得比翅膀慢半拍。',
    verdict:
      '举起的双翅加嘴边那封信就是「送信的鸽子」，24 像素里信封是右下角一块粉色；嘴放在身体侧边，不和引擎的嘴打架。',
    paint: { fill: VL.cream },
    face: [44, 57],
    body: () => blend(4, circle(45, 55, 25), doveTail()),
    parts: [
      ['lilac', doveWing(1), { free: true, behind: true, move: 'wingL' }],
      ['lilac', doveWing(-1), { free: true, behind: true, move: 'wingR' }],
      ['lilac', meet(doveTail(), leftOf(19)), { inset: 0 }],
      [
        'gold',
        poly(
          [
            [67.5, 46.5],
            [80, 51],
            [67.5, 55.5],
          ],
          1.4,
        ),
        { free: true },
      ],
      ...(() => {
        const e = envelope(79, 65, 9.6, 7.2, 12);
        return [
          ['blush', e.paper, { free: true, move: 'letter' }],
          ['rose', e.flap, { free: true, move: 'letter' }],
          ['rose', e.seal, { free: true, move: 'letter' }],
        ];
      })(),
    ],
    moves: { wingL: [33, 45], wingR: [57, 37], letter: [72, 53] },
  },
  {
    id: 'vl-dipped',
    zh: '蘸蘸',
    en: 'Drizzle',
    group: 'new',
    concept:
      '蘸了巧克力的草莓：上半截红草莓带奶油色籽，下半截裹着一层波浪边的黑巧克力，淌下两道，再淋一道白巧克力。',
    motion: '草莓尖上慢慢鼓出一滴巧克力，拉长、滴落，再鼓出下一滴。',
    verdict:
      '红上黑下的两截色就是它的全部特征，24 像素一眼就和引擎里的普通草莓莓莓分开；脸留在红色那一截，表情完整。',
    paint: { fill: VL.rose },
    face: [50, 45],
    body: () => blend(4, berryBody(), calyx()),
    parts: [
      [
        'choc',
        meet(
          union(
            (x, y) => 60.5 + 2.4 * Math.sin(x * 0.42) - y,
            stroke(32.5, 60, 32.5, 70, 3.6, 3.2),
            stroke(65, 60, 65, 73, 3.8, 3.3),
          ),
          below(40),
        ),
      ],
      [
        'cream',
        chain(
          [
            [29, 75],
            [36, 70],
            [42, 79],
            [49, 71],
            [55, 81],
            [62, 73],
            [69, 78],
          ],
          1.5,
        ),
        { inset: 2.4 },
      ],
      [
        'cream',
        union(
          ...[
            [29, 44],
            [71, 44],
            [37, 33.5],
            [63, 33.5],
            [50, 31],
          ].map(([x, y]) => ellipse(x, y, 1.5, 2.3)),
        ),
        { inset: 1 },
      ],
      ['sage', calyx(), { inset: -0.2 }],
      [
        'choc',
        union(
          circle(50, 97.5, 2.7),
          poly(
            [
              [47.6, 96.4],
              [52.4, 96.4],
              [50, 91.5],
            ],
            0.5,
          ),
        ),
        { free: true, move: 'drop' },
      ],
    ],
    moves: { drop: [50, 92] },
  },
];

function bonbonLid() {
  return meet(grow(heart(50, 58, 40), 1.8), above(48));
}

function roseBloom() {
  return blend(
    3.2,
    ellipse(50, 43, 30, 22),
    circle(27.5, 29, 8.8),
    circle(40.5, 22.5, 9.2),
    circle(59.5, 22.5, 9.2),
    circle(72.5, 29, 8.8),
  );
}

/** The bud's curl: a spiral of a little over one turn above the face. */
function roseSwirl() {
  const pts = [];
  for (let i = 0; i <= 22; i++) {
    const t = (i / 22) * 2.3 * Math.PI;
    const r = 1.4 + 1.25 * t;
    pts.push([50 + r * Math.cos(t + 2.2) * 1.15, 29 + r * Math.sin(t + 2.2) * 0.75]);
  }
  return chain(pts, 1.5, 1.9);
}

/** A chubby round body whose crown is a row of curls. */
function cherubBody() {
  const curls = [200, 222, 246, 270, 294, 318, 340].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return circle(50 + 25.5 * Math.cos(a), 49 + 25.5 * Math.sin(a), 6.4);
  });
  return blend(9, circle(50, 49, 27), ellipse(50, 72, 25, 17), ...curls);
}

/** A fat kiss-curl on the crown, curling back on itself. */
function cherubCurl() {
  return chain(
    [
      [49, 26],
      [47.5, 20],
      [49.5, 15],
      [54.5, 14],
      [57, 17.5],
      [54.5, 20.5],
      [52, 19],
    ],
    3.1,
    2.2,
  );
}

function cherubWing(m) {
  const a = (deg) => (m > 0 ? deg : 180 - deg);
  return fan(
    [m > 0 ? 29 : 71, 47],
    [
      [a(214), 29],
      [a(192), 25],
      [a(170), 19],
    ],
    4.6,
  );
}

function doveWing(m) {
  if (m > 0)
    return fan(
      [34, 42],
      [
        [196, 20],
        [216, 27],
        [236, 29],
        [256, 25],
      ],
      4.2,
    );
  return fan(
    [58, 37],
    [
      [284, 22],
      [304, 25],
      [324, 22],
      [344, 16],
    ],
    4,
  );
}

function doveTail() {
  return fan(
    [24, 66],
    [
      [146, 16],
      [164, 19],
      [182, 16],
    ],
    3.8,
    2,
  );
}

function berryBody() {
  return blend(
    8,
    ellipse(50, 46, 31, 22.5),
    poly(
      [
        [30, 54],
        [70, 54],
        [50, 85],
      ],
      6,
    ),
  );
}

function calyx() {
  return union(
    ellipse(38, 25.5, 10.5, 3.8, -14),
    ellipse(62, 25.5, 10.5, 3.8, 14),
    ellipse(44.5, 22, 8, 3.3, -55),
    ellipse(55.5, 22, 8, 3.3, 55),
    stroke(50, 22, 53, 9, 2.5, 2),
  );
}

// ---- Props on existing cast members -------------------------------------------------------------------

/** Where a member lands in the 100 box once scaled by s about `at`: its face box, bounds and top edge. */
function fitOf(base, at, s) {
  const shape = getShape(base);
  const k = (s * 100) / (2 * CENTER);
  const map = ([x, y]) => [at[0] + (x - CENTER) * k, at[1] + (y - CENTER) * k];
  const pts = shape.outline.map(map);
  const [fx, fy] = map([shape.face.x, shape.face.y]);
  const b = bounds(pts);
  const topAt = (x) => Math.min(...pts.filter((p) => Math.abs(p[0] - x) < 2.5).map((p) => p[1]));
  return { fx, fy, fw: shape.face.sx * k, fh: shape.face.sy * k, ...b, topAt };
}

const PROPS = {
  headband: (g) => {
    const top = g.topAt(g.fx);
    const R = (g.x1 - g.x0) * 0.4;
    const L = [g.fx - R * 0.5, top - 13];
    const Rt = [g.fx + R * 0.5, top - 13];
    return [
      ['wine', meet(shell(ellipse(g.fx, top + R * 0.95, R, R * 0.92), 1.9), above(top + R * 0.42))],
      [
        'wine',
        union(
          chain([[g.fx - R * 0.42, top + 2], [g.fx - R * 0.6, top - 5], L], 1.3),
          chain([[g.fx + R * 0.42, top + 2], [g.fx + R * 0.6, top - 5], Rt], 1.3),
        ),
      ],
      ['rose', union(heart(L[0], L[1] - 1, 6.4), heart(Rt[0], Rt[1] - 1, 6.4))],
    ];
  },
  bowtie: (g) => {
    const y = Math.min(g.y1 - 7, g.fy + g.fh * 1.25);
    const x = g.fx;
    return [
      [
        'rose',
        union(
          poly(
            [
              [x - 2, y],
              [x - 12, y - 6.5],
              [x - 12, y + 6.5],
            ],
            2,
          ),
          poly(
            [
              [x + 2, y],
              [x + 12, y - 6.5],
              [x + 12, y + 6.5],
            ],
            2,
          ),
        ),
      ],
      ['wine', box(x, y, 3.4, 3.8, 1.6)],
    ];
  },
  rose: (g) => {
    const cx = g.x1 - 2;
    const cy = g.fy + g.fh * 0.3;
    const stemEnd = [cx - 13, g.y1 + 2];
    return [
      ['sage', stroke(cx - 1, cy + 8, stemEnd[0], stemEnd[1], 2.3)],
      ['sage', leaf([cx - 6, cy + 18], [cx + 6, cy + 23], 4.2)],
      [
        'rose',
        blend(
          2.4,
          ellipse(cx, cy + 1.5, 11, 9.4),
          circle(cx - 6.5, cy - 5.5, 4.6),
          circle(cx, cy - 7.5, 4.8),
          circle(cx + 6.5, cy - 5.5, 4.6),
        ),
      ],
      ['wine', union(ellipse(cx - 8.5, cy + 3, 3, 6.4, 14), ellipse(cx + 8.5, cy + 3, 3, 6.4, -14))],
      [
        'wine',
        chain(
          [
            [cx - 4.2, cy - 2.5],
            [cx - 1.2, cy + 2.6],
            [cx + 3.2, cy + 0.2],
            [cx + 1.6, cy - 3.6],
            [cx - 1, cy - 1.8],
          ],
          1.3,
        ),
      ],
    ];
  },
  glasses: (g) => {
    const y = g.fy - g.fh * 1.05;
    const dx = g.fw * 0.56;
    const w = Math.max(6.5, g.fw * 0.42);
    return [
      [
        'wine',
        union(
          heart(g.fx - dx, y, w),
          heart(g.fx + dx, y, w),
          stroke(g.fx - dx + w * 0.7, y - w * 0.3, g.fx + dx - w * 0.7, y - w * 0.3, 1.3),
        ),
      ],
      ['rose', union(heart(g.fx - dx, y, w - 2), heart(g.fx + dx, y, w - 2))],
    ];
  },
  letter: (g) => {
    const e = envelope(g.x1 - 8, g.y1 - 13, 14, 10, -12);
    return [
      ['cream', e.paper],
      ['rose', e.flap],
      ['rose', e.seal],
    ];
  },
  stickers: (g) => {
    const y = g.fy + g.fh * 0.62;
    const dx = g.fw * 0.98;
    return [
      [
        'rose',
        union(
          turn(heart(g.fx - dx, y, 5), g.fx - dx, y, -14),
          turn(heart(g.fx + dx, y, 5), g.fx + dx, y, 14),
        ),
      ],
    ];
  },
};

const PROP_ZH = {
  headband: '爱心发箍',
  bowtie: '领结',
  rose: '玫瑰',
  glasses: '爱心眼镜',
  letter: '情书',
  stickers: '脸颊爱心贴',
};

/*
 * Props on existing cast members. The member's own outline and parts are kept; the prop is a set of free parts in
 * front of them, placed from the member's fitted face box, so the face, the motion and the edge come from the engine.
 */
export const COMBOS = [
  {
    id: 'vl-mochi-stickers',
    base: 'mochi',
    member: 'mochi',
    prop: 'stickers',
    concept: '糯糯两颊各贴一颗小红心，贴在引擎腮红的外下方，害羞时腮红和贴纸叠在一起。',
    verdict: '最省事的一件道具：两颗心就把默认角色变成过节版，24 像素还能看到两个红点。',
    at: [50, 52],
    s: 0.84,
  },
  {
    id: 'vl-miso-bowtie',
    base: 'cat',
    member: 'miso',
    prop: 'bowtie',
    concept: '喵喵换成蜜金色，下巴底下系一只玫红领结，像要去赴约。',
    verdict: '领结在脸下面，和猫耳朵一上一下，剪影更完整；领结小，24 像素只剩一个红色横条。',
    at: [50, 48],
    s: 0.84,
  },
  {
    id: 'vl-waddle-bowtie',
    base: 'penguin',
    member: 'waddle',
    prop: 'bowtie',
    concept: '摇摇本来就穿着「燕尾服」，再打一只玫红领结，正好去约会。',
    verdict: '企鹅加领结是现成的笑点；深紫身子上的红领结在小图里也跳得出来。',
    at: [50, 50],
    s: 0.84,
  },
  {
    id: 'vl-bruno-rose',
    base: 'bear',
    member: 'bruno',
    prop: 'rose',
    concept: '巧克力色的熊熊抱着一枝红玫瑰，花头贴在脸颊边上。',
    verdict: '「熊抱玫瑰」是情人节最经典的画面；花头大、茎短，避免细茎在小图里断掉。',
    at: [45, 52],
    s: 0.8,
  },
  {
    id: 'vl-hop-glasses',
    base: 'bunny',
    member: 'hop',
    prop: 'glasses',
    concept: '跳跳把一副爱心墨镜推到额头上，镜片是玫红色，酒红镜框。',
    verdict: '眼镜推在额头上，不挡引擎画的眼睛，表情完全不受影响；两颗心在兔耳下面很醒目。',
    at: [50, 56],
    s: 0.8,
  },
  {
    id: 'vl-oink-stickers',
    base: 'pig',
    member: 'oink',
    prop: 'stickers',
    concept: '哼哼脸颊贴两颗小红心，和粉色身子是一套。',
    verdict: '粉身子配红心，糖果皮肤下很像一颗草莓味硬糖；贴纸和腮红挨着，大笑时最可爱。',
    at: [50, 52],
    s: 0.84,
  },
  {
    id: 'vl-kiki-letter',
    base: 'bob',
    member: 'kiki',
    prop: 'letter',
    own: { hair: 'choc' },
    concept: '琪琪手里拿着一封奶油色情书，信封上封着一颗红心，斜斜地挡在身前。',
    verdict: '人物角色拿信最自然；信封放在右下角，不压脸，24 像素是一块浅色方片。',
    at: [46, 50],
    s: 0.82,
  },
  {
    id: 'vl-chirp-headband',
    base: 'chick',
    member: 'chirp',
    prop: 'headband',
    concept: '啾啾戴上一只酒红色发箍，两根弹簧顶着两颗红心，一蹦一跳地晃。',
    verdict: '发箍把剪影往上拉高了一截，和啾啾的圆身子形成「小天线」；弹簧杆细，24 像素只看得到两颗心。',
    at: [50, 60],
    s: 0.78,
  },
];
for (const c of COMBOS) {
  c.group = 'prop';
  c.zh = castMember(c.member).name.zh;
  c.propZh = PROP_ZH[c.prop];
}

function bounds(points) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of points) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

/** The sheet's colours on the palette. `wine` and `plum` are the theme's own swatches. */
const COLORS = {
  [VL.rose]: 'red',
  [VL.wine]: 'wine',
  [VL.blush]: 'blush',
  [VL.cream]: 'ivory',
  [VL.choc]: 'cocoa',
  [VL.gold]: 'yellow',
  [VL.lilac]: 'lilac',
  [VL.plum]: 'plum',
  [VL.sage]: 'meadow',
  [VL.ink]: 'night',
};

/** A sheet part, [colour name, zone, options], as an engine part: behind the body as a piece of it, else laid on it. */
const toned = (parts, art) =>
  parts.map(([color, zone, options = {}]) => {
    const { behind, move, ...rest } = options;
    return [
      behind ? 'body' : 'leaf',
      zone,
      {
        ...rest,
        c: VL[color],
        ...(behind ? { free: true } : null),
        ...(move ? { move: motionId(art, move), pivot: art.moves[move] } : null),
      },
    ];
  });

/** The theme-wide id of a member's motion, as `src/themes/valentine/motions.ts` declares it: `bonbon-lid`. */
const motionId = (art, move) => `${art.id.replace(/^vl-/, '')}-${move}`;

/** The body each combination's member wears in the sheet, as the lab painted it. */
const COMBO_FILL = {
  'vl-mochi-stickers': VL.lilac,
  'vl-miso-bowtie': VL.gold,
  'vl-waddle-bowtie': VL.plum,
  'vl-bruno-rose': VL.choc,
  'vl-hop-glasses': VL.blush,
  'vl-oink-stickers': VL.blush,
  'vl-kiki-letter': VL.blush,
  'vl-chirp-headband': VL.gold,
};

/**
 * The base parts a combination repaints (`own`, by tone), as [index into the base's parts, sheet colour]. The lab
 * laid such a part flat in its colour, so it is left out of the base and drawn again as a prop of that colour.
 */
const ownParts = (combo) =>
  getShape(combo.base).parts.flatMap((part, i) =>
    combo.own?.[part.tone] ? [[i, VL[combo.own[part.tone]]]] : [],
  );

/** A combination's repainted base parts as props, placed where its member stands. */
function ownProps(combo) {
  const shape = getShape(combo.base);
  const k = (combo.s * 100) / (2 * CENTER);
  const map = ([x, y]) => [combo.at[0] + (x - CENTER) * k, combo.at[1] + (y - CENTER) * k];
  return ownParts(combo).map(([i, c]) => ['leaf', poly(shape.parts[i].outline.map(map)), { c }]);
}

const DESC = {
  'vl-bonbon':
    'A heart-shaped box of chocolates, a rose lid with a gold edge and a gold bow, the face on the blush box.',
  'vl-rose':
    'A single red rose: a ring of petal tips, a deep red swirl in the middle, outer petals and two leaves.',
  'vl-cherub':
    'A round little cherub with gold curls, small lilac wings, a pink bib and a heart-tipped arrow.',
  'vl-ring':
    'An open ring box: lilac velvet with a cream cushion, the plum lid behind, a gold ring with a big diamond.',
  'vl-dove':
    'A little white dove with raised lilac wings, a pink love letter sealed with a heart in its gold beak.',
  'vl-dipped':
    'A chocolate-dipped strawberry, red on top with cream seeds, a wavy chocolate coat below and a white drizzle.',
};

const COMBO_EN = {
  'vl-mochi-stickers': [
    'Heart Stickers Mochi',
    'Mochi with a little red heart stuck on each cheek, just outside its blush.',
  ],
  'vl-miso-bowtie': ['Bow Tie Miso', 'Miso in honey gold with a rose bow tie under its chin, off on a date.'],
  'vl-waddle-bowtie': [
    'Bow Tie Waddle',
    'Waddle already in its tailcoat, with a rose bow tie on top, ready for a date.',
  ],
  'vl-bruno-rose': ['Rose Bruno', 'Chocolate-brown Bruno holding a red rose, the bloom against its cheek.'],
  'vl-hop-glasses': [
    'Heart Glasses Hop',
    'Hop with heart-shaped sunglasses pushed up on its forehead, rose lenses in wine frames.',
  ],
  'vl-oink-stickers': [
    'Heart Stickers Oink',
    'Oink with a little red heart on each cheek, a set with its pink body.',
  ],
  'vl-kiki-letter': [
    'Love Letter Kiki',
    'Kiki holding a cream love letter sealed with a red heart, slanted in front of her.',
  ],
  'vl-chirp-headband': [
    'Heart Headband Chirp',
    'Chirp in a wine headband with two red hearts bobbing on springs.',
  ],
};

export const VALENTINE_SOURCE = labTheme(
  // `motion` here is the page's note on the signature motion, not a motion the theme declares.
  VALENTINE.map((art) => ({ ...art, motion: undefined, parts: toned(art.parts, art), desc: DESC[art.id] })),
  COMBOS.map((combo) => ({
    ...combo,
    prop: combo.propZh,
    paint: { fill: COMBO_FILL[combo.id] },
    drop: ownParts(combo).map(([i]) => i),
    props: () => [...ownProps(combo), ...toned(PROPS[combo.prop](fitOf(combo.base, combo.at, combo.s)))],
    en: COMBO_EN[combo.id][0],
    desc: COMBO_EN[combo.id][1],
  })),
  COLORS,
  {},
  { motions: true },
);
