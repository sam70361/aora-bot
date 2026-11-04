import type { HudSpec } from '@aora-bot/engine';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AgentStateProvider } from '../src/agent/AgentState.js';
import { AgentHud } from '../src/hud/AgentHud.js';
import { HudPlate } from '../src/hud/HudPlate.js';
import { useHudSpec } from '../src/hud/useHudSpec.js';
import { CharacterMark } from '../src/mark/CharacterMark.js';

describe('HudPlate', () => {
  it('announces itself as a polite status region', () => {
    const html = renderToString(
      <HudPlate title="Context" value={83} unit="%" lines={['12k of 15k tokens']}>
        <CharacterMark shape="hex" hud={{ kind: 'context', used: 12_000, total: 15_000 }} />
      </HudPlate>,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Context');
    expect(html).toContain('83');
    expect(html).toContain('%');
    expect(html).toContain('12k of 15k tokens');
  });

  it('carries the level and placement as attributes for the stylesheet', () => {
    const html = renderToString(<HudPlate level="alert" placement="right" value="0" />);
    expect(html).toContain('data-level="alert"');
    expect(html).toContain('data-placement="right"');
  });

  it('defaults to a bottom plate at the info level', () => {
    const html = renderToString(<HudPlate value="1" />);
    expect(html).toContain('data-level="info"');
    expect(html).toContain('data-placement="bottom"');
  });

  it('renders nothing but the slot when there is no text', () => {
    const html = renderToString(
      <HudPlate>
        <CharacterMark shape="blob" />
      </HudPlate>,
    );
    expect(html).not.toContain('aora-hud-plate__text');
  });
});

/** Probe: hooks have no DOM to assert on, so the result is rendered as JSON. */
function Spec({
  kind,
  values,
}: {
  kind: Parameters<typeof useHudSpec>[0];
  values?: Record<string, unknown>;
}) {
  const spec = useHudSpec(kind, values);
  return <span>{JSON.stringify(spec)}</span>;
}

const specOf = (element: React.ReactElement): HudSpec | null =>
  JSON.parse(
    renderToString(element)
      .replace(/<\/?span>/g, '')
      .replace(/&quot;/g, '"'),
  );

describe('useHudSpec', () => {
  it('builds a spec from live values', () => {
    expect(specOf(<Spec kind="progress" values={{ value: 0.5 }} />)).toEqual({
      kind: 'progress',
      value: 0.5,
    });
  });

  it('returns null rather than throwing on values that do not hold up', () => {
    // Missing field, wrong type, and a value the host has not fetched yet.
    expect(specOf(<Spec kind="progress" />)).toBeNull();
    expect(specOf(<Spec kind="timer" values={{ remainingMs: 1000 }} />)).toBeNull();
    expect(specOf(<Spec kind="context" values={{ used: '12', total: 15 }} />)).toBeNull();
    expect(specOf(<Spec kind="voice" values={{ level: 0.4, mode: 'shouting' }} />)).toBeNull();
  });

  it('accepts the variants that carry no data at all', () => {
    expect(specOf(<Spec kind="clock" />)).toEqual({ kind: 'clock' });
  });
});

describe('AgentHud', () => {
  it('renders outside a provider without a dial', () => {
    const html = renderToString(<AgentHud agent={{ id: 'nova', name: 'Nova' }} />);
    expect(html).toContain('Nova');
    expect(html).toContain('data-state="idle"');
  });

  it('renders inside a provider on the server', () => {
    const html = renderToString(
      <AgentStateProvider>
        <AgentHud agent={{ id: 'nova', name: 'Nova' }} placement="right" lineWeight={1.1} />
      </AgentStateProvider>,
    );
    expect(html).toContain('data-placement="right"');
    expect(html).not.toContain('undefined');
  });
});
