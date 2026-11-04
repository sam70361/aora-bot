// @vitest-environment happy-dom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentAvatar } from '../src/avatar/AgentAvatar.js';
import { AvatarStatusDot, UnreadBadge, WorkingBadge } from '../src/avatar/AvatarChrome.js';
import {
  AvatarStack,
  GroupAvatar,
  layoutAvatarStack,
  participantsFromMembers,
  stackMetrics,
  stackMetricsForPx,
  STACK_OVERLAP,
} from '../src/avatar/AvatarStack.js';
import { AVATAR_SIZES } from '../src/avatar/identity.js';

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

describe('layoutAvatarStack', () => {
  it('spaces discs by the visible part of one, and measures the cluster', () => {
    const { offsets, overlap, width } = layoutAvatarStack(3, 40, { overlap: 0.5 });
    expect(overlap).toBe(0.5);
    expect(offsets).toEqual([0, 20, 40]);
    // Two hidden halves plus one whole disc.
    expect(width).toBe(80);
  });

  it('reserves a slot for the overflow chip when asked', () => {
    expect(layoutAvatarStack(3, 40, { overlap: 0.5, withOverflow: true }).width).toBe(100);
  });

  it('defaults to the shared overlap, and measures nothing as nothing', () => {
    expect(layoutAvatarStack(2, 100).overlap).toBe(STACK_OVERLAP);
    expect(layoutAvatarStack(0, 40)).toMatchObject({ offsets: [], width: 0 });
    expect(layoutAvatarStack(-3, 40).offsets).toEqual([]);
  });

  it('gives each avatar size proportions that survive at that size', () => {
    expect(stackMetrics('xs')).toMatchObject({ sizePx: AVATAR_SIZES.xs, maxVisible: 2 });
    expect(stackMetrics('xl').sizePx).toBe(AVATAR_SIZES.xl);
    // Small clusters overlap harder, or three 16px discs become a smear.
    expect(stackMetrics('xs').overlap).toBeGreaterThan(stackMetrics('xl').overlap);
  });
});

describe('stackMetricsForPx', () => {
  it('finds the band for each named size exactly', () => {
    for (const size of ['xs', 'sm', 'md', 'lg', 'xl'] as const) {
      expect(stackMetricsForPx(AVATAR_SIZES[size]), size).toEqual(stackMetrics(size));
    }
  });

  it('rounds an in-between size to the nearest band, not the one below', () => {
    // 34px is nearly `lg` (36); rounding down would give it the tighter `md`
    // overlap and make it look denser than the size above it.
    expect(stackMetricsForPx(34)).toEqual(stackMetrics('lg'));
    expect(stackMetricsForPx(24)).toEqual(stackMetrics('sm'));
    expect(stackMetricsForPx(18)).toEqual(stackMetrics('xs'));
    // Off either end it clamps rather than extrapolating.
    expect(stackMetricsForPx(200)).toEqual(stackMetrics('xl'));
    expect(stackMetricsForPx(1)).toEqual(stackMetrics('xs'));
  });
});

