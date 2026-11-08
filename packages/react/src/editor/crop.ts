/**
 * The maths behind the crop stage, and the two steps that need a canvas.
 *
 * Kept apart from the component because none of it is React: it is arithmetic
 * over a rectangle, and arithmetic is the part that is easy to get subtly
 * wrong (an image that can be dragged until it shows a corner of nothing is
 * the classic symptom). Everything above `cropToDataUrl` is pure and runs on
 * a server; the last two functions touch a canvas, but only when called, so
 * this module is safe to import anywhere.
 */

/** Refuse anything larger. Above this a data URL alone is enough to stall a tab. */
export const MAX_UPLOAD_BYTES = 20 * 1000 * 1000;

/** Longest edge kept after loading. A source photo is usually several times this. */
export const MAX_SOURCE_PX = 1600;

/** Side of the square crop window. */
export const CROP_STAGE_PX = 120;

/** Side of the exported PNG. Three times the stage, so a retina avatar stays sharp. */
export const EXPORT_PX = 360;

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
/** Step for the plus and minus buttons — twelve presses from end to end. */
export const ZOOM_STEP = 0.25;

export interface Size {
  width: number;
  height: number;
}

/** Offset of the image's centre from the stage's centre, in stage pixels. */
export interface Pan {
  x: number;
  y: number;
}

export interface CropView extends Size {
  /** 1 fills the stage on the short edge; `ZOOM_MAX` is the tightest crop offered. */
  zoom: number;
  /** Side of the crop window. Defaults to `CROP_STAGE_PX`. */
  stagePx?: number;
}

/**
 * The size to decode a source image at.
 *
 * Downsampling on the way in rather than on the way out is what keeps the
 * crop stage smooth: dragging a 6000px photo around means the browser
 * resamples all of it every frame, and the extra detail cannot survive the
 * export anyway.
 */
export function fitImage(width: number, height: number, max = MAX_SOURCE_PX): Size & { scale: number } {
  const longest = Math.max(width, height);
  if (longest <= max || longest === 0) return { width, height, scale: 1 };
  const scale = max / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale), scale };
}

/**
 * Pixels of stage per pixel of image.
 *
 * Fitted to the *short* edge, so zoom 1 fills the window in both directions
 * and there is never a gap to pan into — the alternative, fitting the long
 * edge, starts every portrait photo with bars top and bottom.
 */
export function coverScale({ width, height, zoom, stagePx = CROP_STAGE_PX }: CropView): number {
  const shortest = Math.min(width, height);
  if (!shortest) return zoom;
  return (stagePx / shortest) * clampZoom(zoom);
}

export const clampZoom = (zoom: number): number =>
  Number.isFinite(zoom) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom)) : ZOOM_MIN;

/** How far the centre may travel before an edge of the image enters the window. */
export function panLimit(view: CropView): Pan {
  const scale = coverScale(view);
  const stagePx = view.stagePx ?? CROP_STAGE_PX;
  return {
    x: Math.max(0, (view.width * scale - stagePx) / 2),
    y: Math.max(0, (view.height * scale - stagePx) / 2),
  };
}

/**
 * Hold the crop window inside the image.
 *
 * Clamped rather than rubber-banded: a 1:1 zoom on a square image has nowhere
 * to go, and a drag that visibly moves and then springs back reads as a bug
 * rather than as a limit.
 */
export function clampPan(pan: Pan, view: CropView): Pan {
  const limit = panLimit(view);
  // The trailing `|| 0` turns both a negative zero and a NaN into 0. Either
  // would end up in a `translate()` as `-0px` or `NaNpx`, and the second
  // silently drops the whole transform.
  return {
    x: Math.min(limit.x, Math.max(-limit.x, pan.x || 0)) || 0,
    y: Math.min(limit.y, Math.max(-limit.y, pan.y || 0)) || 0,
  };
}

export interface CropRequest extends CropView {
  pan: Pan;
  /** Side of the exported square. Defaults to `EXPORT_PX`. */
  exportPx?: number;
}

/**
 * Where the image lands on the export canvas.
 *
 * Separated from the drawing so it can be checked without a canvas: the
 * export is the stage scaled up by a constant, and getting that constant
 * wrong shifts the crop by a few pixels — visible on a face, invisible in a
 * test that only asserts the canvas was touched.
 */
