import type { FrameSnapshot, PartFrame } from '../sim/snapshot.js';

const kept = new WeakMap<readonly PartFrame[], { sizePx: number; parts: readonly PartFrame[] }>();

/**
 * The frame without the parts too fine to show at `sizePx` across the
 * character (`ShapePart.minPx`): the same frame when the size is not known
 * (0) or every part shows.
 */
export function withoutFineParts(frame: FrameSnapshot, sizePx: number): FrameSnapshot {
  const all = frame.body.parts;
  if (sizePx <= 0 || !all.some((part) => part.minPx !== undefined && sizePx < part.minPx)) return frame;
  let entry = kept.get(all);
  if (entry?.sizePx !== sizePx) {
    entry = { sizePx, parts: all.filter((part) => part.minPx === undefined || sizePx >= part.minPx) };
    kept.set(all, entry);
  }
  return { ...frame, body: { ...frame.body, parts: entry.parts } };
}
