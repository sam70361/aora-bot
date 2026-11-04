import {
  characterStateForRoster,
  type CharacterState,
  type RosterFacts,
  type RosterSurface,
} from '@aora-bot/engine';
import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';

/**
 * Everything one agent's mark is currently being told, resolved.
 *
 * `state` is the answer; the rest is the evidence, so a host can tell an
 * explicit hold apart from something derived out of facts without keeping its
 * own copy of what it pushed in.
 */
export interface MarkCommandSnapshot {
  state: CharacterState;
  emphasis: boolean;
  /** Increments on every poke. Hosts react to the change, not to the value. */
  pokeSeq: number;
  facts: RosterFacts | null;
  /** The winning explicit hold, or `null` when the state came from facts. */
  held: CharacterState | null;
}

export interface HoldStateOptions {
  /** Highest wins; ties go to the most recent hold. Defaults to 0. */
  priority?: number;
  /** Drop the hold automatically after this long. */
  ttlMs?: number;
}

/**
 * The write side of the registry.
 *
 * Deliberately not a React state tree. A roster row, a chat header and a
 * hover card all talk about the same agent from different corners of the
 * application, and lifting that into shared React state would re-render every
 * subscriber whenever any agent changed.
 */
export interface MarkCommands {
  /** Publish what is known about an agent. Returns a release function. */
  holdFacts(agentId: string, facts: RosterFacts): () => void;
  releaseFacts(agentId: string): void;
  /** Pin a state, overriding whatever the facts would derive. Returns a release function. */
  holdState(agentId: string, state: CharacterState, opts?: HoldStateOptions): () => void;
  /** Drop every hold on an agent, whatever placed them. */
  releaseState(agentId: string): void;
  setEmphasis(agentId: string, on: boolean): void;
  poke(agentId: string): void;
  subscribe(agentId: string, listener: () => void): () => void;
  read(agentId: string, surface?: RosterSurface): MarkCommandSnapshot;
}

export interface MarkCommandRegistry extends MarkCommands {
  /** Cancel every pending TTL. Called when the provider unmounts. */
  dispose(): void;
}

/**
 * Shared by every agent that nothing has been said about.
 *
 * One frozen object rather than a fresh one per call: `useSyncExternalStore`
 * compares snapshots by identity and would otherwise loop forever on an agent
 * that has never been touched.
 */
const RESTING: MarkCommandSnapshot = Object.freeze({
  state: 'idle' as CharacterState,
  emphasis: false,
  pokeSeq: 0,
  facts: null,
  held: null,
});

interface Hold {
  state: CharacterState;
  priority: number;
  /** Placement order, so equal priorities resolve to the newest hold. */
  seq: number;
  timer: ReturnType<typeof setTimeout> | null;
}

interface Entry {
  facts: RosterFacts | null;
  holds: Hold[];
  emphasis: boolean;
  pokeSeq: number;
  listeners: Set<() => void>;
  /** Derived snapshots, one per surface, cleared whenever the entry changes. */
  snapshots: Map<RosterSurface, MarkCommandSnapshot>;
}

const sameFacts = (a: RosterFacts | null, b: RosterFacts | null): boolean =>
  a === b ||
  (a != null &&
    b != null &&
    a.running === b.running &&
    a.composing === b.composing &&
    (a.activity ?? null) === (b.activity ?? null));

/** The hold that wins: highest priority, and among equals the one placed last. */
function winningHold(holds: readonly Hold[]): Hold | null {
  let best: Hold | null = null;
  for (const hold of holds) {
    if (!best || hold.priority > best.priority || (hold.priority === best.priority && hold.seq > best.seq)) {
      best = hold;
    }
  }
  return best;
}

/**
 * The agent-keyed half of the stage.
 *
 * The appearance-keyed half decides how many engines run; this one decides
 * what each agent is *doing*, which is the thing applications actually have an
 * opinion about. They are separate on purpose: two agents in the same state
 * still share one engine, and one agent changing state does not disturb the
 * other's.
 */
