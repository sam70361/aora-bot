/*
 * Drawing helpers the look files compose their scenes, ornaments and tiles
 * from. Each returns SVG markup; a look is the data they produce. Colours are
 * arguments, so a call can pass a fixed colour or a look property such as
 * `var(--look-scene-ground)`.
 */

const f = (n: number) => Number(n.toFixed(1));

/** A small seeded generator, so scattered details stay put between renders and between server and client. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` marks scattered over a box. */
export function scatter(
  seed: number,
  count: number,
  [x0, y0, x1, y1]: readonly [number, number, number, number],
  draw: (x: number, y: number, r: number, i: number) => string,
): string {
  const random = seeded(seed);
  let out = '';
  for (let i = 0; i < count; i++)
    out += draw(x0 + random() * (x1 - x0), y0 + random() * (y1 - y0), random(), i);
  return out;
}

/** Star dots over a box, of varied size and strength. */
export const stars = (
  seed: number,
  count: number,
  box: readonly [number, number, number, number],
  fill: string,
) =>
  `<g fill="${fill}">${scatter(seed, count, box, (x, y, r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.6 + r * 1.4)}" opacity="${(0.25 + r * 0.55).toFixed(2)}"/>`)}</g>`;

/** A spider web fanned from a point: spokes, and rings that sag between them. */
export function web(
  cx: number,
  cy: number,
  radius: number,
  from: number,
  to: number,
  spokes: number,
  rings: number,
): string {
  const points = (r: number) =>
    Array.from({ length: spokes }, (_, i) => {
      const a = ((from + ((to - from) * i) / (spokes - 1)) * Math.PI) / 180;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
    });
  let d = points(radius)
    .map(([x, y]) => `M${cx} ${cy}L${f(x)} ${f(y)}`)
    .join('');
  for (let k = 1; k <= rings; k++) {
    const r = (radius * k) / (rings + 0.4);
    const p = points(r);
    const sag = points(r * 0.86);
    d += `M${f(p[0]![0])} ${f(p[0]![1])}`;
    for (let i = 1; i < p.length; i++) {
      const mx = (sag[i - 1]![0] + sag[i]![0]) / 2;
      const my = (sag[i - 1]![1] + sag[i]![1]) / 2;
      d += `Q${f(mx)} ${f(my)} ${f(p[i]![0])} ${f(p[i]![1])}`;
    }
  }
  return d;
}

export const BAT =
  'M0 0C6-8 14-8 18-2 20-6 24-8 26-8S32-6 34-2C38-8 46-8 52 0 46-2 42 0 40 4 37 1 33 1 31 5 29 1 25 1 22 4 20 0 16-2 12 0 8-2 4-2 0 0Z';
export const bat = (x: number, y: number, s: number, fill: string) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="${BAT}" fill="${fill}"/>`;

export const HEART = 'M0 9C-5 5.6-10 2.4-10-2.6A5.2 5.2 0 0 1 0-5.4 5.2 5.2 0 0 1 10-2.6C10 2.4 5 5.6 0 9Z';
export const heart = (x: number, y: number, s: number, fill: string, extra = '') =>
  `<path transform="translate(${f(x)} ${f(y)}) scale(${s.toFixed(2)})" d="${HEART}" fill="${fill}" ${extra}/>`;

export const SPARKLE = 'M0-12C1-3 3-1 12 0 3 1 1 3 0 12-1 3-3 1-12 0-3-1-1-3 0-12Z';
export const sparkle = (x: number, y: number, s: number, fill: string) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="${SPARKLE}" fill="${fill}"/>`;

export const STAR = 'M0-14l4 8.6 9.4 1-7 6.4 2 9.2L0 6.4-8.4 11.2l2-9.2-7-6.4 9.4-1z';
export const star = (x: number, y: number, s: number, fill: string) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="${STAR}" fill="${fill}"/>`;

