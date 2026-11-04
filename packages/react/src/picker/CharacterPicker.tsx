import {
  COLOR_SWATCHES,
  FACE_STYLES,
  getSwatchHex,
  NOSE_IDS,
  SHAPE_IDS,
  shapeRingMaskImage,
  type ColorId,
  type FaceStyle,
  type NoseId,
  type ShapeId,
} from '@aora-bot/engine';
import { useMemo, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { useLabel, useLocale, type LocaleKey } from '../locale/index.js';
import { CharacterMark } from '../mark/CharacterMark.js';
import { cx } from '../utils/cx.js';

export const PICKER_MARK_PX = 36;

export interface CharacterPickerProps {
  shape: ShapeId;
  color: ColorId;
  onSelectShape?: (shape: ShapeId) => void;
  onSelectColor?: (color: ColorId) => void;
  /** Line weight for the previews, so a picker matches the character it edits. */
  lineWeight?: number;
  /**
   * Face style. Passing this shows the face toggle; in line mode a
   * row of noses follows. Omit it to keep the picker to shape and colour.
   */
  face?: FaceStyle;
  onSelectFace?: (face: FaceStyle) => void;
  /**
   * Nose for the line face. Defaults to the first nose while `face` is
   * `line`. `null` — the same "no nose" every other surface takes — also
   * lands on the first nose, because the picker has to highlight one of the
   * offered options and "none" is not one of them.
   */
  nose?: NoseId | null;
  onSelectNose?: (nose: NoseId) => void;
  /** `grid` stacks shapes over colours in fixed columns; `row` keeps both groups on one line. */
  layout?: 'grid' | 'row';
  /** Restrict the offered shapes. */
  shapes?: readonly ShapeId[];
  /** Restrict the offered colours. */
  colors?: readonly ColorId[];
  /** Hide the selection ring, for read-only displays. The selection is still announced. */
  showSelection?: boolean;
  /** Size of each shape preview. Face and nose previews scale with it. Defaults to `PICKER_MARK_PX`. */
  sizePx?: number;
  className?: string;
  style?: CSSProperties;
}

const FACE_LABEL: Record<FaceStyle, LocaleKey> = { cute: 'face.cute', eyes: 'face.eyes', line: 'face.line' };
const NOSE_LABEL: Record<NoseId, LocaleKey> = {
  slant: 'nose.slant',
  angular: 'nose.angular',
  hook: 'nose.hook',
  long: 'nose.long',
  curve: 'nose.curve',
  bow: 'nose.bow',
};

/**
 * Shape and colour chooser, with an optional face style and nose.
 *
 * Selection is drawn as a ring in the selected shape's own outline rather than
 * a generic circle, so the highlight traces a hexagon around a hexagon. The
 * ring is a CSS mask built from the same generator that draws the body, which
 * keeps the two in step when a shape is redefined.
 */
export function CharacterPicker({
  shape,
  color,
  onSelectShape,
  onSelectColor,
  lineWeight,
  face,
  onSelectFace,
  nose,
  onSelectNose,
  layout = 'grid',
  shapes = SHAPE_IDS,
  colors,
  showSelection = true,
  sizePx,
  className,
  style,
}: CharacterPickerProps) {
  const { t } = useLocale();
  const label = useLabel();
  const markSize = sizePx ?? PICKER_MARK_PX;
  const swatches = useMemo(
    () => (colors ? COLOR_SWATCHES.filter((s) => colors.includes(s.id)) : COLOR_SWATCHES),
    [colors],
  );

  const showFace = face !== undefined;
  const activeFace: FaceStyle = face ?? 'cute';
  const activeNose: NoseId = nose ?? NOSE_IDS[0]!;
  // Previews wear the chosen face so the shape row reflects the whole choice.
  const previewNose = activeFace === 'line' ? activeNose : null;

  return (
    <div className={cx('aora-picker', `aora-picker--${layout}`, className)} style={style}>
      <RadioGroup
        label={t('picker.selectShape')}
        heading={t('picker.shape')}
        options={shapes}
        value={shape}
        onSelect={onSelectShape}
        renderOption={(id, selected) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={id === shape}
            aria-label={label.shape(id)}
            tabIndex={selected ? 0 : -1}
            className="aora-picker__item"
            data-selected={(showSelection && selected) || undefined}
            onClick={() => onSelectShape?.(id)}
            style={showSelection && selected ? ringStyle(id, markSize) : undefined}
          >
            <CharacterMark
              shape={id}
              color={color}
              face={activeFace}
              nose={previewNose}
              lineWeight={lineWeight}
              sizePx={markSize}
              paused
              seed={id}
            />
          </button>
        )}
      />

      <RadioGroup
        label={t('picker.selectColor')}
        heading={t('picker.color')}
        options={swatches.map((s) => s.id)}
        value={color}
        onSelect={onSelectColor}
        renderOption={(id, selected) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={id === color}
            aria-label={label.color(id)}
            tabIndex={selected ? 0 : -1}
            className="aora-picker__swatch"
            data-selected={(showSelection && selected) || undefined}
            onClick={() => onSelectColor?.(id)}
            style={{ '--aora-swatch': getSwatchHex(id) } as CSSProperties}
          />
        )}
      />

      {showFace && (
        <RadioGroup
          label={t('picker.selectFace')}
          heading={t('picker.face')}
          options={FACE_STYLES}
          value={activeFace}
          onSelect={onSelectFace}
          segmented
          renderOption={(id, selected) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={id === activeFace}
              tabIndex={selected ? 0 : -1}
              className="aora-picker__segment"
              data-selected={(showSelection && selected) || undefined}
              onClick={() => onSelectFace?.(id)}
            >
              <CharacterMark
                shape={shape}
                color={color}
                face={id}
                nose={id === 'line' ? activeNose : null}
                lineWeight={lineWeight}
                sizePx={markSize * 0.66}
                paused
                seed={`face:${id}`}
              />
              <span>{t(FACE_LABEL[id])}</span>
            </button>
          )}
        />
      )}

      {showFace && activeFace === 'line' && (
        <RadioGroup
          label={t('picker.selectNose')}
          heading={t('picker.nose')}
          options={NOSE_IDS}
          value={activeNose}
          onSelect={onSelectNose}
          renderOption={(id, selected) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={id === activeNose}
              aria-label={t(NOSE_LABEL[id])}
              title={t(NOSE_LABEL[id])}
              tabIndex={selected ? 0 : -1}
              className="aora-picker__item"
              data-selected={(showSelection && selected) || undefined}
              onClick={() => onSelectNose?.(id)}
              style={showSelection && selected ? ringStyle(shape, markSize) : undefined}
            >
              <CharacterMark
                shape={shape}
                color={color}
                face="line"
                nose={id}
                lineWeight={lineWeight}
                sizePx={markSize}
                paused
                seed={`nose:${id}`}
              />
            </button>
          )}
        />
      )}
    </div>
  );
}

