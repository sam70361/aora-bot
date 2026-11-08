import {
  CharacterMark,
  COLOR_IDS,
  DEFAULT_FACE,
  prefersReducedMotion,
  useLabel,
  type CharacterHandle,
  type CharacterPreset,
  type CharacterState,
} from '@aora-bot/react';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { CodeChip, ShareButton } from '../shared/CopyControls.js';
import { useI18n, useLocalized } from '../shared/i18n.js';
import { NextIcon, PauseIcon, PlayIcon, PrevIcon } from '../shared/icons.js';
import { Radio, RadioGroup, ScrollRootProvider } from '../shared/Radio.js';
import { DEFAULT_PRESET, type Preset } from '../shared/share.js';
import { swatchVars } from '../shared/swatch.js';
import { copyFor, lineFor } from '../shared/snippet.js';
import type { StateGroup } from '../shared/state-groups.js';
import { ParamFields, seriesParams, withStyle } from './Params.js';
import { lookOf, Preview } from './Rails.js';
import type { ViewProps } from './views.js';
import { Wall } from './Wall.js';

/** How long autoplay holds each state, in ms, and the one it starts on. */
const INTERVALS = [1000, 2000, 4000] as const;
const DEFAULT_INTERVAL = 2000;

const pad = (n: number) => String(n).padStart(2, '0');

const faceOf = (member: CharacterPreset) => member.face ?? DEFAULT_FACE;

/** The cast member the preset is, if it is one: same body and colour. */
const memberOf = (cast: readonly CharacterPreset[], preset: Preset) =>
  cast.find((member) => member.shape === preset.shape && member.color === preset.color);

const groupOf = (groups: StateGroup[], state: CharacterState) =>
  (groups.find((g) => g.states.includes(state)) ?? groups[0])?.id ?? '';

/** The state `by` places along `states` from `state`; a state outside the list starts it from its end. */
const neighbour = (states: readonly CharacterState[], state: CharacterState, by: number) => {
  const at = states.indexOf(state);
  if (at < 0) return states[by > 0 ? 0 : states.length - 1]!;
  return states[(at + by + states.length) % states.length]!;
};

/** Scroll `track` sideways so the option for `value` sits in its middle, without scrolling the page. */
function useCentred(track: HTMLElement | null, value: string) {
  const smooth = useRef(false);
  useEffect(() => {
    const current = track?.querySelector<HTMLElement>(`[data-value="${CSS.escape(value)}"]`);
    if (!track || !current) return;
    track.scrollTo({
      left: current.offsetLeft - track.clientWidth / 2 + current.offsetWidth / 2,
      behavior: smooth.current && !prefersReducedMotion() ? 'smooth' : 'auto',
    });
    smooth.current = true;
  }, [track, value]);
}

/**
 * The home page as an album page. Along the top the cast as cards, and a bar
 * with the view switch, the state groups, the autoplay interval and the play
 * button. In the middle the character, large, stepping through the chosen
 * group's states; under it those states in order, numbered across the whole
 * set and named by id. Beside it the properties panel: who it is, what it is
 * drawn with, and every colour, face, style and parameter to change. Behind
 * it, the console's wall.
 *
 * It edits the same preset as the console, so switching views keeps the
 * character, and every list is drawn from the registry.
 */
