import {
  CharacterMark,
  CHARACTER_STATES,
  COLOR_IDS,
  SHAPE_IDS,
  getInkColorCss,
  useLabel,
  type CharacterHandle,
} from '@aora-bot/react';
import { useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { COPIED_RESET_MS, copyText } from '../shared/clipboard.js';
import { useI18n } from '../shared/i18n.js';
import { useLocalePath } from '../shared/locale-path.js';
import { DEFAULT_FACE, shareUrl, type Preset } from '../shared/share.js';
import { snippetFor, tagFor } from '../shared/snippet.js';
import { StateDock } from './Dock.js';
import { ArrowIcon, CheckIcon, CopyIcon, DiceIcon, LinkIcon } from './icons.js';
import { ColorRail, ShapeStrip, StyleRail } from './Rails.js';
import type { Registry, StyleChoice } from './registry.js';
import { TuneButton } from './Tune.js';
import { Wall } from './Wall.js';

export interface ConsoleProps {
  registry: Registry;
  preset: Preset;
  patch: (changes: Partial<Preset>) => void;
  replace: (preset: Preset) => void;
}

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

/** A series' parameters stay with it: another series starts from its own defaults. */
const withStyle = (preset: Preset, choice: StyleChoice): Partial<Preset> =>
  choice.style === preset.style ? choice : { ...choice, params: {} };

/**
 * The whole home page: one large character, with each thing you can change
 * about it in a floating capsule on its own edge — style on the left, colour
 * and face on the right, shape along the bottom, and the navbar on top —
 * expression and the series' parameters right under it, over a wall of
 * smaller ones.
 *
 * Every box in here has a fixed size and every list scrolls inside it, so a
 * registry that grows from forty shapes to a hundred changes what can be
 * scrolled to and nothing about the layout.
 */
export function Console({ registry, preset, patch, replace }: ConsoleProps) {
  const t = useI18n();
  const path = useLocalePath();
  const label = useLabel();
  const mark = useRef<CharacterHandle>(null);
  const [emphasis, setEmphasis] = useState(false);
  // The big character follows at once; the dozens of previews catch up when there is time, so a slider never stutters.
  const look = useDeferredValue(preset);

  const styleChoices = useMemo(() => registry.styles.flatMap((group) => group.choices), [registry]);

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
    <section
      className="site-home__hero"
      aria-labelledby="site-home-title"
      style={{ '--site-swatch': getInkColorCss(preset.color) } as CSSProperties}
    >
      <Wall styles={styleChoices} face={DEFAULT_FACE} />

      <StyleRail
        groups={registry.styles}
        preset={look}
        onPick={(choice) => patch(withStyle(preset, choice))}
      />

      <div className="site-home__centre">
        <div className="site-home__head">
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

        <StateDock groups={registry.stateGroups} preset={look} onPick={(state) => patch({ state })} />

        <div className="site-home__actions">
          <a className="site-home__start" href={path('/guide/getting-started')}>
            {t('home.start')}
            <ArrowIcon />
          </a>
          <CodeChip preset={preset} />
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

      <ColorRail
        faces={registry.faces}
        preset={look}
        onColor={(color) => patch({ color })}
        onFace={(face) => patch({ face })}
      />

      <ShapeStrip families={registry.families} preset={look} onPick={(shape) => patch({ shape })} />
    </section>
  );
}

/** A button that says "copied" for a moment, without its box changing size. */
function useCopied(): [boolean, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  return [copied, async (text) => setCopied(await copyText(text))];
}

/** The character's own markup on one line; copying gives the whole snippet, imports included. */
function CodeChip({ preset }: { preset: Preset }) {
  const t = useI18n();
  const [copied, copy] = useCopied();
  const tag = tagFor(preset);

  return (
    <button
      type="button"
      className="site-home__chip"
      aria-label={t('home.copyCode')}
      title={tag}
      onClick={() => copy(snippetFor(preset))}
    >
      <code>{tag}</code>
      <span className="site-home__chipIcon" data-copied={copied || undefined}>
        <CopyIcon />
        <CheckIcon />
      </span>
      <span className="site-home__sr" aria-live="polite">
        {copied ? t('home.copied') : ''}
      </span>
    </button>
  );
}

function ShareButton({ preset }: { preset: Preset }) {
  const t = useI18n();
  const [copied, copy] = useCopied();

  return (
    <button
      type="button"
      className="site-home__tool"
      data-copied={copied || undefined}
      aria-label={t('home.share')}
      title={t('home.share')}
      onClick={() => copy(shareUrl(preset))}
    >
      <LinkIcon />
      <CheckIcon />
      <span className="site-home__sr" aria-live="polite">
        {copied ? t('home.copied') : ''}
      </span>
    </button>
  );
}
