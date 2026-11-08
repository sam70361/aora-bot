import {
  getInkColorCss,
  renderStaticSvg,
  useThemesReady,
  type CharacterState,
  type ColorId,
  type FaceStyle,
  type NoseId,
  type ShapeId,
  type StaticOptions,
} from '@aora-bot/react';
import { memo, type CSSProperties } from 'react';

/** Drawings kept for a mark that comes back with the same props: a swatch toggled back, a list scrolled back. Oldest go first. */
const DRAWN_MAX = 160;
const drawn = new Map<string, string>();

/** A drawing whose `<style>` is one rule on its own root class. */
const ROOT_RULE = /^(<svg\b[^>]*?\bclass="([\w-]+)"[^>]*?)>\s*<style>\s*\.\2\s*\{([^{}]*)\}\s*<\/style>/;

/**
 * That rule as the root's `style` attribute instead: the same declarations on
 * the same element, but no stylesheet entering and leaving the document with
 * every mark, each of which restyles the whole page.
 */
function inlineRootRule(svg: string): string {
  return svg.replace(ROOT_RULE, (all, open: string, _uid: string, declarations: string) =>
    /\sstyle="/.test(open)
      ? all
      : `${open} style="${declarations.trim().replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">`,
  );
}

function draw(options: StaticOptions): string {
  const key = JSON.stringify(options);
  let svg = drawn.get(key);
  if (svg === undefined) {
    svg = inlineRootRule(renderStaticSvg(options));
    if (drawn.size >= DRAWN_MAX) drawn.delete(drawn.keys().next().value!);
  } else {
    drawn.delete(key);
  }
  drawn.set(key, svg);
  return svg;
}

export interface StillMarkProps {
  shape: ShapeId;
  color: ColorId;
  state?: CharacterState;
  style: string;
  variant: string;
  face?: FaceStyle;
  nose?: NoseId;
  /** Series parameters. Pass the same object while they are unchanged: a new one redraws. */
  styleOptions?: Readonly<Record<string, unknown>>;
  /** The size it is drawn at, and its box unless `sizeCss` is given. */
  sizePx: number;
  /** Any CSS length for the box, when it follows the layout rather than `sizePx`. */
  sizeCss?: string;
}

/**
 * One frame of a character, inlined.
 *
 * Inlined rather than an `<img>` data URL because the eye cut-outs and the ink
 * read the page's custom properties, and an SVG document inside an `<img>`
 * cannot see them — it would draw light holes into a dark page. The ink follows
 * the page's `color-scheme` (`colorScheme: 'page'`), not the OS, so the site's
 * own theme switch recolours it. Static output has no engine and no timer
 * behind it, which is what lets a screen of them cost nothing per frame.
 */
export const StillMark = memo(function StillMark({
  shape,
  color,
  state = 'idle',
  style,
  variant,
  face,
  nose,
  styleOptions,
  sizePx,
  sizeCss,
}: StillMarkProps) {
  const size = sizeCss ?? sizePx;
  // A theme's character or skin draws once its theme is loaded; the box is held until then.
  const ready = useThemesReady({ shape, variant, style, color });
  if (!ready) {
    return <span className="aora-mark aora-mark--still" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="aora-mark aora-mark--still"
      data-shape={shape}
      data-color={color}
      data-state={state}
      style={{ '--aora-fg': getInkColorCss(color), width: size, height: size } as CSSProperties}
      dangerouslySetInnerHTML={{
        __html: draw({
          shape,
          color,
          state,
          style,
          variant,
          face,
          nose,
          styleOptions,
          sizePx,
          colorScheme: 'page',
        }),
      }}
    />
  );
});
