import {
  DEFAULT_STYLE_ID,
  castMember,
  createCharacter,
  getInkVars,
  getLeafColor,
  mapPointerToGaze,
  stateForEmotion,
  type AutoPauseOptions,
  type CastId,
  type CharacterController,
  type CharacterState,
  type CharacterVariant,
  type ColorId,
  type EmotionId,
  type FaceStyle,
  type FaceTune,
  type HudSpec,
  type InkPaint,
  type NoseId,
  type PoseHome,
  type ShapeId,
  type StyleId,
  type StyleVariant,
} from '@aora-bot/engine';
import { useEffect, useImperativeHandle, useRef, type CSSProperties, type ReactNode, type Ref } from 'react';
import { optionsKey, useAppearance } from '../appearance/AppearanceProvider.js';
import { resolveVariant } from '../appearance/resolve.js';
import { useThemesReady } from '../themes/useThemes.js';
import { cx } from '../utils/cx.js';
import { useLatest, useStable } from '../utils/hooks.js';

/**
 * Re-exported rather than defined here.
 *
 * The engine converts `followTarget` with this function every frame, so a host
 * that listens to the pointer itself has to use the same one — two copies of
 * the curve would make a character that follows the mouse and one handed the
 * same point look at different pixels.
 */
export { mapPointerToGaze } from '@aora-bot/engine';

export interface CharacterHandle {
  /** Spin the body `turns` full revolutions. */
  spin(turns?: number): void;
  /** Hop. `strength` scales the height; 1 is the full bounce. */
  bounce(strength?: number): void;
  /** Throw confetti. */
  burst(count?: number): void;
}

export interface CharacterMarkProps {
  /** Body shape. */
  shape?: ShapeId;
  /** Ink colour from the palette. */
  color?: ColorId;
  /** A named character from the cast. Supplies `shape`, `color`, `face` and `nose` when they are not given. */
  preset?: CastId;
  /** Animation state. */
  state?: CharacterState;
  /** Protocol id, for hosts that speak the wire format. Ignored when `state` is given. */
  emotionId?: EmotionId;
  /**
   * Paint variant within the style series, such as `outline` for `vector`,
   * `dot` for `pixel` or `bubble` for `kaomoji`. Falls back to the
   * surrounding `AppearanceProvider`, then to the series' own default.
   */
  variant?: CharacterVariant | StyleVariant;
  /**
   * The style series: `vector` (default), `pixel` or `kaomoji`. Named `styleId` because
   * `style` is already the inline CSS. Switching it at runtime replaces the
   * renderer and keeps the character's state and motion.
   */
  styleId?: StyleId;
  /** Parameters of the series, such as `{ grid: 32 }` for `pixel`. Clamped by the engine. */
  styleOptions?: Record<string, unknown>;
  /** Face style: `cute` (the default), the plain `eyes`, or `line` — eyes plus a stroked nose and mouth. */
  face?: FaceStyle;
  /** Nose for the line face. Defaults to one derived from the seed; `null` draws none. */
  nose?: NoseId | null;
  /** Multipliers on the fitted face box: overall size, eye gap, height, eye width and height. */
  faceTune?: Partial<FaceTune>;
  /** Rest pose — the slight head turn held when nothing else is happening. */
  poseHome?: Partial<PoseHome>;
  /** Rendered size in pixels. Defaults to 32. */
  sizePx?: number;
  /** Any CSS length, taking precedence over `sizePx`. */
  sizeCss?: string | number;
  /**
   * Id for the root SVG group, letting `CharacterMarkMirror` reuse this
   * instance instead of starting its own animation.
   */
  sourceId?: string;
  /** Freeze in place. The current frame is held rather than reset. */
  paused?: boolean;
  /** Enlarge and converge the eyes, for hover states. */
  emphasis?: boolean;
  /** Eyes track this point. Components in [-1, 1] relative to the centre. */
  gazeTarget?: { x: number; y: number } | null;
  /** Follow the pointer automatically. */
  followPointer?: boolean;
  /**
   * Eyes track this point, in viewport pixels — another element's centre, or a
   * pointer position the host is already tracking for its own reasons.
   * `gazeTarget` wins when both are set.
   */
  followTarget?: { x: number; y: number } | null;
  /** Override the body paint: a flat colour or a two-stop gradient. `null` returns it to the theme token. */
  ink?: InkPaint | null;
  /** Static multiplier on eye size, on top of the emphasis spring. */
  eyeScale?: number;
  /**
   * Multiplier on the shared line weight, 0.8–1.25. Applies to the nose, the
   * mouth and the HUD dials together, so one character can be drawn with a
   * heavier pen without its features disagreeing with each other.
   */
  lineWeight?: number;
  /** A dial drawn in the ring outside the body. `null` removes it. */
  hud?: HudSpec | null;
  /**
   * Called when a finite state has run its course and the engine has moved on
   * by itself. Lets a host's own idea of the state follow without keeping a
   * duplicate timer.
   */
  onSettle?: (from: CharacterState, to: CharacterState) => void;
  /** Colour of the eye cut-outs. Defaults to the surrounding background token. */
  eyeColor?: string;
  /** Corner badge colour, shown in the `notifying` state. */
  badgeColor?: string;
  /** Seed for per-instance randomness so neighbours do not blink in unison. */
  seed?: string;
  /**
   * Stop animating while hidden, scrolled out of view, or under reduced
   * motion. Read at mount. Off by default.
   */
  autoPause?: boolean | AutoPauseOptions;
  /** Play the one-off flourish some states define on entry. Default true. */
  entryEffects?: boolean;
  /** Let an unattended character occasionally hop or spin on its own. Default false. */
  antics?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  ref?: Ref<CharacterHandle>;
}

