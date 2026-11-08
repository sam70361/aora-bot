#!/usr/bin/env node
/**
 * Records the README's media from the published element, in headless Chrome:
 *
 *   .github/media/hero.gif    six of the cast, the lead first, changing state
 *   .github/media/styles.gif  the lead in every style and variant
 *   .github/media/cast.png    the whole listed cast, smiling, by id
 *   .github/media/themes.png  six members of every shipped theme, a row each
 *
 * The page drives each character through `<aora-bot>`, so what is recorded
 * is exactly what a host gets. Time is Chrome's virtual time, advanced one
 * frame at a time, so a recording does not depend on the machine's speed.
 * The lists (cast, styles) are read from the engine, so a new member or
 * variant is in the next recording without this file changing.
 *
 *   pnpm build:lib && pnpm media            all of them
 *   pnpm media hero styles                  some of them
 *
 * Chrome is found in the usual places; `CHROME_PATH` names another binary.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAST, listStyles, loadThemes, THEME_MANIFEST, themeLook } from '@aora-bot/engine';
import gifenc from 'gifenc';
import { PNG } from 'pngjs';

// oxlint-disable-next-line import/no-named-as-default-member -- gifenc is CommonJS: Node hands an ES module only its default export
const { applyPalette, GIFEncoder, quantize } = gifenc;

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ELEMENT_DIST = join(ROOT, 'packages/element/dist');
const OUT = join(ROOT, '.github/media');

/** The site's dark paper: the cream lead reads on it, and so does every palette colour. */
const PAPER = '#16161a';
const LABEL = '#8d8b86';
const [LEAD] = CAST;

// ---- scenes -----------------------------------------------------------------

/** States the hero cycles through; each character walks its own five of them. */
const HERO_POOL = [
  'happy',
  'excited',
  'shy',
  'surprised',
  'curious',
  'thinking',
  'sleeping',
  'angry',
  'celebrate',
  'laughing',
];
const HERO_CAST = [LEAD.id, 'berry', 'miso', 'twinkle', 'beep', 'nimbo'];
const HERO_STEP_MS = 1600;

/** States every style shows together, one per two seconds: the clip is one lap of them. */
const STYLE_STATES = ['happy', 'curious', 'surprised', 'shy'];
const STYLE_STEP_MS = 2000;

/** Members of each theme on its row of the themes image. */
const THEME_PER_ROW = 6;

/** Every theme installed, so each member is shown as its theme presents it: the theme's skin, colour and face. */
await loadThemes(THEME_MANIFEST.map((theme) => theme.id));
const themeMember = (theme, id, seed) => {
  const look = themeLook(theme, id);
  return element({
    character: id,
    color: look.color,
    face: look.face,
    'style-id': look.style,
    variant: look.variant,
    size: 84,
    seed,
    state: 'happy',
  });
};

const element = (attrs) =>
  `<aora-bot ${Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ')}></aora-bot>`;

const CAST_PER_ROW = 8;
/** A cast row: a 112 px cell and the 6 px gap below it. */
const CAST_PITCH = 118;
/**
 * Rows of the cast recorded on one page. Chrome's virtual clock stalls on a
 * page with the whole cast animating at once, so it is recorded in strips
 * that stack, pixel for pixel, into the one image.
 */
const CAST_STRIP_ROWS = 5;

/** Rows `from` to `to` of the cast image: the first strip carries the top margin, the last the bottom. */
function castStrip(from, to, first) {
  const members = CAST.slice(from * CAST_PER_ROW, to * CAST_PER_ROW);
  const rows = Math.ceil(members.length / CAST_PER_ROW);
  const last = to * CAST_PER_ROW >= CAST.length;
  return {
    width: 960,
    height: rows * CAST_PITCH + (first ? 20 : 0) + (last ? 20 : 0),
    frames: 1,
    // Long enough for the entry flourish of `happy` to have played out.
    delay: 1400,
    css: `.grid { display: flex; flex-wrap: wrap; justify-content: center; padding: ${first ? 20 : 0}px 0 0; row-gap: 6px; }
      .cell { display: grid; justify-items: center; gap: 4px; width: 120px; height: 112px; }`,
    body: `<div class="grid">${members
      .map((member, i) => {
        const seed = `cast-${from * CAST_PER_ROW + i}`;
        return `<div class="cell">${element({ character: member.id, size: 84, seed, state: 'happy' })}<span>${member.id}</span></div>`;
      })
      .join('')}</div>`,
    script: `window.scene = () => {};`,
  };
}

