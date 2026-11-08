// @vitest-environment happy-dom
import { act, useEffect, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PortraitSlot } from '../src/cast/PortraitSlot.js';
import { CastFigure } from '../src/cast/CastFigure.js';
import { CastLineup } from '../src/cast/CastLineup.js';
import { useCastScene, type CastScene, type CastStep } from '../src/cast/useCastScene.js';

const STEPS: CastStep[] = [
  { id: 'enter', positions: { lead: { x: 0, y: -60 } }, durationMs: 800 },
  { id: 'meet', positions: { lead: { x: 0, y: 0 }, helper: { x: 70, y: 20 } }, durationMs: 800 },
  {
    id: 'part',
    positions: { lead: { x: -70, y: 0, scale: 0.6, state: 'happy' } },
    durationMs: 800,
  },
];

let root: Root | null = null;
let host: HTMLElement | null = null;

function render(ui: ReactNode): HTMLElement {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(ui));
  return host;
}

const advance = (ms: number) =>
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

describe('useCastScene', () => {
  let scene: CastScene;

  function Probe({ autoplay, loop }: { autoplay?: boolean; loop?: boolean }) {
    const value = useCastScene(STEPS, { autoplay, loop });
    // Handed out from an effect: driving the hook from the test is a side
    // effect, and React objects to one happening during render.
    useEffect(() => {
      scene = value;
    });
    return <span data-index={value.stepIndex} data-id={value.step?.id} data-playing={value.playing} />;
  }

  const at = (el: HTMLElement) => Number(el.querySelector('span')!.dataset.index);
  const playing = (el: HTMLElement) => el.querySelector('span')!.dataset.playing === 'true';

  it('steps forward and back, clamped to the script', () => {
    const el = render(<Probe />);
    expect(at(el)).toBe(0);
    expect(el.querySelector('span')!.dataset.id).toBe('enter');

    act(() => scene.prev());
    expect(at(el)).toBe(0);

    act(() => scene.next());
    act(() => scene.next());
    expect(at(el)).toBe(2);
    act(() => scene.next());
    expect(at(el)).toBe(2);

    act(() => scene.prev());
    expect(at(el)).toBe(1);

    act(() => scene.goTo(99));
    expect(at(el)).toBe(2);
  });

  /*
   * Each step's timer is scheduled from the effect that runs after the
   * previous one fired, so a single long `advance` only covers one beat: the
   * next timer does not exist until React has flushed. Stepping the clock
   * beat by beat is also closer to what a browser does.
   */
  it('advances on its own clock while playing', () => {
    const el = render(<Probe autoplay />);
    expect(playing(el)).toBe(true);
    advance(799);
    expect(at(el)).toBe(0);
    advance(2);
    expect(at(el)).toBe(1);
    advance(800);
    expect(at(el)).toBe(2);
  });

  it('stops at the end of a one-shot scene and wraps a looping one', () => {
    const el = render(<Probe autoplay />);
    advance(800);
    advance(800);
    expect(at(el)).toBe(2);
    advance(5000);
    expect(at(el)).toBe(2);
    expect(playing(el)).toBe(false);

    // Same component, so the scene keeps its place: a looping script sent
    // off again from the last step wraps round to the first.
    act(() => root!.render(<Probe autoplay loop />));
    act(() => scene.play());
    advance(800);
    expect(at(el)).toBe(0);
  });

  it('hands control over when someone steps by hand', () => {
    const el = render(<Probe autoplay />);
    act(() => scene.next());
    expect(playing(el)).toBe(false);
    advance(4000);
    expect(at(el)).toBe(1);

    act(() => scene.play());
    expect(playing(el)).toBe(true);
    act(() => scene.pause());
    advance(4000);
    expect(at(el)).toBe(1);
  });
});

describe('CastLineup', () => {
  const members = [
    { id: 'lead', shape: 'blob' as const, bobPx: 4 },
    { id: 'helper', shape: 'hex' as const },
  ];

  it('places the members of the current step and takes the rest off stage', () => {
    const el = render(<CastLineup members={members} steps={STEPS} stepIndex={1} />);
    const lead = el.querySelector<HTMLElement>('[data-member="lead"]')!;
    const helper = el.querySelector<HTMLElement>('[data-member="helper"]')!;

    expect(lead.style.transform).toContain('0px');
    expect(helper.style.transform).toContain('70px');
    expect(helper.dataset.off).toBeUndefined();

    act(() => root!.render(<CastLineup members={members} steps={STEPS} stepIndex={2} />));
    expect(el.querySelector<HTMLElement>('[data-member="helper"]')!.dataset.off).toBe('true');
  });

  it('adopts the state a step names', () => {
    const el = render(<CastLineup members={members} steps={STEPS} stepIndex={2} />);
    const lead = el.querySelector('[data-member="lead"] .aora-mark')!;
    expect(lead.getAttribute('data-state')).toBe('happy');
  });

  it('moves with a spring sampled into a linear() easing', () => {
    const el = render(<CastLineup members={members} steps={STEPS} />);
    const lead = el.querySelector<HTMLElement>('[data-member="lead"]')!;
    expect(lead.style.transitionTimingFunction).toMatch(/^linear\(/);
    expect(lead.style.transitionDuration).toBe('560ms');
  });

  it('reports an arrival once per move', () => {
    const onArrive = vi.fn();
    const el = render(<CastLineup members={members} steps={STEPS} onArrive={onArrive} />);
    const lead = el.querySelector('[data-member="lead"]')!;

    act(() => lead.dispatchEvent(new window.Event('transitionend', { bubbles: true })));
    // happy-dom carries no propertyName, so only the transform case counts.
    expect(onArrive).not.toHaveBeenCalled();

    act(() => {
      const event = new window.Event('transitionend', { bubbles: true });
      Object.defineProperty(event, 'propertyName', { value: 'transform' });
      lead.dispatchEvent(event);
    });
    expect(onArrive).toHaveBeenCalledWith('lead', 0);
  });

  it('bobs on a separate element from the one that glides', () => {
    const el = render(<CastLineup members={members} steps={STEPS} />);
    const bob = el.querySelector<HTMLElement>('[data-member="lead"] .aora-s-cast-lineup__bob')!;
    expect(bob.style.getPropertyValue('--aora-s-cast-bob-amp')).toBe('4px');
    expect(el.querySelector('[data-member="helper"] .aora-s-cast-lineup__bob')).toBeNull();
  });
});

describe('cast surfaces', () => {
  const members = [{ id: 'lead', preset: 'bao' as const }];

  it.each([
    ['CastLineup', <CastLineup members={members} steps={STEPS} />],
    [
      'CastLineup with scenery',
      <CastLineup members={members} steps={STEPS} stepIndex={2} face="line" nose="bow">
        <PortraitSlot arrived />
      </CastLineup>,
    ],
    [
      'CastFigure',
      <CastFigure
        member={{ id: 'solo', shape: 'hex' }}
        position={{ x: 4, y: 8, scale: 0.8 }}
        easing="linear(0, 1)"
        durationMs={400}
      />,
    ],
    [
      'CastFigure off stage',
      <CastFigure member={{ id: 'solo' }} position={null} easing="ease" durationMs={1} />,
    ],
    ['PortraitSlot', <PortraitSlot />],
  ])('%s renders without a DOM', (_name, element) => {
    const html = renderToString(element);
    expect(html).toBeTruthy();
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
  });
});
