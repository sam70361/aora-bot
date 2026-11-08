/**
 * Bakes the field-drawn themes into the static point loops their entries read
 * (`src/themes/<id>/art.generated.ts`), so no field is evaluated at run time.
 * `generate-faces.ts` writes the modules and `test/stored.test.ts` bakes them
 * again to check they still match their source.
 */
import { GENERATE_COMMAND } from '../../src/core/generated.js';
import type { ColorId, PartTone, ShapeId } from '../../src/core/types.js';
import type { StoredFits } from '../../src/face/drawn/extent.js';
import type { StoredFaceBox } from '../../src/shapes/face-boxes.js';
import {
  HALLOWEEN_DRAWN,
  HALLOWEEN_PROPS,
  type DrawnSource,
  type PropSource,
  type SourcePart,
} from './halloween.js';
import { CHRISTMAS_SOURCE } from './christmas.js';
import { SPRING_FESTIVAL_SOURCE } from './spring-festival.js';
import { MID_AUTUMN_SOURCE } from './mid-autumn.js';
import { EASTER_SOURCE } from './easter.js';
import { SUMMER_SOURCE } from './summer.js';
import { VALENTINE_SOURCE } from './valentine.js';
import type { MemberSource } from './lab.js';
import { bakeLoop, contours, cutTo, sampleGrid, type Grid } from './sdf.js';

export interface BakedPart {
  tone: PartTone;
  color?: ColorId;
  minPx?: number;
  plain?: boolean;
  underFace?: boolean;
  motion?: string;
  pivot?: readonly [number, number];
  loop: string;
}

/**
 * A source part that may name a signature motion (`ArtPart.motion`) and its pivot, in the 100-unit box, or sit
 * under the face (`ArtPart.underFace`).
 */
export type MovingPart = SourcePart & {
  motion?: string;
  pivot?: readonly [number, number];
  underFace?: boolean;
};

/** A whole figure's signature motions and their pivot, and a face box it pins (`FigureMotion`), in the 100-unit box. */
export interface BakedMotion {
  motion?: string | readonly string[];
  pivot?: readonly [number, number];
  faceBox?: { x: number; y: number; sx: number; sy: number };
  hairDeep?: number;
}

export type BakedArt =
  | ({ body: { loop: string }; face: readonly [number, number]; parts: BakedPart[] } & BakedMotion)
  | ({
      base: ShapeId;
      at: readonly [number, number];
      scale: number;
      props: BakedPart[];
      drop?: readonly number[];
      tint?: Readonly<Record<number, ColorId>>;
      plain?: readonly number[];
    } & BakedMotion);

/** A drawn source that may name its figure's motions. */
type MovingDrawn = DrawnSource & BakedMotion;
/** A prop source that may name its figure's motions and leave base parts plain (`PropArt.plain`). */
type MovingProps = PropSource & BakedMotion & { plain?: readonly number[] };

const motionOf = (source: BakedMotion): BakedMotion => ({
  ...(source.motion ? { motion: source.motion } : null),
  ...(source.motion && source.pivot ? { pivot: source.pivot } : null),
  ...(source.faceBox ? { faceBox: source.faceBox } : null),
  ...(source.hairDeep !== undefined ? { hairDeep: source.hairDeep } : null),
});

/** Spacing of the body's contour before it is thinned: no finer than the face fitter needs. */
const BODY_SPACING = 1.3;

function bakeParts(parts: readonly MovingPart[], body: Grid | null): BakedPart[] {
  const out: BakedPart[] = [];
  for (const part of parts) {
    const grid = body && !part.free ? cutTo(part.zone, body, part.inset ?? 0) : sampleGrid(part.zone);
    for (const ring of contours(grid)) {
      out.push({
        tone: part.tone,
        ...(part.color ? { color: part.color } : null),
        ...(part.minPx ? { minPx: part.minPx } : null),
        ...(part.plain ? { plain: true } : null),
        ...(part.underFace ? { underFace: true } : null),
        ...(part.motion ? { motion: part.motion } : null),
        ...(part.motion && part.pivot ? { pivot: part.pivot } : null),
        loop: bakeLoop(ring).join(' '),
      });
    }
  }
  return out;
}