/**
 * Every scene: its page size, its body, and `scene(t)`, which the recorder
 * calls before each frame with the clip's time, so state changes land on
 * frame boundaries and the clip loops.
 */
const SCENES = {
  hero: {
    file: 'hero.gif',
    width: 960,
    height: 300,
    frames: 200,
    delay: 40,
    css: `.row { display: flex; justify-content: space-around; align-items: center; height: 100%; padding: 0 12px; }`,
    body: `<div class="row">${HERO_CAST.map((id, i) =>
      element({ character: id, size: 132, seed: `hero-${i}`, state: HERO_POOL[i % HERO_POOL.length] }),
    ).join('')}</div>`,
    script: `
      const POOL = ${JSON.stringify(HERO_POOL)};
      const STEP = ${HERO_STEP_MS};
      const bots = [...document.querySelectorAll('aora-bot')];
      window.scene = (t) => bots.forEach((bot, i) => {
        const slot = Math.floor((t + (i * STEP) / bots.length) / STEP) % 5;
        const state = POOL[(i + slot * 2) % POOL.length];
        if (bot.getAttribute('state') !== state) bot.setAttribute('state', state);
      });`,
  },

  styles: {
    file: 'styles.gif',
    width: 960,
    height: 680,
    frames: 160,
    delay: 50,
    css: `.grid { display: grid; grid-template-columns: repeat(5, 1fr); align-content: center; height: 100%; row-gap: 14px; }
      .cell { display: grid; justify-items: center; gap: 8px; }`,
    body: `<div class="grid">${listStyles()
      .flatMap((series) => series.variants.map((variant) => ({ style: series.id, variant })))
      .map(
        ({ style, variant }, i) =>
          `<div class="cell">${element({
            character: LEAD.id,
            'style-id': style,
            variant,
            size: 104,
            seed: `styles-${i}`,
            state: STYLE_STATES[0],
          })}<span>${style} / ${variant}</span></div>`,
      )
      .join('')}</div>`,
    script: `
      const STATES = ${JSON.stringify(STYLE_STATES)};
      const bots = [...document.querySelectorAll('aora-bot')];
      window.scene = (t) => {
        const state = STATES[Math.floor(t / ${STYLE_STEP_MS}) % STATES.length];
        for (const bot of bots) if (bot.getAttribute('state') !== state) bot.setAttribute('state', state);
      };`,
  },

  cast: {
    file: 'cast.png',
    width: 960,
    height: Math.ceil(CAST.length / CAST_PER_ROW) * CAST_PITCH + 40,
    strips: [castStrip(0, CAST_STRIP_ROWS, true), castStrip(CAST_STRIP_ROWS, Infinity, false)],
  },

  themes: {
    file: 'themes.png',
    width: 960,
    height: THEME_MANIFEST.length * 118 + 40,
    frames: 1,
    delay: 1400,
    // A theme's characters load with the theme, before the clock is paused.
    settle: 2000,
    css: `.grid { display: grid; grid-template-columns: 150px repeat(${THEME_PER_ROW}, 120px); justify-content: center; align-items: center; padding: 20px 0; row-gap: 6px; }
      .theme { text-align: right; padding-right: 18px; color: #c9c6bf; }
      .cell { display: grid; justify-items: center; gap: 4px; height: 112px; }`,
    body: `<div class="grid">${THEME_MANIFEST.map(
      (theme) =>
        `<span class="theme">${theme.id}</span>${theme.cast
          .slice(0, THEME_PER_ROW)
          .map(
            (id, i) =>
              `<div class="cell">${themeMember(theme.id, id, `${theme.id}-${i}`)}<span>${id}</span></div>`,
          )
          .join('')}`,
    ).join('')}</div>`,
    script: `window.scene = () => {};`,
  },
};

/** Every page the recorder loads, by name: a scene, or a scene's strips as `<scene><n>`. */
const PAGES = Object.fromEntries(
  Object.entries(SCENES).flatMap(([name, scene]) =>
    scene.strips ? scene.strips.map((strip, i) => [`${name}${i}`, strip]) : [[name, scene]],
  ),
);

const page = (scene) => `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  :root { color-scheme: dark; --aora-bg-base: ${PAPER}; }
  html, body { margin: 0; background: ${PAPER}; }
  body { width: ${scene.width}px; height: ${scene.height}px; overflow: hidden; color: ${LABEL};
    font: 13px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  ${scene.css}
</style>
<script type="module" src="/element/aora-bot.js"></script>
</head><body>${scene.body}<script>${scene.script}</script></body></html>`;

// ---- a static server for the element and the scenes --------------------------

