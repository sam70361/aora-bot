/**
 * The Christmas theme as fields in a 100 x 100 box, drawn in the lab's felt sheet and kept as it was drawn there:
 * the source `generate:faces` bakes into `src/themes/christmas/`. Colours are the sheet's own; `COLORS` maps them
 * onto the engine's palette. `sig` names each character's signature motions (declared in the theme's
 * `motions.ts`), a part's `move` its own; `motion` and `verdict` are the lab page's notes and are not read here.
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
  rightOf,
  shell,
  stroke,
  union,
} from './sdf.ts';
import { labTheme } from './lab.ts';
/** The sheet's limited palette. Every colour on a character comes from here. */
const XM = {
  red: '#cf3a3f',
  pine: '#2f7650',
  cream: '#fbf0da',
  gold: '#f2b53e',
  ice: '#a9d6ea',
  cocoa: '#6c4330',
  ginger: '#c47a3e',
  peach: '#f4c6a2',
  ink: '#2a1e22',
};

// ---- Small geometry --------------------------------------------------------------------------------------

/** A five-point star, its points rounded by r. */
function star(cx, cy, R, ri, r = 0, rot = 0) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = ((-90 + rot + i * 36) * Math.PI) / 180;
    const k = i % 2 ? ri : R;
    pts.push([cx + k * Math.cos(a), cy + k * Math.sin(a)]);
  }
  return poly(pts, r);
}

/** A rounded box turned by deg about its centre. */
function rbox(cx, cy, hw, hh, r, deg) {
  const c = Math.cos((deg * Math.PI) / 180);
  const s = Math.sin((deg * Math.PI) / 180);
  const f = box(0, 0, hw, hh, r);
  return (x, y) => f((x - cx) * c + (y - cy) * s, -(x - cx) * s + (y - cy) * c);
}

/** A zigzag of icing across a limb: n strokes about (cx, cy), running along angle deg, len long, amp deep. */
function zigzag(cx, cy, deg, len, amp, n, r) {
  const a = (deg * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = -len / 2 + (len * i) / n;
    const o = i % 2 ? amp : -amp;
    pts.push([cx + ux * t - uy * o, cy + uy * t + ux * o]);
  }
  return chain(pts, r);
}

/** The candy cane's centre line and thickness, which its body and its stripes share. */
const CANE = { cx: 42, cy: 36, R: 20, w: 15, from: 155, bottom: 84 };

/** A slanted band across a stroke of radius w at p, for the cane's stripes. */
function band(px, py, deg, w, half) {
  const a = (deg * Math.PI) / 180;
  return stroke(px - Math.cos(a) * w, py - Math.sin(a) * w, px + Math.cos(a) * w, py + Math.sin(a) * w, half);
}

/*
 * The new characters, in a 100 x 100 box. `paint` gives the body fill, the felt backing (`back`) and the leaf
 * tone; parts name their palette colour with `c`. `sig` is the signature motion: a CSS motion about `pivot` and
 * the effects drawn round the figure, all in box units.
 */