describe('AvatarStack', () => {
  const members = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const discs = (el: HTMLElement) => [...el.querySelectorAll('.aora-stack__item')];
  const lefts = (el: HTMLElement) => discs(el).map((d) => (d as HTMLElement).style.left);

  it('applies the size band, so a small cluster shows fewer faces and overlaps harder', () => {
    const small = render(<AvatarStack members={members} sizePx={AVATAR_SIZES.xs} />);
    // Two at xs, not three: three 16px discs at the usual overlap are a smear.
    expect(discs(small)).toHaveLength(stackMetrics('xs').maxVisible);
    expect(small.querySelector('.aora-stack__overflow')!.textContent).toBe('+2');
    const smallStep = Number.parseFloat(lefts(small)[1]!);

    act(() => root!.unmount());
    root = null;
    host!.remove();

    const large = render(<AvatarStack members={members} sizePx={AVATAR_SIZES.xl} />);
    expect(discs(large)).toHaveLength(stackMetrics('xl').maxVisible);
    // The step is the visible part of one disc, so a harder overlap at xs
    // means a smaller step relative to its own size.
    expect(smallStep / AVATAR_SIZES.xs).toBeLessThan(Number.parseFloat(lefts(large)[1]!) / AVATAR_SIZES.xl);
  });

  it('lets explicit props win over the band', () => {
    const el = render(<AvatarStack members={members} sizePx={AVATAR_SIZES.xs} overlap={0} maxVisible={4} />);
    expect(discs(el)).toHaveLength(4);
    expect(lefts(el)).toEqual(['0px', '16px', '32px', '48px']);
    expect(el.querySelector('.aora-stack__overflow')).toBeNull();
  });

  it('overrides the face of every member, not only the first', () => {
    const el = render(<AvatarStack members={members} sizePx={40} face="line" nose="hook" maxVisible={4} />);
    const srcs = [...el.querySelectorAll('img')].map((i) => i.getAttribute('src')!);
    expect(srcs).toHaveLength(4);
    for (const src of srcs) expect(decodeURIComponent(src)).toContain('stroke-linecap');
  });
});

describe('GroupAvatar', () => {
  it('reads the members off a group record and draws the cluster', () => {
    const el = render(
      <GroupAvatar group={{ id: 'team', members: [{ id: 'a' }, { id: 'b' }] }} sizePx={28} />,
    );
    expect(el.querySelectorAll('.aora-stack__item')).toHaveLength(2);
  });

  it('draws nothing but the empty cluster for a group with no members', () => {
    const el = render(<GroupAvatar group={{ id: 'empty' }} />);
    expect(el.querySelector('.aora-stack')).not.toBeNull();
    expect(el.querySelectorAll('.aora-stack__item')).toHaveLength(0);
  });

  it('takes a style and a class of its own', () => {
    const el = render(
      <GroupAvatar
        group={{ id: 'team', members: [{ id: 'a' }] }}
        className="mine"
        style={{ opacity: 0.5 }}
      />,
    );
    const cluster = el.querySelector('.aora-stack') as HTMLElement;
    expect(cluster.classList.contains('mine')).toBe(true);
    expect(cluster.style.opacity).toBe('0.5');
  });
});

