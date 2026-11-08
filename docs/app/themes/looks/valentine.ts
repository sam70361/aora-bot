import { HEART, SPARKLE, heart, lace, scatter, sparkle } from './draw.js';
import { LATIN, SONG, type ThemeLook } from './types.js';

/* The ribbon starts right of the header's text column, so it never runs behind the title, the inks or the draw button. */
const RIBBON = 'M780 346C860 300 960 232 1080 250S1300 290 1460 246';

export const VALENTINE: ThemeLook = {
  tagline: {
    zh: '糖果纸包着的心意，每一张都系着蝴蝶结。',
    en: 'Feelings wrapped in sweet paper, every card tied with a bow.',
  },
  palette: {
    cover: ['#e03a58', '#b8304a'],
    coverDeep: ['#a3203d', '#7a1730'],
    coverInk: ['#fff3ea', '#fff0f2'],
    accent: ['#ec4561', '#ff7d93'],
    accentInk: ['#ffffff', '#2a0f16'],
    stock: ['#fffafa', '#2a1e22'],
    stockInk: ['#2b1a22', '#f6e8ec'],
    stockMuted: ['#8a6b76', '#bfa2ad'],
    art: ['#fdeef0', '#241a1e'],
    sky: [
      ['#fff6f4', '#2a1c22'],
      ['#fde6ea', '#22161b'],
    ],
    skyInk: ['#2b1a22', '#f6e8ec'],
    emblemInk: ['#ec4561', '#ec4561'],
    emblem2: ['#a3203d', '#a3203d'],
    emblem3: ['#fff3e6', '#fff3e6'],
    pattern: ['rgb(255 243 230 / 0.3)', 'rgb(255 243 230 / 0.2)'],
    pattern2: ['rgb(255 243 230 / 0.14)', 'rgb(255 243 230 / 0.09)'],
  },
  foil: { stops: ['#c27a52', '#ffd9c2', '#f4b740', '#fff3e6', '#ffb6c8', '#d98a6a'], angle: 135 },
  pattern: {
    width: 28,
    height: 28,
    markup: `<path transform="translate(14 13) scale(.55)" d="${HEART}" fill="var(--look-pattern)"/><circle cx="0" cy="0" r="1.2" fill="var(--look-pattern-2)"/><circle cx="28" cy="28" r="1.2" fill="var(--look-pattern-2)"/>`,
  },
  emblem: `<path d="M12 20.4s-7.6-4.6-7.6-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.6 2.6c0 5.6-7.6 10.2-7.6 10.2z"/>
    <path class="e3" d="M8 10.4a2.2 2.2 0 0 1 2.2-1.8" fill="none" stroke-width="1.5" stroke-linecap="round"/>`,
  title: {
    font: SONG,
    weight: 900,
    tracking: '0.1em',
    color: ['#ec4561', '#ff7d93'],
    fill: 'linear-gradient(180deg, #ff7d93, #ec4561 45%, #a3203d)',
    drop: 'drop-shadow(0 2px 0 #fff3e6) drop-shadow(0 3px 0 rgb(163 32 61 / 0.25))',
    booklet: {
      fill: 'linear-gradient(180deg, #fffaf3, #ffe6ea 55%, #ffc4d0)',
      drop: 'drop-shadow(0 2px 0 #8c1a35) drop-shadow(0 3px 4px rgb(80 8 28 / 0.35))',
    },
    layout: { header: 'line', booklet: 'stacked' },
    gloss: { font: LATIN.book, style: 'italic', tracking: '0.06em', uppercase: true },
  },
  scene: {
    inks: {
      lace: ['#fff3e6', '#3a262c'],
      dots: ['#fdeef0', '#2e2025'],
    },
    layers: [
      scatter(71, 18, [840, 20, 1440, 240], (x, y, r, i) =>
        heart(
          x,
          y,
          0.8 + r * 2.4,
          ['#ec4561', '#ffb6c8', '#c8b0f2', '#f4b740'][i % 4]!,
          `opacity="${(0.35 + r * 0.5).toFixed(2)}"`,
        ),
      ),
      `<path d="${RIBBON}" fill="none" stroke="#ec4561" stroke-width="16" stroke-linecap="round" opacity=".85"/>
       <path d="${RIBBON}" fill="none" stroke="#ffb6c8" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 14"/>`,
      `<g transform="translate(1180 120) scale(7)"><path d="${HEART}" fill="#ec4561" stroke="#a3203d" stroke-width=".5"/><path d="M-7-2.6A3 3 0 0 1-3.6-5" fill="none" stroke="#fff3e6" stroke-width=".9" stroke-linecap="round"/></g>`,
      `${sparkle(1050, 70, 1, '#f4b740')}${sparkle(1300, 210, 1, '#f4b740')}${sparkle(900, 60, 1, '#f4b740')}`,
      lace(314, 14, 'var(--look-scene-lace)'),
      `<g fill="var(--look-scene-dots)">${Array.from({ length: 52 }, (_, i) => `<circle cx="${14 + i * 28}" cy="330" r="4"/>`).join('')}</g>`,
    ],
  },
  deco: `${heart(80, 46, 2.6, '#ec4561')}${heart(40, 78, 1.4, '#ffb6c8')}${heart(98, 90, 1, '#fff3e6')}`,
  card: {
    border: 'double',
    number: 'plain',
    name: 'ribbon',
    corner: `<path transform="translate(12 12) scale(.7)" d="${HEART}" fill="currentColor"/>`,
  },
  back: {
    inset: 'double',
    ring: `<g fill="currentColor" opacity=".5">${Array.from({ length: 10 }, (_, i) => `<path transform="rotate(${i * 36} 60 60) translate(60 12) scale(.42)" d="${HEART}"/>`).join('')}</g>`,
    name: true,
  },
  binder: {
    rule: ['rgb(236 69 97 / 0.08)', 'rgb(255 182 200 / 0.05)'],
    ring: 'round',
    sleeve: ['rgb(163 32 61 / 0.05)', 'rgb(255 255 255 / 0.05)'],
  },
  spine: { stitch: 'dotted', band: '#f4b740' },
  particles: {
    shapes: [
      `<path transform="translate(12 12) scale(.95)" d="${HEART}"/>`,
      `<path transform="translate(12 12) scale(.8)" d="${SPARKLE}"/>`,
      `<circle cx="12" cy="12" r="3.6"/>`,
    ],
    colors: ['#ec4561', '#ffb6c8', '#f4b740', '#fff3e6', '#c8b0f2'],
    count: 18,
  },
};