const CHRISTMAS = [
  {
    id: 'xm-tree',
    zh: '杉杉',
    en: 'Spruce',
    group: 'deco',
    concept:
      '三层圆角的小杉树，顶上一颗金星，身上挂着红、金、冰蓝三色小球，树干是一小截可可色。脸长在最宽的底层。',
    motion: '从树干根部左右轻轻摇，像被暖气吹着；顶上的星星一闪一闪。',
    verdict: '三层锯齿加顶星，24 像素一眼就是圣诞树；层与层之间压一道深绿，所以小图里也看得出分层。',
    paint: { fill: XM.pine, back: XM.cream, leaf: XM.gold },
    face: [50, 66],
    body: () => blend(4, treeTiers(), box(50, 91, 8, 6, 2)),
    parts: [
      ['hair', minus(meet(tier(1), grow(tier(0), 3.4)), tier(0)), { stitch: false }],
      ['hair', minus(meet(tier(2), grow(tier(1), 3.4)), tier(1)), { stitch: false }],
      ['leaf', meet(box(50, 92, 8.6, 7, 2), below(87.5)), { c: XM.cocoa, stitch: false }],
      ['leaf', circle(33, 46, 3.4), { c: XM.red, stitch: false }],
      ['leaf', circle(67, 44, 3.2), { c: XM.ice, stitch: false, small: false }],
      ['leaf', circle(45, 27, 2.6), { c: XM.ice, stitch: false, small: false }],
      ['leaf', circle(21, 79, 3.8), { c: XM.gold, stitch: false }],
      ['leaf', circle(79, 79, 3.8), { c: XM.red, stitch: false }],
      ['leaf', star(50, 10, 11, 5, 1.6), { c: XM.gold, free: true, move: 'twinkle' }],
    ],
    sig: { motion: 'sway', pivot: [50, 97], fx: [{ kind: 'twinkle', at: [50, 10], size: 22 }] },
  },
  {
    id: 'xm-snowman',
    zh: '堆堆',
    en: 'Chilly',
    group: 'snow',
    concept: '上小下大两个雪球，戴一顶系红带的小礼帽，围一条红围巾，两根树枝手臂往上扬，肚子上两颗煤球纽扣。',
    motion: '像不倒翁一样左右晃，晃到一边停一下再荡回来，身边飘着小雪花。',
    verdict: '两个圆叠起来加礼帽，剪影最稳。胡萝卜鼻子没画：引擎的 cute 脸没有鼻子位，硬贴一个会和嘴打架。',
    paint: { fill: XM.cream, back: XM.ice, leaf: XM.red },
    face: [50, 42],
    body: () => union(blend(5, circle(50, 44, 22), circle(50, 77, 23), snowArms()), topHat()),
    parts: [
      ['leaf', grow(snowArms(), 0.3), { c: XM.cocoa, stitch: false }],
      ['leaf', grow(topHat(), 0.3), { c: XM.ink, free: true, stitch: false }],
      ['leaf', box(50, 17, 11.2, 2.3), { c: XM.red, free: true, stitch: false }],
      ['leaf', union(ellipse(50, 61, 22, 5.4), rbox(63, 70, 4.8, 10, 2.5, -12)), { c: XM.red, free: true }],
      [
        'leaf',
        union(rbox(64.2, 74.5, 4.9, 1.3, 0.5, -12), rbox(65, 78.4, 4.9, 1.3, 0.5, -12)),
        { c: XM.cream, free: true, stitch: false, small: false },
      ],
      ['leaf', circle(50, 76, 2.7), { c: XM.ink, stitch: false }],
      ['leaf', circle(50, 86, 2.7), { c: XM.ink, stitch: false }],
    ],
    sig: { motion: 'rock', pivot: [50, 100], fx: [{ kind: 'snow', at: [50, 50], size: 120 }] },
  },
  {
    id: 'xm-ginger',
    zh: '姜姜',
    en: 'Crumb',
    group: 'treat',
    concept: '刚出炉的姜饼小人，圆脑袋、短胳膊短腿，手腕脚踝挤着奶油白的锯齿糖霜，肚子上三颗红绿软糖纽扣。',
    motion: '左右脚轮流跳的小踢踏舞，跳起来时身子往抬脚那边歪。',
    verdict: '大字形剪影和别的角色都不撞；糖霜锯齿在 24 像素会糊，小图版本只留纽扣。',
    paint: { fill: XM.ginger, back: XM.cream, leaf: XM.cream },
    face: [50, 30],
    body: () => gingerBody(),
    parts: [
      ['leaf', zigzag(22.5, 45.6, 112, 13, 1.4, 6, 1.15), { c: XM.cream, stitch: false, small: false }],
      ['leaf', zigzag(77.5, 45.6, 68, 13, 1.4, 6, 1.15), { c: XM.cream, stitch: false, small: false }],
      ['leaf', zigzag(35.6, 87.2, 30, 14, 1.4, 6, 1.15), { c: XM.cream, stitch: false, small: false }],
      ['leaf', zigzag(64.4, 87.2, -30, 14, 1.4, 6, 1.15), { c: XM.cream, stitch: false, small: false }],
      ['leaf', circle(50, 55, 3), { c: XM.red, stitch: false }],
      ['leaf', circle(50, 64, 3), { c: XM.pine, stitch: false }],
      ['leaf', circle(50, 73, 3), { c: XM.red, stitch: false }],
    ],
    sig: { motion: 'jig', pivot: [50, 96], fx: [] },
  },
  {
    id: 'xm-deer',
    zh: '驯驯',
    en: 'Fawn',
    group: 'snow',
    concept: '侧着脸的小驯鹿，头顶一对分叉鹿角，奶油色的吻部往右伸，鼻头是一颗圆圆的红鼻子。',
    motion: '小碎步蹦两下，红鼻子跟着一亮一亮地发光。',
    verdict: '吻部朝右伸，红鼻子就落在脸的外面，不和嘴抢地方；鹿角做粗了，24 像素还是两根叉。',
    paint: { fill: XM.cocoa, back: XM.cream, leaf: XM.ginger },
    face: [40, 58],
    body: () =>
      blend(4, circle(44, 58, 25), ellipse(69, 65, 15, 10.5, -8), circle(84, 61, 6.4), deerEars(), antlers()),
    parts: [
      ['leaf', grow(antlers(), 0.3), { c: XM.ginger, stitch: false }],
      ['inner', ellipse(18, 46, 5, 2.2, -32), { stitch: false, small: false }],
      ['leaf', ellipse(72, 67.5, 11.5, 7.6, -8), { c: XM.cream, stitch: false }],
      ['leaf', circle(84, 61, 6.8), { c: XM.red, free: true, stitch: false, move: 'glow' }],
    ],
    sig: { motion: 'prance', pivot: [50, 92], fx: [{ kind: 'glow', at: [84, 61], size: 22 }] },
  },
  {
    id: 'xm-stocking',
    zh: '袜袜',
    en: 'Cozy',
    group: 'deco',
    concept:
      '挂在壁炉边的红色圣诞袜，上面一圈毛茸茸的奶油色袜口，左上角一个金色挂环，脚跟和脚尖拼着绿色补丁。',
    motion: '挂在小环上前后荡秋千，荡到高处脚尖翘一下。',
    verdict: '靴子剪影加波浪袜口，24 像素也认得；脸在袜筒上，袜口和补丁都在脸外面。',
    paint: { fill: XM.red, back: XM.cream, leaf: XM.cream },
    face: [44, 52],
    body: () =>
      union(blend(9, box(44, 50, 18, 22, 6), ellipse(56, 77, 27, 13.5)), cuff(), hangLoop(27, 9, 6.5, 15)),
    parts: [
      ['leaf', cuff(), { c: XM.cream }],
      ['leaf', meet(circle(27, 81, 10), below(66)), { c: XM.pine, stitch: false }],
      ['leaf', circle(86, 80, 11), { c: XM.pine, stitch: false }],
      ['leaf', meet(ellipse(27, 11, 5.2, 5.6), above(15.5)), { c: XM.cream, free: true, stitch: false }],
      ['leaf', grow(hangLoop(27, 9, 6.5, 15), 0.3), { c: XM.gold, free: true, stitch: false }],
    ],
    sig: { motion: 'swing', pivot: [27, 6], fx: [] },
  },
  {
    id: 'xm-cane',
    zh: '拐拐',
    en: 'Hooky',
    group: 'treat',
    concept: '胖胖的红白拐杖糖，弯钩朝左，红条纹斜着一道道绕下去，脸长在弯钩顶上，那一段特意留白。',
    motion: '像拐杖一样往前一点地，点完弹回来站直。',
    verdict: '弯钩就是全部特征，24 像素一个红白问号；脸放在弯钩顶上最宽的那一段，条纹全部让开。',
    paint: { fill: XM.cream, back: XM.pine, leaf: XM.red },
    face: [42, 17],
    body: () => caneBody(),
    parts: caneStripes().map((zone) => ['leaf', zone, { c: XM.red, stitch: false }]),
    sig: { motion: 'tap', pivot: [62, 99], fx: [] },
  },
  {
    id: 'xm-globe',
    zh: '莹莹',
    en: 'Swirly',
    group: 'snow',
    concept: '木底座上的雪花玻璃球，球里是一小堆雪和一棵小松树，玻璃左上角一道反光，雪花在里面慢慢飘。',
    motion: '自己摇一摇，停下来以后球里的雪花慢慢落下去。',
    verdict: '圆球加梯形底座很好认；球里的小景只在大图里有，24 像素时只剩雪堆，一样看得出是雪景球。',
    paint: { fill: XM.ice, back: XM.pine, leaf: XM.cream },
    face: [46, 40],
    body: () =>
      blend(
        2,
        circle(50, 42, 31),
        poly(
          [
            [27, 70],
            [73, 70],
            [80, 92],
            [20, 92],
          ],
          3,
        ),
      ),
    parts: [
      [
        'leaf',
        meet(
          poly(
            [
              [27, 70],
              [73, 70],
              [80, 92],
              [20, 92],
            ],
            3.4,
          ),
          below(69.5),
        ),
        { c: XM.cocoa },
      ],
      ['leaf', box(50, 80, 30, 2.4), { c: XM.gold, stitch: false }],
      ['leaf', meet(circle(50, 42, 29), ellipse(50, 70, 30, 10.5)), { c: XM.cream }],
      [
        'leaf',
        poly(
          [
            [68, 48],
            [75.5, 61],
            [60.5, 61],
          ],
          1.4,
        ),
        { c: XM.pine, stitch: false, small: false },
      ],
      [
        'leaf',
        chain(
          [
            [27, 37],
            [29, 28.5],
            [34.5, 21],
          ],
          1.7,
        ),
        { c: XM.cream, stitch: false, small: false },
      ],
      ...[
        [30, 52, 1.3],
        [68, 30, 1.4],
        [62, 20, 1.1],
        [36, 60, 1.1],
      ].map(([x, y, r]) => ['leaf', circle(x, y, r), { c: XM.cream, stitch: false, small: false }]),
    ],
    sig: { motion: 'shake', pivot: [50, 92], fx: [{ kind: 'flakes', at: [50, 42], size: 56 }] },
  },
  {
    id: 'xm-santa',
    zh: '胡胡',
    en: 'Jolly',
    group: 'people',
    concept:
      '圆脸的圣诞老人式小人，红帽子往右耷拉、尖上一颗白绒球，雪白的帽檐和一大把卷卷的白胡子把脸框在中间。',
    motion: '「嗬嗬嗬」三下肚子笑：连着三次压扁弹起，再停一拍。',
    verdict: '和现有的人物一样是圆头加头发零件，只是头发换成了帽子和胡子；不画眼镜和腰带，保持通用。',
    paint: { fill: XM.peach, back: XM.pine, leaf: XM.cream },
    face: [50, 57],
    body: () => blend(3, ellipse(50, 56, 32, 31), santaHat(), circle(87, 35, 7), santaBeard()),
    parts: [
      [
        'leaf',
        union(
          grow(santaHat(), 0.3),
          poly([
            [60, 24],
            [82, 22],
            [88, 34],
            [62, 42],
          ]),
        ),
        { c: XM.red },
      ],
      ['leaf', grow(santaBeard(), 0.3), { c: XM.cream }],
      ['leaf', box(50, 41, 35, 6.4, 6.4), { c: XM.cream, free: true }],
      ['leaf', circle(87, 35, 7.3), { c: XM.cream, free: true, stitch: false }],
    ],
    sig: { motion: 'hoho', pivot: [50, 98], fx: [] },
  },
  {
    id: 'xm-cocoa',
    zh: '可可',
    en: 'Mocha',
    group: 'treat',
    concept: '松绿色的胖马克杯，满满一杯热可可，杯口探出两块棉花糖，杯底一道奶油色的边，热气一缕缕往上冒。',
    motion: '热气一缕缕扭着往上飘，杯子舒服得轻轻左右晃。',
    verdict: '杯把和棉花糖让剪影很像马克杯；热气是动起来才有的，小图里靠杯把认。',
    paint: { fill: XM.pine, back: XM.red, leaf: XM.cream },
    face: [45, 64],
    body: () => blend(3, box(45, 64, 26, 27, 8), mugHandle(), marshmallows()),
    parts: [
      ['leaf', ellipse(45, 40.5, 21.5, 4.6), { c: XM.cocoa, stitch: false }],
      ['leaf', grow(marshmallows(), 0.3), { c: XM.cream, stitch: false }],
      ['leaf', box(45, 83, 26.6, 2.6), { c: XM.cream, stitch: false }],
    ],
    sig: { motion: 'cosy', pivot: [45, 92], fx: [{ kind: 'steam', at: [45, 13], size: 40 }] },
  },
  {
    id: 'xm-bauble',
    zh: '挂挂',
    en: 'Bobble',
    group: 'deco',
    concept: '金色的圆玻璃球挂饰，顶上银色小帽里弯出一根挂钩，下半截一道弯弯的红带子，左上角一抹反光。',
    motion: '挂在钩子上来回摆，每摆一次身上的反光滑过去一下。',
    verdict:
      '圆球加小帽挂钩，剪影干净；弯带子顺着球面弯，小图里也有球的立体感。挂钩故意做成开口的，闭合的环会被底布填死。',
    paint: { fill: XM.gold, back: XM.red, leaf: XM.red },
    face: [50, 58],
    body: () => union(circle(50, 59, 31), box(50, 27, 9.5, 5.5, 1.8), baubleHook()),
    parts: [
      ['leaf', (x, y) => Math.abs(y - (78 - 0.008 * (x - 50) ** 2)) - 4.8, { c: XM.red }],
      [
        'leaf',
        (x, y) => Math.abs(y - (40 - 0.006 * (x - 50) ** 2)) - 1.5,
        { c: XM.red, stitch: false, small: false },
      ],
      ['leaf', box(50, 27, 10, 6, 1.8), { c: XM.ice, free: true, stitch: false }],
      ['leaf', grow(baubleHook(), 0.3), { c: XM.cocoa, free: true, stitch: false }],
      [
        'leaf',
        chain(
          [
            [28, 54],
            [30, 45],
            [36, 38],
          ],
          2,
        ),
        { c: XM.cream, stitch: false, small: false },
      ],
    ],
    sig: { motion: 'swing', pivot: [57, 7], fx: [{ kind: 'glint', at: [50, 59], size: 62 }] },
  },
];

