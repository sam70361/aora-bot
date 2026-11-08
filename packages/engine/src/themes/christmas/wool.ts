/**
 * The felt's wool as a small PNG, drawn and encoded without a DOM, so the
 * same picture comes out in a browser, in Node and in every static avatar.
 *
 * A live felt figure redraws every frame of a squash. A pattern fill is
 * drawn again at each new scale, and an SVG image is rasterised again on
 * every draw; a bitmap is only resampled. So the wool is one bitmap tile,
 * the same data URL for every character on a page (decoded once), which the
 * skin lays in a few copies under a clip.
 */

/** What the tile is made of, in shape units. */
export interface WoolSpec {
  tile: number;
  /** Pixels per shape unit. */
  density: number;
  clouds: { count: number; r: readonly [number, number]; opacity: number };
  specks: { count: number; r: readonly [number, number]; opacity: number };
  darkSpecks: { count: number; r: readonly [number, number]; opacity: number };
  fibres: { count: number; length: readonly [number, number]; width: number; opacity: number };
  dark: { count: number; length: readonly [number, number]; width: number; opacity: number };
  seed: number;
}

/** A small seeded generator, so the wool is the same scatter in every render. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The tile as grey and alpha per pixel, light marks white and dark ones
 * black, each laid over the last, wrapped round the edges so it repeats
 * without a seam.
 */
function paint(spec: WoolSpec): { size: number; grey: Float32Array; alpha: Float32Array } {
  const size = Math.round(spec.tile * spec.density);
  const k = size / spec.tile;
  const grey = new Float32Array(size * size);
  const alpha = new Float32Array(size * size);
  const r = seeded(spec.seed);

  /** Lay `value` (0 black, 1 white) at `opacity` times the coverage `distance` gives, round a box in shape units. */
  const stamp = (
    box: readonly [number, number, number, number],
    value: number,
    opacity: number,
    cover: (x: number, y: number) => number,
  ) => {
    const [x0, y0, x1, y1] = box;
    for (let py = Math.floor(y0 * k) - 1; py <= Math.ceil(y1 * k) + 1; py++) {
      for (let px = Math.floor(x0 * k) - 1; px <= Math.ceil(x1 * k) + 1; px++) {
        const a = Math.min(1, Math.max(0, cover((px + 0.5) / k, (py + 0.5) / k))) * opacity;
        if (a <= 0) continue;
        const i = (((py % size) + size) % size) * size + (((px % size) + size) % size);
        grey[i] = value * a + grey[i]! * (1 - a);
        alpha[i] = a + alpha[i]! * (1 - a);
      }
    }
  };
  /** Coverage of a disc of radius `rad`, with an edge one pixel soft. */
  const disc = (cx: number, cy: number, rad: number) => (x: number, y: number) =>
    0.5 + (rad - Math.hypot(x - cx, y - cy)) * k;

  const { tile } = spec;
  for (let i = 0; i < spec.clouds.count; i++) {
    const [cx, cy] = [r() * tile, r() * tile];
    const rad = spec.clouds.r[0] + r() * (spec.clouds.r[1] - spec.clouds.r[0]);
    stamp(
      [cx - rad, cy - rad, cx + rad, cy + rad],
      1,
      spec.clouds.opacity,
      (x, y) => 1 - Math.hypot(x - cx, y - cy) / rad,
    );
  }
  const dots = ({ count, r: [lo, hi], opacity }: WoolSpec['specks'], value: number) => {
    const rad = (lo + hi) / 2;
    for (let i = 0; i < count; i++) {
      const [cx, cy] = [r() * tile, r() * tile];
      stamp([cx - rad, cy - rad, cx + rad, cy + rad], value, opacity, disc(cx, cy, rad));
    }
  };
  const strands = ({ count, length, width, opacity }: WoolSpec['fibres'], value: number) => {
    for (let i = 0; i < count; i++) {
      const [sx, sy] = [r() * tile, r() * tile];
      const a = r() * Math.PI;
      const l = length[0] + r() * (length[1] - length[0]);
      const bend = (r() - 0.5) * l * 0.6;
      const [ux, uy] = [Math.cos(a), Math.sin(a)];
      const [mx, my] = [sx + (ux * l) / 2 - uy * bend, sy + (uy * l) / 2 + ux * bend];
      const [ex, ey] = [sx + ux * l, sy + uy * l];
      const pts: [number, number][] = [];
      for (let t = 0; t <= 1.0001; t += 0.125) {
        const u = 1 - t;
        pts.push([u * u * sx + 2 * u * t * mx + t * t * ex, u * u * sy + 2 * u * t * my + t * t * ey]);
      }
      const half = width / 2;
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      stamp(
        [Math.min(...xs) - half, Math.min(...ys) - half, Math.max(...xs) + half, Math.max(...ys) + half],
        value,
        opacity,
        (x, y) => {
          let best = Infinity;
          for (let j = 1; j < pts.length; j++) {
            const [ax, ay] = pts[j - 1]!;
            const [bx, by] = pts[j]!;
            const [dx, dy] = [bx - ax, by - ay];
            const t = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
            best = Math.min(best, Math.hypot(x - ax - dx * t, y - ay - dy * t));
          }
          return 0.5 + (half - best) * k;
        },
      );
    }
  };
  strands(spec.dark, 0);
  dots(spec.darkSpecks, 0);
  dots(spec.specks, 1);
  strands(spec.fibres, 1);
  return { size, grey, alpha };
}

