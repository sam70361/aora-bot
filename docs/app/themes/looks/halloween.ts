import { BAT, SPARKLE, bat, stars, web } from './draw.js';
import { KAI, LATIN, type ThemeLook } from './types.js';

export const HALLOWEEN: ThemeLook = {
  tagline: {
    zh: '南瓜灯点亮的午夜，一屋子不吓人的小怪物。',
    en: 'A midnight lit by pumpkin lanterns, and a house full of monsters who would never scare you.',
  },
  palette: {
    cover: ['#3a2160', '#33195a'],
    coverDeep: ['#1c0f30', '#170b28'],
    coverInk: ['#ffcf8a', '#ffc27a'],
    accent: ['#ff8a24', '#ff9a3d'],
    accentInk: ['#1d0f04', '#1d0f04'],
    stock: ['#2a2036', '#251c31'],
    stockInk: ['#f5ecdf', '#f5ecdf'],
    stockMuted: ['#b8aac4', '#b0a2bd'],
    art: ['#0b0810', '#060408'],
    sky: [
      ['#0d0a12', '#0b0810'],
      ['#1f1430', '#1a1028'],
    ],
    skyInk: ['#f5ecdf', '#f5ecdf'],
    emblemInk: ['#2a1206', '#2a1206'],
    emblem2: ['#25a263', '#25a263'],
    emblem3: ['#ffe0ad', '#ffe0ad'],
    pattern: ['rgb(255 138 36 / 0.26)', 'rgb(255 138 36 / 0.24)'],
    pattern2: ['rgb(255 255 255 / 0.07)', 'rgb(255 255 255 / 0.06)'],
  },
  foil: { stops: ['#b5551a', '#ffcf8a', '#eb6925', '#ffe0ad', '#7962d9', '#ffb25c'], angle: 135 },
  pattern: {
    width: 44,
    height: 44,
    markup: `<path d="${web(0, 0, 30, 0, 90, 4, 3)}" fill="none" stroke="var(--look-pattern-2)" stroke-width=".9"/>
      <circle cx="33" cy="33" r="1.7" fill="var(--look-pattern)"/><circle cx="11" cy="38" r="1.1" fill="var(--look-pattern)"/>`,
  },
  emblem: `<path class="e2" d="M12 7.4c.1-2.1 1-3.6 2.8-4.4" fill="none" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="7.6" cy="14.4" rx="4.8" ry="6.4"/><ellipse cx="16.4" cy="14.4" rx="4.8" ry="6.4"/><ellipse cx="12" cy="14.4" rx="4.4" ry="7"/>
    <path class="e3" d="M8.6 12.6l1.6 1.8M15.4 12.6l-1.6 1.8M9 17.2c2 1.4 4 1.4 6 0" fill="none" stroke-width="1.5" stroke-linecap="round"/>`,
  title: {
    font: KAI,
    weight: 700,
    tracking: '0.06em',
    color: ['#ffb25c', '#ffb25c'],
    shadow: '0 0 22px rgb(255 138 36 / 0.55), 0 3px 0 #5a1f00',
    glyphs: { turns: [-5, 4], lifts: [0.04, -0.04] },
    layout: { header: 'line', booklet: 'line' },
    gloss: { font: LATIN.humanist, style: 'normal', tracking: '0.3em', uppercase: true },
  },
  scene: {
    inks: {
      hills: ['#1f1430', '#1a1028'],
      tombs: ['#2e2142', '#281c3a'],
      front: ['#120a1a', '#0e0814'],
    },
    layers: [
      `<defs><radialGradient id="look-hw-glow"><stop offset="0" stop-color="#ffb25c" stop-opacity=".42"/><stop offset="1" stop-color="#ffb25c" stop-opacity="0"/></radialGradient></defs>`,
      stars(11, 46, [0, 10, 1440, 230], '#f5ecdf'),
      `<circle cx="1170" cy="128" r="190" fill="url(#look-hw-glow)"/><circle cx="1170" cy="128" r="78" fill="#ffe0ad"/>
       <circle cx="1144" cy="104" r="13" fill="#f2c88a"/><circle cx="1198" cy="148" r="10" fill="#f2c88a"/><circle cx="1192" cy="98" r="6" fill="#f2c88a"/>`,
      `${bat(1092, 150, 1.5, '#24163a')}${bat(1222, 70, 1.1, '#24163a')}${bat(880, 96, 0.9, '#3a2752')}${bat(1330, 190, 0.8, '#3a2752')}`,
      `<path d="${web(1440, 0, 230, 90, 180, 6, 5)}" fill="none" stroke="#f5ecdf" stroke-opacity=".16" stroke-width="1.4"/>`,
      `<path d="M0 292C180 248 380 262 560 284S900 246 1100 276 1340 254 1440 262V360H0Z" fill="var(--look-scene-hills)"/>`,
      `<g fill="var(--look-scene-tombs)"><path d="M862 286v-30a17 17 0 0 1 34 0v30z"/><path d="M918 288v-20a12 12 0 0 1 24 0v20z"/><path d="M1296 268v-28a16 16 0 0 1 32 0v28z"/></g>`,
      `<g transform="translate(1010 286)"><circle r="44" fill="#ff8a24" opacity=".14"/><ellipse cx="-9" rx="13" ry="15" fill="#d9561b"/><ellipse cx="9" rx="13" ry="15" fill="#d9561b"/><ellipse rx="11" ry="16" fill="#eb6925"/><path d="M0-15q2-8 8-10" stroke="#25a263" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M-7-3l3 3M7-3l-3 3M-6 6q6 4 12 0" stroke="#ffd27a" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>`,
      `<path d="M0 326C240 298 480 316 720 326S1200 298 1440 316V360H0Z" fill="var(--look-scene-front)"/>`,
    ],
  },
  deco: `<path d="${web(120, 0, 118, 90, 180, 5, 4)}" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".55"/>
    <path d="M78 0V46" stroke="currentColor" stroke-width="1.2" opacity=".6"/><circle cx="78" cy="52" r="6" fill="currentColor" opacity=".85"/>
    <path d="M72 50l-6-3M72 54l-6 2M84 50l6-3M84 54l6 2" stroke="currentColor" stroke-width="1.2" opacity=".7"/>`,
  card: {
    border: 'foil',
    number: 'plain',
    name: 'plain',
    corner: `<path d="${web(0, 0, 22, 0, 90, 4, 3)}" fill="none" stroke="currentColor" stroke-width="1"/>`,
  },
  back: {
    inset: 'dashed',
    ring: `<path d="${web(60, 60, 54, 0, 330, 12, 3)}" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".5"/>`,
    name: true,
  },
  binder: {
    rule: ['rgb(60 30 90 / 0.06)', 'rgb(255 255 255 / 0.04)'],
    ring: 'round',
    sleeve: ['rgb(42 32 54 / 0.08)', 'rgb(255 255 255 / 0.05)'],
  },
  spine: { stitch: 'dashed' },
  particles: {
    shapes: [
      `<path transform="translate(0 9) scale(.46)" d="${BAT}"/>`,
      `<path transform="translate(12 12) scale(.8)" d="${SPARKLE}"/>`,
      `<ellipse cx="8" cy="13" rx="5" ry="6"/><ellipse cx="16" cy="13" rx="5" ry="6"/><ellipse cx="12" cy="13" rx="4.4" ry="6.6"/>`,
    ],
    colors: ['#ff8a24', '#ffe0ad', '#7962d9', '#ffb25c'],
    count: 18,
  },
};
