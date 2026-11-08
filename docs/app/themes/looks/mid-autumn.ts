import { SPARKLE, skyLantern, softCloud, stars } from './draw.js';
import { LATIN, SONG, type ThemeLook } from './types.js';

const SKY_LANTERNS: readonly (readonly [number, number, number])[] = [
  [930, 222, 0.85],
  [1010, 96, 0.6],
  [870, 70, 0.5],
  [1300, 62, 0.42],
  [1385, 250, 0.5],
];
const OSMANTHUS: readonly (readonly [number, number])[] = [
  [1340, 64],
  [1318, 90],
  [1372, 46],
  [1304, 104],
  [1400, 38],
];

const osmanthus = (x: number, y: number, fill: string) =>
  `<g transform="translate(${x} ${y})">${[0, 90, 180, 270].map((a) => `<circle r="3.4" transform="rotate(${a}) translate(0 -3.6)" fill="${fill}"/>`).join('')}</g>`;

export const MID_AUTUMN: ThemeLook = {
  tagline: {
    zh: '月亮最圆的那一晚，提一盏灯，把桂花香也收进卡册。',
    en: 'On the night of the fullest moon, carry a lantern and press the osmanthus into the album.',
  },
  palette: {
    cover: ['#262c72', '#22286a'],
    coverDeep: ['#12153c', '#0d1030'],
    coverInk: ['#fff0c2', '#ffe7a8'],
    accent: ['#ffc23d', '#ffc23d'],
    accentInk: ['#1d1830', '#1d1830'],
    stock: ['#1e2350', '#1a1f48'],
    stockInk: ['#f6eedc', '#f6eedc'],
    stockMuted: ['#b7b4d6', '#aeabd0'],
    art: ['#0a0c24', '#070818'],
    sky: [
      ['#262c72', '#1e2360'],
      ['#0b0d26', '#08091c'],
    ],
    skyInk: ['#f6eedc', '#f6eedc'],
    emblemInk: ['#fff0c2', '#fff0c2'],
    emblem2: ['#fffaf2', '#fffaf2'],
    emblem3: ['#e8cf8f', '#e8cf8f'],
    pattern: ['rgb(255 250 242 / 0.7)', 'rgb(255 250 242 / 0.6)'],
    pattern2: ['rgb(255 194 61 / 0.55)', 'rgb(255 194 61 / 0.5)'],
  },
  foil: { stops: ['#b98a2a', '#ffe7a8', '#ffc23d', '#fff6dc', '#d9a23a', '#ffe2a0'], angle: 135 },
  pattern: {
    width: 68,
    height: 68,
    markup: `<g fill="var(--look-pattern)"><circle cx="0" cy="0" r="1"/><circle cx="34" cy="0" r="1"/><circle cx="0" cy="34" r="1"/><circle cx="34" cy="34" r="1"/><circle cx="68" cy="0" r="1"/><circle cx="0" cy="68" r="1"/><circle cx="68" cy="68" r="1"/><circle cx="68" cy="34" r="1"/><circle cx="34" cy="68" r="1"/>
      <circle cx="17" cy="11" r=".8" opacity=".6"/><circle cx="51" cy="45" r=".8" opacity=".6"/><circle cx="51" cy="11" r=".8" opacity=".6"/><circle cx="17" cy="45" r=".8" opacity=".6"/></g>
      <circle cx="9" cy="25" r="1.4" fill="var(--look-pattern-2)"/>`,
  },
  emblem: `<circle cx="12" cy="10.6" r="7.6"/>
    <circle class="e3" cx="9.6" cy="8.6" r="1.6"/><circle class="e3" cx="14" cy="12.4" r="1.1"/>
    <path class="e2" d="M4.6 19.6c0-1.8 1.8-2.6 3-1.8.6-1.6 3-1.8 3.8-.2 1-1.2 3.4-.8 3.4 1 1-.4 2.6 0 2.6 1z"/>`,
  title: {
    font: SONG,
    weight: 400,
    tracking: '0.34em',
    color: ['#fff0c2', '#fff0c2'],
    shadow: '0 0 26px rgb(255 194 61 / 0.55)',
    layout: { header: 'line', booklet: 'line' },
    gloss: { font: LATIN.serif, style: 'italic', tracking: '0.12em', uppercase: true },
  },
  scene: {
    inks: { ground: ['#0b0d26', '#08091c'] },
    layers: [
      `<defs><radialGradient id="look-ma-glow"><stop offset="0" stop-color="#ffc23d" stop-opacity=".36"/><stop offset="1" stop-color="#ffc23d" stop-opacity="0"/></radialGradient></defs>`,
      stars(41, 60, [0, 8, 1440, 250], '#fffaf2'),
      `<circle cx="1130" cy="150" r="240" fill="url(#look-ma-glow)"/><circle cx="1130" cy="150" r="112" fill="#fff0c2"/>
       <g fill="#f3dfa6"><circle cx="1090" cy="116" r="18"/><circle cx="1166" cy="182" r="13"/><circle cx="1170" cy="108" r="8"/><circle cx="1098" cy="196" r="7"/></g>`,
      `${softCloud(980, 230, 1.8, 'rgb(255 250 242 / 0.16)')}${softCloud(1180, 250, 1.4, 'rgb(255 250 242 / 0.12)')}`,
      SKY_LANTERNS.map(([x, y, s]) =>
        skyLantern(x, y, s, '#ff8a3d', 'rgb(255 138 61 / 0.14)', '#d4914a'),
      ).join(''),
      `<path d="M1440 30C1380 40 1340 62 1310 96M1352 58c-8-14-4-26 6-32M1330 80c-14-2-22 4-26 14" fill="none" stroke="#2d2a1c" stroke-width="5" stroke-linecap="round"/>
       ${OSMANTHUS.map(([x, y]) => osmanthus(x, y, '#ffc23d')).join('')}`,
      `<path d="M0 318C300 300 620 312 900 320S1300 300 1440 308V360H0Z" fill="var(--look-scene-ground)"/>`,
    ],
  },
  deco: `<circle cx="74" cy="44" r="30" fill="#fff0c2"/><circle cx="64" cy="36" r="5" fill="#f2deaa"/><circle cx="84" cy="52" r="4" fill="#f2deaa"/>
    ${softCloud(30, 70, 0.7, 'rgb(255 250 242 / 0.9)')}`,
  card: {
    border: 'foil',
    number: 'plain',
    name: 'plain',
    corner: osmanthus(12, 12, 'currentColor'),
  },
  back: {
    inset: 'solid',
    ring: `<circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".5"/><circle cx="60" cy="60" r="44" fill="currentColor" opacity=".12"/>`,
    name: true,
  },
  binder: {
    rule: ['rgb(40 44 114 / 0.06)', 'rgb(255 240 200 / 0.04)'],
    ring: 'round',
    sleeve: ['rgb(30 35 80 / 0.07)', 'rgb(255 255 255 / 0.05)'],
  },
  spine: { stitch: 'dotted' },
  particles: {
    shapes: [
      osmanthus(12, 12, 'currentColor'),
      `<path transform="translate(12 12) scale(.8)" d="${SPARKLE}"/>`,
      `<circle cx="12" cy="12" r="4"/>`,
    ],
    colors: ['#ffc23d', '#fff0c2', '#ff8a3d', '#fffaf2'],
    count: 18,
  },
};