function bakeDrawn(source: MovingDrawn): BakedArt {
  const field = sampleGrid(source.body);
  const outline = contours(field, BODY_SPACING)[0];
  if (!outline) throw new Error('A body field has no outline');
  return {
    body: { loop: bakeLoop(outline).join(' ') },
    face: source.face,
    parts: bakeParts(source.parts, field),
    ...motionOf(source),
  };
}

function bakeProps(source: MovingProps): BakedArt {
  return {
    base: source.base,
    at: source.at,
    scale: source.scale,
    props: bakeParts(source.props, null),
    ...(source.drop ? { drop: source.drop } : null),
    ...(source.tint ? { tint: source.tint } : null),
    ...(source.plain?.length ? { plain: source.plain } : null),
    ...motionOf(source),
  };
}

/** A theme's field-drawn characters: drawn ones and members of the roster wearing props. */
export interface ThemeSource {
  drawn: Readonly<Record<string, MovingDrawn>>;
  props: Readonly<Record<string, MovingProps>>;
  /** Its members, for a theme whose cast is written by the generator (`cast.generated.ts`). */
  members?: readonly MemberSource[];
}

/** Every theme drawn as fields, by theme id. A new theme adds its source module here. */
export const THEME_SOURCES: Readonly<Record<string, ThemeSource>> = {
  halloween: { drawn: HALLOWEEN_DRAWN, props: HALLOWEEN_PROPS },
  christmas: CHRISTMAS_SOURCE,
  'spring-festival': SPRING_FESTIVAL_SOURCE,
  'mid-autumn': MID_AUTUMN_SOURCE,
  easter: EASTER_SOURCE,
  summer: SUMMER_SOURCE,
  valentine: VALENTINE_SOURCE,
};

/** A theme's characters, baked, in roster order. */
export function bakeTheme(source: ThemeSource): Record<string, BakedArt> {
  return {
    ...Object.fromEntries(Object.entries(source.drawn).map(([id, drawn]) => [id, bakeDrawn(drawn)])),
    ...Object.fromEntries(Object.entries(source.props).map(([id, props]) => [id, bakeProps(props)])),
  };
}

const list = (values: readonly number[]): string => `[${values.join(', ')}]`;

function partSource(part: BakedPart): string {
  const color = part.color ? ` color: '${part.color}',` : '';
  const minPx = part.minPx ? ` minPx: ${part.minPx},` : '';
  const plain = `${part.plain ? ' plain: true,' : ''}${part.underFace ? ' underFace: true,' : ''}`;
  const motion = part.motion
    ? ` motion: '${part.motion}',${part.pivot ? ` pivot: ${list(part.pivot)},` : ''}`
    : '';
  return `{ tone: '${part.tone}',${color}${minPx}${plain}${motion} loop: '${part.loop}' }`;
}

/** A figure's motions as written in its entry, or nothing. */
function figureSource(art: BakedMotion): string {
  const box = art.faceBox;
  const pinned =
    (box ? ` faceBox: { x: ${box.x}, y: ${box.y}, sx: ${box.sx}, sy: ${box.sy} },` : '') +
    (art.hairDeep !== undefined ? ` hairDeep: ${art.hairDeep},` : '');
  if (!art.motion) return pinned;
  const ids =
    typeof art.motion === 'string' ? `'${art.motion}'` : `[${art.motion.map((m) => `'${m}'`).join(', ')}]`;
  return ` motion: ${ids},${art.pivot ? ` pivot: ${list(art.pivot)},` : ''}${pinned}`;
}

