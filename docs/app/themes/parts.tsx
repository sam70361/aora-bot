import { onReducedMotionChange, prefersReducedMotion } from '@aora-bot/engine';
import { Fragment, useEffect, useId, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { seeded } from './looks/draw.js';
import type { Markup, ThemeLook, TitleLayout } from './looks/index.js';

/*
 * The pieces every themed surface is built from. Each reads a look and
 * nothing else, so the shelf, the album and the dialog draw any theme the
 * same way: a theme's appearance is its look file, and no component here
 * knows which theme it is drawing.
 */

/** Markup in an inline SVG, which is how it can read the look's custom properties. */
export function Art({
  markup,
  viewBox,
  className,
  preserve,
}: {
  markup: Markup;
  viewBox: string;
  className: string;
  preserve?: string;
}) {
  return (
    <svg
      className={className}
      viewBox={viewBox}
      preserveAspectRatio={preserve}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

/** The theme's seal: its emblem on a foil disc. */
export function Seal({ look, className }: { look: ThemeLook; className?: string }) {
  return (
    <span className={['site-themes__seal', className].filter(Boolean).join(' ')} aria-hidden="true">
      <Art markup={look.emblem} viewBox="0 0 24 24" className="site-themes__sealArt" />
    </span>
  );
}

/** The cover pattern, tiled over the element it is placed in. */
export function Pattern({
  look,
  className = 'site-themes__pattern',
}: {
  look: ThemeLook;
  className?: string;
}) {
  const id = `site-themes-pattern-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const { width, height, markup } = look.pattern;
  return (
    <svg className={className} aria-hidden="true" focusable="false">
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** A title's words and their glyphs: each glyph's offset into the title keys it, and its place among the glyphs styles it. */
function wordsOf(text: string) {
  let at = 0;
  let place = 0;
  return text.split(' ').map((word) => {
    const start = at;
    const glyphs = [...word].map((glyph) => {
      at += glyph.length;
      return { glyph, end: at, place: place++ };
    });
    at += 1;
    return { start, glyphs };
  });
}

/** A glyph's colour, turn and lift: the look's lists, taken in turn. */
function glyphStyle(glyphs: ThemeLook['title']['glyphs'], place: number): CSSProperties | undefined {
  const { colors = [], turns = [], lifts = [] } = glyphs ?? {};
  const color = colors.length ? colors[place % colors.length] : undefined;
  const turn = turns.length ? turns[place % turns.length]! : 0;
  const lift = lifts.length ? lifts[place % lifts.length]! : 0;
  if (!color && !turn && !lift) return undefined;
  return { color, transform: turn || lift ? `translateY(${lift}em) rotate(${turn}deg)` : undefined };
}

const CJK = /^[\u3400-\u9fff\uf900-\ufaff]+$/;

/**
 * A cover title in its theme's treatment. One span per glyph, so the look can
 * colour, turn and lift each in turn, inside one span per word, so a name
 * breaks only at its spaces. A vertical layout applies to a CJK name only;
 * any other name falls back to one line. The glyphs are hidden from assistive
 * technology, which reads the whole name from a visually hidden copy.
 */
export function CoverTitle({
  text,
  look,
  placement,
  className,
}: {
  text: string;
  look: ThemeLook;
  placement: keyof ThemeLook['title']['layout'];
  className: string;
}) {
  const { title } = look;
  const requested: TitleLayout = title.layout[placement];
  const layout = requested === 'vertical' && !CJK.test(text) ? 'line' : requested;

  return (
    <span
      className={className}
      data-layout={layout}
      data-plate={title.plate ? '' : undefined}
      data-fill={title.fill ? '' : undefined}
      data-outline={title.outline ? '' : undefined}
      style={
        title.plate
          ? ({
              '--look-plate': title.plate.fill,
              '--look-plate-shade': title.plate.shade,
              '--look-plate-stitch': title.plate.stitch,
            } as CSSProperties)
          : undefined
      }
    >
      <span className="site-home__sr">{text}</span>
      {wordsOf(text).map(({ start, glyphs }) => (
        <Fragment key={start}>
          {start > 0 ? ' ' : null}
          <span className="site-themes__word" aria-hidden="true">
            {glyphs.map(({ glyph, end, place }) => (
              <span key={end} className="site-themes__glyph" style={glyphStyle(title.glyphs, place)}>
                {glyph}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  );
}

/**
 * A card's front: the foil edge, the number plate and seal, the art window,
 * the name plate and the corner marks, all chosen by the look. The art is
 * passed in, so the gallery puts a still in it and the dialog a live mark.
 */
export function CardFace({
  look,
  number,
  total,
  name,
  gloss,
  art,
  children,
}: {
  look: ThemeLook;
  number: string;
  total?: string;
  name: string;
  gloss: string;
  art: ReactNode;
  children?: ReactNode;
}) {
  const { card } = look;
  return (
    <span
      className="site-themes__face"
      data-border={card.border}
      data-number={card.number}
      data-name={card.name}
    >
      <span className="site-themes__faceTop">
        <span className="site-themes__number">
          {number}
          <span className="site-themes__total">{total ? ` / ${total}` : ''}</span>
        </span>
        <Seal look={look} />
      </span>
      <span className="site-themes__art">
        {art}
        {card.corner ? (
          <>
            <Art
              markup={card.corner}
              viewBox="0 0 24 24"
              className="site-themes__corner site-themes__corner--start"
            />
            <Art
              markup={card.corner}
              viewBox="0 0 24 24"
              className="site-themes__corner site-themes__corner--end"
            />
          </>
        ) : null}
      </span>
      <span className="site-themes__plate">
        <span className="site-themes__plateName">{name}</span>
        <span className="site-themes__plateGloss">{gloss}</span>
      </span>
      {children}
    </span>
  );
}

/** A card's back: the cover cloth and its pattern, an inset line, and the seal in its ring. */
export function CardBack({ look, name }: { look: ThemeLook; name: string }) {
  return (
    <span className="site-themes__cardBack" data-inset={look.back.inset}>
      <Pattern look={look} />
      <span className="site-themes__backInset" />
      <span className="site-themes__medallion">
        {look.back.ring ? (
          <Art markup={look.back.ring} viewBox="0 0 120 120" className="site-themes__ring" />
        ) : null}
        <Seal look={look} className="site-themes__seal--large" />
      </span>
      {look.back.name ? <span className="site-themes__backName">{name}</span> : null}
    </span>
  );
}

/**
 * The burst a drawn card throws: the look's shapes in its colours, each sent
 * out along its own seeded path by transform alone, so the burst is the same
 * every time a card is drawn and costs the main thread nothing.
 */
export function Particles({ look }: { look: ThemeLook }) {
  const { shapes, colors, count } = look.particles;
  const random = seeded(count * 131 + shapes.length);
  return (
    <span className="site-themes__particles" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + random() * 0.6;
        const reach = 7 + random() * 7;
        const style = {
          '--dx': `${(Math.cos(angle) * reach).toFixed(2)}rem`,
          '--dy': `${(Math.sin(angle) * reach * 0.8 - 1.5).toFixed(2)}rem`,
          '--turn': `${Math.round(random() * 540 - 270)}deg`,
          '--size': `${(0.7 + random() * 0.7).toFixed(2)}rem`,
          '--delay': `${Math.round(random() * 120)}ms`,
          color: colors[i % colors.length],
        } as CSSProperties;
        return (
          <span key={i} className="site-themes__particle" style={style}>
            <Art
              markup={shapes[i % shapes.length]!}
              viewBox="0 0 24 24"
              className="site-themes__particleArt"
            />
          </span>
        );
      })}
    </span>
  );
}

const subscribeMotion = (notify: () => void) => onReducedMotionChange(notify);

/** Whether the reader asked for reduced motion; false on the server, where nothing moves. */
export const useReducedMotion = (): boolean =>
  useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => false);

const FINE_POINTER = '(hover: hover) and (pointer: fine)';

/** How far a card leans toward the pointer, in degrees. */
const TILT_DEG = 9;

/**
 * Lean an element toward the pointer, with a glare that follows it, on a
 * device that can hover and when motion is welcome. The pointer is read once a
 * frame and written as custom properties that only transforms and opacity
 * read, so a hover never touches layout.
 */
export function useTilt(element: HTMLElement | null): void {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!element || reduced || !window.matchMedia(FINE_POINTER).matches) return;
    let frame = 0;
    let pending: PointerEvent | null = null;
    const apply = () => {
      frame = 0;
      if (!pending) return;
      const box = element.getBoundingClientRect();
      const x = (pending.clientX - box.left) / box.width;
      const y = (pending.clientY - box.top) / box.height;
      element.style.setProperty('--tilt-x', `${((0.5 - y) * TILT_DEG).toFixed(2)}deg`);
      element.style.setProperty('--tilt-y', `${((x - 0.5) * TILT_DEG).toFixed(2)}deg`);
      // The glare is twice the card's size, so half the offset in its own percentages puts its centre under the pointer.
      element.style.setProperty('--glare-x', `${((x - 0.5) * 50).toFixed(1)}%`);
      element.style.setProperty('--glare-y', `${((y - 0.5) * 50).toFixed(1)}%`);
    };
    const move = (event: PointerEvent) => {
      pending = event;
      element.dataset.tilting = '';
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const leave = () => {
      pending = null;
      cancelAnimationFrame(frame);
      frame = 0;
      delete element.dataset.tilting;
      for (const name of ['--tilt-x', '--tilt-y', '--glare-x', '--glare-y'])
        element.style.removeProperty(name);
    };
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerleave', leave);
    return () => {
      leave();
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', leave);
    };
  }, [element, reduced]);
}