export function exportPlacement(request: CropRequest): { x: number; y: number } & Size {
  const stagePx = request.stagePx ?? CROP_STAGE_PX;
  const exportPx = request.exportPx ?? EXPORT_PX;
  const ratio = exportPx / stagePx;
  const scale = coverScale(request) * ratio;
  const pan = clampPan(request.pan, request);
  const width = request.width * scale;
  const height = request.height * scale;
  return {
    x: exportPx / 2 + pan.x * ratio - width / 2,
    y: exportPx / 2 + pan.y * ratio - height / 2,
    width,
    height,
  };
}

export type ImageSource = CanvasImageSource & Size;

/**
 * Render the crop to a PNG data URL.
 *
 * A data URL rather than a `Blob`: the caller is about to put this in a form
 * field or a store, and an object URL would have to be revoked by whoever
 * ends up holding it. Returns `null` when there is no 2D context to draw
 * into, which is the honest answer in a server render or a locked-down
 * canvas, and lets the caller keep the character instead.
 */
export function cropToDataUrl(image: ImageSource, request: Omit<CropRequest, keyof Size>): string | null {
  const exportPx = request.exportPx ?? EXPORT_PX;
  const canvas = document.createElement('canvas');
  canvas.width = exportPx;
  canvas.height = exportPx;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const view = { ...request, width: image.width, height: image.height };
  const placement = exportPlacement(view);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, placement.x, placement.y, placement.width, placement.height);
  return canvas.toDataURL('image/png');
}

export type ReadResult = { ok: true; dataUrl: string } | { ok: false; reason: 'too-large' | 'not-an-image' };

/**
 * Validate and read a dropped, pasted or chosen file.
 *
 * Both failures are reported rather than thrown. A file that is too large is
 * a thing the person did, not an error in the program, and the editor has a
 * line of copy ready for each.
 */
export function readImageFile(file: File): Promise<ReadResult> {
  if (!file.type.startsWith('image/')) return Promise.resolve({ ok: false, reason: 'not-an-image' });
  if (file.size > MAX_UPLOAD_BYTES) return Promise.resolve({ ok: false, reason: 'too-large' });

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const result = reader.result;
      if (typeof result === 'string') resolve({ ok: true, dataUrl: result });
      else resolve({ ok: false, reason: 'not-an-image' });
    });
    reader.addEventListener('error', () => resolve({ ok: false, reason: 'not-an-image' }));
    reader.readAsDataURL(file);
  });
}

export interface LoadedImage extends Size {
  element: HTMLImageElement;
  /** The source, downsampled to `MAX_SOURCE_PX` if it arrived larger. */
  dataUrl: string;
}

/**
 * Decode a data URL and bring it down to a workable size.
 *
 * The redraw through a canvas is the downsample: the browser's own filtering
 * on a single large step is better than the repeated bilinear passes a CSS
 * transform would do on every drag frame.
 */
export function loadImage(dataUrl: string): Promise<LoadedImage | null> {
  return new Promise((resolve) => {
    const element = new Image();
    element.addEventListener('load', () => {
      const fitted = fitImage(element.naturalWidth, element.naturalHeight);
      if (fitted.scale === 1) {
        resolve({ element, width: fitted.width, height: fitted.height, dataUrl });
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = fitted.width;
      canvas.height = fitted.height;
      const context = canvas.getContext('2d');
      if (!context) {
        resolve({ element, width: fitted.width, height: fitted.height, dataUrl });
        return;
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(element, 0, 0, fitted.width, fitted.height);

      const smaller = canvas.toDataURL('image/png');
      const reloaded = new Image();
      reloaded.addEventListener('load', () =>
        resolve({ element: reloaded, width: fitted.width, height: fitted.height, dataUrl: smaller }),
      );
      reloaded.addEventListener('error', () =>
        resolve({ element, width: fitted.width, height: fitted.height, dataUrl }),
      );
      reloaded.src = smaller;
    });
    element.addEventListener('error', () => resolve(null));
    element.src = dataUrl;
  });
}
