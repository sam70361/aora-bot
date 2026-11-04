import type { AutoPauseOptions } from '../auto-pause.js';
import type { ExpressionId } from '../face/topologies.js';
import type { HudSpec } from '../hud/spec.js';
import type { CharacterState } from '../motion/states.js';
import type { StyleId } from '../styles/types.js';
import type {
  ColorId,
  CuteMouthId,
  FaceStyle,
  FaceTune,
  MouthId,
  NoseId,
  Pose,
  PoseHome,
  ShapeId,
} from './types.js';

/**
 * How the `vector` style paints the body.
 *
 * The geometry, the animation and the face are identical across all of them —
 * only the paint changes. Keeping them as one renderer rather than five
 * means a new state or a new shape arrives in every style at once.
 */
export type CharacterVariant = 'solid' | 'outline' | 'glass' | 'sticker' | 'paper' | 'soft' | 'riso';

/**
 * A variant id as the options accept it. The five above belong to `vector`;
 * other style series declare their own, and `getStyle(id).variants` says
 * which ones a given series understands.
 */
export type StyleVariant = CharacterVariant | (string & Record<never, never>);

/**
 * Body paint, overriding the `--aora-fg` token.
 *
 * Two forms because they answer two different questions. A flat colour is
 * what a host uses when the character has to match something else on the
 * page exactly. A gradient is what the palette itself does, and hosts that
 * generate their own colours want the same treatment without having to
 * write the `<defs>` by hand.
 */
export type InkPaint = { flat: string } | { from: string; to: string; angle?: number };

export interface CharacterOptions {
  /** One of the roster's characters, or an id registered with `defineShape`. */
  shape?: ShapeId;
  state?: CharacterState;
  /**
   * Paint style within the chosen style series. Defaults to the series' own
   * default: `solid` for `vector`, `crisp` for `pixel`.
   */
  variant?: StyleVariant;
  /**
   * The style series the character is drawn in. Defaults to `vector`.
   * `update({ style })` swaps the renderer for another series: the
   * simulation, and so the character's state and motion, carries over. A
   * `variant` the other series does not have falls back to its default.
   */
  style?: StyleId;
  /**
   * Parameters of the chosen style series, merged over its defaults and
   * clamped to its declared ranges. Unknown keys are ignored.
   */
  styleOptions?: Record<string, unknown>;
  /**
   * Face style. `cute` (default) paints small round eyes, a small mouth and
   * blush in a face colour; `eyes` draws two cut-out eyes alone; `line`
   * adds a stroked nose and a parametric mouth at the eyes' line weight.
   */
  face?: FaceStyle;
  /**
   * Nose for the line face. Defaults to one derived from `seed`; `null`
   * draws no nose. Ignored when `face` is `eyes`.
   */
  nose?: NoseId | null;
  /** Id placed on the root group so other SVGs can mirror it with `<use href>`. */
  sourceId?: string;
  pose?: Partial<Pose>;
  poseHome?: Partial<PoseHome>;
  faceTune?: Partial<FaceTune>;
  /** Eyes track this point, in shape-space units relative to centre. */
  gazeTarget?: { x: number; y: number } | null;
  /**
   * Eyes track this point, in viewport pixels — a pointer position, or the
   * centre of another element on the page. Converted against the SVG's own
   * bounding box each frame, so it survives scrolling and resizing without
   * the host recomputing anything. `gazeTarget` wins when both are set.
   */
  followTarget?: { x: number; y: number } | null;
  /** Override the body paint. `null` returns it to the theme token. */
  ink?: InkPaint | null;
  /** Static multiplier on eye size, on top of the emphasis spring. Defaults to 1. */
  eyeScale?: number;
  /**
   * Multiplier on the shared line weight, clamped to 0.8–1.25. Applies to
   * the nose, the mouth and the HUD dials together, so one character can be
   * drawn with a heavier pen without its features disagreeing with each
   * other.
   */
  lineWeight?: number;
  /** A dial drawn in the ring outside the body. `null` removes it. */
  hud?: HudSpec | null;
  /** Enlarge and converge the eyes — used on hover. */
  emphasis?: boolean;
  /** Freeze in place. Springs stop, the current frame is held. */
  paused?: boolean;
  /** Corner badge colour. Null hides the badge. */
  badgeColor?: string | null;
  /** Seed for per-instance randomness, so two characters do not blink in unison. */
  seed?: string;
  /** Force reduced motion regardless of the media query. */
  reducedMotion?: boolean;
  /**
   * Play the one-off flourish some states define on entry (`STATE_ENTRY_EFFECTS`):
   * a spin and confetti for `celebrate`, a hop for `surprised`. On by default;
   * never fires on mount or under reduced motion.
   */
  entryEffects?: boolean;
  /**
   * Let an unattended character occasionally hop or spin on its own while
   * idle, happy or proud — every 20–45 s, seeded. Off by default.
   */
  antics?: boolean;
  /**
   * Stop the frame loop while the page is hidden, the element is out of the
   * viewport, or reduced motion is on; resume when all three clear. Off by
   * default because the host often knows better (a virtualised list already
   * unmounts what is off screen). Independent of `paused`: an auto-held
   * character that the host also pauses stays paused when it scrolls back.
   */
  autoPause?: boolean | AutoPauseOptions;
  /**
   * Called when a finite state has run its course and the renderer has moved
   * on by itself — see `STATE_SETTLE_TO`. The host is told rather than asked,
   * so its own idea of the state can follow without it having to keep a
   * duplicate timer.
   */
  onSettle?: (from: CharacterState, to: CharacterState) => void;
}

