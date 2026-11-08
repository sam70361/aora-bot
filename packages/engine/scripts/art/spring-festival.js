/**
 * The Spring Festival theme as fields in a 100 x 100 box, drawn in the lab's paper-cut sheet and kept as it was drawn
 * there: the source `generate:faces` bakes into `src/themes/spring-festival/`. Colours are the sheet's own; `COLORS`
 * maps them onto the engine's palette. `key`, `motionNote` and `verdict` are the lab page's notes and are not read
 * here. `motion` names the figure's signature motion, played about `pivot` (the point the lab's page turned the figure
 * about); `faceBox` pins the face box the lab fitted, where the engine's own fit comes out elsewhere.
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
  smeet,
  stroke,
  union,
} from './sdf.ts';
import { labTheme } from './lab.ts';

/** The sheet's limited palette. Every skin colour comes from here. */
const SF = {
  red: '#e0312b',
  deep: '#9a1820',
  gold: '#f6b73c',
  ochre: '#c98a1c',
  jade: '#2fa36b',
  tangerine: '#ff8a1e',
  peach: '#f9a3a0',
  cream: '#fff1d6',
  ink: '#2a1a1c',
};

/** A bar from a to b, `hw` half wide, its corners rounded by r. */
function bar(ax, ay, bx, by, hw, r = 0) {
  const len = Math.hypot(bx - ax, by - ay);
  const nx = (-(by - ay) / len) * (hw - r);
  const ny = ((bx - ax) / len) * (hw - r);
  const tx = ((bx - ax) / len) * r;
  const ty = ((by - ay) / len) * r;
  return poly(
    [
      [ax + tx + nx, ay + ty + ny],
      [bx - tx + nx, by - ty + ny],
      [bx - tx - nx, by - ty - ny],
      [ax + tx - nx, ay + ty - ny],
    ],
    r,
  );
}

/** The knot's four side loops. */
const LOBES = [
  [30, 27],
  [70, 27],
  [30, 65],
  [70, 65],
];

/** The small crackers braided onto the string above and below the big one, each slanting down and out. */
const SMALL_CRACKERS = [
  [49, 65, 27, 74],
  [51, 65, 73, 74],
  [49, 76, 31, 83],
  [51, 76, 69, 83],
];

/*
 * The character 福 as strokes in a 20 x 20 cell centred on (cx, cy), scaled by s; `flip` turns it upside down,
 * which is how it hangs on a door (倒福, "fortune has arrived"). `w` is the stroke radius before scaling.
 */
function fuGlyph(cx, cy, s = 1, { flip = false, w = 1.15 } = {}) {
  const P = (x, y) => (flip ? [cx - x * s, cy - y * s] : [cx + x * s, cy + y * s]);
  const line = (x0, y0, x1, y1, r = w) => stroke(...P(x0, y0), ...P(x1, y1), r * s);
  // A part is filled as solid outlines, so no stroke may close a cell: each box is left open at a corner.
  const g = 2 * w + 1.2;
  return union(
    line(-6.6, -9.6, -5.2, -7.6, w * 1.1),
    line(-9.6, -5, -3.8, -5),
    line(-3.8, -5, -9.4, 1.8),
    line(-6.4, -2, -6.4, 9.8),
    line(-5.6, 1.2, -3.4, 3.4),
    line(-0.6, -9.8, 9.6, -9.8),
    line(1, -6.2, 1, -2.6),
    line(1, -6.2, 8, -6.2),
    line(8, -6.2, 8, -2.6),
    line(1 + g, -2.6, 8, -2.6),
    line(-0.4, g, -0.4, 9.6),
    line(-0.4, 0, 9.4, 0),
    line(9.4, 0, 9.4, 9.6),
    line(-0.4, 4.8, 9.4, 4.8),
    line(4.5, g, 4.5, 9.6 - g),
    line(-0.4 + g, 9.6, 9.4, 9.6),
  );
}

/**
 * A closed ring as two parts, top and bottom halves: a part is filled as solid outlines, so a whole ring would
 * come out as a disc.
 */
function ringParts(tone, field, cy, half, opts) {
  const band = shell(field, half);
  return [
    [tone, meet(band, above(cy)), opts],
    [tone, meet(band, below(cy)), opts],
  ];
}

/*
 * The new characters. Fields are in a 100 x 100 box; `paint` gives the body fill, the backing paper of the cut skin
 * (`key`), the leaf tone and the colour hair is shaded towards (hair is the body ink with 40% of that over it).
 * `motion` names the signature move the page plays on top of the engine's own animation.
 */