const TYPES = { '.js': 'text/javascript', '.map': 'application/json' };

function serve() {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const scene = url.pathname.match(/^\/scene\/(\w+)$/)?.[1];
    if (scene && PAGES[scene]) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(page(PAGES[scene]));
      return;
    }
    const file = normalize(join(ELEMENT_DIST, url.pathname.replace(/^\/element\//, '')));
    if (url.pathname.startsWith('/element/') && file.startsWith(ELEMENT_DIST) && existsSync(file)) {
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(readFileSync(file));
      return;
    }
    res.writeHead(404).end();
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// ---- Chrome over the DevTools protocol -------------------------------------

const CHROME_CANDIDATES = {
  win32: [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
};

function findChrome() {
  const named = process.env.CHROME_PATH;
  if (named) return named;
  const found = (CHROME_CANDIDATES[process.platform] ?? []).find((path) => existsSync(path));
  if (!found) throw new Error('No Chrome found; set CHROME_PATH to a Chrome or Chromium binary.');
  return found;
}

function launch(profile) {
  const chrome = spawn(
    findChrome(),
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--hide-scrollbars',
      '--mute-audio',
      '--no-first-run',
      '--force-color-profile=srgb',
      '--run-all-compositor-stages-before-draw',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  const endpoint = new Promise((resolve, reject) => {
    let log = '';
    chrome.stderr.on('data', (chunk) => {
      log += chunk;
      const match = log.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) resolve(match[1]);
    });
    chrome.on('exit', (code) => reject(new Error(`Chrome exited (${code}) before it was ready:\n${log}`)));
  });
  return { chrome, endpoint };
}

/** A minimal DevTools client: commands by id, events by name, over one socket. */
async function connect(endpoint) {
  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  const waiters = new Set();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== undefined) {
      const call = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) call?.reject(new Error(`${call.method}: ${message.error.message}`));
      else call?.resolve(message.result);
      return;
    }
    for (const waiter of waiters) {
      if (waiter.method === message.method && waiter.sessionId === message.sessionId) {
        waiters.delete(waiter);
        waiter.resolve(message.params);
      }
    }
  });
  return {
    send: (method, params = {}, sessionId) =>
      new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject, method });
        socket.send(JSON.stringify({ id, method, params, sessionId }));
      }),
    /** Resolves on the next `method` event; ask before the command that causes it. */
    next: (method, sessionId) => new Promise((resolve) => waiters.add({ method, sessionId, resolve })),
    close: () => socket.close(),
  };
}

// ---- recording -------------------------------------------------------------

/** Time the page runs before the first frame: the element loads its chunks and settles. */
const WARMUP_MS = 800;

/** Takes of one scene before giving up; a stalled take starts again in a fresh tab. */
const TAKES = 4;

class StalledError extends Error {}

async function record(cdp, origin, name) {
  const scene = PAGES[name];
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: scene.width,
    height: scene.height,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const loaded = cdp.next('Page.loadEventFired', sessionId);
  await send('Page.navigate', { url: `${origin}/scene/${name}` });
  await loaded;
  await send('Runtime.evaluate', {
    expression: `customElements.whenDefined('aora-bot').then(() => document.fonts.ready)`,
    awaitPromise: true,
  });
  if (scene.settle) {
    await send('Runtime.evaluate', {
      expression: `new Promise((resolve) => setTimeout(resolve, ${scene.settle}))`,
      awaitPromise: true,
    });
  }

  const now = async () =>
    (await send('Runtime.evaluate', { expression: 'performance.now()', returnByValue: true })).result.value;
  /**
   * Runs the page `ms` further on. On a crowded page Chrome sometimes spends
   * the whole budget without saying so, or stops the clock partway and never
   * starts it again, so the page's own clock is watched: reaching the end
   * counts as done, and a clock that stands still for three seconds fails the
   * take, which `main` then records again.
   */
  const advance = async (ms) => {
    const end = (await now()) + ms - 1;
    let done = false;
    const expired = cdp.next('Emulation.virtualTimeBudgetExpired', sessionId).then(() => (done = true));
    await send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: ms });
    const poll = async (last, still) => {
      await Promise.race([expired, new Promise((resolve) => setTimeout(resolve, 250))]);
      if (done) return;
      const t = await now();
      if (t >= end) return;
      if (t === last && still >= 11) {
        await cdp.send('Target.closeTarget', { targetId });
        throw new StalledError(`${name}: the page clock stopped at ${t.toFixed(0)} ms`);
      }
      await poll(t, t === last ? still + 1 : 0);
    };
    await poll(-1, 0);
  };
  await send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
  await advance(WARMUP_MS);

  const frame = async (n) => {
    await send('Runtime.evaluate', { expression: `scene(${n * scene.delay})` });
    await advance(scene.delay);
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    return Buffer.from(data, 'base64');
  };
  const frames = [];
  for (let n = 0; n < scene.frames; n++) {
    // oxlint-disable-next-line no-await-in-loop -- each frame is the page one step of virtual time after the last
    frames.push(await frame(n));
  }
  await cdp.send('Target.closeTarget', { targetId });
  return frames;
}

