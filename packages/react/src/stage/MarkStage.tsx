import {
  DEFAULT_STYLE_ID,
  castMember,
  getInkVars,
  getLeafColor,
  getStyle,
  hasStyle,
  renderStaticSvg,
  resolveStyleOptions,
  stateForEmotion,
  type CastId,
  type CharacterState,
  type ColorId,
  type EmotionId,
  type FaceStyle,
  type HudSpec,
  type NoseId,
  type ShapeId,
  type StyleId,
  type StyleVariant,
} from '@aora-bot/engine';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';
import { AppearanceReset, optionsKey, useAppearance } from '../appearance/AppearanceProvider.js';
import { useStable } from '../utils/hooks.js';
import { resolveVariant } from '../appearance/resolve.js';
import { CharacterMark, type CharacterHandle } from '../mark/CharacterMark.js';
import { CharacterMarkMirror } from '../mark/CharacterMarkMirror.js';
import { createMarkCommandRegistry, MarkCommandContext, type MarkCommandRegistry } from './commands.js';
import { cx } from '../utils/cx.js';

/**
 * What actually distinguishes one running animation from another.
 *
 * Deliberately excludes colour and size. Ink is a CSS custom property that
 * resolves at each `<use>` site, and size is set on the wrapper, so a blue
 * 16px blob and a red 96px blob can share one engine as long as they are in
 * the same state. Keying the stage by agent identity instead — the intuitive
 * choice — shares nothing, because every agent is unique by definition.
 *
 * Face style, nose and line weight are part of it: they change the geometry,
 * so a mirror of a source with another face would show the wrong one to a
 * line-face mark. So are `emphasis` and `paused`, which are how the source's engine is
 * being driven — a paused source is a held frame, and every mirror of it
 * shows that frame.
 *
 * The style series, its variant and its parameters are part of it for the same
 * reason: a pixel source at grid 32 is a different picture from one at grid
 * 16, and a mirror of the wrong one would be mislabelled rather than redrawn.
 */
export interface Appearance {
  shape: ShapeId;
  state: CharacterState;
  face: FaceStyle;
  /** `null` for no nose; irrelevant (and normalised to `null`) unless `face` is `line`. */
  nose: NoseId | null;
  /** `null` for the engine's own default weight. */
  lineWeight: number | null;
  emphasis: boolean;
  paused: boolean;
  styleId: StyleId;
  /** The variant the series will draw, never the empty default. */
  variant: string;
  /** Only the parameters that differ from the series' defaults; `null` when none do. */
  styleOptions: Record<string, unknown> | null;
}

/**
 * Every field, in a fixed order, separated by pipes.
 *
 * `-` stands for "no nose" and for "default line weight". A pipe rather than
 * a dot because the line weight is a decimal: `1.15` would otherwise split
 * into two fields. The style parameters come last, URI-encoded so that a
 * pipe inside a value cannot add a field.
 */
const appearanceKey = (a: Appearance): string =>
  [
    a.shape,
    a.state,
    a.face,
    a.nose ?? '-',
    a.lineWeight ?? '-',
    a.emphasis ? 'e' : '-',
    a.paused ? 'p' : '-',
    a.styleId,
    a.variant,
    encodeURIComponent(optionsKey(a.styleOptions)),
  ].join('|');

function parseAppearanceKey(key: string): Appearance {
  const [shape, state, face, nose, lineWeight, emphasis, paused, styleId, variant, options] = key.split(
    '|',
  ) as [ShapeId, CharacterState, FaceStyle, string, string, string, string, StyleId, string, string];
  const pairs = options ? (JSON.parse(decodeURIComponent(options)) as [string, unknown][]) : [];
  return {
    shape,
    state,
    face,
    nose: nose === '-' ? null : (nose as NoseId),
    lineWeight: lineWeight === '-' ? null : Number(lineWeight),
    emphasis: emphasis === 'e',
    paused: paused === 'p',
    styleId,
    variant,
    styleOptions: pairs.length ? Object.fromEntries(pairs) : null,
  };
}

/**
 * A DOM id for an appearance. Not the key itself: a fragment identifier that
 * `<use href="#...">` resolves is percent-decoded, and the encoded parameters
 * would no longer match. They are folded into a short hash instead — the key,
 * not the id, is what the provider tells appearances apart by.
 */