/**
 * What a static SVG's light/dark ink follows: `system` the OS, through a
 * `prefers-color-scheme` media query inside the SVG; `page` the inherited CSS
 * `color-scheme`, through `light-dark()`.
 */
export type StaticColorScheme = 'system' | 'page';

export interface StaticOptions {
  /** One of the roster's characters, or an id registered with `defineShape`. */
  shape?: ShapeId;
  color?: ColorId;
  /**
   * The style series to draw in. Defaults to `vector`. Static output is
   * deterministic, so every series can render it without a DOM.
   */
  style?: StyleId;
  /** Parameters of the chosen series, merged over its defaults. */
  styleOptions?: Record<string, unknown>;
  /**
   * Paint variant within the series. Defaults to the series' own default,
   * which for `vector` is `solid` and keeps the output unchanged for callers
   * that never named one.
   */
  variant?: StyleVariant;
  /**
   * Expression to draw. Accepting this is what lets a paused or
   * off-screen character keep the face it had — a static fallback locked to a
   * neutral expression cannot represent a state gallery at all.
   */
  expression?: ExpressionId;
  /** Derive the expression and face tune from an animation state. */
  state?: CharacterState;
  /** Face style. Defaults to `cute`. */
  face?: FaceStyle;
  /** Nose for the line face. Defaults to one derived from the shape and colour; `null` draws none. */
  nose?: NoseId | null;
  /** Mouth to draw. Defaults to the state's mouth for the chosen face. */
  mouth?: MouthId | CuteMouthId;
  faceTune?: Partial<FaceTune>;
  pose?: Partial<Pose>;
  poseHome?: Partial<PoseHome>;
  /** Flat fill instead of the palette gradient. */
  flat?: boolean;
  /**
   * Body paint, as in `CharacterOptions.ink`. Wins over `color` and `flat`, so
   * `{ flat: 'currentColor' }` gives a static SVG that takes the surrounding
   * text colour when it is inlined.
   */
  ink?: InkPaint | null;
  /** Colour of the eye cut-outs. Defaults to the page background token. */
  eyeColor?: string;
  /**
   * Which light/dark switch the palette ink uses. Defaults to `system`, which
   * is right for an `<img>` or a data URL, where the SVG cannot see the page.
   * Use `page` when the markup is inlined into a document with its own theme
   * switch: the ink then follows the inherited `color-scheme` instead of the OS.
   * The two modes use different class names, so both can share a document.
   */
  colorScheme?: StaticColorScheme;
  /** Multiplier on the shared line weight, clamped to 0.8–1.25. */
  lineWeight?: number;
  /**
   * A dial in the ring outside the body, drawn at the start of its cycle.
   *
   * A frozen character that shows its state but drops its HUD would look
   * like the work had finished, so the fallback carries both.
   */
  hud?: HudSpec | null;
  sizePx?: number;
}