export const SPRING = [
  {
    id: 'sf-tangyuan',
    zh: '宵宵',
    en: 'Dollop',
    group: 'food',
    concept:
      '一勺刚出锅的汤圆：前面那颗白白胖胖的带着脸，后面还挤着一颗粉的，青瓷小勺托在底下，勺柄往右上翘。',
    motion: 'jiggle',
    pivot: [42.3, 86.8],
    motionNote: '在勺子里 Q 弹地抖一抖，像刚被舀起来。',
    verdict: '勺子把「圆球」和别的白团子分开，24 像素是一颗白球坐在绿月牙上，依然认得出。',
    paint: { fill: SF.cream, key: SF.red, leaf: SF.jade, shade: SF.peach },
    face: [42, 53],
    body: () => blend(3, circle(42, 54, 23), circle(66, 45, 14), spoonBowl(), spoonHandle()),
    parts: [
      ['hair', minus(circle(66, 45, 14), circle(42, 54, 24.4))],
      ['leaf', grow(union(spoonBowl(), spoonHandle()), 0.4)],
      ['inner', meet(box(46, 71.4, 40, 1.2), ellipse(46, 71, 39, 16))],
    ],
  },
  {
    id: 'sf-hongbao',
    zh: '红红',
    en: 'Packet',
    group: 'luck',
    concept: '竖着的大红包，封口是一道金边的尖角，尖上压着一枚方孔金钱当封印，脸在下半截。',
    motion: 'shimmy',
    pivot: [50, 93.5],
    motionNote: '踮起来晃两下，像里面的钱在沙沙响。',
    verdict: '红色长方块加金色圆点，24 像素一眼就是红包；封口的折角让它不只是一张红卡片。',
    paint: { fill: SF.red, key: SF.gold, leaf: SF.gold, shade: SF.ink },
    face: [50, 67],
    body: () => box(50, 54, 29, 38, 7),
    parts: [
      ['hair', (x, y) => y - (37 - 0.42 * Math.abs(x - 50))],
      ['leaf', shell((x, y) => y - (37 - 0.42 * Math.abs(x - 50)), 1)],
      ['leaf', circle(50, 37, 8.5)],
      ['hair', box(50, 37, 2.7, 2.7, 0.6)],
    ],
  },
  {
    id: 'sf-firecracker',
    zh: '噼噼',
    en: 'Crackle',
    group: 'luck',
    concept:
      '一小挂鞭炮：打头那根最粗的带脸，头尾裹着金纸；底下的引线上编着两对小炮仗，斜斜地往两边伸，最后坠一颗小的，顶上打个圈挂着。',
    motion: 'swing',
    pivot: [50, 11.3],
    motionNote: '吊在引线上左右荡，荡到头时浑身一颤，像要响了。',
    verdict:
      '没有火星也没有烟，靠一根带金头的红圆筒和底下人字形编着的小炮仗认出来；24 像素是一个拖着「鱼骨」尾巴的红筒，和红包的方块分得开。',
    paint: { fill: SF.red, key: SF.gold, leaf: SF.gold, shade: SF.ink },
    face: [50, 40],
    body: () =>
      blend(
        2,
        box(50, 39, 23, 24, 7),
        sideCrackers(),
        stroke(50, 8, 50, 86, 1.6),
        box(50, 87, 4.2, 6.5, 2),
        circle(50, 5.5, 4.2),
      ),
    parts: [
      ['leaf', sideCaps()],
      ['leaf', meet(box(50, 39, 23.4, 24.4, 7), union(above(19.5), below(58.5)))],
      ['inner', stroke(31, 24, 31, 54, 1.4)],
      ['hair', meet(stroke(50, 8, 50, 86, 1.6), union(above(14.6), below(63.4)))],
      ['leaf', box(50, 91.5, 4.6, 2.4, 1.6)],
      ...ringParts('hair', circle(50, 5.5, 2.9), 5.5, 1.3, { free: true }),
    ],
  },
  {
    id: 'sf-fu',
    zh: '福福',
    en: 'Bliss',
    group: 'luck',
    concept: '贴在门上的斗方：菱形红纸镶一道金边，上角倒写着一个金色的「福」，福倒了就是福到了。',
    motion: 'flutter',
    pivot: [50, 13.3],
    motionNote: '上角钉住，整张纸被风吹得轻轻掀动。',
    verdict: '菱形是全套最好认的剪影；福字在 48 像素以下只剩一小块金色，菱形和金边照样撑得住。',
    paint: { fill: SF.red, key: SF.gold, leaf: SF.gold, shade: SF.ink },
    face: [50, 63],
    faceBox: { x: 50, y: 62, sx: 19, sy: 13.5 },
    body: () => diamond(),
    parts: [
      ...ringParts('leaf', grow(diamond(), -5.2), 50, 1.15),
      ['leaf', fuGlyph(50, 34, 0.98, { flip: true })],
    ],
  },
  {
    id: 'sf-nian',
    zh: '年年',
    en: 'Rumble',
    group: 'beast',
    concept:
      '传说里怕红怕响的年兽，缩成一个圆滚滚的墨色毛球：头顶一对弯角，脸外面围一圈蓬蓬的红鬃毛，两只小短脚。',
    motion: 'stomp',
    pivot: [50, 94.5],
    motionNote: '一蹦一跺脚，落地时整个人压扁一下，凶不起来。',
    verdict: '全套唯一的深色身子，金色的脸在墨色上很亮；鬃毛加弯角，24 像素是一个带角的红边球。',
    paint: { fill: SF.ink, key: SF.gold, leaf: SF.red, shade: SF.gold },
    face: [50, 64],
    faceBox: { x: 50, y: 60.55, sx: 22.88, sy: 15.79 },
    body: () =>
      blend(4, circle(50, 61, 28), maneTufts(), nianHorns(), ellipse(37, 90, 8, 5), ellipse(63, 90, 8, 5)),
    parts: [
      ['leaf', minus(union(maneTufts(), circle(50, 61, 29)), union(circle(50, 64, 21.5), below(74)))],
      ['hair', grow(nianHorns(), 0.4)],
    ],
  },
  {
    id: 'sf-knot',
    zh: '结结',
    en: 'Tassel',
    group: 'luck',
    concept: '一枚中国结：方胜的结心四周绕着八个耳翼，顶上一根挂绳，底下穿一颗金珠，再垂一束流苏。',
    motion: 'sway',
    pivot: [50, 10.4],
    motionNote: '从挂绳上慢慢摆，流苏跟在后面甩。',
    verdict: '八个耳翼的花形轮廓加一条流苏尾巴，和福福的菱形分得开；耳翼里的深色圈在小图里自动省掉了。',
    paint: { fill: SF.red, key: SF.gold, leaf: SF.gold, shade: SF.ink },
    face: [50, 47],
    body: () =>
      blend(2.5, knotCore(), knotLobes(), stroke(50, 13, 50, 4, 1.6), circle(50, 81, 4.4), tassel()),
    parts: [
      ...LOBES.flatMap(([x, y]) => ringParts('hair', circle(x, y, 3.8), y, 1.1)),
      [
        'hair',
        union(stroke(48, 90, 46.4, 98, 0.6), stroke(50, 90, 50, 98, 0.6), stroke(52, 90, 53.6, 98, 0.6)),
      ],
      ['leaf', union(circle(50, 81, 4.8), box(50, 87.2, 5.8, 1.7, 0.8))],
      ['hair', meet(stroke(50, 13, 50, 2, 2), above(13.5))],
    ],
  },
  {
    id: 'sf-orange',
    zh: '吉吉',
    en: 'Zest',
    group: 'food',
    concept: '过年一定要摆的砂糖橘：扁扁圆圆，顶上一截短梗冒出两片翠绿的叶子，橘子谐音「吉」，大吉大利。',
    motion: 'roll',
    pivot: [50, 88.7],
    motionNote: '在桌上来回滚，滚到头再晃回来。',
    verdict: '橙色圆加两片绿叶，24 像素毫不含糊；和引擎里的苹果、梨比，扁圆身子和叶子长在两边是区别。',
    paint: { fill: SF.tangerine, key: SF.red, leaf: SF.jade, shade: SF.deep },
    face: [50, 66],
    body: () => blend(3, ellipse(50, 63, 35, 29), box(50, 32, 2.6, 4, 1.2), orangeLeaves()),
    parts: [
      ['leaf', grow(orangeLeaves(), 0.4)],
      ['hair', box(50, 32, 3, 4.4, 1.2)],
      ['inner', meet(shell(ellipse(50, 63, 29, 23), 1.3), (x, y) => x - 50 + (y - 63) + 14)],
      ...[
        [25, 56, 1.4],
        [72, 74, 1.4],
        [76, 55, 1.2],
        [30, 76, 1.2],
      ].map(([x, y, r]) => ['inner', circle(x, y, r)]),
    ],
  },
  {
    id: 'sf-goat',
    zh: '羊羊',
    en: 'Baa',
    group: 'beast',
    concept:
      '2027 年的生肖小羊：奶白的圆脑袋，额前三撮卷毛，两边各盘着一只金色的卷角，耳朵向外耷拉，下巴一小撮山羊胡。',
    motion: 'bound',
    pivot: [50, 94.5],
    motionNote: '往前一跳一跳，跳起来时脑袋一低，像要顶人。',
    verdict: '卷角和山羊胡是它不是绵羊的关键；卷角做成粗粗的金色螺旋，24 像素两边各一个圈。',
    paint: { fill: SF.cream, key: SF.red, leaf: SF.gold, shade: SF.peach },
    face: [50, 62],
    body: () =>
      blend(
        3,
        circle(50, 59, 27),
        circle(39, 34, 7.5),
        circle(50, 31, 8),
        circle(61, 34, 7.5),
        goatHorns(),
        goatEars(),
        poly(
          [
            [45, 83],
            [55, 83],
            [50, 95],
          ],
          2.2,
        ),
      ),
    parts: [
      ['leaf', grow(goatHorns(), 0.4)],
      ['hair', union(ellipse(16, 56, 6, 2.6, -25), ellipse(84, 56, 6, 2.6, 25))],
    ],
  },
  {
    id: 'sf-koi',
    zh: '锦锦',
    en: 'Swish',
    group: 'beast',
    concept:
      '红白锦鲤，年年有余：白身子背上一块红斑，红色的大尾巴分成两叉，嘴边两根小须，背鳍和胸鳍是淡粉色的。',
    motion: 'swim',
    pivot: [54.8, 54.8],
    motionNote: '身子一扭一扭往前游，每隔一阵跃出水面一下。',
    verdict: '双叉大尾巴加红白配色就是锦鲤，和引擎里青色的鱼鱼不会混；红斑让开了脸，表情不受影响。',
    paint: { fill: SF.cream, key: SF.red, leaf: SF.red, shade: SF.red },
    face: [39, 59],
    body: () => blend(5, ellipse(44, 57, 32, 24, -5), koiTail(), koiFins(), koiBarbels()),
    parts: [
      ['leaf', meet(ellipse(44, 57, 32.6, 24.6, -5), union(circle(64, 37, 11.5), circle(54, 79, 6)))],
      ['leaf', grow(minus(koiTail(), ellipse(44, 57, 31, 23, -5)), 0.4)],
      ['hair', grow(minus(koiFins(), ellipse(44, 57, 31.4, 23.4, -5)), 0.4)],
      ['hair', koiBarbels()],
    ],
  },
  {
    id: 'sf-ingot',
    zh: '元元',
    en: 'Nugget',
    group: 'luck',
    concept: '一锭金元宝：两头高高翘起的船形，中间鼓出一个亮亮的圆顶，边沿压着一道深色的唇线，旁边闪一颗星。',
    motion: 'rock',
    pivot: [50, 88.7],
    motionNote: '放下时在圆底上前后摇，越摇越小，最后一闪。',
    verdict: '翘头加圆顶是元宝的标志剪影，24 像素是一只金色小船；圆顶用浅一档的金色，不和船身糊在一起。',
    paint: { fill: SF.gold, key: SF.red, leaf: SF.cream, shade: SF.ochre },
    face: [50, 75],
    faceBox: { x: 50, y: 70.33, sx: 11.56, sy: 8 },
    body: () => blend(3, ingotBoat(), circle(50, 49, 19)),
    parts: [
      ['inner', meet(circle(50, 49, 19.6), (x, y) => y - (59 - 0.008 * (x - 50) ** 2))],
      ['hair', shell((x, y) => y - (59.6 - 0.008 * (x - 50) ** 2), 1.6)],
      [
        'leaf',
        poly(
          [
            [82, 13],
            [84.4, 21.6],
            [93, 24],
            [84.4, 26.4],
            [82, 35],
            [79.6, 26.4],
            [71, 24],
            [79.6, 21.6],
          ],
          0.6,
        ),
        { free: true },
      ],
    ],
  },
];

