import { CUTE_EYE_IDS, STATE_FX } from '@aora-bot/engine';
import {
  CHARACTER_STATES,
  COLOR_SWATCHES,
  EYE_TOPOLOGY_IDS,
  MarkStageProvider,
  SHAPE_FAMILIES,
  STATE_GROUPS,
  StagedMark,
  CharacterMark,
  renderStaticSvgDataUrl,
  useLabel,
  type ColorId,
  type ShapeId,
} from '@aora-bot/react';
import { useState } from 'react';
import { useLocalized } from '../../app/shared/i18n.js';
import { Cell } from './Cell.js';

/** Every character, family by family, clickable to enlarge. */
export function ShapeGrid({ color = 'blue' as ColorId }) {
  const label = useLabel();
  const [active, setActive] = useState<ShapeId>('mochi');

  return (
    <div className="site-demo site-demo--column">
      <div className="site-demo site-demo--center site-demo--bare">
        <CharacterMark shape={active} color={color} state="idle" sizePx={132} />
      </div>
      {SHAPE_FAMILIES.map((family) => (
        <div key={family.id}>
          <h3>{label.shapeFamily(family.id)}</h3>
          <div className="site-swatches">
            {family.shapes.map((shape) => (
              <button
                key={shape}
                type="button"
                className="site-swatch"
                onClick={() => setActive(shape)}
                aria-pressed={shape === active}
              >
                <Cell id={shape} name={label.shape(shape)} active={shape === active}>
                  <img src={renderStaticSvgDataUrl({ shape, color })} width={52} height={52} alt="" />
                </Cell>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Every animation state, grouped, sharing one stage. */
export function StateGrid({ shape = 'mochi' as ShapeId, color = 'green' as ColorId }) {
  const label = useLabel();
  const text = useLocalized();

  return (
    // Every state is on screen at once, so the cap is the whole catalogue.
    <MarkStageProvider maxSources={CHARACTER_STATES.length}>
      {STATE_GROUPS.map((group) => {
        const name = label.stateGroup(group.id, '');
        return (
          <div key={group.id}>
            <h3>{text.pair(name || group.label, group.label)}</h3>
            <div className="site-swatches">
              {group.states.map((state) => (
                <div className="site-swatch" key={state}>
                  <Cell id={state} name={label.state(state)}>
                    <StagedMark shape={shape} state={state} color={color} sizePx={60} />
                  </Cell>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </MarkStageProvider>
  );
}

/** The mood and activity effect of every state that has one, live on the cute face. */
export function FxGrid({ shape = 'mochi' as ShapeId, color = 'blue' as ColorId }) {
  const label = useLabel();
  const states = CHARACTER_STATES.filter((state) => STATE_FX[state]);

  return (
    <MarkStageProvider maxSources={states.length}>
      <div className="site-swatches">
        {states.map((state) => (
          <div className="site-swatch" key={state}>
            <Cell id={state} name={label.state(state)}>
              <StagedMark shape={shape} state={state} color={color} sizePx={72} />
            </Cell>
            <span className="site-demo__label" style={{ opacity: 0.6 }}>
              {STATE_FX[state]}
            </span>
          </div>
        ))}
      </div>
    </MarkStageProvider>
  );
}

/** Every eye of the cute face, drawn alone so the geometry is easy to compare. */
export function ExpressionGrid({ shape = 'mochi' as ShapeId, color = 'violet' as ColorId }) {
  return (
    <div className="site-swatches">
      {CUTE_EYE_IDS.map((expression) => (
        <div className="site-swatch" key={expression}>
          <Cell id={expression}>
            <img src={renderStaticSvgDataUrl({ shape, color, expression })} width={60} height={60} alt="" />
          </Cell>
        </div>
      ))}
    </div>
  );
}

/** Every eye topology of the `eyes` and `line` faces, drawn on the `eyes` face. */
export function EyeTopologyGrid({ shape = 'mochi' as ShapeId, color = 'violet' as ColorId }) {
  const label = useLabel();
  return (
    <div className="site-swatches">
      {EYE_TOPOLOGY_IDS.map((expression) => (
        <div className="site-swatch" key={expression}>
          <Cell id={expression} name={label.expression(expression)}>
            <img
              src={renderStaticSvgDataUrl({ shape, color, face: 'eyes', expression })}
              width={60}
              height={60}
              alt=""
            />
          </Cell>
        </div>
      ))}
    </div>
  );
}

/** Every palette colour. */
export function PaletteGrid({ shape = 'mochi' as ShapeId }) {
  const label = useLabel();
  return (
    <div className="site-swatches">
      {COLOR_SWATCHES.map((swatch) => (
        <div className="site-swatch" key={swatch.id}>
          <Cell id={swatch.id} name={label.color(swatch.id)}>
            <img src={renderStaticSvgDataUrl({ shape, color: swatch.id })} width={60} height={60} alt="" />
          </Cell>
        </div>
      ))}
    </div>
  );
}