export function createMarkCommandRegistry(): MarkCommandRegistry {
  const entries = new Map<string, Entry>();
  let holdSeq = 0;

  const ensure = (agentId: string): Entry => {
    let entry = entries.get(agentId);
    if (!entry) {
      entry = {
        facts: null,
        holds: [],
        emphasis: false,
        pokeSeq: 0,
        listeners: new Set(),
        snapshots: new Map(),
      };
      entries.set(agentId, entry);
    }
    return entry;
  };

  /** Invalidate the derived snapshots and tell subscribers. */
  const bump = (agentId: string, entry: Entry): void => {
    entry.snapshots.clear();
    for (const listener of entry.listeners) listener();
    prune(agentId, entry);
  };

  // An entry nobody watches and nothing has an opinion about is indistinguishable
  // from no entry at all, so a long-lived page does not accumulate one per agent
  // it has ever rendered.
  const prune = (agentId: string, entry: Entry): void => {
    if (
      entry.listeners.size === 0 &&
      entry.facts == null &&
      entry.holds.length === 0 &&
      !entry.emphasis &&
      entry.pokeSeq === 0
    ) {
      entries.delete(agentId);
    }
  };

  const dropHold = (agentId: string, hold: Hold): void => {
    const entry = entries.get(agentId);
    if (!entry) return;
    const index = entry.holds.indexOf(hold);
    if (index < 0) return;
    if (hold.timer != null) clearTimeout(hold.timer);
    hold.timer = null;
    entry.holds.splice(index, 1);
    bump(agentId, entry);
  };

  return {
    holdFacts(agentId, facts) {
      const entry = ensure(agentId);
      // Callers pass an object literal from a render, so identity says nothing;
      // compare by value or every re-render would notify every subscriber.
      if (!sameFacts(entry.facts, facts)) {
        entry.facts = facts;
        bump(agentId, entry);
      }

      let released = false;
      return () => {
        if (released) return;
        released = true;
        const current = entries.get(agentId);
        // Only clear what we set. A later row may have replaced it, and
        // clearing that would blank the roster on an unrelated unmount.
        if (!current || current.facts !== facts) return;
        current.facts = null;
        bump(agentId, current);
      };
    },

    releaseFacts(agentId) {
      const entry = entries.get(agentId);
      if (!entry || entry.facts == null) return;
      entry.facts = null;
      bump(agentId, entry);
    },

    holdState(agentId, state, opts) {
      const entry = ensure(agentId);
      const hold: Hold = { state, priority: opts?.priority ?? 0, seq: ++holdSeq, timer: null };
      entry.holds.push(hold);

      // A moment like `celebrate` is worth showing once and then forgetting.
      // Expiring it here rather than in the caller means a component that
      // unmounts mid-celebration does not leave the agent stuck.
      if (opts?.ttlMs != null && opts.ttlMs > 0) {
        hold.timer = setTimeout(() => dropHold(agentId, hold), opts.ttlMs);
      }

      bump(agentId, entry);
      return () => dropHold(agentId, hold);
    },

    releaseState(agentId) {
      const entry = entries.get(agentId);
      if (!entry || entry.holds.length === 0) return;
      for (const hold of entry.holds) if (hold.timer != null) clearTimeout(hold.timer);
      entry.holds = [];
      bump(agentId, entry);
    },

    setEmphasis(agentId, on) {
      const entry = on ? ensure(agentId) : entries.get(agentId);
      if (!entry || entry.emphasis === on) return;
      entry.emphasis = on;
      bump(agentId, entry);
    },

    poke(agentId) {
      const entry = ensure(agentId);
      entry.pokeSeq += 1;
      bump(agentId, entry);
    },

    subscribe(agentId, listener) {
      const entry = ensure(agentId);
      entry.listeners.add(listener);
      return () => {
        const current = entries.get(agentId);
        if (!current) return;
        current.listeners.delete(listener);
        prune(agentId, current);
      };
    },

    read(agentId, surface = 'list') {
      const entry = entries.get(agentId);
      if (!entry) return RESTING;

      const cached = entry.snapshots.get(surface);
      if (cached) return cached;

      const held = winningHold(entry.holds)?.state ?? null;
      const snapshot: MarkCommandSnapshot = {
        state: held ?? (entry.facts ? characterStateForRoster(entry.facts, surface) : 'idle'),
        emphasis: entry.emphasis,
        pokeSeq: entry.pokeSeq,
        facts: entry.facts,
        held,
      };
      entry.snapshots.set(surface, snapshot);
      return snapshot;
    },

    dispose() {
      for (const entry of entries.values()) {
        for (const hold of entry.holds) if (hold.timer != null) clearTimeout(hold.timer);
      }
      entries.clear();
    },
  };
}

export const MarkCommandContext = createContext<MarkCommands | null>(null);

/**
 * The registry used when there is no `MarkStageProvider` overhead.
 *
 * A single `ActivityMark` dropped into a page has nothing to share with, but
 * its own hover and poke must still work, so the hooks fall back to one
 * module-level registry rather than to a no-op. Agent ids are unique by
 * definition, so two unrelated trees that both talk about `nova` genuinely do
 * mean the same agent.
 */
let fallback: MarkCommandRegistry | null = null;
const fallbackCommands = (): MarkCommands => (fallback ??= createMarkCommandRegistry());

/** Command side of the stage. Works with or without a provider above it. */
export function useMarkCommands(): MarkCommands {
  return useContext(MarkCommandContext) ?? fallbackCommands();
}

/**
 * Subscribe to one agent.
 *
 * `surface` is a read-time concern, not a write-time one: the same facts mean
 * `composing` in a chat and `idle` in a roster of twenty avatars, so the
 * publisher should not have to know where its agent is being drawn.
 */
export function useMarkCommand(agentId: string, surface: RosterSurface = 'list'): MarkCommandSnapshot {
  const commands = useMarkCommands();
  const subscribe = useCallback(
    (onChange: () => void) => commands.subscribe(agentId, onChange),
    [commands, agentId],
  );
  const read = useCallback(() => commands.read(agentId, surface), [commands, agentId, surface]);
  return useSyncExternalStore(subscribe, read, read);
}