// ---------------------------------------------------------------- encoding

const CRC = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Bits written least significant first, as deflate packs them. */
class Bits {
  out: number[] = [];
  private acc = 0;
  private n = 0;
  put(value: number, count: number): void {
    this.acc |= value << this.n;
    this.n += count;
    while (this.n >= 8) {
      this.out.push(this.acc & 0xff);
      this.acc >>>= 8;
      this.n -= 8;
    }
  }
  /** A Huffman code, which deflate writes most significant bit first. */
  code(code: number, count: number): void {
    let rev = 0;
    for (let i = 0; i < count; i++) rev |= ((code >>> i) & 1) << (count - 1 - i);
    this.put(rev, count);
  }
  end(): number[] {
    if (this.n > 0) this.out.push(this.acc & 0xff);
    return this.out;
  }
}

const LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195,
  227, 258,
];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097,
  6145, 8193, 12289, 16385, 24577,
];
const DIST_EXTRA = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
];

/** A literal or length symbol in the fixed Huffman code. */
function symbol(bits: Bits, s: number): void {
  if (s < 144) bits.code(0x30 + s, 8);
  else if (s < 256) bits.code(0x190 + s - 144, 9);
  else if (s < 280) bits.code(s - 256, 7);
  else bits.code(0xc0 + s - 280, 8);
}

/** Index of the last entry of `table` not above `value`. */
const bucket = (table: readonly number[], value: number): number => {
  let i = table.length - 1;
  while (table[i]! > value) i--;
  return i;
};

/** `data` as a zlib stream: one deflate block in the fixed code, with greedy LZ77 matches. */
function zlib(data: Uint8Array): Uint8Array {
  const bits = new Bits();
  bits.put(0x78, 8);
  bits.put(0x01, 8);
  bits.put(1, 1);
  bits.put(1, 2);
  const head = new Int32Array(1 << 15).fill(-1);
  const prev = new Int32Array(data.length).fill(-1);
  const hash = (i: number) => ((data[i]! << 10) ^ (data[i + 1]! << 5) ^ data[i + 2]!) & 0x7fff;
  const insert = (i: number) => {
    if (i + 2 >= data.length) return;
    const h = hash(i);
    prev[i] = head[h]!;
    head[h] = i;
  };
  let i = 0;
  while (i < data.length) {
    let bestLen = 0;
    let bestDist = 0;
    if (i + 2 < data.length) {
      let j = head[hash(i)]!;
      for (let chain = 0; j >= 0 && i - j <= 32768 && chain < 48; chain++, j = prev[j]!) {
        let len = 0;
        while (len < 258 && i + len < data.length && data[j + len] === data[i + len]) len++;
        if (len > bestLen) [bestLen, bestDist] = [len, i - j];
        if (len === 258) break;
      }
    }
    if (bestLen >= 3) {
      const l = bucket(LENGTH_BASE, bestLen);
      symbol(bits, 257 + l);
      bits.put(bestLen - LENGTH_BASE[l]!, LENGTH_EXTRA[l]!);
      const d = bucket(DIST_BASE, bestDist);
      bits.code(d, 5);
      bits.put(bestDist - DIST_BASE[d]!, DIST_EXTRA[d]!);
      for (let n = 0; n < bestLen; n++) insert(i + n);
      i += bestLen;
    } else {
      symbol(bits, data[i]!);
      insert(i);
      i++;
    }
  }
  symbol(bits, 256);
  const body = bits.end();
  let a = 1;
  let b = 0;
  for (const byte of data) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  const adler = ((b << 16) | a) >>> 0;
  return new Uint8Array([...body, adler >>> 24, (adler >>> 16) & 0xff, (adler >>> 8) & 0xff, adler & 0xff]);
}

