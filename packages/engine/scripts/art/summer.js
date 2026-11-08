/**
 * The Summer theme as fields in a 100 x 100 box, drawn in the lab's soda-pop sheet and kept as it was drawn there:
 * the source `generate:faces` bakes into `src/themes/summer/`. Colours are the sheet's own; `COLORS` maps them, and
 * the few mixes the sheet painted parts with, onto the engine's palette. A part's `color` is the sheet colour it is
 * laid flat in, `back` puts it behind the body, `fine` leaves it out below the lab's small size and `under` lets the
 * face sit over it. A part's `move` names its signature motion (declared in `src/themes/summer/motions.ts`) about
 * `pivot`, and `rock` sets the whole figure rocking; such a part stands free. `paint.shade` gives the deep tone hair
 * is shaded towards. `plate`, `gloss`, `ring`, `motion` and `verdict` are the lab page's notes and are not read here
 * (`motion` describes the signature motion in words, so it is kept from `labTheme`, which reads a figure's `motion`
 * as motion ids).
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
  leftOf,
  meet,
  minus,
  poly,
  rightOf,
  shell,
  stroke,
  union,
} from './sdf.ts';
import { labTheme } from './lab.ts';

/** The sheet's limited palette. Every skin colour comes from here. */
const SM = {
  teal: '#1fbfb4',
  coral: '#ff7657',
  lemon: '#ffd84a',
  melon: '#ff5a8c',
  sand: '#f2d39c',
  ice: '#a9e5ff',
  leaf: '#4fc35a',
  foam: '#fffaf0',
  deep: '#1f5e6c',
  ink: '#1f2347',
};

const mix = (a, b, pct) => `color-mix(in oklab, ${a}, ${b} ${pct}%)`;

/** A field drawn about the origin, turned by `deg` (clockwise on screen) and moved to (x, y). */
function place(f, x, y, deg = 0) {
  const c = Math.cos((deg * Math.PI) / 180);
  const s = Math.sin((deg * Math.PI) / 180);
  return (px, py) => {
    const dx = px - x;
    const dy = py - y;
    return f(dx * c + dy * s, -dx * s + dy * c);
  };
}

/** A teardrop hanging from (x, y), r across at the bulb. */
const drop = (x, y, r) =>
  union(
    circle(x, y + r * 1.9, r),
    poly(
      [
        [x, y],
        [x - r * 0.72, y + r * 1.6],
        [x + r * 0.72, y + r * 1.6],
      ],
      r * 0.12,
    ),
  );

/*
 * The new characters. Fields are in a 100 x 100 box; `paint` gives the body fill, the plate (the off-register print
 * under the ink), the leaf tone and the colour hair is shaded towards. `motion` describes the signature motion the
 * skin plays on the parts marked `move`; `rock` rocks the whole figure instead.
 */
