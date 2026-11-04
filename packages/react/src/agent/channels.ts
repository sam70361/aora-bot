import {
  normalize,
  openMessageChannel,
  type ArbiterUpdate,
  type MessageChannelOptions,
} from '@aora-bot/engine';
import { useEffect, useState } from 'react';
import { useLatest } from '../utils/hooks.js';
import { useOptionalAgentState } from './AgentState.js';

export interface UseStateChannelOptions extends Pick<MessageChannelOptions, 'allowOrigin'> {
  /** Receive updates. Defaults to the nearest `AgentStateProvider`. */
  onUpdate?: (update: ArbiterUpdate) => void;
  onError?: (error: string, raw: unknown) => void;
  /** Set false to close the channel without unmounting. */
  enabled?: boolean;
}

/**
 * Accept `postMessage` state updates for as long as the component is mounted.
 *
 * The transport for a character embedded in an iframe or a browser
 * extension panel: the host document posts `{ type: 'aora:state', payload }`
 * and the character reacts. Without an explicit `onUpdate` the updates go to
 * the nearest arbiter.
 */
export function useStateChannel(options: UseStateChannelOptions = {}): void {
  const agentState = useOptionalAgentState();
  const latest = useLatest(options);
  const fallback = agentState?.update;
  const enabled = options.enabled ?? true;
  const { allowOrigin } = options;

  useEffect(() => {
    if (!enabled) return;
    return openMessageChannel({
      allowOrigin,
      onUpdate: (u) => (latest.current.onUpdate ?? fallback)?.(u),
      onError: (e, raw) => latest.current.onError?.(e, raw),
    });
  }, [enabled, fallback, allowOrigin, latest]);
}

export type EventSourceStatus = 'idle' | 'connecting' | 'open' | 'error';

export interface UseEventSourceChannelOptions {
  onUpdate?: (update: ArbiterUpdate) => void;
  onError?: (error: string, raw: unknown) => void;
  /** Passed to the `EventSource` constructor. */
  withCredentials?: boolean;
  /** Set false to disconnect without unmounting. */
  enabled?: boolean;
}

/**
 * Subscribe to a server-sent event stream of state messages.
 *
 * Each event's `data` is one protocol message as JSON. `EventSource`
 * reconnects on its own, so the hook only tracks status. Without an explicit
 * `onUpdate` the updates go to the nearest arbiter.
 */
export function useEventSourceChannel(
  url: string | null | undefined,
  options: UseEventSourceChannelOptions = {},
): EventSourceStatus {
  const agentState = useOptionalAgentState();
  const [status, setStatus] = useState<EventSourceStatus>('idle');
  const latest = useLatest(options);
  const fallback = agentState?.update;
  const enabled = options.enabled ?? true;
  const { withCredentials } = options;

  useEffect(() => {
    if (!url || !enabled || typeof EventSource === 'undefined') return;
    // oxlint-disable-next-line react/set-state-in-effect -- opening the connection is the sync; "connecting" has to start from the client, or the server and first client render disagree
    setStatus('connecting');
    const source = new EventSource(url, { withCredentials });

    source.addEventListener('open', () => setStatus('open'));
    source.addEventListener('error', () => setStatus('error'));
    source.addEventListener('message', (event) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(event.data));
      } catch (e) {
        latest.current.onError?.(`invalid JSON: ${(e as Error).message}`, event.data);
        return;
      }
      const r = normalize(parsed);
      if (r.ok) (latest.current.onUpdate ?? fallback)?.(r.update);
      else latest.current.onError?.(r.error, parsed);
    });

    return () => {
      source.close();
      setStatus('idle');
    };
  }, [url, enabled, fallback, withCredentials, latest]);

  return status;
}