function chunk(type: string, data: Uint8Array): number[] {
  const typed = new Uint8Array([...type].map((c) => c.charCodeAt(0)).concat([...data]));
  const n = data.length;
  const crc = crc32(typed);
  return [
    n >>> 24,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
    ...typed,
    crc >>> 24,
    (crc >>> 16) & 0xff,
    (crc >>> 8) & 0xff,
    crc & 0xff,
  ];
}

/**
 * A grey and alpha PNG, each row filtered by the difference from the row
 * above, compressed once and laid out with `pad` bytes of a private chunk
 * before the pixels.
 */
function png(size: number, grey: Float32Array, alpha: Float32Array): (pad: number) => Uint8Array {
  const row = size * 2;
  const raw = new Uint8Array((row + 1) * size);
  const byte = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  for (let y = 0; y < size; y++) {
    raw[y * (row + 1)] = 2;
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const a = alpha[i]!;
      const g = a > 0 ? byte(grey[i]! / a) : 0;
      const at = y * (row + 1) + 1 + x * 2;
      const up = y > 0 ? (y - 1) * size + x : -1;
      const a0 = up >= 0 && alpha[up]! > 0 ? byte(grey[up]! / alpha[up]!) : 0;
      raw[at] = (g - a0) & 0xff;
      raw[at + 1] = (byte(a) - (up >= 0 ? byte(alpha[up]!) : 0)) & 0xff;
    }
  }
  const ihdr = new Uint8Array([
    size >>> 24,
    (size >>> 16) & 0xff,
    (size >>> 8) & 0xff,
    size & 0xff,
    size >>> 24,
    (size >>> 16) & 0xff,
    (size >>> 8) & 0xff,
    size & 0xff,
    8,
    4,
    0,
    0,
    0,
  ]);
  const head = [137, 80, 78, 71, 13, 10, 26, 10, ...chunk('IHDR', ihdr)];
  const tail = [...chunk('IDAT', zlib(raw)), ...chunk('IEND', new Uint8Array())];
  return (pad) => new Uint8Array([...head, ...(pad > 0 ? chunk('paDd', new Uint8Array(pad)) : []), ...tail]);
}

function base64(bytes: Uint8Array): string {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out +=
      abc[n >>> 18]! +
      abc[(n >>> 12) & 63]! +
      (i + 1 < bytes.length ? abc[(n >>> 6) & 63]! : '=') +
      (i + 2 < bytes.length ? abc[n & 63]! : '=');
  }
  return out;
}

/** Each spec's tile, painted once for the tile and the block both. */
const painted = new WeakMap<WoolSpec, ReturnType<typeof paint>>();

/**
 * A PNG data URL whose text never reads `NaN`: a document is searched for
 * it as the mark of a number gone wrong, so a chunk of padding moves the
 * base64 off any run of the bytes that would spell it.
 */
function dataUrl(size: number, grey: Float32Array, alpha: Float32Array): string {
  const bytes = png(size, grey, alpha);
  for (let pad = 0; ; pad++) {
    const text = base64(bytes(pad));
    if (!text.includes('NaN') || pad > 64) return `data:image/png;base64,${text}`;
  }
}

/** The wool tile, or `repeat` by `repeat` copies of it in one block, as a PNG data URL. */
export function woolImage(spec: WoolSpec, repeat = 1): string {
  let tile = painted.get(spec);
  if (!tile) painted.set(spec, (tile = paint(spec)));
  if (repeat === 1) return dataUrl(tile.size, tile.grey, tile.alpha);
  const size = tile.size * repeat;
  const grey = new Float32Array(size * size);
  const alpha = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const from = (y % tile.size) * tile.size + (x % tile.size);
      grey[y * size + x] = tile.grey[from]!;
      alpha[y * size + x] = tile.alpha[from]!;
    }
  return dataUrl(size, grey, alpha);
}
