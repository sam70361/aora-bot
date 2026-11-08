/**
 * How much room a drawn face ever takes, as data, and how it is stored.
 *
 * Fitting a face to a body needs the most the face ever covers: both eyes
 * and its plate over every expression any state shows, through its loops,
 * and the widest mouth any state wears. That depends on the design alone,
 * and measuring it means building every expression, so it is measured
 * ahead of time into `extents.generated.ts`; the fit of every face to every
 * body of the roster is stored the same way in `fits.generated.ts`. A live
 * mount only reads them. A test works both out again and fails, naming the
 * command to run, if what is stored no longer matches.
 */
import { GENERATE_COMMAND } from '../../core/generated.js';
import type { DrawnFaceStyle } from '../../core/types.js';
import type { AnyFaceDesign, DrawnPair, EyeContext, FaceLayer } from './types.js';

/** One horizontal band of a face's extent, in dot radii about where it was built. */
export interface ExtentBand {
  y0: number;
  y1: number;
  x0: number;
  x1: number;
}

/** A face's extent, top to bottom. */
export type Footprint = readonly ExtentBand[];

/** Everything a fit needs to know about a design's extent. */
export interface ExtentProfile {
  /** Each eye's extent about its centre, x towards the nose. */
  left: Footprint;
  right: Footprint;
  /** The plate's extent about the face's midpoint, with the eyes at their designed spacing and at their closest. */
  plateWide: Footprint;
  plateNarrow: Footprint;
  /** Half the widest mouth any state wears, in dot radii. */
  mouth: number;
}

/**
 * Bands a footprint is cut into, top to bottom. Fine enough that a band does
 * not pair the highest point of one state with the widest point of another.
 */
const FOOTPRINT_BANDS = 16;
/**
 * Moments a face's moving parts are measured at, in seconds: the start of
 * every loop and a moment near the far end of the common ones. Moving parts
 * stay inside the panel or symbol that holds them, so two are enough.
 */
const EXTENT_TIMES = [0, 1.05];
/** Stored numbers are rounded to this many decimals, so a regenerated module only changes when the extent does. */
const DECIMALS = 3;

const round = (v: number): number => Math.round(v * 10 ** DECIMALS) / 10 ** DECIMALS;

/**
 * The bands a set of layers covers. Loose layers (a falling tear, a rising Z)
 * drift free of the face by design and are left out.
 */