/*
 * A hanging loop: an arch of cord round (cx, cy) whose legs run down to `foot`. Open at the bottom, so the felt
 * backing, which fills every hole, leaves the loop's eye showing.
 */
function hangLoop(cx, cy, r, foot) {
  return union(
    meet(shell(circle(cx, cy, r), 1.7), above(cy)),
    stroke(cx - r, cy, cx - r * 0.55, foot, 1.7),
    stroke(cx + r, cy, cx + r * 0.55, foot, 1.7),
  );
}

/** The bauble's wire hook: up out of the cap and curled over, an open curve with no eye for the backing to fill. */
function baubleHook() {
  return chain(
    [
      [50, 22],
      [50, 13],
      [53, 7.5],
      [59, 6.5],
      [63, 10],
      [62, 15],
    ],
    1.9,
  );
}

function tier(i) {
  return [
    poly(
      [
        [50, 12],
        [65, 33],
        [35, 33],
      ],
      5,
    ),
    poly(
      [
        [50, 24],
        [74, 51],
        [26, 51],
      ],
      5,
    ),
    poly(
      [
        [50, 37],
        [86, 82],
        [14, 82],
      ],
      6,
    ),
  ][i];
}
function treeTiers() {
  return union(tier(0), tier(1), tier(2));
}

