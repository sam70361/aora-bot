import { CUTE_MOUTH_IDS, DRAWN_FACE_STYLES, listStyles } from '@aora-bot/engine';
import {
  CHARACTER_STATES,
  COLOR_IDS,
  CharacterMark,
  EYE_TOPOLOGY_IDS,
  FACE_STYLES,
  MOUTHS,
  MOUTH_IDS,
  CharacterStageProvider,
  NOSE_IDS,
  SHAPE_IDS,
  STATE_GROUPS,
  STATE_MOUTH,
  StagedMark,
  renderStaticSvgDataUrl,
  useLabel,
  type CharacterState,
  type ColorId,
  type FaceStyle,
  type MouthId,
  type NoseId,
  type ShapeId,
} from '@aora-bot/react';
import { useState } from 'react';
import { useI18n, useLocalized } from '../../app/shared/i18n.js';
import { TABLE_SOURCES } from '../../app/shared/constants.js';
import { Cell } from './Cell.js';
import { Menu } from '../../app/shared/Menu.js';

/*
 * Demos for the faces: the cute mouths, the line face's nose and mouths, the drawn faces across states,
 * series and colours, and the switch between styles.
 *
 * The static grids use `renderStaticSvgDataUrl` so the geometry can be
 * compared at rest; the live demos mount real characters so the morph between
 * mouths and the ease between face styles can be seen.
 */

type NameKind = 'mouth' | 'nose' | 'expression' | 'state' | 'face' | 'shape' | 'group';

/**
 * Display names for the ids these grids iterate, from the kit's locale table.
 * `face`, `nose` and `group` have keys but no `Labels` accessor, so they go
 * through `useLabel()`, which builds the key from the id.
 */
function useDisplayName(): (kind: NameKind, id: string) => string | null {
  const label = useLabel();
  return (kind, id) => {
    switch (kind) {
      case 'mouth':
        return label.mouth(id as MouthId);
      case 'expression':
        return label.expression(id as (typeof EYE_TOPOLOGY_IDS)[number]);
      case 'state':
        return label.state(id as CharacterState);
      case 'shape':
        return label.shape(id as ShapeId);
      case 'face':
        return label.face(id as FaceStyle);
      case 'nose':
        return label.nose(id as NoseId);
      case 'group':
        return label.stateGroup(id);
    }
  };
}

/** The same character in every face style, with a live switch between them. */
export function FaceStyleDemo({ shape = 'mochi' as ShapeId, color = 'blue' as ColorId }) {
  const t = useI18n();
  const text = useLocalized();
  const label = useDisplayName();
  const [face, setFace] = useState<FaceStyle>(FACE_STYLES[0]);
  const [state, setState] = useState<CharacterState>('happy');

  return (
    <div className="site-demo site-demo--column">
      <div className="site-demo site-demo--center site-demo--bare">
        <CharacterMark shape={shape} color={color} state={state} face={face} sizePx={150} />
      </div>
      <div className="site-controls" style={{ justifyContent: 'center' }}>
        <div className="site-controls" role="radiogroup" aria-label={t('pg.faceStyle')}>
          {FACE_STYLES.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={face === f}
              className="site-btn"
              data-active={face === f ? 'true' : undefined}
              onClick={() => setFace(f)}
            >
              {text.pair(label('face', f) || f, f)}
            </button>
          ))}
        </div>
        <Menu
          label={t('pg.state')}
          value={state}
          onChange={setState}
          options={CHARACTER_STATES.map((item) => ({
            value: item,
            label: label('state', item) || item,
            hint: item,
          }))}
        />
      </div>
    </div>
  );
}

/** One state in every face style side by side, drawn statically. */
export function FaceStyleRow({
  shape = 'mochi' as ShapeId,
  color = 'blue' as ColorId,
  state = 'happy' as CharacterState,
}) {
  const label = useDisplayName();
  return (
    <div className="site-swatches">
      {FACE_STYLES.map((face) => (
        <div className="site-swatch" key={face}>
          <Cell id={face} name={label('face', face)}>
            <img src={renderStaticSvgDataUrl({ shape, color, state, face })} width={96} height={96} alt="" />
          </Cell>
        </div>
      ))}
    </div>
  );
}

