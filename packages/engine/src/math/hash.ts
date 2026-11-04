import {
  ASSIGNABLE_COLOR_IDS,
  AUTO_SHAPE_POOL,
  NOSE_IDS,
  type ColorId,
  type NoseId,
  type ShapeId,
} from '../core/types.js';

/** 32-bit FNV-1a. Stable across runs and platforms, which is the whole point. */
export function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    // h *= 16777619, kept in 32-bit range without BigInt.
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

/** Mulberry32 PRNG. Small, fast, and good enough for scatter and jitter. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Avalanche a hash so adjacent keys land far apart in the output pool. */
function finalize(h: number): number {
  let x = h >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

/**
 * Deterministic colour for an arbitrary key (an agent id, a username, anything).
 * The same key always produces the same colour, with no storage.
 */
export function autoColorForKey(key: string): ColorId {
  const r = mulberry32(fnv1a32(key))();
  return ASSIGNABLE_COLOR_IDS[Math.floor(r * ASSIGNABLE_COLOR_IDS.length)]!;
}

/** Deterministic body shape for an arbitrary key. */
export function autoShapeForKey(key: string): ShapeId {
  return AUTO_SHAPE_POOL[finalize(fnv1a32(key)) % AUTO_SHAPE_POOL.length]!;
}

/**
 * Deterministic nose for an arbitrary key, for the line face. Salted so a
 * key's nose is independent of its shape and colour.
 */
export function autoNoseForKey(key: string): NoseId {
  return NOSE_IDS[finalize(fnv1a32(`nose:${key}`)) % NOSE_IDS.length]!;
}