function sourceSlug(key: string): string {
  const fields = key.split('|');
  const options = fields.pop()!;
  // The plain `vector` defaults add nothing, which keeps the ids of marks that never named a style as they were.
  if (!options && fields[7] === 'vector' && fields[8] === 'solid') fields.length = 7;
  const slug = fields.join('-').replace(/[^A-Za-z0-9_-]/g, '-');
  if (!options) return slug;
  let hash = 2166136261;
  for (let i = 0; i < options.length; i++) hash = Math.imul(hash ^ options.charCodeAt(i), 16777619);
  return `${slug}-o${(hash >>> 0).toString(36)}`;
}

/**
 * The seed a source's engine is given: the key, minus the style fields while
 * they are the plain `vector` defaults. A seed fixes when the character
 * blinks, so a source that never asked for a style seeds from the bare key.
 */
const sourceSeed = (key: string): string => (key.endsWith('|vector|solid|') ? key.slice(0, -14) : key);

/**
 * Drop the parameters that equal the series' own defaults, so `{}` and
 * `{ grid: 24 }` share one source, and normalise values the way the engine
 * will (clamped, snapped).
 */
function significantOptions(
  styleId: StyleId,
  options: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  if (!options || !hasStyle(styleId)) return null;
  const style = getStyle(styleId);
  const resolved = resolveStyleOptions(style, options);
  const changed = Object.entries(resolved).filter(([key, value]) => value !== style.defaults[key]);
  return changed.length ? Object.fromEntries(changed) : null;
}

interface AppearanceInput {
  shape: ShapeId;
  state: CharacterState;
  face: FaceStyle;
  nose: NoseId | null;
  lineWeight: number | null;
  emphasis: boolean;
  paused: boolean;
  styleId: StyleId;
  variant: StyleVariant | undefined;
  styleOptions: Record<string, unknown> | undefined;
}

/** Normalise so a face without a nose never forks the stage by an invisible one. */
const normaliseAppearance = ({ variant, styleOptions, ...rest }: AppearanceInput): Appearance => ({
  ...rest,
  face: rest.face,
  nose: rest.face === 'line' ? rest.nose : null,
  variant: resolveVariant(rest.styleId, variant) ?? '',
  styleOptions: significantOptions(rest.styleId, styleOptions),
});

/**
 * Where a claimed appearance stands with the stage.
 *
 * - `pending`  — claimed this frame; the provider has not committed yet.
 * - `hosted`   — a live engine is running for it and mirrors can attach.
 * - `overflow` — committed, but past `maxSources`; draw a still image.
 */
export type StageStatus = 'pending' | 'hosted' | 'overflow';

export interface StageContextValue {
  /** Register interest in an appearance. Returns a release function. */
  claim(appearance: Appearance): () => void;
  /** DOM id of the source group for an appearance. */
  sourceId(appearance: Appearance): string;
  /** Current standing of an appearance. */
  status(appearance: Appearance): StageStatus;
  /** Whether a live engine is hosting this appearance right now. */
  isStaged(appearance: Appearance): boolean;
}

const StageContext = createContext<StageContextValue | null>(null);

export interface MarkStageProviderProps {
  children: ReactNode;
  /**
   * Cap on simultaneously running engines. Claims past the cap fall back to a
   * static render rather than degrading every animation on the page.
   */
  maxSources?: number;
}

/**
 * Hosts one hidden animation per distinct appearance, for mirrors to reuse.
 *
 * Without this, a roster of fifty agents means fifty `requestAnimationFrame`
 * driven SVGs. With it, fifty agents that are all idle blobs cost exactly one.
 *
 * It also carries the agent-keyed command registry (`useMarkCommands`). The
 * two are separate contexts on purpose — appearance sharing and "what is this
 * agent doing" answer different questions — but they are provided together
 * because an application that wants one almost always wants the other.
 */
