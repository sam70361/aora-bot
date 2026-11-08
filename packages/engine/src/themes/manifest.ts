/**
 * Every theme the engine ships, as the core knows it before any is loaded:
 * its names, the ids it owns and how to load it.
 *
 * This is the only per-theme data in the core. A theme's art, skins, cast and
 * stored face data live in its own entry (`@aora-bot/engine/themes/<id>`),
 * which `loadTheme` imports on demand. The ids are here so the core can tell
 * an id that needs its theme from an id nobody knows, and so a host can load
 * the theme before drawing. Nothing in this module may import the rest of the
 * engine: the core's own modules read it.
 */

/** A theme as the manifest records it. */
export interface ThemeManifestEntry {
  readonly id: string;
  readonly name: { readonly en: string; readonly zh: string };
  /** Shape ids the theme draws. */
  readonly shapes: readonly string[];
  /** Of those, the ones the default lists show; the rest are reached through the theme. */
  readonly listedShapes: readonly string[];
  /** Cast member ids the theme names. */
  readonly cast: readonly string[];
  /**
   * Every card the theme shows, in its order: its definition's `cast`,
   * borrowed core members included. A page reserves one slot per card
   * before the theme loads.
   */
  readonly cards: readonly string[];
  /** Variants the theme adds to a style series. */
  readonly variants: readonly { readonly style: string; readonly variant: string }[];
  /** Palette colours the theme adds. */
  readonly colors: readonly string[];
  /** The theme's entry, loaded on demand. */
  readonly load: () => Promise<unknown>;
}

/** Ids of a theme whose members wear shapes of the same name, as the lab drew them. */
const CHRISTMAS = [
  'xm-tree',
  'xm-snowman',
  'xm-ginger',
  'xm-deer',
  'xm-stocking',
  'xm-cane',
  'xm-globe',
  'xm-santa',
  'xm-cocoa',
  'xm-bauble',
  'xm-mochi-hat',
  'xm-chirp-hat',
  'xm-waddle-scarf',
  'xm-miso-antlers',
  'xm-kiki-muffs',
  'xm-pokey-mittens',
  'xm-pud-holly',
  'xm-chime-holly',
] as const;

const SPRING_FESTIVAL = [
  'sf-tangyuan',
  'sf-hongbao',
  'sf-firecracker',
  'sf-fu',
  'sf-nian',
  'sf-knot',
  'sf-orange',
  'sf-goat',
  'sf-koi',
  'sf-ingot',
  'sf-kiki-tiger',
  'sf-waddle-scarf',
  'sf-hop-lantern',
  'sf-maru-collar',
  'sf-mochi-fu',
  'sf-lulu-crackers',
  'sf-nook-couplets',
  'sf-chirp-lion',
] as const;

const MID_AUTUMN = [
  'ma-mooncake',
  'ma-rabbit',
  'ma-lantern',
  'ma-osmanthus',
  'ma-moon',
  'ma-pomelo',
  'ma-skylantern',
  'ma-crab',
  'ma-mochi-ears',
  'ma-hop-cake',
  'ma-chirp-cake',
  'ma-lulu-pin',
  'ma-kiki-pin',
  'ma-miso-lamp',
  'ma-waddle-lamp',
  'ma-bao-hat',
  'ma-pip-hat',
] as const;

const EASTER = [
  'ea-dapple',
  'ea-wicker',
  'ea-cocoa',
  'ea-crunchy',
  'ea-posy',
  'ea-breezy',
  'ea-peeky',
  'ea-hop-crown',
  'ea-chirp-shell',
  'ea-mochi-ears',
  'ea-momo-ears',
  'ea-waddle-shell',
  'ea-kiki-crown',
  'ea-lulu-bow',
  'ea-hammy-basket',
] as const;

const SUMMER = [
  'sm-popsicle',
  'sm-coconut',
  'sm-ring',
  'sm-castle',
  'sm-fan',
  'sm-ice',
  'sm-pineapple',
  'sm-shell',
  'sm-cicada',
  'sm-miso-shades',
  'sm-waddle-goggles',
  'sm-chirp-hat',
  'sm-hop-hat',
  'sm-bruno-melon',
  'sm-koko-lei',
  'sm-leo-sunscreen',
  'sm-scoop-shades',
] as const;

const VALENTINE = [
  'vl-bonbon',
  'vl-rose',
  'vl-cherub',
  'vl-ring',
  'vl-dove',
  'vl-dipped',
  'vl-mochi-stickers',
  'vl-miso-bowtie',
  'vl-waddle-bowtie',
  'vl-bruno-rose',
  'vl-hop-glasses',
  'vl-oink-stickers',
  'vl-kiki-letter',
  'vl-chirp-headband',
] as const;

