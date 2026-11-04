import { STATE_CUTE_EYES, STATE_CUTE_MOUTH, STATE_FX } from '@aora-bot/engine';
import {
  CHARACTER_STATES,
  EMOTIONS,
  FACE_STYLES,
  MarkStageProvider,
  STATE_BELT,
  STATE_EYE_TOPOLOGIES,
  STATE_MOUTH,
  StagedMark,
  isHudKind,
  useLabel,
  type CharacterState,
  type FaceStyle,
  type HudKind,
} from '@aora-bot/react';
import { useState } from 'react';
import { useI18n, useLocalized, type MessageKey } from '../../app/shared/i18n.js';
import { buildStateGroups } from '../../app/shared/state-groups.js';

type StateMatrixColumn = 'preview' | 'eyes' | 'mouth' | 'effect' | 'id' | 'hud';

export interface StateMatrixProps {
  /** Which states to list. Defaults to every state, in engine order. */
  states?: readonly CharacterState[];
  /** Split the table by state group, with a heading per group. */
  groups?: boolean;
}

/** Preview size in the first column. Effects need the room to read. */
const MATRIX_MARK_PX = 56;

const COLUMNS: readonly StateMatrixColumn[] = ['preview', 'eyes', 'mouth', 'effect', 'id', 'hud'];

/*
 * Which dial suits which state. A suggestion rather than a rule — the engine
 * has no such table, because a HUD is data the host has and a state is what
 * the agent is doing, and the two are independent by design. But a reader
 * planning a screen wants to know that `working` pairs naturally with
 * `progress` and `sleeping` with `clock`, so the pairings are written down here
 * and checked against `HUD_KINDS` so a renamed kind cannot survive unnoticed.
 */
const HUD_SUGGESTION: Partial<Record<CharacterState, readonly string[]>> = {
  thinking: ['context'],
  progress: ['progress'],
  dictating: ['voice'],
  notifying: ['notify'],
  waiting: ['timer'],
  sleeping: ['clock'],
  uploading: ['sync'],
  working: ['gauge'],
  messaging: ['notify'],
  celebrate: ['kpi'],
};

const hudFor = (state: CharacterState): HudKind[] => (HUD_SUGGESTION[state] ?? []).filter(isHudKind);

const HEADER_KEY = {
  state: 'matrix.state',
  eyes: 'matrix.eyes',
  mouth: 'matrix.mouth',
  effect: 'matrix.effect',
  id: 'matrix.id',
  hud: 'matrix.hud',
} as const satisfies Record<Exclude<StateMatrixColumn, 'preview'> | 'state', MessageKey>;

/**
 * Every state as a row: what it looks like, what it wears and what it is
 * called on the wire.
 *
 * Everything but the HUD column is read from the engine's own tables when the
 * page renders, so the matrix cannot fall out of step with the code. The
 * previews share one stage, and the face switch changes every row at once —
 * the point of the switch is to compare the faces, which separate tables would
 * not let you do. The effect column is the cute face's effect (`STATE_FX`); on
 * `eyes` and `line` it is the belt the state hands its body to.
 */
export function StateMatrix({ states = CHARACTER_STATES, groups = false }: StateMatrixProps) {
  const label = useLabel();
  const site = useI18n();
  const text = useLocalized();
  const [face, setFace] = useState<FaceStyle>(FACE_STYLES[0]);
  const wanted = new Set<CharacterState>(states);

  const sections = groups
    ? buildStateGroups()
        .map((group) => ({
          key: group.id,
          // The leftovers group has no key in the kit's locale table, so it
          // falls back to the caption `buildStateGroups` gave it.
          title: label.stateGroup(group.id, group.label),
          states: group.states.filter((state) => wanted.has(state)),
        }))
        .filter((section) => section.states.length > 0)
    : [{ key: 'all', title: null, states: states.slice() }];

  return (
    <MarkStageProvider maxSources={CHARACTER_STATES.length}>
      <div className="site-matrix">
        <div className="site-matrix__bar" role="radiogroup" aria-label={site('pg.faceStyle')}>
          {FACE_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              role="radio"
              aria-checked={face === style}
              className="site-btn"
              data-active={face === style ? 'true' : undefined}
              onClick={() => setFace(style)}
            >
              {text.pair(label.face(style), style)}
            </button>
          ))}
        </div>
        {sections.map((section) => (
          <section key={section.key}>
            {section.title && <h3>{section.title}</h3>}
            <table>
              <thead>
                <tr>
                  <th className="site-matrix__mark" />
                  <th>{site(HEADER_KEY.state)}</th>
                  {COLUMNS.filter((column) => column !== 'preview').map((column) => (
                    <th key={column}>{site(HEADER_KEY[column])}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.states.map((state) => (
                  <Row key={state} state={state} face={face} />
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </MarkStageProvider>
  );
}

function Row({ state, face }: { state: CharacterState; face: FaceStyle }) {
  const label = useLabel();
  const cute = face === 'cute';
  const belt = STATE_BELT[state];
  const fx = STATE_FX[state];
  const mouth = cute ? STATE_CUTE_MOUTH[state] : STATE_MOUTH[state];
  const ids = EMOTIONS.filter((emotion) => emotion.state === state);

  return (
    <tr>
      <td className="site-matrix__mark">
        <StagedMark
          shape="mochi"
          color="blue"
          state={state}
          face={face}
          nose={face === 'line' ? 'slant' : null}
          sizePx={MATRIX_MARK_PX}
        />
      </td>
      <td>
        <code>{state}</code>
        <span className="site-matrix__name">{label.state(state)}</span>
      </td>
      {COLUMNS.map((column) => {
        switch (column) {
          case 'eyes':
            return (
              <td key={column} className="site-matrix__chips">
                {/* The cycle order, with repeats: `idle` returns to its resting
                    eye between glances, and that is the information. */}
                <code>{(cute ? STATE_CUTE_EYES : STATE_EYE_TOPOLOGIES)[state].join(' → ')}</code>
              </td>
            );
          case 'mouth':
            return (
              <td key={column}>
                <code>{mouth}</code>
                {!cute && <span className="site-matrix__name">{label.mouth(STATE_MOUTH[state])}</span>}
              </td>
            );
          case 'effect': {
            const effect = cute ? fx : belt;
            return (
              <td key={column}>
                {effect ? (
                  <>
                    <code>{effect}</code>
                    {!cute && belt && <span className="site-matrix__name">{label.belt(belt)}</span>}
                  </>
                ) : (
                  <span className="site-matrix__none">—</span>
                )}
              </td>
            );
          }
          case 'id':
            return (
              <td key={column} className="site-matrix__chips">
                {ids.map((emotion) => (
                  <code key={emotion.id} title={emotion.name.en} data-oneshot={emotion.oneshot || undefined}>
                    {emotion.id}
                  </code>
                ))}
              </td>
            );
          case 'hud': {
            const kinds = hudFor(state);
            return (
              <td key={column} className="site-matrix__chips">
                {kinds.length > 0 ? (
                  kinds.map((kind) => (
                    <code key={kind} title={label.hud(kind)}>
                      {kind}
                    </code>
                  ))
                ) : (
                  <span className="site-matrix__none">—</span>
                )}
              </td>
            );
          }
          default:
            return null;
        }
      })}
    </tr>
  );
}
