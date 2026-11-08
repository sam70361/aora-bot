import type { CSSProperties } from 'react';
import type { Bilingual } from '../../shared/i18n.js';

/** One value for the site's light mode and one for its dark mode. */
export type Pair = readonly [light: string, dark: string];

/**
 * SVG markup, as data. Markup may read the look's custom properties
 * (`var(--look-cover)`, `var(--look-scene-<name>)` and the rest), which is how
 * one drawing follows the site's colour mode.
 */
export type Markup = string;

export interface LookPalette {
  /** The cover cloth, the deeper colour it shades into, and the ink printed on it. */
  cover: Pair;
  coverDeep: Pair;
  /** Text on the cover; at least 4.5:1 against `cover` in both modes. */
  coverInk: Pair;
  /** Badges, chips and the cover's highlights, and the text on them. */
  accent: Pair;
  accentInk: Pair;
  /** The card stock and the ink printed on it. */
  stock: Pair;
  stockInk: Pair;
  stockMuted: Pair;
  /** What the characters stand on: card windows and the dialog's card. */
  art: Pair;
  /** The album header's sky, top and bottom, and the text set on it. */
  sky: readonly [top: Pair, bottom: Pair];
  skyInk: Pair;
  /** The seal's ink and its two detail colours (`class="e2"`, `class="e3"` in the emblem). */
  emblemInk: Pair;
  emblem2: Pair;
  emblem3: Pair;
  /** The pattern's two inks. */
  pattern: Pair;
  pattern2: Pair;
}

/** A metallic edge: gradient stops at even steps, the same in both modes because foil is foil. */
export interface Foil {
  stops: readonly string[];
  /** Degrees. */
  angle: number;
}

/** A repeating tile, drawn in user units and filled with `--look-pattern` and `--look-pattern-2`. */
export interface PatternTile {
  width: number;
  height: number;
  markup: Markup;
}

export type TitleLayout = 'line' | 'stacked' | 'vertical';

/** How a cover title is set. Sizes come from where it is placed; everything else comes from here. */
export interface TitleTreatment {
  /** A system font stack: a Latin face first, then the CJK face, then a generic family. */
  font: string;
  weight: number;
  tracking: string;
  color: Pair;
  /** `text-shadow`: a glow, an offset print or a drop. */
  shadow?: string;
  /** A `drop-shadow()` filter, for a title painted with `fill`, whose glyphs a text shadow would show through. */
  drop?: string;
  /** A stroke around each glyph, painted under its fill. */
  outline?: { width: string; color: string };
  /** A gradient painted through the glyphs instead of `color`. */
  fill?: string;
  /** The `fill` and `drop` on the booklet, for a title whose own paint is close to the booklet's cloth. */
  booklet?: { fill: string; drop: string };
  /** A slant, in degrees. */
  skew?: number;
  /** Per glyph, in turn: colours, rotations in degrees and lifts in em. */
  glyphs?: {
    colors?: readonly string[];
    turns?: readonly number[];
    lifts?: readonly number[];
  };
  /** A banner behind the title: its fill, its shade and a stitched inner line. */
  plate?: { fill: string; shade: string; stitch: string };
  /** `line` keeps the name on one line, `stacked` puts each word on its own, `vertical` sets CJK top to bottom. */
  layout: { header: TitleLayout; booklet: TitleLayout };
  /** The second-language name under the title. */
  gloss: { font: string; style: 'normal' | 'italic'; tracking: string; uppercase: boolean };
}

/** The album header's scene: layers drawn in a 1440 x 360 box anchored to its bottom right. */
export interface Scene {
  /** Extra inks the layers read as `var(--look-scene-<name>)`. */
  inks: Readonly<Record<string, Pair>>;
  layers: readonly Markup[];
}

export type FrameBorder = 'foil' | 'double' | 'stitched';
export type NumberPlate = 'plain' | 'badge' | 'tab';
export type NamePlate = 'plain' | 'ribbon' | 'tag';

/** The card's front: its edge, the plates that carry its number and name, and its corners. */
export interface CardFrame {
  border: FrameBorder;
  number: NumberPlate;
  name: NamePlate;
  /** A mark at the top left and bottom right, on a 24 x 24 grid. */
  corner?: Markup;
}

/** The card's back, which a drawn card shows first. */
export interface CardBack {
  /** An inner line inset from the edge. */
  inset: 'solid' | 'dashed' | 'double';
  /** A ring drawn around the seal on a 120 x 120 grid, or none. */
  ring?: Markup;
  /** Whether the theme's name is set under the seal. */
  name: boolean;
}

/** The binder pages' faint rules and punched holes, and the sleeves the cards sit in. */
export interface Binder {
  rule: Pair;
  ring: 'round' | 'square';
  sleeve: Pair;
}

/** The booklet's spine on the shelf. */
export interface Spine {
  stitch: 'dashed' | 'dotted' | 'none';
  /** A band across the spine near its head. */
  band?: string;
}

/** What bursts from a drawn card: shapes on a 24 x 24 grid in `currentColor`, painted in turn with the colours. */
export interface Particles {
  shapes: readonly Markup[];
  colors: readonly string[];
  count: number;
}