function spoonBowl() {
  return smeet(3, ellipse(46, 71, 41, 17), below(70));
}

function spoonHandle() {
  return chain(
    [
      [76, 79],
      [90, 65],
      [98, 47],
    ],
    5.4,
    3.4,
  );
}

function sideCrackers() {
  return union(...SMALL_CRACKERS.map(([ax, ay, bx, by]) => bar(ax, ay, bx, by, 4.4, 2.1)));
}

/** The gold paper at the outer end of each small cracker. */
function sideCaps() {
  return meet(sideCrackers(), union(...SMALL_CRACKERS.map(([, , bx, by]) => circle(bx, by, 4.2))));
}

function diamond() {
  return poly(
    [
      [50, 7],
      [93, 50],
      [50, 93],
      [7, 50],
    ],
    5,
  );
}

/** Tufts round the top and sides of the head, the bottom left bare for the feet. */
function maneTufts() {
  const tufts = [];
  for (let i = -4; i <= 4; i++) {
    const a = ((-90 + i * 29) * Math.PI) / 180;
    tufts.push(circle(50 + 28 * Math.cos(a), 61 + 28 * Math.sin(a), i % 2 ? 6.5 : 7.5));
  }
  return union(...tufts);
}

function nianHorns() {
  return union(
    chain(
      [
        [39, 37],
        [33, 25],
        [37, 13],
      ],
      4.6,
      2.3,
    ),
    chain(
      [
        [61, 37],
        [67, 25],
        [63, 13],
      ],
      4.6,
      2.3,
    ),
  );
}

