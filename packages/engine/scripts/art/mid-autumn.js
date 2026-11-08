/**
 * The Mid-Autumn theme as fields in a 100 x 100 box, drawn in the lab's lantern-lit sheet and kept as it was drawn
 * there, but for the one placement noted at its member: the source `generate:faces` bakes into
 * `src/themes/mid-autumn/`. Colours are the sheet's own; `COLORS` maps them onto the engine's palette. `move` names
 * the whole figure's signature motion and a part's `move` the part's own (both declared in the theme's `motions`);
 * `glow`, `halo`, `motion` (the card's prose) and `verdict` are the lab page's notes and are not read here.
 */
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
  stroke,
  union,
} from './sdf.ts';
import { labTheme } from './lab.ts';

/** The sheet's limited palette. Every skin colour comes from here. */
const MA = {
  moon: '#fff0c2',
  white: '#fffaf2',
  gold: '#ffc23d',
  lantern: '#ff8a3d',
  red: '#e8503f',
  crust: '#d4914a',
  peel: '#b6d65c',
  jade: '#4fc29a',
  pink: '#ffa9a6',
  indigo: '#3d4396',
  night: '#141834',
  ink: '#1d1830',
};

/** Florets marked on the osmanthus cluster, all round its rim so the middle stays free for the face. */
const FLORETS = [
  [29, 39],
  [40, 22],
  [58, 20],
  [72, 34],
  [75, 52],
  [65, 66],
  [31, 58],
  [45, 68],
];

/*
 * The new characters. Fields are in a 100 x 100 box; `paint` gives the body fill, the glow colour, the leaf tone and
 * the colour hair is shaded towards (hair is the body ink with 40% of that over it). `move` is the whole-figure
 * signature motion; parts tagged with a move have their own.
 */