function snowArms() {
  return union(
    chain(
      [
        [30, 72],
        [17, 61],
        [9, 53],
      ],
      2.3,
      1.6,
    ),
    stroke(17, 61, 13, 51, 1.6, 1.3),
    chain(
      [
        [70, 72],
        [83, 61],
        [91, 53],
      ],
      2.3,
      1.6,
    ),
    stroke(83, 61, 87, 51, 1.6, 1.3),
  );
}

function topHat() {
  return union(box(50, 22.5, 17, 2.8, 1.4), box(50, 13, 11, 9.5, 2));
}

function gingerBody() {
  return blend(
    5,
    circle(50, 29, 19.5),
    ellipse(50, 63, 17, 19),
    stroke(37, 53, 18, 44.5, 7, 6.6),
    stroke(63, 53, 82, 44.5, 7, 6.6),
    stroke(43, 75, 34, 92, 7.4, 7),
    stroke(57, 75, 66, 92, 7.4, 7),
  );
}

function deerEars() {
  return union(ellipse(19, 46, 9, 4.6, -32), ellipse(64, 38, 7.5, 4.2, 38));
}

function antlers() {
  return union(
    chain(
      [
        [35, 38],
        [30, 25],
        [24, 12],
      ],
      3.6,
      2.4,
    ),
    chain(
      [
        [31.5, 28],
        [23, 25],
        [16, 27],
      ],
      2.6,
      2,
    ),
    chain(
      [
        [51, 35],
        [56, 22],
        [63, 10],
      ],
      3.6,
      2.4,
    ),
    chain(
      [
        [55, 25],
        [63, 21],
        [70, 23],
      ],
      2.6,
      2,
    ),
  );
}