export const SUMMER = [
  {
    id: 'sm-popsicle',
    zh: '棒棒',
    en: 'Popsy',
    group: 'treat',
    concept: '双色冰棍，西瓜粉的上半截被咬掉一口，柠檬黄的底边淌着一滴，下面插着一根木棍。',
    motion: '底边的那滴冰水慢慢鼓起来、拉长、掉下去，再鼓出新的一滴。',
    verdict: '咬口和木棍撑起剪影，24 像素是一根带缺口的小棒；双色分段让它不会被认成单纯的圆角块。',
    paint: { fill: SM.melon, plate: SM.teal, leaf: SM.sand },
    face: [47, 41],
    body: () =>
      blend(
        2.5,
        minus(popBar(), popBite()),
        stroke(32, 70, 32, 77, 3.8, 3.4),
        circle(32, 78, 3.6),
        box(50, 84, 6.5, 14, 6),
      ),
    parts: [
      ['inner', meet(grow(popBite(), 3), below(4)), { fine: true }],
      [
        'leaf',
        union(meet(below(60), above(73)), stroke(32, 70, 32, 77, 4.4, 4), circle(32, 78, 4.2)),
        { color: SM.lemon },
      ],
      ['leaf', meet(box(50, 85, 7.2, 14.6, 6), below(73))],
      ['hair', stroke(50, 88, 50, 94, 1.2), { fine: true }],
      ['inner', drop(32, 81.5, 3), { free: true, move: 'drip', pivot: [32, 82], color: SM.lemon }],
    ],
  },
  {
    id: 'sm-coconut',
    zh: '椰椰',
    en: 'Nutty',
    group: 'treat',
    concept: '削了顶的青椰子，切口露出一圈白椰肉，插着一根柠檬黄的弯吸管，旁边斜插一把粉色小纸伞。',
    motion: '小纸伞绕着插进椰子的那一点左右摇，像在跟着音乐打拍子。',
    verdict: '吸管和小伞把圆身子变成「椰子饮料」；伞是独立的一块，摇起来不会扯动身体和脸。',
    paint: { fill: SM.leaf, plate: SM.coral, leaf: SM.melon, shade: SM.deep },
    face: [50, 65],
    body: () => blend(5, ellipse(50, 64, 33, 29), ellipse(50, 43, 21, 12)),
    parts: [
      ['hair', meet(shell(ellipse(50, 64, 25, 29), 1), union(leftOf(31), rightOf(69))), { fine: true }],
      ['inner', ellipse(50, 36.5, 14.5, 4.8), { ring: true }],
      [
        'leaf',
        chain(
          [
            [56, 37],
            [59, 20],
            [62, 13],
            [72, 8],
          ],
          2.8,
        ),
        { free: true, color: SM.lemon },
      ],
      [
        'hair',
        place(stroke(0, -16, 0, 19, 1.5), 30, 22, -26.6),
        { free: true, move: 'sway', pivot: [39, 40] },
      ],
      ['leaf', place(parasol(), 30, 22, -26.6), { free: true, move: 'sway', pivot: [39, 40] }],
      [
        'hair',
        place(parasolRibs(), 30, 22, -26.6),
        { free: true, move: 'sway', pivot: [39, 40], fine: true },
      ],
    ],
  },
  {
    id: 'sm-ring',
    zh: '泳泳',
    en: 'Bobber',
    group: 'beach',
    rock: true,
    concept: '奶白底珊瑚条纹的游泳圈，中间的洞透出一汪海水绿，脸长在最胖的下半圈上。',
    motion: '整个圈像漂在浪上一样，左右摇一摇，再往下沉一点、浮上来。',
    verdict: '四道条纹在小图里就是游泳圈的全部特征；洞偏上，给下半圈留出放脸的地方。',
    paint: { fill: SM.foam, plate: SM.teal, leaf: SM.coral },
    face: [50, 71],
    body: () => ellipse(50, 53, 45, 39),
    parts: [
      ...[
        [-150, -122],
        [-58, -30],
        [160, 190],
        [-10, 20],
      ].map(([a, b]) => ['leaf', wedge(50, 40, a, b)]),
      ['hair', ellipse(50, 37, 16, 9.5), { color: SM.teal, ring: true }],
      ['inner', meet(shell(ellipse(50, 37, 16, 9.5), 1.6), above(36)), { color: SM.deep, fine: true }],
    ],
  },
  {
    id: 'sm-castle',
    zh: '筑筑',
    en: 'Turret',
    group: 'beach',
    concept: '用小桶扣出来的沙堡，一座带垛口的高塔立在宽城墙上，塔顶插着一面珊瑚色小旗。',
    motion: '塔顶的小旗贴着旗杆在海风里一下一下地飘。',
    verdict: '垛口是沙堡的签名，做得够大，24 像素还是一排小方齿；旗子是最亮的一块，远看先看到它。',
    paint: { fill: SM.sand, plate: SM.teal, leaf: SM.coral, shade: '#b0662c' },
    face: [50, 76],
    body: () =>
      blend(
        2,
        box(50, 75, 37, 19, 4),
        box(50, 45, 16, 22, 3),
        ...[18, 28.5, 71.5, 82].map((x) => box(x, 53, 4.4, 4.6, 1.4)),
        ...[38.5, 50, 61.5].map((x) => box(x, 21, 4.2, 4.6, 1.4)),
        stroke(50, 18, 50, 2, 1.7),
      ),
    parts: [
      ['hair', union(box(50, 41, 4, 4.5, 1), circle(50, 36.5, 4))],
      [
        'hair',
        union(
          ...[
            [19, 66],
            [81, 64],
            [18, 86],
            [83, 87],
            [40, 54],
            [61, 29],
          ].map(([x, y]) => circle(x, y, 1.5)),
        ),
        { fine: true },
      ],
      [
        'leaf',
        poly(
          [
            [52, 1.5],
            [69, 6.5],
            [52, 11.5],
          ],
          1,
        ),
        { free: true, move: 'flutter', pivot: [51.5, 6.5] },
      ],
    ],
  },
  {
    id: 'sm-fan',
    zh: '扇扇',
    en: 'Whirly',
    group: 'breeze',
    concept: '冰蓝色的台式小风扇，圆圆的扇头立在细脖子上，四片白扇叶，脸长在胖胖的底座上。',
    motion: '扇叶绕着柠檬黄的扇轴一直转，扇头不动，脸也不动。',
    verdict: '圆头加底座的「葫芦」剪影一眼就是风扇；把脸放到底座上，转动的扇叶就不会晃到眼睛。',
    paint: { fill: SM.ice, plate: SM.coral, leaf: SM.lemon, shade: SM.ink },
    face: [50, 80],
    body: () => blend(3, circle(50, 30, 27), stroke(50, 55, 50, 66, 4.5), box(50, 80, 30, 15.5, 11)),
    parts: [
      ['hair', circle(50, 30, 22.5), { color: mix(SM.deep, SM.ice, 22) }],
      ['leaf', fanBlades(), { free: true, move: 'spin', pivot: [50, 30], color: SM.foam }],
      [
        'hair',
        meet(shell(circle(50, 30, 16.5), 0.75), union(leftOf(45), rightOf(55))),
        { free: true, fine: true },
      ],
      ['leaf', circle(50, 30, 4.6), { free: true }],
    ],
  },
  {
    id: 'sm-ice',
    zh: '凉凉',
    en: 'Cubey',
    group: 'treat',
    concept: '一块正在化的冰块，顶面浅、侧面深，像块透亮的玻璃；底下化出两道水痕，脚边一摊水。',
    motion: '侧面一滴水顺着棱往下滑，脚边那摊水慢慢摊开又收回来。',
    verdict: '顶面和侧面两档颜色把方块变成立方体，加上水痕就是冰；它自带高光，不用自动高光。',
    paint: { fill: SM.ice, plate: SM.melon, leaf: SM.foam, shade: SM.deep },
    gloss: false,
    face: [45, 60],
    body: () =>
      blend(
        3,
        box(50, 54, 31, 31, 11),
        circle(33, 85, 4.6),
        stroke(64, 84, 64, 89, 4, 3.6),
        circle(64, 90, 3.6),
      ),
    parts: [
      [
        'inner',
        ellipse(50, 94, 34, 4.6),
        { free: true, back: true, move: 'melt', pivot: [50, 94], color: mix(SM.ice, SM.foam, 45) },
      ],
      ['hair', rightOf(73)],
      ['inner', above(33)],
      ['inner', union(stroke(25, 47, 32, 39, 2.1), circle(35.5, 36, 1.7)), { color: SM.foam }],
      ['inner', drop(78.5, 50, 2.3), { move: 'slide', pivot: [78.5, 52], color: SM.foam }],
    ],
  },
  {
    id: 'sm-pineapple',
    zh: '菠菠',
    en: 'Pina',
    group: 'treat',
    concept: '胖胖的柠檬黄菠萝，头顶五片尖叶子扎成一顶王冠，身上上下各一道菱格纹，中间留给脸。',
    motion: '叶子王冠以根部为轴轻轻左右晃，像被热风吹着。',
    verdict: '尖叶王冠加黄身子就是菠萝；菱格只画上下两道，脸那一圈干干净净。',
    paint: { fill: SM.lemon, plate: SM.teal, leaf: SM.leaf, shade: '#c27a00' },
    face: [50, 66],
    body: () => ellipse(50, 65, 29, 30),
    parts: [
      [
        'hair',
        union(chain(zigzag(26, 74, 48.5, 3), 1.15), chain(zigzag(26, 74, 87, 3.2), 1.15)),
        { inset: 2.5 },
      ],
      ['leaf', crown(), { free: true, move: 'sway', pivot: [50, 39] }],
    ],
  },
  {
    id: 'sm-shell',
    zh: '珠珠',
    en: 'Pearly',
    group: 'beach',
    concept: '珊瑚色的扇贝，下壳是带一圈花边的小碗，上壳像一把小扇子掀开，中间托着一颗珍珠。',
    motion: '上壳慢慢合上又掀开，珍珠跟着缩进去、再冒出来给你看。',
    verdict: '花边碗加扇形上壳是扇贝的剪影；静帧停在打开的样子，珍珠在小图里是一个白点。',
    paint: { fill: SM.coral, plate: SM.teal, leaf: SM.foam, shade: '#a8323a' },
    gloss: false,
    face: [50, 73],
    body: () =>
      blend(
        2,
        meet(ellipse(50, 56, 43, 36), below(57)),
        ...[11, 22, 33, 44, 56, 67, 78, 89].map((x) => circle(x, 57, 5.6)),
        box(50, 92, 8, 4, 2),
      ),
    parts: [
      [
        'body',
        shellLid(),
        { free: true, back: true, move: 'lid', pivot: [50, 56], color: mix(SM.coral, SM.foam, 38) },
      ],
      [
        'body',
        shellLidRibs(),
        { free: true, back: true, move: 'lid', pivot: [50, 56], color: SM.coral, fine: true },
      ],
      [
        'inner',
        circle(50, 47, 11.5),
        { free: true, back: true, move: 'pearl', pivot: [50, 58], color: mix(SM.foam, SM.ice, 30) },
      ],
      [
        'inner',
        circle(45.5, 42.5, 3),
        { free: true, back: true, move: 'pearl', pivot: [50, 58], color: '#ffffff', fine: true },
      ],
      [
        'hair',
        minus(union(...[-162, -146, -34, -18].map((a) => raysFrom(50, 94, a))), ellipse(50, 73, 31, 16)),
        { fine: true },
      ],
    ],
  },
  {
    id: 'sm-cicada',
    zh: '知知',
    en: 'Chirr',
    group: 'breeze',
    concept: '圆滚滚的深海绿知了，宽宽的脑袋两头鼓着复眼，背后一对冰蓝透明翅膀，肚子上两道环纹。',
    motion: '每隔一会儿一对翅膀飞快地抖一阵，像在「知了——知了——」地叫，然后停下歇口气。',
    verdict: '翅膀伸出身体两侧，剪影是一个带两片叶子的小圆；深色身子配淡黄的脸，深底浅底都清楚。',
    paint: { fill: SM.deep, plate: SM.lemon, leaf: SM.ice, shade: '#000000' },
    face: [50, 64],
    body: () =>
      blend(4, circle(50, 63, 25), ellipse(50, 42, 22, 12), circle(28.5, 42, 6.8), circle(71.5, 42, 6.8)),
    parts: [
      [
        'inner',
        ellipse(23, 70, 10, 27, 28),
        { free: true, back: true, move: 'buzzL', pivot: [36, 47], color: mix(SM.ice, SM.foam, 20) },
      ],
      [
        'inner',
        ellipse(77, 70, 10, 27, -28),
        { free: true, back: true, move: 'buzzR', pivot: [64, 47], color: mix(SM.ice, SM.foam, 20) },
      ],
      [
        'hair',
        union(stroke(33, 50, 12, 90, 1), stroke(18, 68, 27, 80, 0.8)),
        {
          free: true,
          back: true,
          move: 'buzzL',
          pivot: [36, 47],
          color: mix(SM.ice, SM.deep, 45),
          fine: true,
        },
      ],
      [
        'hair',
        union(stroke(67, 50, 88, 90, 1), stroke(82, 68, 73, 80, 0.8)),
        {
          free: true,
          back: true,
          move: 'buzzR',
          pivot: [64, 47],
          color: mix(SM.ice, SM.deep, 45),
          fine: true,
        },
      ],
      ['inner', union(circle(27.5, 42, 4.6), circle(72.5, 42, 4.6))],
      [
        'hair',
        union(
          shell((x, y) => y - (80 + 0.014 * (x - 50) ** 2), 1.1),
          shell((x, y) => y - (85.5 + 0.014 * (x - 50) ** 2), 1.1),
        ),
        { inset: 1.5, fine: true },
      ],
    ],
  },
];