export const MIDAUTUMN = [
  {
    id: 'ma-mooncake',
    zh: '饼饼',
    en: 'Cakey',
    group: 'feast',
    concept: '刚出炉的广式月饼，一圈波浪花边，正中压着一朵八瓣花，脸就长在花心里。',
    motion: '被月饼模子「啪」地压一下：先扁下去，再弹回来，花纹像刚压出来。',
    verdict: '花边加浅色花心，24 像素就是一块月饼；没有字，也就不会和任何真实品牌的饼面撞。',
    paint: { fill: MA.crust, glow: MA.lantern, leaf: MA.gold, shade: MA.ink },
    move: 'press',
    face: [50, 47],
    body: () => union(cakeRim(50, 46, 1), cakeRim(50, 54, 1)),
    parts: [
      ['hair', minus(cakeRim(50, 54, 1), cakeRim(50, 46, 1))],
      ['inner', cakeFlower(50, 46, 1)],
      ...cakeFlutes(50, 46, 1).map((z) => ['hair', z]),
    ],
  },
  {
    id: 'ma-rabbit',
    zh: '玉玉',
    en: 'Jadey',
    group: 'moon',
    concept: '月宫里的小玉兔，坐在一只玉色石臼后面，两只爪子扶着杵，长耳朵里透一点粉。',
    motion: '捣药：杵一下一下砸进臼里，身子跟着每一下点头。',
    verdict: '白兔加绿臼，长耳朵撑起剪影，24 像素依然认得出；杵是单独动的零件，小图里是一根短竖条。',
    paint: { fill: MA.white, glow: MA.moon, leaf: MA.jade, shade: MA.pink },
    move: 'pound',
    face: [44, 50],
    body: () => blend(4, circle(43, 51, 28), rabbitEars(), stroke(64, 60, 72, 56, 4.2), mortar()),
    parts: [
      ['hair', ellipse(33, 18, 3, 10, -12), { inset: 1.6 }],
      ['hair', ellipse(51, 16, 3, 10, 10), { inset: 1.6 }],
      ['leaf', grow(mortar(), 0.4)],
      ['leaf', union(stroke(77, 30, 77, 68, 2.6, 4.8), circle(77, 29, 3.6)), { move: 'pestle' }],
      ['inner', ellipse(74, 54, 4.8, 3.8, -10), { move: 'pestle' }],
    ],
  },
  {
    id: 'ma-lantern',
    zh: '拉拉',
    en: 'Tuggy',
    group: 'lantern',
    concept: '老式兔子灯：红纸糊的圆肚子，竖着两只兔耳朵，脚下四个小木轮，前面拴着一根拉绳。',
    motion: '被绳子拉着滚：往前溜一段，轮子一顿，身子一晃，再退回来。',
    verdict: '横着的圆肚子加耳朵加轮子，24 像素是一只带轮子的兔子；拉绳太细，48 像素以下就看不见了。',
    paint: { fill: MA.red, glow: MA.lantern, leaf: MA.gold, shade: MA.ink },
    move: 'roll',
    face: [58, 54],
    body: () => blend(4, ellipse(46, 56, 33, 22), lanternEars(), circle(13, 52, 6.5), lanternWheels()),
    parts: [
      ['inner', ellipse(57, 26, 2.6, 10, 16), { inset: 1.4 }],
      ['inner', ellipse(71, 29, 2.6, 9.4, 34), { inset: 1.4 }],
      ['leaf', meet(ellipse(46, 56, 33.6, 22.6), below(70))],
      ['hair', grow(lanternWheels(), 0.4)],
      ['leaf', union(circle(28, 84, 2.6), circle(62, 84, 2.6)), { free: true }],
      [
        'hair',
        chain(
          [
            [78, 64],
            [88, 70],
            [96, 62],
          ],
          1.3,
        ),
        { free: true },
      ],
    ],
  },
  {
    id: 'ma-osmanthus',
    zh: '桂桂',
    en: 'Sprig',
    group: 'feast',
    concept: '一小枝桂花：一簇金黄的四瓣小碎花挤在叶腋里，后面伸出两片深绿的尖叶子，底下一根细枝。',
    motion: '风一吹整枝从枝根晃一晃，抖下两三朵小金花，一路飘下去。',
    verdict: '不规则的一簇小花加一对尖叶，24 像素是一枝金黄的花；花簇故意不做成圆盘，免得像向日葵。',
    paint: { fill: MA.gold, glow: MA.gold, leaf: MA.jade, shade: MA.lantern },
    move: 'sway',
    face: [50, 46],
    body: () => blend(3, florets(), stroke(50, 62, 47, 95, 2.6, 3.4), leaves()),
    parts: [
      ['leaf', union(minus(leaves(), grow(florets(), 0.6)), meet(stroke(50, 62, 47, 95, 3, 3.8), below(64)))],
      ...FLORETS.map(([x, y]) => ['inner', floret(x, y, 1.3)]),
      ...FLORETS.map(([x, y]) => ['hair', circle(x, y, 1.1)]),
    ],
  },
  {
    id: 'ma-moon',
    zh: '皎皎',
    en: 'Beamy',
    group: 'moon',
    concept: '中秋的满月，又圆又亮，边上几个软软的浅坑，底下托着一朵祥云。',
    motion: '光晕像呼吸一样一涨一落，月亮跟着慢慢升一点、落一点。',
    verdict: '正圆加月坑加祥云，24 像素是一轮带云的月亮；光晕是它最大的特点，原样皮肤里就少了一半味道。',
    paint: { fill: MA.moon, glow: MA.gold, leaf: MA.white, shade: MA.gold, halo: 1.5 },
    move: 'breathe',
    face: [50, 48],
    body: () => circle(50, 46, 37),
    parts: [
      ['hair', circle(26, 30, 6.5)],
      ['hair', circle(72, 26, 4.4)],
      ['hair', circle(76, 60, 6)],
      ['hair', circle(23, 58, 3.6)],
      ['leaf', cloud(), { free: true }],
    ],
  },
  {
    id: 'ma-pomelo',
    zh: '柚柚',
    en: 'Zesty',
    group: 'feast',
    concept: '剥好的红心柚子，把自己那层厚厚的绿皮翻过来当帽子戴，帽顶还留着一截柚子蒂和一片叶。',
    motion: '掀帽子打招呼：柚子皮帽往上一掀、歪一下，再扣回头上。',
    verdict: '粉红果肉配绿皮帽，24 像素也分得清帽子和脸；帽子是单独动的零件，借给别人戴也一样。',
    paint: { fill: MA.pink, glow: MA.lantern, leaf: MA.peel, shade: MA.red },
    move: 'nod',
    face: [50, 64],
    body: () => ellipse(50, 63, 32, 29),
    parts: [
      ['leaf', peelHat(50, 42, 1), { move: 'hat' }],
      ['inner', peelRim(50, 42, 1), { move: 'hat' }],
    ],
  },
  {
    id: 'ma-skylantern',
    zh: '祈祈',
    en: 'Wishy',
    group: 'lantern',
    concept: '许愿的孔明灯：上宽下窄的纸灯罩，底口一圈竹箍，下面吊着一小团火，纸被火映得暖洋洋的。',
    motion: '慢慢升空，左右飘一点；底下的小火苗一跳一跳。',
    verdict: '上圆下窄的灯罩加一团火，24 像素是一盏亮着的灯；和拉拉的横向剪影正好相反。',
    paint: { fill: MA.lantern, glow: MA.gold, leaf: MA.gold, shade: MA.red },
    move: 'rise',
    face: [50, 50],
    body: () =>
      blend(
        4,
        ellipse(50, 33, 27, 21),
        poly(
          [
            [24, 36],
            [76, 36],
            [65, 78],
            [35, 78],
          ],
          4,
        ),
      ),
    parts: [
      ['hair', box(50, 79, 17, 3.2, 2)],
      ...[-1, 1].map((m) => [
        'hair',
        chain(
          [
            [50 + m * 13, 14],
            [50 + m * 19, 34],
            [50 + m * 14, 62],
          ],
          0.9,
        ),
        { inset: 3 },
      ]),
      ['hair', union(stroke(37, 81, 50, 90, 0.9), stroke(63, 81, 50, 90, 0.9)), { free: true }],
      [
        'leaf',
        union(
          circle(50, 92, 4.6),
          poly(
            [
              [50, 81],
              [45.6, 91],
              [54.4, 91],
            ],
            0.8,
          ),
        ),
        { move: 'flame' },
      ],
    ],
  },
  {
    id: 'ma-crab',
    zh: '蟹蟹',
    en: 'Pinchy',
    group: 'feast',
    concept: '秋天的大闸蟹，青黑的蟹壳，两只大钳子举得高高的，钳子根上裹着一圈金棕色的绒毛。',
    motion: '横着走：一步一步往旁边挪，挪一步钳子举一下。',
    verdict: '宽壳加两只举高的钳子加绒毛，24 像素一眼是螃蟹；没有寄居蟹的螺壳，和那只分得开。',
    paint: { fill: MA.indigo, glow: MA.jade, leaf: MA.crust, shade: MA.jade },
    move: 'scuttle',
    face: [50, 62],
    body: () => blend(3, ellipse(50, 62, 31, 20), crabClaws(), crabLegs(), crabMittens()),
    parts: [
      ['leaf', grow(crabMittens(), 0.4)],
      ['hair', grow(crabLegs(), 0.4)],
    ],
  },
];