interface RadioGroupProps<T extends string> {
  label: string;
  heading: string;
  options: readonly T[];
  value: T;
  onSelect?: (value: T) => void;
  /** Labelled segments rather than cells, so a grid picker wraps them instead of aligning them to its columns. */
  segmented?: boolean;
  renderOption: (value: T, selected: boolean) => ReactNode;
}

/**
 * A radiogroup with the keyboard contract screen readers expect: one tab stop
 * on the current choice, arrow keys to move within the group, Home and End
 * for the extremes. Moving also selects, as a native radio does.
 */
function RadioGroup<T extends string>({
  label,
  heading,
  options,
  value,
  onSelect,
  segmented,
  renderOption,
}: RadioGroupProps<T>) {
  // The tab stop must land somewhere even when `value` is not offered.
  const current = options.includes(value) ? value : options[0];

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = KEY_STEPS[event.key];
    if (step === undefined || options.length === 0) return;
    event.preventDefault();

    const index = Math.max(0, options.indexOf(current));
    const next =
      step === 'first'
        ? 0
        : step === 'last'
          ? options.length - 1
          : (index + step + options.length) % options.length;
    const target = options[next]!;

    onSelect?.(target);
    const radios = event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]');
    radios[next]?.focus();
  };

  return (
    <div className="aora-picker__group" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      <span className="aora-picker__label">{heading}</span>
      <div className={cx('aora-picker__items', segmented && 'aora-picker__items--segments')}>
        {options.map((id) => renderOption(id, id === current))}
      </div>
    </div>
  );
}

const KEY_STEPS: Record<string, 1 | -1 | 'first' | 'last' | undefined> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
  Home: 'first',
  End: 'last',
};

function ringStyle(shape: ShapeId, sizePx: number): CSSProperties {
  return {
    '--aora-picker-ring': shapeRingMaskImage({ shape, sizePx, inflatePx: 5, gapPx: 3 }),
  } as CSSProperties;
}