export function Exhibit({ registry, preset, patch, backdrop, bar }: ViewProps) {
  const t = useI18n();
  const text = useLocalized();
  const label = useLabel();
  const mark = useRef<CharacterHandle>(null);
  const look = useDeferredValue(preset);
  const groups = registry.stateGroups;
  const order = useMemo(() => groups.flatMap((group) => group.states), [groups]);
  const styleChoices = useMemo(() => registry.styles.flatMap((group) => group.choices), [registry]);

  const [groupId, setGroupId] = useState(() => groupOf(groups, preset.state));
  const group = groups.find((g) => g.id === groupId) ?? groups[0];
  const [hold, setHold] = useState<number>(DEFAULT_INTERVAL);
  const [playing, setPlaying] = useState(false);
  const [castTrack, setCastTrack] = useState<HTMLDivElement | null>(null);
  const [stateTrack, setStateTrack] = useState<HTMLDivElement | null>(null);

  const member = memberOf(registry.cast, preset);
  useCentred(castTrack, member?.id ?? '');
  useCentred(stateTrack, preset.state);

  const states = group?.states ?? order;
  const step = useCallback(
    (by: number) => patch((current) => ({ state: neighbour(states, current.state, by) })),
    [patch, states],
  );

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => step(1), hold);
    return () => window.clearInterval(timer);
  }, [playing, hold, step]);

  const pickGroup = (next: StateGroup) => {
    setGroupId(next.id);
    if (!next.states.includes(preset.state)) patch({ state: next.states[0]! });
  };

  const { series, params, changed } = seriesParams(preset);
  const stateName = (state: CharacterState) => label.state(state) || state;
  const seriesName = label.style(series.id, series.label);

  return (
    <section className="site-exhibit" aria-labelledby="site-exhibit-title" style={swatchVars(preset.color)}>
      <Wall styles={styleChoices} face={DEFAULT_PRESET.face} lineArt={backdrop === 'lineart'} />

      <h1 id="site-exhibit-title" className="site-home__sr">
        {t('home.exhibit.title')}
      </h1>

      <div className="site-capsule site-exhibit__bar">
        {bar}
        <div className="site-home__tabs" role="tablist" aria-label={t('home.exhibit.group')}>
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={g.id === group?.id}
              className="site-home__tab"
              onClick={() => pickGroup(g)}
            >
              {label.stateGroup(g.id, g.label)}
              <small>{g.states.length}</small>
            </button>
          ))}
        </div>
        <div className="site-exhibit__play">
          <RadioGroup label={t('home.exhibit.interval')} className="site-home__tabs">
            {INTERVALS.map((ms) => (
              <Radio
                key={ms}
                value={String(ms)}
                className="site-home__tab"
                checked={ms === hold}
                label={`${t('home.exhibit.interval')} ${ms / 1000}s`}
                onSelect={() => setHold(ms)}
              >
                {ms / 1000}s
              </Radio>
            ))}
          </RadioGroup>
          <button
            type="button"
            className="site-home__tool"
            aria-pressed={playing}
            aria-label={t('home.exhibit.play')}
            title={t('home.exhibit.play')}
            data-active={playing || undefined}
            onClick={() => setPlaying((on) => !on)}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
        </div>
      </div>

      <div className="site-capsule site-exhibit__castBox">
        <ScrollRootProvider value={castTrack}>
          <RadioGroup ref={setCastTrack} label={t('home.exhibit.cast')} className="site-exhibit__cast">
            {registry.cast.map((m) => (
              <Radio
                key={m.id}
                value={m.id}
                className="site-home__opt site-exhibit__card"
                checked={m === member}
                label={text.pair(text.pick(m.name), text.other(m.name))}
                onSelect={() => patch({ shape: m.shape, color: m.color, face: faceOf(m) })}
              >
                <Preview
                  sizePx={52}
                  margin="0px 200px"
                  shape={m.shape}
                  color={m.color}
                  style={look.style}
                  variant={look.variant}
                  styleOptions={look.params}
                  face={faceOf(m)}
                />
                <span className="site-home__optName">{text.pick(m.name)}</span>
                <span className="site-exhibit__gloss">{text.other(m.name)}</span>
              </Radio>
            ))}
          </RadioGroup>
        </ScrollRootProvider>
      </div>

      <div className="site-exhibit__stage">
        <button
          type="button"
          className="site-home__nav"
          aria-label={t('home.exhibit.prev')}
          onClick={() => step(-1)}
        >
          <PrevIcon />
        </button>
        <button
          type="button"
          className="site-home__poke site-exhibit__figure"
          aria-label={t('home.poke')}
          onClick={() => mark.current?.bounce()}
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
            sizeCss="var(--site-exhibit-mark)"
            followPointer
            autoPause
          />
        </button>
        <button
          type="button"
          className="site-home__nav"
          aria-label={t('home.exhibit.next')}
          onClick={() => step(1)}
        >
          <NextIcon />
        </button>
        <p className="site-exhibit__caption" aria-live="polite">
          <span className="site-exhibit__no">{pad(order.indexOf(preset.state))}</span>
          {stateName(preset.state)}
          <code>{preset.state}</code>
        </p>
      </div>

      <div className="site-capsule site-exhibit__statesBox">
        <ScrollRootProvider value={stateTrack}>
          <RadioGroup
            key={group?.id}
            ref={setStateTrack}
            label={t('home.rail.state')}
            className="site-exhibit__states"
          >
            {states.map((state) => (
              <Radio
                key={state}
                value={state}
                className="site-home__opt site-exhibit__state"
                checked={state === preset.state}
                label={stateName(state)}
                onSelect={() => patch({ state })}
              >
                <span className="site-exhibit__no">{pad(order.indexOf(state))}</span>
                <Preview
                  sizePx={44}
                  margin="0px 160px"
                  shape={look.shape}
                  color={look.color}
                  state={state}
                  {...lookOf(look)}
                />
                <span className="site-home__optName">{stateName(state)}</span>
              </Radio>
            ))}
          </RadioGroup>
        </ScrollRootProvider>
      </div>

      <aside className="site-capsule site-exhibit__panel" aria-labelledby="site-exhibit-who">
        <header className="site-exhibit__who">
          <h2 id="site-exhibit-who">
            {member ? text.pick(member.name) : label.shape(preset.shape) || preset.shape}
            {member ? <small>{text.other(member.name)}</small> : null}
          </h2>
          {member ? <p>{text.pick(member.desc)}</p> : null}
        </header>

        <dl className="site-exhibit__props">
          <Prop
            name={t('home.rail.shape')}
            value={label.shape(preset.shape) || preset.shape}
            id={preset.shape}
          />
          <Prop
            name={t('home.rail.color')}
            value={label.color(preset.color) || preset.color}
            id={preset.color}
          >
            <span className="site-exhibit__ink" />
          </Prop>
          <Prop name={t('home.rail.face')} value={label.face(preset.face) || preset.face} id={preset.face} />
          <Prop
            name={t('home.rail.style')}
            value={text.pair(label.variant(preset.variant), seriesName)}
            id={`${preset.style}/${preset.variant}`}
          />
          <Prop name={t('home.rail.state')} value={stateName(preset.state)} id={preset.state} />
        </dl>

        <Section title={t('home.rail.color')}>
          <RadioGroup label={t('home.rail.color')} className="site-exhibit__grid site-exhibit__grid--dots">
            {COLOR_IDS.map((color) => (
              <Radio
                key={color}
                value={color}
                className="site-home__dot"
                checked={color === preset.color}
                label={label.color(color) || color}
                onSelect={() => patch({ color })}
              >
                <span className="site-home__swatch" style={swatchVars(color)} />
              </Radio>
            ))}
          </RadioGroup>
        </Section>

        <Section title={t('home.rail.face')}>
          <RadioGroup label={t('home.rail.face')} className="site-exhibit__grid">
            {registry.faces.map((face) => (
              <Radio
                key={face}
                value={face}
                className="site-home__opt site-home__opt--face"
                checked={face === preset.face}
                label={label.face(face) || face}
                onSelect={() => patch({ face })}
              >
                <Preview
                  sizePx={32}
                  margin="120px"
                  shape={look.shape}
                  color={look.color}
                  style={look.style}
                  variant={look.variant}
                  styleOptions={look.params}
                  face={face}
                />
              </Radio>
            ))}
          </RadioGroup>
        </Section>

        <Section title={t('home.rail.style')}>
          <RadioGroup label={t('home.rail.style')} className="site-exhibit__grid">
            {registry.styles.flatMap((g) =>
              g.choices.map((choice) => {
                const name =
                  g.choices.length === 1 ? label.style(g.id, g.label) : label.variant(choice.variant);
                return (
                  <Radio
                    key={`${choice.style}:${choice.variant}`}
                    value={`${choice.style}:${choice.variant}`}
                    className="site-home__opt site-home__opt--face"
                    checked={choice.style === preset.style && choice.variant === preset.variant}
                    label={text.pair(name, label.style(g.id, g.label))}
                    onSelect={() => patch((current) => withStyle(current, choice))}
                  >
                    <Preview
                      sizePx={32}
                      margin="120px"
                      shape={look.shape}
                      color={look.color}
                      style={choice.style}
                      variant={choice.variant}
                      face={look.face}
                      styleOptions={choice.style === look.style ? look.params : undefined}
                    />
                  </Radio>
                );
              }),
            )}
          </RadioGroup>
        </Section>

        {params.length > 0 ? (
          <Section
            title={t('home.tune')}
            action={
              <button
                type="button"
                className="site-home__tuneReset"
                disabled={!changed}
                onClick={() => patch({ params: {} })}
              >
                {t('home.tune.reset')}
              </button>
            }
          >
            <div className="site-exhibit__params">
              <ParamFields preset={preset} onChange={(next) => patch({ params: next })} />
            </div>
          </Section>
        ) : null}

        <div className="site-exhibit__actions">
          <CodeChip line={(format) => lineFor(format, preset)} copy={(format) => copyFor(format, preset)} />
          <ShareButton preset={preset} />
        </div>
      </aside>
    </section>
  );
}

function Prop({
  name,
  value,
  id,
  children,
}: {
  name: string;
  value: string;
  id: string;
  children?: ReactNode;
}) {
  return (
    <div className="site-exhibit__prop">
      <dt>{name}</dt>
      <dd>
        {children}
        {value}
        <code>{id}</code>
      </dd>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="site-exhibit__section">
      <div className="site-exhibit__sectionHead">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