/** The stocking's cuff: a band with a fluffy, scalloped lower edge. */
function cuff() {
  return union(
    box(44, 23, 23, 8, 5),
    ...[24.5, 32.3, 40.1, 47.9, 55.7, 63.5].map((x) => circle(x, 30.5, 4.6)),
  );
}

/*
 * The cane's centre line: an arc round (cx, cy) from the hook's tip, over the top, down into a straight shaft.
 * Stations are [x, y, tangent angle] at even steps along it.
 */
function caneStations(step) {
  const { cx, cy, R, from, bottom } = CANE;
  const out = [];
  const arc = ((360 - from) * Math.PI * R) / 180;
  const total = arc + (bottom - cy);
  for (let s = 0; s <= total + 1e-6; s += step) {
    if (s <= arc) {
      const a = ((from + (s / arc) * (360 - from)) * Math.PI) / 180;
      out.push([cx + R * Math.cos(a), cy + R * Math.sin(a), (a * 180) / Math.PI + 90, s]);
    } else out.push([cx + R, cy + (s - arc), 90, s]);
  }
  return out;
}
function caneBody() {
  return chain(
    caneStations(4).map(([x, y]) => [x, y]),
    CANE.w,
  );
}
/** Slanted stripes at even steps, leaving the top of the crook, where the face is, clear. */
function caneStripes() {
  return caneStations(10.5)
    .filter(([x, y]) => !(y < 30 && x > 22 && x < 64))
    .map(([x, y, t]) => band(x, y, t + 90 + 32, CANE.w + 4, 3.2));
}

function santaHat() {
  return blend(
    4,
    meet(ellipse(50, 56, 33, 32), above(42)),
    chain(
      [
        [44, 30],
        [60, 15],
        [76, 16],
        [84, 26],
        [86, 32],
      ],
      12,
      5,
    ),
  );
}

function santaBeard() {
  return meet(
    union(
      ellipse(50, 79, 31, 19),
      circle(27, 84, 9.5),
      circle(38, 92, 9.5),
      circle(50, 95, 9.5),
      circle(62, 92, 9.5),
      circle(73, 84, 9.5),
      stroke(20, 45, 22, 72, 5.5),
      stroke(80, 45, 78, 72, 5.5),
    ),
    union(below(66), rightOf(70), (x) => x - 30),
  );
}

function mugHandle() {
  return meet(minus(ellipse(74, 62, 13, 15), ellipse(74, 62, 6, 8)), rightOf(66));
}

function marshmallows() {
  return union(rbox(36, 35, 6.6, 5.6, 2.2, -14), rbox(53, 33.5, 6, 5.4, 2.2, 12));
}

/*
 * Props on existing cast members. The member's outline and parts are kept; the prop is a set of free parts in
 * front of them, so the face, the motion and the felt edge all come along as usual.
 */

