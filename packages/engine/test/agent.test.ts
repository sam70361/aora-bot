import { describe, expect, it, vi } from 'vitest';
import {
  EMOTIONS,
  EMOTION_IDS,
  emotionIdForState,
  emotionSegment,
  parseAgentMessage,
  resolveEmotionId,
  stateForEmotion,
} from '../src/agent/protocol.js';
import { createArbiter } from '../src/agent/arbiter.js';
import {
  ACTIVITY_VERBS,
  ACTIVITY_VERB_IDS,
  characterStateForRoster,
  claudeCode,
  cursor,
  stateForActivity,
  stateForAgentEvent,
  stateForTool,
} from '../src/agent/adapters.js';
import { normalize, normalizeLine, openMessageChannel, readLineStream } from '../src/agent/channel.js';
import { CHARACTER_STATES } from '../src/motion/states.js';

describe('emotion protocol', () => {
  it('maps the wire ids to their states', () => {
    // Spot checks of the wire protocol relay scripts emit.
    expect(stateForEmotion('00')).toBe('sleeping');
    expect(stateForEmotion('02')).toBe('idle');
    expect(stateForEmotion('03')).toBe('curious');
    expect(stateForEmotion('10')).toBe('happy');
    expect(stateForEmotion('13')).toBe('surprised');
    expect(stateForEmotion('21')).toBe('angry');
    expect(stateForEmotion('30')).toBe('thinking');
    expect(stateForEmotion('33')).toBe('celebrate');
    expect(stateForEmotion('34')).toBe('alerting');
    expect(stateForEmotion('38')).toBe('refusing');
    expect(stateForEmotion('40')).toBe('searching');
    expect(stateForEmotion('41')).toBe('powering-down');
  });

  it('assigns every state at least one id', () => {
    for (const state of CHARACTER_STATES) {
      const id = emotionIdForState(state);
      expect(EMOTION_IDS, state).toContain(id);
      expect(stateForEmotion(id)).toBe(state);
    }
  });

  it('has unique two-digit ids inside their segments', () => {
    expect(new Set(EMOTION_IDS).size).toBe(EMOTION_IDS.length);
    for (const def of EMOTIONS) {
      expect(def.id).toMatch(/^\d\d$/);
      expect(emotionSegment(def.id), def.id).not.toBeNull();
    }
  });

  it('falls back by segment for unknown ids and to idle for garbage', () => {
    expect(stateForEmotion('47')).toBe('progress');
    expect(stateForEmotion('49')).toBe('orbit');
    expect(stateForEmotion('29')).toBe('idle');
    expect(stateForEmotion('99')).toBe('idle');
    expect(stateForEmotion('nope')).toBe('idle');
    expect(stateForEmotion(null)).toBe('idle');
  });

  it('normalises loose ids', () => {
    expect(stateForEmotion(3)).toBe('curious');
    expect(stateForEmotion(' 30 ')).toBe('thinking');
    expect(resolveEmotionId('thinking')).toBe('30');
    expect(resolveEmotionId('30')).toBe('30');
    expect(resolveEmotionId('')).toBeNull();
  });

  it('parses every accepted message form', () => {
    expect(parseAgentMessage({ aoraBotId: '30', tips: 'hm' })).toEqual({
      emotionId: '30',
      state: 'thinking',
      tips: 'hm',
    });
    expect(parseAgentMessage('{"emotionId":"34"}')).toEqual({ emotionId: '34', state: 'alerting' });
    expect(parseAgentMessage({ state: 'happy' })).toEqual({ emotionId: '10', state: 'happy' });
    expect(parseAgentMessage('celebrate')).toEqual({ emotionId: '25', state: 'celebrate' });
    expect(parseAgentMessage('33')).toEqual({ emotionId: '33', state: 'celebrate' });
  });

  it('carries a valid dial and drops a broken one', () => {
    const hud = { kind: 'progress', value: 0.4 } as const;
    expect(parseAgentMessage({ aoraBotId: '32', hud })).toEqual({
      emotionId: '32',
      state: 'working',
      hud,
    });
    // The state is the part that matters, so a malformed dial costs the dial
    // and not the message.
    expect(parseAgentMessage({ aoraBotId: '32', hud: { kind: 'progress' } })).toEqual({
      emotionId: '32',
      state: 'working',
    });
    expect(parseAgentMessage({ aoraBotId: '32', hud: 'progress' })).toEqual({
      emotionId: '32',
      state: 'working',
    });
    expect(parseAgentMessage('{"state":"working","hud":{"kind":"notify","count":2}}')).toMatchObject({
      state: 'working',
      hud: { kind: 'notify', count: 2 },
    });
    // A state-like leftover is not a HUD: drop the dial, keep the message.
    expect(parseAgentMessage('{"state":"working","hud":{"kind":"typing"}}')).toMatchObject({
      state: 'working',
    });
    expect(parseAgentMessage('{"state":"working","hud":{"kind":"typing"}}')?.hud).toBeUndefined();
  });

  it('returns null rather than throwing on malformed input', () => {
    expect(parseAgentMessage('{not json')).toBeNull();
    expect(parseAgentMessage({})).toBeNull();
    expect(parseAgentMessage([])).toBeNull();
    expect(parseAgentMessage(42)).toBeNull();
    expect(parseAgentMessage({ aoraBotId: { nested: true } })).toBeNull();
  });
});

