import { beforeEach, describe, expect, it } from 'vitest';
import { bakeTheme, THEME_SOURCES } from '../scripts/art/bake.js';
import { CORE_SHAPE_IDS, DRAWN_FACE_STYLES, type ShapeId } from '../src/core/types.js';
import { GENERATE_COMMAND } from '../src/core/generated.js';
import { measureExtent, type StoredFits } from '../src/face/drawn/extent.js';
import { DRAWN_EXTENTS } from '../src/face/drawn/extents.generated.js';
import { DRAWN_FITS } from '../src/face/drawn/fits.generated.js';
import { FACE_DESIGNS } from '../src/face/drawn/index.js';
import { computeFit, shapeDigest } from '../src/face/drawn/place.js';
import { drawnRest } from '../src/face/placement.js';
import type { StoredFaceBox } from '../src/shapes/face-boxes.js';
import { FACE_BOXES } from '../src/shapes/face-boxes.generated.js';
import { computeFaceBox, getShape } from '../src/shapes/registry.js';
import { installTheme, THEME_MANIFEST, type ThemePackage } from '../src/themes/index.js';
import { CHRISTMAS } from '../src/themes/christmas/index.js';
import { SPRING_FESTIVAL } from '../src/themes/spring-festival/index.js';
import { MID_AUTUMN } from '../src/themes/mid-autumn/index.js';
import { EASTER } from '../src/themes/easter/index.js';
import { SUMMER } from '../src/themes/summer/index.js';
import { VALENTINE } from '../src/themes/valentine/index.js';
import { HALLOWEEN } from '../src/themes/halloween/index.js';

/*
 * The roster's face boxes, the drawn faces' extents and their fits are worked
 * out ahead of time, so a live mount never searches a body or builds every
 * expression of a face, and the field-drawn themes are baked into points so
 * no field runs at all. Working them out again here keeps what is stored from
 * drifting away from the designs and the bodies. The core's data covers the
 * core's bodies only; each theme's lives with the theme and covers its own.
 */
const stale = (what: string): string =>
  `${what} no longer matches what it is worked out from. Run \`${GENERATE_COMMAND}\` and commit the generated modules (packages/engine/src/**/*.generated.ts).`;

const THEMES: Record<string, ThemePackage> = {
  halloween: HALLOWEEN,
  christmas: CHRISTMAS,
  'spring-festival': SPRING_FESTIVAL,
  'mid-autumn': MID_AUTUMN,
  easter: EASTER,
  summer: SUMMER,
  valentine: VALENTINE,
};
for (const theme of Object.values(THEMES)) installTheme(theme);

// The checks here block for minutes in all; the worker answers the runner's calls only between macrotasks.
beforeEach(() => new Promise((resolve) => setTimeout(resolve)));

/** The face data stored for a set of bodies, checked against what is worked out for them now. */
function checkFaces(
  label: string,
  ids: readonly ShapeId[],
  boxes: Readonly<Partial<Record<string, StoredFaceBox>>>,
  fits: Readonly<Partial<Record<string, StoredFits>>>,
): void {
  describe(`${label}: stored face boxes`, { timeout: 120000 }, () => {
    it('cover every body and nothing else', () => {
      expect(Object.keys(boxes).sort(), stale(`The list of ${label} face boxes`)).toEqual([...ids].sort());
    });

    it.each(ids)('match the face box worked out for %s', (id) => {
      expect(boxes[id], stale(`The stored face box of "${id}"`)).toEqual(computeFaceBox(id));
    });
  });

  describe(`${label}: stored fits`, { timeout: 120000 }, () => {
    it('cover every body and nothing else', () => {
      expect(Object.keys(fits).sort(), stale(`The list of ${label} fits`)).toEqual([...ids].sort());
    });

    it.each(ids)('match how every face fits %s', (id) => {
      const shape = getShape(id);
      const stored = fits[id];
      expect(stored?.digest, stale(`The stored fit of "${id}"`)).toBe(shapeDigest(shape));
      const rest = drawnRest(shape);
      for (const face of DRAWN_FACE_STYLES) {
        const fit = computeFit(shape, FACE_DESIGNS[face], DRAWN_EXTENTS[face], rest);
        expect(stored?.fits[face], stale(`The stored fit of "${face}" on "${id}"`)).toEqual([
          fit.scale,
          fit.drop,
          fit.squeeze,
        ]);
      }
    });
  });
}

describe('stored face extents', { timeout: 60000 }, () => {
  it.each(DRAWN_FACE_STYLES)('match what the %s design measures', (id) => {
    expect(DRAWN_EXTENTS[id], stale(`The stored extent of "${id}"`)).toEqual(measureExtent(FACE_DESIGNS[id]));
  });
});

checkFaces('core', CORE_SHAPE_IDS, FACE_BOXES, DRAWN_FITS);

describe('themes', { timeout: 60000 }, () => {
  it('every shipped theme has an entry checked here', () => {
    expect(Object.keys(THEMES).sort()).toEqual(THEME_MANIFEST.map((entry) => entry.id).sort());
  });

  it.each(Object.keys(THEME_SOURCES))('the baked art of %s matches what its fields bake to', (id) => {
    expect(THEMES[id]!.art, stale(`The baked art of "${id}"`)).toEqual(bakeTheme(THEME_SOURCES[id]!));
  });

  it.each(Object.keys(THEME_SOURCES).filter((id) => THEME_SOURCES[id]!.members))(
    'the cast of %s matches what its source names',
    (id) => {
      const members = THEME_SOURCES[id]!.members!;
      expect(THEMES[id]!.cast, stale(`The cast of "${id}"`)).toEqual(
        members.map(({ id: member, name, desc, shape, color }) => ({ id: member, name, desc, shape, color })),
      );
      expect(THEMES[id]!.definition.members.slice(0, members.length)).toEqual(
        members.map((m) =>
          m.kind === 'combo' ? { id: m.id, kind: 'combo', base: m.base } : { id: m.id, kind: 'new' },
        ),
      );
    },
  );

  it.each(THEME_MANIFEST.map((entry) => [entry.id, entry] as const))(
    'the entry of %s draws exactly the shapes the manifest gives it',
    (id, entry) => {
      expect(Object.keys(THEMES[id]!.art).sort()).toEqual([...entry.shapes].sort());
      expect(THEMES[id]!.cast.map((member) => member.id).sort()).toEqual([...entry.cast].sort());
      expect(THEMES[id]!.variants.map((v) => v.variant).sort()).toEqual(
        entry.variants.map((v) => v.variant).sort(),
      );
    },
  );
});

for (const entry of THEME_MANIFEST) {
  const theme = THEMES[entry.id]!;
  checkFaces(entry.id, entry.shapes, theme.faces.boxes, theme.faces.fits);
}
