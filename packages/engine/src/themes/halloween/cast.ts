import type { ThemeCastMember } from '../../core/cast.js';

/** The Halloween theme's own members, one per character it draws, in roster order. */
export const CAST: readonly ThemeCastMember[] = [
  {
    id: 'floaty',
    name: { en: 'Floaty', zh: '飘飘' },
    desc: {
      en: 'A little ghost holding a lollipop, waving both hands hello, its hem three round waves and its tail flicking right.',
      zh: '举着棒棒糖的小幽灵，两只小手一扬就是「嘿」，裙摆三个圆波浪，尾巴往右甩。',
    },
    shape: 'spook',
    color: 'cream',
  },
  {
    id: 'gourdy',
    name: { en: 'Gourdy', zh: '南南' },
    desc: {
      en: 'A plump three-lobed pumpkin with a green stem and a curling vine, its creases showing only at the top and bottom to leave room for the face.',
      zh: '三瓣胖南瓜，绿梗旁边卷着一根藤，瓣缝只在头顶和底下露一点，把脸让出来。',
    },
    shape: 'pumpkin',
    color: 'orange',
  },
  {
    id: 'coal',
    name: { en: 'Coal', zh: '煤球' },
    desc: {
      en: 'A round little black cat with pointed ears and a tail standing up behind it, hooked out at the tip.',
      zh: '圆滚滚的小黑猫，尖耳朵，尾巴在身后竖起来，尖上往外一勾。',
    },
    shape: 'nightcat',
    color: 'night',
  },
  {
    id: 'flitter',
    name: { en: 'Flitter', zh: '蝠蝠' },
    desc: {
      en: 'A round little bat with scalloped wings and pointed ears, flapping twice whenever it tires of hanging.',
      zh: '圆身子的小蝙蝠，翅膀下缘是一串圆弧，耳朵尖尖，倒挂累了就扑扇两下。',
    },
    shape: 'batling',
    color: 'violet',
  },
  {
    id: 'bubbles',
    name: { en: 'Bubbles', zh: '咕咕' },
    desc: {
      en: 'A squat cauldron brimming with green brew, two drips running down and bubbles drifting by.',
      zh: '矮胖的魔法锅，锅沿冒出一团荧光绿的魔药，往外淌了两滴，旁边飘着泡泡。',
    },
    shape: 'cauldron',
    color: 'night',
  },
  {
    id: 'hatty',
    name: { en: 'Hatty', zh: '帽帽' },
    desc: {
      en: 'A green jelly in a crooked witch hat, its tip folded over and its brim pulled low.',
      zh: '戴着歪尖巫师帽的绿软糖，帽尖往右折了一下，帽檐压得低低的。',
    },
    shape: 'witch',
    color: 'green',
  },
  {
    id: 'twisty',
    name: { en: 'Twisty', zh: '橘橘' },
    desc: {
      en: 'An orange sweet in a twisted wrapper, both violet ends pleated into little fans, dotted with a few pale spots.',
      zh: '扭结包装的橘子糖，两头紫色糖纸褶成小扇子，身上点着几颗浅色圆点。',
    },
    shape: 'toffee',
    color: 'orange',
  },
  {
    id: 'creaky',
    name: { en: 'Creaky', zh: '屋屋' },
    desc: {
      en: 'A crooked little haunted house with a slanted roof and a tower whose window glows warm.',
      zh: '歪歪扭扭的小鬼屋，屋顶斜着，旁边一座小尖塔，塔窗亮着暖黄的灯。',
    },
    shape: 'manor',
    color: 'night',
  },
  {
    id: 'wisp',
    name: { en: 'Wisp', zh: '溜溜' },
    desc: {
      en: 'A little ghost trailing a long tail that curls behind it like a comet, drifting like a breeze.',
      zh: '拖着长尾巴的小幽灵，身子越往下越细，绕到身后卷成一个彗星似的小钩，飘起来像一阵风。',
    },
    shape: 'wisp',
    color: 'lilac',
  },
  {
    id: 'knotty',
    name: { en: 'Knotty', zh: '枝枝' },
    desc: {
      en: 'A bare old tree with crooked branches up top, its trunk thickening downwards and its face where the roots swell.',
      zh: '一棵掉光叶子的老树，上面是弯弯扭扭的枯枝，树干往下越来越粗，脸长在树根鼓起来的地方。',
    },
    shape: 'deadtree',
    color: 'brown',
  },
  {
    id: 'patch',
    name: { en: 'Patch', zh: '稻稻' },
    desc: {
      en: 'A small scarecrow in a straw hat with a burlap head, a crossbar for arms, straw poking out at both ends and under the brim, and a patch sewn on its shirt.',
      zh: '戴草帽的小稻草人，麻布脑袋，一根横木当手臂，两头和帽檐下都支棱着稻草，衣服上缝着一块补丁。',
    },
    shape: 'scarecrow',
    color: 'cream',
  },
  {
    id: 'resty',
    name: { en: 'Resty', zh: '安安' },
    desc: {
      en: 'A round-topped little headstone with an arch carved round its face, on a tuft of grass, dozing by day and lively by night.',
      zh: '圆顶的小墓碑，碑面刻着一道拱形的边，脚下一小堆草，白天打瞌睡，晚上才精神。',
    },
    shape: 'tombstone',
    color: 'lilac',
  },
  {
    id: 'corny',
    name: { en: 'Corny', zh: '甜甜' },
    desc: {
      en: 'A chubby candy corn in three bands, its face on the wide middle one.',
      zh: '一颗胖乎乎的玉米糖，三段颜色，脸长在中间最宽的那一段。',
    },
    shape: 'candycorn',
    color: 'orange',
  },
  {
    id: 'wraps',
    name: { en: 'Wraps', zh: '绷绷' },
    desc: {
      en: 'A round little mummy in bandages that leave the face clear, one loose end fluttering behind.',
      zh: '裹着绷带的圆滚滚小木乃伊，脸那一圈特意空出来，一截松掉的绷带头在脑后飘。',
    },
    shape: 'mummy',
    color: 'cream',
  },
  {
    id: 'rattle',
    name: { en: 'Rattle', zh: '骨骨' },
    desc: {
      en: 'A round little skull with a square chin and a pink bow, clattering when it laughs.',
      zh: '圆脑壳的小骷髅头，下巴收成一个小方块，头顶别着一只粉色蝴蝶结，笑起来咔哒咔哒响。',
    },
    shape: 'skull',
    color: 'cream',
  },
  {
    id: 'dangle',
    name: { en: 'Dangle', zh: '丝丝' },
    desc: {
      en: 'A little spider hanging on a thread, three short curled legs a side, swaying to say hello.',
      zh: '吊在一根丝上的小蜘蛛，圆身子两边各三条短短的弯腿，晃来晃去地打招呼。',
    },
    shape: 'spider',
    color: 'night',
  },
  {
    id: 'hoot',
    name: { en: 'Hoot', zh: '呼呼' },
    desc: {
      en: 'A round little owl with two ear tufts, folded wings, a pale belly and orange feet.',
      zh: '圆鼓鼓的小猫头鹰，两撮尖耳羽，翅膀收在两边，肚子一块浅色，橙色的小脚爪。',
    },
    shape: 'owl',
    color: 'brown',
  },
  {
    id: 'pail',
    name: { en: 'Pail', zh: '桶桶' },
    desc: {
      en: 'A trick-or-treat pumpkin pail with a pale rim, a lollipop and a sweet peeking out.',
      zh: '讨糖用的南瓜小桶，桶沿浅一圈，桶口探出一根棒棒糖和一颗紫色的糖。',
    },
    shape: 'pail',
    color: 'orange',
  },
  {
    id: 'wick',
    name: { en: 'Wick', zh: '蜡蜡' },
    desc: {
      en: 'A pink little candle with a warm flame, pale wax dripping down, standing on a saucer.',
      zh: '粉色的小蜡烛，顶上一簇暖黄火苗，浅色的蜡油从顶上淌下来几道，站在一只小碟子上。',
    },
    shape: 'candle',
    color: 'pink',
  },
  {
    id: 'cape',
    name: { en: 'Cape', zh: '斗斗' },
    desc: {
      en: 'A round little cyan creature in a high-collared violet cape, a pointed peak of hair on its brow, its collar always turned up for a night out.',
      zh: '披着紫色高领斗篷的青色小圆怪，额前一个尖尖的美人尖，晚上出门总要把领子竖起来。',
    },
    shape: 'vampire',
    color: 'cyan',
  },
  {
    id: 'witchmochi',
    name: { en: 'Witch Hat Mochi', zh: '巫师帽糯糯' },
    desc: {
      en: 'Mochi borrowing Hatty’s witch hat: a cream body under a violet hat.',
      zh: '糯糯借了帽帽的巫师帽，奶油白的身子配紫帽子。',
    },
    shape: 'witchmochi',
    color: 'cream',
  },
  {
    id: 'lanternmiso',
    name: { en: 'Lantern Miso', zh: '南瓜灯喵喵' },
    desc: {
      en: 'Miso with a little glowing pumpkin lantern at its feet.',
      zh: '喵喵的脚边放着一盏亮着的小南瓜灯。',
    },
    shape: 'lanterncat',
    color: 'night',
  },
  {
    id: 'nightcapluna',
    name: { en: 'Nightcap Luna', zh: '睡帽露娜' },
    desc: {
      en: 'Luna in a floppy violet nightcap whose tip droops behind, a creamy pompom at the end.',
      zh: '露娜戴上一顶软塌塌的紫色睡帽，帽尖垂到背后，挂着一颗奶黄色的绒球。',
    },
    shape: 'nightcapmoon',
    color: 'yellow',
  },
];