// ---- Shape pieces -------------------------------------------------------------------------------------

/** The fluted rim: a disc with sixteen round flutes, scaled by s about (cx, cy). */
function cakeRim(cx, cy, s) {
  const R = 33 * s;
  const bumps = Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI) / 8;
    return circle(cx + R * Math.cos(a), cy + R * Math.sin(a), 5.8 * s);
  });
  return union(circle(cx, cy, R), ...bumps);
}

/** The pressed flower: a round heart with eight petals. */
function cakeFlower(cx, cy, s) {
  const petals = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    return circle(cx + 17 * s * Math.cos(a), cy + 17 * s * Math.sin(a), 7.4 * s);
  });
  return blend(2 * s, circle(cx, cy, 19 * s), ...petals);
}

/** Short grooves between the flutes. */
function cakeFlutes(cx, cy, s) {
  return Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI) / 8 + Math.PI / 16;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    return stroke(cx + 29 * s * c, cy + 29 * s * sn, cx + 34.5 * s * c, cy + 34.5 * s * sn, 0.95 * s);
  });
}

function rabbitEars() {
  return union(ellipse(33, 19, 6.5, 15, -12), ellipse(51, 17, 6.5, 15, 10));
}

/** A round-bellied mortar on a short foot, in front of the rabbit's lap. */
function mortar() {
  return union(meet(ellipse(58, 76, 25, 18), below(76)), box(58, 76, 26, 3.4, 3), box(58, 94, 12, 3, 2));
}

function lanternEars() {
  return union(ellipse(57, 26, 5.6, 15, 16), ellipse(71, 29, 5.6, 14, 34));
}

