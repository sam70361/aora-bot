import { scatter, waves } from './draw.js';
import { LATIN, ROUND, type ThemeLook } from './types.js';

const rays = (count: number, length: number, inner: number, width: number) =>
  Array.from(
    { length: count },
    (_, i) =>
      `<rect x="${-width / 2}" y="${-inner - length}" width="${width}" height="${length}" rx="${width / 2}" transform="rotate(${(i * 360) / count})"/>`,
  ).join('');

export const SUMMER: ThemeLook = {
  tagline: {
    zh: '冰镇汽水冒着泡，海浪拍过来，整页都是假期。',
    en: 'Iced soda fizzing, waves rolling in: the whole page is a holiday.',
  },
  palette: {
    cover: ['#1fbfb4', '#127a73'],
    coverDeep: ['#17958d', '#0d5652'],
    coverInk: ['#0f2f40', '#fffaf0'],
    accent: ['#ff7657', '#ff8f75'],
    accentInk: ['#1f2347', '#1f2347'],
    stock: ['#fffdf8', '#1e2629'],
    stockInk: ['#1f2347', '#eef2f2'],
    stockMuted: ['#646a86', '#9fb0b3'],
    art: ['#fff0c7', '#1a2324'],
    sky: [
      ['#fff7d6', '#1c2a33'],
      ['#ffeec2', '#16222a'],
    ],
    skyInk: ['#1f2347', '#eef2f2'],
    emblemInk: ['#ffd84a', '#ffd84a'],
    emblem2: ['#ff7657', '#ff7657'],
    emblem3: ['#ffd84a', '#ffd84a'],
    pattern: ['rgb(255 250 240 / 0.3)', 'rgb(255 250 240 / 0.16)'],
    pattern2: ['rgb(255 250 240 / 0.12)', 'rgb(255 250 240 / 0.07)'],
  },
  foil: { stops: ['#ff7657', '#ffd84a', '#fffaf0', '#a9e5ff', '#1fbfb4', '#ff5a8c'], angle: 135 },
  pattern: {
    width: 28,
    height: 28,
    markup: `<rect width="14" height="28" fill="var(--look-pattern)"/><rect x="20" width="2" height="28" fill="var(--look-pattern-2)"/>`,
  },
  emblem: `<circle cx="12" cy="12" r="5.2"/>
    <path class="e2" d="M12 2.4v3M12 18.6v3M2.4 12h3M18.6 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M5.2 18.8l2.1-2.1M16.7 7.3l2.1-2.1" fill="none" stroke-width="2" stroke-linecap="round"/>`,
  title: {
    font: ROUND,
    weight: 900,
    tracking: '0.02em',
    color: ['#ff7657', '#ff8f75'],
    shadow: '4px 4px 0 #1fbfb4, 8px 8px 0 var(--look-sky-ink)',
    skew: -9,
    layout: { header: 'line', booklet: 'line' },
    gloss: { font: LATIN.poster, style: 'normal', tracking: '0.14em', uppercase: true },
  },
  scene: {
    inks: {
      wave: ['#1fbfb4', '#178f87'],
      surf: ['#a9e5ff', '#2b5f73'],
      deep: ['#1f5e6c', '#123a43'],
      pole: ['#1f2347', '#0c0f22'],
    },
    layers: [
      `<g transform="translate(1180 120)" fill="#ffd84a"><circle r="150" opacity=".22"/>${rays(16, 40, 110, 14)}<circle r="92"/><circle r="92" fill="none" stroke="#ff7657" stroke-width="5" stroke-dasharray="4 14" stroke-linecap="round"/></g>`,
      `<g fill="#ff7657">${scatter(61, 18, [880, 20, 1100, 200], (x, y, r) => `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(3 + r * 5).toFixed(1)}" opacity="${(0.25 + r * 0.4).toFixed(2)}"/>`)}</g>`,
      `<g transform="translate(930 196)"><path d="M0 0L-6 70" stroke="var(--look-scene-pole)" stroke-width="5"/><path d="M-96 6C-80-50 60-60 96 0Z" fill="#ff5a8c"/><path d="M-96 6C-80-50 60-60 96 0" fill="none" stroke="var(--look-scene-pole)" stroke-width="3"/><path d="M-48 3C-40-36 0-48 0-48M48 3C40-36 0-48 0-48" fill="none" stroke="#fffaf0" stroke-width="12"/></g>`,
      `${waves(262, 16, 'var(--look-scene-wave)')}${waves(292, 14, 'var(--look-scene-surf)')}${waves(322, 12, 'var(--look-scene-deep)')}`,
      `<g transform="translate(1060 256)"><circle r="34" fill="#fffaf0"/><path d="M0-34A34 34 0 0 1 29 17L0 0Z" fill="#ff7657"/><path d="M29 17A34 34 0 0 1-29 17L0 0Z" fill="#1fbfb4"/><path d="M-29 17A34 34 0 0 1 0-34L0 0Z" fill="#ffd84a"/><circle r="34" fill="none" stroke="#1f2347" stroke-width="3"/><circle r="7" fill="#fffaf0" stroke="#1f2347" stroke-width="2"/></g>`,
    ],
  },
  deco: `<circle cx="80" cy="42" r="22" fill="#ffd84a"/><path d="M0 92q15-12 30 0t30 0 30 0 30 0" fill="none" stroke="#1fbfb4" stroke-width="7" stroke-linecap="round"/>
    <path d="M0 108q15-12 30 0t30 0 30 0 30 0" fill="none" stroke="#a9e5ff" stroke-width="6" stroke-linecap="round"/>`,
  card: {
    border: 'foil',
    number: 'badge',
    name: 'ribbon',
    corner: `<g transform="translate(12 12)" fill="currentColor"><circle r="4"/>${rays(8, 3, 5.6, 1.6)}</g>`,
  },
  back: {
    inset: 'solid',
    ring: `<g transform="translate(60 60)" fill="currentColor" opacity=".45">${rays(18, 10, 38, 4)}</g>`,
    name: true,
  },
  binder: {
    rule: ['rgb(31 191 180 / 0.1)', 'rgb(31 191 180 / 0.06)'],
    ring: 'round',
    sleeve: ['rgb(31 35 71 / 0.05)', 'rgb(255 255 255 / 0.05)'],
  },
  spine: { stitch: 'none', band: '#ffd84a' },
  particles: {
    shapes: [
      `<g transform="translate(12 12)"><circle r="5"/>${rays(8, 3.4, 6.6, 2)}</g>`,
      `<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2.4"/>`,
      `<circle cx="12" cy="12" r="4"/>`,
    ],
    colors: ['#ffd84a', '#ff7657', '#1fbfb4', '#a9e5ff', '#ff5a8c'],
    count: 18,
  },
};