/** The states a drawn-face grid shows by default: rest, the strongest feelings, sleep and a busy state. */
const DRAWN_FACE_STATES: readonly CharacterState[] = [
  'idle',
  'happy',
  'laughing',
  'angry',
  'sad',
  'surprised',
  'sleeping',
  'thinking',
  'celebrate',
];

/** Every drawn face across a spread of states, drawn statically: each row one face, each column one state. */
export function DrawnFaceGrid({
  shape = 'mochi' as ShapeId,
  color = 'blue' as ColorId,
  states = DRAWN_FACE_STATES,
}) {
  const label = useDisplayName();
  return (
    <div className="site-table">
      <table>
        <thead>
          <tr>
            <th />
            {states.map((state) => (
              <th key={state}>
                <code>{state}</code>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DRAWN_FACE_STYLES.map((face) => (
            <tr key={face}>
              <td>
                <code>{face}</code> {label('face', face)}
              </td>
              {states.map((state) => (
                <td key={state}>
                  <img
                    src={renderStaticSvgDataUrl({ shape, color, state, face })}
                    width={64}
                    height={64}
                    alt=""
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One drawn face in every series: the vector variants, the pixel variants and the kaomoji, from one snapshot. */
export function DrawnFaceSeries({
  shape = 'mochi' as ShapeId,
  color = 'blue' as ColorId,
  state = 'happy' as CharacterState,
}) {
  const label = useDisplayName();
  const series = listStyles().flatMap((style) =>
    style.variants.map((variant) => ({ style: style.id, variant })),
  );
  return (
    <div className="site-table">
      <table>
        <thead>
          <tr>
            <th />
            {series.map(({ style, variant }) => (
              <th key={`${style}:${variant}`}>
                <code>{variant}</code>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DRAWN_FACE_STYLES.map((face) => (
            <tr key={face}>
              <td>
                <code>{face}</code> {label('face', face)}
              </td>
              {series.map(({ style, variant }) => (
                <td key={`${style}:${variant}`}>
                  <img
                    src={renderStaticSvgDataUrl({ shape, color, state, face, style, variant })}
                    width={56}
                    height={56}
                    alt=""
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One drawn face on every palette colour, so a light ink and a dark one can be checked side by side. */
export function DrawnFacePalette({ face = 'brow' as FaceStyle, state = 'happy' as CharacterState }) {
  return (
    <div className="site-swatches">
      {COLOR_IDS.map((color) => (
        <div className="site-swatch" key={color}>
          <Cell id={color}>
            <img
              src={renderStaticSvgDataUrl({ shape: 'mochi', color, state, face })}
              width={64}
              height={64}
              alt=""
            />
          </Cell>
        </div>
      ))}
    </div>
  );
}

/** Every mouth of the cute face, drawn alone on a body. */
export function CuteMouthGrid({ shape = 'mochi' as ShapeId, color = 'blue' as ColorId }) {
  return (
    <div className="site-swatches">
      {CUTE_MOUTH_IDS.map((mouth) => (
        <div className="site-swatch" key={mouth}>
          <Cell id={mouth}>
            <img src={renderStaticSvgDataUrl({ shape, color, mouth })} width={72} height={72} alt="" />
          </Cell>
        </div>
      ))}
    </div>
  );
}

/** Every line-face mouth, drawn alone on a body so its shape is what the eye compares. */
export function MouthGrid({ shape = 'blob' as ShapeId, color = 'violet' as ColorId }) {
  const label = useDisplayName();
  return (
    <div className="site-swatches">
      {MOUTH_IDS.map((mouth) => (
        <div className="site-swatch" key={mouth}>
          <Cell id={mouth} name={label('mouth', mouth)}>
            <img
              src={renderStaticSvgDataUrl({
                shape,
                color,
                face: 'line',
                nose: null,
                mouth,
                expression: 'neutral',
              })}
              width={72}
              height={72}
              alt=""
            />
          </Cell>
        </div>
      ))}
    </div>
  );
}

/** The six parameters behind each mouth. */
export function MouthTable() {
  const fmt = (n: number) => (Math.round(n * 100) / 100).toString();
  return (
    <div className="site-table">
      <table>
        <thead>
          <tr>
            <th>id</th>
            <th>width</th>
            <th>bend</th>
            <th>open</th>
            <th>wave</th>
            <th>skew</th>
            <th>dy</th>
          </tr>
        </thead>
        <tbody>
          {MOUTH_IDS.map((id) => {
            const m = MOUTHS[id];
            return (
              <tr key={id}>
                <td>
                  <code>{id}</code>
                </td>
                <td>{fmt(m.width)}</td>
                <td>{fmt(m.bend)}</td>
                <td>{fmt(m.open)}</td>
                <td>{fmt(m.wave)}</td>
                <td>{fmt(m.skew)}</td>
                <td>{fmt(m.dy)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Every nose on the same body with the same mouth. */
export function NoseGrid({ shape = 'blob' as ShapeId, color = 'green' as ColorId }) {
  const label = useDisplayName();
  return (
    <div className="site-swatches">
      {NOSE_IDS.map((nose) => (
        <div className="site-swatch" key={nose}>
          <Cell id={nose} name={label('nose', nose)}>
            <img
              src={renderStaticSvgDataUrl({
                shape,
                color,
                face: 'line',
                nose,
                mouth: 'soft',
                expression: 'neutral',
              })}
              width={72}
              height={72}
              alt=""
            />
          </Cell>
        </div>
      ))}
    </div>
  );
}

/** Every eye topology drawn at the shared line weight. */
export function LineExpressionGrid({ shape = 'blob' as ShapeId, color = 'orange' as ColorId }) {
  const label = useDisplayName();
  return (
    <div className="site-swatches">
      {EYE_TOPOLOGY_IDS.map((expression) => (
        <div className="site-swatch" key={expression}>
          <Cell id={expression} name={label('expression', expression)}>
            <img
              src={renderStaticSvgDataUrl({
                shape,
                color,
                face: 'line',
                nose: 'slant',
                mouth: 'flat',
                expression,
              })}
              width={64}
              height={64}
              alt=""
            />
          </Cell>
        </div>
      ))}
    </div>
  );
}

/** Every state in line mode, live, with the mouth it resolves to under each. */
export function LineStateGrid({
  shape = 'blob' as ShapeId,
  color = 'blue' as ColorId,
  nose = 'slant' as NoseId,
}) {
  const label = useDisplayName();
  const text = useLocalized();
  return (
    <CharacterStageProvider maxSources={TABLE_SOURCES}>
      {STATE_GROUPS.map((group) => {
        const name = label('group', group.id);
        return (
          <div key={group.id}>
            <h3>{text.pair(name || group.label, group.label)}</h3>
            <div className="site-swatches">
              {group.states.map((state) => {
                const mouth: MouthId = STATE_MOUTH[state];
                return (
                  <div className="site-swatch" key={state}>
                    <Cell id={state} name={label('state', state)}>
                      <StagedMark
                        shape={shape}
                        state={state}
                        color={color}
                        face="line"
                        nose={nose}
                        sizePx={60}
                      />
                    </Cell>
                    <span className="site-demo__label" style={{ opacity: 0.6 }}>
                      {mouth}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </CharacterStageProvider>
  );
}

/** The line face across a spread of bodies, to show the features staying inside each one. */
export function LineShapeRow({ shapes = SHAPE_IDS as readonly ShapeId[], color = 'cyan' as ColorId }) {
  const label = useDisplayName();
  return (
    <div className="site-swatches">
      {shapes.map((shape) => (
        <div className="site-swatch" key={shape}>
          <Cell id={shape} name={label('shape', shape)}>
            <img
              src={renderStaticSvgDataUrl({
                shape,
                color,
                face: 'line',
                mouth: 'smile',
                expression: 'happy',
              })}
              width={64}
              height={64}
              alt=""
            />
          </Cell>
        </div>
      ))}
    </div>
  );
}
