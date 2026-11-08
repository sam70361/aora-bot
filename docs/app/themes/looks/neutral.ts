import { SPARKLE, stars } from './draw.js';
import { SANS, type ThemeLook } from './types.js';

/** For a theme the engine ships before its look does: the site's own paper, ink and accent. */
export const NEUTRAL: ThemeLook = {
  tagline: {
    zh: '一组新角色，翻开看看。',
    en: 'A new set of characters. Open it and see.',
  },
  palette: {
    cover: ['oklch(0.32 0.03 260)', 'oklch(0.3 0.03 260)'],
    coverDeep: ['oklch(0.22 0.03 260)', 'oklch(0.2 0.03 260)'],
    coverInk: ['oklch(0.96 0.01 85)', 'oklch(0.96 0.01 85)'],
    accent: ['var(--aora-blue-500)', 'var(--aora-blue-400)'],
    accentInk: ['#ffffff', 'oklch(0.2 0.03 260)'],
    stock: ['oklch(0.995 0.003 85)', 'oklch(0.24 0.006 85)'],
    stockInk: ['oklch(0.24 0.01 85)', 'oklch(0.955 0.004 85)'],
    stockMuted: ['oklch(0.5 0.01 85)', 'oklch(0.72 0.01 85)'],
    art: ['oklch(0.96 0.008 85)', 'oklch(0.19 0.005 85)'],
    sky: [
      ['oklch(0.34 0.04 260)', 'oklch(0.26 0.03 260)'],
      ['oklch(0.24 0.03 260)', 'oklch(0.18 0.02 260)'],
    ],
    skyInk: ['oklch(0.96 0.01 85)', 'oklch(0.96 0.01 85)'],
    emblemInk: ['oklch(0.3 0.03 260)', 'oklch(0.3 0.03 260)'],
    emblem2: ['oklch(0.6 0.15 257)', 'oklch(0.6 0.15 257)'],
    emblem3: ['#ffffff', '#ffffff'],
    pattern: ['rgb(255 255 255 / 0.1)', 'rgb(255 255 255 / 0.08)'],
    pattern2: ['rgb(255 255 255 / 0.05)', 'rgb(255 255 255 / 0.04)'],
  },
  foil: { stops: ['#9aa3b5', '#eef1f6', '#b9c1cf', '#ffffff', '#8f98ab', '#d6dbe4'], angle: 135 },
  pattern: { width: 16, height: 16, markup: `<circle cx="8" cy="8" r="1" fill="var(--look-pattern)"/>` },
  emblem: `<rect x="4" y="4" width="16" height="16" rx="4"/><circle class="e3" cx="12" cy="12" r="3.2"/>`,
  title: {
    font: SANS,
    weight: 700,
    tracking: '-0.01em',
    color: ['oklch(0.96 0.01 85)', 'oklch(0.96 0.01 85)'],
    layout: { header: 'line', booklet: 'line' },
    gloss: { font: SANS, style: 'normal', tracking: '0.16em', uppercase: true },
  },
  scene: { inks: {}, layers: [stars(7, 40, [600, 20, 1440, 300], '#ffffff')] },
  deco: `<circle cx="84" cy="36" r="18" fill="currentColor" opacity=".3"/>`,
  card: { border: 'foil', number: 'plain', name: 'plain' },
  back: { inset: 'solid', name: true },
  binder: {
    rule: ['rgb(0 0 0 / 0.04)', 'rgb(255 255 255 / 0.03)'],
    ring: 'round',
    sleeve: ['rgb(0 0 0 / 0.04)', 'rgb(255 255 255 / 0.04)'],
  },
  spine: { stitch: 'dashed' },
  particles: {
    shapes: [
      `<path transform="translate(12 12) scale(.8)" d="${SPARKLE}"/>`,
      `<circle cx="12" cy="12" r="4"/>`,
    ],
    colors: ['#ffffff', 'oklch(0.7 0.14 257)'],
    count: 14,
  },
};
