import { getSwatchHex } from './palette.js';
import type { ColorId, FaceStyle, NoseId, ShapeId } from './types.js';

/**
 * A named character: a shape, a palette colour and a little personality.
 *
 * Presets are a convenience layer over the primitives, not a new axis. Every
 * member is reproducible from `{ shape, color }` alone; the name and blurb
 * exist so a product can offer "pick a character" instead of "pick a shape
 * and a colour", and so the documentation has something to call them.
 *
 * The roster is one-to-one with `SHAPE_IDS`: every body has exactly one name,
 * in the same family order as the catalogue. A missing body is a bug.
 * `castMember` returns `null` for an unknown id, so a stored preference can go
 * stale safely.
 */
export interface CharacterPreset {
  id: CastId;
  name: { en: string; zh: string };
  desc: { en: string; zh: string };
  shape: ShapeId;
  color: ColorId;
  /**
   * The chip hex for `color`. Kept as a field so a host with its own palette
   * can still paint a swatch without importing ours.
   */
  accent: string;
  /**
   * Face style and nose, for presets designed as line faces. No shipped
   * member sets these — the cast keeps the default face — but a host's own
   * presets can, and the pickers honour them.
   */
  face?: FaceStyle;
  nose?: NoseId;
}

const ink = (color: ColorId): string => getSwatchHex(color);

export const CAST_IDS = [
  'mochi',
  'dot',
  'pip',
  'byte',
  'momo',
  'bao',
  'teal',
  'tato',
  'hexa',
  'tri',
  'gemma',
  'nimbo',
  'dew',
  'leafy',
  'bloom',
  'lucky',
  'sprout',
  'shroom',
  'oak',
  'pokey',
  'nashi',
  'pomme',
  'berry',
  'cheri',
  'twinkle',
  'luv',
  'ember',
  'chime',
  'jelly',
  'beep',
  'luna',
  'boba',
  'finn',
  'inky',
  'miso',
  'hop',
  'bruno',
  'chirp',
  'waddle',
  'oink',
  'rusty',
  'kiki',
  'maru',
  'zip',
  'fuzz',
  'lulu',
] as const;

export type CastId = (typeof CAST_IDS)[number];

/**
 * The named characters, one per body, in catalogue order.
 */
