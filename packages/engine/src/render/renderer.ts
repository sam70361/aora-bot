import type { StaticColorScheme } from '../core/options.js';
import type { ColorId } from '../core/types.js';
import type { FrameSnapshot } from '../sim/snapshot.js';

/**
 * A live renderer: mounts into a host once, then turns frame snapshots into
 * pixels (or DOM) on demand.
 *
 * The renderer owns everything it puts in the host and nothing else. It does
 * not tick, schedule or read the simulation — `createCharacter` does that —
 * so any style can be driven by anything that can produce snapshots.
 */
export interface LiveRenderer {
  /**
   * The root it mounted. Every style outputs an SVG root, so mirrors that
   * `<use>` a character, shared stages and static export need no per-style
   * branches.
   */
  readonly element: SVGSVGElement;
  /** Show this frame. Idempotent: drawing the same snapshot twice changes nothing. */
  draw(frame: FrameSnapshot): void;
  /** Apply new style parameters. They affect drawing only, never the simulation. */
  configure(styleOptions: Record<string, unknown>): void;
  /** Remove everything it mounted. */
  destroy(): void;
}

export interface LiveRendererContext {
  /** Per-instance seed; the vector style derives unique ids from it. */
  seed: string;
  /** Id for the root group, so another SVG can mirror it with `<use href>`. */
  sourceId?: string;
  /** Resolved style parameters: defaults merged in and clamped to range. */
  styleOptions: Record<string, unknown>;
}

export type LiveRendererFactory = (host: Element, context: LiveRendererContext) => LiveRenderer;

export interface StaticRenderContext {
  /** Palette colour, which a static render resolves to an ink (the live one takes it from CSS). */
  color: ColorId;
  /**
   * Fragment for ids and class names inside the markup. The caller derives it
   * from what is drawn, so two inlined SVGs of the same character share ids
   * and different ones never collide.
   */
  uid: string;
  /** Flat fill instead of the palette gradient. */
  flat?: boolean;
  /** How the palette ink switches between light and dark. See `StaticOptions.colorScheme`. */
  colorScheme?: StaticColorScheme;
  /** Colour of the eye cut-outs. Defaults to the page background token. */
  eyeColor?: string;
  sizePx?: number;
  /** Resolved style parameters. */
  styleOptions: Record<string, unknown>;
}

/** A static renderer: one snapshot in, one SVG document out. No DOM, no timers. */
export type StaticRenderer = (frame: FrameSnapshot, context: StaticRenderContext) => string;
