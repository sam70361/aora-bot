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
];

const BY_ID = new Map<ColorId, Swatch>(COLOR_SWATCHES.map((s) => [s.id, s]));

const fallback = (): Swatch => BY_ID.get('black')!;

export const getSwatch = (id: ColorId): Swatch => BY_ID.get(id) ?? fallback();

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
/** A black sticker's face, light and dark: the paper, then black's own light-page ink once the body has turned white. */
export const stickerFace = (): { light: string; dark: string } => ({
  light: FACE_INK,
  dark: getInkColor('black', 'light'),
});
const stickerFaceCss = (): string => {
  const { light, dark } = stickerFace();
  return `light-dark(${light}, ${dark})`;
};

/** What hair is shaded towards: black, except on a black body while it is still dark, where black would not show. */
export const HAIR_SHADE = '#000000';
/** The hair shade in a live scene: a token, so the host can turn it white for a black body (`getInkVars`). */
export const HAIR_SHADE_TOKEN = `var(--aora-hair-shade, ${HAIR_SHADE})`;
export const hairShade = (id: ColorId): { light: string; dark: string } =>
  id === 'black' ? { light: '#FFFFFF', dark: HAIR_SHADE } : { light: HAIR_SHADE, dark: HAIR_SHADE };

/**
 * The CSS custom properties a host puts on a character for this colour.
 *
 * `--aora-fg` is the body ink. `--aora-face` is what the cute face is painted
 * in: white on every hue, but absent for black, whose body inverts on a dark
 * page, so the face falls back to the page background and reads as a cut-out
 * on either one. `--aora-face-soft` is the soft variant's dark face, which a
 * black body turns white on a light page. `--aora-face-sticker` is the
 * sticker's face, which is its white paper except on black: the body turns
 * white on a dark page, and the face takes the light page's black instead.
 * `--aora-hair-shade` is what hair is shaded towards, white on a black body
 * while it is dark. `--aora-ink2` is the riso variant's second ink, which only
 * pink needs to change.
 */
export const getInkVars = (id: ColorId): Record<string, string> => ({
  '--aora-fg': getInkColorCss(id),
  ...(id === 'black'
    ? {
        '--aora-face-soft': `light-dark(${FACE_INK}, ${SOFT_FACE_INK})`,
        '--aora-face-sticker': stickerFaceCss(),
        '--aora-hair-shade': `light-dark(${hairShade(id).light}, ${hairShade(id).dark})`,
      }
    : { '--aora-face': FACE_INK }),
  ...(id === 'pink' ? { '--aora-ink2': RISO_INK_ON_PINK } : null),
});

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