function popBar() {
  return blend(2, box(50, 48, 23, 24, 7), circle(50, 30, 23));
}

function popBite() {
  return union(circle(75, 18, 8.5), circle(68, 8.5, 7.5), circle(79.5, 29, 6.5));
}

/** A paper parasol about the origin: a scalloped dome above, the shaft below. */
function parasol() {
  return minus(
    meet(circle(0, 0, 14), above(0.5)),
    union(circle(-10, 2, 4), circle(0, 2.6, 4.4), circle(10, 2, 4)),
  );
}

function parasolRibs() {
  return meet(union(stroke(0, -14, -9, -2, 0.7), stroke(0, -14, 9, -2, 0.7)), circle(0, 0, 13));
}

/** A wedge of the plane between two angles (degrees, clockwise from the right) about (cx, cy). */
function wedge(cx, cy, a, b) {
  const p = (deg) => [cx + 90 * Math.cos((deg * Math.PI) / 180), cy + 90 * Math.sin((deg * Math.PI) / 180)];
  return poly([[cx, cy], p(a), p((a + b) / 2), p(b)]);
}

function fanBlades() {
  return blend(
    2,
    circle(50, 30, 5.5),
    ...[20, 110, 200, 290].map((a) => {
      const r = (a * Math.PI) / 180;
      return ellipse(50 + 10.5 * Math.cos(r), 30 + 10.5 * Math.sin(r), 10, 5.6, a + 18);
    }),
  );
}