describe('adapters', () => {
  it('map tool events onto states', () => {
    expect(stateForAgentEvent('claude-code', 'PreToolUse')).toBe('searching');
    expect(stateForAgentEvent('claude-code', 'Stop')).toBe('celebrate');
    expect(stateForAgentEvent('cursor', 'awaitingApproval')).toBe('refusing');
    expect(stateForAgentEvent('cursor', 'nope')).toBeNull();
    expect(stateForAgentEvent('unknown', 'Stop')).toBeNull();
  });

  it('only point at ids the protocol defines', () => {
    for (const adapter of [claudeCode, cursor]) {
      for (const [event, id] of Object.entries(adapter.events)) {
        expect(EMOTION_IDS, `${adapter.id}.${event}`).toContain(id);
      }
    }
  });

  it('default unknown tools to working', () => {
    expect(stateForTool('web_search')).toBe('searching');
    expect(stateForTool('edit')).toBe('writing');
    expect(stateForTool('made_up')).toBe('working');
    expect(stateForTool(null)).toBe('working');
  });
});

describe('activity verbs', () => {
  it('maps every verb to a real state', () => {
    for (const verb of ACTIVITY_VERB_IDS) {
      const state = ACTIVITY_VERBS[verb];
      expect(CHARACTER_STATES, verb).toContain(state);
      expect(stateForActivity(verb), verb).toBe(state);
    }
    expect(Object.keys(ACTIVITY_VERBS)).toHaveLength(ACTIVITY_VERB_IDS.length);
    expect(new Set(ACTIVITY_VERB_IDS).size).toBe(ACTIVITY_VERB_IDS.length);
  });

  it('falls back to working for anything it does not know', () => {
    expect(stateForActivity('refactoring')).toBe('working');
    expect(stateForActivity('')).toBe('working');
    expect(stateForActivity(null)).toBe('working');
    expect(stateForActivity(undefined)).toBe('working');
    // A label that happens to match something on `Object.prototype` must not
    // be mistaken for a verb.
    expect(stateForActivity('constructor')).toBe('working');
    expect(stateForActivity('toString')).toBe('working');
  });

  it('resolves a roster row by surface', () => {
    expect(characterStateForRoster({}, 'list')).toBe('idle');
    expect(characterStateForRoster({ running: true }, 'list')).toBe('working');
    expect(characterStateForRoster({ running: true, activity: 'searching' }, 'list')).toBe('searching');
    expect(characterStateForRoster({ running: true, activity: 'nonsense' }, 'chat')).toBe('working');
    expect(characterStateForRoster({ composing: true }, 'chat')).toBe('composing');
    // Composing wins over the activity where it is worth showing...
    expect(characterStateForRoster({ composing: true, running: true, activity: 'coding' }, 'chat')).toBe(
      'composing',
    );
    // ...and is ignored on an avatar, where it would only flicker.
    expect(characterStateForRoster({ composing: true }, 'avatar')).toBe('idle');
    expect(characterStateForRoster({ composing: true, running: true, activity: 'reading' }, 'avatar')).toBe(
      'reading',
    );
  });
});

