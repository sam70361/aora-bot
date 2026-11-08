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
    id: 'ivory',
    value: '#F7EFDF',
    ink: { light: '#FFF8EA', dark: '#F7EFDF' },
    gradient: { lightFrom: '#FFFCF5', lightTo: '#F0E4CC', darkFrom: '#FBF6EC', darkTo: '#E6DAC2' },
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

/** The colour of the cute face on any palette body. Black is left out: see `getInkVars`. */
export const FACE_INK = '#FFFFFF';
/** The soft variant's face: dark brown. */
export const SOFT_FACE_INK = '#2B2420';
/** The riso variant's second ink on a pink body; every other colour uses the default in `RISO_TOKEN`. */
export const RISO_INK_ON_PINK = '#F5B428';
/** What hair is shaded towards: black, except on a body too dark for black to show. */
export const HAIR_SHADE = '#000000';
/** The hair shade in a live scene: a token, so the host can turn it white for a dark body (`getInkVars`). */
export const HAIR_SHADE_TOKEN = `var(--aora-hair-shade, ${HAIR_SHADE})`;

/**
 * How a body's ink sits against a face, per page: `dark` (black on a light
 * page, night), `light` (black on a dark page, yellow, cream) or `mid`, which
 * is every other hue. Measured from the ink's relative luminance, so a colour
 * added to the palette takes the rule its ink calls for.
 */
export type InkTone = 'dark' | 'light' | 'mid';

/** Relative luminance above which a white face no longer reads on the ink. */
const LIGHT_INK = 0.4;
/** Relative luminance below which black hair and dark features no longer read on the ink. */
const DARK_INK = 0.04;

function luminance(hex: string): number {
  const channel = (i: number): number => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

export const inkTone = (hex: string): InkTone => {
  const l = luminance(hex);
  return l > LIGHT_INK ? 'light' : l < DARK_INK ? 'dark' : 'mid';
};

/** The face's paints on a body of one tone. */
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

/**
 * The face rule. A dark body takes a white face, white features and white
 * hair shading; a light one takes the dark face throughout, with light
 * pupils on its dark whites, which is what black does on a dark page.
 */
const FACE_RULE: Record<InkTone, FaceInks> = {
  dark: {
    face: FACE_INK,
    soft: FACE_INK,
    sticker: FACE_INK,
    hair: '#FFFFFF',
    pupil: SOFT_FACE_INK,
    glint: SOFT_FACE_INK,
  },
  light: {
    face: SOFT_FACE_INK,
    soft: SOFT_FACE_INK,
    sticker: '#1F1F1F',
    hair: HAIR_SHADE,
    pupil: FACE_INK,
    glint: FACE_INK,
  },
  mid: {
    face: FACE_INK,
    soft: SOFT_FACE_INK,
    sticker: FACE_INK,
    hair: HAIR_SHADE,
    pupil: SOFT_FACE_INK,
    glint: FACE_INK,
  },
};

/**
 * A colour's face paints on a light and on a dark page, and whether its face
 * is a cut-out: a colour whose ink changes tone with the page (black) has its
 * face cut out of the page, which reads on either.
 */
export function faceInks(id: ColorId): { light: FaceInks; dark: FaceInks; cutOut: boolean; plain: boolean } {
  const { ink } = getSwatch(id);
  const light = inkTone(ink.light);
  const dark = inkTone(ink.dark);
  return {
    light: FACE_RULE[light],
    dark: FACE_RULE[dark],
    cutOut: light !== dark,
    plain: light === 'mid' && dark === 'mid',
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

/** Contrast against the page below which a mark drawn in the ink is lost on it. */
const EFFECT_CONTRAST = 1.6;

const contrast = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/**
 * What a colour's state effects (zz, dots, rings, marks) are drawn in on a
 * light and on a dark page, where the ink would be lost on that page: the
 * face the face rule gives that ink, so the marks read and match the face.
 * `null` on a page where the ink itself reads.
 */
export function effectInks(id: ColorId): { light: string | null; dark: string | null } {
  const { ink } = getSwatch(id);
  const rule = faceInks(id);
  return {
    light: contrast(luminance(ink.light), 1) < EFFECT_CONTRAST ? rule.light.face : null,
    dark: contrast(luminance(ink.dark), 0) < EFFECT_CONTRAST ? rule.dark.face : null,
  };
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
 * written only for an ink lost on one of the pages (`effectInks`).
 * `--aora-ink2` is the riso variant's second ink, which only pink needs to
 * change.
 */
export const getInkVars = (id: ColorId): Record<string, string> => {
  const { light, dark, cutOut, plain } = faceInks(id);
  const pair = (key: keyof FaceInks): string => pairCss(light[key], dark[key]);
  const effects = effectInks(id);
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
    ...(id === 'pink' ? { '--aora-ink2': RISO_INK_ON_PINK } : null),
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