/** A Santa hat whose brim centres on (cx, by), scaled by s; m = -1 flops it to the left. */
function hatParts(cx, by, s, m = 1) {
  const X = (x) => cx + x * s * m;
  const Y = (y) => by + y * s;
  return [
    [
      'leaf',
      chain(
        [
          [X(0), Y(-3)],
          [X(5), Y(-15)],
          [X(14), Y(-23)],
          [X(24), Y(-21)],
        ],
        14 * s,
        3.2 * s,
      ),
      { c: XM.red },
    ],
    ['leaf', box(cx, by, 19 * s, 4.8 * s, 4.8 * s), { c: XM.cream }],
    ['leaf', circle(X(25), Y(-17), 5.4 * s), { c: XM.cream, stitch: false }],
  ];
}

/** A knit scarf round a neck at (cx, cy), hw wide, its tail hanging on the right. */
function scarfParts(cx, cy, hw, s = 1) {
  const tail = rbox(cx + hw * 0.55, cy + 10 * s, 4.6 * s, 10 * s, 2.4 * s, -10);
  return [
    ['leaf', union(ellipse(cx, cy, hw, 5.2 * s), tail), { c: XM.red }],
    [
      'leaf',
      union(
        rbox(cx + hw * 0.55 + 1.2 * s, cy + 13 * s, 4.7 * s, 1.3 * s, 0.5, -10),
        rbox(cx + hw * 0.55 + 1.9 * s, cy + 16.8 * s, 4.7 * s, 1.3 * s, 0.5, -10),
      ),
      { c: XM.cream, stitch: false },
    ],
  ];
}

/** An antler headband over a head whose crown is at (cx, top), r its radius. */
function antlerParts(cx, top, r, s = 1) {
  const side = (m) => {
    const X = (x) => cx + x * m * s;
    const Y = (y) => top + y * s;
    return union(
      chain(
        [
          [X(9), Y(2)],
          [X(13), Y(-10)],
          [X(20), Y(-20)],
        ],
        3 * s,
        2 * s,
      ),
      chain(
        [
          [X(13.5), Y(-9)],
          [X(21), Y(-11)],
          [X(26), Y(-8)],
        ],
        2.2 * s,
        1.7 * s,
      ),
    );
  };
  return [
    ['leaf', union(side(1), side(-1)), { c: XM.ginger, stitch: false }],
    [
      'leaf',
      meet(shell(circle(cx, top + r, r + 1), 2 * s), above(top + r * 0.55)),
      { c: XM.red, stitch: false },
    ],
  ];
}

/** Earmuffs: a band over the crown and two fluffy cups at (cx ± hw, cy). */
function earmuffParts(cx, cy, hw, top, s = 1) {
  const r = (cy - top) * 0.5 + (hw * hw) / (2 * (cy - top));
  return [
    ['leaf', meet(shell(circle(cx, top + r, r), 1.9 * s), above(cy)), { c: XM.red, stitch: false }],
    ['leaf', circle(cx - hw, cy, 8.5 * s), { c: XM.cream }],
    ['leaf', circle(cx + hw, cy, 8.5 * s), { c: XM.cream }],
  ];
}

/** A holly sprig at (cx, cy): two pointed leaves and three berries. */
function hollyParts(cx, cy, s = 1, deg = 0) {
  const leaf = (dx, dy, rot) => {
    const a = ((rot + deg) * Math.PI) / 180;
    const ox = cx + (dx * Math.cos((deg * Math.PI) / 180) - dy * Math.sin((deg * Math.PI) / 180)) * s;
    const oy = cy + (dx * Math.sin((deg * Math.PI) / 180) + dy * Math.cos((deg * Math.PI) / 180)) * s;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = -1 + i / 3;
      const w = (1 - t * t) * 4.6 * s * (i % 2 ? 1.25 : 0.82);
      pts.push([ox + ux * t * 10 * s - uy * w, oy + uy * t * 10 * s + ux * w]);
    }
    for (let i = 5; i >= 1; i--) {
      const t = -1 + i / 3;
      const w = (1 - t * t) * 4.6 * s * (i % 2 ? 1.25 : 0.82);
      pts.push([ox + ux * t * 10 * s + uy * w, oy + uy * t * 10 * s - ux * w]);
    }
    return poly(pts, 0.8 * s);
  };
  return [
    ['leaf', union(leaf(-9, 0, -20), leaf(9, 0, 20)), { c: XM.pine, stitch: false }],
    [
      'leaf',
      union(
        circle(cx - 2.8 * s, cy - 2.6 * s, 3 * s),
        circle(cx + 2.8 * s, cy - 2.6 * s, 3 * s),
        circle(cx, cy + 1.6 * s, 3 * s),
      ),
      { c: XM.red, stitch: false },
    ],
  ];
}