function knotCore() {
  return poly(
    [
      [50, 21],
      [75, 46],
      [50, 71],
      [25, 46],
    ],
    7,
  );
}

function knotLobes() {
  return union(
    ...LOBES.map(([x, y]) => circle(x, y, 8.2)),
    circle(50, 16, 6.4),
    circle(80, 46, 6.4),
    circle(20, 46, 6.4),
    circle(50, 76, 6.4),
  );
}

function tassel() {
  return poly(
    [
      [45.6, 86],
      [54.4, 86],
      [58.6, 98.6],
      [41.4, 98.6],
    ],
    1.4,
  );
}

function orangeLeaves() {
  return union(ellipse(38.5, 27.5, 11, 5, 25), ellipse(62.5, 25.5, 12.5, 5.6, -28));
}

function goatHorns() {
  const left = [
    [38, 32],
    [31, 22],
    [21, 19],
    [12, 25],
    [11, 36],
    [18, 43],
    [25, 40],
    [25, 33],
  ];
  return union(
    chain(left, 5.6, 2.6),
    chain(
      left.map(([x, y]) => [100 - x, y]),
      5.6,
      2.6,
    ),
  );
}

function goatEars() {
  return union(ellipse(16, 56, 10, 5, -25), ellipse(84, 56, 10, 5, 25));
}