export const THEME_MANIFEST = [
  {
    id: 'halloween',
    name: { en: 'Halloween', zh: '万圣节' },
    shapes: [
      'spook',
      'pumpkin',
      'nightcat',
      'batling',
      'cauldron',
      'witch',
      'toffee',
      'manor',
      'wisp',
      'deadtree',
      'scarecrow',
      'tombstone',
      'candycorn',
      'mummy',
      'skull',
      'spider',
      'owl',
      'pail',
      'candle',
      'vampire',
      'witchmochi',
      'lanterncat',
      'nightcapmoon',
    ],
    listedShapes: [],
    cast: [
      'floaty',
      'gourdy',
      'coal',
      'flitter',
      'bubbles',
      'hatty',
      'twisty',
      'creaky',
      'wisp',
      'knotty',
      'patch',
      'resty',
      'corny',
      'wraps',
      'rattle',
      'dangle',
      'hoot',
      'pail',
      'wick',
      'cape',
      'witchmochi',
      'lanternmiso',
      'nightcapluna',
    ],
    cards: [
      'floaty',
      'gourdy',
      'coal',
      'flitter',
      'bubbles',
      'hatty',
      'twisty',
      'creaky',
      'wisp',
      'knotty',
      'patch',
      'resty',
      'corny',
      'wraps',
      'rattle',
      'dangle',
      'hoot',
      'pail',
      'wick',
      'cape',
      'witchmochi',
      'lanternmiso',
      'nightcapluna',
      'jelly',
      'flap',
      'luna',
    ],
    variants: [
      { style: 'vector', variant: 'doodle' },
      { style: 'vector', variant: 'grainy' },
    ],
    colors: [],
    load: () => import('@aora-bot/engine/themes/halloween'),
  },
  {
    id: 'christmas',
    name: { en: 'Christmas', zh: '圣诞节' },
    shapes: CHRISTMAS,
    listedShapes: [],
    cast: CHRISTMAS,
    cards: [...CHRISTMAS, 'twinkle', 'joy', 'nimbo'],
    variants: [{ style: 'vector', variant: 'felt' }],
    colors: ['peach', 'pine', 'crimson', 'snow'],
    load: () => import('@aora-bot/engine/themes/christmas'),
  },
  {
    id: 'spring-festival',
    name: { en: 'Spring Festival', zh: '春节' },
    shapes: SPRING_FESTIVAL,
    listedShapes: [],
    cast: SPRING_FESTIVAL,
    cards: [...SPRING_FESTIVAL, 'bao', 'ember', 'finn'],
    variants: [{ style: 'vector', variant: 'papercut' }],
    colors: [],
    load: () => import('@aora-bot/engine/themes/spring-festival'),
  },
  {
    id: 'mid-autumn',
    name: { en: 'Mid-Autumn', zh: '中秋节' },
    shapes: MID_AUTUMN,
    listedShapes: [],
    cast: MID_AUTUMN,
    cards: [...MID_AUTUMN, 'luna', 'lumi', 'orbi'],
    variants: [{ style: 'vector', variant: 'lantern' }],
    colors: ['indigo', 'crust', 'jade', 'peel'],
    load: () => import('@aora-bot/engine/themes/mid-autumn'),
  },
  {
    id: 'easter',
    name: { en: 'Easter', zh: '复活节' },
    shapes: EASTER,
    listedShapes: [],
    cast: EASTER,
    cards: [...EASTER, 'lucky', 'bloom', 'sprout'],
    variants: [{ style: 'vector', variant: 'pastel' }],
    colors: ['mint', 'carrot', 'caramel'],
    load: () => import('@aora-bot/engine/themes/easter'),
  },
  {
    id: 'summer',
    name: { en: 'Summer', zh: '夏日' },
    shapes: SUMMER,
    listedShapes: [],
    cast: SUMMER,
    cards: [...SUMMER, 'melo', 'puff', 'dew'],
    variants: [{ style: 'vector', variant: 'soda' }],
    colors: ['lagoon', 'lemon', 'aqua', 'sand', 'grass'],
    load: () => import('@aora-bot/engine/themes/summer'),
  },
  {
    id: 'valentine',
    name: { en: "Valentine's Day", zh: '情人节' },
    shapes: VALENTINE,
    listedShapes: [],
    cast: VALENTINE,
    cards: [...VALENTINE, 'luv', 'cheri', 'cuppy'],
    variants: [{ style: 'vector', variant: 'candy' }],
    colors: ['wine', 'plum'],
    load: () => import('@aora-bot/engine/themes/valentine'),
  },
] as const satisfies readonly ThemeManifestEntry[];

type Manifest = (typeof THEME_MANIFEST)[number];

/** The ids of the themes the engine ships. */
export type BuiltinThemeId = Manifest['id'];
/** A shape a shipped theme draws. */
export type ThemeShapeId = Manifest['shapes'][number];
/** A shape a shipped theme lists in the default lists. */
export type ListedThemeShapeId = Manifest['listedShapes'][number];
/** A cast member a shipped theme names. */
export type ThemeCastId = Manifest['cast'][number];
/** A palette colour a shipped theme adds. */
export type ThemeColorId = Manifest['colors'][number];

export const THEME_IDS: readonly BuiltinThemeId[] = THEME_MANIFEST.map((entry) => entry.id);
