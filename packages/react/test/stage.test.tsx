// @vitest-environment happy-dom
import { DEFAULT_TOOL_STATE, type CharacterState, type RosterSurface } from '@aora-bot/engine';
import { act, useMemo, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CharacterHandle } from '../src/mark/CharacterMark.js';
import {
  createMarkCommandRegistry,
  useMarkCommand,
  useMarkCommands,
  type MarkCommandRegistry,
} from '../src/stage/commands.js';
import { useDeadline, useMarkSettle, useTapCycle, POKE_COOLDOWN_MS } from '../src/stage/hooks.js';
import { CharacterStageProvider } from '../src/stage/CharacterStage.js';

/*
 * The command bus is a plain object, so most of it is tested without a DOM.
 * The hooks around it need one, and they need fake timers in particular:
 * every interesting case here is about *when* something happens.
 */

let root: Root | null = null;
let host: HTMLElement | null = null;

function render(ui: ReactNode): HTMLElement {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(ui));
  return host;
}

const rerender = (ui: ReactNode): void => act(() => root!.render(ui));
const advance = (ms: number): void =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  });
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  host?.remove();
  host = null;
  vi.useRealTimers();
});

describe('mark command registry', () => {
  let registry: MarkCommandRegistry;

  beforeEach(() => {
    registry = createMarkCommandRegistry();
  });

  afterEach(() => registry.dispose());

  it('resolves an unknown agent to a resting snapshot, by identity', () => {
    const first = registry.read('nobody');
    expect(first).toMatchObject({ state: 'idle', emphasis: false, pokeSeq: 0, facts: null, held: null });
    // Identity matters: useSyncExternalStore would loop on a fresh object.
    expect(registry.read('nobody')).toBe(first);
  });

  it('derives a state from facts, per surface', () => {
    registry.holdFacts('nova', { running: true, activity: 'searching' });
    expect(registry.read('nova').state).toBe('searching');

    registry.holdFacts('nova', { running: true });
    expect(registry.read('nova').state).toBe(DEFAULT_TOOL_STATE);

    // The same facts mean different things in different places: a chat wants
    // to show that a reply is being written; a roster of avatars does not.
    registry.holdFacts('nova', { composing: true });
    expect(registry.read('nova', 'chat').state).toBe('composing');
    expect(registry.read('nova', 'avatar').state).toBe('idle');
  });

  it('lets an explicit hold win over facts, highest priority first', () => {
    registry.holdFacts('nova', { running: true, activity: 'reading' });
    const low = registry.holdState('nova', 'thinking');
    expect(registry.read('nova')).toMatchObject({ state: 'thinking', held: 'thinking' });

    const high = registry.holdState('nova', 'alerting', { priority: 5 });
    expect(registry.read('nova').state).toBe('alerting');

    // Releasing the winner falls back to the other hold, then to the facts.
    high();
    expect(registry.read('nova').state).toBe('thinking');
    low();
    expect(registry.read('nova')).toMatchObject({ state: 'reading', held: null });
  });

  it('expires a held state after its ttl', () => {
    registry.holdState('nova', 'celebrate', { ttlMs: 500 });
    expect(registry.read('nova').state).toBe('celebrate');

    vi.advanceTimersByTime(499);
    expect(registry.read('nova').state).toBe('celebrate');
    vi.advanceTimersByTime(1);
    expect(registry.read('nova').state).toBe('idle');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases only what the caller set', () => {
    const release = registry.holdFacts('nova', { running: true });
    registry.holdFacts('nova', { composing: true });
    // A later row replaced the facts; the earlier row unmounting must not
    // blank them.
    release();
    expect(registry.read('nova', 'chat').state).toBe('composing');

    registry.releaseFacts('nova');
    expect(registry.read('nova').state).toBe('idle');
  });

  it('carries emphasis and a poke counter', () => {
    registry.setEmphasis('nova', true);
    expect(registry.read('nova').emphasis).toBe(true);

    registry.poke('nova');
    registry.poke('nova');
    expect(registry.read('nova').pokeSeq).toBe(2);

    registry.setEmphasis('nova', false);
    expect(registry.read('nova')).toMatchObject({ emphasis: false, pokeSeq: 2 });
  });

  it('notifies only the subscribers of the agent that changed', () => {
    const nova = vi.fn();
    const atlas = vi.fn();
    registry.subscribe('nova', nova);
    registry.subscribe('atlas', atlas);

    registry.holdState('nova', 'working');
    expect(nova).toHaveBeenCalledTimes(1);
    expect(atlas).not.toHaveBeenCalled();

    // Facts equal by value are not a change, whatever the object identity.
    registry.holdFacts('nova', { running: true });
    registry.holdFacts('nova', { running: true });
    expect(nova).toHaveBeenCalledTimes(2);
  });

  it('cancels pending ttls when disposed', () => {
    registry.holdState('nova', 'celebrate', { ttlMs: 1000 });
    registry.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
});

function Publisher({ agentId }: { agentId: string }) {
  const commands = useMarkCommands();
  return (
    <button type="button" onClick={() => commands.holdFacts(agentId, { composing: true })}>
      publish
    </button>
  );
}

function CommandProbe({ agentId, surface }: { agentId: string; surface?: RosterSurface }) {
  const commands = useMarkCommands();
  const snapshot = useMarkCommand(agentId, surface);
  return (
    <button
      type="button"
      data-state={snapshot.state}
      data-emphasis={String(snapshot.emphasis)}
      data-poke={snapshot.pokeSeq}
      onClick={() => commands.holdState(agentId, 'happy')}
    />
  );
}

describe('useMarkCommand', () => {
  const probe = (el: HTMLElement) => el.querySelector('button')!;

  it('shares one registry across a provider', () => {
    const el = render(
      <CharacterStageProvider>
        <CommandProbe agentId="nova" />
        <CommandProbe agentId="nova" surface="chat" />
      </CharacterStageProvider>,
    );

    const [list, chat] = [...el.querySelectorAll('button')];
    act(() => list!.click());
    expect(list!.getAttribute('data-state')).toBe('happy');
    expect(chat!.getAttribute('data-state')).toBe('happy');
  });

  it('reads the same agent differently per surface', () => {
    const el = render(
      <CharacterStageProvider>
        <Publisher agentId="nova" />
        <CommandProbe agentId="nova" surface="chat" />
        <CommandProbe agentId="nova" surface="avatar" />
      </CharacterStageProvider>,
    );

    act(() => el.querySelector('button')!.click());
    const probes = [...el.querySelectorAll('[data-state]')];
    expect(probes.map((p) => p.getAttribute('data-state'))).toEqual(['composing', 'idle']);
  });

  it('still works with no provider in the tree', () => {
    const el = render(<CommandProbe agentId="standalone-agent" />);
    expect(probe(el).getAttribute('data-state')).toBe('idle');
    act(() => probe(el).click());
    expect(probe(el).getAttribute('data-state')).toBe('happy');
  });
});

function SettleProbe({ state, settleMs }: { state: CharacterState; settleMs?: number }) {
  return <span data-state={useMarkSettle(state, settleMs == null ? undefined : { settleMs })} />;
}

describe('useMarkSettle', () => {
  const state = (el: HTMLElement) => el.querySelector('span')!.getAttribute('data-state');

  it('holds the old state until the new one has been still for the window', () => {
    const el = render(<SettleProbe state="idle" />);
    expect(state(el)).toBe('idle');

    rerender(<SettleProbe state="working" />);
    expect(state(el)).toBe('idle');
    advance(1399);
    expect(state(el)).toBe('idle');
    advance(1);
    expect(state(el)).toBe('working');
  });

  it('restarts the window when the facts churn, so nothing flickers', () => {
    const el = render(<SettleProbe state="idle" />);
    rerender(<SettleProbe state="working" />);
    advance(1000);
    rerender(<SettleProbe state="reading" />);
    advance(1000);
    // Two changes inside one window: still showing the original.
    expect(state(el)).toBe('idle');
    advance(400);
    expect(state(el)).toBe('reading');
  });

  it('passes the state straight through when settling is switched off', () => {
    const el = render(<SettleProbe state="idle" settleMs={0} />);
    rerender(<SettleProbe state="working" settleMs={0} />);
    expect(state(el)).toBe('working');
    expect(vi.getTimerCount()).toBe(0);
  });
});

let lastPokeResult: boolean | null = null;

function PokeProbe({ handle }: { handle: CharacterHandle | null }) {
  // A plain box rather than `useRef`, so the probe never writes a ref in render.
  const ref = useMemo(() => ({ current: handle }), [handle]);
  const poke = useTapCycle(ref);
  return (
    <button
      type="button"
      onClick={() => {
        lastPokeResult = poke();
      }}
    />
  );
}

describe('useTapCycle', () => {
  it('cycles spin, bounce and burst, and rate-limits itself', () => {
    const handle: CharacterHandle = { spin: vi.fn(), bounce: vi.fn(), burst: vi.fn() };
    const el = render(<PokeProbe handle={handle} />);
    const click = () => act(() => el.querySelector('button')!.click());

    click();
    expect(handle.spin).toHaveBeenCalledTimes(1);

    // Inside the cooldown: swallowed, and the cycle does not advance.
    click();
    expect(handle.bounce).not.toHaveBeenCalled();

    advance(POKE_COOLDOWN_MS);
    click();
    expect(handle.bounce).toHaveBeenCalledTimes(1);

    advance(POKE_COOLDOWN_MS);
    click();
    expect(handle.burst).toHaveBeenCalledTimes(1);

    advance(POKE_COOLDOWN_MS);
    click();
    expect(handle.spin).toHaveBeenCalledTimes(2);
  });

  it('reports back when there is no engine to poke', () => {
    const el = render(<PokeProbe handle={null} />);
    act(() => el.querySelector('button')!.click());
    expect(lastPokeResult).toBe(false);
  });
});

function DeadlineProbe({ ms, token }: { ms: number; token: string }) {
  return <span data-passed={String(useDeadline(ms, [token]))} />;
}

describe('useDeadline', () => {
  const passed = (el: HTMLElement) => el.querySelector('span')!.getAttribute('data-passed');

  it('flips once, and restarts when its dependencies change', () => {
    const el = render(<DeadlineProbe ms={500} token="a" />);
    expect(passed(el)).toBe('false');
    advance(500);
    expect(passed(el)).toBe('true');

    rerender(<DeadlineProbe ms={500} token="b" />);
    expect(passed(el)).toBe('false');
    advance(500);
    expect(passed(el)).toBe('true');
  });

  it('is already passed when there is no window to wait for', () => {
    const el = render(<DeadlineProbe ms={0} token="a" />);
    expect(passed(el)).toBe('true');
  });
});