/** Points of a zigzag across x0..x1 at height y, h up and down. */
function zigzag(x0, x1, y, h) {
  const pts = [];
  for (let i = 0, x = x0; x <= x1 + 0.01; i++, x += 6) pts.push([x, y + (i % 2 ? -h : h)]);
  return pts;
}

function crown() {
  return union(
    stroke(50, 40, 50, 7, 6.2, 1.4),
    stroke(47.5, 40, 34, 13, 5.4, 1.3),
    stroke(52.5, 40, 66, 13, 5.4, 1.3),
    stroke(46, 41, 24, 27, 4.6, 1.2),
    stroke(54, 41, 76, 27, 4.6, 1.2),
  );
}

/** The scallop's top valve, a fan above its hinge line with a scalloped rim. */
function shellLid() {
  const bumps = [];
  for (let a = -168; a <= -12; a += 19.5) {
    const r = (a * Math.PI) / 180;
    bumps.push(circle(50 + 37 * Math.cos(r), 56 + 34 * Math.sin(r), 5.6));
  }
  return blend(2, meet(ellipse(50, 56, 38, 35), above(57)), ...bumps);
}

function shellLidRibs() {
  return meet(
    union(...[-154, -128, -52, -26].map((a) => raysFrom(50, 56, a))),
    ellipse(50, 56, 31, 28),
    above(54),
    minus(above(100), circle(50, 56, 9)),
  );
}