function koiTail() {
  return blend(
    3,
    poly(
      [
        [70, 52],
        [80, 50],
        [80, 62],
        [70, 62],
      ],
      3,
    ),
    ellipse(87, 43, 12, 6.4, -42),
    ellipse(87, 72, 12, 6.4, 42),
  );
}

function koiFins() {
  return union(
    poly(
      [
        [34, 36],
        [50, 21],
        [62, 34],
      ],
      3,
    ),
    ellipse(42, 81, 9, 4.2, 22),
  );
}

function koiBarbels() {
  return union(
    chain(
      [
        [15, 61],
        [9, 64],
        [7, 70],
      ],
      1.1,
      0.7,
    ),
    chain(
      [
        [16, 66],
        [12, 71],
        [13, 77],
      ],
      1.1,
      0.7,
    ),
  );
}

function ingotBoat() {
  return blend(6, ellipse(50, 71, 35, 18), stroke(24, 66, 7, 45, 8, 4.6), stroke(76, 66, 93, 45, 8, 4.6));
}

/*
 * Props on existing cast members. The member's own outline and parts are kept; the prop is a set of free parts in
 * front of them, so the face, the motion and the keyline all come from the engine as usual.
 */
export const COMBOS = [
  {
    id: 'sf-kiki-tiger',
    base: 'bob',
    member: 'kiki',
    zh: '琪琪',
    prop: '虎头帽',
    concept: '琪琪戴上一顶橘色虎头帽，两只圆耳朵竖在头顶，额前绣一个「王」字。',
    verdict: '虎头帽把齐刘海整个罩住，只露两边的发梢；耳朵让剪影多了两个角，24 像素一看就是「戴了帽子」。',
    paint: { fill: SF.ochre, key: SF.gold, leaf: SF.tangerine, shade: SF.ink },
    at: [50, 60],
    s: 0.72,
    props: () => [
      ['leaf', blend(3, meet(ellipse(50, 47, 37, 26), above(50)), circle(24, 25, 8.5), circle(76, 25, 8.5))],
      ['hair', union(circle(24, 25, 4), circle(76, 25, 4))],
      [
        'hair',
        union(
          stroke(44, 30, 56, 30, 1.3),
          stroke(45, 36, 55, 36, 1.3),
          stroke(43, 42.5, 57, 42.5, 1.3),
          stroke(50, 30, 50, 42.5, 1.3),
        ),
      ],
      [
        'hair',
        union(
          stroke(20, 44, 28, 41, 1.2),
          stroke(80, 44, 72, 41, 1.2),
          stroke(23, 37, 30, 35.5, 1.1),
          stroke(77, 37, 70, 35.5, 1.1),
        ),
      ],
    ],
  },
  {
    id: 'sf-waddle-scarf',
    base: 'penguin',
    member: 'waddle',
    zh: '摇摇',
    prop: '红围巾',
    concept: '摇摇围上一条大红围巾，一头垂在胸前，尾端剪成流苏。',
    verdict: '墨色企鹅配红围巾，颜色对比最强；围巾压在肚皮上沿，不碰嘴巴。',
    paint: { fill: SF.ink, key: SF.gold, leaf: SF.red, shade: SF.gold },
    at: [50, 50],
    s: 0.74,
    faceBox: { x: 50, y: 43.85, sx: 20.71, sy: 30 },
    props: () => [
      [
        'leaf',
        union(
          meet(box(50, 67, 40, 4.6, 0), ellipse(50, 52, 30.5, 37)),
          smeet(2, bar(60, 66, 67, 88, 4.6, 1.6), above(88)),
        ),
      ],
      [
        'hair',
        union(stroke(63.5, 88, 64.5, 93, 1.1), stroke(67.5, 87, 69, 92, 1.1), stroke(71, 86, 73, 90.5, 1.1)),
      ],
    ],
  },
  {
    id: 'sf-hop-lantern',
    base: 'bunny',
    member: 'hop',
    zh: '跳跳',
    prop: '小灯笼',
    concept: '跳跳挑着一根小竹竿，竿头挂一盏圆圆的红灯笼，灯笼底下垂着穗子。',
    verdict: '灯笼是一座单独的小岛，剪纸底衬会把它和兔子连成一张；红灯笼让粉兔子一下子有了年味。',
    paint: { fill: SF.peach, key: SF.red, leaf: SF.red, shade: SF.ink },
    at: [42, 54],
    s: 0.72,
    props: () => [
      ['hair', union(stroke(70, 68, 88, 53, 1.3), stroke(87, 54, 86, 63, 0.7))],
      ['leaf', ellipse(86, 74, 10.5, 9.4)],
      [
        'hair',
        union(box(86, 64.6, 5.4, 1.9, 0.9), box(86, 83.4, 5.4, 1.9, 0.9), stroke(86, 85, 86, 94, 1.4)),
      ],
      ['hair', meet(shell(ellipse(86, 74, 4.6, 9.2), 0.6), leftOf(86))],
      ['hair', meet(shell(ellipse(86, 74, 4.6, 9.2), 0.6), rightOf(86))],
    ],
  },
  {
    id: 'sf-maru-collar',
    base: 'topknot',
    member: 'maru',
    zh: '丸丸',
    prop: '唐装立领',
    concept: '丸丸穿上红色小唐装，立领在下巴底下合拢，正中两对黑色盘扣。',
    verdict:
      '立领和肩线让圆脑袋底下多了一截「衣服」，像穿了新衣服去拜年；盘扣是全套最小的细节，48 像素以下就看不见了。',
    paint: { fill: SF.peach, key: SF.gold, leaf: SF.red, shade: SF.ink },
    at: [50, 44],
    s: 0.76,
    props: () => [
      [
        'leaf',
        union(
          smeet(4, ellipse(50, 104, 40, 20), above(99.5)),
          box(39.5, 86, 10.5, 4.6, 3.4),
          box(60.5, 86, 10.5, 4.6, 3.4),
        ),
      ],
      [
        'hair',
        union(
          stroke(50, 91, 50, 99, 0.7),
          stroke(46, 93.5, 54, 93.5, 1),
          circle(46, 93.5, 1.5),
          stroke(46, 97.5, 54, 97.5, 1),
          circle(46, 97.5, 1.5),
        ),
      ],
    ],
  },
  {
    id: 'sf-mochi-fu',
    base: 'mochi',
    member: 'mochi',
    zh: '糯糯',
    prop: '福字胸章',
    concept: '糯糯胸前别了一枚红色圆胸章，上面一个奶白色的「福」。',
    verdict: '胸章避开了脸，挂在右下角；福字在大图里清楚，小图里是一颗红点，也不难看。',
    paint: { fill: SF.cream, key: SF.red, leaf: SF.red, shade: SF.ink },
    at: [50, 52],
    s: 0.76,
    faceBox: { x: 50, y: 51.19, sx: 30.81, sy: 21.24 },
    props: () => [
      ['leaf', circle(73, 74, 10)],
      ['inner', fuGlyph(73, 74.4, 0.56, { w: 1.3 })],
    ],
  },
  {
    id: 'sf-lulu-crackers',
    base: 'twinbuns',
    member: 'lulu',
    zh: '露露',
    prop: '鞭炮耳坠',
    concept: '露露两边耳垂各吊着一对小鞭炮耳坠，金色的头，走起路来叮当晃。',
    verdict: '耳坠吊在脸的两侧外面，不挡表情；但它们本身太小，48 像素以下只剩两个红点。',
    paint: { fill: SF.jade, key: SF.gold, leaf: SF.red, shade: SF.ink },
    at: [50, 46],
    s: 0.76,
    props: () => [
      ['hair', union(stroke(21, 58, 21, 64, 0.7), stroke(79, 58, 79, 64, 0.7))],
      [
        'leaf',
        union(
          bar(20.5, 64, 17, 76, 2.6, 1.2),
          bar(21.5, 64, 25, 76, 2.6, 1.2),
          bar(79.5, 64, 83, 76, 2.6, 1.2),
          bar(78.5, 64, 75, 76, 2.6, 1.2),
        ),
      ],
    ],
  },
  {
    id: 'sf-nook-couplets',
    base: 'cottage',
    member: 'nook',
    zh: '窝窝',
    prop: '春联',
    concept: '小房子过年贴了春联：门两边各一条竖的红纸，屋檐下一条横批。',
    verdict: '春联直接贴在房子两侧，剪影从一个方块加了两根柱子；横批压在屋檐底下，正好在脸的上面。',
    paint: { fill: SF.tangerine, key: SF.gold, leaf: SF.red, shade: SF.ink },
    at: [50, 58],
    s: 0.6,
    faceBox: { x: 50, y: 66.5, sx: 16.14, sy: 11.14 },
    props: () => [
      ['leaf', union(box(19.5, 76, 4.6, 16.5, 1), box(80.5, 76, 4.6, 16.5, 1), box(50, 61.6, 15, 3, 0.8))],
      [
        'inner',
        union(
          ...[66, 72.5, 79, 85.5].flatMap((y) => [box(19.5, y, 2.1, 1.8, 0.6), box(80.5, y, 2.1, 1.8, 0.6)]),
          ...[42, 47.4, 52.6, 58].map((x) => box(x, 61.6, 1.7, 1.5, 0.5)),
        ),
      ],
    ],
  },
  {
    id: 'sf-chirp-lion',
    base: 'chick',
    member: 'chirp',
    zh: '啾啾',
    prop: '舞狮帽',
    concept: '啾啾顶着一顶小舞狮帽：红色帽顶竖着一只小角，帽檐一圈蓬蓬的毛边。',
    verdict:
      '舞狮头已经是实验室里的角色了，这里只当帽子；毛边用 inner 色调，在小黄鸡身上正好是浅黄色的绒毛。',
    paint: { fill: SF.gold, key: SF.red, leaf: SF.red, shade: SF.deep },
    at: [50, 66],
    s: 0.72,
    faceBox: { x: 50, y: 59.68, sx: 25.04, sy: 19.56 },
    props: () => [
      [
        'leaf',
        blend(
          3,
          meet(ellipse(50, 50, 30, 25), above(49)),
          ellipse(50, 23, 4, 6),
          ellipse(20, 40, 5, 8, -30),
          ellipse(80, 40, 5, 8, 30),
        ),
      ],
      [
        'inner',
        union(...[22, 29, 36, 43, 50, 57, 64, 71, 78].map((x, i) => circle(x, 49 + (i % 2) * 0.8, 4.2))),
      ],
      ['hair', ellipse(50, 23, 1.8, 3.4)],
    ],
  },
];