/**
 * One palette for the whole clip, from a sample of its frames, so colours do
 * not flicker between frames. After the first frame, a pixel that kept its
 * colour is written transparent over the frame before, which is most of them.
 */
function encodeGif(pngs, delay) {
  const frames = pngs.map((png) => PNG.sync.read(png));
  const { width, height } = frames[0];
  const step = Math.max(1, Math.floor(frames.length / 16));
  const sample = frames.filter((_, i) => i % step === 0);
  const pixels = new Uint8Array(sample.length * width * height * 4);
  sample.forEach((frame, i) => pixels.set(frame.data, i * width * height * 4));
  const colors = quantize(pixels, 255);
  const clear = colors.length;
  const palette = [...colors, [0, 0, 0]];

  const gif = GIFEncoder();
  let previous;
  frames.forEach((frame) => {
    const index = applyPalette(frame.data, colors);
    if (!previous) {
      gif.writeFrame(index, width, height, { palette, delay, repeat: 0 });
    } else {
      const delta = index.map((value, k) => (value === previous[k] ? clear : value));
      gif.writeFrame(delta, width, height, { delay, transparent: true, transparentIndex: clear, dispose: 1 });
    }
    previous = index;
  });
  gif.finish();
  return gif.bytes();
}

/** PNG strips of one width, top to bottom, as one PNG. */
function stack(pngs, width, height) {
  const out = new PNG({ width, height });
  let y = 0;
  for (const png of pngs.map((bytes) => PNG.sync.read(bytes))) {
    png.data.copy(out.data, y * width * 4);
    y += png.height;
  }
  return PNG.sync.write(out);
}

async function main() {
  const asked = process.argv.slice(2);
  const names = asked.length > 0 ? asked : Object.keys(SCENES);
  const unknown = names.filter((name) => !SCENES[name]);
  if (unknown.length > 0)
    throw new Error(`Unknown scene: ${unknown.join(', ')} (have ${Object.keys(SCENES).join(', ')})`);
  if (!existsSync(join(ELEMENT_DIST, 'aora-bot.js')))
    throw new Error('Build the element first: pnpm build:lib');

  const server = await serve();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const profile = mkdtempSync(join(tmpdir(), 'aora-media-'));
  const { chrome, endpoint } = launch(profile);
  try {
    const cdp = await connect(await endpoint);
    mkdirSync(OUT, { recursive: true });
    const takes = async (name) => {
      for (let take = 1; ; take++) {
        try {
          // oxlint-disable-next-line no-await-in-loop -- a take starts only once the one before it has stalled
          return await record(cdp, origin, name);
        } catch (error) {
          if (!(error instanceof StalledError) || take === TAKES) throw error;
          process.stderr.write(`${error.message}; take ${take + 1}\n`);
        }
      }
    };
    for (const name of names) {
      const scene = SCENES[name];
      const frames = [];
      if (scene.strips) {
        const strips = [];
        for (let i = 0; i < scene.strips.length; i++) {
          // oxlint-disable-next-line no-await-in-loop -- pages record one after another in the one browser
          strips.push((await takes(`${name}${i}`))[0]);
        }
        frames.push(stack(strips, scene.width, scene.height));
      } else {
        // oxlint-disable-next-line no-await-in-loop -- scenes record one after another in the one browser
        frames.push(...(await takes(name)));
      }
      const bytes = scene.file.endsWith('.gif') ? encodeGif(frames, scene.delay) : frames[0];
      writeFileSync(join(OUT, scene.file), bytes);
      process.stdout.write(
        `${scene.file}: ${scene.width}×${scene.height}, ${frames.length} frame(s), ${(bytes.length / 1024).toFixed(0)} KB\n`,
      );
    }
    cdp.close();
  } finally {
    // The profile stays locked until Chrome has gone.
    const exited = new Promise((resolve) => chrome.once('exit', resolve));
    chrome.kill();
    await exited;
    server.close();
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch {
      // Chrome's helpers can hold the profile a little longer; a temp folder left behind is harmless.
    }
  }
}

await main();
