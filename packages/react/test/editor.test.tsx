import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AvatarEditor } from '../src/editor/AvatarEditor.js';
import { AvatarTrigger } from '../src/editor/AvatarTrigger.js';
import { EditableAvatar } from '../src/editor/EditableAvatar.js';
import {
  clampPan,
  clampZoom,
  coverScale,
  CROP_STAGE_PX,
  EXPORT_PX,
  exportPlacement,
  fitImage,
  MAX_SOURCE_PX,
  panLimit,
  ZOOM_MAX,
  ZOOM_MIN,
} from '../src/editor/crop.js';

/*
 * The crop maths is the part of the editor worth testing on its own: it is
 * where an off-by-a-factor shows up as a photo that can be dragged off the
 * side of its own frame, and none of it needs a canvas.
 */

describe('fitImage', () => {
  it('leaves anything already small enough alone', () => {
    expect(fitImage(800, 600)).toEqual({ width: 800, height: 600, scale: 1 });
  });

  it('brings the long edge down to the limit and keeps the ratio', () => {
    const fitted = fitImage(4000, 3000);
    expect(fitted.width).toBe(MAX_SOURCE_PX);
    expect(fitted.height).toBe(768);
    expect(fitted.scale).toBeCloseTo(0.256, 5);
  });

  it('measures the long edge whichever way round the image is', () => {
    expect(fitImage(3000, 4000).height).toBe(MAX_SOURCE_PX);
  });

  it('survives a zero-sized image', () => {
    expect(fitImage(0, 0)).toEqual({ width: 0, height: 0, scale: 1 });
  });
});

describe('coverScale', () => {
  it('fits the short edge, so zoom 1 fills the window', () => {
    const scale = coverScale({ width: 400, height: 200, zoom: 1 });
    expect(200 * scale).toBe(CROP_STAGE_PX);
    expect(400 * scale).toBeGreaterThan(CROP_STAGE_PX);
  });

  it('multiplies by the zoom', () => {
    expect(coverScale({ width: 200, height: 200, zoom: 2 })).toBeCloseTo(
      coverScale({ width: 200, height: 200, zoom: 1 }) * 2,
      6,
    );
  });

  it('clamps a zoom outside the offered range', () => {
    expect(clampZoom(0.2)).toBe(ZOOM_MIN);
    expect(clampZoom(99)).toBe(ZOOM_MAX);
    expect(clampZoom(Number.NaN)).toBe(ZOOM_MIN);
  });
});

describe('panLimit and clampPan', () => {
  it('has nowhere to pan a square image at zoom 1', () => {
    expect(panLimit({ width: 300, height: 300, zoom: 1 })).toEqual({ x: 0, y: 0 });
    expect(clampPan({ x: 40, y: -40 }, { width: 300, height: 300, zoom: 1 })).toEqual({ x: 0, y: 0 });
  });

  it('allows the overhang of a wide image along one axis only', () => {
    const view = { width: 400, height: 200, zoom: 1 };
    const limit = panLimit(view);
    expect(limit.y).toBe(0);
    expect(limit.x).toBeCloseTo(CROP_STAGE_PX / 2, 6);
    expect(clampPan({ x: 500, y: 12 }, view)).toEqual({ x: limit.x, y: 0 });
    expect(clampPan({ x: -500, y: 0 }, view)).toEqual({ x: -limit.x, y: 0 });
  });

  it('grows the room to pan with the zoom', () => {
    const wide = panLimit({ width: 300, height: 300, zoom: 3 });
    expect(wide.x).toBeCloseTo(CROP_STAGE_PX, 6);
    expect(wide.y).toBeCloseTo(CROP_STAGE_PX, 6);
  });

  it('treats a nonsense pan as the centre', () => {
    expect(clampPan({ x: Number.NaN, y: Number.NaN }, { width: 400, height: 400, zoom: 2 })).toEqual({
      x: 0,
      y: 0,
    });
  });
});

describe('exportPlacement', () => {
  it('scales the stage up to the export and keeps it centred', () => {
    const placed = exportPlacement({ width: 200, height: 200, zoom: 1, pan: { x: 0, y: 0 } });
    expect(placed.width).toBeCloseTo(EXPORT_PX, 6);
    expect(placed.height).toBeCloseTo(EXPORT_PX, 6);
    expect(placed.x).toBeCloseTo(0, 6);
    expect(placed.y).toBeCloseTo(0, 6);
  });

  it('moves the image by the pan, multiplied by the export ratio', () => {
    const ratio = EXPORT_PX / CROP_STAGE_PX;
    const placed = exportPlacement({
      width: 400,
      height: 200,
      zoom: 1,
      pan: { x: 10, y: 0 },
    });
    // Half the window's width of overhang is available, so 10px is legal.
    expect(placed.x).toBeCloseTo(EXPORT_PX / 2 + 10 * ratio - placed.width / 2, 6);
  });

  it('applies the same clamp the stage does', () => {
    const view = { width: 400, height: 200, zoom: 1 } as const;
    const far = exportPlacement({ ...view, pan: { x: 9999, y: 9999 } });
    const limit = exportPlacement({ ...view, pan: panLimit(view) });
    expect(far).toEqual(limit);
  });
});

describe('editor surfaces', () => {
  const value = { shape: 'blob', color: 'blue' } as const;

  it.each([
    ['AvatarEditor', <AvatarEditor value={value} />],
    ['AvatarEditor with a picture', <AvatarEditor value={{ ...value, pictureUrl: '/a.png' }} />],
    ['AvatarEditor with generation', <AvatarEditor value={value} generateImage={async () => '/a.png'} />],
    ['AvatarTrigger', <AvatarTrigger value={value} />],
    ['EditableAvatar', <EditableAvatar value={value} lineWeight={1.2} />],
  ])('%s renders without a DOM', (_name, element) => {
    const html = renderToString(element);
    expect(html).toBeTruthy();
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
  });

  it('opens on the Upload tab when there is already a picture', () => {
    const html = renderToString(<AvatarEditor value={{ ...value, pictureUrl: '/a.png' }} />);
    expect(html).toContain('id="aora-editor-panel-upload"');
  });

  it('hides the Generate tab when no generator is injected', () => {
    expect(renderToString(<AvatarEditor value={value} />)).not.toContain('aora-editor-tab-generate');
    expect(renderToString(<AvatarEditor value={value} generateImage={async () => '/a.png'} />)).toContain(
      'aora-editor-tab-generate',
    );
  });

  it('draws the pencil from the engine generator rather than an icon', () => {
    const html = renderToString(<EditableAvatar value={value} />);
    // A path with real commands, in a box centred on the origin.
    expect(html).toMatch(/viewBox="-12 -12 24 24"/);
    expect(html).toMatch(/d="M[-\d.]/);
  });
});
