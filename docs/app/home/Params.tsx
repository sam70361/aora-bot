import { getStyle, paramsForVariant, type StyleParam } from '@aora-bot/engine';
import { useLabel } from '@aora-bot/react';
import { cleanParams, type ParamValue, type Preset } from '../shared/share.js';
import type { StyleChoice } from './registry.js';

/** A series' parameters stay with it: another series starts from its own defaults. */
export const withStyle = (preset: Preset, choice: StyleChoice): Partial<Preset> =>
  choice.style === preset.style ? choice : { ...choice, params: {} };

/** The current variant's parameters (`paramsForVariant`), and whether any has left its default. */
export function seriesParams(preset: Preset) {
  const series = getStyle(preset.style);
  return {
    series,
    params: Object.entries(paramsForVariant(series, preset.variant)),
    changed: Object.keys(preset.params).length > 0,
  };
}

/**
 * One row per parameter the current variant reads, so the list names no
 * parameter itself and a series registered later brings its own. Only values
 * that differ from the series' defaults are kept, which is also what the
 * snippet and the share link carry.
 */
export function ParamFields({
  preset,
  onChange,
}: {
  preset: Preset;
  onChange: (params: Preset['params']) => void;
}) {
  const label = useLabel();
  const { series, params } = seriesParams(preset);
  const defaults = series.defaults as Record<string, ParamValue>;
  const valueOf = (key: string): ParamValue => preset.params[key] ?? defaults[key]!;
  const set = (key: string, value: ParamValue) =>
    onChange(cleanParams(preset.style, { ...preset.params, [key]: value }));

  return params.map(([key, spec]) => (
    <Control
      key={`${preset.style}:${key}`}
      name={label.param(series.id, key, spec.label ?? key)}
      spec={spec}
      value={valueOf(key)}
      onChange={(value) => set(key, value)}
    />
  ));
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
