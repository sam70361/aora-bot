import { STAR, flake, pine, scatter, star } from './draw.js';
import { LATIN, SONG, type ThemeLook } from './types.js';

function garland(): string {
  const colors = ['#cf3a3f', '#f2b53e', '#a9d6ea', '#2f7650'];
  const gx = (t: number) => 640 + 820 * t;
  const gy = (t: number) => 10 + Math.sin(t * Math.PI * 2) * 12 + 30 * Math.sin(t * Math.PI);
  let bulbs = '';
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    bulbs += `<g transform="translate(${gx(t).toFixed(0)} ${(gy(t) + 6).toFixed(0)})"><rect x="-4" y="-4" width="8" height="7" rx="1.5" fill="#6c4330"/><ellipse cy="10" rx="7" ry="10" fill="${colors[i % 4]}"/></g>`;
  }
  let wire = `M${gx(0)} ${gy(0)}`;
  for (let i = 1; i <= 40; i++) wire += `L${gx(i / 40).toFixed(0)} ${gy(i / 40).toFixed(0)}`;
  return `<path d="${wire}" fill="none" stroke="#2f7650" stroke-width="3"/>${bulbs}`;
}

const holly = `<g transform="translate(70 46)"><ellipse cx="-16" cy="0" rx="22" ry="10" transform="rotate(-28)" fill="#2f7650"/><ellipse cx="16" cy="0" rx="22" ry="10" transform="rotate(28)" fill="#3d8a5f"/>
  <circle cx="-6" cy="10" r="8" fill="#cf3a3f"/><circle cx="8" cy="12" r="8" fill="#e04a4f"/><circle cx="1" cy="0" r="7" fill="#cf3a3f"/></g>`;

