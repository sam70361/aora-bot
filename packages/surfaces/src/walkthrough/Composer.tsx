import type { ColorId, FaceStyle, NoseId, ShapeId } from '@aora-bot/engine';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useSurfaceLocale } from '../locale/index.js';
import { CharacterMark, cx } from '@aora-bot/react';

export interface ComposerProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  /** How long after the last keystroke the character stops composing. */
  idleMs?: number;
  sizePx?: number;
  shape?: ShapeId;
  color?: ColorId;
  face?: FaceStyle;
  nose?: NoseId | null;
  lineWeight?: number;
  /** Show the send button. On by default. */
  sendButton?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * A message field with a character that pays attention to it.
 *
 * Three states, driven by what the field is doing rather than by a timer:
 * `listening` on focus, `composing` while typing, back to `idle` a moment
 * after the typing stops. That mapping is the whole idea — a character beside
 * an input is only worth having if it reacts to the input, and the reaction
 * has to be immediate enough to feel like attention and quiet enough not to
 * be a distraction from writing.
 *
 * Uncontrolled unless `value` is given, so it can be dropped into a demo
 * without any state around it.
 */
export function Composer({
  value,
  onChange,
  onSubmit,
  placeholder,
  idleMs = 1200,
  sizePx,
  shape,
  color,
  face,
  nose,
  lineWeight,
  sendButton = true,
  className,
  style,
}: ComposerProps) {
  const markSize = sizePx ?? 36;
  const { t } = useSurfaceLocale();
  const [own, setOwn] = useState('');
  const [focused, setFocused] = useState(false);
  const [typing, setTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const text = value ?? own;

  useEffect(
    () => () => {
      if (timer.current != null) clearTimeout(timer.current);
    },
    [],
  );

  const change = (next: string) => {
    if (value === undefined) setOwn(next);
    onChange?.(next);

    setTyping(true);
    if (timer.current != null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setTyping(false);
    }, idleMs);
  };

  const state = typing ? 'composing' : focused ? 'listening' : 'idle';

  return (
    <div className={cx('aora-s-composer', className)} style={style}>
      <CharacterMark
        shape={shape}
        color={color}
        face={face}
        nose={nose}
        lineWeight={lineWeight}
        state={state}
        emphasis={focused}
        sizePx={markSize}
        className="aora-s-composer__mark"
      />

      <input
        className="aora-field aora-s-composer__field"
        value={text}
        placeholder={placeholder ?? t('walkthrough.composer.placeholder')}
        aria-label={placeholder ?? t('walkthrough.composer.placeholder')}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => change(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && text.trim()) onSubmit?.(text.trim());
        }}
      />

      {sendButton && (
        <button
          type="button"
          className="aora-button aora-button--primary"
          disabled={!text.trim()}
          onClick={() => text.trim() && onSubmit?.(text.trim())}
        >
          {t('walkthrough.composer.send')}
        </button>
      )}
    </div>
  );
}
