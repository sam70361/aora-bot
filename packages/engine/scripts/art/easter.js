/**
 * The Easter theme as fields in a 100 x 100 box, drawn in the lab's pastel crayon sheet and kept as it was drawn
 * there: the source `generate:faces` bakes into `src/themes/easter/`. Colours are the sheet's own; `COLORS` maps them
 * onto the engine's palette, and a part's `tint` names the sheet colour it is laid flat in. Where the lab shaded a
 * hair part towards another colour, the part is laid flat in the swatch nearest the colour the lab showed. `sig`
 * names the figure's signature motion (declared in `src/themes/easter/motions.ts`), which `EASTER_SOURCE` hands to
 * `labTheme` as `motion` with its pivot; `motion` and `verdict` are the lab page's notes and are not read here.
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
  shell,
  stroke,
  union,
} from './sdf.ts';
import { labTheme } from './lab.ts';

/** The sheet's limited palette. Every skin colour comes from here. */
const EA = {
  pink: '#ffb3c6',
  mint: '#a8e4c8',
  butter: '#ffe38f',
  lilac: '#cbb5f0',
  sky: '#a6d3f2',
  choc: '#7a4a32',
  carrot: '#ff9c55',
  leaf: '#7cc98f',
  cream: '#fff8ea',
  ink: '#3d2e43',
};

/** The colours the lab's hair tone showed where it shaded a sheet colour towards chocolate. */
const MIX = {
  caramel: '#caa66a',
  rust: '#ca7b47',
};

/** A triangle wave between -a and a with period p: the zigzag on bands, cracks and grass. */
const tri = (x, p, a) => a * (4 * Math.abs(((((x / p) % 1) + 1) % 1) - 0.5) - 1);

/*
 * The new characters. Fields are in a 100 x 100 box; `paint` gives the body fill, the leaf tone and the colour hair
 * is shaded towards (hair is the body fill with 40% of that over it). A part's `tint` repaints it in another
 * palette colour where three tones are not enough (eggs in a basket, a foil wrapper). `sig` names the signature
 * motion the skin plays, `motion` says it in words.
 */