/** A thin ray from (cx, cy) at an angle in degrees, clockwise from the right. */
function raysFrom(cx, cy, a) {
  const r = (a * Math.PI) / 180;
  return stroke(cx, cy, cx + 60 * Math.cos(r), cy + 60 * Math.sin(r), 1.1);
}

/*
 * Props on existing cast members. The member's own outline and parts are kept; the prop is a set of free parts in
 * front of them, so the face, the motion and the ink line all come from the engine as usual. Eyewear sits pushed up
 * on the head, never over the eyes.
 */
export const COMBOS = [
  {
    id: 'sm-miso-shades',
    base: 'cat',
    member: 'miso',
    zh: '喵喵',
    prop: '墨镜',
    concept: '喵喵把一副珊瑚框墨镜推到了脑门上，镜片上一道白色反光。',
    verdict: '墨镜架在两只耳朵中间，眼睛完全露在外面；深色镜片在橘色身子上很跳。',
    paint: { fill: SM.lemon, plate: SM.coral, leaf: SM.teal },
    at: [50, 58],
    s: 0.76,
    props: () => shades(50, 36, 1),
  },
  {
    id: 'sm-waddle-goggles',
    base: 'penguin',
    member: 'waddle',
    zh: '摇摇',
    prop: '泳镜',
    concept: '摇摇戴着西瓜粉的泳镜，镜带绕过脑袋，镜片推在额头上，随时准备下水。',
    verdict: '镜带横过整个头，剪影上多了两只小耳朵似的镜圈；企鹅配泳镜，故事自己就出来了。',
    paint: { fill: SM.teal, plate: SM.lemon, leaf: SM.melon },
    at: [50, 57],
    s: 0.8,
    props: () => goggles(50, 30, 1),
  },
  {
    id: 'sm-chirp-hat',
    base: 'chick',
    member: 'chirp',
    zh: '啾啾',
    prop: '草帽',
    concept: '啾啾戴一顶沙色宽檐草帽，帽身系着一圈珊瑚色缎带，帽檐压在头顶。',
    verdict: '宽檐比头还宽，24 像素也能看出是一顶帽子；缎带把帽子和黄身子分开。',
    paint: { fill: SM.lemon, plate: SM.teal, leaf: SM.sand },
    at: [50, 63],
    s: 0.74,
    props: () => strawHat(50, 34, 1),
  },
  {
    id: 'sm-hop-hat',
    base: 'bunny',
    member: 'hop',
    zh: '跳跳',
    prop: '草帽',
    concept: '跳跳也借了一顶小草帽，两只长耳朵从帽檐后面竖出来。',
    verdict: '帽子压在两耳中间，耳朵照样是剪影里最高的地方；和啾啾同一顶帽子，大小跟着头走。',
    paint: { fill: SM.melon, plate: SM.lemon, leaf: SM.sand },
    at: [50, 56],
    s: 0.8,
    props: () => strawHat(50, 44, 0.78),
  },
  {
    id: 'sm-bruno-melon',
    base: 'bear',
    member: 'bruno',
    zh: '熊熊',
    prop: '西瓜',
    concept: '熊熊抱着一大块西瓜，绿皮红瓤，瓜子三颗，咬之前先给你看一眼。',
    verdict: '西瓜块压在身子右下角，像是抱在怀里；瓜瓜这个角色本来就有，这里只当道具。',
    paint: { fill: SM.sand, plate: SM.coral, leaf: SM.leaf },
    at: [42, 50],
    s: 0.78,
    props: () => melonSlice(76, 66, 1),
  },
  {
    id: 'sm-koko-lei',
    base: 'koala',
    member: 'koko',
    zh: '抱抱',
    prop: '花环',
    concept: '抱抱挂着一串夏威夷花环，粉花黄花交替，垂在下巴底下。',
    verdict: '花环垂在身体下沿，一点不挡脸；两种颜色交替，小图里是一串彩色圆点。',
    paint: { fill: SM.ice, plate: SM.coral, leaf: SM.melon },
    at: [50, 44],
    s: 0.82,
    props: () => lei(50, 66, 34, 14),
  },
  {
    id: 'sm-leo-sunscreen',
    base: 'lion',
    member: 'leo',
    zh: '狮狮',
    prop: '防晒霜',
    concept: '狮狮鼻梁上抹了一道白白的防晒霜，两颊还各点了一下，晒太阳之前的认真模样。',
    verdict: '防晒霜画在脸下面一层，眼睛和嘴照样压在上面；白色在橘色鬃毛里最显眼。',
    paint: { fill: SM.coral, plate: SM.teal, leaf: SM.leaf, shade: '#7a2a10' },
    at: [50, 52],
    s: 0.86,
    props: () => [
      ['inner', stroke(45.5, 58.5, 53.5, 58.5, 2.6), { color: SM.foam, under: true }],
      [
        'inner',
        union(stroke(29, 66, 34, 64.5, 1.9), stroke(65, 64.5, 70, 66, 1.9)),
        { color: SM.foam, under: true },
      ],
    ],
  },
  {
    id: 'sm-scoop-shades',
    base: 'icecream',
    member: 'scoop',
    zh: '冰冰',
    prop: '墨镜',
    concept: '冰冰把墨镜架在冰淇淋球顶上，自己也是一份冷饮，但更想被当成一个酷酷的。',
    verdict: '墨镜让甜品角色一下子有了夏天的态度；和喵喵同一副，换了位置也服帖。',
    paint: { fill: SM.melon, plate: SM.ice, leaf: SM.teal },
    at: [50, 57],
    s: 0.8,
    props: () => shades(50, 27, 0.92),
  },
];

