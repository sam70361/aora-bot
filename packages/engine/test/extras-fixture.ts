import { CENTER, type ShapeId } from '../src/core/types.js';
import type { DecorSpec } from '../src/themes/extras/index.js';
import { EXTRAS } from '../src/themes/extras/index.js';
import type { ThemePackage } from '../src/themes/types.js';

/** A theme that is not shipped, declaring every extra: decorations, part motions and a vivid mood accent. */

const SPARK =
  'M12 1.5C12.8 8.4 15.6 11.2 22.5 12C15.6 12.8 12.8 15.6 12 22.5C11.2 15.6 8.4 12.8 1.5 12C8.4 11.2 11.2 8.4 12 1.5Z';
const MOON = 'M15.5 2.5A9.8 9.8 0 1 0 21.5 16 7.8 7.8 0 0 1 15.5 2.5Z';

export const DECOR: DecorSpec = {
  glyphs: {
    spark: { layers: [{ d: SPARK }] },
    moon: { layers: [{ d: MOON, paint: { color: 'yellow' } }] },
    zz: { layers: [{ d: 'M3 4.5h7.5l-7.5 8h7.5', stroke: 2.6 }] },
  },
  moods: {
    bright: [
      { glyph: 'spark', paint: 'accent', size: 22, zone: 'top-left', animation: { kind: 'twinkle' } },
      { glyph: 'spark', paint: { from: 'ink', hue: 40, chroma: 0.12 }, size: 16, zone: 'right', count: 2 },
    ],
    drowsy: [
      { glyph: 'moon', paint: 'ink', size: 22, zone: 'top-left', animation: { kind: 'drift' } },
      { glyph: 'zz', paint: 'fx', size: 18, zone: 'upper', animation: { kind: 'rise' } },
    ],
  },
  states: {
    angry: [
      { glyph: 'spark', paint: 'contrast', size: 18, zone: 'around', count: 3, animation: { kind: 'pop' } },
    ],
  },
  minPx: 64,
};

export const FLAG = 'fx-flag' as ShapeId;
/** A figure that rocks and snows as a whole, with a two-piece cap that turns as one. */
export const ROCKER = 'fx-rocker' as ShapeId;
/** A roster member wearing a prop, its first own part left plain. */
export const CAPPED = 'fx-capped' as ShapeId;
/** A figure whose face box the art pins. */
export const PINNED = 'fx-pinned' as ShapeId;
/** A stripe across the face drawn under it, and the same stripe the face keeps off. */
export const PAINTED = 'fx-painted' as ShapeId;
export const MASKED = 'fx-masked' as ShapeId;

export const FIXTURE: ThemePackage = {
  definition: {
    id: 'fixture-extras',
    name: { en: 'Fixture', zh: '测试' },
    cast: ['mochi'],
    members: [{ id: 'mochi', kind: 'borrowed' }],
    shape: { fixed: 'mochi' },
    color: { open: ['orange'] },
    style: { open: [{ style: 'vector', variant: 'fixdoodle' }] },
    face: { open: ['cute'] },
  },
  art: {
    [FLAG]: {
      body: 'M20 40C20 18 70 18 70 40L70 92L20 92Z',
      face: [45, 60],
      parts: [
        { tone: 'leaf', d: 'M66 2L98 10L66 20Z', motion: 'wave', pivot: [66, 11] },
        { tone: 'inner', d: 'M30 30L38 30L38 38L30 38Z', motion: 'bubbles' },
        { tone: 'leaf', d: 'M4 60L14 60L14 70L4 70Z', motion: 'glow' },
      ],
    },
    [ROCKER]: {
      body: 'M25 40C25 18 75 18 75 40L75 92L25 92Z',
      face: [50, 60],
      motion: ['rock', 'snow'],
      pivot: [50, 92],
      parts: [
        { tone: 'leaf', d: 'M40 6L60 6L60 14L40 14Z', motion: 'cap' },
        { tone: 'leaf', d: 'M44 0L56 0L56 6L44 6Z', motion: 'cap' },
      ],
    },
    [CAPPED]: {
      base: 'bunny',
      at: [50, 58],
      scale: 0.8,
      plain: [0],
      props: [{ tone: 'leaf', d: 'M30 10L70 10L50 0Z' }],
    },
    [PINNED]: {
      body: 'M20 20L80 20L80 90L20 90Z',
      face: [50, 55],
      faceBox: { x: 50, y: 70, sx: 18, sy: 10 },
    },
    [PAINTED]: {
      base: 'mochi',
      at: [50, 50],
      scale: 0.9,
      props: [{ tone: 'leaf', d: 'M30 52L70 52L70 60L30 60Z', underFace: true }],
    },
    [MASKED]: {
      base: 'mochi',
      at: [50, 50],
      scale: 0.9,
      props: [{ tone: 'leaf', d: 'M30 52L70 52L70 60L30 60Z' }],
    },
  },
  faces: { boxes: {}, fits: {} },
  cast: [],
  variants: [
    {
      style: 'vector',
      variant: 'fixdoodle',
      reads: [],
      medium: {
        followsMood: true,
        moodAccent: { chroma: 0.16, lightness: [0.6, 0.85], share: 1.5 },
        paint: (piece, ctx) => [
          ctx.kit.node('path', { d: ctx.kit.closedCurve(piece.ring), fill: ctx.accent(piece.color).fill }),
        ],
      },
    },
    {
      style: 'vector',
      variant: 'fixplain',
      reads: [],
      medium: {
        paint: (piece, ctx) => [
          ctx.kit.node('path', { d: ctx.kit.closedCurve(piece.ring), fill: piece.color }),
        ],
      },
      decor: null,
    },
    {
      style: 'vector',
      variant: 'fixhalo',
      reads: [],
      medium: {
        paint: (piece, ctx) => [
          ctx.kit.node('path', { d: ctx.kit.closedCurve(piece.ring), fill: piece.color }),
        ],
        underlay: (_frame, _pieces, ctx) => [
          ctx.kit.node('circle', { cx: CENTER, cy: CENTER, r: 130, fill: '#ffe08a' }),
        ],
        underlayMotion: (frame) => (frame.shape === FLAG ? 'breathe' : undefined),
        reach: 0.1,
      },
      decor: null,
    },
  ],
  colors: [],
  labels: { shapes: {}, variants: {} },
  decor: DECOR,
  extras: EXTRAS,
  motions: {
    wave: { kind: 'rotate', amplitude: 12, period: 2.4 },
    bubbles: { kind: 'emit', count: 3, travel: [0, -20], period: 2, spread: 6, grow: 1.2 },
    glow: { kind: 'blink', amplitude: 0.6, period: 1.2, when: { moods: ['drowsy'] } },
    breathe: { kind: 'blink', amplitude: 0.45, period: 3 },
    rock: {
      kind: 'keys',
      period: 3,
      when: { except: { moods: ['drowsy'] } },
      keys: [
        { at: 0, rotate: -7 },
        { at: 0.12, rotate: -7.5 },
        { at: 0.45, rotate: 7, skew: [0, 3] },
        { at: 0.58, rotate: 7.5 },
        { at: 0.8, opacity: 0.9 },
        { at: 1, rotate: -7 },
      ],
    },
    snow: {
      kind: 'emit',
      count: 4,
      period: 6,
      vary: 0.4,
      at: [50, 4],
      spread: [90, 0],
      travel: [10, 80],
      turn: 200,
      glyph: 'spark',
      size: 6,
      paint: { color: 'sky' },
    },
    cap: { kind: 'rotate', amplitude: 10, period: 2, origin: [0.5, 1] },
  },
};