/** The source of a theme's `art.generated.ts`. Numbers are written as baked, so the module is the bake exactly. */
export function artModule(theme: string, rows: Record<string, BakedArt>): string {
  const entries = Object.entries(rows).map(([id, art]) => {
    if ('base' in art) {
      const drop = art.drop ? ` drop: ${list(art.drop)},` : '';
      const tint = art.tint
        ? ` tint: { ${Object.entries(art.tint)
            .map(([i, c]) => `  ${i}: '${c}'`)
            .join(', ')} },`
        : '';
      const plain = art.plain ? ` plain: ${list(art.plain)},` : '';
      return `  '${id}': { base: '${art.base}', at: ${list(art.at)}, scale: ${art.scale},${drop}${tint}${plain}${figureSource(art)} props: [${art.props.map(partSource).join(', ')}] },`;
    }
    return `  '${id}': { body: { loop: '${art.body.loop}' }, face: ${list(art.face)},${figureSource(art)} parts: [${art.parts.map(partSource).join(', ')}] },`;
  });
  return [
    '/*',
    ` * The ${theme} theme's characters, drawn as signed distance fields (\`scripts/art/\`) and baked`,
    ' * into point loops, so no field is evaluated at run time.',
    ` * Generated by \`${GENERATE_COMMAND}\`; do not edit by hand.`,
    ' */',
    "import type { CharacterArt } from '../../shapes/characters/art.js';",
    '',
    'export const ART: Readonly<Record<string, CharacterArt>> = {',
    ...entries,
    '};',
    '',
  ].join('\n');
}

/** The source of a theme's `faces.generated.ts`: its characters' face boxes and drawn-face fits. */
export function facesModule(
  theme: string,
  boxes: Record<string, StoredFaceBox>,
  fits: Record<string, StoredFits>,
): string {
  const box = ([id, { digest, box: b }]: [string, StoredFaceBox]): string =>
    `    '${id}': { digest: '${digest}', box: { ${(['x', 'y', 'sx', 'sy', 'eye', 'leftDX'] as const).map((key) => `${key}: ${b[key]}`).join(', ')} } },`;
  const fit = ([id, row]: [string, StoredFits]): string =>
    `    '${id}': { digest: '${row.digest}', fits: { ${Object.entries(row.fits)
      .map(([face, f]) => `${face}: [${f.join(', ')}]`)
      .join(', ')} } },`;
  return [
    '/*',
    ` * The ${theme} theme's face boxes (\`fitFace\`) and drawn-face fits, worked out for its characters.`,
    ' * A character whose digest no longer matches is fitted afresh on first use.',
    ` * Generated by \`${GENERATE_COMMAND}\`; do not edit by hand.`,
    ' */',
    "import type { ThemePackage } from '../types.js';",
    '',
    "export const FACES: ThemePackage['faces'] = {",
    '  boxes: {',
    ...Object.entries(boxes).map(box),
    '  },',
    '  fits: {',
    ...Object.entries(fits).map(fit),
    '  },',
    '};',
    '',
  ].join('\n');
}

/** The source of a theme's `cast.generated.ts`: its own members, what each is to it, and their shapes' names. */
export function castModule(theme: string, members: readonly MemberSource[]): string {
  const text = (value: string): string => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const pair = (value: { en: string; zh: string }): string =>
    `{ en: ${text(value.en)}, zh: ${text(value.zh)} }`;
  return [
    '/*',
    ` * The ${theme} theme's own members, what each is to the theme, and the names of their shapes, written from`,
    ' * its source (`scripts/art/`).',
    ` * Generated by \`${GENERATE_COMMAND}\`; do not edit by hand.`,
    ' */',
    "import type { ThemeCastMember } from '../../core/cast.js';",
    "import type { ThemeMember } from '../types.js';",
    '',
    'export const CAST: readonly ThemeCastMember[] = [',
    ...members.map(
      (m) =>
        `  { id: '${m.id}', name: ${pair(m.name)}, desc: ${pair(m.desc)}, shape: '${m.shape}', color: '${m.color}' },`,
    ),
    '];',
    '',
    'export const MEMBERS: readonly ThemeMember[] = [',
    ...members.map((m) =>
      m.kind === 'combo'
        ? `  { id: '${m.id}', kind: 'combo', base: '${m.base}' },`
        : `  { id: '${m.id}', kind: 'new' },`,
    ),
    '];',
    '',
    'export const SHAPE_LABELS: Readonly<Record<string, { en: string; zh: string }>> = {',
    ...members.map((m) => `  '${m.shape}': ${pair(m.name)},`),
    '};',
    '',
  ].join('\n');
}
