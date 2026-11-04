// @vitest-environment happy-dom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityMark, GroupActivityMark, POKE_HOP_MS } from '../src/activity/ActivityMark.js';
import { ACTIVITY_EXIT_MS, resetSpawnEntrances } from '../src/activity/presence.js';
import {
  createMarkCommandRegistry,
  MarkCommandContext,
  type MarkCommandRegistry,
} from '../src/stage/commands.js';
import { MarkStageProvider } from '../src/stage/MarkStage.js';

let root: Root | null = null;
let host: HTMLElement | null = null;
let seed = 0;

/** A fresh id per test, so the session-wide spawn memory cannot leak between them. */
const freshAgent = () => ({ id: `agent-${++seed}`, name: 'Nova' });

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
  resetSpawnEntrances();
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

const row = (el: HTMLElement) => el.querySelector('.aora-activity') as HTMLElement | null;
const markBox = (el: HTMLElement) => el.querySelector('.aora-activity__mark') as HTMLElement;
const label = (el: HTMLElement) => el.querySelector('.aora-ticker__line--in')?.textContent ?? null;
const poked = (el: HTMLElement) => markBox(el).classList.contains('aora-activity__mark--poked');

describe('ActivityMark labels', () => {
  it('shows the label by default and keeps the tool and the face in step', () => {
    const el = render(<ActivityMark agent={freshAgent()} tool="search" />);
    expect(label(el)).toBe('Searching');
    expect(el.querySelector('.aora-mark')!.getAttribute('data-state')).toBe('spawning');

    // The engine owns the arrival clock; the prop stops fighting it afterwards.
    advance(2000);
    expect(el.querySelector('.aora-mark')!.getAttribute('data-state')).toBe('searching');
  });

  it('keeps a hover-only label in the DOM, so it is still readable aloud', () => {
    const el = render(<ActivityMark agent={freshAgent()} tool="search" showLabel="hover" />);
    const line = el.querySelector('.aora-ticker')!;
    expect(line.classList.contains('aora-activity__label--hover')).toBe(true);
    expect(label(el)).toBe('Searching');
  });

  it('hides the label visually rather than dropping it', () => {
    const el = render(<ActivityMark agent={freshAgent()} tool="search" showLabel="never" />);
    expect(el.querySelector('.aora-ticker')).toBeNull();
    expect(el.querySelector('.aora-visually-hidden')!.textContent).toBe('Searching');
  });

  it('takes an explicit text override', () => {
    const el = render(<ActivityMark agent={freshAgent()} tool="search" text="Reading the manual" />);
    expect(label(el)).toBe('Reading the manual');
  });
});

describe('ActivityMark interaction', () => {
  let registry: MarkCommandRegistry;

  beforeEach(() => {
    registry = createMarkCommandRegistry();
  });

  afterEach(() => registry.dispose());

  it('emphasises the agent on hover and clears it on unmount', () => {
    const agent = freshAgent();
    const el = render(<ActivityMark agent={agent} tool="search" />);

    // React synthesises enter/leave from the delegated over/out pair.
    act(() => markBox(el).dispatchEvent(new MouseEvent('pointerover', { bubbles: true })));
    expect(row(el)!.classList.contains('aora-activity--emphasis')).toBe(true);

    act(() => markBox(el).dispatchEvent(new MouseEvent('pointerout', { bubbles: true })));
    expect(row(el)!.classList.contains('aora-activity--emphasis')).toBe(false);
  });

  it('becomes a real control when the host wants the click, and reports it', () => {
    const agent = freshAgent();
    const onPoke = vi.fn();
    const el = render(<ActivityMark agent={agent} tool="search" onPoke={onPoke} />);

    const button = el.querySelector('button')!;
    expect(button.getAttribute('aria-label')).toBe('Poke');
    act(() => button.click());
    expect(onPoke).toHaveBeenCalledWith(agent);
  });

  it('hops the wrapper when the mark is a mirror that cannot animate alone', () => {
    const el = render(
      <MarkStageProvider>
        <ActivityMark agent={freshAgent()} tool="search" />
      </MarkStageProvider>,
    );
    advance(16);

    act(() => markBox(el).click());
    expect(markBox(el).classList.contains('aora-activity__mark--poked')).toBe(true);
    advance(420);
    expect(markBox(el).classList.contains('aora-activity__mark--poked')).toBe(false);
  });

  /*
   * The registry is created here and handed to the tree, rather than read
   * back out of the context the provider makes: `commands.poke(id)` called
   * from outside the tree is exactly the case being tested — a shortcut
   * handler or a socket message, neither of which is a React component.
   */
  it('answers a poke from elsewhere in the application the same way as a click', () => {
    const agent = freshAgent();
    const el = render(
      <MarkStageProvider>
        <MarkCommandContext.Provider value={registry}>
          <ActivityMark agent={agent} tool="search" />
        </MarkCommandContext.Provider>
      </MarkStageProvider>,
    );
    advance(16);
    expect(poked(el)).toBe(false);

    act(() => registry.poke(agent.id));
    expect(poked(el)).toBe(true);

    advance(POKE_HOP_MS);
    expect(poked(el)).toBe(false);

    // The counter is what changed, not its value, so a second poke lands too.
    act(() => registry.poke(agent.id));
    expect(poked(el)).toBe(true);
  });

  it('leaves the mark of a different agent alone', () => {
    const el = render(
      <MarkStageProvider>
        <MarkCommandContext.Provider value={registry}>
          <ActivityMark agent={freshAgent()} tool="search" />
        </MarkCommandContext.Provider>
      </MarkStageProvider>,
    );
    advance(16);

    act(() => registry.poke(freshAgent().id));
    expect(poked(el)).toBe(false);
  });
});