function footprintOf(layers: readonly FaceLayer[]): Footprint {
  let top = Infinity;
  let bottom = -Infinity;
  for (const layer of layers) {
    if (layer.loose) continue;
    for (const ring of layer.rings) {
      for (const [, y] of ring) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (!(bottom > top)) return [];
  const step = (bottom - top) / FOOTPRINT_BANDS;
  const bands = Array.from({ length: FOOTPRINT_BANDS }, (_, i) => ({
    y0: top + step * i,
    y1: top + step * (i + 1),
    x0: Infinity,
    x1: -Infinity,
  }));
  for (const layer of layers) {
    if (layer.loose) continue;
    for (const ring of layer.rings) {
      for (const [x, y] of ring) {
        const band = bands[Math.min(FOOTPRINT_BANDS - 1, Math.floor((y - top) / step))]!;
        band.x0 = Math.min(band.x0, x);
        band.x1 = Math.max(band.x1, x);
      }
    }
  }
  return bands
    .filter((b) => b.x1 >= b.x0)
    .map((b) => ({ y0: round(b.y0), y1: round(b.y1), x0: round(b.x0), x1: round(b.x1) }));
}

/** Measure a design: build every expression its states use, at every measured moment, and take the bands they cover. */
export function measureExtent(design: AnyFaceDesign): ExtentProfile {
  const l = design.layout;
  const names = new Set(Object.values(design.states).flat());
  const left: FaceLayer[] = [];
  const right: FaceLayer[] = [];
  const wide: FaceLayer[] = [];
  const narrow: FaceLayer[] = [];
  for (const name of names) {
    const pair = (design.expressions as Record<string, DrawnPair>)[name];
    if (!pair) continue;
    for (const time of EXTENT_TIMES) {
      const context = (nose: 1 | -1, separation = l.separation): EyeContext => ({
        nose,
        order: nose === 1 ? 0 : 1,
        time,
        settled: false,
        blink: 1,
        look: [0, 0],
        weight: 1,
        mid: separation / 2,
      });
      left.push(...design.eye(pair[0], context(1)));
      right.push(...design.eye(pair[1], context(-1)));
      if (design.plate) {
        wide.push(...design.plate(pair[0], pair[1], context(1)));
        narrow.push(...design.plate(pair[0], pair[1], context(1, l.minSeparation)));
      }
    }
  }
  const widest = Math.max(...Object.values(design.stateMouth).map((id) => design.mouths[id].width));
  return {
    left: footprintOf(left),
    right: footprintOf(right),
    plateWide: footprintOf(wide),
    plateNarrow: footprintOf(narrow),
    mouth: round(widest * l.mouthScale),
  };
}

/**
 * The plate's extent with the eyes `squeeze` of their designed spacing apart:
 * between its two measurements a plate's edges move with the eyes, band by
 * band, as far as the spacing has.
 */
export function plateExtent(profile: ExtentProfile, squeeze: number, least: number): Footprint {
  const { plateWide: wide, plateNarrow: narrow } = profile;
  if (wide.length !== narrow.length || least >= 1) return wide;
  const t = Math.min(1, Math.max(0, (squeeze - least) / (1 - least)));
  return wide.map((band, i) => {
    const near = narrow[i]!;
    return {
      y0: band.y0,
      y1: band.y1,
      x0: near.x0 + (band.x0 - near.x0) * t,
      x1: near.x1 + (band.x1 - near.x1) * t,
    };
  });
}

/** A stored fit: scale, drop and squeeze (see `DrawnFit`). */
export type StoredFit = readonly [scale: number, drop: number, squeeze: number];

/** The roster's fits for one body, and the digest of the body they were worked out for. */
export interface StoredFits {
  digest: string;
  fits: Record<DrawnFaceStyle, StoredFit>;
}

/** The source of `fits.generated.ts` for these bodies. */
export function fitsModule(rows: Record<string, StoredFits>): string {
  const entries = Object.entries(rows).map(([id, row]) => {
    const fits = Object.entries(row.fits).map(([face, fit]) => `${face}: [${fit.join(', ')}]`);
    return `  ${id}: { digest: '${row.digest}', fits: { ${fits.join(', ')} } },`;
  });
  return [
    '/*',
    ' * How each drawn face is fitted to each body of the roster, worked out by `computeFit`',
    ' * (`face/drawn/place.ts`) from the stored extents. A body whose digest no longer matches',
    ' * is fitted afresh at run time.',
    ` * Generated by \`${GENERATE_COMMAND}\`; do not edit by hand.`,
    ' */',
    "import type { StoredFits } from './extent.js';",
    '',
    'export const DRAWN_FITS: Partial<Record<string, StoredFits>> = {',
    ...entries,
    '};',
    '',
  ].join('\n');
}

/** The source of `extents.generated.ts` for these profiles. */
export function extentsModule(profiles: Record<DrawnFaceStyle, ExtentProfile>): string {
  const bands = (print: Footprint): string =>
    `[${print.map((b) => `{ y0: ${b.y0}, y1: ${b.y1}, x0: ${b.x0}, x1: ${b.x1} }`).join(', ')}]`;
  const entries = Object.entries(profiles).map(
    ([id, p]) =>
      `  ${id}: {\n    left: ${bands(p.left)},\n    right: ${bands(p.right)},\n    plateWide: ${bands(p.plateWide)},\n    plateNarrow: ${bands(p.plateNarrow)},\n    mouth: ${p.mouth},\n  },`,
  );
  return [
    '/*',
    " * The drawn faces' extents, measured from their designs by `face/drawn/extent.ts`.",
    ` * Generated by \`${GENERATE_COMMAND}\`; do not edit by hand.`,
    ' */',
    "import type { DrawnFaceStyle } from '../../core/types.js';",
    "import type { ExtentProfile } from './extent.js';",
    '',
    'export const DRAWN_EXTENTS: Record<DrawnFaceStyle, ExtentProfile> = {',
    ...entries,
    '};',
    '',
  ].join('\n');
}
