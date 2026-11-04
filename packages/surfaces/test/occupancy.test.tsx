// @vitest-environment happy-dom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider, MarkStageProvider } from '@aora-bot/react';
import { OccupancyList, type OccupancyRow } from '../src/occupancy/OccupancyList.js';
import { OccupancyMark } from '../src/occupancy/OccupancyMark.js';

/*
 * One shape for the whole list.
 *
 * The stage keys on appearance, not on identity, so six agents with six
 * derived shapes are six animations however they are drawn. Pinning the shape
 * is what makes the sharing measurable — and it is also the realistic case
 * for these rows, where the same handful of agents keep reappearing.
 */
const agents = ['ada', 'bo', 'cy', 'dee', 'eli', 'fay'].map((id) => ({
  id,
  name: id.toUpperCase(),
  shape: 'blob' as const,
}));

const ROWS: OccupancyRow[] = [
  { id: 'db', label: 'primary.db', agents: agents.slice(0, 6) },
  { id: 'queue', label: 'jobs.queue', agents: agents.slice(0, 2), state: 'reading' },
  { id: 'cache', label: 'edge.cache', agents: [] },
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

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  host?.remove();
  host = null;
  vi.useRealTimers();
});

describe('OccupancyList', () => {
  it('shows a row per resource, with an overflow count', () => {
    const el = render(<OccupancyList rows={ROWS} maxVisible={4} />);
    const rows = el.querySelectorAll('.aora-s-occupancy__row');
    expect(rows).toHaveLength(3);

    expect(rows[0]!.querySelectorAll('.aora-s-occupancy__mark')).toHaveLength(4);
    expect(rows[0]!.querySelector('.aora-s-occupancy__overflow')!.textContent).toBe('+2');
    expect(rows[1]!.querySelector('.aora-s-occupancy__overflow')).toBeNull();
  });

  it('says so when nothing is using a resource', () => {
    const el = render(<OccupancyList rows={ROWS} />);
    expect(el.querySelector('.aora-s-occupancy__idle')!.textContent).toBe('Not in use');
  });

  it('names the occupants for a screen reader', () => {
    const html = renderToString(<OccupancyList rows={[ROWS[1]!]} />);
    expect(html).toContain('In use by: ADA, BO');
  });

  it('makes the marks buttons only when there is something to select', () => {
    const plain = render(<OccupancyList rows={ROWS} />);
    expect(plain.querySelectorAll('button')).toHaveLength(0);

    const onSelect = vi.fn();
    act(() => root!.render(<OccupancyList rows={ROWS} onSelect={onSelect} />));
    const first = plain.querySelector('button')!;
    act(() => first.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    expect(onSelect).toHaveBeenCalledWith(agents[0], ROWS[0]);
  });

  it('shares one animation across the rows through the stage', () => {
    const el = render(
      <MarkStageProvider>
        <OccupancyList rows={ROWS} />
      </MarkStageProvider>,
    );
    act(() => {
      vi.advanceTimersByTime(32);
    });
    // Six visible marks in two states, so two hosted animations.
    expect(el.querySelectorAll('.aora-s-occupancy__mark')).toHaveLength(6);
    expect(el.querySelectorAll('.aora-stage > .aora-mark')).toHaveLength(2);
  });

  it('opts out of the stage when a line weight is asked for', () => {
    const el = render(
      <MarkStageProvider>
        <OccupancyList rows={[ROWS[1]!]} lineWeight={1.2} face="line" />
      </MarkStageProvider>,
    );
    act(() => {
      vi.advanceTimersByTime(32);
    });
    expect(el.querySelectorAll('.aora-stage > .aora-mark')).toHaveLength(0);
    expect(el.querySelectorAll('.aora-s-occupancy__mark svg')).toHaveLength(2);
  });
});

describe('occupancy surfaces', () => {
  it.each([
    ['OccupancyList', <OccupancyList rows={ROWS} />],
    ['OccupancyList selectable', <OccupancyList rows={ROWS} onSelect={() => {}} />],
    ['OccupancyMark', <OccupancyMark agent={agents[0]!} />],
    ['OccupancyMark with a picture', <OccupancyMark agent={{ id: 'p', pictureUrl: '/p.png' }} />],
    ['OccupancyMark line', <OccupancyMark agent={agents[1]!} face="line" lineWeight={1.15} />],
  ])('%s renders without a DOM', (_name, element) => {
    const html = renderToString(element);
    expect(html).toBeTruthy();
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
  });

  it('localises the idle row', () => {
    const html = renderToString(
      <LocaleProvider locale="zh-CN">
        <OccupancyList rows={[ROWS[2]!]} />
      </LocaleProvider>,
    );
    expect(html).toContain('暂无人使用');
  });
});
