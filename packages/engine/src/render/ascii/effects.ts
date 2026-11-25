/**
 * Effects the character cells play on their own clock.
 *
 * Each is a function of the grid and the time alone: the same inputs give the
 * same cells, so a frame can be redrawn or compared without remembering the
 * last. They write into the grid they are given, which is the frame's own.
 */
import { fnv1a32, mulberry32 } from '../../math/hash.js';
import { CELL, type CharGrid } from './cells.js';
import type { Charset } from './charsets.js';
import type { AsciiEffect } from './options.js';

export interface EffectContext {
  /** Seconds of simulated time. */
  time: number;
  /** The motion rate; 0 leaves it to the effect. */
  fps: number;
  seed: string;
  /** When the state last changed, or the renderer mounted. */
  stateSince: number;
  charset: Charset;
  /** Nothing may move: reduced motion. */
  settled: boolean;
}

type EffectFn = (grid: CharGrid, ctx: EffectContext) => void;

/** Seconds the cells take to settle after a state change. */
const DECODE_SECONDS = 0.45;
/** How much of that the top row waits before the bottom one, and how much a cell's own luck adds. */
const DECODE_SWEEP = 0.25;
const DECODE_JITTER = 0.12;

const SHIMMER_EVERY = 3.2;
const SHIMMER_SWEEP = 0.9;
/** Width of the lit band, in steps of `col + row * 2`. */
const SHIMMER_BAND = 2;

const GLITCH_CHANCE = 0.025;
const GLITCH_NOISE_CELLS = 3;

/** A rate for effects that need slots when the style's own is off. */
const FREE_RATE = 30;

/** A number in [0, 1) that depends on the key alone. */
const luck = (key: string): number => mulberry32(fnv1a32(key))();

const noiseAt = (charset: Charset, key: string): string =>
  charset.noise[Math.floor(luck(key) * charset.noise.length)]!;

/** Cells scramble through noise, then resolve top to bottom, for a moment after a state changes. */
function decode(grid: CharGrid, ctx: EffectContext): void {
  const since = ctx.time - ctx.stateSince;
  if (since >= DECODE_SECONDS) return;
  const bucket = Math.floor(ctx.time * (ctx.fps > 0 ? ctx.fps : FREE_RATE));
  for (let i = 0; i < grid.glyph.length; i++) {
    if (grid.glyph[i] === '') continue;
    const row = Math.floor(i / grid.cols);
    const delay = (row / grid.rows) * DECODE_SWEEP + luck(`${ctx.seed}:d:${i}`) * DECODE_JITTER;
    if (since < delay) grid.glyph[i] = noiseAt(ctx.charset, `${ctx.seed}:n:${i}:${bucket}`);
  }
}

/** A diagonal band of light crosses the body now and then. */
function shimmer(grid: CharGrid, ctx: EffectContext): void {
  const rate = ctx.fps > 0 ? ctx.fps : FREE_RATE;
  const phase = (Math.floor(ctx.time * rate) / rate) % SHIMMER_EVERY;
  if (phase >= SHIMMER_SWEEP) return;
  const reach = grid.cols + grid.rows * 2;
  const head = -SHIMMER_BAND + (phase / SHIMMER_SWEEP) * (reach + SHIMMER_BAND);
  for (let i = 0; i < grid.glyph.length; i++) {
    if (grid.kind[i] !== CELL.fill) continue;
    const col = i % grid.cols;
    const row = Math.floor(i / grid.cols);
    const along = col + row * 2;
    if (along >= head && along < head + SHIMMER_BAND) grid.glyph[i] = ctx.charset.fill(1, col, row);
  }
}

/** Move a row's cells sideways by `by`; what leaves the grid is gone. */
function shiftRow(grid: CharGrid, row: number, by: number): void {
  const at = row * grid.cols;
  const glyph = grid.glyph.slice(at, at + grid.cols);
  const paint = grid.paint.slice(at, at + grid.cols);
  const kind = grid.kind.slice(at, at + grid.cols);
  for (let col = 0; col < grid.cols; col++) {
    const from = col - by;
    const inside = from >= 0 && from < grid.cols;
    grid.glyph[at + col] = inside ? glyph[from]! : '';
    grid.paint[at + col] = inside ? paint[from]! : 0;
    grid.kind[at + col] = inside ? kind[from]! : CELL.empty;
  }
}

/** Now and then, for one slot, a couple of rows slip sideways and a few cells turn to noise. */
function glitch(grid: CharGrid, ctx: EffectContext): void {
  const slot = Math.floor(ctx.time * (ctx.fps > 0 ? ctx.fps : FREE_RATE));
  const key = `${ctx.seed}:g:${slot}`;
  if (luck(key) >= GLITCH_CHANCE) return;

  const busy: number[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      if (grid.glyph[row * grid.cols + col] !== '') {
        busy.push(row);
        break;
      }
    }
  }
  if (busy.length === 0) return;

  const slipped = 1 + Math.floor(luck(`${key}:n`) * 2);
  for (let k = 0; k < slipped; k++) {
    const row = busy[Math.floor(luck(`${key}:r${k}`) * busy.length)]!;
    const by = (1 + Math.floor(luck(`${key}:m${k}`) * 2)) * (luck(`${key}:s${k}`) < 0.5 ? -1 : 1);
    shiftRow(grid, row, by);
  }

  const lit: number[] = [];
  for (let i = 0; i < grid.glyph.length; i++) if (grid.glyph[i] !== '') lit.push(i);
  for (let k = 0; lit.length > 0 && k < GLITCH_NOISE_CELLS; k++) {
    const i = lit[Math.floor(luck(`${key}:c${k}`) * lit.length)]!;
    grid.glyph[i] = noiseAt(ctx.charset, `${key}:g${k}`);
  }
}

/** The effects by the id the `effect` parameter takes; `none` is not among them. */
export const ASCII_EFFECTS: Record<Exclude<AsciiEffect, 'none'>, EffectFn> = {
  decode,
  shimmer,
  glitch,
};

/** Play `effect` over `grid`. A settled frame, or no effect, leaves it as it is. */
export function applyEffect(grid: CharGrid, effect: AsciiEffect, ctx: EffectContext): void {
  if (ctx.settled || effect === 'none') return;
  ASCII_EFFECTS[effect](grid, ctx);
}