export function MarkStageProvider({ children, maxSources = 36 }: MarkStageProviderProps) {
  const prefix = useId().replace(/:/g, '');
  const counts = useRef(new Map<string, number>());
  const [active, setActive] = useState<string[]>([]);
  const frame = useRef<number | null>(null);

  /**
   * Claims arrive in bursts — an IntersectionObserver firing during a scroll
   * can produce dozens in a single frame. Committing each one separately would
   * re-render the provider dozens of times at exactly the moment the main
   * thread is busiest, so they are coalesced into one update per frame.
   *
   * The list keeps claim order rather than sorting. Order decides who stays
   * under the cap, and first-come is the stable choice: a late claim that sorts
   * early would otherwise bump a mirror that has been happily running for a
   * minute back to a still image.
   */
  const commit = useCallback(() => {
    if (frame.current != null) return;

    const run = () => {
      frame.current = null;
      const next = [...counts.current.entries()].filter(([, n]) => n > 0).map(([key]) => key);
      setActive((prev) => (sameList(prev, next) ? prev : next));
    };

    if (typeof requestAnimationFrame === 'undefined') run();
    else frame.current = requestAnimationFrame(run);
  }, []);

  // A commit scheduled just before unmount must not fire into a dead provider.
  useEffect(
    () => () => {
      if (frame.current != null && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(frame.current);
      }
      frame.current = null;
    },
    [],
  );

  const hosted = useMemo(() => active.slice(0, maxSources), [active, maxSources]);

  // One registry for the provider's lifetime. A lazy state initialiser rather
  // than `useMemo`, which React is allowed to discard and recompute — and a
  // discarded registry takes every subscription and pending TTL with it.
  const [commands] = useState<MarkCommandRegistry>(createMarkCommandRegistry);
  useEffect(() => () => commands.dispose(), [commands]);

  /*
   * `claim` is stable for the provider's lifetime, and consumers key their
   * effect on it rather than on the whole context value. If it changed with
   * every commit, each commit would make every mark release and re-claim,
   * which both schedules a pointless second commit and — because a released
   * key leaves the map and re-enters at the end — rewrites the claim order
   * that decides who stays under the cap.
   */
  const claim = useCallback(
    (appearance: Appearance) => {
      const key = appearanceKey(appearance);
      counts.current.set(key, (counts.current.get(key) ?? 0) + 1);
      commit();

      let released = false;
      return () => {
        if (released) return;
        released = true;
        const n = (counts.current.get(key) ?? 1) - 1;
        if (n > 0) counts.current.set(key, n);
        else counts.current.delete(key);
        commit();
      };
    },
    [commit],
  );

  const sourceId = useCallback(
    (appearance: Appearance) => `aora-src-${prefix}-${sourceSlug(appearanceKey(appearance))}`,
    [prefix],
  );

  const value = useMemo<StageContextValue>(() => {
    const hostedSet = new Set(hosted);
    const activeSet = new Set(active);
    const status = (appearance: Appearance): StageStatus => {
      const key = appearanceKey(appearance);
      if (hostedSet.has(key)) return 'hosted';
      if (activeSet.has(key)) return 'overflow';
      return 'pending';
    };

    return {
      claim,
      sourceId,
      status,
      isStaged: (appearance) => status(appearance) === 'hosted',
    };
  }, [active, hosted, claim, sourceId]);

  return (
    <MarkCommandContext.Provider value={commands}>
      <StageContext.Provider value={value}>
        <div className="aora-stage" aria-hidden="true">
          <AppearanceReset>
            {hosted.map((key) => {
              const appearance = parseAppearanceKey(key);
              return (
                <CharacterMark
                  key={key}
                  shape={appearance.shape}
                  state={appearance.state}
                  face={appearance.face}
                  nose={appearance.nose}
                  lineWeight={appearance.lineWeight ?? undefined}
                  emphasis={appearance.emphasis}
                  paused={appearance.paused}
                  styleId={appearance.styleId}
                  variant={appearance.variant}
                  styleOptions={appearance.styleOptions ?? {}}
                  sourceId={sourceId(appearance)}
                  sizePx={STAGE_SOURCE_PX}
                  seed={sourceSeed(key)}
                />
              );
            })}
          </AppearanceReset>
        </div>
        {children}
      </StageContext.Provider>
    </MarkCommandContext.Provider>
  );
}

/**
 * Source marks render at a real size rather than 1px.
 *
 * Anything that measures its own element — particle scaling, for instance —
 * reads the source's box, not the mirror's. A source collapsed to a few pixels
 * makes every mirror on the page behave as though it were tiny.
 */
export const STAGE_SOURCE_PX = 96;