describe('participantsFromMembers', () => {
  const members = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];

  it('splits into the faces to draw and a count for the rest', () => {
    expect(participantsFromMembers(members, 2)).toMatchObject({ hidden: 3 });
    expect(participantsFromMembers(members, 2).visible.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('hides nothing when everyone fits, and nothing goes negative', () => {
    expect(participantsFromMembers([{ id: 'a' }], 3).hidden).toBe(0);
    expect(participantsFromMembers(members, 0)).toMatchObject({ visible: [], hidden: 5 });
    expect(participantsFromMembers(members, -1).hidden).toBe(5);
  });
});

describe('AvatarStatusDot', () => {
  const dot = (el: HTMLElement) => el.querySelector('.aora-status')!;

  it('carries every tone as data, so the colour comes from a token', () => {
    const tones = ['online', 'busy', 'away', 'offline', 'working', 'attention', 'error', 'info'] as const;
    for (const tone of tones) {
      const el = render(<AvatarStatusDot tone={tone} />);
      expect(dot(el).getAttribute('data-tone')).toBe(tone);
      act(() => root!.unmount());
      root = null;
      host!.remove();
    }
  });

  it('rings the tones that are asking to be noticed, and only those', () => {
    const el = render(<AvatarStatusDot tone="working" />);
    expect(dot(el).classList.contains('aora-status--ring')).toBe(true);

    rerender(<AvatarStatusDot tone="online" />);
    expect(dot(el).classList.contains('aora-status--ring')).toBe(false);

    // Explicit wins either way.
    rerender(<AvatarStatusDot tone="online" ring />);
    expect(dot(el).classList.contains('aora-status--ring')).toBe(true);
    rerender(<AvatarStatusDot tone="working" ring={false} />);
    expect(dot(el).classList.contains('aora-status--ring')).toBe(false);
  });

  it('is hidden from readers unless it carries a name, since colour alone says nothing', () => {
    const el = render(<AvatarStatusDot tone="busy" />);
    expect(dot(el).getAttribute('aria-hidden')).toBe('true');

    rerender(<AvatarStatusDot tone="busy" label="Busy" />);
    expect(dot(el).getAttribute('aria-hidden')).toBeNull();
    expect(dot(el).getAttribute('role')).toBe('img');
    expect(dot(el).getAttribute('aria-label')).toBe('Busy');
  });
});

describe('WorkingBadge', () => {
  it('announces itself once, as a named image rather than three anonymous dots', () => {
    const el = render(<WorkingBadge />);
    const badge = el.querySelector('.aora-working')!;
    expect(badge.getAttribute('role')).toBe('img');
    expect(badge.getAttribute('aria-label')).toBe('Working');
    expect(badge.querySelectorAll('.aora-working__dot')).toHaveLength(3);
  });

  it('takes a translated name and scales from one number', () => {
    const el = render(<WorkingBadge label="处理中" sizePx={12} />);
    const badge = el.querySelector('.aora-working') as HTMLElement;
    expect(badge.getAttribute('aria-label')).toBe('处理中');
    expect(badge.getAttribute('style')).toContain('12px');
  });

  it('staggers the dots so the badge reads as travel rather than as a blink', () => {
    const el = render(<WorkingBadge />);
    const delays = [...el.querySelectorAll('.aora-working__dot')].map(
      (d) => (d as HTMLElement).style.animationDelay,
    );
    expect(new Set(delays).size).toBe(3);
  });
});

describe('UnreadBadge', () => {
  it('caps the text but not the announcement', () => {
    const el = render(<UnreadBadge count={128} />);
    const badge = el.querySelector('.aora-badge')!;
    expect(badge.textContent).toBe('99+');
    expect(badge.getAttribute('aria-label')).toContain('128');
  });
});

describe('AgentAvatar', () => {
  const agent = { id: 'nova', name: 'Nova' };

  it('draws the mark smaller than the circle when asked, without moving the circle', () => {
    const el = render(<AgentAvatar agent={agent} sizePx={64} fillPx={40} still />);
    const wrapper = el.querySelector('.aora-avatar') as HTMLElement;
    expect(wrapper.style.width).toBe('64px');
    expect(wrapper.getAttribute('style')).toContain('--aora-avatar-fill: 40px');
    expect(el.querySelector('img')!.getAttribute('width')).toBe('40');
  });

  it('fills the circle by default', () => {
    const el = render(<AgentAvatar agent={agent} sizePx={44} still />);
    expect((el.querySelector('.aora-avatar') as HTMLElement).getAttribute('style')).toContain(
      '--aora-avatar-fill: 44px',
    );
  });

  it('holds the state through a shape morph, so the change is one thing and not two', () => {
    const el = render(<AgentAvatar agent={agent} state="idle" isMorphingShape />);
    const state = () => el.querySelector('.aora-mark')!.getAttribute('data-state');
    expect(state()).toBe('idle');

    rerender(<AgentAvatar agent={agent} state="happy" isMorphingShape />);
    expect(state()).toBe('idle');
    advance(1399);
    expect(state()).toBe('idle');
    advance(1);
    expect(state()).toBe('happy');
  });

  it('changes state immediately when nothing is morphing', () => {
    const el = render(<AgentAvatar agent={agent} state="idle" />);
    rerender(<AgentAvatar agent={agent} state="happy" />);
    expect(el.querySelector('.aora-mark')!.getAttribute('data-state')).toBe('happy');
  });

  it('keeps the face and nose passthrough', () => {
    const el = render(<AgentAvatar agent={{ ...agent, face: 'line', nose: 'hook' }} />);
    expect(el.querySelector('.aora-mark')!.getAttribute('data-face')).toBe('line');
  });
});
