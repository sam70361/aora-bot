import {
  EMOTIONS,
  EMOTION_SEGMENTS,
  MarkStageProvider,
  SEGMENT_FALLBACK,
  StagedMark,
  useLabel,
  type ColorId,
  type ShapeId,
} from '@aora-bot/react';
import { useI18n, useLocalized } from '../../app/shared/i18n.js';
import { TABLE_SOURCES } from '../../app/shared/constants.js';

/**
 * The emotion protocol, one table per segment.
 *
 * Every row carries a live mark so the reader can see what an id does rather
 * than infer it from a state name. Rows share one stage: forty-odd ids map
 * onto far fewer distinct states, so the whole table costs a dozen engines.
 */
export function ProtocolTable({ shape = 'blob' as ShapeId, color = 'blue' as ColorId }) {
  const t = useI18n();
  const label = useLabel();
  const text = useLocalized();

  return (
    <MarkStageProvider maxSources={TABLE_SOURCES}>
      {EMOTION_SEGMENTS.map((segment) => {
        const rows = EMOTIONS.filter((e) => {
          const n = Number.parseInt(e.id, 10);
          return n >= segment.range[0] && n <= segment.range[1];
        });
        const fallback = SEGMENT_FALLBACK[segment.id];
        return (
          <section key={segment.id} className="site-protocol">
            <h3>
              {text.both(segment.name)}
              <span className="site-protocol__range">
                {pad(segment.range[0])}–{pad(segment.range[1])}
              </span>
            </h3>
            <div className="site-table">
              <table>
                <thead>
                  <tr>
                    <th>{t('protocol.id')}</th>
                    <th />
                    <th>{t('protocol.name')}</th>
                    <th>{t('protocol.state')}</th>
                    <th>{t('protocol.kind')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => {
                    const stateName = label.state(e.state);
                    return (
                      <tr key={e.id} data-fallback={e.id === fallback || undefined}>
                        <td>
                          <code>{e.id}</code>
                        </td>
                        <td className="site-protocol__mark">
                          <StagedMark shape={shape} color={color} state={e.state} sizePx={48} />
                        </td>
                        <td>{text.both(e.name)}</td>
                        <td>
                          <code>{e.state}</code>
                          {stateName && <em className="site-protocol__zh">{stateName}</em>}
                        </td>
                        <td>
                          <span className="site-protocol__kind" data-oneshot={e.oneshot || undefined}>
                            {e.oneshot ? t('protocol.event') : t('protocol.condition')}
                          </span>
                          {e.id === fallback && (
                            <span className="site-protocol__kind">{t('protocol.fallback')}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </MarkStageProvider>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
