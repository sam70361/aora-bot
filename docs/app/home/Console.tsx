import {
  CharacterMark,
  CHARACTER_STATES,
  COLOR_IDS,
  SHAPE_IDS,
  useLabel,
  type CharacterHandle,
  type CharacterState,
  type ColorId,
  type FaceStyle,
  type ShapeId,
} from '@aora-bot/react';
import { useCallback, useDeferredValue, useMemo, useRef, useState, type CSSProperties } from 'react';
import { CodeChip, ShareButton } from '../shared/CopyControls.js';
import { useI18n } from '../shared/i18n.js';
import { ArrowIcon, DiceIcon } from '../shared/icons.js';
import { useLocalePath } from '../shared/locale-path.js';
import { DEFAULT_PRESET } from '../shared/share.js';
import { swatchVars } from '../shared/swatch.js';
import { copyFor, lineFor } from '../shared/snippet.js';
import { StateDock } from './Dock.js';
import { withStyle } from './Params.js';
import { ColorRail, ShapeStrip, StyleRail } from './Rails.js';
import type { StyleChoice } from './registry.js';
import { TuneButton } from './Tune.js';
import type { ViewProps } from './views.js';
import { Wall } from './Wall.js';

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

/**
 * The whole home page: one large character, with each thing you can change
 * about it in a floating capsule on its own edge — style on the left, colour
 * and face on the right, shape along the bottom, and the navbar on top —
 * expression and the series' parameters right under it, over a wall of
 * smaller ones, in colour or as line art.
 *
 * Every box in here has a fixed size and every list scrolls inside it, so a
 * registry that grows from forty shapes to a hundred changes what can be
 * scrolled to and nothing about the layout.
 */
export function Console({ registry, preset, patch, replace, backdrop, bar }: ViewProps) {
  const t = useI18n();
  const path = useLocalePath();
  const label = useLabel();
  const mark = useRef<CharacterHandle>(null);
  const [emphasis, setEmphasis] = useState(false);
  // The big character follows at once; the dozens of previews catch up when there is time, so a slider never stutters.
  const look = useDeferredValue(preset);

  const styleChoices = useMemo(() => registry.styles.flatMap((group) => group.choices), [registry]);

  // Stable, so the memoised rails redraw once the deferred look reaches them, not also in the urgent render of a pick.
  const pickStyle = useCallback(
    (choice: StyleChoice) => patch((current) => withStyle(current, choice)),
    [patch],
  );
  const pickShape = useCallback((shape: ShapeId) => patch({ shape }), [patch]);
  const pickColor = useCallback((color: ColorId) => patch({ color }), [patch]);
  const pickFace = useCallback((face: FaceStyle) => patch({ face }), [patch]);
  const pickState = useCallback((state: CharacterState) => patch({ state }), [patch]);

  const shuffle = () => {
    // The first group is the one the characters rest in; a random expression should not be a nap.
    const states = registry.stateGroups.slice(1).flatMap((group) => group.states);
    replace({
      ...preset,
      ...withStyle(preset, pick(styleChoices)),
      shape: pick(SHAPE_IDS),
      color: pick(COLOR_IDS),
      state: pick(states.length ? states : CHARACTER_STATES),
    });
  };

  return (
    <section className="site-home__hero" aria-labelledby="site-home-title" style={swatchVars(preset.color)}>
      <Wall styles={styleChoices} face={DEFAULT_PRESET.face} lineArt={backdrop === 'lineart'} />

      <StyleRail groups={registry.styles} preset={look} onPick={pickStyle} />

      <div className="site-home__centre">
        <div className="site-home__head">
          {bar}
          <h1 id="site-home-title" className="site-home__title">
            {t('home.title.lead')}
            <em>{t('home.title.em')}</em>
          </h1>
          <p className="site-home__tagline">{t('home.tagline')}</p>
        </div>

        <div className="site-home__stage">
          <span className="site-glow" aria-hidden="true" />
          <button
            type="button"
            className="site-home__poke"
            aria-label={t('home.poke')}
            onClick={() => mark.current?.bounce()}
            onPointerEnter={() => setEmphasis(true)}
            onPointerLeave={() => setEmphasis(false)}
          >
            <CharacterMark
              ref={mark}
              shape={preset.shape}
              color={preset.color}
              state={preset.state}
              styleId={preset.style}
              variant={preset.variant}
              styleOptions={preset.params}
              face={preset.face}
              sizeCss="var(--site-hero-mark)"
              emphasis={emphasis}
              followPointer
              autoPause
              antics
            />
          </button>
          <p className="site-home__now" aria-live="polite">
            {label.state(preset.state) || preset.state}
          </p>
        </div>

        <StateDock groups={registry.stateGroups} preset={look} onPick={pickState} />

        <div className="site-home__actions">
          <a className="site-home__start" href={path('/guide/getting-started')}>
            {t('home.start')}
            <ArrowIcon />
          </a>
          <CodeChip line={(format) => lineFor(format, preset)} copy={(format) => copyFor(format, preset)} />
          <TuneButton preset={preset} onChange={(params) => patch({ params })} />
          <ShareButton preset={preset} />
          <button
            type="button"
            className="site-home__tool"
            aria-label={t('home.random')}
            title={t('home.random')}
            onClick={shuffle}
          >
            <DiceIcon />
          </button>
        </div>
      </div>

      <ColorRail faces={registry.faces} preset={look} onColor={pickColor} onFace={pickFace} />

      <ShapeStrip families={registry.families} preset={look} onPick={pickShape} />
    </section>
  );
}
