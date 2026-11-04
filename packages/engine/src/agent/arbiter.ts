import type { HudSpec } from '../hud/spec.js';
import type { CharacterState } from '../motion/states.js';
import { IDLE_STATE } from '../motion/states.js';
import {
  emotionIdForState,
  getEmotion,
  isOneshotEmotion,
  stateForEmotion,
  type EmotionId,
} from './protocol.js';

/**
 * Multi-session state arbitration.
 *
 * One character, several sources: a coding agent with three sub-agents, or a
 * chat window and a background job. Each reports its own state; the arbiter
 * decides what the character shows. Four rules:
 *
 * 1. **Priority.** Among visible sessions the highest-priority state wins.
 *    One session erroring while three work shows the error.
 * 2. **Minimum dwell.** A state holds the screen for `minDisplayMs` before it
 *    can be replaced. Without this a burst of tool events makes the face
 *    flicker; with it each expression lands and is read.
 * 3. **Events vs conditions.** A one-shot id ("done", "error") is an event
 *    and is never dropped: if it arrives during a dwell it is queued and
 *    played when the dwell ends. A continuous state is a condition: when its
 *    dwell ends the arbiter re-resolves, because the situation may have
 *    moved on.
 * 4. **Expiry.** A session silent for `sessionTtlMs` is forgotten, so a
 *    tool with no end-of-session hook cannot pin the character forever.
 *
 * Pure logic; the clock and timers are injectable so tests can run it
 * deterministically. `headless` sessions are tracked but never displayed,
 * which keeps background work from taking over the face.
 */
export interface ArbiterUpdate {
  sessionId: string;
  /** Either form of address. */
  state?: CharacterState;
  emotionId?: EmotionId;
  tips?: string;
  /** Dial to show while this session is the one on screen. */
  hud?: HudSpec;
  headless?: boolean;
}

export interface ArbiterResult {
  state: CharacterState;
  emotionId: EmotionId;
  tips?: string;
  hud?: HudSpec;
  sessionId?: string;
}

export interface ArbiterSession {
  state: CharacterState;
  emotionId: EmotionId;
  tips?: string;
  hud?: HudSpec;
  headless: boolean;
  lastSeen: number;
}

export interface ArbiterOptions {
  /** Called whenever the displayed state changes. */
  onApply?: (result: ArbiterResult) => void;
  /** Dwell before a state may be replaced. A number, or per-state overrides. Default 900 ms. */
  minDisplayMs?: number | { defaultMs?: number; byState?: Partial<Record<CharacterState, number>> };
  /** Priority overrides, by state. Higher wins. */
  priority?: Partial<Record<CharacterState, number>>;
  /** Override which states are events. Defaults to the protocol's one-shot ids. */
  oneshot?: readonly CharacterState[];
  /** Forget a session after this long without an update. Default 120 s. */
  sessionTtlMs?: number;
  /** Upper bound on tracked sessions; the stalest is evicted. Default 32. */
  maxSessions?: number;
  /** What to show when no session is visible. Default `idle`. */
  idleState?: CharacterState;
  /** Injectable clock and timers. */
  now?: () => number;
  schedule?: (fn: () => void, ms: number) => unknown;
  cancel?: (handle: unknown) => void;
}

export interface Arbiter {
  update(update: ArbiterUpdate): void;
  remove(sessionId: string): void;
  /** Expire stale sessions and re-resolve. Hosts may call this on a slow interval. */
  tick(): void;
  /** What the sessions say right now, ignoring dwell. */
  resolve(): ArbiterResult;
  /** What is actually being shown. */
  current(): ArbiterResult | null;
  sessions(): ReadonlyMap<string, ArbiterSession>;
  /** Observe the displayed state. Fires immediately with the current value if there is one. */
  subscribe(listener: (result: ArbiterResult) => void): () => void;
  dispose(): void;
}

/**
 * Default priorities. Errors and refusals beat everything because they need
 * a human; completion beats ongoing work because it is the result; ongoing
 * work beats idling. States not listed fall back by group.
 */
export const DEFAULT_PRIORITY: Partial<Record<CharacterState, number>> = {
  alerting: 80,
  refusing: 70,
  celebrate: 60,
  surprised: 55,
  receiving: 50,
  notifying: 48,
  // A drag is the user's own hand on the character; nothing a session
  // reports about its work should be allowed to interrupt it.
  dragging: 46,
  searching: 42,
  loading: 42,
  working: 40,
  writing: 40,
  reading: 40,
  sending: 40,
  uploading: 40,
  composing: 36,
  progress: 34,
  listening: 26,
  thinking: 30,
  waiting: 28,
  'powering-down': 22,
  waking: 15,
  spawning: 15,
  // Above idle, below anything with work behind it: humming is what a
  // character does when it has nothing better to do, and it should lose to
  // everything that has.
  humming: 12,
  idle: 10,
  drowsy: 4,
  sleeping: 0,
};

/** Group-level fallback for states without an explicit priority. */
function groupPriority(state: CharacterState): number {
  const id = emotionIdForState(state);
  const n = Number.parseInt(id, 10);
  if (n >= 50) return 45;
  if (n >= 30) return 30;
  if (n >= 10) return 20;
  return 10;
}

const DEFAULT_ONESHOT_STATES: readonly CharacterState[] = (() => {
  const out = new Set<CharacterState>();
  for (const s of [
    'celebrate',
    'alerting',
    'refusing',
    'receiving',
    'surprised',
    'waking',
    'spawning',
    'notifying',
  ] as const) {
    if (isOneshotEmotion(emotionIdForState(s))) out.add(s);
  }
  return [...out];
})();