/** A mitten whose palm centres on (cx, cy), thumb towards m. */
function mittenParts(cx, cy, s = 1, m = 1, deg = 0) {
  return [
    [
      'leaf',
      union(
        rbox(cx, cy, 6.4 * s, 7.4 * s, 6 * s, deg),
        ellipse(cx + 6.2 * s * m, cy + 0.5 * s, 2.8 * s, 4 * s, 25 * m + deg),
      ),
      { c: XM.red, stitch: false },
    ],
    [
      'leaf',
      rbox(
        cx - Math.sin((deg * Math.PI) / 180) * 7.5 * s,
        cy + Math.cos((deg * Math.PI) / 180) * 7.5 * s,
        6.8 * s,
        2.6 * s,
        2.2 * s,
        deg,
      ),
      { c: XM.cream, stitch: false },
    ],
  ];
}

const COMBOS = [
  {
    id: 'xm-mochi-hat',
    base: 'mochi',
    member: 'mochi',
    zh: '糯糯',
    prop: '圣诞帽',
    concept: '糯糯戴一顶往右耷拉的圣诞帽，白绒球垂在耳边。',
    verdict: '最标准的一套：帽子比头小一圈，帽尖往外甩，剪影还是糯糯。',
    paint: { fill: XM.cream, back: XM.red, leaf: XM.red },
    at: [50, 61],
    s: 0.76,
    props: () => hatParts(48, 38, 1.02),
  },
  {
    id: 'xm-chirp-hat',
    base: 'chick',
    member: 'chirp',
    zh: '啾啾',
    prop: '大号圣诞帽',
    concept: '小鸡啾啾钻进一顶大一号的圣诞帽，帽檐压到眉毛，绒球垂到肩膀。',
    verdict: '帽子故意大一号，小个子戴大帽子的可爱感就出来了；头顶那撮毛被帽子盖住，所以去掉了。',
    paint: { fill: XM.gold, back: XM.red, leaf: XM.ginger },
    at: [50, 63],
    s: 0.74,
    drop: [0, 1],
    props: () => hatParts(48, 39, 1.2),
  },
  {
    id: 'xm-waddle-scarf',
    base: 'penguin',
    member: 'waddle',
    zh: '摇摇',
    prop: '针织围巾',
    concept: '企鹅摇摇围一条红围巾，尾巴搭在肚子一侧，末端两道奶油色针织条纹。',
    verdict: '企鹅本来就是雪地角色，加一条围巾就过上了圣诞；围巾压在脖子位置，不碰脸。',
    paint: { fill: XM.ink, back: XM.ice, leaf: XM.gold },
    at: [50, 50],
    s: 0.8,
    tint: { 2: XM.cream },
    plain: [2],
    props: () => scarfParts(50, 64, 26),
  },
  {
    id: 'xm-miso-antlers',
    base: 'cat',
    member: 'miso',
    zh: '喵喵',
    prop: '鹿角发箍',
    concept: '喵喵戴上一副姜黄色鹿角发箍，红色发箍从两只耳朵中间绕过去。',
    verdict: '猫耳加鹿角，剪影一下变得很热闹；鹿角比耳朵高，小图里先认出的是鹿角。',
    paint: { fill: XM.ginger, back: XM.cream, leaf: XM.red },
    at: [50, 60],
    s: 0.76,
    props: () => antlerParts(50, 31, 26),
  },
  {
    id: 'xm-kiki-muffs',
    base: 'bob',
    member: 'kiki',
    zh: '琪琪',
    prop: '耳罩',
    concept: '波波头琪琪戴一副奶油色毛绒耳罩，红色头梁压在可可色的头发上面。',
    verdict: '耳罩的两团绒球正好落在发梢外侧，加宽了剪影但不挡脸。',
    paint: { fill: XM.peach, back: XM.pine, leaf: XM.red },
    at: [50, 54],
    s: 0.8,
    tint: { 0: XM.cocoa },
    plain: [0],
    props: () => earmuffParts(50, 57, 32, 21, 0.9),
  },
  {
    id: 'xm-pokey-mittens',
    base: 'cactus',
    member: 'pokey',
    zh: '刺刺',
    prop: '连指手套',
    concept: '仙人掌刺刺的两只圆胳膊套上红色连指手套，手套口一圈奶油色毛边，终于可以放心抱抱了。',
    verdict: '手套刚好套在原来的圆胳膊上，故事感最强；手套小，24 像素只剩两个红点。',
    paint: { fill: XM.pine, back: XM.cream, leaf: XM.red },
    at: [50, 52],
    s: 0.84,
    props: () => [...mittenParts(19, 36, 1, -1, -8), ...mittenParts(81, 36, 1, 1, 8)],
  },
  {
    id: 'xm-pud-holly',
    base: 'pudding',
    member: 'pud',
    zh: '布布',
    prop: '冬青枝',
    concept: '布布变成圣诞布丁：可可色的身子，顶上一层奶油色淋酱，插一枝冬青和三颗红果。',
    verdict: '只换颜色、把薄荷叶换成冬青，布丁就成了圣诞布丁；冬青的红果在小图里很显眼。',
    paint: { fill: XM.cocoa, back: XM.cream, leaf: XM.cream },
    at: [50, 58],
    s: 0.8,
    drop: [1],
    tint: { 0: XM.cream },
    plain: [0],
    props: () => hollyParts(52, 22, 1),
  },
  {
    id: 'xm-chime-holly',
    base: 'bell',
    member: 'chime',
    zh: '叮叮',
    prop: '冬青枝',
    concept: '叮叮换成金色的圣诞铃铛，顶上系一枝冬青。',
    verdict: '铃铛本来就是圣诞符号，配色一换、冬青一插就到位了；冬青压在铃顶，不挡脸。',
    paint: { fill: XM.gold, back: XM.red, leaf: XM.cocoa },
    at: [50, 57],
    s: 0.8,
    props: () => hollyParts(50, 19, 0.95),
  },
];

