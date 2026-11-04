import type { ArbiterUpdate } from './arbiter.js';
import { isHudSpec } from '../hud/spec.js';
import { getAdapter, type AgentAdapter } from './adapters.js';
import { resolveEmotionId, stateForEmotion } from './protocol.js';

/**
 * The state channel: one message shape, several transports.
 *
 * An HTTP body, a line on stdin, a `postMessage` payload and an EventSource
 * event all carry the same object, so one normaliser serves every transport
 * and a relay script written for one works unchanged with another.
 *
 *     { "session_id": "s1", "aoraBotId": "32", "tips": "Editing…" }
 *     { "session_id": "s1", "agent_id": "claude-code", "event": "PreToolUse" }
 *     { "session_id": "s1", "state": "thinking" }
 *
 * `session_id` is required. Then one of: a protocol id (`aoraBotId` or
 * `emotionId`), a state name (`state`), or an adapter id plus event name.
 * `tips` is an optional caption, `hud` an optional dial; `headless: true`
 * marks a session that should be tracked but never shown.
 */
export type NormalizeResult = { ok: true; update: ArbiterUpdate } | { ok: false; error: string };

export interface NormalizeOptions {
  /** Where to look up `agent_id`. Defaults to the built-in adapters. */
  getAdapter?: (id: string) => AgentAdapter | null;
}

export function normalize(message: unknown, options: NormalizeOptions = {}): NormalizeResult {
  if (!message || typeof message !== 'object' || Array.isArray(message)) {
    return { ok: false, error: 'message must be a JSON object' };
  }
  const m = message as Record<string, unknown>;

  const sessionId = m.session_id ?? m.sessionId;
  if (typeof sessionId !== 'string' || !sessionId.trim()) {
    return { ok: false, error: 'missing session_id' };
  }

  const lookup = options.getAdapter ?? getAdapter;
  let emotionId: string | null = null;

  const direct = m.aoraBotId ?? m.emotionId ?? m.state;
  if (direct != null) {
    if (typeof direct !== 'string' && typeof direct !== 'number') {
      return { ok: false, error: 'aoraBotId / emotionId / state must be a string' };
    }
    emotionId = resolveEmotionId(direct);
    if (!emotionId) return { ok: false, error: `unknown state or id "${String(direct)}"` };
  } else if (m.agent_id != null || m.agentId != null) {
    const agentId = String(m.agent_id ?? m.agentId);
    const adapter = lookup(agentId);
    if (!adapter) return { ok: false, error: `unknown agent_id "${agentId}"` };
    const event = m.event == null ? '' : String(m.event);
    const mapped = adapter.events[event];
    if (!mapped) return { ok: false, error: `agent "${adapter.id}" has no event "${event}"` };
    emotionId = mapped;
  } else {
    return { ok: false, error: 'need aoraBotId, state, or agent_id + event' };
  }

  const update: ArbiterUpdate = {
    sessionId: sessionId.trim(),
    emotionId,
    state: stateForEmotion(emotionId),
    headless: m.headless === true,
  };
  if (m.tips != null && m.tips !== '') update.tips = String(m.tips);
  // A malformed dial is dropped rather than failing the message, for the
  // same reason an unknown id falls back instead of throwing: the sender is
  // somebody else's script and the state is the part that matters.
  if (isHudSpec(m.hud)) update.hud = m.hud;
  return { ok: true, update };
}

export type LineResult = NormalizeResult | { ok: true; skip: true };

/** Parse and normalise one line of newline-delimited JSON. Blank lines are skipped, not errors. */
export function normalizeLine(line: string, options?: NormalizeOptions): LineResult {
  const trimmed = line.trim();
  if (!trimmed) return { ok: true, skip: true };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    return { ok: false, error: `invalid JSON: ${(e as Error).message}` };
  }
  return normalize(parsed, options);
}

export interface ChannelHandlers {
  onUpdate: (update: ArbiterUpdate) => void;
  onError?: (error: string, raw: unknown) => void;
}

/** Wire shape for the `postMessage` transport. */
export const MESSAGE_TYPE = 'aora:state';

export interface MessageChannelOptions extends ChannelHandlers, NormalizeOptions {
  /**
   * Accepted `event.origin`. Defaults to the page's own origin; pass `'*'`
   * to accept any, which is only appropriate when the page is itself a
   * sandboxed widget.
   */
  allowOrigin?: string;
  /** Window to listen on. Defaults to the global. */
  target?: Pick<Window, 'addEventListener' | 'removeEventListener'> & { location?: { origin: string } };
}

/**
 * Listen for `{ type: 'aora:state', payload }` messages. Returns a closer.
 *
 * This is the transport for iframes and browser extensions, where the agent
 * lives in another document.
 */
export function openMessageChannel(options: MessageChannelOptions): () => void {
  const target = options.target ?? (typeof window !== 'undefined' ? window : null);
  if (!target) return () => {};

  const listener = (event: MessageEvent) => {
    const allow = options.allowOrigin ?? target.location?.origin;
    if (allow !== '*' && allow !== undefined && event.origin !== allow) return;
    const data = event.data as { type?: unknown; payload?: unknown } | null;
    if (!data || typeof data !== 'object' || data.type !== MESSAGE_TYPE) return;
    const r = normalize(data.payload, options);
    if (r.ok) options.onUpdate(r.update);
    else options.onError?.(r.error, data.payload);
  };

  target.addEventListener('message', listener as EventListener);
  return () => target.removeEventListener('message', listener as EventListener);
}

/**
 * Consume newline-delimited JSON from any async source of text chunks.
 *
 * Works on Node's `process.stdin`, a `ReadableStream` from `fetch`, or an
 * array of strings in a test. Buffers partial lines across chunk boundaries;
 * a final unterminated line is flushed when the source ends. Bad lines are
 * reported and skipped — the stream is not torn down by one typo.
 */
export async function readLineStream(
  source: AsyncIterable<string | Uint8Array>,
  handlers: ChannelHandlers & NormalizeOptions,
): Promise<void> {
  const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;
  let buffer = '';

  const handle = (line: string) => {
    const r = normalizeLine(line, handlers);
    if ('skip' in r) return;
    if (r.ok) handlers.onUpdate(r.update);
    else handlers.onError?.(r.error, line);
  };

  for await (const chunk of source) {
    buffer += typeof chunk === 'string' ? chunk : decoder ? decoder.decode(chunk, { stream: true }) : '';
    let idx: number;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      handle(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 1);
    }
  }
  if (buffer.trim()) handle(buffer);
}

/** Turn a `ReadableStream` (as returned by `fetch`) into an async iterable of chunks. */
export async function* streamChunks(stream: ReadableStream<Uint8Array>): AsyncIterable<Uint8Array> {
  const reader = stream.getReader();
  try {
    for (;;) {
      // oxlint-disable-next-line no-await-in-loop -- a stream is read one chunk at a time, in order
      const { done, value } = await reader.read();
      if (done) return;
      if (value) yield value;
    }
  } finally {
    reader.releaseLock();
  }
}
