import { requireTheme } from '../themes/state.js';
import { COLOR_IDS, type ColorId } from './types.js';

export interface Swatch {
  id: ColorId;
  /** Flat colour for picker chips. Tuned for recognition at 20px. */
  value: string;
  /** Character ink. Two values so contrast holds on either background. */
  ink: { light: string; dark: string };
  /** Two-stop gradient used by static avatars. */
  gradient: { lightFrom: string; lightTo: string; darkFrom: string; darkTo: string };
}

/**
 * Three colour layers per hue.
 *
 * A picker chip and a rendered character have opposite problems: the chip is a
 * 20px square that has to be told apart from ten neighbours, while the
 * character is a large filled silhouette that has to stay readable on both a
 * white and a near-black page. Using one value for both makes the chips muddy
 * or the bodies glaring, so each hue carries a chip colour, a pair of ink
 * values, and a pair of gradients.
 */
export const COLOR_SWATCHES: readonly Swatch[] = [
  {
    id: 'cream',
    value: '#E9D9B6',
    ink: { light: '#F1E2C1', dark: '#EADBB9' },
    gradient: { lightFrom: '#FAF0DA', lightTo: '#E2CDA1', darkFrom: '#F3E6CA', darkTo: '#D8C397' },
  },
  {
    id: 'ivory',
    value: '#F7EFDF',
    ink: { light: '#FFF8EA', dark: '#F7EFDF' },
    gradient: { lightFrom: '#FFFCF5', lightTo: '#F0E4CC', darkFrom: '#FBF6EC', darkTo: '#E6DAC2' },
  },
  {
    id: 'black',
    value: '#1A1A1A',
    // Inverts on dark backgrounds: the neutral character is always the one
    // with the most contrast, whichever way the page is themed.
    ink: { light: '#1F1F1F', dark: '#FFFFFF' },
    gradient: { lightFrom: '#333333', lightTo: '#111111', darkFrom: '#FFFFFF', darkTo: '#CFCFCF' },
  },
  {
    id: 'brown',
    value: '#C46A32',
    ink: { light: '#D07A44', dark: '#BF703F' },
    gradient: { lightFrom: '#E08C58', lightTo: '#A85422', darkFrom: '#BF703F', darkTo: '#965831' },
  },
  {
    id: 'red',
    value: '#E0363A',
    ink: { light: '#EB4B4F', dark: '#D84549' },
    gradient: { lightFrom: '#F26467', lightTo: '#C41F24', darkFrom: '#D84549', darkTo: '#A93639' },
  },
  {
    id: 'orange',
    value: '#F25C0F',
    ink: { light: '#FF7228', dark: '#EB6925' },
    gradient: { lightFrom: '#FF8A4A', lightTo: '#D44C08', darkFrom: '#EB6925', darkTo: '#B8521D' },
  },
  {
    id: 'yellow',
    value: '#E9A20C',
    ink: { light: '#F0B326', dark: '#DDA523' },
    gradient: { lightFrom: '#F6C44A', lightTo: '#C88800', darkFrom: '#DDA523', darkTo: '#AD811B' },
  },
  {
    id: 'green',
    value: '#1B9A5C',
    ink: { light: '#28B06C', dark: '#25A263' },
    gradient: { lightFrom: '#3EC484', lightTo: '#147A48', darkFrom: '#25A263', darkTo: '#1D7F4E' },
  },
  {
    id: 'cyan',
    value: '#0899B8',
    ink: { light: '#14B0D2', dark: '#12A2C1' },
    gradient: { lightFrom: '#3AC4E0', lightTo: '#067A94', darkFrom: '#12A2C1', darkTo: '#0E7F97' },
  },
  {
    id: 'blue',
    value: '#0D7EFF',
    ink: { light: '#2B8FFF', dark: '#2884EB' },
    gradient: { lightFrom: '#4DA3FF', lightTo: '#0A6AD6', darkFrom: '#2884EB', darkTo: '#1F67B8' },
  },
  {
    id: 'violet',
    value: '#6F55E0',
    ink: { light: '#846BEC', dark: '#7962D9' },
    gradient: { lightFrom: '#9D88F2', lightTo: '#5A3FCB', darkFrom: '#7962D9', darkTo: '#5F4DAA' },
  },
  {
    id: 'magenta',
    value: '#D12D8C',
    ink: { light: '#E0449E', dark: '#CE3F91' },
    gradient: { lightFrom: '#EC64B2', lightTo: '#B01E74', darkFrom: '#CE3F91', darkTo: '#A13172' },
  },
  {
    id: 'pink',
    value: '#E8628F',
    ink: { light: '#F0709F', dark: '#DD6792' },
    gradient: { lightFrom: '#F78DB2', lightTo: '#D4507F', darkFrom: '#DD6792', darkTo: '#AD5172' },
  },
  {
    id: 'gray',
    value: '#6E7382',
    ink: { light: '#83889A', dark: '#797D8E' },
    gradient: { lightFrom: '#9AA0B0', lightTo: '#585C6A', darkFrom: '#797D8E', darkTo: '#5E626F' },
  },
  {
    id: 'sage',
    value: '#87A383',
    ink: { light: '#8FAC8B', dark: '#88A584' },
    gradient: { lightFrom: '#B2CAAE', lightTo: '#6E8C6B', darkFrom: '#A4BFA0', darkTo: '#67835F' },
  },
  {
    id: 'clay',
    value: '#B9633F',
    ink: { light: '#C66C47', dark: '#BB6641' },
    gradient: { lightFrom: '#DB8C69', lightTo: '#9C4D2E', darkFrom: '#C7744F', darkTo: '#8F4A2D' },
  },
  {
    id: 'navy',
    value: '#2A4373',
    // Lifted on a dark page, where the deep blue would sink into it.
    ink: { light: '#2E4C80', dark: '#3E5E98' },
    gradient: { lightFrom: '#46669F', lightTo: '#1E355C', darkFrom: '#5373AE', darkTo: '#2D4877' },
  },
  {
    id: 'mauve',
    value: '#9C7898',
    ink: { light: '#A7839F', dark: '#9E7B97' },
    gradient: { lightFrom: '#C4A3BC', lightTo: '#86627F', darkFrom: '#B897B0', darkTo: '#7C5A76' },
  },
  {
    id: 'night',
    value: '#2A2433',
    // Near-black on either page: unlike black it does not turn white on a dark one.
    ink: { light: '#2A2433', dark: '#2F2839' },
    gradient: { lightFrom: '#3D3449', lightTo: '#1C1823', darkFrom: '#3A3245', darkTo: '#211C29' },
  },
  {
    id: 'cocoa',
    value: '#6C4330',
    ink: { light: '#7A4C36', dark: '#8A5A42' },
    gradient: { lightFrom: '#93624A', lightTo: '#5E3A28', darkFrom: '#9C6A50', darkTo: '#6E4632' },
  },
  {
    id: 'sky',
    value: '#9CCDE6',
    ink: { light: '#A9D6EA', dark: '#9ACBE2' },
    gradient: { lightFrom: '#C6E6F4', lightTo: '#86BDD9', darkFrom: '#B4DCEE', darkTo: '#7DB2CE' },
  },
  {
    id: 'blush',
    value: '#F7AEC1',
    ink: { light: '#FFB4C7', dark: '#F5ABBE' },
    gradient: { lightFrom: '#FFD0DC', lightTo: '#E890A8', darkFrom: '#FCC6D4', darkTo: '#DD889F' },
  },
  {
    id: 'lilac',
    value: '#C2ABEA',
    ink: { light: '#CBB5F0', dark: '#BFA8E8' },
    gradient: { lightFrom: '#DDCDF6', lightTo: '#AA92DD', darkFrom: '#D3C1F2', darkTo: '#A189D4' },
  },
  {
    id: 'butter',
    value: '#F7D883',
    ink: { light: '#FFE38F', dark: '#F5D886' },
    gradient: { lightFrom: '#FFEDB5', lightTo: '#EBC766', darkFrom: '#FBE6A4', darkTo: '#DFBC5C' },
  },
  {
    id: 'meadow',
    value: '#74C288',
    ink: { light: '#7CC98F', dark: '#76C08A' },
    gradient: { lightFrom: '#A3DCB1', lightTo: '#5EB073', darkFrom: '#98D4A8', darkTo: '#58A56C' },
  },
];

