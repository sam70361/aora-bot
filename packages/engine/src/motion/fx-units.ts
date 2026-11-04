/**
 * The units the effects are written in, shared by the mood effects and the activity ones.
 */
import { SHAPE_SPACE } from '../core/types.js';

/** Colours the effects keep on every variant. Ink-coloured ones are `null`, so the renderer picks the ink. */
export const FX_COLORS = {
  gold: '#F5B428',
  alert: '#EB4B4F',
  tear: '#7CC7FF',
  heart: '#FF6F91',
} as const;

/** Canvas units to shape units: the figure's 100 units are `SHAPE_SPACE`, drawn at 0.86. */
export const K = SHAPE_SPACE / 100 / 0.86;
const FIG_TX = 7;
const FIG_TY = 10;
export const atX = (x: number): number => (x - FIG_TX) * K;
export const atY = (y: number): number => (y - FIG_TY) * K;

/** Where the small instruments (spinner, progress bar, ping, orbit) sit: the top right, among the thinking dots. */
export const CORNER_X = atX(85);
export const CORNER_Y = atY(15);

export const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);
export const easeIn = (t: number): number => t * t;
/** 0 → 1 → 0 over one period, smooth at both ends. */
export const wave = (p: number): number => 0.5 - 0.5 * Math.cos(p * Math.PI * 2);

/** Progress through a looping animation that starts after `delay`, or -1 while it is still waiting. */
export const loop = (t: number, period: number, delay = 0): number => {
  const local = t - delay;
  return local < 0 ? -1 : (local % period) / period;
};
