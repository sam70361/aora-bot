// @vitest-environment happy-dom
import { act, createRef, useImperativeHandle, type ReactNode, type Ref } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AgentStateProvider,
  useAgentState,
  useArbiter,
  useOptionalAgentState,
  type AgentStateValue,
} from '../src/agent/AgentState.js';
import { useIdleSleep, type IdleSleep } from '../src/agent/useIdleSleep.js';

let root: Root | null = null;
let host: HTMLElement | null = null;

function render(ui: ReactNode): HTMLElement {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(ui));
  return host;
}

const advance = (ms: number): void =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'],
  });
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  host?.remove();
  host = null;
  vi.useRealTimers();
});

/*
 * The arbiter itself is covered in the engine; these tests are about the React
 * side of it — that one arbiter is created and disposed per mount, that the
 * subscription renders the subtree, and that the context is one value shared
 * by the subtree rather than one arbiter per consumer.
 *
 * Feeding the arbiter is the host's job, so every test here has to drive it
 * from outside the tree. The probes hand their hook's value out through an
 * imperative handle: writing to a captured variable during render would be
 * the exact side-effect-in-render these hooks exist to keep out of hosts.
 */

function Probe({ ref }: { ref?: Ref<AgentStateValue> }) {
  const agent = useAgentState();
  useImperativeHandle(ref, () => agent, [agent]);
  return <p data-state={agent.state} data-tips={agent.tips ?? ''} data-hud={agent.hud?.kind ?? ''} />;
}

const line = (el: HTMLElement) => el.querySelector('p')!;
const marked = (el: HTMLElement) => el.querySelector('span')!.getAttribute('data-state');

describe('AgentStateProvider', () => {
  it('starts idle and shows what a session reports', () => {
    const agent = createRef<AgentStateValue>();
    const el = render(
      <AgentStateProvider>
        <Probe ref={agent} />
      </AgentStateProvider>,
    );
    expect(line(el).getAttribute('data-state')).toBe('idle');

    act(() => agent.current!.update({ sessionId: 'main', state: 'searching', tips: 'Looking…' }));
    expect(line(el).getAttribute('data-state')).toBe('searching');
    expect(line(el).getAttribute('data-tips')).toBe('Looking…');
  });

  it('carries the dial of the winning session alongside its caption', () => {
    const agent = createRef<AgentStateValue>();
    const el = render(
      <AgentStateProvider minDisplayMs={0}>
        <Probe ref={agent} />
      </AgentStateProvider>,
    );
    act(() =>
      agent.current!.update({ sessionId: 'main', state: 'working', hud: { kind: 'progress', value: 0.4 } }),
    );
    expect(line(el).getAttribute('data-hud')).toBe('progress');
  });

  it('falls back to the idle state once a session is forgotten', () => {
    const agent = createRef<AgentStateValue>();
    const el = render(
      <AgentStateProvider minDisplayMs={0}>
        <Probe ref={agent} />
      </AgentStateProvider>,
    );
    act(() => agent.current!.update({ sessionId: 'main', state: 'working' }));
    expect(line(el).getAttribute('data-state')).toBe('working');

    act(() => agent.current!.remove('main'));
    expect(line(el).getAttribute('data-state')).toBe('idle');
  });

  it('shares one arbiter with every consumer in the subtree', () => {
    const first = createRef<AgentStateValue>();
    const second = createRef<AgentStateValue>();
    render(
      <AgentStateProvider>
        <Probe ref={first} />
        <Probe ref={second} />
      </AgentStateProvider>,
    );
    // One engine for the subtree, not one per component that asks about it.
    expect(first.current!.arbiter).toBe(second.current!.arbiter);
  });

  it('throws for a consumer with no provider, and the optional form does not', () => {
    // There is no sensible default arbiter: a component that read one and
    // found nothing would render a permanently idle character instead.
    expect(() => render(<Probe />)).toThrow(/AgentStateProvider/);
    root = null;
    host?.remove();

    // The optional form is for a component that has to work either way.
    function Optional() {
      const value = useOptionalAgentState();
      return <span data-state={value === null ? 'none' : value.state} />;
    }
    expect(marked(render(<Optional />))).toBe('none');
  });
});