export function createArbiter(options: ArbiterOptions = {}): Arbiter {
  const now = options.now ?? (() => Date.now());
  const schedule = options.schedule ?? ((fn: () => void, ms: number): unknown => setTimeout(fn, ms));
  const cancel = options.cancel ?? ((h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>));

  const priority: Partial<Record<CharacterState, number>> = { ...DEFAULT_PRIORITY, ...options.priority };
  const oneshot = new Set<CharacterState>(options.oneshot ?? DEFAULT_ONESHOT_STATES);

  let defaultDwell = 900;
  let dwellByState: Partial<Record<CharacterState, number>> = {};
  if (typeof options.minDisplayMs === 'number') defaultDwell = options.minDisplayMs;
  else if (options.minDisplayMs) {
    if (typeof options.minDisplayMs.defaultMs === 'number') defaultDwell = options.minDisplayMs.defaultMs;
    if (options.minDisplayMs.byState) dwellByState = options.minDisplayMs.byState;
  }

  const sessionTtlMs = options.sessionTtlMs ?? 120_000;
  const maxSessions = options.maxSessions ?? 32;
  const idleState = options.idleState ?? IDLE_STATE;

  const sessions = new Map<string, ArbiterSession>();
  const listeners = new Set<(r: ArbiterResult) => void>();
  if (options.onApply) listeners.add(options.onApply);

  let current: ArbiterResult | null = null;
  let changedAt = -Infinity;
  let pending: { result: ArbiterResult; timer: unknown } | null = null;

  const prio = (state: CharacterState): number => priority[state] ?? groupPriority(state);
  const dwell = (state: CharacterState): number => dwellByState[state] ?? defaultDwell;

  const idleResult = (): ArbiterResult => ({ state: idleState, emotionId: emotionIdForState(idleState) });

  function cleanStale(): boolean {
    const t = now();
    let removed = false;
    for (const [id, s] of sessions) {
      if (t - s.lastSeen > sessionTtlMs) {
        sessions.delete(id);
        removed = true;
      }
    }
    return removed;
  }

  function resolve(): ArbiterResult {
    let best: ArbiterResult | null = null;
    for (const [id, s] of sessions) {
      if (s.headless) continue;
      if (!best || prio(s.state) > prio(best.state)) {
        // The HUD travels with the winning session, not with the display:
        // a dial belonging to a session nobody is looking at would say
        // something about work the face is not showing.
        best = { state: s.state, emotionId: s.emotionId, tips: s.tips, hud: s.hud, sessionId: id };
      }
    }
    return best ?? idleResult();
  }

  function apply(result: ArbiterResult): void {
    current = result;
    changedAt = now();
    for (const l of listeners) l(result);
  }

  function clearPending(): void {
    if (pending) {
      cancel(pending.timer);
      pending = null;
    }
  }

  /** The single entry point for a proposed display state. */
  function propose(result: ArbiterResult): void {
    // Same state: refresh the caption and the dial without restarting the dwell.
    if (current && current.state === result.state) {
      if (current.tips !== result.tips || current.hud !== result.hud) {
        current = { ...current, tips: result.tips, hud: result.hud };
        for (const l of listeners) l(current);
      }
      return;
    }

    if (pending) {
      if (prio(result.state) < prio(pending.result.state)) return;
      clearPending();
    }

    const remaining = current ? dwell(current.state) - (now() - changedAt) : 0;
    if (remaining > 0) {
      const queued = result;
      pending = {
        result: queued,
        timer: schedule(() => {
          pending = null;
          if (oneshot.has(queued.state)) apply(queued);
          else apply(resolve());
        }, remaining),
      };
    } else {
      apply(result);
    }
  }

  function update(u: ArbiterUpdate): void {
    if (!u || !u.sessionId) return;
    let state: CharacterState;
    let emotionId: EmotionId;
    if (u.state) {
      state = u.state;
      emotionId = u.emotionId ?? emotionIdForState(state);
    } else if (u.emotionId != null) {
      const def = getEmotion(u.emotionId);
      emotionId = def?.id ?? u.emotionId;
      state = stateForEmotion(u.emotionId);
    } else {
      return;
    }

    cleanStale();
    if (!sessions.has(u.sessionId) && sessions.size >= maxSessions) {
      let oldest: string | null = null;
      let oldestAt = Infinity;
      for (const [id, s] of sessions) {
        if (s.lastSeen < oldestAt) {
          oldestAt = s.lastSeen;
          oldest = id;
        }
      }
      if (oldest != null) sessions.delete(oldest);
    }

    sessions.set(u.sessionId, {
      state,
      emotionId,
      tips: u.tips,
      hud: u.hud,
      headless: !!u.headless,
      lastSeen: now(),
    });

    // Events go straight to the proposal; conditions go through the table.
    if (!u.headless && oneshot.has(state)) {
      propose({ state, emotionId, tips: u.tips, hud: u.hud, sessionId: u.sessionId });
    } else {
      propose(resolve());
    }
  }

  function remove(sessionId: string): void {
    if (!sessions.delete(sessionId)) return;
    propose(resolve());
  }

  function tick(): void {
    if (cleanStale()) propose(resolve());
  }

  return {
    update,
    remove,
    tick,
    resolve,
    current: () => current,
    sessions: () => sessions,
    subscribe(listener) {
      listeners.add(listener);
      if (current) listener(current);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      clearPending();
      listeners.clear();
      sessions.clear();
    },
  };
}