/** Sunglasses pushed up on a head, centred at (cx, cy). */
function shades(cx, cy, s) {
  const lens = (m) => ellipse(cx + 11 * m * s, cy, 9 * s, 6.6 * s);
  return [
    [
      'leaf',
      union(
        grow(lens(1), 2 * s),
        grow(lens(-1), 2 * s),
        stroke(cx - 3 * s, cy - 1.5 * s, cx + 3 * s, cy - 1.5 * s, 1.6 * s),
      ),
    ],
    ['hair', union(lens(1), lens(-1)), { color: SM.ink }],
    [
      'inner',
      union(
        stroke(cx - 15 * s, cy + 1.5 * s, cx - 11 * s, cy - 3 * s, 1.2 * s),
        stroke(cx + 7 * s, cy + 1.5 * s, cx + 11 * s, cy - 3 * s, 1.2 * s),
      ),
      { color: SM.foam, fine: true },
    ],
  ];
}

function goggles(cx, cy, s) {
  const eye = (m) => circle(cx + 10.5 * m * s, cy, 7.6 * s);
  return [
    [
      'leaf',
      union(
        stroke(cx - 40 * s, cy + 2 * s, cx + 40 * s, cy + 2 * s, 2.4 * s),
        grow(eye(1), 2.4 * s),
        grow(eye(-1), 2.4 * s),
      ),
    ],
    ['inner', union(eye(1), eye(-1)), { color: SM.ice }],
    [
      'inner',
      union(
        stroke(cx - 14 * s, cy - 1 * s, cx - 11 * s, cy - 4 * s, 1.2 * s),
        stroke(cx + 7 * s, cy - 1 * s, cx + 10 * s, cy - 4 * s, 1.2 * s),
      ),
      { color: SM.foam, fine: true },
    ],
  ];
}