function lanternWheels() {
  return union(circle(28, 84, 8.5), circle(62, 84, 8.5));
}

/** An uneven cluster of round florets, deliberately not a disc. */
function florets() {
  return blend(
    3,
    circle(44, 42, 16),
    circle(60, 38, 14),
    circle(38, 56, 12),
    circle(56, 56, 15),
    circle(70, 50, 10),
    circle(46, 26, 10),
    circle(31, 40, 10),
    circle(62, 24, 8),
  );
}

/** A four-petal floret mark. */
function floret(x, y, s) {
  return union(
    ...[
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ].map(([dx, dy]) => circle(x + 2.1 * s * dx, y + 2.1 * s * dy, 2 * s)),
  );
}

/** A pointed leaf from (x0, y0) to (x1, y1), half as wide as w: the lens where two circles meet. */
function lens(x0, y0, x1, y1, w) {
  const L = Math.hypot(x1 - x0, y1 - y0);
  const R = (L * L) / 4 / (2 * w) + w / 2;
  const nx = -(y1 - y0) / L;
  const ny = (x1 - x0) / L;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const o = R - w;
  return meet(circle(mx + nx * o, my + ny * o, R), circle(mx - nx * o, my - ny * o, R));
}

function leaves() {
  return union(lens(48, 70, 10, 76, 7.5), lens(50, 64, 90, 70, 7));
}

function cloud() {
  return blend(2, circle(18, 80, 7), circle(30, 76, 9.5), circle(43, 81, 7), box(30, 85, 19, 3.6, 3.6));
}

/** A dome of pomelo peel, its brim centred on (cx, by), scaled by s, with a stalk and one leaf. */
function peelHat(cx, by, s) {
  const p = (x, y) => [cx + x * s, by + y * s];
  return union(
    meet(ellipse(...p(0, 2), 29 * s, 24 * s), above(by + 1 * s)),
    stroke(...p(0, -21), ...p(2, -28), 2.6 * s, 2 * s),
    ellipse(...p(11, -27), 7.5 * s, 3.4 * s, -18),
  );
}

/** The thick white pith showing at the hat's brim. */
function peelRim(cx, by, s) {
  return box(cx, by + 1 * s, 29.5 * s, 3.8 * s, 3.4 * s);
}

function crabClaws() {
  const claw = (m) => {
    const X = (x) => (m > 0 ? x : 100 - x);
    return union(
      chain(
        [
          [X(26), 60],
          [X(16), 50],
          [X(14), 40],
        ],
        3.6,
        3.2,
      ),
      minus(
        ellipse(X(14), 26, 10, 12.5, m * -8),
        poly(
          [
            [X(14), 25],
            [X(9), 9],
            [X(19), 10],
          ],
          1.4,
        ),
      ),
    );
  };
  return union(claw(1), claw(-1));
}

function crabMittens() {
  const side = (m) => {
    const X = (x) => (m > 0 ? x : 100 - x);
    return union(
      ...[
        [11, 38],
        [17, 38],
        [9, 43],
        [19, 43],
        [14, 46],
      ].map(([x, y]) => circle(X(x), y, 3.6)),
    );
  };
  return union(side(1), side(-1));
}

function crabLegs() {
  const side = (m) => {
    const X = (x) => (m > 0 ? x : 100 - x);
    return union(
      chain(
        [
          [X(24), 66],
          [X(11), 69],
          [X(5), 77],
        ],
        2.8,
        2.1,
      ),
      chain(
        [
          [X(27), 72],
          [X(16), 79],
          [X(12), 88],
        ],
        2.8,
        2.1,
      ),
      chain(
        [
          [X(33), 77],
          [X(26), 86],
          [X(25), 95],
        ],
        2.8,
        2.1,
      ),
    );
  };
  return union(side(1), side(-1));
}

// ---- Props --------------------------------------------------------------------------------------------

function bunnyEars(cx, by, s) {
  const p = (x, y) => [cx + x * s, by + y * s];
  return union(ellipse(...p(-11, -14), 7 * s, 17 * s, -14), ellipse(...p(11, -14), 7 * s, 17 * s, 14));
}
function bunnyEarsInner(cx, by, s) {
  const p = (x, y) => [cx + x * s, by + y * s];
  return union(ellipse(...p(-11, -13), 3.2 * s, 11 * s, -14), ellipse(...p(11, -13), 3.2 * s, 11 * s, 14));
}

