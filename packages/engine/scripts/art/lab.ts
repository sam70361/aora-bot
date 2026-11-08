/**
 * Theme sources in the form the lab drew them in: characters and props as
 * signed distance fields in a 100 x 100 box, parts as `[tone, zone, options]`,
 * and colours as the sheet's own hex values, which `colors` maps onto the
 * engine's palette. A theme's source module (`scripts/art/<id>.js`) keeps the
 * lab's drawing as it was, and this turns it into what the generator bakes
 * and the members it writes.
 */
import type { ColorId, PartTone, ShapeId } from '../../src/core/types.js';
import type { BakedMotion, MovingPart } from './bake.js';
import type { DrawnSource, PropSource } from './halloween.js';
import type { Field, Pt } from './sdf.js';

/**
 * A part as the lab writes it. `c` is a sheet colour, mapped through the theme's `colors`; a hair or inner part
 * with a colour of its own is laid flat in it. `move` (or a bare string in its place) names a motion the page played
 * on the part alone, about `pivot`; such a part stands free of the body, and with `labTheme`'s `motions` option on
 * it names that motion (`ArtPart.motion`, declared in the theme's `motions`). `fine` marks detail the lab left out
 * of a character shown smaller than `LAB_FINE_PX`. `avoid` keeps a coloured hair part in the hair tone, so the face
 * keeps off it as it does off hair; it is still laid flat in its colour. `stitch: false` marks a part the lab left
 * undecorated.
 */
export type LabPart = readonly [
  PartTone,
  Field,
  (
    | {
        c?: string;
        free?: boolean;
        inset?: number;
        move?: string;
        pivot?: Pt;
        fine?: boolean;
        avoid?: boolean;
        stitch?: boolean;
        under?: boolean;
      }
    | string
  )?,
];

/** How a lab theme is read. `motions` carries each part's `move` and `pivot` into the art as its motion. */
export interface LabOptions {
  motions?: boolean;
}

/** The width, in CSS pixels, below which the lab left a `fine` part out. */
export const LAB_FINE_PX = 48;

/**
 * A character's sheet colours: the body, the leaf tone, and the colour its hair tone was shaded towards.
 * A part with no colour of its own takes `leaf` if it is a leaf part. A hair part whose `shade` has a swatch in
 * `shades` takes that swatch; otherwise it keeps the hair tone, the body's own ink darkened.
 */
export interface LabPaint {
  fill: string;
  leaf?: string;
  shade?: string;
}

/** A character drawn for the theme. `desc` is the English line beside the lab's own `concept`. */
export interface LabArt {
  id: string;
  zh: string;
  en: string;
  concept: string;
  desc: string;
  paint: LabPaint;
  face: Pt;
  body: () => Field;
  parts: readonly LabPart[];
  /**
   * The whole figure's signature motions (`FigureMotion`), about `pivot` in the 100 box. A lab cast's own `motion`
   * is a note in words: strip it (or rename it) before `labTheme`, as every shipped source does.
   */
  motion?: string | readonly string[];
  pivot?: Pt;
  /** The lab's face box (centre and half-extents in the 100 box), pinned instead of fitted. */
  faceBox?: { x: number; y: number; sx: number; sy: number };
  /** What its uncoloured hair is shaded towards, as a share of the ink's lightness (`DrawnArt.hairDeep`). */
  hairDeep?: number;
}

/** A member of the roster wearing the theme's props. `prop` names the prop in Chinese, `en` the combination in English. */
export interface LabCombo {
  id: string;
  /** The shape it is built on. */
  base: ShapeId;
  /** The member it is built on. */
  member: string;
  zh: string;
  prop: string;
  en: string;
  concept: string;
  desc: string;
  paint: LabPaint;
  at: Pt;
  s: number;
  drop?: readonly number[];
  tint?: Readonly<Record<number, string>>;
  /** The base's parts a skin leaves undecorated, by index (`PropArt.plain`). */
  plain?: readonly number[];
  props: () => readonly LabPart[];
  motion?: string | readonly string[];
  pivot?: Pt;
  faceBox?: { x: number; y: number; sx: number; sy: number };
  hairDeep?: number;
}