export const EASTER = [
  {
    id: 'ea-dapple',
    zh: '绘绘',
    en: 'Dapple',
    group: 'hunt',
    concept: '画好的彩蛋站在一只粉色蛋杯里，蛋顶一圈锯齿花纹，下面一排圆点，蛋杯有细腰和圆底座。',
    motion: '在蛋杯里左右晃，像不倒翁一样晃两下才站稳',
    sig: 'rock',
    verdict:
      '蛋杯的细腰和圆底座让它和引擎原有的蛋分得开：24 像素是一只高脚杯托着一颗蛋。锯齿和圆点在小图里并成蛋顶一道深色带，正好提示这是画过的蛋。',
    paint: { fill: EA.sky, leaf: EA.pink, shade: EA.pink },
    face: [50, 39],
    body: () => blend(3, dappleEgg(), eggcup()),
    parts: [
      ['hair', (x, y) => Math.abs(y - (22 + tri(x, 9, 2.4))) - 2.3, { tint: 'lilac' }],
      ...[36, 43, 50, 57, 64].map((x) => ['hair', circle(x, 53, 2.1), { tint: 'lilac' }]),
      ['leaf', eggcup()],
      ['inner', box(50, 60.5, 28, 3.4, 3), { tint: 'cream' }],
    ],
  },
  {
    id: 'ea-wicker',
    zh: '筐筐',
    en: 'Wicker',
    group: 'hunt',
    concept: '编织小提篮，篮口铺着一圈绿草，草里卧着粉、蓝、紫三颗彩蛋，提手高高拱在上面。',
    motion: '像被人拎起提手一样，整只篮子前后荡一荡',
    sig: 'swing',
    verdict:
      '拱形提手单独外扩，中间那块空着，剪影一看就是篮子；三颗彩蛋靠零件上色涂成粉、蓝、紫。编织纹压到篮底一条，不和嘴挤在一起。',
    paint: { fill: EA.butter, leaf: EA.leaf, shade: EA.choc },
    face: [50, 73],
    body: () => blend(3, basketBody(), basketRim(), ...basketEggs(), basketGrass()),
    parts: [
      ['body', meet(shell(ellipse(50, 57, 28, 41), 2.8), above(51)), { free: true }],
      ['leaf', grow(basketGrass(), 0.4)],
      ...basketEggs().map((e, i) => ['inner', grow(e, 0.4), { tint: ['pink', 'sky', 'lilac'][i] }]),
      ['hair', grow(basketRim(), 0.4), { tint: 'caramel' }],
      ['hair', box(50, 85.5, 40, 2.8), { tint: 'caramel' }],
      [
        'inner',
        union(...[30, 38, 46, 54, 62, 70].map((x) => stroke(x, 83.5, x + 1.5, 87.5, 0.9))),
        { tint: 'cream' },
      ],
    ],
  },
  {
    id: 'ea-cocoa',
    zh: '啃啃',
    en: 'Cocoa',
    group: 'hunt',
    concept: '巧克力小兔坐在蓝色锡纸里，右耳被谁咬掉了一口，缺口露出浅一档的巧克力断面。',
    motion: '被太阳一晒，软软地往下塌一点，再慢慢挺回来',
    sig: 'melt',
    verdict:
      '全套唯一的深色身体，脸自动换成米白。缺口耳朵、粉丝带和锯齿边锡纸三样一起才说清「被咬过的巧克力兔」；24 像素只剩一只棕兔坐在蓝底座上，缺口要 48 像素才看得出。',
    paint: { fill: EA.choc, leaf: EA.sky, shade: EA.ink },
    face: [50, 45],
    body: () =>
      blend(
        4,
        circle(50, 44, 21),
        ellipse(50, 72, 25, 19),
        ellipse(40, 16, 6.5, 15, -10),
        cocoaEar(),
        cocoaFoil(),
      ),
    parts: [
      ['inner', ellipse(40, 19, 2.8, 9.5, -10)],
      ['inner', meet(minus(grow(cocoaBite(), 2.4), cocoaBite()), ellipse(61, 21, 6.5, 12, 12))],
      ['inner', box(50, 64, 30, 2.4, 1), { tint: 'pink' }],
      [
        'inner',
        union(ellipse(43, 64, 5.6, 3.6, 20), ellipse(57, 64, 5.6, 3.6, -20)),
        { free: true, tint: 'pink' },
      ],
      ['inner', circle(50, 64, 2.4), { free: true, tint: 'cream' }],
      ['leaf', grow(cocoaFoil(), 0.4)],
      [
        'inner',
        union(stroke(32, 86, 35, 93, 0.9), stroke(46, 85, 45, 94, 0.9), stroke(60, 86, 63, 93, 0.9)),
        { tint: 'cream' },
      ],
    ],
  },
  {
    id: 'ea-crunchy',
    zh: '卜卜',
    en: 'Crunchy',
    group: 'spring',
    concept: '胖胖的胡萝卜，上宽下尖，头顶三片绿叶子，身上几道浅浅的横纹。',
    motion: '像刚从土里拔出来：先往下一缩，再嗖地弹起来',
    sig: 'pop',
    verdict:
      '最简单也最稳：橙色倒三角加三片绿叶，24 像素一眼就是胡萝卜。横纹用 hair 色调，脸的定位会自动绕开它们。',
    paint: { fill: EA.carrot, leaf: EA.leaf, shade: EA.choc },
    face: [50, 48],
    body: () =>
      blend(
        7,
        ellipse(50, 46, 25, 17),
        poly(
          [
            [28, 46],
            [72, 46],
            [52.5, 95],
            [47.5, 95],
          ],
          3.5,
        ),
        carrotLeaves(),
      ),
    parts: [
      ['leaf', meet(grow(carrotLeaves(), 0.5), above(31.5))],
      [
        'hair',
        union(stroke(39, 70, 46, 71.5, 1.3), stroke(54, 79, 60, 77.5, 1.3), stroke(44, 87, 49, 88, 1.1)),
        { tint: 'rust' },
      ],
    ],
  },
  {
    id: 'ea-posy',
    zh: '菊菊',
    en: 'Posy',
    group: 'spring',
    concept: '一朵小雏菊，一圈细长的白花瓣围着黄花心，脸就长在花心上，下面一小截绿茎和一片叶子。',
    motion: '迎着风，花头绕着茎根左右点头',
    sig: 'sway',
    verdict:
      '身体只有黄花心，花瓣是垫在身体后面的独立零件，所以眼睛按花心的大小来，不会被一圈花瓣撑大；十四片细长花瓣和引擎那朵圆胖的花一看就不同。',
    paint: { fill: EA.cream, leaf: EA.butter, shade: EA.leaf },
    face: [50, 42],
    body: () => circle(50, 42, 20),
    parts: [
      ['body', daisyPetals(), { free: true }],
      ['leaf', circle(50, 42, 20.6)],
      [
        'hair',
        minus(union(stroke(50, 78, 50, 99, 2.6), ellipse(59, 91, 7.5, 3.4, -30)), grow(daisyPetals(), 0.8)),
        { free: true, tint: 'mint' },
      ],
    ],
  },
  {
    id: 'ea-breezy',
    zh: '蝶蝶',
    en: 'Breezy',
    group: 'spring',
    concept: '圆身子的小蝴蝶，两对紫翅膀上点着黄色大斑和粉蓝小圆点，头顶两根带小球的触角。',
    motion: '扑扇两下翅膀，借风往上一飘',
    sig: 'flutter',
    verdict:
      '翅膀也垫在身体后面，脸只占中间的粉色圆身子。剪影最宽，24 像素下是一只紫色的蝴蝶结形，触角细到看不见，翅膀上的黄斑还在。',
    paint: { fill: EA.lilac, leaf: EA.butter, shade: EA.ink },
    face: [50, 57],
    body: () => ellipse(50, 56, 17, 21),
    parts: [
      ['body', butterflyWings(), { free: true }],
      ['inner', ellipse(50, 56, 17.6, 21.6), { tint: 'pink' }],
      ...[1, -1].flatMap((m) => {
        const X = (x) => (m > 0 ? x : 100 - x);
        return [
          ['leaf', circle(X(22), 31, 7.5), { free: true }],
          ['inner', circle(X(12), 24, 3), { free: true, tint: 'pink' }],
          ['inner', circle(X(26), 76, 4.8), { free: true, tint: 'sky' }],
        ];
      }),
      ['hair', minus(antennae(), ellipse(50, 56, 18, 22)), { free: true }],
    ],
  },
  {
    id: 'ea-peeky',
    zh: '叽叽',
    en: 'Peeky',
    group: 'spring',
    concept: '刚破壳的小鸡，下半身还坐在蛋壳里，头顶歪扣着一片锯齿边的蛋壳帽，两只小翅膀从壳沿探出来。',
    motion: '在壳里拱一下，头顶的壳帽被顶得一跳',
    sig: 'peek',
    verdict:
      '和引擎的小鸡区别全在蛋壳：米白的下半壳和歪扣的壳帽把黄色夹在中间，24 像素是白、黄、白三层，比单只小鸡还好认。',
    paint: { fill: EA.butter, leaf: EA.carrot, shade: EA.carrot },
    face: [50, 47],
    body: () =>
      blend(
        2.5,
        circle(50, 50, 25),
        shellLow(),
        shellCap(),
        ellipse(24, 57, 6, 8.5, 35),
        ellipse(76, 57, 6, 8.5, -35),
      ),
    parts: [
      ['inner', grow(shellLow(), 0.4), { tint: 'cream' }],
      ['inner', grow(shellCap(), 0.4), { tint: 'cream' }],
      [
        'hair',
        chain(
          [
            [65, 65],
            [67.5, 69],
            [64.5, 72.5],
          ],
          0.7,
        ),
        { tint: 'choc' },
      ],
    ],
  },
];