/**
 * A single animated character.
 *
 * React mounts an empty host element and the engine takes over from there. The
 * component never re-renders in response to animation; prop changes are pushed
 * into the controller imperatively, so a state change costs one method call
 * rather than a reconciliation pass.
 */
export function CharacterMark({
  shape: shapeProp,
  color: colorProp,
  preset,
  state: stateProp,
  emotionId,
  variant: variantProp,
  styleId: styleIdProp,
  styleOptions: styleOptionsProp,
  face: faceProp,
  nose: noseProp,
  faceTune,
  poseHome,
  sizePx = 32,
  sizeCss,
  sourceId,
  paused = false,
  emphasis = false,
  gazeTarget = null,
  followPointer = false,
  followTarget = null,
  ink = null,
  eyeScale,
  lineWeight: lineWeightProp,
  hud = null,
  onSettle,
  eyeColor,
  badgeColor = 'var(--aora-accent)',
  seed,
  autoPause = false,
  entryEffects = true,
  antics = false,
  className,
  style,
  children,
  ref,
}: CharacterMarkProps) {
  const ambient = useAppearance();
  const styleId = styleIdProp ?? ambient.styleId ?? DEFAULT_STYLE_ID;
  // A theme's character, member, skin or colour draws once its theme is loaded; until then the box is held.
  const ready = useThemesReady({
    shape: shapeProp,
    preset,
    variant: variantProp ?? ambient.variant,
    style: styleId,
    color: colorProp,
  });
  const member = ready ? castMember(preset) : null;
  const shape = shapeProp ?? member?.shape ?? 'mochi';
  const color = colorProp ?? member?.color ?? 'black';
  const face = faceProp ?? member?.face ?? ambient.face ?? 'cute';
  const nose = noseProp !== undefined ? noseProp : member?.nose !== undefined ? member.nose : ambient.nose;
  const lineWeight = lineWeightProp ?? ambient.lineWeight;
  const variant = resolveVariant(styleId, variantProp ?? ambient.variant);
  const styleOptions = styleOptionsProp ?? ambient.styleOptions;
  const state = stateProp ?? (emotionId != null ? stateForEmotion(emotionId) : 'idle');

  const hostRef = useRef<HTMLSpanElement>(null);
  const controllerRef = useRef<CharacterController | null>(null);

  // `onSettle` fires from inside the frame loop, which the mount effect never
  // re-runs. Held in a ref so a host that passes an inline closure still gets
  // its latest one called, without the controller being rebuilt.
  const onSettleRef = useLatest(onSettle);

  // Mount once the themes it names are in. Re-creating the controller on every prop change would restart
  // the animation, so the effect depends on nothing else.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !ready) return;

    const controller = createCharacter(host, {
      shape,
      state,
      variant,
      style: styleId,
      styleOptions,
      face,
      nose,
      faceTune,
      poseHome,
      sourceId,
      paused,
      emphasis,
      followTarget,
      ink,
      eyeScale,
      lineWeight,
      hud,
      onSettle: (from, to) => onSettleRef.current?.(from, to),
      badgeColor,
      seed: seed ?? sourceId ?? `${shape}:${color}`,
      autoPause,
      entryEffects,
      antics,
    });
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
    // oxlint-disable-next-line react/exhaustive-deps -- the controller owns later changes through `update`
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    controllerRef.current?.update({
      shape,
      state,
      variant,
      style: styleId,
      face,
      nose,
      paused,
      emphasis,
      gazeTarget,
      eyeScale,
      lineWeight,
      badgeColor,
      entryEffects,
      antics,
    });
  }, [
    ready,
    shape,
    state,
    variant,
    styleId,
    face,
    nose,
    paused,
    emphasis,
    gazeTarget,
    eyeScale,
    lineWeight,
    badgeColor,
    entryEffects,
    antics,
  ]);

  // Style parameters are an object too. The mount already applied the first
  // value, so only a change after that is pushed; dropping them all goes back
  // to the series' defaults rather than leaving the last values in place.
  const heldOptions = useStable(styleOptions, optionsKey);
  const appliedOptions = useRef(heldOptions);
  useEffect(() => {
    if (appliedOptions.current === heldOptions) return;
    appliedOptions.current = heldOptions;
    controllerRef.current?.update({ styleOptions: heldOptions ?? {} });
  }, [heldOptions]);

  // Tune and pose are objects; compare by value so a host re-rendering with
  // a fresh literal each time does not push an update every frame.
  const heldTune = useStable(faceTune);
  const heldPose = useStable(poseHome);
  useEffect(() => {
    if (!heldTune && !heldPose) return;
    controllerRef.current?.update({ faceTune: heldTune, poseHome: heldPose });
  }, [heldTune, heldPose]);

  /*
   * The same for the three options that arrive as objects.
   *
   * A HUD is the worst case: a host reading a live number renders every tick,
   * and `hud={{ kind: 'progress', value }}` is a new object each time. Keyed
   * on identity, that pushes an update per render — and every update restarts
   * the dial's clock, so the ring would never get past the first frame of its
   * sweep.
   */
  const heldHud = useStable(hud);
  const heldInk = useStable(ink);
  const heldTarget = useStable(followTarget);
  useEffect(() => {
    controllerRef.current?.update({ hud: heldHud, ink: heldInk, followTarget: heldTarget });
  }, [heldHud, heldInk, heldTarget]);

  useImperativeHandle(
    ref,
    () => ({
      spin: (turns) => controllerRef.current?.spin(turns),
      bounce: (strength) => controllerRef.current?.bounce(strength),
      burst: (count) => controllerRef.current?.burst(count),
    }),
    [],
  );

  useEffect(() => {
    if (!followPointer) return;
    const host = hostRef.current;
    if (!host) return;

    const onMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      if (!rect.width) return;
      controllerRef.current?.update({ gazeTarget: mapPointerToGaze(event, rect) });
    };
    const onLeave = () => controllerRef.current?.update({ gazeTarget: null });

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, [followPointer]);

  const size = sizeCss ?? `${sizePx}px`;

  return (
    <span
      ref={hostRef}
      className={cx('aora-mark', className)}
      data-state={state}
      data-shape={shape}
      data-color={color}
      data-face={face}
      data-style={styleId}
      data-variant={variant}
      style={
        {
          ...getInkVars(color),
          '--aora-leaf': getLeafColor(color),
          ...(eyeColor ? { '--aora-bg': eyeColor } : null),
          width: size,
          ...(ready ? null : { aspectRatio: '1 / 1' }),
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </span>
  );
}
