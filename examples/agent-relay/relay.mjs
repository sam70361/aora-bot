#!/usr/bin/env node
/**
 * Zero-dependency relay: agent events in, SSE out.
 *
 *   node examples/agent-relay/relay.mjs
 *   my-agent --emit-json | node examples/agent-relay/relay.mjs --stdin
 *
 * POST /state  — JSON body, 204 on success, 400 on a bad payload.
 * GET  /events — server-sent events of the current arbiter result.
 * GET  /       — a tiny page that paints the current face.
 *
 * Not part of the workspace build. Imports the engine from this repository's
 * dist/; run `pnpm run build:lib` first.
 */
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createArbiter, normalize, readLineStream } from '../../packages/engine/dist/agent.js';
import { renderStaticSvg } from '../../packages/engine/dist/static.js';

const PORT = Number(process.env.PORT) || 27182;
const here = dirname(fileURLToPath(import.meta.url));

const clients = new Set();
const arbiter = createArbiter({
  onApply: (result) => {
    const line = `data: ${JSON.stringify(result)}\n\n`;
    for (const res of clients) res.write(line);
  },
});

function applyBody(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `invalid JSON: ${e.message}` };
  }
  const result = normalize(parsed);
  if (!result.ok) return result;
  arbiter.update(result.update);
  return { ok: true };
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/state') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const result = applyBody(Buffer.concat(chunks).toString('utf8'));
      if (!result.ok) {
        res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(result.error);
        return;
      }
      res.writeHead(204);
      res.end();
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'access-control-allow-origin': '*',
    });
    const current = arbiter.current();
    if (current) res.write(`data: ${JSON.stringify(current)}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    createReadStream(join(here, 'index.html')).pipe(res);
    return;
  }

  if (req.method === 'GET' && req.url?.startsWith('/preview.svg')) {
    const current = arbiter.current();
    // The winning session's `hud` travels with its state, so a progress ring
    // or a notification count posted by the agent shows up in the preview too.
    const svg = renderStaticSvg({
      shape: 'blob',
      color: 'blue',
      state: current?.state ?? 'idle',
      hud: current?.hud ?? null,
    });
    res.writeHead(200, { 'content-type': 'image/svg+xml; charset=utf-8' });
    res.end(svg);
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, '127.0.0.1', () => {
  process.stderr.write(`Aora Bot agent relay on http://127.0.0.1:${PORT}\n`);
});

if (process.argv.includes('--stdin')) {
  await readLineStream(process.stdin, {
    onUpdate: (update) => arbiter.update(update),
    onError: (error) => process.stderr.write(`${error}\n`),
  });
}