describe('useArbiter', () => {
  function Host({ ref, ...options }: { ref: Ref<AgentStateValue> } & Parameters<typeof useArbiter>[0]) {
    const agent = useArbiter(options);
    useImperativeHandle(ref, () => agent, [agent]);
    return <span data-state={agent.state} />;
  }

  it('keeps one arbiter across re-renders and disposes it on unmount', () => {
    const agent = createRef<AgentStateValue>();
    const el = render(<Host ref={agent} minDisplayMs={0} />);
    const arbiter = agent.current!.arbiter;

    // Options are read once, at creation. A re-render that handed back a new
    // arbiter would silently drop every session reported so far.
    act(() => root!.render(<Host ref={agent} minDisplayMs={0} />));
    expect(agent.current!.arbiter).toBe(arbiter);

    act(() => agent.current!.update({ sessionId: 'a', state: 'happy' }));
    expect(marked(el)).toBe('happy');

    act(() => root!.unmount());
    root = null;

    // Disposed with the component: its sessions are gone, so a re-resolve
    // reports idle rather than the state the unmounted tree was showing.
    expect(arbiter.resolve().state).toBe('idle');
    // And nothing is left subscribed that could render into the dead tree.
    expect(() => arbiter.update({ sessionId: 'a', state: 'proud' })).not.toThrow();
  });

  it('expires silent sessions on its own tick', () => {
    const agent = createRef<AgentStateValue>();
    const el = render(<Host ref={agent} minDisplayMs={0} sessionTtlMs={1000} tickMs={250} />);

    act(() => agent.current!.update({ sessionId: 'a', state: 'working' }));
    expect(marked(el)).toBe('working');

    // Nothing else releases the session: the interval is what notices.
    advance(1500);
    expect(marked(el)).toBe('idle');
  });

  it('runs no interval when the tick is switched off', () => {
    const agent = createRef<AgentStateValue>();
    const el = render(<Host ref={agent} minDisplayMs={0} sessionTtlMs={1000} tickMs={0} />);

    act(() => agent.current!.update({ sessionId: 'a', state: 'working' }));
    advance(5000);
    // Stale, but still shown: with no tick, expiry is the host's business.
    expect(marked(el)).toBe('working');
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('useIdleSleep', () => {
  function Sleeper({ ref, enabled }: { ref?: Ref<IdleSleep>; enabled?: boolean }) {
    const idle = useIdleSleep({ drowsyAfterMs: 1000, sleepAfterMs: 3000, wakeMs: 400, enabled });
    useImperativeHandle(ref, () => idle, [idle]);
    return <span data-phase={idle.phase} data-state={idle.state ?? 'host'} />;
  }

  const phase = (el: HTMLElement) => el.querySelector('span')!.getAttribute('data-phase');

  it('drowses, then sleeps, and yields to the host while awake', () => {
    const el = render(<Sleeper />);
    expect(phase(el)).toBe('awake');
    // `null` rather than `idle`: an awake character is the host's to drive.
    expect(marked(el)).toBe('host');

    advance(1000);
    expect(phase(el)).toBe('drowsy');
    expect(marked(el)).toBe('drowsy');

    advance(2000);
    expect(phase(el)).toBe('asleep');
    expect(marked(el)).toBe('sleeping');
  });

  it('wakes on input, plays the wake-up, then hands control back', () => {
    const el = render(<Sleeper />);
    advance(3000);
    expect(phase(el)).toBe('asleep');

    act(() => document.dispatchEvent(new Event('keydown')));
    expect(phase(el)).toBe('waking');
    expect(marked(el)).toBe('waking');

    advance(400);
    expect(phase(el)).toBe('awake');
    expect(marked(el)).toBe('host');
  });

  it('can be woken imperatively, for a message that arrives on its own', () => {
    const idle = createRef<IdleSleep>();
    const el = render(<Sleeper ref={idle} />);
    advance(1000);
    expect(phase(el)).toBe('drowsy');

    act(() => idle.current!.wake());
    expect(phase(el)).toBe('waking');
  });

  it('counts a hidden tab as having waited rather than as having frozen', () => {
    const el = render(<Sleeper />);
    const visibility = (value: string) =>
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value });

    visibility('hidden');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    // Straight to asleep, without waiting out the timers a hidden tab may
    // not even be running.
    expect(phase(el)).toBe('asleep');

    visibility('visible');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(phase(el)).toBe('waking');
  });

  it('does nothing at all while disabled', () => {
    const el = render(<Sleeper enabled={false} />);
    advance(10_000);
    expect(phase(el)).toBe('awake');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops its timers on unmount', () => {
    render(<Sleeper />);
    act(() => root!.unmount());
    root = null;
    expect(vi.getTimerCount()).toBe(0);
    expect(() => advance(10_000)).not.toThrow();
  });
});
