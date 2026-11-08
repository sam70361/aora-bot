import { blossom, cloudSwirl, coin, lantern, scatter } from './draw.js';
import { KAI, LATIN, type ThemeLook } from './types.js';

const BLOSSOMS: readonly (readonly [number, number])[] = [
  [110, 64],
  [200, 70],
  [262, 118],
  [176, 112],
  [86, 30],
  [40, 66],
];

export const SPRING_FESTIVAL: ThemeLook = {
  tagline: {
    zh: '红纸一剪，金线一描，新年第一页贴满吉祥话。',
    en: 'Red paper cut and traced in gold: the first page of the year, covered in good wishes.',
  },
  palette: {
    cover: ['#c8221d', '#a51a17'],
    coverDeep: ['#8f141b', '#650f12'],
    coverInk: ['#fff1d6', '#ffe7bd'],
    accent: ['#d42a24', '#f6b73c'],
    accentInk: ['#fff1d6', '#2a0e0c'],
    stock: ['#fffaf0', '#2c1d1a'],
    stockInk: ['#2a1a1c', '#f6e6d6'],
    stockMuted: ['#7d6458', '#bba08f'],
    art: ['#fbf0dc', '#22161a'],
    sky: [
      ['#d8322b', '#b32420'],
      ['#8a141b', '#5c0d12'],
    ],
    skyInk: ['#fff1d6', '#fff1d6'],
    emblemInk: ['#c8221d', '#c8221d'],
    emblem2: ['#f6b73c', '#f6b73c'],
    emblem3: ['#ffd27a', '#ffd27a'],
    pattern: ['rgb(246 183 60 / 0.42)', 'rgb(246 183 60 / 0.34)'],
    pattern2: ['rgb(246 183 60 / 0.22)', 'rgb(246 183 60 / 0.18)'],
  },
  foil: { stops: ['#a9661a', '#f6b73c', '#fff0bf', '#e09b2a', '#ffd77a', '#b07018'], angle: 135 },
  pattern: {
    width: 30,
    height: 30,
    markup: `${coin(15, 15, 6.4, 'var(--look-pattern)', 1.4)}${coin(0, 0, 6.4, 'var(--look-pattern-2)', 1.4)}${coin(30, 0, 6.4, 'var(--look-pattern-2)', 1.4)}${coin(0, 30, 6.4, 'var(--look-pattern-2)', 1.4)}${coin(30, 30, 6.4, 'var(--look-pattern-2)', 1.4)}`,
  },
  emblem: `<rect x="5.2" y="5.2" width="13.6" height="13.6" rx="1.6" transform="rotate(45 12 12)"/>
    <rect class="e3" x="9" y="9" width="6" height="6" rx=".8" transform="rotate(45 12 12)" fill="none" stroke-width="1.4"/>`,
  title: {
    font: KAI,
    weight: 700,
    tracking: '0.14em',
    color: ['#ffd27a', '#ffd27a'],
    shadow: '0 3px 0 #7e1219, 0 0 18px rgb(255 200 90 / 0.35)',
    layout: { header: 'line', booklet: 'vertical' },
    gloss: { font: LATIN.serif, style: 'normal', tracking: '0.24em', uppercase: true },
  },
  scene: {
    inks: { branch: ['#3a1a14', '#2a120e'] },
    layers: [
      `<g fill="none" stroke="#f6b73c" stroke-opacity=".2" stroke-width="1.5">${scatter(31, 16, [820, 30, 1440, 260], (x, y, r) => `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(10 + r * 8).toFixed(0)}"/><rect x="${(x - 4).toFixed(0)}" y="${(y - 4).toFixed(0)}" width="8" height="8"/>`)}</g>`,
      `<g transform="translate(760 0)">
        <path d="M0 72C60 60 110 74 150 104S230 132 270 120" fill="none" stroke="var(--look-scene-branch)" stroke-width="7" stroke-linecap="round"/>
        <path d="M150 104C160 80 180 70 200 70M92 70C100 50 96 38 86 30" fill="none" stroke="var(--look-scene-branch)" stroke-width="4" stroke-linecap="round"/>
        ${BLOSSOMS.map(([x, y], i) => blossom(x, y, i * 23, '#f9a3a0', '#f6b73c')).join('')}
      </g>`,
      `${lantern(1120, 30, 1.05, '#e0312b', '#f6b73c', 'rgb(255 190 90 / 0.16)')}${lantern(1250, 70, 0.85, '#e0312b', '#f6b73c', 'rgb(255 190 90 / 0.14)')}${lantern(1370, 20, 0.95, '#e0312b', '#f6b73c', 'rgb(255 190 90 / 0.14)')}`,
      `${cloudSwirl(700, 300, 1.6, '#f6b73c')}${cloudSwirl(1180, 316, 1.3, '#f6b73c')}${cloudSwirl(960, 330, 1.1, 'rgb(246 183 60 / 0.55)')}`,
      `<path d="M0 340H1440" stroke="#f6b73c" stroke-width="3" stroke-dasharray="18 8"/>`,
    ],
  },
  deco: lantern(64, 22, 0.62, '#e0312b', '#f6b73c', 'transparent'),
  card: {
    border: 'double',
    number: 'badge',
    name: 'tag',
    corner: `<path d="M3 3h7l-7 7z" fill="currentColor"/><path d="M5.6 5.6h2.2" stroke="currentColor" stroke-width="1"/>`,
  },
  back: {
    inset: 'double',
    ring: `<g fill="none" stroke="currentColor" opacity=".55">${coin(60, 60, 44, 'currentColor', 2)}<circle cx="60" cy="60" r="52" stroke-width="1" stroke-dasharray="3 5"/></g>`,
    name: true,
  },
  binder: {
    rule: ['rgb(160 60 20 / 0.07)', 'rgb(255 220 160 / 0.05)'],
    ring: 'square',
    sleeve: ['rgb(160 40 20 / 0.06)', 'rgb(255 255 255 / 0.05)'],
  },
  spine: { stitch: 'dotted', band: '#f6b73c' },
  particles: {
    shapes: [
      `<circle cx="12" cy="12" r="9"/><rect x="9.2" y="9.2" width="5.6" height="5.6" fill="var(--look-cover)"/>`,
      `<g transform="translate(12 12)">${[0, 72, 144, 216, 288].map((a) => `<circle r="4.4" transform="rotate(${a}) translate(0 -5)"/>`).join('')}</g>`,
      `<rect x="6" y="6" width="12" height="12" rx="1.4" transform="rotate(45 12 12)"/>`,
    ],
    colors: ['#f6b73c', '#ffd27a', '#f9a3a0', '#fff1d6'],
    count: 18,
  },
};