function strawHat(cx, by, s) {
  const crownField = box(cx, by - 8 * s, 14 * s, 9 * s, 6 * s);
  return [
    ['leaf', union(ellipse(cx, by, 31 * s, 6.5 * s, -3), crownField)],
    ['inner', meet(crownField, box(cx, by - 3.5 * s, 15 * s, 2.6 * s)), { color: SM.coral }],
    [
      'hair',
      meet(
        union(
          stroke(cx - 9 * s, by - 15 * s, cx - 9 * s, by - 7 * s, 0.6 * s),
          stroke(cx, by - 16 * s, cx, by - 7 * s, 0.6 * s),
          stroke(cx + 9 * s, by - 15 * s, cx + 9 * s, by - 7 * s, 0.6 * s),
        ),
        crownField,
      ),
      { fine: true },
    ],
  ];
}

/** A wedge of watermelon with its tip at (cx, cy), the rind round the bottom. */
function melonSlice(cx, cy, s) {
  const sector = meet(
    circle(cx, cy, 24 * s),
    poly([
      [cx, cy],
      [cx - 40 * s, cy + 50 * s],
      [cx + 40 * s, cy + 50 * s],
    ]),
  );
  return [
    ['leaf', grow(sector, 0.3)],
    [
      'inner',
      meet(
        circle(cx, cy, 20 * s),
        poly([
          [cx, cy + 1],
          [cx - 40 * s, cy + 50 * s],
          [cx + 40 * s, cy + 50 * s],
        ]),
      ),
      { color: SM.melon },
    ],
    [
      'hair',
      union(
        ellipse(cx - 6 * s, cy + 13 * s, 1.3 * s, 2 * s, -20),
        ellipse(cx + 5 * s, cy + 14 * s, 1.3 * s, 2 * s, 20),
        ellipse(cx, cy + 8 * s, 1.3 * s, 2 * s),
      ),
      { color: SM.ink, fine: true },
    ],
  ];
}

/** Blossoms along a sagging arc centred under (cx, cy), w half-wide, sag deep. */
function lei(cx, cy, w, sag) {
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8 - 0.5;
    pts.push([cx + 2 * t * w, cy + sag * (1 - 4 * t * t)]);
  }
  const at = (odd) =>
    union(...pts.filter((_, i) => i % 2 === (odd ? 1 : 0)).map(([x, y]) => circle(x, y, 5.4)));
  return [
    ['leaf', at(false)],
    ['inner', at(true), { color: SM.lemon }],
    ['hair', union(...pts.map(([x, y]) => circle(x, y, 1.5))), { color: SM.coral, fine: true }],
  ];
}

/**
 * The sheet's colours on the palette, and the mixes it painted parts with. `aqua`, `lemon`, `sand`, `grass` and
 * `lagoon` are the theme's own swatches, for the sheet colours no palette colour comes close to.
 */
const COLORS = {
  [SM.teal]: 'aqua',
  [SM.coral]: 'orange',
  [SM.lemon]: 'lemon',
  [SM.melon]: 'pink',
  [SM.sand]: 'sand',
  [SM.ice]: 'sky',
  [SM.leaf]: 'grass',
  [SM.foam]: 'ivory',
  [SM.deep]: 'lagoon',
  [SM.ink]: 'night',
  '#ffffff': 'ivory',
  [mix(SM.deep, SM.ice, 22)]: 'lagoon',
  [mix(SM.ice, SM.foam, 45)]: 'sky',
  [mix(SM.coral, SM.foam, 38)]: 'blush',
  [mix(SM.foam, SM.ice, 30)]: 'ivory',
  [mix(SM.ice, SM.foam, 20)]: 'sky',
  [mix(SM.ice, SM.deep, 45)]: 'lagoon',
};

