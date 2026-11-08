import { getStyle, paramsForVariant, type StyleParam } from '@aora-bot/engine';
import { useLabel } from '@aora-bot/react';
import { useEffect, useId, useRef } from 'react';
import { useI18n, useLocalized } from '../shared/i18n.js';
import { cleanParams, type ParamValue, type Preset } from '../shared/share.js';
import { TuneIcon } from '../shared/icons.js';

/** Room kept between the panel and the button, and between the panel and the screen's edge, in px. */
const PANEL_GAP = 12;

/**
 * The series parameters, behind a button in the action row.
 *
 * The panel lists what the current variant reads (`paramsForVariant`), so it
 * names no parameter itself and a series registered later brings its own. It
 * is a native popover: it sits in the top layer, so no capsule clips it, and
 * it closes on Escape or a click elsewhere. Only values that differ from the
 * series' defaults are kept, which is also what the snippet and the share
 * link carry.
 */
export function TuneButton({
  preset,
  onChange,
}: {
  preset: Preset;
  onChange: (params: Preset['params']) => void;
}) {
  const t = useI18n();
  const text = useLocalized();
  const label = useLabel();
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const series = getStyle(preset.style);
  const params = Object.entries(paramsForVariant(series, preset.variant));
  const defaults = series.defaults as Record<string, ParamValue>;
  const valueOf = (key: string): ParamValue => preset.params[key] ?? defaults[key]!;
  const set = (key: string, value: ParamValue) =>
    onChange(cleanParams(preset.style, { ...preset.params, [key]: value }));
  const changed = Object.keys(preset.params).length > 0;
  const none = params.length === 0;

  // Moving to a variant with nothing to tune must not leave an empty panel open.
  useEffect(() => {
    const el = panel.current;
    if (none && el?.matches(':popover-open')) el.hidePopover();
  }, [none]);

  // Opened above the button, centred on it and kept on screen. It is measured as it opens, so a resize closes it rather than leave it adrift.
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const close = () => el.hidePopover();
    const place = (event: Event) => {
      if ((event as ToggleEvent).newState !== 'open' || !button.current) return;
      const anchor = button.current.getBoundingClientRect();
      const width = Math.min(el.offsetWidth || 320, window.innerWidth - PANEL_GAP * 2);
      const left = Math.min(
        Math.max(anchor.left + anchor.width / 2 - width / 2, PANEL_GAP),
        window.innerWidth - width - PANEL_GAP,
      );
      el.style.left = `${left}px`;
      el.style.bottom = `${window.innerHeight - anchor.top + PANEL_GAP}px`;
    };
    el.addEventListener('beforetoggle', place);
    window.addEventListener('resize', close);
    return () => {
      el.removeEventListener('beforetoggle', place);
      window.removeEventListener('resize', close);
    };
  }, []);

  return (
    <>
      <button
        ref={button}
        type="button"
        className="site-home__tool"
        popoverTarget={none ? undefined : id}
        aria-label={t('home.tune')}
        aria-disabled={none || undefined}
        title={none ? t('home.tune.none') : t('home.tune')}
        data-active={changed || undefined}
      >
        <TuneIcon />
      </button>
      <div ref={panel} id={id} popover="auto" className="site-home__tune" aria-label={t('home.tune')}>
        <div className="site-home__tuneHead">
          <p className="site-home__tuneTitle">
            {t('home.tune')}
            <span>{text.pair(label.variant(preset.variant), label.style(series.id, series.label))}</span>
          </p>
          <button
            type="button"
            className="site-home__tuneReset"
            disabled={!changed}
            onClick={() => onChange({})}
          >
            {t('home.tune.reset')}
          </button>
        </div>
        {params.map(([key, spec]) => (
          <Control
            key={`${preset.style}:${key}`}
            name={label.param(series.id, key, spec.label ?? key)}
            spec={spec}
            value={valueOf(key)}
            onChange={(value) => set(key, value)}
          />
        ))}
      </div>
    </>
  );
}

function Control({
  name,
  spec,
  value,
  onChange,
}: {
  name: string;
  spec: StyleParam;
  value: ParamValue;
  onChange: (value: ParamValue) => void;
}) {
  if (spec.type === 'number') {
    return (
      <label className="site-home__tuneRow">
        <span>{name}</span>
        <input
          type="range"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={Number(value)}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <output>{Number(value)}</output>
      </label>
    );
  }
  if (spec.type === 'boolean') {
    return (
      <label className="site-home__tuneRow">
        <span>{name}</span>
        <input
          type="checkbox"
          role="switch"
          className="site-home__switch"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
    );
  }
  return (
    <div className="site-home__tuneRow" role="radiogroup" aria-label={name}>
      <span>{name}</span>
      <div className="site-home__tuneOptions">
        {spec.options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            className="site-home__tuneOption"
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