export const useMarkStage = (): StageContextValue | null => useContext(StageContext);

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export interface StagedMarkProps {
  shape?: ShapeId;
  state?: CharacterState;
  /** Protocol id, for hosts that speak the wire format. Ignored when `state` is given. */
  emotionId?: EmotionId;
  color?: ColorId;
  /** A named character from the cast. Supplies `shape`, `color`, `face` and `nose` when they are not given. */
  preset?: CastId;
  /** Face style. Part of the shared appearance, so line-face marks share a line-face source. */
  face?: FaceStyle;
  /**
   * Nose for the line face. Unlike `CharacterMark`, the default here is
   * `null` rather than seed-derived: mirrors of one source must agree on a
   * nose, and "the seed's nose" differs per mark.
   */
  nose?: NoseId | null;
  /**
   * Multiplier on the shared line weight. Part of the shared appearance, so
   * a heavier-pen mark gets its own source rather than mirroring a light one.
   */
  lineWeight?: number;
  /** Enlarge and converge the eyes. Part of the shared appearance. */
  emphasis?: boolean;
  /** Hold the current frame. Part of the shared appearance. */
  paused?: boolean;
  /**
   * A dial in the ring outside the body. `null` removes it.
   *
   * A HUD spec is a live readout whose value moves every tick, so unlike the
   * other geometry props it cannot be folded into the appearance key — each
   * new value would mint a source and orphan the last one. A mark with a HUD
   * therefore leaves the stage and runs its own engine, which is what a
   * per-instance readout needs anyway.
   */
  hud?: HudSpec | null;
  /**
   * Style series. Part of the shared appearance, so a pixel mark gets a pixel
   * source. Named `styleId` because `style` is the inline CSS. Falls back to
   * the surrounding `AppearanceProvider`.
   */
  styleId?: StyleId;
  /** Paint variant within the series. Part of the shared appearance. */
  variant?: StyleVariant;
  /**
   * Parameters of the series. Part of the shared appearance, compared by
   * value after the engine's own clamping, so `{}` and the defaults share a source.
   */
  styleOptions?: Record<string, unknown>;
  /*
   * Deliberately no `faceTune`, `poseHome`, `eyeScale`, `autoPause`,
   * `entryEffects` or `antics`.
   *
   * Every one of those is a per-instance value, and a shared source has no
   * per-instance anything: mirrors are a `<use>` of one running engine, so
   * two marks that disagree about the rest pose cannot both be served by
   * it. They could each be added to the appearance key instead, but
   * `faceTune` and `poseHome` are open-ended records and `autoPause` depends
   * on the mark's own visibility, so keying on them would fork the stage per
   * mark and defeat the point. Use `CharacterMark` directly when a mark
   * needs them.
   */
  sizePx?: number;
  eyeColor?: string;
  className?: string;
  /**
   * Applied last, so `--aora-fg` here overrides the ink derived from `color`.
   * That is the only way to hand a mark an animatable custom property instead
   * of a fixed colour, which is what the group activity ink transition needs.
   */
  style?: CSSProperties;
  /**
   * Flourishes, when this mark owns an engine. A mirror shares its animation
   * with every other mark of the same appearance and so cannot move alone;
   * the handle is simply never attached in that case, and `usePokeCycle`
   * reports back that there was nothing to poke.
   */
  ref?: Ref<CharacterHandle>;
}

/**
 * A character that shares its animation with every other character of the same
 * appearance.
 *
 * Outside a provider it runs its own engine. Inside one it is a mirror while
 * the stage hosts its appearance, and a still image of the same expression once
 * the stage is over its cap — so a roster that exceeds `maxSources` degrades to
 * a few frozen faces rather than to blank cells or a stuttering page.
 */
