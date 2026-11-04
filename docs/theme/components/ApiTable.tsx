import { useI18n } from '../../app/shared/i18n.js';
import api from '../generated/api.json';
import type { ApiData, ApiSource, ValueKind } from '../../api-schema.js';

const { components, values } = api as ApiData;

export interface ApiProps {
  /** Component name, without the `Props` suffix. */
  component: string;
}

/**
 * Props table for a component, generated from its TypeScript declaration.
 *
 * Nothing here is written by hand, so a prop that exists in the type but not
 * in the documentation is impossible.
 */
export function API({ component }: ApiProps) {
  const t = useI18n();
  const entry = components[component];

  if (!entry) {
    return (
      <p className="site-api__empty">
        {t('api.missing')} <code>{component}</code> — <code>pnpm --filter @aora-bot/docs api</code>
      </p>
    );
  }

  if (entry.props.length === 0) {
    return <p className="site-api__empty">{t('api.noProps')}</p>;
  }

  return (
    <div className="site-api">
      <table>
        <thead>
          <tr>
            <th>{t('api.prop')}</th>
            <th>{t('api.type')}</th>
            <th>{t('api.default')}</th>
            <th>{t('api.description')}</th>
          </tr>
        </thead>
        <tbody>
          {entry.props.map((prop) => (
            <tr key={prop.name}>
              <td>
                <code>{prop.name}</code>
                {prop.required && (
                  <abbr className="site-api__required" title={t('api.required')}>
                    *
                  </abbr>
                )}
              </td>
              <td>
                <code>{prop.type}</code>
              </td>
              <td>{prop.default ? <code>{prop.default}</code> : '—'}</td>
              <td>
                {prop.deprecated && <strong>{t('api.deprecated')} </strong>}
                {prop.description || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface ApiIndexProps {
  /** Restrict to exports from one package. */
  source?: ApiSource;
  /** Restrict to one kind of export. */
  kind?: ValueKind;
}

/**
 * Flat index of every export, so nothing in the public surface is unreachable
 * from the documentation.
 */
export function ApiIndex({ source, kind }: ApiIndexProps) {
  const t = useI18n();
  const rows = Object.values(values)
    .filter((v) => (source ? v.source === source : true))
    .filter((v) => (kind ? v.kind === kind : true))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="site-api">
      <table>
        <thead>
          <tr>
            <th>{t('api.export')}</th>
            <th>{t('api.kind')}</th>
            <th>{t('api.package')}</th>
            <th>{t('api.description')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>
                <code>{row.name}</code>
              </td>
              <td>{row.kind}</td>
              <td>
                <code>@aora-bot/{row.source}</code>
              </td>
              <td>{row.description.split('\n')[0] || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