describe('arbiter', () => {
  function harness(opts: Parameters<typeof createArbiter>[0] = {}) {
    let clock = 0;
    const timers: { fn: () => void; at: number; id: number }[] = [];
    let nextId = 0;
    const applied: string[] = [];
    const arbiter = createArbiter({
      now: () => clock,
      schedule: (fn, ms) => {
        const id = nextId++;
        timers.push({ fn, at: clock + ms, id });
        return id;
      },
      cancel: (h) => {
        const i = timers.findIndex((t) => t.id === h);
        if (i >= 0) timers.splice(i, 1);
      },
      onApply: (r) => applied.push(r.state),
      ...opts,
    });
    const advance = (ms: number) => {
      clock += ms;
      for (const t of [...timers].sort((a, b) => a.at - b.at)) {
        if (t.at <= clock) {
          timers.splice(timers.indexOf(t), 1);
          t.fn();
        }
      }
    };
    return { arbiter, applied, advance };
  }

  it('shows the highest-priority visible session', () => {
    const { arbiter, applied, advance } = harness();
    arbiter.update({ sessionId: 'a', state: 'working' });
    advance(1000);
    arbiter.update({ sessionId: 'b', state: 'alerting' });
    advance(1000);
    arbiter.update({ sessionId: 'c', state: 'thinking' });
    expect(applied).toEqual(['working', 'alerting']);
    expect(arbiter.current()?.sessionId).toBe('b');
  });

  it('ignores headless sessions for display but tracks them', () => {
    const { arbiter, applied } = harness();
    arbiter.update({ sessionId: 'bg', state: 'alerting', headless: true });
    expect(applied).toEqual(['idle']);
    expect(arbiter.sessions().get('bg')?.headless).toBe(true);
  });

  it('holds a state for its minimum dwell and re-resolves afterwards', () => {
    const { arbiter, applied, advance } = harness({ minDisplayMs: 900 });
    arbiter.update({ sessionId: 'a', state: 'thinking' });
    advance(100);
    arbiter.update({ sessionId: 'a', state: 'working' });
    expect(applied).toEqual(['thinking']);
    advance(800);
    expect(applied).toEqual(['thinking', 'working']);
  });

  it('never drops a one-shot event that arrives during a dwell', () => {
    const { arbiter, applied, advance } = harness({ minDisplayMs: 900 });
    arbiter.update({ sessionId: 'a', state: 'working' });
    advance(100);
    arbiter.update({ sessionId: 'a', state: 'celebrate' });
    advance(50);
    // The session has moved on before the dwell ends...
    arbiter.update({ sessionId: 'a', state: 'idle' });
    advance(800);
    // ...but the event still plays.
    expect(applied).toEqual(['working', 'celebrate']);
  });

  it('drops a lower-priority proposal while a higher one is queued', () => {
    const { arbiter, applied, advance } = harness({ minDisplayMs: 900 });
    arbiter.update({ sessionId: 'a', state: 'working' });
    advance(100);
    arbiter.update({ sessionId: 'b', state: 'alerting' });
    arbiter.update({ sessionId: 'c', state: 'thinking' });
    advance(800);
    expect(applied).toEqual(['working', 'alerting']);
  });

  it('refreshes the caption for the same state without restarting the dwell', () => {
    const { arbiter, applied, advance } = harness();
    arbiter.update({ sessionId: 'a', state: 'working', tips: 'one' });
    arbiter.update({ sessionId: 'a', state: 'working', tips: 'two' });
    expect(applied).toEqual(['working', 'working']);
    expect(arbiter.current()?.tips).toBe('two');
    advance(2000);
    expect(applied).toHaveLength(2);
  });

  it('shows the dial belonging to the session it is showing', () => {
    const { arbiter, advance } = harness();
    const working = { kind: 'progress', value: 0.2 } as const;
    const alerting = { kind: 'notify', count: 3 } as const;

    arbiter.update({ sessionId: 'a', state: 'working', hud: working });
    expect(arbiter.current()?.hud).toEqual(working);
    expect(arbiter.sessions().get('a')?.hud).toEqual(working);

    advance(1000);
    arbiter.update({ sessionId: 'b', state: 'alerting', hud: alerting });
    expect(arbiter.current()?.hud).toEqual(alerting);

    // The loser keeps its own dial; it is simply not the one on screen.
    expect(arbiter.sessions().get('a')?.hud).toEqual(working);
  });

  it('refreshes the dial for an unchanged state', () => {
    const { arbiter } = harness();
    const seen: unknown[] = [];
    arbiter.update({ sessionId: 'a', state: 'working', hud: { kind: 'progress', value: 0.1 } });
    arbiter.subscribe((r) => seen.push(r.hud));
    arbiter.update({ sessionId: 'a', state: 'working', hud: { kind: 'progress', value: 0.9 } });
    expect(seen).toEqual([
      { kind: 'progress', value: 0.1 },
      { kind: 'progress', value: 0.9 },
    ]);
    arbiter.update({ sessionId: 'a', state: 'working' });
    expect(arbiter.current()?.hud).toBeUndefined();
  });

  it('falls back to idle when the last session leaves', () => {
    const { arbiter, applied, advance } = harness();
    arbiter.update({ sessionId: 'a', state: 'working' });
    advance(1000);
    arbiter.remove('a');
    expect(applied).toEqual(['working', 'idle']);
  });

  it('expires silent sessions on tick', () => {
    const { arbiter, applied, advance } = harness({ sessionTtlMs: 5000 });
    arbiter.update({ sessionId: 'a', state: 'working' });
    advance(6000);
    arbiter.tick();
    expect(applied).toEqual(['working', 'idle']);
  });

  it('evicts the stalest session at the cap', () => {
    const { arbiter, advance } = harness({ maxSessions: 2 });
    arbiter.update({ sessionId: 'a', state: 'idle' });
    advance(10);
    arbiter.update({ sessionId: 'b', state: 'idle' });
    advance(10);
    arbiter.update({ sessionId: 'c', state: 'idle' });
    expect([...arbiter.sessions().keys()]).toEqual(['b', 'c']);
  });

  it('accepts protocol ids as well as states', () => {
    const { arbiter } = harness();
    arbiter.update({ sessionId: 'a', emotionId: '40' });
    expect(arbiter.current()).toMatchObject({ state: 'searching', emotionId: '40' });
  });

  it('subscribe replays the current value and unsubscribes cleanly', () => {
    const { arbiter, advance } = harness();
    arbiter.update({ sessionId: 'a', state: 'working' });
    const seen: string[] = [];
    const off = arbiter.subscribe((r) => seen.push(r.state));
    expect(seen).toEqual(['working']);
    off();
    advance(1000);
    arbiter.update({ sessionId: 'a', state: 'thinking' });
    expect(seen).toEqual(['working']);
  });
});