export function StagedMark({
  shape: shapeProp,
  state: stateProp,
  emotionId,
  color: colorProp,
  preset,
  face: faceProp,
  nose: noseProp,
  lineWeight: lineWeightProp,
  emphasis = false,
  paused = false,
  hud = null,
  styleId: styleIdProp,
  variant: variantProp,
  styleOptions: styleOptionsProp,
  sizePx = 28,
  eyeColor,
  className,
  style,
  ref,
}: StagedMarkProps) {
  const ambient = useAppearance();
  const member = castMember(preset);
  const shape = shapeProp ?? member?.shape ?? 'mochi';
  const color = colorProp ?? member?.color ?? 'black';
  const face = faceProp ?? member?.face ?? ambient.face ?? 'cute';
  const nose = noseProp !== undefined ? noseProp : (member?.nose ?? ambient.nose ?? null);
  const lineWeight = lineWeightProp ?? ambient.lineWeight;
  const styleId = styleIdProp ?? ambient.styleId ?? DEFAULT_STYLE_ID;
  const variant = variantProp ?? ambient.variant;
  const styleOptions = styleOptionsProp ?? ambient.styleOptions;
  const state = stateProp ?? (emotionId != null ? stateForEmotion(emotionId) : 'idle');

  // Called unconditionally — hooks cannot be skipped — and then ignored when
  // a HUD opts this mark out of sharing.
  const context = useMarkStage();
  const stage = hud ? null : context;
  // Style parameters are compared by value: a host passing a fresh literal on
  // every render must not release and re-claim its source each time.
  const heldOptions = useStable(styleOptions, optionsKey);
  const appearance = useMemo<Appearance>(
    () =>
      normaliseAppearance({
        shape,
        state,
        face,
        nose,
        lineWeight: lineWeight ?? null,
        emphasis,
        paused,
        styleId,
        variant,
        styleOptions: heldOptions,
      }),
    [shape, state, face, nose, lineWeight, emphasis, paused, styleId, variant, heldOptions],
  );

  // Keyed on `claim`, not `stage`: the context value changes on every commit,
  // the claim function does not.
  const claim = stage?.claim;
  useEffect(() => claim?.(appearance), [claim, appearance]);

  if (!stage) {
    return (
      <CharacterMark
        ref={ref}
        shape={shape}
        state={state}
        color={color}
        face={appearance.face}
        nose={appearance.nose}
        lineWeight={lineWeight}
        emphasis={emphasis}
        paused={paused}
        hud={hud}
        styleId={styleId}
        variant={variant}
        styleOptions={styleOptions}
        sizePx={sizePx}
        eyeColor={eyeColor}
        className={className}
        style={style}
      />
    );
  }

  const classes = cx('aora-mark', className);
  const status = stage.status(appearance);

  if (status === 'pending') {
    // The claim lands next frame. Hold the box open at the final size rather
    // than starting a second engine that would immediately be torn down —
    // a zero-height placeholder makes the whole row jump when it fills in.
    return (
      <span
        className={classes}
        data-state={state}
        data-shape={shape}
        data-face={appearance.face}
        data-style={appearance.styleId}
        data-variant={appearance.variant}
        style={{ width: sizePx, aspectRatio: '1 / 1', ...style }}
      />
    );
  }

  if (status === 'overflow') {
    // Inline rather than an <img> data URL: an SVG document inside <img> is
    // isolated from the page, so the eye cut-outs could not read the
    // background token and would punch light holes into a dark card.
    return (
      <span
        className={`${classes} aora-mark--still`}
        data-state={state}
        data-shape={shape}
        data-color={color}
        data-face={appearance.face}
        data-style={appearance.styleId}
        data-variant={appearance.variant}
        style={
          {
            ...getInkVars(color),
            '--aora-leaf': getLeafColor(color),
            ...(eyeColor ? { '--aora-bg': eyeColor } : null),
            width: sizePx,
            ...style,
          } as CSSProperties
        }
        dangerouslySetInnerHTML={{
          __html: renderStaticSvg({
            shape,
            state,
            color,
            face: appearance.face,
            nose: appearance.nose,
            lineWeight,
            style: appearance.styleId,
            variant: appearance.variant,
            styleOptions: appearance.styleOptions ?? undefined,
            eyeColor: 'var(--aora-bg)',
            // Inlined into the host's page, so the ink follows its `color-scheme`
            // like every token does, not the OS.
            colorScheme: 'page',
          }),
        }}
      />
    );
  }

  return (
    <CharacterMarkMirror
      sourceId={stage.sourceId(appearance)}
      color={color}
      state={state}
      face={appearance.face}
      nose={appearance.nose}
      lineWeight={appearance.lineWeight ?? undefined}
      styleId={appearance.styleId}
      variant={appearance.variant}
      styleOptions={appearance.styleOptions ?? undefined}
      sizePx={sizePx}
      eyeColor={eyeColor}
      className={className}
      style={style}
    />
  );
}