/**
 * How a theme dresses its covers and cards. Presentation only: what the theme
 * contains comes from the engine, and nothing here names a character, a colour
 * id or a skin. Every component reads a look the same way, so a theme's whole
 * appearance is this data.
 *
 * Theme colour reaches six places and no others: the shelf booklet, the
 * pools under its members on the shelf's wall, the album header, the album's
 * sticker wall, the cards and the dialog's card. Everything around them is
 * the site's own surface, type and controls.
 */
export interface ThemeLook {
  /** One line under the album title. */
  tagline: Bilingual;
  palette: LookPalette;
  foil: Foil;
  pattern: PatternTile;
  /** The seal, on a 24 x 24 grid, in `currentColor` with `e2` and `e3` details. */
  emblem: Markup;
  title: TitleTreatment;
  scene: Scene;
  /** The booklet's corner ornament, on a 120 x 120 grid set into its top right corner. */
  deco: Markup;
  card: CardFrame;
  back: CardBack;
  binder: Binder;
  spine: Spine;
  particles: Particles;
}

/*
 * Display stacks. The CJK faces carry Latin glyphs of their own that set
 * badly in an English title, so each stack names a Latin face first and its
 * CJK faces after it, Windows then Mac, and a title takes each glyph from the
 * first face that has it.
 */
export const KAI = `'Palatino Linotype', Palatino, KaiTi, STKaiti, 'Kaiti SC', 'Kaiti TC', serif`;
export const SONG = `Georgia, 'Songti SC', STSong, SimSun, 'Noto Serif CJK SC', serif`;
export const ROUND = `'Trebuchet MS', 'Microsoft YaHei UI', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', sans-serif`;
export const HEAVY = `'Arial Black', Impact, 'Microsoft YaHei UI', 'Microsoft YaHei', 'PingFang SC', sans-serif`;
export const SANS = 'var(--aora-font-sans)';

/** Latin stacks for the second-language name. */
export const LATIN = {
  serif: `Georgia, 'Times New Roman', serif`,
  book: `'Palatino Linotype', Palatino, Georgia, serif`,
  humanist: `'Trebuchet MS', 'Segoe UI', 'Helvetica Neue', sans-serif`,
  hand: `'Comic Sans MS', 'Segoe Print', 'Chalkboard SE', 'Trebuchet MS', sans-serif`,
  poster: `Impact, 'Arial Black', 'Helvetica Neue', sans-serif`,
} as const;

const pair = ([light, dark]: Pair) => `light-dark(${light}, ${dark})`;

/** A foil as a CSS gradient. */
export const foilOf = ({ stops, angle }: Foil) => `linear-gradient(${angle}deg, ${stops.join(', ')})`;

/** A look as custom properties, for the element that carries the theme. */
export function lookStyle(look: ThemeLook): CSSProperties {
  const { palette: p, title } = look;
  const style: Record<string, string | number> = {
    '--look-cover': pair(p.cover),
    '--look-cover-deep': pair(p.coverDeep),
    '--look-cover-ink': pair(p.coverInk),
    '--look-accent': pair(p.accent),
    '--look-accent-ink': pair(p.accentInk),
    '--look-stock': pair(p.stock),
    '--look-stock-ink': pair(p.stockInk),
    '--look-stock-muted': pair(p.stockMuted),
    '--look-art': pair(p.art),
    '--look-sky-top': pair(p.sky[0]),
    '--look-sky-bottom': pair(p.sky[1]),
    '--look-sky-ink': pair(p.skyInk),
    '--look-emblem-ink': pair(p.emblemInk),
    '--look-emblem-2': pair(p.emblem2),
    '--look-emblem-3': pair(p.emblem3),
    '--look-pattern': pair(p.pattern),
    '--look-pattern-2': pair(p.pattern2),
    '--look-foil': foilOf(look.foil),
    '--look-title-font': title.font,
    '--look-title-weight': title.weight,
    '--look-title-tracking': title.tracking,
    '--look-title-color': pair(title.color),
    '--look-title-shadow': title.shadow ?? 'none',
    '--look-title-skew': `${title.skew ?? 0}deg`,
    '--look-gloss-font': title.gloss.font,
    '--look-gloss-style': title.gloss.style,
    '--look-gloss-tracking': title.gloss.tracking,
    '--look-gloss-case': title.gloss.uppercase ? 'uppercase' : 'none',
    '--look-binder-rule': pair(look.binder.rule),
    '--look-sleeve': pair(look.binder.sleeve),
    '--look-spine-band': look.spine.band ?? 'transparent',
  };
  if (title.outline) {
    style['--look-title-stroke'] = title.outline.width;
    style['--look-title-stroke-color'] = title.outline.color;
  }
  if (title.fill) style['--look-title-fill'] = title.fill;
  if (title.drop) style['--look-title-drop'] = title.drop;
  if (title.booklet) {
    style['--look-booklet-fill'] = title.booklet.fill;
    style['--look-booklet-drop'] = title.booklet.drop;
  }
  for (const [name, ink] of Object.entries(look.scene.inks)) style[`--look-scene-${name}`] = pair(ink);
  return style as CSSProperties;
}
