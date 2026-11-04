import { getStyle, paramsForVariant } from '@aora-bot/engine';
import { CharacterMark, useLabel, type ColorId, type ShapeId } from '@aora-bot/react';
import { useState } from 'react';
import { useI18n } from '../../app/shared/i18n.js';

export interface StyleParamsDemoProps {
  /** The series to tune. Its variants and parameters are read from the registry. */
  style?: string;
  shape?: ShapeId;
  color?: ColorId;
}

/**
 * One series with live controls for the parameters its current variant reads.
 *
 * The controls come from `paramsForVariant`, so switching variant swaps the
 * set: nothing here names a parameter, and a series registered later gets its
 * own panel. A value changed under one variant is kept under the others, which
 * is how the engine treats it too: it resolves, it just draws nothing there.
 */
export function StyleParamsDemo({ style = 'vector', shape = 'mochi', color = 'blue' }: StyleParamsDemoProps) {
  const t = useI18n();
  const label = useLabel();
  const series = getStyle(style);
  const [variant, setVariant] = useState(series.defaultVariant);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const params = Object.entries(paramsForVariant(series, variant));
  const set = (key: string, value: unknown) => setValues((current) => ({ ...current, [key]: value }));
  const current = (key: string) => values[key] ?? (series.defaults as Record<string, unknown>)[key];

  return (
    <div className="site-demo site-demo--column">
      <div className="site-demo site-demo--center site-demo--bare">
        <CharacterMark
          shape={shape}
          color={color}
          styleId={style}
          variant={variant}
          styleOptions={values}
          sizePx={150}
        />
      </div>
      <div className="site-controls" style={{ justifyContent: 'center' }}>
        <div className="site-controls" role="radiogroup" aria-label={t('pg.variant')}>
          {series.variants.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={variant === id}
              className="site-btn"
              data-active={variant === id ? 'true' : undefined}
              onClick={() => setVariant(id)}
            >
              {label.variant(id)}
            </button>
          ))}
        </div>
      </div>
      <div className="site-controls" style={{ justifyContent: 'center' }}>
        {params.length === 0 && <span className="site-field">{t('pg.noParams')}</span>}
        {params.map(([key, spec]) => {
          const name = label.param(style, key, spec.label ?? key);
          if (spec.type === 'number') {
            const value = Number(current(key));
            return (
              <label className="site-field" key={key}>
                {name}
                <input
                  type="range"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={value}
                  onChange={(event) => set(key, Number(event.target.value))}
                />
                <code>{value}</code>
              </label>
            );
          }
          if (spec.type === 'boolean') {
            return (
              <label className="site-field" key={key}>
                <input
                  type="checkbox"
                  checked={Boolean(current(key))}
                  onChange={(event) => set(key, event.target.checked)}
                />
                {name}
              </label>
            );
          }
          return (
            <div className="site-controls" role="radiogroup" aria-label={name} key={key}>
              {spec.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={current(key) === option}
                  className="site-btn"
                  data-active={current(key) === option ? 'true' : undefined}
                  onClick={() => set(key, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
