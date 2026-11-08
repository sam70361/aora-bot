/**
 * Writes the engine's generated modules. For the core:
 * `src/shapes/face-boxes.generated.ts`, the roster's face boxes;
 * `src/face/drawn/extents.generated.ts`, every drawn face's extent measured
 * from its design; and `src/face/drawn/fits.generated.ts`, how each face is
 * fitted to each body of the roster. For every theme drawn as fields
 * (`THEME_SOURCES`): `src/themes/<id>/art.generated.ts`, its characters
 * baked into points, `src/themes/<id>/cast.generated.ts`, its members where
 * its source names them, and `src/themes/<id>/faces.generated.ts`, their face
 * boxes and fits. Run with `pnpm --filter @aora-bot/engine generate:faces`
 * after changing a design or a body; `test/stored.test.ts` fails until what
 * is stored matches again.
 *
 * Run through vitest (`scripts/vitest.config.ts`), which resolves the
 * engine's TypeScript sources the way its tests do. The modules are written
 * in the repository's own format, so `format:check` passes on them untouched.
 * The art is written first and the engine is loaded only after it, so the
 * boxes and fits are worked out for the bodies just baked.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { test, vi } from 'vitest';
import type { DrawnFaceStyle, ShapeId } from '../src/core/types.js';
import type { ExtentProfile, StoredFit, StoredFits } from '../src/face/drawn/extent.js';
import type { StoredFaceBox } from '../src/shapes/face-boxes.js';
import { artModule, bakeTheme, castModule, facesModule, THEME_SOURCES } from './art/bake.js';

async function write(path: string, source: string): Promise<void> {
  const target = fileURLToPath(new URL(`../src/${path}`, import.meta.url));
  writeFileSync(target, await format(source, { ...(await resolveConfig(target)), filepath: target }));
}

test('generate drawn faces', async () => {
  await Promise.all(
    Object.entries(THEME_SOURCES).flatMap(([theme, source]) => [
      write(`themes/${theme}/art.generated.ts`, artModule(theme, bakeTheme(source))),
      ...(source.members
        ? [write(`themes/${theme}/cast.generated.ts`, castModule(theme, source.members))]
        : []),
    ]),
  );
  vi.resetModules();

  const { CORE_SHAPE_IDS, DRAWN_FACE_STYLES } = await import('../src/core/types.js');
  const { extentsModule, fitsModule, measureExtent } = await import('../src/face/drawn/extent.js');
  const { FACE_DESIGNS } = await import('../src/face/drawn/index.js');
  const { computeFit, shapeDigest } = await import('../src/face/drawn/place.js');
  const { drawnRest } = await import('../src/face/placement.js');
  const { faceBoxesModule } = await import('../src/shapes/face-boxes.js');
  const { computeFaceBox, getShape } = await import('../src/shapes/registry.js');
  const { installTheme, THEME_MANIFEST } = await import('../src/themes/index.js');

  const extents = Object.fromEntries(
    DRAWN_FACE_STYLES.map((id) => [id, measureExtent(FACE_DESIGNS[id])]),
  ) as Record<DrawnFaceStyle, ExtentProfile>;
  const faceData = (ids: readonly ShapeId[]) => {
    const fits: Record<string, StoredFits> = {};
    const boxes: Record<string, StoredFaceBox> = {};
    for (const id of ids) {
      const shape = getShape(id);
      const rest = drawnRest(shape);
      const row = {} as Record<DrawnFaceStyle, StoredFit>;
      for (const face of DRAWN_FACE_STYLES) {
        const fit = computeFit(shape, FACE_DESIGNS[face], extents[face], rest);
        row[face] = [fit.scale, fit.drop, fit.squeeze];
      }
      fits[id] = { digest: shapeDigest(shape), fits: row };
      boxes[id] = computeFaceBox(id);
    }
    return { boxes, fits };
  };

  const core = faceData(CORE_SHAPE_IDS);
  await write('shapes/face-boxes.generated.ts', faceBoxesModule(core.boxes));
  await write('face/drawn/extents.generated.ts', extentsModule(extents));
  await write('face/drawn/fits.generated.ts', fitsModule(core.fits));

  const entries = await Promise.all(
    THEME_MANIFEST.map(async (entry) => {
      const module = (await import(`../src/themes/${entry.id}/index.ts`)) as Record<string, unknown>;
      return { entry, theme: Object.values(module)[0] as Parameters<typeof installTheme>[0] };
    }),
  );
  await Promise.all(
    entries.map(({ entry, theme }) => {
      installTheme(theme);
      const own = faceData(entry.shapes);
      return write(`themes/${entry.id}/faces.generated.ts`, facesModule(entry.id, own.boxes, own.fits));
    }),
  );
}, 600000);