export const CAST: readonly CharacterPreset[] = [
  {
    id: 'mochi',
    name: { en: 'Mochi', zh: '糯糯' },
    desc: {
      en: 'A soft rice cake with a flat seat and a round head — the default friend.',
      zh: '软软的小年糕，底是平的，头是圆的，是最先认识的那个朋友。',
    },
    shape: 'mochi',
    color: 'blue',
    accent: ink('blue'),
  },
  {
    id: 'dot',
    name: { en: 'Dot', zh: '圆圆' },
    desc: {
      en: 'A plain orange circle, the shape every face was first drawn on.',
      zh: '一枚纯粹的橙色圆，所有笑脸最早就画在它身上。',
    },
    shape: 'circle',
    color: 'orange',
    accent: ink('orange'),
  },
  {
    id: 'pip',
    name: { en: 'Pip', zh: '团团' },
    desc: {
      en: 'A soft cyan blob that never quite sits still.',
      zh: '一坨青蓝软团，从来坐不老实。',
    },
    shape: 'blob',
    color: 'cyan',
    accent: ink('cyan'),
  },
  {
    id: 'byte',
    name: { en: 'Byte', zh: '比特' },
    desc: {
      en: 'A pebble-round little shell in calm device violet.',
      zh: '圆石小方壳，浑身是安静的器件紫。',
    },
    shape: 'pebble',
    color: 'violet',
    accent: ink('violet'),
  },
  {
    id: 'momo',
    name: { en: 'Momo', zh: '桃桃' },
    desc: {
      en: 'A peach-pink egg, pointy on top and plump below — the steadiest sitter of the family.',
      zh: '蜜桃粉的小蛋蛋，上尖下鼓，坐得比谁都稳。',
    },
    shape: 'egg',
    color: 'red',
    accent: ink('red'),
  },
  {
    id: 'bao',
    name: { en: 'Bao', zh: '包包' },
    desc: {
      en: 'A warm little bun with a knot on top.',
      zh: '奶黄小馒头，头顶一个小揪揪，热乎乎的。',
    },
    shape: 'bun',
    color: 'yellow',
    accent: ink('yellow'),
  },
  {
    id: 'teal',
    name: { en: 'Teal', zh: '青青' },
    desc: {
      en: 'A lake-teal block of tofu: square without corners, round without slouching.',
      zh: '湖水青的小豆腐块，方而不楞，圆而不塌。',
    },
    shape: 'tofu',
    color: 'cyan',
    accent: ink('cyan'),
  },
  {
    id: 'tato',
    name: { en: 'Tato', zh: '薯薯' },
    desc: {
      en: 'A pill on its side: round caps, a straight middle, and zero ability to sit still.',
      zh: '躺平的小胶囊，两端圆帽中间直腰，一刻也坐不住。',
    },
    shape: 'pill',
    color: 'red',
    accent: ink('red'),
  },
  {
    id: 'hexa',
    name: { en: 'Hexa', zh: '六六' },
    desc: {
      en: 'A rounded hexagon in lake teal, every corner worn soft.',
      zh: '湖青圆角六边形，每个角都被磨软了。',
    },
    shape: 'hex',
    color: 'cyan',
    accent: ink('cyan'),
  },
  {
    id: 'tri',
    name: { en: 'Tri', zh: '尖尖' },
    desc: {
      en: 'A rice ball of a triangle that hops sharp and lands steady.',
      zh: '圆角小饭团三角，蹦得利落落得稳，浑身都是冲劲。',
    },
    shape: 'onigiri',
    color: 'magenta',
    accent: ink('magenta'),
  },
  {
    id: 'gemma',
    name: { en: 'Gemma', zh: '晶晶' },
    desc: {
      en: 'A soft-cut gem with a pale crown and every corner rounded.',
      zh: '软切面小宝石，头顶一层浅色冠面，每个角都是圆的。',
    },
    shape: 'gem',
    color: 'cyan',
    accent: ink('cyan'),
  },
  {
    id: 'nimbo',
    name: { en: 'Nimbo', zh: '云宝' },
    desc: {
      en: 'A puffy scallop-edged cloud that drifts half a beat behind the world.',
      zh: '雾蓝薰衣草色的蓬松云朵，波浪扇贝边，总比世界慢半拍。',
    },
    shape: 'cloud',
    color: 'blue',
    accent: ink('blue'),
  },
  {
    id: 'dew',
    name: { en: 'Dew', zh: '滴滴' },
    desc: {
      en: 'A sky-blue droplet that lands without ever losing its plump shine.',
      zh: '晴空蓝的小水滴，落地也不散，永远饱满欲滴。',
    },
    shape: 'drop',
    color: 'blue',
    accent: ink('blue'),
  },
  {
    id: 'leafy',
    name: { en: 'Leafy', zh: '叶叶' },
    desc: {
      en: 'A tilted leaf with a little stem, as if it just decided to unfurl.',
      zh: '一片斜着的小叶子，带一截小梗，像刚决定要舒展开。',
    },
    shape: 'leaf',
    color: 'green',
    accent: ink('green'),
  },
  {
    id: 'bloom',
    name: { en: 'Bloom', zh: '仙仙' },
    desc: {
      en: 'A rose flower with soft scalloped petals and a calm face in the middle.',
      zh: '霞粉小花，花瓣一圈软软的，花心里是一张安静的脸。',
    },
    shape: 'flower',
    color: 'magenta',
    accent: ink('magenta'),
  },
  {
    id: 'lucky',
    name: { en: 'Lucky', zh: '幸幸' },
    desc: {
      en: 'Four plump leaves and a calm face in the middle, good luck without the fuss.',
      zh: '四片圆鼓鼓的叶，中间一张安静的脸，好运不吵不闹。',
    },
    shape: 'clover',
    color: 'green',
    accent: ink('green'),
  },
  {
    id: 'sprout',
    name: { en: 'Sprout', zh: '芽芽' },
    desc: {
      en: 'A round little seed with two leaves, as if it just decided to grow.',
      zh: '顶着两片嫩叶的小圆籽，像刚决定要长出来。',
    },
    shape: 'sprout',
    color: 'green',
    accent: ink('green'),
  },
  {
    id: 'shroom',
    name: { en: 'Shroom', zh: '菇菇' },
    desc: {
      en: 'A red-capped mushroom with three pale spots and a thick stalk.',
      zh: '红帽小蘑菇，帽子上三颗浅色斑点，柄又粗又稳。',
    },
    shape: 'mushroom',
    color: 'red',
    accent: ink('red'),
  },
  {
    id: 'oak',
    name: { en: 'Oak', zh: '橡橡' },
    desc: {
      en: 'A brown acorn in a cap one size too big, hoarding small secrets.',
      zh: '戴着大一号帽子的棕色小橡果，悄悄囤着小秘密。',
    },
    shape: 'acorn',
    color: 'brown',
    accent: ink('brown'),
  },
  {
    id: 'pokey',
    name: { en: 'Pokey', zh: '刺刺' },
    desc: {
      en: 'A round-armed cactus that hugs from a polite distance.',
      zh: '两只圆胳膊的小仙人掌，隔着一点点距离抱抱你。',
    },
    shape: 'cactus',
    color: 'green',
    accent: ink('green'),
  },
  {
    id: 'nashi',
    name: { en: 'Nashi', zh: '梨梨' },
    desc: {
      en: 'A plump little pear with a leaf on its stem, round at the top and wide at the seat.',
      zh: '头顶一片小叶的圆胖小梨，上圆下宽，坐得稳稳的。',
    },
    shape: 'pear',
    color: 'yellow',
    accent: ink('yellow'),
  },
  {
    id: 'pomme',
    name: { en: 'Pomme', zh: '苹苹' },
    desc: {
      en: 'A green apple with a deep dimple and one leaf, crisp even when it is sad.',
      zh: '凹着一个小窝、顶着一片叶子的青苹果，难过的时候也脆脆的。',
    },
    shape: 'apple',
    color: 'green',
    accent: ink('green'),
  },
  {
    id: 'berry',
    name: { en: 'Berry', zh: '莓莓' },
    desc: {
      en: 'A red strawberry in a green crown and a face full of freckles, sweet with a little sour.',
      zh: '戴着绿王冠、满脸小雀斑的红草莓，甜里带一点点酸。',
    },
    shape: 'strawberry',
    color: 'red',
    accent: ink('red'),
  },
  {
    id: 'cheri',
    name: { en: 'Cheri', zh: '樱樱' },
    desc: {
      en: 'Two cherries on one stalk; the big one does the talking.',
      zh: '一根梗上挂着两颗樱桃，说话的总是大的那颗。',
    },
    shape: 'cherry',
    color: 'magenta',
    accent: ink('magenta'),
  },
  {
    id: 'twinkle',
    name: { en: 'Twinkle', zh: '亮亮' },
    desc: {
      en: 'A soft five-point star, round-tipped and glowing gold.',
      zh: '圆尖软五角星，边上没有波浪，金黄得发亮。',
    },
    shape: 'star',
    color: 'yellow',
    accent: ink('yellow'),
  },
  {
    id: 'luv',
    name: { en: 'Luv', zh: '心心' },
    desc: {
      en: 'A plump red heart that wears its feelings in the middle of its face.',
      zh: '圆鼓鼓的小红心，心事都写在脸上。',
    },
    shape: 'heart',
    color: 'red',
    accent: ink('red'),
  },
  {
    id: 'ember',
    name: { en: 'Ember', zh: '焰焰' },
    desc: {
      en: 'A little flame leaning sideways, tip flicking in the breeze.',
      zh: '一苗侧倾的小火苗，尖顶轻轻甩。',
    },
    shape: 'flame',
    color: 'orange',
    accent: ink('orange'),
  },
  {
    id: 'chime',
    name: { en: 'Chime', zh: '叮叮' },
    desc: {
      en: 'A violet bell with a round clapper, swaying one beat before it rings.',
      zh: '紫色小铃铛，底下一颗圆圆的铃舌，响之前先晃一晃。',
    },
    shape: 'bell',
    color: 'violet',
    accent: ink('violet'),
  },
  {
    id: 'jelly',
    name: { en: 'Jelly', zh: '水灵' },
    desc: {
      en: 'A minimalist apricot ghost that drifts along, always unhurried.',
      zh: '杏橙色的简约小幽灵，慢悠悠地漂。',
    },
    shape: 'ghost',
    color: 'orange',
    accent: ink('orange'),
  },
  {
    id: 'beep',
    name: { en: 'Beep', zh: '哔哔' },
    desc: {
      en: 'A cyan little robot with a bobbing antenna and a rounded-square head.',
      zh: '青蓝小机器人，方圆的脑袋，天线一晃一晃。',
    },
    shape: 'bot',
    color: 'cyan',
    accent: ink('cyan'),
  },
  {
    id: 'luna',
    name: { en: 'Luna', zh: '露娜' },
    desc: {
      en: 'A plump crescent, forever on the edge of sleep.',
      zh: '圆鼓鼓的小月牙，安安静静地弯着，永远想睡觉。',
    },
    shape: 'crescent',
    color: 'yellow',
    accent: ink('yellow'),
  },
  {
    id: 'boba',
    name: { en: 'Boba', zh: '波波' },
    desc: {
      en: 'A brown milk tea with three pearls at the bottom and a straw pointing at the sky.',
      zh: '棕色的珍珠奶茶，杯底三颗珍珠，吸管直指天空。',
    },
    shape: 'boba',
    color: 'brown',
    accent: ink('brown'),
  },
  {
    id: 'finn',
    name: { en: 'Finn', zh: '鱼鱼' },
    desc: {
      en: 'A round cyan fish with a big forked tail, swimming in place.',
      zh: '圆滚滚的青色小鱼，尾巴大大分叉，原地也能游起来。',
    },
    shape: 'fish',
    color: 'cyan',
    accent: ink('cyan'),
  },
  {
    id: 'inky',
    name: { en: 'Inky', zh: '墨墨' },
    desc: {
      en: 'A violet octopus with four fat legs that never agree on a direction.',
      zh: '紫色的小章鱼，四条胖腿，从来对不上方向。',
    },
    shape: 'octopus',
    color: 'violet',
    accent: ink('violet'),
  },
  {
    id: 'miso',
    name: { en: 'Miso', zh: '喵喵' },
    desc: {
      en: 'An orange cat with two pointed ears, curious about everything within reach.',
      zh: '一只竖着两只尖耳朵的橘猫，什么都想凑过去看看。',
    },
    shape: 'cat',
    color: 'orange',
    accent: ink('orange'),
  },
  {
    id: 'hop',
    name: { en: 'Hop', zh: '跳跳' },
    desc: {
      en: 'A pink bunny with long ears and a round seat, always about to jump.',
      zh: '粉粉的小兔子，长耳朵圆屁股，随时准备蹦一下。',
    },
    shape: 'bunny',
    color: 'magenta',
    accent: ink('magenta'),
  },
  {
    id: 'bruno',
    name: { en: 'Bruno', zh: '熊熊' },
    desc: {
      en: 'A round brown bear with two small ears and a very soft heart.',
      zh: '圆滚滚的棕熊，两只小圆耳朵，心比谁都软。',
    },
    shape: 'bear',
    color: 'brown',
    accent: ink('brown'),
  },
  {
    id: 'chirp',
    name: { en: 'Chirp', zh: '啾啾' },
    desc: {
      en: 'A yellow chick, all fluff, a tuft on top and tiny feet.',
      zh: '一团黄绒绒的小鸡，头顶一撮毛，脚丫小小的。',
    },
    shape: 'chick',
    color: 'yellow',
    accent: ink('yellow'),
  },
  {
    id: 'waddle',
    name: { en: 'Waddle', zh: '摇摇' },
    desc: {
      en: 'A penguin with a pale round belly, rocking from side to side.',
      zh: '肚皮圆圆发亮的小企鹅，走起路来左摇右晃。',
    },
    shape: 'penguin',
    color: 'blue',
    accent: ink('blue'),
  },
  {
    id: 'oink',
    name: { en: 'Oink', zh: '哼哼' },
    desc: {
      en: 'A pink pig with folded ears and a big round snout, always sniffing out a snack.',
      zh: '耳朵折向两边、鼻子圆圆的粉色小猪，总能闻出点心在哪。',
    },
    shape: 'pig',
    color: 'pink',
    accent: ink('pink'),
  },
  {
    id: 'rusty',
    name: { en: 'Rusty', zh: '狐狐' },
    desc: {
      en: 'An orange fox with a heart-shaped face and a white chin, sly in a very polite way.',
      zh: '心形小脸、白下巴的橘色狐狸，狡黠得很有礼貌。',
    },
    shape: 'fox',
    color: 'orange',
    accent: ink('orange'),
  },
  {
    id: 'kiki',
    name: { en: 'Kiki', zh: '琪琪' },
    desc: {
      en: 'A straight-banged bob in warm brown, neat to the last strand.',
      zh: '齐刘海的波波头，暖棕色，一丝不乱。',
    },
    shape: 'bob',
    color: 'brown',
    accent: ink('brown'),
  },
  {
    id: 'maru',
    name: { en: 'Maru', zh: '丸丸' },
    desc: {
      en: 'A pink top knot, tied up high and ready for anything.',
      zh: '粉色丸子头，扎得高高的，随时开工。',
    },
    shape: 'topknot',
    color: 'pink',
    accent: ink('pink'),
  },
  {
    id: 'zip',
    name: { en: 'Zip', zh: '小刺' },
    desc: {
      en: 'Blue spikes that never lie down, whatever the comb says.',
      zh: '一头蓝色刺毛，梳子说什么都不管用。',
    },
    shape: 'spiky',
    color: 'blue',
    accent: ink('blue'),
  },
  {
    id: 'fuzz',
    name: { en: 'Fuzz', zh: '卷卷' },
    desc: {
      en: 'A green cloud of curls with a very calm face underneath.',
      zh: '一团绿色卷毛，底下是一张很淡定的脸。',
    },
    shape: 'curly',
    color: 'green',
    accent: ink('green'),
  },
  {
    id: 'lulu',
    name: { en: 'Lulu', zh: '露露' },
    desc: {
      en: 'Two violet buns, one on each side, perfectly even.',
      zh: '两边各一个紫色小丸子，对得整整齐齐。',
    },
    shape: 'twinbuns',
    color: 'violet',
    accent: ink('violet'),
  },
];

const BY_ID = new Map<CastId, CharacterPreset>(CAST.map((m) => [m.id, m]));

/** Look up a cast member. Returns `null` for unknown ids rather than throwing, so a stored preference can go stale safely. */
export const castMember = (id: string | null | undefined): CharacterPreset | null =>
  id ? (BY_ID.get(id as CastId) ?? null) : null;

export const isCastId = (value: string): value is CastId => BY_ID.has(value as CastId);