/** A part's `color` as its own colour, and a `back` part drawn behind the body as a piece of it. */
const noted = (parts) =>
  parts.map(([tone, zone, options]) => {
    if (!options || typeof options !== 'object') return [tone, zone, options];
    const { color, back, ...rest } = options;
    return [
      back ? 'body' : tone,
      zone,
      { ...rest, ...(color ? { c: color } : null), ...(back ? { free: true } : null) },
    ];
  });

const DESC = {
  'sm-popsicle':
    'A two-tone ice lolly, watermelon pink on top with a bite gone, lemon below with a drip, on a stick.',
  'sm-coconut':
    'A green coconut with its top cut off, white flesh showing, a lemon straw and a little pink paper parasol.',
  'sm-ring':
    'A cream swim ring with coral stripes, sea green showing through the hole, the face on its plump lower half.',
  'sm-castle':
    'A sandcastle turned out of a bucket: a crenellated tower on a wide wall, a coral flag on top.',
  'sm-fan':
    'An ice-blue desk fan, a round head on a slim neck, four white blades and the face on its round base.',
  'sm-ice':
    'A melting ice cube, its top lighter than its side like clear glass, two trickles and a puddle at its foot.',
  'sm-pineapple':
    'A plump lemon pineapple with five pointed leaves for a crown and a band of diamonds above and below.',
  'sm-shell': 'A coral scallop: a frilled bowl below, a fan of a lid lifted above, and a pearl in between.',
  'sm-cicada':
    'A round deep sea-green cicada, compound eyes at both ends of its wide head and ice-blue wings behind.',
};

const COMBO_EN = {
  'sm-miso-shades': [
    'Shades Miso',
    'Miso with coral-framed sunglasses pushed up on its forehead, a white glint on each lens.',
  ],
  'sm-waddle-goggles': [
    'Goggles Waddle',
    'Waddle in watermelon-pink swim goggles pushed up on its brow, ready to dive.',
  ],
  'sm-chirp-hat': ['Straw Hat Chirp', 'Chirp in a wide sand straw hat with a coral ribbon round the crown.'],
  'sm-hop-hat': [
    'Straw Hat Hop',
    'Hop in a little straw hat too, its long ears standing up behind the brim.',
  ],
  'sm-bruno-melon': [
    'Watermelon Bruno',
    'Bruno holding a big slice of watermelon, green rind and red flesh with three seeds.',
  ],
  'sm-koko-lei': [
    'Lei Koko',
    'Koko wearing a flower lei of pink and yellow blossoms hanging under its chin.',
  ],
  'sm-leo-sunscreen': [
    'Sunscreen Leo',
    'Leo with a white stripe of sunscreen down its nose and a dab on each cheek.',
  ],
  'sm-scoop-shades': [
    'Shades Scoop',
    'Scoop with the sunglasses perched on top of its scoop, a cold treat trying to look cool.',
  ],
};

/** OKLab lightness of a hex colour. */
function lightness(hex) {
  const lin = (i) => {
    const c = parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [lin(0), lin(1), lin(2)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
}

/**
 * The deep tone the lab shaded a character's hair towards (`paint.shade`), as a share of its body's lightness, so
 * the engine shades it from whatever ink the character wears. Black, the lab's default, keeps the palette's shade.
 */
const hairDeep = ({ fill, shade }) =>
  shade && shade !== '#000000'
    ? { hairDeep: Math.round((lightness(shade) / lightness(fill)) * 100) / 100 }
    : null;

export const SUMMER_SOURCE = labTheme(
  SUMMER.map((art) => ({
    ...art,
    motion: art.rock ? 'rock' : undefined,
    ...hairDeep(art.paint),
    parts: noted(art.parts),
    desc: DESC[art.id],
  })),
  COMBOS.map((combo) => ({
    ...combo,
    ...hairDeep(combo.paint),
    props: () => noted(combo.props()),
    en: COMBO_EN[combo.id][0],
    desc: COMBO_EN[combo.id][1],
  })),
  COLORS,
  {},
  { motions: true },
);