function dappleEgg() {
  return blend(8, ellipse(50, 42, 23, 25), ellipse(50, 31, 17, 20));
}

function eggcup() {
  return union(
    meet(ellipse(50, 60, 27, 23), below(60)),
    box(50, 60.5, 28, 3.4, 3),
    box(50, 86, 6, 5, 2),
    ellipse(50, 93, 18, 4.6),
  );
}

function basketBody() {
  return poly(
    [
      [17, 55],
      [83, 55],
      [75, 91],
      [25, 91],
    ],
    4,
  );
}

function basketRim() {
  return box(50, 55, 36, 5.5, 5);
}

function basketEggs() {
  return [ellipse(35, 46, 8.5, 10.5, -16), ellipse(51, 42, 9, 11.5), ellipse(66, 46, 8.5, 10.5, 16)];
}

function basketGrass() {
  return meet(box(50, 50, 31, 8), (x, y) => 46 + tri(x, 6, 3.5) - y);
}

function cocoaBite() {
  return union(circle(57, 8.5, 5.5), circle(64.5, 11, 5));
}

function cocoaEar() {
  return minus(ellipse(61, 21, 6.5, 12, 12), cocoaBite());
}

/** The foil cup, its top edge crimped. */
function cocoaFoil() {
  return meet(box(50, 89, 28, 9, 4), (x, y) => 81.5 + tri(x, 5, 1.4) - y);
}

