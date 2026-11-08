// @vitest-environment happy-dom
import { act, useEffect, type ReactNode, type RefObject } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CelebrationLayer, type ConfettiHandle } from '@aora-bot/react';
import { ShareCard } from '../src/template/ShareCard.js';
import { TemplateDialog } from '../src/template/TemplateDialog.js';
import { VisibilityControls } from '../src/template/VisibilityControls.js';
import { normalizeTemplateDraft, TEMPLATE_LIMITS } from '../src/template/normalizeTemplateDraft.js';
import { usePublishMark, type PublishMark } from '../src/template/usePublishMark.js';

describe('normalizeTemplateDraft', () => {
  it('collapses whitespace in the name and reports an empty one', () => {
    const { draft, errors, valid } = normalizeTemplateDraft({ name: '  Nightly\n  triage  ' });
    expect(draft.name).toBe('Nightly triage');
    expect(errors).not.toContain('name-required');
    expect(valid).toBe(true);

    const empty = normalizeTemplateDraft({ name: '   ' });
    expect(empty.errors).toContain('name-required');
    expect(empty.valid).toBe(false);
  });

  it('truncates and reports a name over the limit', () => {
    const { draft, errors } = normalizeTemplateDraft({ name: 'x'.repeat(TEMPLATE_LIMITS.name + 10) });
    expect(draft.name).toHaveLength(TEMPLATE_LIMITS.name);
    expect(errors).toContain('name-too-long');
  });

  it('truncates and reports instructions over the limit', () => {
    const long = 'y'.repeat(TEMPLATE_LIMITS.instructions + 1);
    const { draft, errors } = normalizeTemplateDraft({ name: 'ok', instructions: long });
    expect(draft.instructions).toHaveLength(TEMPLATE_LIMITS.instructions);
    expect(errors).toContain('instructions-too-long');
  });

  it('keeps leading indentation in instructions but drops trailing space', () => {
    const { draft } = normalizeTemplateDraft({ name: 'ok', instructions: '  - one\n  - two  \n\n' });
    expect(draft.instructions).toBe('  - one\n  - two');
  });

  it('falls back to private for anything that is not a known visibility', () => {
    expect(normalizeTemplateDraft({ name: 'a' }).draft.visibility).toBe('private');
    expect(normalizeTemplateDraft({ name: 'a', visibility: 'team' }).draft.visibility).toBe('team');
    expect(normalizeTemplateDraft({ name: 'a', visibility: 'world' as 'team' }).draft.visibility).toBe(
      'private',
    );
  });

  it('derives a stable appearance from the seed, and keeps an explicit one', () => {
    const a = normalizeTemplateDraft({ name: 'Anything' }, { seed: 'tpl_1' }).draft;
    const b = normalizeTemplateDraft({ name: 'Renamed' }, { seed: 'tpl_1' }).draft;
    const c = normalizeTemplateDraft({ name: 'Anything' }, { seed: 'tpl_2' }).draft;
    expect(a.shape).toBe(b.shape);
    expect(a.color).toBe(b.color);
    expect([a.shape, a.color]).not.toEqual([c.shape, c.color]);

    const explicit = normalizeTemplateDraft({ name: 'a', shape: 'ghost', color: 'red' }).draft;
    expect([explicit.shape, explicit.color]).toEqual(['ghost', 'red']);
  });

  it('normalises a missing picture to null rather than leaving it undefined', () => {
    expect(normalizeTemplateDraft({ name: 'a' }).draft.pictureUrl).toBeNull();
  });
});

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