/**
 * The sheet's colours on the palette. `deep` only ever shaded hair in the lab and has no swatch of its own. Peach is
 * the soft blush rather than pink, which is a far hotter colour than the sheet's.
 */
const COLORS = {
  [SF.red]: 'red',
  [SF.gold]: 'yellow',
  [SF.ochre]: 'brown',
  [SF.jade]: 'green',
  [SF.tangerine]: 'orange',
  [SF.peach]: 'blush',
  [SF.cream]: 'cream',
  [SF.ink]: 'night',
};

/**
 * The swatches hair parts take where the lab shaded them towards a colour other than the ink: the lab laid 40% of
 * that colour over the body, so a cream body shaded towards peach or red gave a pale pink rice ball, ears and fins,
 * and an ink body shaded towards gold gave bronze horns and fringe. Hair shaded towards `ink` or `deep` keeps the
 * engine's hair tone, which is that same darker body.
 */
const SHADES = {
  [SF.peach]: 'blush',
  [SF.gold]: 'cocoa',
  [SF.red]: 'blush',
  [SF.ochre]: 'brown',
};

const DESC = {
  'sf-tangyuan':
    'A spoonful of sweet rice balls: a plump white one with the face, a pink one behind, on a celadon spoon.',
  'sf-hongbao': 'An upright red envelope, its flap edged in gold and sealed with a square-holed coin.',
  'sf-firecracker':
    'A little string of firecrackers: the big one with the face, gold paper at both ends, small ones braided below.',
  'sf-fu':
    'A diamond of red door paper in a gold border, the character for fortune hung upside down at the top.',
  'sf-nian':
    'The new-year beast, curled into an ink-dark furball with curved horns, a red mane and two stubby feet.',
  'sf-knot':
    'A Chinese knot: a diamond heart ringed by loops, a cord above and a gold bead and tassel below.',
  'sf-orange': 'A squat mandarin orange with a short stem and two jade leaves, the fruit of good luck.',
  'sf-goat':
    'The zodiac goat: a cream round head, three curls on the brow, gold curled horns and a little beard.',
  'sf-koi': 'A red and white koi, a red patch on its back, a big forked tail, two whiskers and pink fins.',
  'sf-ingot':
    'A gold ingot: a boat with both ends turned up, a bright dome in the middle and a star beside it.',
};