function carrotLeaves() {
  return union(ellipse(38, 20, 6, 13, -30), ellipse(50, 15, 6.5, 15), ellipse(62, 20, 6, 13, 30));
}

function daisyPetals() {
  const n = 14;
  return union(
    ...Array.from({ length: n }, (_, i) => {
      const a = (i / n) * 2 * Math.PI - Math.PI / 2;
      return ellipse(50 + 30 * Math.cos(a), 42 + 30 * Math.sin(a), 10.5, 5.4, (a * 180) / Math.PI);
    }),
  );
}

function butterflyWings() {
  return union(
    ellipse(27, 35, 21, 16, 30),
    ellipse(73, 35, 21, 16, -30),
    ellipse(31, 72, 14, 12, -25),
    ellipse(69, 72, 14, 12, 25),
  );
}

function antennae() {
  return union(
    chain(
      [
        [47, 38],
        [46, 22],
        [41, 11],
      ],
      1.6,
    ),
    circle(40, 9.5, 3.3),
    chain(
      [
        [53, 38],
        [54, 22],
        [59, 11],
      ],
      1.6,
    ),
    circle(60, 9.5, 3.3),
  );
}

function shellLow() {
  return meet(ellipse(50, 76, 30, 23), (x, y) => 61 + tri(x, 10, 3.6) - y);
}

function shellCap() {
  return meet(ellipse(47, 27, 22, 17, -14), (x, y) => y - (29 + 0.25 * (x - 47) + tri(x + 3, 9, 3)));
}

// ---- Props ---------------------------------------------------------------------------------------------

/** Two bunny ears on a headband whose arc centres on (cx, cy), half as wide as `w`. */
function bunnyBand(cx, cy, w, tilt = 0) {
  const ear = (m) => ellipse(cx + m * w * 0.42, cy - w * 0.62, w * 0.2, w * 0.5, m * 12 + tilt);
  const inner = (m) => ellipse(cx + m * w * 0.42, cy - w * 0.58, w * 0.09, w * 0.34, m * 12 + tilt);
  return [
    ['leaf', union(ear(-1), ear(1))],
    ['inner', union(inner(-1), inner(1)), { tint: 'pink' }],
    [
      'hair',
      meet(shell(ellipse(cx, cy + w * 0.5, w, w * 0.62), w * 0.06), above(cy + w * 0.12)),
      { tint: 'pink' },
    ],
  ];
}

/** An eggshell cap with a zigzag rim, centred on (cx, cy), tilted by `rot` degrees. */
function shellHat(cx, cy, w, rot = -12) {
  const r = (rot * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const rim = (x, y) => {
    const v = -(x - cx) * s + (y - cy) * c;
    const u = (x - cx) * c + (y - cy) * s;
    return v - tri(u, w * 0.36, w * 0.12);
  };
  return [['leaf', meet(ellipse(cx, cy, w, w * 0.8, rot), rim)]];
}

/** A crown of n little flowers along an arc centred on (cx, cy). */
function flowerCrown(cx, cy, rx, ry, n, r) {
  const out = [];
  const tints = [null, 'lilac', 'sky'];
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (Math.PI * (i + 0.5)) / n;
    const x = cx + rx * Math.cos(a);
    const y = cy + ry * Math.sin(a);
    const petals = union(
      ...Array.from({ length: 5 }, (_, j) =>
        circle(
          x + r * Math.cos((j * 2 * Math.PI) / 5 + i),
          y + r * Math.sin((j * 2 * Math.PI) / 5 + i),
          r * 0.78,
        ),
      ),
    );
    const t = tints[i % 3];
    out.push(t ? ['inner', petals, { tint: t }] : ['leaf', petals]);
    out.push(['inner', circle(x, y, r * 0.5), { tint: 'butter' }]);
  }
  for (let i = 0; i < n - 1; i++) {
    const a = Math.PI + (Math.PI * (i + 1)) / n;
    out.unshift([
      'inner',
      ellipse(
        cx + rx * Math.cos(a),
        cy + ry * Math.sin(a) - r * 0.3,
        r * 0.9,
        r * 0.45,
        (a * 180) / Math.PI + 90,
      ),
      { tint: 'leaf' },
    ]);
  }
  return out;
}