/** A member as the generator writes it into the theme's `cast.generated.ts`. */
export interface MemberSource {
  id: string;
  shape: string;
  color: ColorId;
  name: { en: string; zh: string };
  desc: { en: string; zh: string };
  kind: 'new' | 'combo';
  base?: string;
}

export interface LabThemeSource {
  drawn: Record<string, DrawnSource & BakedMotion>;
  props: Record<string, PropSource & BakedMotion & { plain?: readonly number[] }>;
  members: MemberSource[];
}

/**
 * A lab theme's characters and props, its colours mapped onto the palette (`colors`, and `shades` for the hair
 * tone). Throws for a colour the map lacks.
 */
export function labTheme(
  arts: readonly LabArt[],
  combos: readonly LabCombo[],
  colors: Readonly<Record<string, ColorId>>,
  shades: Readonly<Record<string, ColorId>> = {},
  { motions = false }: LabOptions = {},
): LabThemeSource {
  const color = (hex: string): ColorId => {
    const id = colors[hex.toLowerCase()];
    if (!id) throw new Error(`No palette colour for the sheet colour ${hex}`);
    return id;
  };
  const partOf =
    (paint: LabPaint) =>
    ([tone, zone, given = {}]: LabPart): MovingPart => {
      const options: Exclude<LabPart[2], string | undefined> =
        typeof given === 'string' ? { move: given } : given;
      const shaded =
        !options.c && tone === 'hair' && paint.shade ? shades[paint.shade.toLowerCase()] : undefined;
      const own =
        (options.c && color(options.c)) ??
        (tone === 'leaf' && paint.leaf ? color(paint.leaf) : undefined) ??
        shaded;
      return {
        tone: own && (tone === 'inner' || (tone === 'hair' && !options.avoid)) ? 'leaf' : tone,
        zone,
        ...(own ? { color: own } : null),
        ...(options.free || options.move ? { free: true } : null),
        ...(options.inset !== undefined ? { inset: options.inset } : null),
        ...(options.fine ? { minPx: LAB_FINE_PX } : null),
        ...(options.stitch === false ? { plain: true } : null),
        ...(options.under ? { underFace: true } : null),
        ...(motions && options.move ? { motion: options.move } : null),
        ...(motions && options.move && options.pivot ? { pivot: options.pivot } : null),
      };
    };
  const figure = (source: BakedMotion) => ({
    ...(source.motion ? { motion: source.motion } : null),
    ...(source.motion && source.pivot ? { pivot: source.pivot } : null),
    ...(source.faceBox ? { faceBox: source.faceBox } : null),
    ...(source.hairDeep !== undefined ? { hairDeep: source.hairDeep } : null),
  });
  const drawn = Object.fromEntries(
    arts.map((art) => [
      art.id,
      { body: art.body(), face: art.face, parts: art.parts.map(partOf(art.paint)), ...figure(art) },
    ]),
  );
  const props = Object.fromEntries(
    combos.map((combo) => [
      combo.id,
      {
        base: combo.base,
        at: combo.at,
        scale: combo.s,
        props: combo.props().map(partOf(combo.paint)),
        ...(combo.drop?.length ? { drop: combo.drop } : null),
        ...(combo.plain?.length ? { plain: combo.plain } : null),
        ...figure(combo),
        ...(combo.tint
          ? {
              tint: Object.fromEntries(Object.entries(combo.tint).map(([i, hex]) => [Number(i), color(hex)])),
            }
          : null),
      },
    ]),
  );
  const members: MemberSource[] = [
    ...arts.map((art): MemberSource => ({
      id: art.id,
      shape: art.id,
      color: color(art.paint.fill),
      name: { en: art.en, zh: art.zh },
      desc: { en: art.desc, zh: art.concept },
      kind: 'new',
    })),
    ...combos.map((combo): MemberSource => ({
      id: combo.id,
      shape: combo.id,
      color: color(combo.paint.fill),
      name: { en: combo.en, zh: `${combo.prop}${combo.zh}` },
      desc: { en: combo.desc, zh: combo.concept },
      kind: 'combo',
      base: combo.member,
    })),
  ];
  return { drawn, props, members };
}
