import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface MenuOption<T extends string = string> {
  value: T;
  label: string;
  hint?: string;
}

export interface MenuGroup<T extends string = string> {
  id: string;
  label: string;
  options: MenuOption<T>[];
}

export interface MenuProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  /** Flat list. Ignored when `groups` is set. */
  options?: readonly MenuOption<T>[];
  groups?: readonly MenuGroup<T>[];
  /** Visible label beside the trigger. */
  label?: ReactNode;
  /** Accessible name when the visible label is omitted or is not a string. */
  ariaLabel?: string;
  className?: string;
  /** Wider panel for a grid of short choices (family names, inks). */
  columns?: 1 | 2 | 3;
}

/**
 * A real dropdown panel, not a native `<select>`.
 *
 * The platform widget cannot wear the site's ink-fill language, cannot group
 * options with captions, and cannot open as a panel, so it would read as a
 * form next to a character. This is a listbox: the
 * trigger is an `.site-btn`, the panel is ours, and Escape / arrows / Enter
 * work the way a menu should.
 */
export function Menu<T extends string>({
  value,
  onChange,
  options,
  groups,
  label,
  ariaLabel,
  className,
  columns = 1,
}: MenuProps<T>) {
  const uid = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<T | null>(null);
  const highlighted = open ? (active ?? value) : value;

  const flat = useMemo(() => {
    if (groups) return groups.flatMap((group) => group.options);
    return options ?? [];
  }, [groups, options]);

  const current = flat.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (next: T) => {
    onChange(next);
    setOpen(false);
  };

  const move = (delta: number) => {
    if (flat.length === 0) return;
    const index = Math.max(
      0,
      flat.findIndex((option) => option.value === highlighted),
    );
    const next = flat[(index + delta + flat.length) % flat.length]!;
    setActive(next.value);
  };

  const onTriggerKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
    }
  };

  const onListKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      if (flat[0]) setActive(flat[0].value);
    } else if (event.key === 'End') {
      event.preventDefault();
      if (flat[flat.length - 1]) setActive(flat[flat.length - 1]!.value);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      pick(highlighted);
    }
  };

  const name = ariaLabel ?? (typeof label === 'string' ? label : current?.label);

  return (
    <div ref={rootRef} className={['site-menu', className].filter(Boolean).join(' ')}>
      {label ? <span className="site-menu__label">{label}</span> : null}
      <button
        type="button"
        className="site-btn site-menu__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={uid}
        aria-label={name}
        onClick={() => {
          setActive(value);
          setOpen((was) => !was);
        }}
        onKeyDown={onTriggerKey}
      >
        <span className="site-menu__value">{current?.label ?? value}</span>
        {current?.hint ? <code>{current.hint}</code> : null}
        <span className="site-menu__caret" aria-hidden="true" />
      </button>
      {open ? (
        <div
          id={uid}
          className="site-menu__panel"
          data-columns={columns}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={`${uid}-${highlighted}`}
          aria-label={name}
          onKeyDown={onListKey}
        >
          {groups
            ? groups.map((group) => (
                <div key={group.id} className="site-menu__group" role="group" aria-label={group.label}>
                  <p className="site-menu__groupName">{group.label}</p>
                  {group.options.map((option) => (
                    <MenuRow
                      key={option.value}
                      id={`${uid}-${option.value}`}
                      option={option}
                      selected={option.value === value}
                      active={option.value === highlighted}
                      onPick={pick}
                      onActive={setActive}
                    />
                  ))}
                </div>
              ))
            : flat.map((option) => (
                <MenuRow
                  key={option.value}
                  id={`${uid}-${option.value}`}
                  option={option}
                  selected={option.value === value}
                  active={option.value === highlighted}
                  onPick={pick}
                  onActive={setActive}
                />
              ))}
        </div>
      ) : null}
    </div>
  );
}

function MenuRow<T extends string>({
  id,
  option,
  selected,
  active,
  onPick,
  onActive,
}: {
  id: string;
  option: MenuOption<T>;
  selected: boolean;
  active: boolean;
  onPick: (value: T) => void;
  onActive: (value: T) => void;
}) {
  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={selected}
      data-active={active ? 'true' : undefined}
      className="site-menu__option"
      onMouseEnter={() => onActive(option.value)}
      onClick={() => onPick(option.value)}
    >
      <span>{option.label}</span>
      {option.hint ? <code>{option.hint}</code> : null}
    </button>
  );
}