/** A pastel bow with its knot at (cx, cy). */
function bow(cx, cy, w, rot = 0) {
  const r = rot;
  return [
    [
      'leaf',
      union(
        ellipse(cx - w * 0.55, cy, w * 0.55, w * 0.38, r + 18),
        ellipse(cx + w * 0.55, cy, w * 0.55, w * 0.38, r - 18),
      ),
    ],
    [
      'leaf',
      union(
        stroke(cx - 2, cy + 2, cx - w * 0.4, cy + w * 0.75, w * 0.14, w * 0.1),
        stroke(cx + 2, cy + 2, cx + w * 0.4, cy + w * 0.75, w * 0.14, w * 0.1),
      ),
    ],
    ['inner', circle(cx, cy, w * 0.22), { tint: 'cream' }],
  ];
}

/** A little basket held at (cx, cy) with one egg peeking out. */
function heldBasket(cx, cy, w) {
  const bodyF = poly(
    [
      [cx - w, cy - w * 0.1],
      [cx + w, cy - w * 0.1],
      [cx + w * 0.75, cy + w * 0.75],
      [cx - w * 0.75, cy + w * 0.75],
    ],
    w * 0.12,
  );
  return [
    [
      'hair',
      meet(shell(ellipse(cx, cy, w * 0.82, w * 1.15), w * 0.09), above(cy - w * 0.05)),
      { free: true, tint: 'choc' },
    ],
    ['inner', ellipse(cx - w * 0.15, cy - w * 0.25, w * 0.34, w * 0.42, -12), { tint: 'pink' }],
    ['inner', ellipse(cx + w * 0.35, cy - w * 0.2, w * 0.3, w * 0.38, 14), { tint: 'sky' }],
    ['leaf', bodyF],
    ['hair', box(cx, cy - w * 0.1, w * 1.04, w * 0.14, w * 0.12), { tint: 'choc' }],
  ];
}

/**
 * A prop the face already clears (a crown or a cap on the head), taken out of the face fit (`under`), as the lab's
 * fit, which kept off hair alone, left it.
 */
const faceClears = (parts) =>
  parts.map(([tone, zone, options = {}]) => [tone, zone, { ...options, under: true }]);

/*
 * Props on existing cast members. The member's own outline and parts are kept; the prop is a set of parts in front
 * of them, so the face, the motion and the line all come from the engine as usual.
 */
