import { DEFAULT_TOOL_STATE, TOOL_STATES } from '@aora-bot/engine';
import { describe, expect, it } from 'vitest';
import {
  activityForTool,
  activityLabelForState,
  characterStateForActivity,
  DEFAULT_ACTIVITY,
  isKnownActivity,
  TOOL_ACTIVITIES,
} from '../src/activity/catalog.js';
import { characterStateForAgent } from '../src/avatar/identity.js';
import { enUS } from '../src/locale/en-US.js';

/*
 * The catalogue's whole job is that the character and the words beside it can
 * never disagree: both come out of one lookup. So the properties worth
 * checking are that the lookup covers the engine's table, that its labels are
 * real locale keys rather than strings that happen to look like them, and
 * that an unrecognised tool still answers.
 */

describe('TOOL_ACTIVITIES', () => {
  it('covers every tool the engine maps, using the state the engine chose', () => {
    for (const [tool, state] of Object.entries(TOOL_STATES)) {
      expect(TOOL_ACTIVITIES[tool], tool).toBeDefined();
      expect(TOOL_ACTIVITIES[tool]!.state, tool).toBe(state);
    }
    expect(Object.keys(TOOL_ACTIVITIES)).toHaveLength(Object.keys(TOOL_STATES).length);
  });

  it('labels every entry with a key the locale table actually has', () => {
    for (const [tool, descriptor] of Object.entries(TOOL_ACTIVITIES)) {
      expect(enUS[descriptor.labelKey], `${tool} → ${descriptor.labelKey}`).toBeTruthy();
    }
    expect(enUS[DEFAULT_ACTIVITY.labelKey]).toBeTruthy();
  });
});

describe('activityForTool', () => {
  it('names the verb and the state together', () => {
    expect(activityForTool('web_search')).toEqual({ labelKey: 'activity.searching', state: 'searching' });
    expect(activityForTool('think')).toEqual({ labelKey: 'activity.thinking', state: 'thinking' });
  });

  it('answers for an unknown tool, no tool, and a prototype key', () => {
    expect(activityForTool('teleport')).toBe(DEFAULT_ACTIVITY);
    expect(activityForTool(null)).toBe(DEFAULT_ACTIVITY);
    expect(activityForTool(undefined)).toBe(DEFAULT_ACTIVITY);
    expect(activityForTool('')).toBe(DEFAULT_ACTIVITY);
    expect(activityForTool('constructor')).toBe(DEFAULT_ACTIVITY);
  });
});

describe('characterStateForActivity', () => {
  it('returns the state for a tool, and generic work for anything else', () => {
    expect(characterStateForActivity('read_file')).toBe('reading');
    expect(characterStateForActivity('teleport')).toBe(DEFAULT_TOOL_STATE);
    expect(characterStateForActivity(null)).toBe(DEFAULT_TOOL_STATE);
  });
});

describe('isKnownActivity', () => {
  it('separates a recognised verb from the fallback', () => {
    expect(isKnownActivity('read_file')).toBe(true);
    expect(isKnownActivity('teleport')).toBe(false);
    expect(isKnownActivity(null)).toBe(false);
    expect(isKnownActivity(undefined)).toBe(false);
    expect(isKnownActivity('')).toBe(false);
    // Off the wire, so `constructor` must not find `Object.prototype`.
    expect(isKnownActivity('constructor')).toBe(false);
    expect(isKnownActivity('toString')).toBe(false);
  });
});

describe('activityLabelForState', () => {
  it('names the states a tool can produce, and falls back for the rest', () => {
    expect(activityLabelForState('searching')).toBe('activity.searching');
    expect(activityLabelForState('celebrate')).toBe('activity.done');
    expect(activityLabelForState('sleeping')).toBe('activity.working');
  });
});

describe('characterStateForAgent', () => {
  it('prefers a recognised verb over the booleans, which only say "busy"', () => {
    expect(characterStateForAgent({ running: true, activity: 'web_search' })).toBe('searching');
    expect(characterStateForAgent({ activity: 'think' })).toBe('thinking');
  });

  it('keeps awaitingUser winning outright', () => {
    // Blocked on a person is not a kind of working, whatever else is running.
    expect(characterStateForAgent({ awaitingUser: true, activity: 'web_search' })).toBe('waiting');
    expect(characterStateForAgent({ awaitingUser: true, running: true, composing: true })).toBe('waiting');
  });

  it('ignores a verb it does not know rather than calling it work', () => {
    expect(characterStateForAgent({ activity: 'teleport' })).toBe('idle');
    expect(characterStateForAgent({ composing: true, activity: 'teleport' })).toBe('writing');
  });

  it('still answers from the booleans alone', () => {
    expect(characterStateForAgent({ composing: true })).toBe('writing');
    expect(characterStateForAgent({ running: true })).toBe('working');
    expect(characterStateForAgent({})).toBe('idle');
    expect(characterStateForAgent()).toBe('idle');
  });
});