export const CHRISTMAS: ThemeLook = {
  tagline: {
    zh: '毛毡缝出来的冬天，壁炉边每个小家伙都暖乎乎的。',
    en: 'A winter sewn from felt, where everyone by the fire is warm.',
  },
  palette: {
    cover: ['#b92f35', '#8e2229'],
    coverDeep: ['#8e2229', '#5e151b'],
    coverInk: ['#fbf0da', '#fbe7c4'],
    accent: ['#cf3a3f', '#e0565a'],
    accentInk: ['#fffaf1', '#fffaf1'],
    stock: ['#fffdf7', '#2b2422'],
    stockInk: ['#2a1e22', '#f3e9dc'],
    stockMuted: ['#7d6d64', '#b5a596'],
    art: ['#fbf5ea', '#211b19'],
    sky: [
      ['#f7f0e4', '#2a211d'],
      ['#efe4d2', '#211a17'],
    ],
    skyInk: ['#2a1e22', '#f3e9dc'],
    emblemInk: ['#8e2229', '#8e2229'],
    emblem2: ['#2f7650', '#2f7650'],
    emblem3: ['#fff0c4', '#fff0c4'],
    pattern: ['rgb(47 118 80 / 0.36)', 'rgb(47 118 80 / 0.42)'],
    pattern2: ['rgb(255 240 200 / 0.2)', 'rgb(255 240 200 / 0.14)'],
  },
  foil: { stops: ['#a8781f', '#f2b53e', '#fff0c4', '#e0a83a', '#fbe2a0', '#b8862a'], angle: 135 },
  pattern: {
    width: 22,
    height: 22,
    markup: `<rect width="22" height="5" fill="var(--look-pattern)"/><rect width="5" height="22" fill="var(--look-pattern)"/>
      <rect y="10" width="22" height="1" fill="var(--look-pattern-2)"/><rect x="10" width="1" height="22" fill="var(--look-pattern-2)"/>`,
  },
  emblem: `<path d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.9 6.2 20.1l1.4-6.4L2.7 9.3l6.5-.7z"/>
    <path class="e3" d="M12 6.4l1.6 3.4 3.6.4" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="1.4 1.6"/>`,
  title: {
    font: SONG,
    weight: 900,
    tracking: '0.08em',
    color: ['#fbf0da', '#fbf0da'],
    shadow: '0 2px 0 rgb(90 20 20 / 0.35)',
    plate: { fill: '#cf3a3f', shade: '#8e2229', stitch: 'rgb(251 240 218 / 0.85)' },
    layout: { header: 'line', booklet: 'line' },
    gloss: { font: LATIN.serif, style: 'italic', tracking: '0.08em', uppercase: true },
  },
  scene: {
    inks: {
      snow: ['#fffaf1', '#3a312c'],
      drift: ['#f2e7d3', '#2e2622'],
      flake: ['#a9d6ea', '#7fb3cc'],
      flake2: ['#d9cbb6', '#6b5d52'],
    },
    layers: [
      `<g>${scatter(21, 30, [820, 70, 1440, 290], (x, y, r) => flake(x, y, 5 + r * 8, r > 0.5 ? 'var(--look-scene-flake)' : 'var(--look-scene-flake2)'))}</g>`,
      garland(),
      `<path d="M0 296C260 262 520 280 760 292S1180 262 1440 280V360H0Z" fill="var(--look-scene-snow)"/>
       <path d="M0 296C260 262 520 280 760 292S1180 262 1440 280" fill="none" stroke="#a9d6ea" stroke-width="4" stroke-dasharray="2 10" stroke-linecap="round"/>`,
      `${pine(1310, 288, 180, '#2f7650', '#245e40')}${pine(1226, 290, 112, '#3d8a5f', '#2f7650')}${pine(1392, 292, 92, '#3d8a5f', '#2f7650')}${pine(860, 300, 120, '#3d8a5f', '#2f7650')}`,
      `${star(1310, 116, 0.9, '#f2b53e')}${star(860, 186, 0.6, '#f2b53e')}`,
      `<g transform="translate(960 290)"><rect x="-22" y="-34" width="44" height="34" rx="4" fill="#cf3a3f"/><path d="M0-34V0M-22-20H22" stroke="#f2b53e" stroke-width="5"/><path d="M0-34c-10-12-18-4-10 0M0-34c10-12 18-4 10 0" stroke="#f2b53e" stroke-width="3.4" fill="none"/></g>
       <g transform="translate(1170 286)"><rect x="-16" y="-26" width="32" height="26" rx="3" fill="#a9d6ea"/><path d="M0-26V0" stroke="#fbf0da" stroke-width="4"/></g>`,
      `<path d="M0 330C300 312 620 322 900 330S1300 314 1440 322V360H0Z" fill="var(--look-scene-drift)"/>`,
    ],
  },
  deco: holly,
  card: {
    border: 'stitched',
    number: 'plain',
    name: 'ribbon',
    corner: `<ellipse cx="7" cy="9" rx="6" ry="3" transform="rotate(-28 7 9)" fill="#2f7650"/><ellipse cx="15" cy="9" rx="6" ry="3" transform="rotate(28 15 9)" fill="#3d8a5f"/><circle cx="11" cy="12" r="2.6" fill="#cf3a3f"/>`,
  },
  back: {
    inset: 'dashed',
    ring: `<g fill="currentColor" opacity=".5">${Array.from({ length: 12 }, (_, i) => `<path transform="rotate(${i * 30} 60 60) translate(60 10) scale(.32)" d="${STAR}"/>`).join('')}</g>`,
    name: true,
  },
  binder: {
    rule: ['rgb(120 80 50 / 0.07)', 'rgb(255 240 200 / 0.05)'],
    ring: 'round',
    sleeve: ['rgb(90 50 30 / 0.06)', 'rgb(255 255 255 / 0.05)'],
  },
  spine: { stitch: 'dashed', band: '#f2b53e' },
  particles: {
    shapes: [
      `<path d="M12 2V22M3.3 7L20.7 17M3.3 17L20.7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>`,
      `<path transform="translate(12 12) scale(.8)" d="${STAR}"/>`,
      `<circle cx="12" cy="12" r="5"/>`,
    ],
    colors: ['#f2b53e', '#a9d6ea', '#fffaf1', '#cf3a3f', '#2f7650'],
    count: 18,
  },
};