export const COMBOS = [
  {
    id: 'ea-hop-crown',
    base: 'bunny',
    member: 'hop',
    zh: '跳跳',
    prop: '花环',
    concept: '跳跳在两只耳朵中间戴上一圈小花环，粉、紫、蓝三色小花轮流排开。',
    verdict:
      '跳跳换成奶油白，正好是复活节兔子的颜色；花环落在两耳之间，每朵小花各带一圈蜡笔线，32 像素还数得出花。',
    paint: { fill: EA.cream, leaf: EA.pink, shade: EA.lilac },
    at: [50, 54],
    s: 0.82,
    props: () => faceClears(flowerCrown(50, 46, 20, 7, 5, 4.2)),
  },
  {
    id: 'ea-chirp-shell',
    base: 'chick',
    member: 'chirp',
    zh: '啾啾',
    prop: '蛋壳帽',
    concept: '啾啾头顶歪扣着半片蛋壳，好像刚从壳里钻出来，还没顾上摘。',
    verdict: '一片壳就把啾啾和叽叽连成一对：一个刚出壳顶着帽子，一个还坐在壳里。',
    paint: { fill: EA.butter, leaf: EA.cream, shade: EA.carrot },
    at: [50, 60],
    s: 0.76,
    props: () => faceClears(shellHat(48, 34, 21, -14)),
  },
  {
    id: 'ea-mochi-ears',
    base: 'mochi',
    member: 'mochi',
    zh: '糯糯',
    prop: '兔耳发箍',
    concept: '糯糯戴上一只紫色兔耳发箍，耳朵里衬着粉色，走起来一颠一颠。',
    verdict: '兔耳是挂在头顶的零件，糯糯的身体、脸和动作都不动；发箍用零件上色涂成粉色，和紫耳朵分开。',
    paint: { fill: EA.sky, leaf: EA.lilac, shade: EA.lilac },
    at: [50, 63],
    s: 0.74,
    props: () => bunnyBand(50, 36, 28),
  },
  {
    id: 'ea-momo-ears',
    base: 'egg',
    member: 'momo',
    zh: '桃桃',
    prop: '兔耳发箍',
    concept: '蛋形的桃桃配一对白兔耳，看起来就像一颗想当兔子的复活节彩蛋。',
    verdict: '蛋形身体加兔耳，最像复活节的一个组合；耳朵里的粉色衬里是零件上色出来的，原样画法里也有。',
    paint: { fill: EA.pink, leaf: EA.cream, shade: EA.lilac },
    at: [50, 63],
    s: 0.72,
    props: () => bunnyBand(50, 34, 24),
  },
  {
    id: 'ea-waddle-shell',
    base: 'penguin',
    member: 'waddle',
    zh: '摇摇',
    prop: '蛋壳帽',
    concept: '摇摇也顶了一片蛋壳，企鹅本来就是蛋里孵出来的，这顶帽子正合适。',
    verdict: '帽子往右歪，和啾啾的往左歪对称，两只摆在一起像一对刚孵出来的。',
    paint: { fill: EA.sky, leaf: EA.cream, shade: EA.ink },
    at: [50, 61],
    s: 0.76,
    props: () => faceClears(shellHat(52, 29, 18, 12)),
  },
  {
    id: 'ea-kiki-crown',
    base: 'bob',
    member: 'kiki',
    zh: '琪琪',
    prop: '花环',
    concept: '琪琪的短发上戴一圈春天的小花环，像去草地上野餐的样子。',
    verdict: '人物戴花环最自然：六朵小花压在头发上，一点不碰脸。',
    paint: { fill: EA.butter, leaf: EA.pink, shade: EA.choc },
    at: [50, 60],
    s: 0.8,
    props: () => flowerCrown(50, 34, 28, 10, 6, 4.4),
  },
  {
    id: 'ea-lulu-bow',
    base: 'twinbuns',
    member: 'lulu',
    zh: '露露',
    prop: '粉彩蝴蝶结',
    concept: '露露在一边的发髻上系了一只粉色大蝴蝶结。',
    verdict: '蝴蝶结挂在右边发髻上，剪影多出一个小角，24 像素也看得到一点粉。',
    paint: { fill: EA.lilac, leaf: EA.pink, shade: EA.ink },
    at: [50, 58],
    s: 0.8,
    props: () => bow(72, 30, 12, -10),
  },
  {
    id: 'ea-hammy-basket',
    base: 'hamster',
    member: 'hammy',
    zh: '囤囤',
    prop: '提篮',
    concept: '囤囤拎着一只小提篮，里面装着两颗彩蛋，这回囤的是复活节的蛋。',
    verdict:
      '提篮是站得开的零件，提手单独外扩，空心不会被墨填上；但 24 像素下只剩一个小方块，48 像素才看得出篮子和蛋。',
    paint: { fill: EA.carrot, leaf: EA.butter, shade: EA.choc },
    at: [44, 50],
    s: 0.8,
    props: () => heldBasket(76, 78, 14),
  },
];

/**
 * The sheet's colours on the palette. Where the engine's own colour is far from the sheet's (the carrot, the leaf,
 * the paper white, the hair mix), the theme has a swatch of its own: `mint`, `carrot`, `meadow`, `ivory` and
 * `caramel`.
 */
const COLORS = {
  [EA.pink]: 'blush',
  [EA.mint]: 'mint',
  [EA.butter]: 'butter',
  [EA.lilac]: 'lilac',
  [EA.sky]: 'sky',
  [EA.choc]: 'cocoa',
  [EA.carrot]: 'carrot',
  [EA.leaf]: 'meadow',
  [EA.cream]: 'ivory',
  [EA.ink]: 'night',
  [MIX.caramel]: 'caramel',
  [MIX.rust]: 'brown',
};