/** The sheet's colours: the palette's where it matches the sheet, the theme's own swatches where it does not. */
const COLORS = {
  [XM.red]: 'crimson',
  [XM.pine]: 'pine',
  [XM.cream]: 'snow',
  [XM.gold]: 'yellow',
  [XM.ice]: 'sky',
  [XM.cocoa]: 'cocoa',
  [XM.ginger]: 'brown',
  [XM.peach]: 'peach',
  [XM.ink]: 'night',
};

/** Each member in a line of English, beside the lab's own Chinese `concept`. */
const DESC = {
  'xm-tree': 'A little three-tier spruce under a gold star, hung with red, gold and ice-blue baubles.',
  'xm-snowman': 'Two stacked snowballs in a little top hat and a red scarf, twig arms raised.',
  'xm-ginger': 'A fresh gingerbread friend with icing zigzags at wrist and ankle and three gumdrop buttons.',
  'xm-deer': 'A little reindeer in profile, forked antlers on top and a round red nose on its muzzle.',
  'xm-stocking': 'A red stocking by the fireplace with a fluffy cream cuff, a gold loop and green patches.',
  'xm-cane': 'A plump candy cane hooked to the left, red stripes winding down, its face on the crook.',
  'xm-globe': 'A snow globe on a wooden base, a little pine and a drift of snow inside.',
  'xm-santa': 'A round-faced little Santa under a floppy red hat, framed by a big curly white beard.',
  'xm-cocoa': 'A plump green mug full of hot cocoa, two marshmallows poking out of the top.',
  'xm-bauble': 'A gold glass bauble with a little cap and hook, a curved red band across it.',
};

/** Each combination's English name and line. */
const COMBO_EN = {
  'xm-mochi-hat': [
    'Santa Hat Mochi',
    'Mochi in a Santa hat that flops to the right, its white pompom by the ear.',
  ],
  'xm-chirp-hat': [
    'Big Hat Chirp',
    'Chirp tucked into a Santa hat one size too big, the brim down to its brows.',
  ],
  'xm-waddle-scarf': [
    'Knit Scarf Waddle',
    'Waddle in a red scarf whose tail hangs over its belly with two cream stripes.',
  ],
  'xm-miso-antlers': ['Antler Miso', 'Miso in a ginger antler headband, the red band between its ears.'],
  'xm-kiki-muffs': ['Earmuff Kiki', 'Kiki in fluffy cream earmuffs on a red band over her cocoa hair.'],
  'xm-pokey-mittens': ['Mitten Pokey', 'Pokey with red mittens on both round arms, safe to hug at last.'],
  'xm-pud-holly': [
    'Holly Pud',
    'Pud as a Christmas pudding: cocoa body, a cream drizzle and a sprig of holly.',
  ],
  'xm-chime-holly': ['Holly Chime', 'Chime as a gold Christmas bell with a sprig of holly tied on top.'],
};

/** The sheet's `small: false`, a part its small-size twin left out under 48 px, as the engine's `fine`. */
const fine = (parts) =>
  parts.map(([tone, zone, options]) =>
    options?.small === false ? [tone, zone, { ...options, fine: true }] : [tone, zone, options],
  );

/** The sheet's effects that stream from the whole figure, as the theme's emitter motions. */
const EMITTERS = { snow: 'snow', flakes: 'flakes', steam: 'steam' };

/**
 * A character's signature (`sig`) as the motions its whole figure names: the motion about its pivot, then the
 * streams drawn round it. The star's twinkle and the nose's glow are the parts' own (`move`).
 */
const signature = ({ motion, fx }) => [motion, ...fx.map(({ kind }) => EMITTERS[kind]).filter(Boolean)];

export const CHRISTMAS_SOURCE = labTheme(
  CHRISTMAS.map((art) => ({
    ...art,
    motion: signature(art.sig),
    pivot: art.sig.pivot,
    parts: fine(art.parts),
    desc: DESC[art.id],
  })),
  COMBOS.map((combo) => ({ ...combo, en: COMBO_EN[combo.id][0], desc: COMBO_EN[combo.id][1] })),
  COLORS,
  {},
  { motions: true },
);
