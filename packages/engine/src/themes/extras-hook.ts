/**
 * The core's side of a theme's extras: mood decorations, signature motions,
 * the vivid mood accent and the effect anchor.
 *
 * Only themes use them, so their engine is not in the core: it is the
 * `@aora-bot/engine/themes/extras` entry (`src/themes/extras/`), which a
 * theme's entry imports and hands over as `ThemePackage.extras`.
 * `installTheme` builds it once per copy of the core, on the helpers below,
 * so it reads nothing of the core's state and the core imports none of it.
 * Until a theme brings it, every hook here is absent and the renderer draws
 * as it always has.
 */
import type { FxKind, PartColor, ShapeDef } from '../core/types.js';
import { fnv1a32, mulberry32 } from '../math/hash.js';
import { evaluateFx, type FxItem } from '../motion/fx.js';
import { MOOD_EASE_MS, MOOD_LEAN, moodOf, type StateMood } from '../motion/mood.js';
import { CHARACTER_STATES, STATE_FX, type CharacterState } from '../motion/states.js';
import { CENTER, VIEWBOX } from '../core/types.js';
import { chromaHex } from '../render/pixel/shade.js';
import { syncElement } from '../render/dom.js';
import type { PartColorPaint } from '../render/part-color.js';
import { node, type SceneNode } from '../render/scene.js';
import type { SceneLayers } from '../render/vector/build.js';
import type { FrameSnapshot, PartFrame } from '../sim/snapshot.js';
import type { FaceInk } from './extras/colour.js';
import type { MoodAccent } from './extras/lean.js';

/** What the extras draw with: the core's own helpers, lent so the entry imports none of them. */
export interface ExtrasKit {
  node: typeof node;
  hash: typeof fnv1a32;
  random: typeof mulberry32;
  moodOf: typeof moodOf;
  states: readonly CharacterState[];
  stateFx: Partial<Record<CharacterState, FxKind>>;
  evaluateFx: typeof evaluateFx;
  center: number;
  viewBox: { minX: number; minY: number; width: number; height: number };
  moodLean: typeof MOOD_LEAN;
  moodEaseMs: number;
  chroma: typeof chromaHex;
  sync: typeof syncElement;
}

/** A live character's layers in the DOM, over its root `<svg>`'s own group (`ThemeExtras.stage`). */
export interface ExtrasStage {
  /** Write a frame's layers (all but the back one, which the root's group keeps), the character shown `shownPx` wide (0: unknown). */
  draw(frame: FrameSnapshot, layers: SceneLayers, shownPx: number): void;
  /** Take the layers out while frames draw in one tree; the next `draw` puts them back. */
  remove(): void;
  /** Whether the layers are in the character's SVG. */
  readonly shown: boolean;
}

/** The colours a scene resolves a decoration's tones to. */
export interface ExtrasPaints {
  ink: string;
  fx: string;
  page: string;
  contrast: string;
  partColor: (color: PartColor) => PartColorPaint;
}

/** A box a figure's motion plays on: its class and its inline style. */
export interface FigureWrap {
  class: string;
  style: string;
}

/** One vector scene's extras: what its frames' decorations and motions draw. */
export interface ExtrasScene {
  /** Start a frame: what it shows, the shape it draws, its paints, and the width it is shown at (0: unknown). */
  begin(frame: FrameSnapshot, shape: ShapeDef, paints: () => ExtrasPaints, sizePx: number): void;
  /** A part's nodes as its signature motion moves them this frame. */
  part(part: PartFrame, nodes: SceneNode[]): SceneNode[];
  /** Nodes as the motion `id` of the shape's theme moves them about the figure's box (a skin's underlay). */
  play(id: string, nodes: SceneNode[]): SceneNode[];
  /** Everything the body group draws, as the figure's signature motions move it. */
  figure(nodes: SceneNode[]): SceneNode[];
  /**
   * The figure's signature motions for a scene drawn in layers: the class
   * and inline style of each box that wraps the figure's layers, outermost
   * first, in shares of the drawing box, and the glyphs its emitters stream,
   * in shape space, which ride the body but not the figure's own motion.
   */
  figureBox(): { wraps: readonly FigureWrap[]; streams: SceneNode[] };
  /** Whether the frame's decorations stand in for the scene's effects. */
  readonly quiet: boolean;
  /** The decoration layer, or `null` when a static frame has none. */
  decor(): SceneNode | null;
  /** The `<style>` the frame's animations need, or `null`. */
  style(): SceneNode | null;
  /** The CSS rules the frame's animations need, for a stylesheet shared by every character of a page; empty when it plays none. */
  rules(): readonly string[];
}

/** A copy of the core's extras, built by `ThemeExtrasFactory`. */
export interface ThemeExtras {
  /** Take a theme's decorations, motions and shapes (`installTheme`); throws for data that names what it lacks. */
  register(theme: {
    definition: { id: string };
    art: Readonly<Record<string, unknown>>;
    variants: readonly { variant: string; decor?: unknown; medium?: unknown }[];
    decor?: unknown;
    motions?: unknown;
  }): void;
  scene(live: boolean, phaseSeed?: string): ExtrasScene;
  /** Whether a skin draws decorations. */
  decorates(variant: string): boolean;
  /** Whether a skin's decorations may reach past the drawing box (`DecorSpec.reach`). */
  bleeds(variant: string): boolean;
  /** A colour leaned into a mood as vivid as `vivid` says. */
  lean(color: string, mood: StateMood, vivid: MoodAccent): string;
  /** How an effect's pieces are placed on a theme's shape (faded to `opacity`), or `null` where they stay as laid out. */
  placeFx(shape: ShapeDef, kind: FxKind, scale: number): ((item: FxItem, opacity: number) => FxItem) | null;
  /** The face colour a skin's own ink paints over `face` on a body of `ink`. */
  faceInk(face: string, ink: string, own: FaceInk): string;
  /** The layers of a live character drawn in layers (`drawsInLayers`), in its root `svg`. */
  stage(svg: SVGSVGElement): ExtrasStage;
  /** Add `rules` to the stylesheet the document or shadow root of `element` shares for every character's keyframes. */
  share(element: Element, rules: readonly string[]): void;
}

/** The `@aora-bot/engine/themes/extras` entry's export: builds the extras for one copy of the core. */
export type ThemeExtrasFactory = (kit: ExtrasKit) => ThemeExtras;

const KIT: ExtrasKit = {
  node,
  hash: fnv1a32,
  random: mulberry32,
  moodOf,
  states: CHARACTER_STATES,
  stateFx: STATE_FX,
  evaluateFx,
  center: CENTER,
  viewBox: VIEWBOX,
  moodLean: MOOD_LEAN,
  moodEaseMs: MOOD_EASE_MS,
  chroma: chromaHex,
  sync: syncElement,
};

let extras: ThemeExtras | null = null;

/** Build the extras a theme brought, once per copy of the core. */
export function installExtras(factory: ThemeExtrasFactory): ThemeExtras {
  extras ??= factory(KIT);
  return extras;
}

/** The extras, once a theme has brought them; `null` before. */
export const themeExtras = (): ThemeExtras | null => extras;
