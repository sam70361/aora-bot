import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';

/** Pixels per wheel "line", for mice that report lines instead of pixels. */
const WHEEL_LINE_PX = 16;

/**
 * Turns a vertical wheel into a sideways scroll for a list that only scrolls
 * sideways — the shape strip, the expression row, and the rails once a narrow
 * screen lays them down. A wheel has no horizontal axis, and without this the
 * only way along such a list is its arrows or a trackpad. A list that scrolls
 * vertically, or a gesture that is already sideways, is left to the browser.
 */
function useWheelPan(element: HTMLElement | null): void {
  useEffect(() => {
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const sideways =
        element.scrollWidth > element.clientWidth && element.scrollHeight <= element.clientHeight;
      if (!sideways) return;
      event.preventDefault();
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? WHEEL_LINE_PX
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? element.clientWidth
            : 1;
      element.scrollBy({ left: event.deltaY * unit });
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [element]);
}

/**
 * A radio group with a roving tab stop: one Tab enters it, the arrow keys move
 * the choice. Sixty shapes as sixty tab stops would make the page unusable
 * from the keyboard, and a plain row of `button`s has no arrow keys at all.
 * It is also the list's scroll box, and a wheel scrolls it whichever way it runs.
 */
export function RadioGroup({
  label,
  className,
  children,
  ref,
}: {
  label: string;
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  useWheelPan(element);
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      setElement(node);
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
    if (!forward && !backward) return;
    const radios = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')];
    const at = radios.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    event.preventDefault();
    const next = radios[(at + (forward ? 1 : -1) + radios.length) % radios.length]!;
    next.click();
    next.focus();
  };

  return (
    <div ref={attach} role="radiogroup" aria-label={label} className={className} onKeyDown={onKeyDown}>
      {children}
    </div>
  );
}

export interface RadioProps {
  checked: boolean;
  label: string;
  /** The id the choice stands for, so a list can find its selected option by value. */
  value: string;
  onSelect: () => void;
  className?: string;
  children: ReactNode;
}

export function Radio({ checked, label, value, onSelect, className, children }: RadioProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={label}
      data-value={value}
      title={label}
      tabIndex={checked ? 0 : -1}
      className={className}
      onClick={onSelect}
    >
      {children}
    </button>
  );
}

/**
 * The scroll container an option lives in, so a preview can draw itself only
 * while it is near the visible part of the list.
 */
const ScrollRoot = createContext<HTMLElement | null>(null);
export const ScrollRootProvider = ScrollRoot.Provider;

/**
 * True while `element` is within `margin` of the scroll container's visible
 * area. The preview boxes are fixed-size, so drawing late moves nothing.
 */
export function useNearVisible(element: Element | null, margin: string): boolean {
  const root = useContext(ScrollRoot);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setNear(entry!.isIntersecting), {
      root,
      rootMargin: margin,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, root, margin]);

  return near;
}