describe('usePublishMark', () => {
  let api: PublishMark;

  function Probe({
    celebrateMs,
    onSettled,
    confetti,
  }: {
    celebrateMs?: number;
    onSettled?: () => void;
    confetti?: RefObject<ConfettiHandle | null>;
  }) {
    const publish = usePublishMark({ celebrateMs, onSettled, confetti });
    // Published from an effect rather than during render: the test drives the
    // hook from the outside, which is a side effect as far as React is concerned.
    useEffect(() => {
      api = publish;
    });
    return (
      <span data-phase={publish.state} data-state={publish.characterState}>
        <CelebrationLayer />
      </span>
    );
  }

  const phase = (el: HTMLElement) => el.querySelector('span')!.dataset.phase;
  const state = (el: HTMLElement) => el.querySelector('span')!.dataset.state;

  it('walks idle → publishing → celebrate → idle', () => {
    const onSettled = vi.fn();
    const el = render(<Probe celebrateMs={1200} onSettled={onSettled} />);
    expect(phase(el)).toBe('idle');
    expect(state(el)).toBe('idle');

    act(() => api.begin());
    expect(phase(el)).toBe('publishing');
    expect(state(el)).toBe('working');

    act(() => api.succeed());
    expect(phase(el)).toBe('celebrate');
    expect(state(el)).toBe('celebrate');
    expect(onSettled).not.toHaveBeenCalled();

    advance(1199);
    expect(phase(el)).toBe('celebrate');
    advance(2);
    expect(phase(el)).toBe('idle');
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('returns to rest on failure without celebrating', () => {
    const el = render(<Probe />);
    act(() => api.begin());
    act(() => api.fail());
    expect(phase(el)).toBe('idle');
    advance(5000);
    expect(phase(el)).toBe('idle');
  });

  it('throws confetti through the layer handle', () => {
    const burst = vi.fn();
    // A stand-in handle: what matters is that success reaches whatever layer
    // the host handed over, not how the real one draws.
    const confetti: RefObject<ConfettiHandle | null> = { current: { burst, clear: vi.fn() } };
    const el = render(<Probe confetti={confetti} />);
    act(() => api.succeed());
    expect(burst).toHaveBeenCalled();
    expect(el).toBeTruthy();
  });

  it('a second attempt restarts the celebration rather than stacking timers', () => {
    const el = render(<Probe celebrateMs={1000} />);
    act(() => api.succeed());
    advance(800);
    act(() => api.begin());
    advance(400);
    expect(phase(el)).toBe('publishing');
  });
});

describe('template surfaces', () => {
  it.each([
    ['TemplateDialog', <TemplateDialog />],
    ['TemplateDialog with a draft', <TemplateDialog value={{ name: 'Triage', visibility: 'team' }} />],
    [
      'TemplateDialog with a link',
      <TemplateDialog value={{ name: 'Triage' }} shareUrl="https://x.test/t/1" />,
    ],
    ['VisibilityControls', <VisibilityControls value="team" />],
    ['ShareCard', <ShareCard name="Triage" url="https://x.test/t/1" />],
  ])('%s renders without a DOM', (_name, element) => {
    const html = renderToString(element);
    expect(html).toBeTruthy();
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
  });

  it('reports errors only after an attempt to save', () => {
    const el = render(<TemplateDialog />);
    expect(el.querySelector('[role="alert"]')).toBeNull();

    const save = [...el.querySelectorAll('button')].find((b) => b.textContent === 'Save')!;
    act(() => save.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    expect(el.querySelector('[role="alert"]')?.textContent).toBe('A name is needed');
  });

  it('drives the mark from the save promise', async () => {
    let settle: (() => void) | null = null;
    const el = render(
      <TemplateDialog
        value={{ name: 'Triage' }}
        onSave={() =>
          new Promise<void>((resolve) => {
            settle = resolve;
          })
        }
      />,
    );

    const save = [...el.querySelectorAll('button')].find((b) => b.textContent === 'Save')!;
    act(() => save.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    expect(el.querySelector('.aora-s-template__mark .aora-mark')?.getAttribute('data-state')).toBe('working');

    await act(async () => {
      settle?.();
    });
    expect(el.querySelector('.aora-s-template__mark .aora-mark')?.getAttribute('data-state')).toBe(
      'celebrate',
    );
  });
});