describe('state channel', () => {
  it('normalises the three address forms', () => {
    expect(normalize({ session_id: 's', aoraBotId: '32', tips: 'busy' })).toEqual({
      ok: true,
      update: { sessionId: 's', emotionId: '32', state: 'working', headless: false, tips: 'busy' },
    });
    expect(normalize({ sessionId: 's', state: 'thinking' })).toMatchObject({
      ok: true,
      update: { emotionId: '30', state: 'thinking' },
    });
    expect(normalize({ session_id: 's', agent_id: 'claude-code', event: 'Stop' })).toMatchObject({
      ok: true,
      update: { emotionId: '33', state: 'celebrate' },
    });
  });

  it('reports what is wrong instead of throwing', () => {
    expect(normalize(null)).toMatchObject({ ok: false });
    expect(normalize({ aoraBotId: '30' })).toMatchObject({
      ok: false,
      error: expect.stringContaining('session_id'),
    });
    expect(normalize({ session_id: 's' })).toMatchObject({ ok: false });
    expect(normalize({ session_id: 's', agent_id: 'nope', event: 'x' })).toMatchObject({ ok: false });
    expect(normalize({ session_id: 's', agent_id: 'cursor', event: 'nope' })).toMatchObject({ ok: false });
    expect(normalize({ session_id: 's', aoraBotId: 'garbage' })).toMatchObject({ ok: false });
  });

  it('passes a dial through and drops an invalid one', () => {
    expect(
      normalize({ session_id: 's', state: 'working', hud: { kind: 'progress', value: 0.4 } }),
    ).toMatchObject({
      ok: true,
      update: { hud: { kind: 'progress', value: 0.4 } },
    });
    const bad = normalize({ session_id: 's', state: 'working', hud: { kind: 'voice' } });
    expect(bad).toMatchObject({ ok: true });
    expect(bad.ok && bad.update.hud).toBeUndefined();

    const line = normalizeLine('{"session_id":"s","state":"idle","hud":{"kind":"sync","state":"done"}}');
    expect(line).toMatchObject({ ok: true, update: { hud: { kind: 'sync', state: 'done' } } });
  });

  it('skips blank lines and flags bad JSON', () => {
    expect(normalizeLine('')).toEqual({ ok: true, skip: true });
    expect(normalizeLine('   \n')).toEqual({ ok: true, skip: true });
    expect(normalizeLine('{oops')).toMatchObject({ ok: false });
  });

  it('reads newline-delimited JSON across chunk boundaries', async () => {
    const updates: string[] = [];
    const errors: string[] = [];
    async function* chunks() {
      yield '{"session_id":"s","state":"thi';
      yield 'nking"}\n{"session_id":"s","aoraBotId":"33"}\nnot json\n';
      yield '{"session_id":"s","state":"idle"}';
    }
    await readLineStream(chunks(), {
      onUpdate: (u) => updates.push(u.state!),
      onError: (e) => errors.push(e),
    });
    expect(updates).toEqual(['thinking', 'celebrate', 'idle']);
    expect(errors).toHaveLength(1);
  });

  it('listens for typed postMessage payloads from an allowed origin', () => {
    const listeners = new Set<(e: MessageEvent) => void>();
    const target = {
      location: { origin: 'https://host.test' },
      addEventListener: vi.fn((_: string, l: EventListener) => listeners.add(l as never)),
      removeEventListener: vi.fn((_: string, l: EventListener) => listeners.delete(l as never)),
    };
    const updates: string[] = [];
    const close = openMessageChannel({ target, onUpdate: (u) => updates.push(u.state!) });

    const send = (origin: string, data: unknown) => {
      for (const l of listeners) l({ origin, data } as MessageEvent);
    };
    send('https://host.test', { type: 'aora:state', payload: { session_id: 's', state: 'happy' } });
    send('https://evil.test', { type: 'aora:state', payload: { session_id: 's', state: 'angry' } });
    send('https://host.test', { type: 'other', payload: { session_id: 's', state: 'angry' } });

    expect(updates).toEqual(['happy']);
    close();
    expect(listeners.size).toBe(0);
  });
});