const BY_ID = new Map<ColorId, Swatch>(COLOR_SWATCHES.map((s) => [s.id, s]));

const fallback = (): Swatch => BY_ID.get('black')!;

/** Add a theme's colour to the palette (`installTheme`). Replaces one with the same id. */
export function registerSwatch(swatch: Swatch): void {
  BY_ID.set(swatch.id, swatch);
}

export const getSwatch = (id: ColorId): Swatch => {
  const swatch = BY_ID.get(id);
  if (swatch) return swatch;
  requireTheme('color', id);
  return BY_ID.get(id) ?? fallback();
};

export const getSwatchHex = (id: ColorId): string => getSwatch(id).value;

export const getInkColor = (id: ColorId, scheme: 'light' | 'dark' = 'light'): string =>
  getSwatch(id).ink[scheme];

/**
 * Ink as a `light-dark()` pair.
 *
 * This is the reason the engine never subscribes to a theme change. The ink is
 * written once into a CSS custom property and the browser re-resolves it when
 * `color-scheme` flips, so a thousand characters re-theme with no JavaScript
 * and no re-render.
 */
export const getInkColorCss = (id: ColorId): string => {
  const { ink } = getSwatch(id);
  return `light-dark(${ink.light}, ${ink.dark})`;
};

/** The cute face's own colour: what the face rule prefers for it (`READS`). */
export const FACE_INK = '#FFFFFF';
/** The soft variant's face: dark brown. */
export const SOFT_FACE_INK = '#2B2420';
/** The riso variant's second ink on a body of the default second ink's hue (`risoSecondInk`). */
export const RISO_INK_ON_PINK = '#F5B428';
/** The riso variant's default second ink, matching the fallback in `RISO_TOKEN`. */
export const RISO_INK = '#FF78A6';
/** What hair is shaded towards: black, except on a body too dark for black to show. */
export const HAIR_SHADE = '#000000';
/** The hair shade in a live scene: a token, so the host can turn it white for a dark body (`getInkVars`). */
export const HAIR_SHADE_TOKEN = `var(--aora-hair-shade, ${HAIR_SHADE})`;

