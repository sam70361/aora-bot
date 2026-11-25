/**
 * Prints the ascii series as text, for looking at the art in a terminal.
 *
 *   node --no-warnings --experimental-transform-types packages/engine/scripts/ascii-sheet.ts \
 *     [charset] [fill] [variant] [--ansi] [--shapes=a,b] [--states=a,b]
 *
 * `charset` is `ascii`, `block` or `braille`; `fill` is `shade`, `solid` or
 * `hollow`; `variant` is `ansi`, `mono` or `crt`. They default to the style's
 * own; `--ansi` adds terminal colour, `--shapes` and `--states` narrow the
 * sheet. Shapes run down the page and states across it.
 *
 * Node transforms the types itself (the engine uses parameter properties,
 * hence the flag); the hook below maps the engine's `.js` import suffixes to
 * the `.ts` files they name, which is all the build step does for it.
 */
import { register } from 'node:module';

register(
  `data:text/javascript,${encodeURIComponent(`
    export async function resolve(specifier, context, next) {
      try {
        return await next(specifier, context);
      } catch (error) {
        if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.endsWith('.js')) {
          return next(specifier.slice(0, -3) + '.ts', context);
        }
        throw error;
      }
    }
  `)}`,
);

const { renderAsciiText } = await import('../src/render/ascii/text.js');

const args = process.argv.slice(2);
const ansi = args.includes('--ansi');
const list = (flag: string, fallback: string[]): string[] =>
  args
    .find((arg) => arg.startsWith(`--${flag}=`))
    ?.slice(flag.length + 3)
    .split(',') ?? fallback;
const SHAPES = list('shapes', ['mochi', 'blob', 'cloud', 'bunny', 'star']);
const STATES = list('states', ['idle', 'happy', 'thinking', 'sleeping', 'sad']);
const [charset = 'ascii', fill = 'shade', variant = 'ansi'] = args.filter((arg) => !arg.startsWith('--'));

const COLOUR_CODE = new RegExp(`${String.fromCharCode(27)}\\[[\\d;]*m`, 'g');
const visible = (line: string): number => line.replace(COLOUR_CODE, '').length;
const print = (text: string): void => void process.stdout.write(`${text}\n`);

/** Lay pictures side by side, each in a column as wide as its widest row. */
function beside(blocks: string[]): string {
  const split = blocks.map((block) => block.split('\n'));
  const widths = split.map((lines) => Math.max(...lines.map(visible)));
  const height = Math.max(...split.map((lines) => lines.length));
  const out: string[] = [];
  for (let row = 0; row < height; row++) {
    out.push(
      split
        .map((lines, i) => {
          const line = lines[row] ?? '';
          return line + ' '.repeat(widths[i]! - visible(line) + 2);
        })
        .join('')
        .trimEnd(),
    );
  }
  return out.join('\n');
}

for (const shape of SHAPES) {
  print(`\n=== ${shape} · ${charset} / ${fill} / ${variant} ===`);
  const pictures = STATES.map((state) =>
    renderAsciiText({
      shape: shape as never,
      state: state as never,
      variant,
      ansi,
      styleOptions: { charset, fill },
    }),
  );
  const widths = pictures.map((picture) => Math.max(...picture.split('\n').map(visible)));
  print(STATES.map((state, i) => state.padEnd(widths[i]! + 2)).join(''));
  print(beside(pictures));
}