/** A tiny round lantern hanging from the tip of a stick held at (hx, hy). */
function stickLantern(hx, hy, tx, ty) {
  return {
    stick: chain(
      [
        [hx, hy],
        [tx - 9, ty + 2],
        [tx, ty - 1],
      ],
      1.6,
      1.3,
    ),
    lamp: union(stroke(tx, ty, tx, ty + 6, 0.8), ellipse(tx, ty + 14, 8.5, 8)),
    caps: union(
      box(tx, ty + 6.4, 4.4, 1.6, 1.2),
      box(tx, ty + 21.6, 4.4, 1.6, 1.2),
      stroke(tx, ty + 23, tx, ty + 28, 1),
    ),
  };
}

/** A small mooncake held in front, its flower in the inner tone. */
function heldCake(cx, cy, s) {
  return { rim: cakeRim(cx, cy, s), flower: cakeFlower(cx, cy, s) };
}

function hairpin(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const fl = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    return circle(x1 + 5 * Math.cos(a), y1 + 5 * Math.sin(a), 3.4);
  });
  return {
    pin: stroke(x0, y0, x1 - dx * 0.1, y1 - dy * 0.1, 1.3),
    flowers: union(circle(x1, y1, 4), ...fl),
    leaf: ellipse(x1 + 9, y1 + 6, 6, 2.8, 35),
  };
}

/*
 * Props on existing cast members. The member's own outline and parts are kept; the prop is a set of free parts in
 * front of them, so the face, the motion and the glow all come from the engine and the skin as usual.
 */
