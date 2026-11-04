import {
  emotionSegment,
  IDLE_EMOTION_ID,
  normaliseId,
  SEGMENT_FALLBACK,
  type EmotionId,
} from './protocol.js';

/**
 * A `sprite-mate` manifest: a folder of PNG frames keyed by protocol id.
 *
 * This is the escape hatch for a character that cannot be drawn
 * procedurally — a painted mascot, a photograph-derived pet. It speaks the
 * same protocol as the vector characters, so a host can swap one for the
 * other without touching its state logic.
 */
export interface SpriteManifest {
  kind: 'sprite-mate';
  formatVersion: 1;
  id: string;
  name?: { en?: string; zh?: string };
  /** Pixel size of every frame. */
  frameSize: [number, number];
  /** Playback rate for multi-frame clips. */
  fps?: number;
  /** Where the character stands within the frame, as fractions of the frame. */
  anchor?: [number, number];
  license?: string;
  provenance?: Record<string, unknown>;
  /** Protocol id → frame file names, relative to the manifest. */
  frames: Record<string, string[]>;
  /** Protocol id → another id to show instead when this one has no frames. */
  fallback?: Record<string, string>;
}

/** A manifest lookup result. */
export interface SpriteClip {
  /** The id whose frames are shown, after fallback. */
  id: EmotionId;
  /** Frame file names, relative to the manifest. */
  files: string[];
  /** How the id was satisfied. */
  via: 'direct' | 'manifest' | 'segment' | 'idle';
}

/** The manifest's own chain is followed at most this many hops. */
export const SPRITE_FALLBACK_HOPS = 4;

/** Structural check for something fetched off the network. */
export function isSpriteManifest(value: unknown): value is SpriteManifest {
  if (!value || typeof value !== 'object') return false;
  const m = value as Partial<SpriteManifest>;
  return (
    m.kind === 'sprite-mate' &&
    m.formatVersion === 1 &&
    typeof m.id === 'string' &&
    Array.isArray(m.frameSize) &&
    m.frameSize.length === 2 &&
    !!m.frames &&
    typeof m.frames === 'object'
  );
}

const framesFor = (manifest: SpriteManifest, id: string): string[] | null => {
  const files = manifest.frames[id];
  return files && files.length > 0 ? files : null;
};

/**
 * Pick the frames for an id.
 *
 * Order: the id itself; the manifest's own `fallback` chain (bounded, so a
 * cycle in a hand-written manifest cannot hang the page); the protocol's
 * segment fallback; idle. `null` only for a manifest with no usable frames
 * at all — idle is mandatory in a valid sheet, so a `null` is an authoring
 * error, not a runtime state to design for.
 */
export function resolveSpriteFrames(
  manifest: SpriteManifest,
  id: EmotionId | string | number,
): SpriteClip | null {
  const start = normaliseId(id);
  const direct = framesFor(manifest, start);
  if (direct) return { id: start, files: direct, via: 'direct' };

  let cursor: string | undefined = manifest.fallback?.[start];
  const seen = new Set<string>([start]);
  for (let hop = 0; cursor && hop < SPRITE_FALLBACK_HOPS && !seen.has(cursor); hop++) {
    seen.add(cursor);
    const files = framesFor(manifest, cursor);
    if (files) return { id: cursor, files, via: 'manifest' };
    cursor = manifest.fallback?.[cursor];
  }

  const seg = emotionSegment(start);
  if (seg) {
    const segFiles = framesFor(manifest, SEGMENT_FALLBACK[seg]);
    if (segFiles) return { id: SEGMENT_FALLBACK[seg], files: segFiles, via: 'segment' };
  }

  const idle = framesFor(manifest, IDLE_EMOTION_ID);
  if (idle) return { id: IDLE_EMOTION_ID, files: idle, via: 'idle' };
  return null;
}

/** How one id is served by a manifest. */
export type SpriteCoverageKind = 'direct' | 'fallback' | 'dead';

export interface SpriteCoverage {
  /** Per id, whether it has its own frames, borrows some, or has none. */
  ids: Record<EmotionId, { kind: SpriteCoverageKind; via?: EmotionId }>;
  direct: number;
  fallback: number;
  dead: number;
  /** Authoring problems, in English. Empty for a valid sheet. */
  problems: string[];
}

/**
 * Audit a manifest against a list of ids (normally `EMOTION_IDS`).
 *
 * The rules a sheet must satisfy: idle (`02`) has frames; every fallback
 * target exists as a key; the fallback graph has no cycles; every frame list
 * is non-empty. Everything else is reported, not enforced.
 */
export function spriteCoverage(manifest: SpriteManifest, ids: readonly EmotionId[]): SpriteCoverage {
  const problems: string[] = [];
  const result: SpriteCoverage['ids'] = {};
  let direct = 0;
  let fallback = 0;
  let dead = 0;

  if (!framesFor(manifest, IDLE_EMOTION_ID)) problems.push(`idle (${IDLE_EMOTION_ID}) has no frames`);

  for (const [id, files] of Object.entries(manifest.frames)) {
    if (!Array.isArray(files) || files.length === 0) problems.push(`"${id}" lists no frames`);
  }

  for (const [from, to] of Object.entries(manifest.fallback ?? {})) {
    if (!(to in manifest.frames) && !(to in (manifest.fallback ?? {}))) {
      problems.push(`fallback "${from}" → "${to}" points at an unknown id`);
    }
    // Walk the chain from `from`; a repeat means a cycle.
    const seen = new Set<string>([from]);
    let cursor: string | undefined = to;
    while (cursor) {
      if (seen.has(cursor)) {
        problems.push(`fallback chain from "${from}" cycles`);
        break;
      }
      seen.add(cursor);
      cursor = manifest.fallback?.[cursor];
    }
  }

  for (const id of ids) {
    const clip = resolveSpriteFrames(manifest, id);
    if (!clip) {
      result[id] = { kind: 'dead' };
      dead++;
    } else if (clip.via === 'direct') {
      result[id] = { kind: 'direct' };
      direct++;
    } else {
      result[id] = { kind: 'fallback', via: clip.id };
      fallback++;
    }
  }

  return { ids: result, direct, fallback, dead, problems };
}
