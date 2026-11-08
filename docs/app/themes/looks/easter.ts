import { SPARKLE, daisy, egg, scatter, softCloud } from './draw.js';
import { LATIN, ROUND, type ThemeLook } from './types.js';

const grass = () =>
  `<path d="M0 270${Array.from({ length: 72 }, (_, i) => `l10 -${8 + (i % 3) * 4}l10 ${8 + (i % 3) * 4}`).join('')}V360H0Z" fill="var(--look-scene-grass)" transform="translate(0 18)"/>`;

export const EASTER: ThemeLook = {
  tagline: {
    zh: '蜡笔涂过的春天草地，翻开就能捡到彩蛋。',
    en: 'A spring meadow in crayon, with an egg to find on every page.',
  },
  palette: {
    cover: ['#a8e4c8', '#3f8a63'],
    coverDeep: ['#7cc98f', '#2c6646'],
    coverInk: ['#2f2434', '#f4fff7'],
    accent: ['#e0789a', '#f08cb0'],
    accentInk: ['#fff8ea', '#2a1620'],
    stock: ['#ffffff', '#262329'],
    stockInk: ['#3d2e43', '#f3ecf3'],
    stockMuted: ['#8b7b86', '#b6a8b4'],
    art: ['#fffbf4', '#1f1c22'],
    sky: [
      ['#e9f5fb', '#1f2a33'],
      ['#f8f4ea', '#1c2024'],
    ],
    skyInk: ['#3d2e43', '#f3ecf3'],
    emblemInk: ['#fff8ea', '#fff8ea'],
    emblem2: ['#e0789a', '#e0789a'],
    emblem3: ['#cbb5f0', '#cbb5f0'],
    pattern: ['rgb(255 179 198 / 0.45)', 'rgb(255 179 198 / 0.3)'],
    pattern2: ['rgb(255 255 255 / 0.3)', 'rgb(255 255 255 / 0.08)'],
  },
  foil: { stops: ['#ffb3c6', '#ffe38f', '#a8e4c8', '#a6d3f2', '#cbb5f0', '#ffb3c6'], angle: 135 },
  pattern: {
    width: 26,
    height: 26,
    markup: `<rect width="13" height="26" fill="var(--look-pattern)"/><rect width="26" height="13" fill="var(--look-pattern)"/><rect x="13" y="13" width="13" height="13" fill="var(--look-pattern-2)"/>`,
  },
  emblem: `<path d="M12 2.6c4 0 7 6.2 7 11a7 7 0 0 1-14 0c0-4.8 3-11 7-11z"/>
    <path class="e3" d="M5.6 12.6l2.1-1.8 2.1 1.8 2.2-1.8 2.1 1.8 2.1-1.8 2.2 1.8" fill="none" stroke-width="1.6" stroke-linejoin="round"/>
    <circle class="e2" cx="9.4" cy="16.4" r="1.2"/><circle class="e2" cx="14.6" cy="16.4" r="1.2"/>`,
  title: {
    font: ROUND,
    weight: 900,
    tracking: '0.04em',
    color: ['#ffb3c6', '#ffb3c6'],
    outline: { width: '0.06em', color: 'var(--look-sky-ink)' },
    glyphs: {
      colors: ['#ffb3c6', '#a6d3f2', '#ffe38f', '#a8e4c8'],
      turns: [-4, 3, -2, 4],
      lifts: [0, -0.06, 0, 0],
    },
    layout: { header: 'line', booklet: 'line' },
    gloss: { font: LATIN.hand, style: 'normal', tracking: '0.06em', uppercase: true },
  },
  scene: {
    inks: {
      cloud: ['#ffffff', '#2c3a44'],
      hill: ['#a8e4c8', '#2f5a46'],
      grass: ['#7cc98f', '#24503a'],
    },
    layers: [
      `${softCloud(900, 64, 1.2, 'var(--look-scene-cloud)')}${softCloud(1080, 50, 1.1, 'var(--look-scene-cloud)')}${softCloud(1240, 30, 0.8, 'var(--look-scene-cloud)')}`,
      `<g fill="none" stroke-linecap="round">${scatter(51, 14, [860, 40, 1440, 220], (x, y, _r, i) => `<path d="M${x.toFixed(0)} ${y.toFixed(0)}l6 -6m-6 0l6 6" stroke="${['#ffb3c6', '#cbb5f0', '#a6d3f2', '#ffe38f'][i % 4]}" stroke-width="3"/>`)}</g>`,
      `<path d="M0 270C200 236 420 250 640 266S1080 236 1440 256V360H0Z" fill="var(--look-scene-hill)"/>`,
      grass(),
      `${egg(700, 280, 1.2, '#ffb3c6', '#cbb5f0', -12)}${egg(760, 292, 0.9, '#a6d3f2', '#ffe38f', 10)}${egg(1110, 276, 1.3, '#ffe38f', '#ff9c55', 8)}${egg(1180, 290, 0.85, '#cbb5f0', '#ffb3c6', -16)}${egg(930, 300, 0.8, '#a8e4c8', '#a6d3f2', 4)}`,
      `${daisy(600, 286, 0.8)}${daisy(1000, 276, 1)}${daisy(1340, 268, 1.2)}`,
      `<g transform="translate(1300 140)"><ellipse cx="-12" cy="-8" rx="13" ry="10" fill="#cbb5f0"/><ellipse cx="12" cy="-8" rx="13" ry="10" fill="#cbb5f0"/><ellipse cx="-8" cy="8" rx="8" ry="7" fill="#ffb3c6"/><ellipse cx="8" cy="8" rx="8" ry="7" fill="#ffb3c6"/><rect x="-3" y="-14" width="6" height="28" rx="3" fill="#3d2e43"/></g>`,
    ],
  },
  deco: `${egg(78, 58, 0.9, '#ffb3c6', '#cbb5f0', -14)}${egg(40, 74, 0.6, '#a6d3f2', '#ffe38f', 12)}`,
  card: {
    border: 'stitched',
    number: 'tab',
    name: 'tag',
    corner: `<g transform="translate(12 12)">${Array.from({ length: 6 }, (_, i) => `<ellipse rx="2.4" ry="5" transform="rotate(${i * 60}) translate(0 -5)" fill="#fffaf1" stroke="currentColor" stroke-width=".6"/>`).join('')}<circle r="2.8" fill="#ffe38f"/></g>`,
  },
  back: {
    inset: 'dashed',
    ring: `<g opacity=".7">${egg(60, 64, 1.5, 'none', 'currentColor')}</g>`,
    name: true,
  },
  binder: {
    rule: ['rgb(124 201 143 / 0.12)', 'rgb(124 201 143 / 0.07)'],
    ring: 'round',
    sleeve: ['rgb(61 46 67 / 0.05)', 'rgb(255 255 255 / 0.05)'],
  },
  spine: { stitch: 'dashed', band: '#ffe38f' },
  particles: {
    shapes: [
      `<path d="M12 3c4 0 7 6 7 10.6a7 7 0 0 1-14 0C5 9 8 3 12 3z"/>`,
      `<ellipse cx="12" cy="12" rx="4" ry="8" transform="rotate(30 12 12)"/>`,
      `<path transform="translate(12 12) scale(.8)" d="${SPARKLE}"/>`,
    ],
    colors: ['#ffb3c6', '#a6d3f2', '#ffe38f', '#a8e4c8', '#cbb5f0'],
    count: 18,
  },
};
