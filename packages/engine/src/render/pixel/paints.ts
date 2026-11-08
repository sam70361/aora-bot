/**
 * What a cell can be painted with.
 *
 * The rasteriser writes small integers into a buffer, one per cell; this
 * table says what each integer means. Keeping colour out of the buffer means
 * "did the picture change?" is a comparison of two typed arrays, and the
 * emitter can turn one table into CSS (live) or into hex plus a dark-mode
 * override (static) without the rasteriser knowing which.
 */
import type { PartColor } from '../../core/types.js';
import { clamp01 } from '../../math/easing.js';

/** A colour described, not resolved. */
export type Tint =
  /** The character's ink: `band` along a gradient ink, `tone` a light or dark step (see `shade.ts`). */
  | { kind: 'ink'; band: number; tone: number }
  /** Hair: the ink at `band`, mixed towards the hair shade, which the renderer resolves per colour and scheme. */
  | { kind: 'hair'; band: number }
  /** A state effect: the ink at `band`, or what the renderer draws effects in where the ink is lost on the page. */
  | { kind: 'fx'; band: number }
  /** A literal CSS colour: confetti, the eye cut-out, the badge. */
  | { kind: 'css'; value: string }
  /** A part's own colour, or its ring (`rim`), a `tone` step lighter or darker (see `shade.ts`). */
  | { kind: 'part'; color: PartColor; tone: number; rim: boolean };

export interface PaintDef {
  tint: Tint;
  /** Opacity, quantised to quarters: a cell is either lit or not, so a fade becomes a few steps. */
  alpha: number;
}

/** 0 is "nothing here"; every other id is an index into `defs` plus one. */
export interface PaintTable {
  readonly defs: PaintDef[];
  id(tint: Tint, alpha: number): number;
  clear(): void;
}

export function createPaintTable(): PaintTable {
  const defs: PaintDef[] = [];
  const ids = new Map<string, number>();
  return {
    defs,
    id(tint, alpha) {
      const key = `${tintKey(tint)}@${alpha}`;
      let id = ids.get(key);
      if (id === undefined) {
        defs.push({ tint, alpha });
        id = defs.length;
        ids.set(key, id);
      }
      return id;
    },
    clear() {
      defs.length = 0;
      ids.clear();
    },
  };
}

function tintKey(tint: Tint): string {
  switch (tint.kind) {
    case 'ink':
      return `i${tint.band}:${tint.tone}`;
    case 'hair':
      return `h${tint.band}`;
    case 'fx':
      return `f${tint.band}`;
    case 'css':
      return `c${tint.value}`;
    case 'part':
      return `p${tint.rim ? 'r' : ''}${tint.tone}:${tint.color}`;
  }
}

/** Opacity to the nearest quarter; 0 means too faint to draw at all. */
export const alphaLevel = (opacity: number): number => Math.round(clamp01(opacity) * 4) / 4;
