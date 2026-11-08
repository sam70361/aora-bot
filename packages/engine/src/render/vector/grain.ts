/**
 * Paper grain as a small grayscale PNG, drawn and encoded without a DOM.
 *
 * The drawing media lay their grain through a pattern tile, and a browser
 * re-rasterises a tile whenever the scale it is drawn at changes — every frame
 * of a squash. A tile of a few hundred vector specks then costs a few hundred
 * shapes per character per frame; a tile that is one image costs one draw.
 *
 * The image is the same for every character and every run: specks and
 * streaks scattered by a seeded generator, rasterised with an analytic edge,
 * and written as an uncompressed PNG. Uncompressed keeps the encoder a page
 * long and needs nothing the browser and Node do not both have; the tiles are
 * a few kilobytes.
 */
import { mulberry32 } from '../../math/hash.js';

/** What a grain is made of, in shape units. */
export interface GrainShape {
  /** Side of the square tile. */
  tile: number;
  /** Round specks: count, smallest and largest radius. */
  specks?: { count: number; r: readonly [number, number] };
  /** Short strokes: count, length range, width, direction in degrees and its spread. */
  streaks?: {
    count: number;
    length: readonly [number, number];
    width: number;
    angle: number;
    spread: number;
  };
  seed: number;
}

/** Pixels per shape unit. Enough for a 400 px character; the browser scales the tile down for anything smaller. */
const DENSITY = 1.6;

/**
 * Specks in two tiers, every other one at a little over half the strength,
 * so the grain has depth rather than being all hole or all pigment.
 */
const TIERS = [1, 0.55] as const;

/**
 * Coverage of every pixel of the tile, 0 (clear) to 1 (a full-strength
 * speck), wrapped round the edges so the repeat has no seam.
 */
function coverage(shape: GrainShape): { size: number; values: Float32Array } {
  const size = Math.round(shape.tile * DENSITY);
  const values = new Float32Array(size * size);
  const k = size / shape.tile;

  /** Paint `strength` wherever `distance(x, y)` (in pixels, negative inside) says, round a box. */
  const stamp = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    strength: number,
    distance: (x: number, y: number) => number,
  ) => {
    for (let py = Math.floor(y0 * k) - 1; py <= Math.ceil(y1 * k) + 1; py++) {
      for (let px = Math.floor(x0 * k) - 1; px <= Math.ceil(x1 * k) + 1; px++) {
        const edge = Math.min(1, Math.max(0, 0.5 - distance(px + 0.5, py + 0.5)));
        if (edge <= 0) continue;
        const i = (((py % size) + size) % size) * size + (((px % size) + size) % size);
        values[i] = Math.max(values[i]!, edge * strength);
      }
    }
  };

  if (shape.specks) {
    const s = shape.specks;
    const rand = mulberry32(shape.seed);
    for (let i = 0; i < s.count; i++) {
      const x = rand() * shape.tile;
      const y = rand() * shape.tile;
      const r = s.r[0] + rand() * (s.r[1] - s.r[0]);
      stamp(
        x - r,
        y - r,
        x + r,
        y + r,
        TIERS[i % TIERS.length]!,
        (px, py) => Math.hypot(px - x * k, py - y * k) - r * k,
      );
    }
  }
  if (shape.streaks) {
    const s = shape.streaks;
    const rand = mulberry32(shape.seed ^ 0x5bd1e995);
    for (let i = 0; i < s.count; i++) {
      const x = rand() * shape.tile;
      const y = rand() * shape.tile;
      const len = s.length[0] + rand() * (s.length[1] - s.length[0]);
      const a = ((s.angle + (rand() - 0.5) * s.spread) * Math.PI) / 180;
      const dx = Math.cos(a) * len;
      const dy = Math.sin(a) * len;
      const half = s.width / 2;
      const ax = x * k;
      const ay = y * k;
      const bx = dx * k;
      const by = dy * k;
      const ll = bx * bx + by * by || 1;
      stamp(
        Math.min(x, x + dx) - half,
        Math.min(y, y + dy) - half,
        Math.max(x, x + dx) + half,
        Math.max(y, y + dy) + half,
        TIERS[i % TIERS.length]!,
        (px, py) => {
          const t = Math.min(1, Math.max(0, ((px - ax) * bx + (py - ay) * by) / ll));
          return Math.hypot(px - ax - bx * t, py - ay - by * t) - half * k;
        },
      );
    }
  }
  return { size, values };
}

// ------------------------------------------------------------------- PNG

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const u32 = (n: number): number[] => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];

function chunk(type: string, data: number[] | Uint8Array): number[] {
  const body = new Uint8Array(4 + data.length);
  for (let i = 0; i < 4; i++) body[i] = type.charCodeAt(i);
  body.set(data, 4);
  return [...u32(data.length), ...body, ...u32(crc32(body))];
}

/** A zlib stream of stored (uncompressed) deflate blocks. */
function zlibStored(raw: Uint8Array): number[] {
  const out = [0x78, 0x01];
  for (let at = 0; at < raw.length || at === 0; at += 0xffff) {
    const len = Math.min(0xffff, raw.length - at);
    const last = at + len >= raw.length ? 1 : 0;
    out.push(last, len & 0xff, len >>> 8, ~len & 0xff, (~len >>> 8) & 0xff);
    for (let i = 0; i < len; i++) out.push(raw[at + i]!);
    if (last) break;
  }
  let a = 1;
  let b = 0;
  for (const byte of raw) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return [...out, ...u32(((b << 16) | a) >>> 0)];
}

/** An 8-bit grayscale PNG of `size` × `size` pixels, as a data URL. */
function grayPng(size: number, gray: (i: number) => number): string {
  const raw = new Uint8Array(size * (size + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size + 1)] = 0;
    for (let x = 0; x < size; x++) raw[y * (size + 1) + 1 + x] = gray(y * size + x);
  }
  const bytes = [
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...chunk('IHDR', [...u32(size), ...u32(size), 8, 0, 0, 0, 0]),
    ...chunk('IDAT', zlibStored(raw)),
    ...chunk('IEND', []),
  ];
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return `data:image/png;base64,${btoa(binary)}`;
}

const IMAGES = new Map<string, string>();

/**
 * The grain as an image for a luminance mask, built once per grain.
 * `holes`: white paper with the specks dark, so the specks are where a mask
 * takes the pigment away. Otherwise the specks are light on black, so they
 * are all a mask lets through.
 */
export function grainImage(shape: GrainShape, holes: boolean): string {
  const key = `${shape.seed}:${holes}`;
  let url = IMAGES.get(key);
  if (!url) {
    const { size, values } = coverage(shape);
    url = grayPng(size, (i) => Math.round(255 * (holes ? 1 - values[i]! : values[i]!)));
    IMAGES.set(key, url);
  }
  return url;
}