/** A `#rrggbb` colour's channels in linear light. */
const channels = (hex: string): number[] =>
  [1, 3, 5].map((i) => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });

function luminance(hex: string): number {
  const [r, g, b] = channels(hex) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** A `#rrggbb` colour's OKLCH chroma and hue, in degrees. */
function chromaHue(hex: string): [number, number] {
  const [r, g, b] = channels(hex) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const z = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const hue = (Math.atan2(z, a) * 180) / Math.PI;
  return [Math.hypot(a, z), hue < 0 ? hue + 360 : hue];
}

const contrast = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** WCAG contrast between two colours. */
const contrastOf = (a: string, b: string): number => contrast(luminance(a), luminance(b));

/**
 * The least contrast a face paint keeps against the body it is drawn on, by
 * what it draws. Each paint has a colour it prefers and takes the other one
 * only where that reads better, so the face follows the ink rather than a
 * list of colours.
 */
const READS = {
  /** A cute face, a drawn face's whites, a sticker's face: large shapes, white wherever white holds. */
  face: 2.4,
  /** The soft face, brows, lids and eyes drawn on the body: small and thin, so dark needs more to hold. */
  feature: 3,
  /** Hair shaded towards black: a shade only, lost on a body that is nearly black itself. */
  shade: 1.8,
  /**
   * A cut-out eye, measured against the far end of its page (`PAGE`): a real
   * page seldom is one, a dark one least of all, so the hole keeps a margin
   * that still leaves about a feature's contrast on a common dark page.
   */
  hole: 4.5,
} as const;

/** `preferred` where it reads on `ground` at `min`, otherwise whichever of the two reads better there. */
const readsOn = (ground: string, preferred: string, other: string, min: number): string => {
  const own = contrastOf(ground, preferred);
  return own >= min || own >= contrastOf(ground, other) ? preferred : other;
};

/** The other face paint: what reads on a paint of the face. */
const across = (paint: string): string => (paint === FACE_INK ? SOFT_FACE_INK : FACE_INK);

/** An ink a white face does not read on: cream, yellow, black on a dark page. */
export const isLightInk = (hex: string): boolean =>
  readsOn(hex, FACE_INK, SOFT_FACE_INK, READS.face) !== FACE_INK;

/** The face's paints on one body ink. */
export interface FaceInks {
  /** The cute face, and a drawn face's whites. */
  face: string;
  /** The dark face of the painted variants, and a drawn face's brows and body-drawn eyes. */
  soft: string;
  /** The sticker's face. */
  sticker: string;
  /** What hair is shaded towards. */
  hair: string;
  /** A drawn face's pupils: what reads on `face`. */
  pupil: string;
  /** The light on a body-drawn eye: what reads on `soft`. */
  glint: string;
}

/** A light body's sticker face: the dark of black's light-page ink, as the paper turns to it. */
const STICKER_DARK = '#1F1F1F';

/**
 * The face rule, measured per paint against the ink (`READS`). A mid hue
 * keeps the white face and the dark features; a light ink (cream, yellow)
 * takes the dark face with light pupils; a dark one (navy, cocoa) keeps the
 * white face and turns its features white, and a nearly black one (night)
 * its hair shading too.
 */
function faceOn(ink: string): FaceInks {
  const face = readsOn(ink, FACE_INK, SOFT_FACE_INK, READS.face);
  const soft = readsOn(ink, SOFT_FACE_INK, FACE_INK, READS.feature);
  return {
    face,
    soft,
    sticker: face === FACE_INK ? FACE_INK : STICKER_DARK,
    hair: readsOn(ink, HAIR_SHADE, '#FFFFFF', READS.shade),
    pupil: across(face),
    glint: across(soft),
  };
}

/** The face paints the tokens default to: what a mid hue wears, so a host needs to write none of them. */
const PLAIN_FACE: FaceInks = {
  face: FACE_INK,
  soft: SOFT_FACE_INK,
  sticker: FACE_INK,
  hair: HAIR_SHADE,
  pupil: SOFT_FACE_INK,
  glint: FACE_INK,
};

const KEYS = Object.keys(PLAIN_FACE) as (keyof FaceInks)[];
const sameFace = (a: FaceInks, b: FaceInks): boolean => KEYS.every((key) => a[key] === b[key]);

/**
 * A colour's face paints on a light and on a dark page. `turns` when any of
 * them differs between the pages; `cutOut` when the face itself does, as on
 * black, whose face is then cut out of the page, which reads on either;
 * `plain` when both pages wear the tokens' defaults.
 */
export function faceInks(id: ColorId): {
  light: FaceInks;
  dark: FaceInks;
  turns: boolean;
  cutOut: boolean;
  plain: boolean;
} {
  const { ink } = getSwatch(id);
  const light = faceOn(ink.light);
  const dark = faceOn(ink.dark);
  return {
    light,
    dark,
    turns: !sameFace(light, dark),
    cutOut: light.face !== dark.face,
    plain: sameFace(light, PLAIN_FACE) && sameFace(dark, PLAIN_FACE),
  };
}

/** A colour's sticker face, light and dark. */
export const stickerFace = (id: ColorId = 'black'): { light: string; dark: string } => {
  const { light, dark } = faceInks(id);
  return { light: light.sticker, dark: dark.sticker };
};

/** What a colour's hair is shaded towards, light and dark. */
export const hairShade = (id: ColorId): { light: string; dark: string } => {
  const { light, dark } = faceInks(id);
  return { light: light.hair, dark: dark.hair };
};

type Page = 'light' | 'dark';
type PerPage<T> = { light: T; dark: T };

/**
 * The page itself, as a cut-out shows it. `--aora-bg` is what a host sets to
 * re-theme the holes; it defaults to `--aora-bg-base` in the stylesheet, and
 * the fallback here is that token's own default, so an unstyled page agrees
 * with a styled one.
 */
export const PAGE_TOKEN = 'var(--aora-bg, var(--aora-bg-base, #fcfcfc))';

/** The pages a colour is measured against: the far ends of any light and any dark page. */
const PAGE: PerPage<string> = { light: '#FFFFFF', dark: '#000000' };

/** The least contrast against the page, by what is drawn on it in the ink. */
const ON_PAGE = {
  /** A filled body, or a mark (zz, dots, rings), below which it is lost on the page. */
  mass: 1.6,
  /** A line, below which it is too faint to read. */
  line: 2.2,
} as const;

/**
 * Contrast against the page an ink too faint to read is taken to as a line.
 * The same ratio looks weaker on a dark page, so a lifted line goes further.
 */
const LINE_CONTRAST: PerPage<number> = { light: 3, dark: 4.5 };

/** `pick(ink, page)` for the colour's ink on each page. */
const perPage = <T>(id: ColorId, pick: (ink: string, page: Page) => T): PerPage<T> => {
  const { ink } = getSwatch(id);
  return { light: pick(ink.light, 'light'), dark: pick(ink.dark, 'dark') };
};

/** Whether the ink falls below `min` against its page. */
const lostOn = (ink: string, page: Page, min: number): boolean => contrastOf(ink, PAGE[page]) < min;

/**
 * What a colour's state effects (zz, dots, rings, marks) are drawn in on a
 * light and on a dark page, where the ink would be lost on that page: the
 * face the face rule gives that ink, so the marks read and match the face.
 * `null` on a page where the ink itself reads.
 */
export function effectInks(id: ColorId): PerPage<string | null> {
  const rule = faceInks(id);
  return perPage(id, (ink, page) => (lostOn(ink, page, ON_PAGE.mass) ? rule[page].face : null));
}

const toHex = (linear: number[]): string =>
  `#${linear
    .map((v) => {
      const c = Math.min(1, Math.max(0, v));
      const g = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
      return Math.round(g * 255)
        .toString(16)
        .padStart(2, '0');
    })
    .join('')
    .toUpperCase()}`;

/**
 * The ink darkened until it reads at `LINE_CONTRAST` on a white page. Every
 * channel is scaled by one factor in linear light, so the hue and the
 * saturation are the ink's own.
 */
function deepened(hex: string): string {
  const l = luminance(hex);
  const k = (1.05 / LINE_CONTRAST.light - 0.05) / l;
  return toHex(channels(hex).map((v) => v * k));
}

/** The ink lightened, towards white, until it reads at `LINE_CONTRAST` on a black page. */
function lifted(hex: string): string {
  const l = luminance(hex);
  const t = (0.05 * LINE_CONTRAST.dark - 0.05 - l) / (1 - l);
  return toHex(channels(hex).map((v) => v + (1 - v) * t));
}

/** The ink taken to `LINE_CONTRAST` on the page. */
const asLine = (ink: string, page: Page): string => (page === 'light' ? deepened(ink) : lifted(ink));

/**
 * What a colour is drawn in as a line on a light and on a dark page, where its
 * ink is too faint there: the outline and the glass rim, a line variant's face
 * and features, and the kaomoji's text. Cream on a light page deepens to a tan,
 * night on a dark one lifts to a grey; `null` on a page where the ink itself
 * reads.
 */
export function lineInks(id: ColorId): PerPage<string | null> {
  return perPage(id, (ink, page) => (lostOn(ink, page, ON_PAGE.line) ? asLine(ink, page) : null));
}

/**
 * The edge a filled body takes on a page it all but matches, where its ink is
 * lost on that page (as for `effectInks`): the ink as a line there
 * (`lineInks`), so cream and ivory keep their shape on a light page and night
 * on a dark one. `null` on a page where the body itself reads.
 */
export function rimInks(id: ColorId): PerPage<string | null> {
  return perPage(id, (ink, page) => (lostOn(ink, page, ON_PAGE.mass) ? asLine(ink, page) : null));
}

/**
 * When a body swallows the riso's second ink: an ink of at least this OKLCH
 * chroma (a grey has no hue to clash) within this many degrees of its hue.
 */
const RISO_CLASH = { chroma: 0.05, hue: 25 } as const;

/**
 * The riso variant's second ink for a colour on a light and on a dark page,
 * `null` where it is the default pink. A light ink multiplied over pink prints
 * as pink, so it is printed twice, over itself, which deepens it the way a
 * double hit does; a body of the second ink's own hue (red, pink, magenta)
 * would swallow it, so it takes gold.
 */
export function risoSecondInk(id: ColorId): PerPage<string | null> {
  const [, riso] = chromaHue(RISO_INK);
  return perPage(id, (ink) => {
    if (isLightInk(ink)) return ink;
    const [chroma, hue] = chromaHue(ink);
    const apart = Math.abs(((hue - riso + 540) % 360) - 180);
    return chroma >= RISO_CLASH.chroma && apart < RISO_CLASH.hue ? RISO_INK_ON_PINK : null;
  });
}

/**
 * The eyes of a face cut out of the body (`eyes`, `line`) on a light and on a
 * dark page: the page where it reads on the body at `READS.hole`, otherwise
 * whichever of the page and the face rule's face reads better there. Cream on
 * a light page and navy or night on a dark one take their face; `null` on a
 * page that shows through.
 */
export function cutFaceInk(id: ColorId): PerPage<string | null> {
  const rule = faceInks(id);
  return perPage(id, (ink, page) =>
    readsOn(ink, PAGE[page], rule[page].face, READS.hole) === PAGE[page] ? null : rule[page].face,
  );
}

const pairCss = (light: string, dark: string): string =>
  light === dark ? light : `light-dark(${light}, ${dark})`;

/**
 * The CSS custom properties a host puts on a character for this colour.
 *
 * `--aora-fg` is the body ink. The rest follow the face rule (`faceInks`):
 * on a hue in the middle of the range only `--aora-face` is written, white,
 * and the tokens' defaults do the rest. A colour with a dark or a light ink
 * writes them all: `--aora-face` (absent where the face is a cut-out of the
 * page, as on black), `--aora-face-soft` (the soft variant's face and a drawn
 * face's features), `--aora-face-sticker`, `--aora-hair-shade`,
 * `--aora-face-pupil` (what reads on the face) and `--aora-face-glint` (what
 * reads on the features). `--aora-fx` is what state effects are drawn in,
 * written only for an ink lost on one of the pages (`effectInks`), and
 * `--aora-ink-line` what lines on the page are drawn in, only for an ink too faint
 * on one of them (`lineInks`). `--aora-eye` is a cut-out face's eyes where the
 * page does not read on the body (`cutFaceInk`), and `--aora-rim` the edge of a
 * filled body on a page it all but matches (`rimInks`). `--aora-ink2` is the riso
 * variant's second ink, for the light inks and the second ink's own hues (`risoSecondInk`).
 */
export const getInkVars = (id: ColorId): Record<string, string> => {
  const { light, dark, cutOut, plain } = faceInks(id);
  const pair = (key: keyof FaceInks): string => pairCss(light[key], dark[key]);
  const effects = effectInks(id);
  const lines = lineInks(id);
  const eye = cutFaceInk(id);
  const rim = rimInks(id);
  const second = risoSecondInk(id);
  const { ink } = getSwatch(id);
  return {
    '--aora-fg': getInkColorCss(id),
    ...(plain
      ? { '--aora-face': FACE_INK }
      : {
          ...(cutOut ? null : { '--aora-face': pair('face') }),
          '--aora-face-soft': pair('soft'),
          '--aora-face-sticker': pair('sticker'),
          '--aora-hair-shade': pair('hair'),
          '--aora-face-pupil': pair('pupil'),
          '--aora-face-glint': pair('glint'),
        }),
    ...(effects.light || effects.dark
      ? { '--aora-fx': pairCss(effects.light ?? ink.light, effects.dark ?? ink.dark) }
      : null),
    ...(lines.light || lines.dark
      ? { '--aora-ink-line': pairCss(lines.light ?? ink.light, lines.dark ?? ink.dark) }
      : null),
    ...(eye.light || eye.dark
      ? { '--aora-eye': pairCss(eye.light ?? PAGE_TOKEN, eye.dark ?? PAGE_TOKEN) }
      : null),
    ...(rim.light || rim.dark
      ? { '--aora-rim': pairCss(rim.light ?? 'transparent', rim.dark ?? 'transparent') }
      : null),
    ...(second.light || second.dark
      ? { '--aora-ink2': pairCss(second.light ?? RISO_INK, second.dark ?? RISO_INK) }
      : null),
  };
};

export const INK_GRADIENT_ANGLE = 135;

export interface InkGradient {
  from: string;
  to: string;
  angle: number;
}

export const getInkGradient = (id: ColorId): InkGradient => {
  const { gradient } = getSwatch(id);
  return {
    from: `light-dark(${gradient.lightFrom}, ${gradient.darkFrom})`,
    to: `light-dark(${gradient.lightTo}, ${gradient.darkTo})`,
    angle: INK_GRADIENT_ANGLE,
  };
};

/** Resolved (non-`light-dark`) gradient, for contexts that cannot use CSS colour functions. */
export const getInkGradientFor = (id: ColorId, scheme: 'light' | 'dark'): { from: string; to: string } => {
  const { gradient } = getSwatch(id);
  return scheme === 'dark'
    ? { from: gradient.darkFrom, to: gradient.darkTo }
    : { from: gradient.lightFrom, to: gradient.lightTo };
};

/** Soft multi-stop wash used behind avatars. */
export const haloBackground = (id: ColorId): string => {
  const hex = getSwatchHex(id);
  return [
    `radial-gradient(at 22% 18%, color-mix(in oklab, ${hex} 26%, transparent), transparent 60%)`,
    `radial-gradient(at 78% 26%, color-mix(in oklab, ${hex} 20%, transparent), transparent 58%)`,
    `linear-gradient(160deg, color-mix(in oklab, ${hex} 14%, transparent), color-mix(in oklab, ${hex} 7%, transparent))`,
  ].join(', ');
};

export { COLOR_IDS };