export function flake(x: number, y: number, s: number, stroke: string): string {
  let d = '';
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    const dx = Math.cos(a) * s;
    const dy = Math.sin(a) * s;
    d += `M${f(x - dx)} ${f(y - dy)}L${f(x + dx)} ${f(y + dy)}`;
  }
  return `<path d="${d}" stroke="${stroke}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
}

export function pine(x: number, y: number, h: number, fill: string, edge: string): string {
  const w = h * 0.62;
  return `<g transform="translate(${x} ${y})">
    <rect x="${f(-h * 0.05)}" y="${f(-h * 0.12)}" width="${f(h * 0.1)}" height="${f(h * 0.14)}" fill="#6c4330"/>
    <path d="M0 ${-h}L${f(w * 0.32)} ${f(-h * 0.64)}H${f(-w * 0.32)}ZM0 ${f(-h * 0.8)}L${f(w * 0.42)} ${f(-h * 0.38)}H${f(-w * 0.42)}ZM0 ${f(-h * 0.56)}L${f(w / 2)} ${f(-h * 0.1)}H${f(-w / 2)}Z" fill="${fill}" stroke="${edge}" stroke-width="3" stroke-linejoin="round"/>
  </g>`;
}

export const lantern = (
  x: number,
  len: number,
  s: number,
  body: string,
  band: string,
  glow: string,
) => `<g transform="translate(${x} 0)">
    <path d="M0 0V${len}" stroke="${band}" stroke-width="2"/>
    <g transform="translate(0 ${len}) scale(${s})">
      <circle cx="0" cy="36" r="60" fill="${glow}"/>
      <rect x="-14" y="0" width="28" height="9" rx="2" fill="${band}"/>
      <ellipse cx="0" cy="36" rx="34" ry="28" fill="${body}"/>
      <path d="M0 8C-15 18-15 54 0 64M0 8C15 18 15 54 0 64M-22 14C-36 26-36 46-22 58M22 14C36 26 36 46 22 58" fill="none" stroke="${band}" stroke-width="2" opacity=".75"/>
      <rect x="-14" y="62" width="28" height="8" rx="2" fill="${band}"/>
      <path d="M-6 70V92M0 70V96M6 70V92" stroke="${band}" stroke-width="2.4" stroke-linecap="round"/>
    </g>
  </g>`;

export const skyLantern = (x: number, y: number, s: number, body: string, glow: string, base: string) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><circle r="46" fill="${glow}"/><path d="M-20-28H20L14 20H-14Z" fill="${body}"/><path d="M-20-28H20L14 20H-14Z" fill="#ffc23d" opacity=".35"/><rect x="-15" y="18" width="30" height="5" rx="2" fill="${base}"/><circle cy="30" r="4" fill="#ffd56b"/></g>`;

export const cloudSwirl = (x: number, y: number, s: number, stroke: string) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 0C-4-14 10-22 20-14 22-28 44-30 52-16 60-24 76-18 74-4 86-2 88 14 76 18H-2C-14 16-14 2 0 0ZM22 2C18-6 28-10 32-4M52 4C50-4 60-6 62 0" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;

export const softCloud = (x: number, y: number, s: number, fill: string) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 0C0-14 16-20 26-12 30-26 54-28 62-12 74-18 90-10 86 4 96 6 96 20 84 20H4C-8 20-10 4 0 0Z" fill="${fill}"/>`;

export const egg = (
  x: number,
  y: number,
  s: number,
  fill: string,
  band: string,
  rot = 0,
) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <path d="M0-30C14-30 24-8 24 6A24 24 0 0 1-24 6C-24-8-14-30 0-30Z" fill="${fill}"/>
    <path d="M-22-2L-15-9-8-2-1-9 6-2 13-9 20-2" fill="none" stroke="${band}" stroke-width="3.2" stroke-linejoin="round"/>
    <circle cx="-9" cy="12" r="3" fill="${band}"/><circle cx="3" cy="15" r="3" fill="${band}"/><circle cx="14" cy="10" r="3" fill="${band}"/>
  </g>`;

export function daisy(x: number, y: number, s: number): string {
  let petals = '';
  for (let i = 0; i < 10; i++)
    petals += `<ellipse rx="4" ry="10" transform="rotate(${i * 36}) translate(0 -10)" fill="#fffaf1"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 4V40" stroke="#7cc98f" stroke-width="3"/>${petals}<circle r="7" fill="#ffe38f"/></g>`;
}

export const blossom = (x: number, y: number, rot: number, petal: string, centre: string) =>
  `<g transform="translate(${x} ${y}) rotate(${rot})">${[0, 72, 144, 216, 288].map((a) => `<circle r="6.4" transform="rotate(${a}) translate(0 -7)" fill="${petal}"/>`).join('')}<circle r="3.4" fill="${centre}"/></g>`;

/** A scalloped edge along `y`, filled down to the bottom of the scene. */
export function lace(y: number, r: number, fill: string, width = 1440): string {
  let d = `M0 ${y}`;
  for (let x = 0; x < width; x += r * 2) d += `a${r} ${r} 0 0 0 ${r * 2} 0`;
  return `<path d="${d}V360H0Z" fill="${fill}"/>`;
}

/** Waves along `y`, filled down to the bottom of the scene. */
export function waves(y: number, amp: number, fill: string, step = 80): string {
  let d = `M0 ${y}`;
  for (let x = 0; x < 1440; x += step) d += `q${step / 4} -${amp} ${step / 2} 0t${step / 2} 0`;
  return `<path d="${d}V360H0Z" fill="${fill}"/>`;
}

/** A coin with a square hole, the lattice tile's unit. */
export const coin = (x: number, y: number, r: number, stroke: string, width: number) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${width}"/><rect x="${f(x - r * 0.32)}" y="${f(y - r * 0.32)}" width="${f(r * 0.64)}" height="${f(r * 0.64)}" fill="none" stroke="${stroke}" stroke-width="${width}"/>`;
