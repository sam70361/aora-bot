import type { StaticOptions } from '../../core/options.js';
import { buildStillFrame } from '../static-svg.js';
import { composeStatic, monoInk } from './compose.js';

export interface AsciiTextOptions extends StaticOptions {
  /** Wrap runs of one colour in 24-bit terminal colour codes, the light scheme's colours. Default `false`. */
  ansi?: boolean;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** A `#rgb` or `#rrggbb` colour as the parameters of a 24-bit colour code, or `null` for any other. */
function rgbOf(colour: string): string | null {
  const m = HEX.exec(colour);
  if (!m) return null;
  const h = m[1]!.length === 3 ? [...m[1]!].map((c) => c + c).join('') : m[1]!;
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16)).join(';');
}

const isBlank = (glyph: string): boolean => glyph === '' || glyph === ' ' || glyph === '\u2800';

/**
 * A character as lines of text, for a terminal, a log or a README.
 *
 * It is drawn from the same still frame as `renderStaticSvg` and always in the
 * `ascii` style, so it is the picture that series draws, as characters alone.
 * Lines keep their columns, so a frame lines up when printed row under row;
 * trailing spaces and blank lines at either end are dropped.
 */
export function renderAsciiText(options: AsciiTextOptions = {}): string {
  const { ansi, ...rest } = options;
  const { frame, context } = buildStillFrame({ ...rest, style: 'ascii' });
  const { cells, table, look, variant } = composeStatic(frame, context);

  const ink = rgbOf(monoInk(look, context.flat).value);
  const colours = new Map<number, string | null>();
  const colourOf = (id: number): string | null => {
    if (variant === 'mono') return ink;
    let rgb = colours.get(id);
    if (rgb === undefined) colours.set(id, (rgb = rgbOf(look.colour(table.defs[id - 1]!).value)));
    return rgb;
  };

  const lines: string[] = [];
  for (let row = 0; row < cells.rows; row++) {
    let last = -1;
    for (let col = 0; col < cells.cols; col++) {
      if (!isBlank(cells.glyph[row * cells.cols + col]!)) last = col;
    }
    let line = '';
    let current: string | null = null;
    for (let col = 0; col <= last; col++) {
      const i = row * cells.cols + col;
      const glyph = cells.glyph[i]!;
      if (isBlank(glyph)) {
        line += ' ';
        continue;
      }
      if (ansi) {
        const rgb = colourOf(cells.paint[i]!);
        if (rgb !== current) {
          line += rgb === null ? '\x1b[0m' : `\x1b[38;2;${rgb}m`;
          current = rgb;
        }
      }
      line += glyph;
    }
    lines.push(current === null ? line : `${line}\x1b[0m`);
  }

  while (lines.length > 0 && lines[0] === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}
