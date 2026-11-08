import type { CastId, ThemeCastMember } from '../core/cast.js';
import type { Swatch } from '../core/palette.js';
import type { ColorId, FaceStyle, NoseId, ShapeId } from '../core/types.js';
import type { StoredFits } from '../face/drawn/extent.js';
import type { AnyFaceDesign } from '../face/drawn/types.js';
import type { CharacterState } from '../motion/states.js';
import type { DecorSpec } from './extras/decor.js';
import type { ThemeExtrasFactory } from './extras-hook.js';
import type { MediumDefinition } from '../render/vector/media.js';
import type { PartMotion } from './extras/motion.js';
import type { CharacterArt } from '../shapes/characters/art.js';
import type { StoredFaceBox } from '../shapes/face-boxes.js';
import type { StyleId } from '../styles/types.js';

/**
 * One dimension of a theme: a list it offers (`open`, the first being where
 * it starts) or the one value it holds (`fixed`).
 */
export type ThemeDimension<T> = { readonly open: readonly T[] } | { readonly fixed: T };

/** A style series and one of its variants, listed or not. */
export interface StyleChoice {
  style: StyleId;
  variant: string;
}

/**
 * What a member of a theme's cast is to the theme: a character drawn for it
 * (`new`), a member of the roster wearing the theme's props (`combo`, with the
 * member it is built on) or a member of the roster shown as it is
 * (`borrowed`), optionally in a colour the theme gives it (`themeLook`).
 */
export type ThemeMember =
  | { readonly id: CastId; readonly kind: 'new' }
  | { readonly id: CastId; readonly kind: 'combo'; readonly base: CastId }
  | { readonly id: CastId; readonly kind: 'borrowed'; readonly color?: ColorId };

export type ThemeMemberKind = ThemeMember['kind'];
export const THEME_MEMBER_KINDS = ['new', 'combo', 'borrowed'] as const satisfies readonly ThemeMemberKind[];

/**
 * What a theme shows: data over the engine, never a second implementation
 * of it.
 *
 * It names the characters it shows and, for every dimension a console
 * offers, which values are open and which are fixed. It may name its own
 * characters, skins and colours, which the default lists leave out, and any
 * listed one; the default lists never show what only a theme names.
 */
export interface ThemeDefinition {
  id: string;
  name: { en: string; zh: string };
  /** Its characters, in the order a picker shows them. Append only: the avatar API's theme pool is this list. */
  cast: readonly CastId[];
  /** What each of them is to the theme, in the order of `cast`. */
  members: readonly ThemeMember[];
  shape: ThemeDimension<ShapeId>;
  color: ThemeDimension<ColorId>;
  style: ThemeDimension<StyleChoice>;
  face: ThemeDimension<FaceStyle>;
  state: ThemeDimension<CharacterState>;
}

/**
 * A theme definition as a theme writes it (`ThemePackage.definition`,
 * `defineTheme`). Every engine state is open unless it says otherwise: it
 * leaves `state` out to open them all from `idle`, names where they start
 * (`{ start }`), or restricts them with a list or a fixed state.
 * `defineTheme` turns it into a `ThemeDefinition`.
 */
export interface ThemeSource extends Omit<ThemeDefinition, 'state'> {
  state?: ThemeDimension<CharacterState> | { readonly start: CharacterState };
}

/**
 * A cast member as a theme presents it: everything a request or a card
 * leaves out, filled from the theme (`themeLook`).
 */
export interface ThemeLook {
  shape: ShapeId;
  color: ColorId;
  face: FaceStyle;
  nose?: NoseId;
  style: StyleId;
  variant: string;
  state: CharacterState;
}

/** A variant a theme adds to a series, and how it is drawn. */
export interface ThemeVariant {
  style: 'vector';
  variant: string;
  /** The series' parameters it reads, which a control panel then offers for it. */
  reads: readonly string[];
  medium: MediumDefinition;
  /** Its own mood decorations in place of the theme's (`ThemePackage.decor`); `null` draws none. */
  decor?: DecorSpec | null;
}

/**
 * A theme's entry (`@aora-bot/engine/themes/<id>`), as `installTheme` takes
 * it: its definition and everything the definition names that the core does
 * not have. It is plain data and painters, with no import of the engine at
 * run time, so it installs into whichever copy of the engine (the main entry
 * or `/static`) is handed it.
 */
export interface ThemePackage {
  definition: ThemeSource;
  /** Its own characters, drawn in a 100 x 100 box, keyed by shape id. */
  art: Readonly<Record<string, CharacterArt>>;
  /** Their face boxes and drawn-face fits, worked out by the generator and stored with the theme. */
  faces: {
    boxes: Readonly<Record<string, StoredFaceBox>>;
    fits: Readonly<Record<string, StoredFits>>;
    /** Drawn faces of its own (`defineFace`), fitted to each body when first drawn on it. */
    designs?: readonly AnyFaceDesign[];
  };
  /** Its own cast members. */
  cast: readonly ThemeCastMember[];
  /** Its own skins. */
  variants: readonly ThemeVariant[];
  /** Its own palette colours, never listed (the ids its manifest entry names). */
  colors: readonly Swatch[];
  /**
   * Doodles round the figure that change with the state's mood, drawn with
   * every one of its skins that does not set its own (`ThemeVariant.decor`).
   */
  decor?: DecorSpec;
  /** The signature motions its art's parts name (`ArtPart.motion`), by id. */
  motions?: Readonly<Record<string, PartMotion>>;
  /**
   * What draws `decor`, `motions`, a skin's `moodAccent` and the effect
   * anchor: `EXTRAS` from `@aora-bot/engine/themes/extras` (in a theme's own
   * entry, `import { EXTRAS } from '../extras/index.js'`). Without it they
   * are not drawn and the accent leans as every accent does.
   */
  extras?: ThemeExtrasFactory;
  /** Names of its own characters, skins and colours, for labels. */
  labels: {
    shapes: Readonly<Record<string, { en: string; zh: string }>>;
    variants: Readonly<Record<string, { en: string; zh: string }>>;
    colors?: Readonly<Record<string, { en: string; zh: string }>>;
    faces?: Readonly<Record<string, { en: string; zh: string }>>;
  };
}