export const COMBOS = [
  {
    id: 'ma-mochi-ears',
    base: 'mochi',
    member: 'mochi',
    zh: '糯糯',
    prop: '兔耳朵',
    concept: '糯糯换成玉色，头顶别一对兔耳朵发箍，当一晚上的玉兔。',
    verdict: '耳朵是挂在原身体前面的零件，糯糯的脸和动作一点没动；玉色身子配白耳朵，一看就是「扮成玉兔」。',
    paint: { fill: MA.jade, glow: MA.moon, leaf: MA.white },
    at: [50, 60],
    s: 0.76,
    props: () => [
      ['leaf', bunnyEars(50, 34, 1)],
      ['inner', bunnyEarsInner(50, 34, 1)],
    ],
  },
  {
    id: 'ma-hop-cake',
    base: 'bunny',
    member: 'hop',
    zh: '跳跳',
    prop: '月饼',
    concept: '小兔子跳跳双手捧着一块比脸还大的月饼，舍不得吃。',
    verdict: '兔子本来就是中秋的角色，加一块月饼就到了节日里；月饼压在肚子前面，不挡脸。',
    paint: { fill: MA.white, glow: MA.moon, leaf: MA.crust, shade: MA.pink },
    at: [50, 47],
    s: 0.74,
    props: () => {
      const c = heldCake(50, 82, 0.5);
      return [
        ['leaf', c.rim],
        ['inner', c.flower],
      ];
    },
  },
  {
    id: 'ma-chirp-cake',
    base: 'chick',
    member: 'chirp',
    zh: '啾啾',
    prop: '月饼',
    concept: '小鸡啾啾抱着一块月饼，月饼差不多和它一样大。',
    verdict: '黄小鸡配棕月饼，颜色不打架；月饼一大，角色就有了「吃不完」的小故事。',
    paint: { fill: MA.gold, glow: MA.lantern, leaf: MA.crust, shade: MA.lantern },
    at: [50, 46],
    s: 0.76,
    props: () => {
      const c = heldCake(52, 80, 0.5);
      return [
        ['leaf', c.rim],
        ['inner', c.flower],
      ];
    },
  },
  {
    id: 'ma-lulu-pin',
    base: 'twinbuns',
    member: 'lulu',
    zh: '露露',
    prop: '桂花簪',
    concept: '露露的发髻上插一支桂花簪，簪头一小簇金桂和一片叶。',
    verdict: '簪子插在发髻里不碰脸，金色小花在深色头发上最亮，小图里是一个黄点。',
    paint: { fill: MA.pink, glow: MA.gold, leaf: MA.gold, shade: MA.indigo },
    at: [50, 56],
    s: 0.8,
    props: () => {
      const h = hairpin(36, 30, 22, 18);
      return [
        ['hair', h.pin],
        ['leaf', h.flowers],
        ['inner', h.leaf],
      ];
    },
  },
  {
    id: 'ma-kiki-pin',
    base: 'bob',
    member: 'kiki',
    zh: '琪琪',
    prop: '桂花簪',
    concept: '琪琪的短发一侧别了一枝桂花，像是刚从桂花树下走过。',
    verdict: '同一支簪子换个角色，位置挪到鬓边；零件是共用的，只改坐标。',
    paint: { fill: MA.moon, glow: MA.gold, leaf: MA.gold, shade: MA.crust },
    at: [50, 54],
    s: 0.8,
    // At the side of the bob rather than its top, clear of the effects a state throws above the head.
    props: () => {
      const h = hairpin(72, 47, 84, 40);
      return [
        ['hair', h.pin],
        ['leaf', h.flowers],
        ['inner', h.leaf],
      ];
    },
  },
  {
    id: 'ma-miso-lamp',
    base: 'cat',
    member: 'miso',
    zh: '喵喵',
    prop: '小灯笼',
    concept: '喵喵举着一根小竹竿，竿头吊着一盏圆圆的红灯笼，走一步晃一下。',
    verdict: '灯笼挂在竿头单独晃，猫自己的动作照常；红灯笼在橙猫旁边很跳，24 像素也看得见一个红点。',
    paint: { fill: MA.lantern, glow: MA.gold, leaf: MA.red, shade: MA.ink },
    at: [42, 58],
    s: 0.74,
    props: () => {
      const l = stickLantern(64, 82, 86, 26);
      return [
        ['hair', l.stick],
        ['leaf', l.lamp, 'swing'],
        ['inner', l.caps, 'swing'],
      ];
    },
  },
  {
    id: 'ma-waddle-lamp',
    base: 'penguin',
    member: 'waddle',
    zh: '摇摇',
    prop: '小灯笼',
    concept: '企鹅摇摇也提着小灯笼出门赏月，灯笼比它的翅膀还长。',
    verdict: '深蓝的企鹅靠暖光的光晕从夜色里分出来，红灯笼再点一下，是深色角色在这套皮肤里最好的例子。',
    paint: { fill: MA.indigo, glow: MA.gold, leaf: MA.red, shade: MA.moon },
    at: [42, 56],
    s: 0.76,
    props: () => {
      const l = stickLantern(62, 74, 84, 26);
      return [
        ['hair', l.stick],
        ['leaf', l.lamp, 'swing'],
        ['inner', l.caps, 'swing'],
      ];
    },
  },
  {
    id: 'ma-bao-hat',
    base: 'bun',
    member: 'bao',
    zh: '包包',
    prop: '柚子皮帽',
    concept: '包包戴上柚柚同款的柚子皮帽，小时候过中秋都这么戴。',
    verdict: '帽子和柚柚是同一个零件，掀帽子的动作也一起借来了；白包子配绿帽子，很有节日照片的感觉。',
    paint: { fill: MA.white, glow: MA.gold, leaf: MA.peel, shade: MA.crust },
    at: [50, 62],
    s: 0.76,
    props: () => [
      ['leaf', peelHat(50, 39, 0.92), 'hat'],
      ['inner', peelRim(50, 39, 0.92), 'hat'],
    ],
  },
  {
    id: 'ma-pip-hat',
    base: 'blob',
    member: 'pip',
    zh: '团团',
    prop: '柚子皮帽',
    concept: '团团把柚子皮帽压得低低的，帽檐快碰到眼睛。',
    verdict: '软团子戴硬帽子，帽子跟着团团一起挤压弹跳；帽子只占头顶，表情完全露出来。',
    paint: { fill: MA.gold, glow: MA.lantern, leaf: MA.peel, shade: MA.lantern },
    at: [50, 62],
    s: 0.76,
    props: () => [
      ['leaf', peelHat(50, 37, 0.95), 'hat'],
      ['inner', peelRim(50, 37, 0.95), 'hat'],
    ],
  },
];

/**
 * The sheet's colours on the palette. The moon's cream and the rabbit's white keep apart, so the moon's cloud
 * stands off the disc; the baked crust, the jade, the pomelo's peel and the indigo are the theme's own.
 */
