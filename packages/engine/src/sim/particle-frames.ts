import { particleOpacity, particleSize, type Particle, type Trail } from '../particles.js';
import type { ParticleFrame, TrailFrame } from './snapshot.js';

const NONE: readonly never[] = Object.freeze([]);

/** Paper as renderers see it: position, size and a ready-made opacity. */
export function particleFrames(list: readonly Particle[]): readonly ParticleFrame[] {
  if (list.length === 0) return NONE;
  return list.map((p) => ({
    x: p.x,
    y: p.y,
    size: particleSize(p),
    rotation: p.rotation,
    kind: p.kind,
    color: p.color,
    opacity: particleOpacity(p),
  }));
}

/** Ribbons as renderers see them; one too short or too thin to draw is left out. */
export function trailFrames(list: readonly Trail[]): readonly TrailFrame[] {
  if (list.length === 0) return NONE;
  const frames: TrailFrame[] = [];
  for (const t of list) {
    if (t.points.length < 2 || t.size < 0.5) continue;
    frames.push({ hue: t.hue, size: t.size, opacity: t.opacity, points: t.points });
  }
  return frames.length > 0 ? frames : NONE;
}