const SHEET = { ...EA, ...MIX };

/**
 * A part's `tint`, the name of a sheet colour, as that colour. A tinted hair part stays a hair part (`avoid`), as it
 * was in the lab, so the face fit keeps off it: the bands on Dapple, Wicker's rim and weave, Crunchy's rings.
 */
const tinted = (parts) =>
  parts.map(([tone, zone, options]) =>
    options && typeof options === 'object' && options.tint
      ? [tone, zone, { ...options, c: SHEET[options.tint], ...(tone === 'hair' ? { avoid: true } : null) }]
      : [tone, zone, options],
  );

/** The English beside each new character's `concept`. */
const DESC = {
  'ea-dapple':
    'A painted egg standing in a pink egg cup, a zigzag round its top and a row of dots below; the cup has a slim waist and a round foot.',
  'ea-wicker':
    'A little woven basket with a ring of green grass at its rim, three eggs in pink, blue and lilac lying in the grass, and a tall handle arching over the top.',
  'ea-cocoa':
    'A chocolate bunny sitting in blue foil, a bite taken out of its right ear that shows the paler chocolate inside.',
  'ea-crunchy':
    'A plump carrot, wide at the top and pointed below, with three green leaves on its head and a few faint rings round its body.',
  'ea-posy':
    'A little daisy: a ring of long white petals round a yellow heart that wears the face, with a short green stem and a leaf below.',
  'ea-breezy':
    'A round little butterfly with two pairs of lilac wings dotted with big yellow spots and small pink and blue ones, and two antennae tipped with little balls.',
  'ea-peeky':
    'A chick just hatched, its lower half still sitting in the shell, a zigzag-edged cap of shell tipped on its head and two little wings poking out over the rim.',
};

/** Each combination's English name, and the English beside its `concept`. */
const COMBO_EN = {
  'ea-hop-crown': [
    'Flower Crown Hop',
    'Hop wearing a little flower crown between its ears, pink, lilac and blue flowers taking turns round it.',
  ],
  'ea-chirp-shell': [
    'Shell Cap Chirp',
    'Chirp with half an eggshell tipped on its head, as if it had just climbed out and not yet thought to take it off.',
  ],
  'ea-mochi-ears': [
    'Bunny Ears Mochi',
    'Mochi in a lilac bunny-ear headband lined with pink, the ears bobbing as it goes.',
  ],
  'ea-momo-ears': [
    'Bunny Ears Momo',
    'Egg-shaped Momo with a pair of white bunny ears, like an Easter egg that wants to be a bunny.',
  ],
  'ea-waddle-shell': [
    'Shell Cap Waddle',
    'Waddle wearing a piece of eggshell too; penguins hatch from eggs, so the cap suits it just right.',
  ],
  'ea-kiki-crown': [
    'Flower Crown Kiki',
    'Kiki with a crown of spring flowers on her bob, as if off for a picnic on the grass.',
  ],
  'ea-lulu-bow': ['Pastel Bow Lulu', 'Lulu with a big pink bow tied on one of her buns.'],
  'ea-hammy-basket': [
    'Basket Hammy',
    'Hammy carrying a little basket with two painted eggs in it; this time the hoard is Easter eggs.',
  ],
};

/**
 * The point each signature motion turns the figure about, in the 100 box: the foot of the cup, the top of the handle,
 * the bottom of the foil, the carrot's tip, the root of the stem, the butterfly's body and the bottom of the shell.
 * The lab's `transform-origin` for each, placed on the art.
 */
const PIVOTS = {
  rock: [50, 97],
  swing: [50, 16],
  melt: [50, 98],
  pop: [50, 95],
  sway: [50, 99],
  flutter: [50, 55],
  peek: [50, 99],
};

export const EASTER_SOURCE = labTheme(
  EASTER.map(({ motion, sig, ...art }) => ({
    ...art,
    motion: sig,
    pivot: PIVOTS[sig],
    parts: tinted(art.parts),
    desc: DESC[art.id],
  })),
  COMBOS.map((combo) => ({
    ...combo,
    props: () => tinted(combo.props()),
    en: COMBO_EN[combo.id][0],
    desc: COMBO_EN[combo.id][1],
  })),
  COLORS,
);