const COLORS = {
  [MA.moon]: 'cream',
  [MA.white]: 'ivory',
  [MA.gold]: 'yellow',
  [MA.lantern]: 'orange',
  [MA.red]: 'red',
  [MA.crust]: 'crust',
  [MA.peel]: 'peel',
  [MA.jade]: 'jade',
  [MA.pink]: 'blush',
  [MA.indigo]: 'indigo',
  [MA.night]: 'night',
  [MA.ink]: 'night',
};

/**
 * The swatches hair parts take where the lab shaded them towards a colour: the swatch nearest the mix the lab drew
 * on the body that uses it. Hair shaded towards `ink`, `indigo`, `jade`, `moon` or `red` keeps the hair tone, which
 * the lantern skin shades towards a deep tone of the ink (so a sky lantern's ribs and hoop come out a deeper
 * orange than its paper) and on the indigo body towards its jade light.
 */
const SHADES = {
  [MA.pink]: 'blush',
  [MA.lantern]: 'orange',
  [MA.gold]: 'butter',
  [MA.crust]: 'crust',
};

const DESC = {
  'ma-mooncake':
    'A fresh mooncake with a fluted rim and an eight-petal flower pressed in the middle, the face in its heart.',
  'ma-rabbit':
    'The little jade rabbit of the moon behind a jade mortar, both paws on the pestle, pink inside its long ears.',
  'ma-lantern':
    'An old rabbit lantern: a round red paper belly, two upright ears, four little wheels and a pull cord.',
  'ma-osmanthus':
    'A sprig of osmanthus: a cluster of tiny gold four-petal florets, two pointed dark leaves and a twig.',
  'ma-moon': 'The full moon of the festival, round and bright with a few soft craters, on a lucky cloud.',
  'ma-pomelo': 'A peeled pink pomelo wearing its own thick green peel as a hat, stalk and leaf still on top.',
  'ma-skylantern':
    'A wish lantern: a paper shade wide at the top, a bamboo hoop at the mouth and a little flame below.',
  'ma-crab':
    'An autumn hairy crab with a blue-black shell, two big claws held high and gold fuzz at their roots.',
};

const COMBO_EN = {
  'ma-mochi-ears': [
    'Bunny Ears Mochi',
    'Mochi in jade with a bunny-ear headband, the jade rabbit for one night.',
  ],
  'ma-hop-cake': [
    'Mooncake Hop',
    'Hop holding a mooncake bigger than its face in both paws, too precious to eat.',
  ],
  'ma-chirp-cake': ['Mooncake Chirp', 'Chirp hugging a mooncake almost as big as itself.'],
  'ma-lulu-pin': [
    'Osmanthus Pin Lulu',
    'Lulu with an osmanthus hairpin in her bun, a cluster of gold florets and a leaf.',
  ],
  'ma-kiki-pin': ['Osmanthus Pin Kiki', 'Kiki with a sprig of osmanthus pinned at one side of her bob.'],
  'ma-miso-lamp': [
    'Lantern Miso',
    'Miso holding up a bamboo rod with a round red lantern swinging from its tip.',
  ],
  'ma-waddle-lamp': [
    'Lantern Waddle',
    'Waddle out to see the moon with a little lantern longer than its flipper.',
  ],
  'ma-bao-hat': [
    'Peel Hat Bao',
    'Bao in the same pomelo-peel hat, the way children wear it at the festival.',
  ],
  'ma-pip-hat': [
    'Peel Hat Pip',
    'Pip with the pomelo-peel hat pulled down low, the brim almost at its eyes.',
  ],
};

/** The streams a whole-figure motion brings with it: florets shaken off, sparks from the flame, glints by the moon. */
const EMITS = { sway: 'fall', rise: 'spark', breathe: 'glint' };

/** Where the lab's page turned the figure: 50% across and 90% down its box, the sprig from the foot of its stem. */
const PIVOTS = { sway: [50, 96] };

export const MID_AUTUMN_SOURCE = labTheme(
  MIDAUTUMN.map((art) => ({
    ...art,
    desc: DESC[art.id],
    motion: EMITS[art.move] ? [art.move, EMITS[art.move]] : art.move,
    pivot: PIVOTS[art.move] ?? [50, 90],
  })),
  COMBOS.map((combo) => ({ ...combo, en: COMBO_EN[combo.id][0], desc: COMBO_EN[combo.id][1] })),
  COLORS,
  SHADES,
  { motions: true },
);