describe('ActivityMark appearance', () => {
  it('passes the face, nose and pen through to the character', () => {
    const el = render(
      <ActivityMark agent={freshAgent()} tool="search" face="line" nose="hook" lineWeight={1.4} />,
    );
    const mark = el.querySelector('.aora-mark')!;
    expect(mark.getAttribute('data-face')).toBe('line');
    expect(mark.querySelectorAll('g[clip-path] > path[fill="none"]').length).toBeGreaterThan(0);
  });

  it('applies a style to the row rather than to the character', () => {
    const el = render(<ActivityMark agent={freshAgent()} tool="search" style={{ marginTop: '4px' }} />);
    expect(row(el)!.style.marginTop).toBe('4px');
    expect((el.querySelector('.aora-mark') as HTMLElement).style.marginTop).toBe('');
  });

  it('carries the same three through a group, for whichever member is showing', () => {
    const el = render(
      <GroupActivityMark members={[{ id: 'ada' }]} tool="run" face="line" nose="bow" lineWeight={1.4} />,
    );
    expect(el.querySelector('.aora-mark')!.getAttribute('data-face')).toBe('line');
  });

  it('takes a style on the group without losing the ink crossfade', () => {
    const el = render(<GroupActivityMark members={[{ id: 'ada' }]} style={{ gap: '2px' }} />);
    const group = el.querySelector('.aora-activity-group') as HTMLElement;
    expect(group.style.gap).toBe('2px');
    expect(group.getAttribute('style')).toContain('--aora-activity-ink');
  });
});

describe('ActivityMark presence', () => {
  it('plays the exit animation before unmounting', () => {
    const agent = freshAgent();
    const el = render(<ActivityMark agent={agent} tool="search" />);
    expect(row(el)).not.toBeNull();

    rerender(<ActivityMark agent={agent} tool="search" visible={false} />);
    expect(row(el)!.classList.contains('aora-activity--leaving')).toBe(true);

    advance(ACTIVITY_EXIT_MS - 1);
    expect(row(el)).not.toBeNull();
    advance(1);
    expect(row(el)).toBeNull();
  });

  it('plays the arrival once per agent, not once per mount', () => {
    const agent = freshAgent();
    const first = render(<ActivityMark agent={agent} tool="search" />);
    expect(first.querySelector('.aora-activity--entering')).not.toBeNull();

    act(() => root!.unmount());
    root = null;
    host?.remove();

    const second = render(<ActivityMark agent={agent} tool="search" />);
    expect(second.querySelector('.aora-activity--entering')).toBeNull();
    expect(second.querySelector('.aora-mark')!.getAttribute('data-state')).toBe('searching');
  });
});

describe('ActivityMark facts mode', () => {
  it('derives the state and the words from published facts', () => {
    const agent = freshAgent();
    const el = render(
      <ActivityMark agent={agent} activityMode="facts" facts={{ running: true, activity: 'reading' }} />,
    );
    advance(2000);

    expect(el.querySelector('.aora-mark')!.getAttribute('data-state')).toBe('reading');
    expect(label(el)).toBe('Reading');

    rerender(<ActivityMark agent={agent} activityMode="facts" facts={{ composing: true }} />);
    expect(el.querySelector('.aora-mark')!.getAttribute('data-state')).toBe('composing');
    expect(label(el)).toBe('Typing');
  });

  it('does not churn when the caller hands it a new object of the same facts', () => {
    const agent = freshAgent();
    const el = render(<ActivityMark agent={agent} activityMode="facts" facts={{ running: true }} />);
    advance(2000);
    const before = el.querySelector('.aora-mark')!.getAttribute('data-state');

    rerender(<ActivityMark agent={agent} activityMode="facts" facts={{ running: true }} />);
    expect(el.querySelector('.aora-mark')!.getAttribute('data-state')).toBe(before);
  });
});

describe('GroupActivityMark', () => {
  const members = [
    { id: 'ada', color: 'red' as const },
    { id: 'grace', color: 'blue' as const },
  ];

  it('rotates through members and carries the ink on a transitionable property', () => {
    const el = render(<GroupActivityMark members={members} tool="run" cycleMs={2000} />);
    const group = el.querySelector('.aora-activity-group')!;
    const ink = () => group.getAttribute('style') ?? '';

    expect(ink()).toContain('--aora-activity-ink');
    const first = ink();
    advance(2000);
    expect(ink()).not.toBe(first);
  });

  it('draws a member picture instead of a character, keyed so the swap animates', () => {
    const el = render(<GroupActivityMark members={[{ id: 'pic', pictureUrl: '/a.png' }]} tool="run" />);
    expect(el.querySelector('.aora-activity-group__picture')!.getAttribute('src')).toBe('/a.png');
    expect(el.querySelector('.aora-mark')).toBeNull();
  });

  it('renders nothing for an empty group rather than an empty box', () => {
    const el = render(<GroupActivityMark members={[]} />);
    expect(el.querySelector('.aora-activity-group')).toBeNull();
  });
});