const COMBO_EN = {
  'sf-kiki-tiger': [
    'Tiger Hat Kiki',
    'Kiki in an orange tiger hat, two round ears on top and the king mark on the brow.',
  ],
  'sf-waddle-scarf': [
    'Red Scarf Waddle',
    'Waddle in a big red scarf, one end down the chest, cut into a fringe.',
  ],
  'sf-hop-lantern': [
    'Lantern Hop',
    'Hop carrying a little red lantern on a bamboo rod, its tassel hanging below.',
  ],
  'sf-maru-collar': [
    'Mandarin Collar Maru',
    'Maru in a little red jacket, the stand collar closed under the chin with knot buttons.',
  ],
  'sf-mochi-fu': [
    'Fortune Badge Mochi',
    'Mochi with a round red badge on the chest, the character for fortune on it in cream.',
  ],
  'sf-lulu-crackers': [
    'Firecracker Earrings Lulu',
    'Lulu with a pair of little firecracker earrings on each side, gold-tipped.',
  ],
  'sf-nook-couplets': [
    'Couplets Nook',
    'The little house with red couplets down both sides of the door and a banner under the eaves.',
  ],
  'sf-chirp-lion': [
    'Lion Hat Chirp',
    'Chirp under a little lion-dance hat: a red crown with one horn and a fluffy brim.',
  ],
};

export const SPRING_FESTIVAL_SOURCE = labTheme(
  SPRING.map((art) => ({ ...art, desc: DESC[art.id] })),
  COMBOS.map((combo) => ({ ...combo, en: COMBO_EN[combo.id][0], desc: COMBO_EN[combo.id][1] })),
  COLORS,
  SHADES,
);
