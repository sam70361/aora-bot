import type { CuteMouthId, FaceTune, FxKind, MouthId } from '../core/types.js';
import type { CuteEyeId, EyeTopologyId } from '../face/topologies.js';

export const CHARACTER_STATES = [
  // Resting
  'idle',
  'sleeping',
  'drowsy',
  'bored',
  'waking',
  'powering-down',
  // Attending
  'listening',
  'thinking',
  'searching',
  'reading',
  'writing',
  'working',
  'loading',
  'progress',
  'radar',
  'orbit',
  'dictating',
  'uploading',
  'sending',
  'receiving',
  'messaging',
  'waiting',
  'spawning',
  'composing',
  'dragging',
  // Feeling
  'happy',
  'excited',
  'laughing',
  'playful',
  'proud',
  'celebrate',
  'bouncing',
  'shy',
  'sad',
  'angry',
  'confused',
  'suspicious',
  'surprised',
  'scared',
  'curious',
  'humming',
  // Signalling
  'alerting',
  'notifying',
  'refusing',
] as const;

export type CharacterState = (typeof CHARACTER_STATES)[number];

export const STATE_GROUP_IDS = ['resting', 'attending', 'feeling', 'signalling'] as const;

export type StateGroupId = (typeof STATE_GROUP_IDS)[number];

export interface StateGroup {
  id: StateGroupId;
  /**
   * Display name, in both languages the kit ships.
   *
   * The group names live here rather than in a component-layer locale table
   * because the groups themselves do: a group added to this file would
   * otherwise need a second edit somewhere else before it could be named.
   */
  label: string;
  labelZh: string;
  states: CharacterState[];
}

export const STATE_GROUPS: StateGroup[] = [
  {
    id: 'resting',
    label: 'Resting',
    labelZh: '静息',
    states: ['idle', 'sleeping', 'drowsy', 'bored', 'waking', 'powering-down'],
  },
  {
    id: 'attending',
    label: 'Attending',
    labelZh: '处理中',
    states: [
      'listening',
      'thinking',
      'searching',
      'reading',
      'writing',
      'working',
      'loading',
      'progress',
      'radar',
      'orbit',
      'dictating',
      'uploading',
      'sending',
      'receiving',
      'messaging',
      'waiting',
      'spawning',
      'composing',
      'dragging',
    ],
  },
  {
    id: 'feeling',
    label: 'Feeling',
    labelZh: '情绪',
    states: [
      'happy',
      'excited',
      'laughing',
      'playful',
      'proud',
      'celebrate',
      'bouncing',
      'shy',
      'sad',
      'angry',
      'confused',
      'suspicious',
      'surprised',
      'scared',
      'curious',
      'humming',
    ],
  },
  {
    id: 'signalling',
    label: 'Signalling',
    labelZh: '提示',
    states: ['alerting', 'notifying', 'refusing'],
  },
];

/**
 * Expression sequence per state. The first entry is adopted on entry; the rest
 * are cycled at the interval in STATE_EYE_SWITCH_MS. Single-entry states hold
 * one expression for as long as they are active.
 */
export const STATE_EYE_TOPOLOGIES: Record<CharacterState, EyeTopologyId[]> = {
  idle: ['neutral', 'neutralSoft', 'neutral', 'lookLeft', 'neutral', 'lookRight'],
  sleeping: ['closed'],
  drowsy: ['sleepy', 'half', 'sleepy'],
  bored: ['half', 'lookLeft', 'half', 'lookRight'],
  waking: ['closed', 'half', 'neutral'],
  'powering-down': ['neutral', 'half', 'closed'],

  listening: ['lookLeft', 'neutral', 'lookLeft'],
  thinking: ['squint', 'lookUp', 'squint'],
  searching: ['lookLeft', 'lookRight', 'lookUp', 'neutral'],
  reading: ['lookLeft', 'lookRight'],
  writing: ['shy', 'neutral'],
  working: ['angry', 'squint', 'angry'],
  loading: ['neutral', 'neutralSoft'],
  progress: ['neutral'],
  radar: ['neutral', 'lookLeft', 'lookRight'],
  orbit: ['neutral', 'neutralSoft'],
  dictating: ['lookLeft', 'neutral'],
  uploading: ['lookUp', 'neutral'],
  sending: ['neutral', 'happy'],
  receiving: ['wide', 'neutral'],
  messaging: ['neutral', 'happy'],
  waiting: ['neutral', 'lookLeft', 'neutral', 'lookRight'],
  spawning: ['wide', 'neutral'],
  composing: ['squint', 'neutral'],
  // Eyes lead the move: they look the way the body is about to travel.
  dragging: ['lookRight', 'neutral', 'lookRight'],

  happy: ['happy', 'neutral', 'happy'],
  excited: ['excited', 'joyful'],
  laughing: ['joyful', 'happy'],
  playful: ['happy', 'wink', 'joyful', 'neutral'],
  proud: ['lookUp', 'happy'],
  celebrate: ['joyful', 'excited', 'wink', 'happy'],
  bouncing: ['happy', 'excited'],
  shy: ['shy', 'half'],
  sad: ['sleepy', 'half'],
  angry: ['angry'],
  confused: ['suspicious', 'lookUp', 'squint'],
  suspicious: ['suspicious', 'squint'],
  surprised: ['wide'],
  scared: ['wide', 'dizzy'],
  curious: ['wide', 'lookLeft', 'wide', 'lookRight'],
  humming: ['half', 'sleepy', 'half', 'neutralSoft'],

  alerting: ['wide', 'neutral'],
  notifying: ['wide', 'happy', 'neutral'],
  refusing: ['suspicious', 'half'],
};

/**
 * The cute face's expression sequence per state: the same cycle as
 * `STATE_EYE_TOPOLOGIES`, in the dot-eye vocabulary.
 */
export const STATE_CUTE_EYES: Record<CharacterState, CuteEyeId[]> = {
  idle: ['dot', 'dot', 'dot', 'dotLeft', 'dot', 'dotRight'],
  sleeping: ['curve'],
  drowsy: ['curveSleepy', 'dotHalf', 'curveSleepy'],
  bored: ['dotHalf', 'dotLeft', 'dotHalf', 'dotRight'],
  waking: ['curve', 'dotHalf', 'dot'],
  'powering-down': ['dot', 'dotHalf', 'curve'],

  listening: ['dotLeft', 'dot', 'dotLeft'],
  thinking: ['dotLook', 'dotUp', 'dotLook'],
  searching: ['dotLeft', 'dotRight', 'dotUp', 'dot'],
  reading: ['dotLeft', 'dotRight'],
  writing: ['dotDown', 'dot'],
  working: ['dotDown', 'dot', 'dotDown'],
  loading: ['dot', 'dotLook'],
  progress: ['dot'],
  radar: ['dot', 'dotLeft', 'dotRight'],
  orbit: ['dot', 'dotLook'],
  dictating: ['dotLeft', 'dot'],
  uploading: ['dotUp', 'dot'],
  sending: ['dot', 'arch'],
  receiving: ['dotWide', 'dot'],
  messaging: ['dot', 'arch'],
  waiting: ['dot', 'dotLeft', 'dot', 'dotRight'],
  spawning: ['dotWide', 'dot'],
  composing: ['dotDown', 'dot'],
  dragging: ['dotRight', 'dot', 'dotRight'],

  happy: ['arch', 'archWide', 'arch'],
  excited: ['dotWide', 'archWide'],
  laughing: ['archWide', 'arch'],
  playful: ['arch', 'wink', 'archWide', 'dot'],
  proud: ['dotUp', 'arch'],
  celebrate: ['star', 'archWide', 'wink', 'arch'],
  bouncing: ['arch', 'dotWide'],
  shy: ['dotDown', 'dotHalf'],
  sad: ['sad'],
  angry: ['mad'],
  confused: ['dotSuspicious', 'dotLook', 'dotHalf'],
  suspicious: ['dotSuspicious', 'dotHalf'],
  surprised: ['dotWide'],
  scared: ['dotWide', 'dotSmall'],
  curious: ['dotWide', 'dotLeft', 'dotWide', 'dotRight'],
  humming: ['curve', 'dotHalf', 'curve', 'dot'],

  alerting: ['dotWide', 'dot'],
  notifying: ['dotWide', 'arch', 'dot'],
  refusing: ['cross', 'dotHalf'],
};

/**
 * The cute face's mouth per state. Most states have none: a mouth is there
 * when it says something the eyes do not.
 */
export const STATE_CUTE_MOUTH: Record<CharacterState, CuteMouthId> = {
  idle: 'none',
  sleeping: 'none',
  drowsy: 'none',
  bored: 'flat',
  waking: 'dot',
  'powering-down': 'none',

  listening: 'none',
  thinking: 'flat',
  searching: 'dot',
  reading: 'none',
  writing: 'none',
  working: 'none',
  loading: 'none',
  progress: 'none',
  radar: 'none',
  orbit: 'none',
  dictating: 'o',
  uploading: 'none',
  sending: 'smile',
  receiving: 'dot',
  messaging: 'cat',
  waiting: 'none',
  spawning: 'dot',
  composing: 'cat',
  dragging: 'o',

  happy: 'cat',
  excited: 'grin',
  laughing: 'laugh',
  playful: 'smirk',
  proud: 'smile',
  celebrate: 'grin',
  bouncing: 'smile',
  shy: 'cat',
  sad: 'frown',
  angry: 'frown',
  confused: 'wavy',
  suspicious: 'flat',
  surprised: 'o',
  scared: 'wavy',
  curious: 'dot',
  humming: 'smile',

  alerting: 'o',
  notifying: 'dot',
  refusing: 'wavy',
};

/**
 * How strongly the cheeks are flushed in each state, 0..1. Only happy, success
 * and sleepy flush: warmth and joy, shyness, and a lighter flush in deep
 * sleep. A busy state is never flushed — a blush on every other face stops
 * meaning anything.
 */
export const STATE_BLUSH: Record<CharacterState, number> = {
  idle: 0,
  sleeping: 0.6,
  drowsy: 0,
  bored: 0,
  waking: 0,
  'powering-down': 0,

  listening: 0,
  thinking: 0,
  searching: 0,
  reading: 0,
  writing: 0,
  working: 0,
  loading: 0,
  progress: 0,
  radar: 0,
  orbit: 0,
  dictating: 0,
  uploading: 0,
  sending: 0,
  receiving: 0,
  messaging: 0,
  waiting: 0,
  spawning: 0,
  composing: 0,
  dragging: 0,

  happy: 1,
  excited: 1,
  laughing: 1,
  playful: 0.6,
  proud: 0.6,
  celebrate: 1,
  bouncing: 0,
  shy: 1,
  sad: 0,
  angry: 0,
  confused: 0,
  suspicious: 0,
  surprised: 0,
  scared: 0,
  curious: 0,
  humming: 0.6,

  alerting: 0,
  notifying: 0,
  refusing: 0,
};

/**
 * The effect a state throws off: a mood's mark, or for the sixteen belt
 * states what the character is busy with. The belts' own overlay is the other
 * reading of the same states, used by the faces that have no effect of their
 * own (motion/belts.ts).
 *
 * powering-down and bouncing have none: one dims the body, the other
 * hops it, and neither needs anything beside it.
 */
export const STATE_FX: Partial<Record<CharacterState, FxKind>> = {
  sleeping: 'zz',
  drowsy: 'zz',
  working: 'arc',
  proud: 'sparkle',
  celebrate: 'sparkle',
  refusing: 'bang',
  surprised: 'strokes',
  scared: 'strokes',
  happy: 'heart',
  sad: 'tear',

  thinking: 'dots',
  waiting: 'ellipsis',
  orbit: 'orbit',
  messaging: 'bubbles',
  loading: 'spinner',
  progress: 'progress',
  radar: 'ripple',
  dictating: 'waves',
  uploading: 'rise',
  receiving: 'fall',
  sending: 'send',
  spawning: 'gather',
  writing: 'pencil',
  alerting: 'bang',
};

/** Random interval range, in milliseconds, before switching to the next expression. */
export const STATE_EYE_SWITCH_MS: Record<CharacterState, [number, number] | null> = {
  idle: [9000, 16000],
  sleeping: null,
  drowsy: [2600, 4200],
  bored: [2400, 4000],
  waking: [420, 700],
  'powering-down': [600, 900],

  listening: [2200, 3800],
  thinking: [1600, 2800],
  searching: [550, 1150],
  reading: [900, 1500],
  writing: [1800, 3000],
  working: [2600, 4200],
  loading: [2400, 3600],
  progress: null,
  radar: [1800, 3000],
  orbit: [2600, 4200],
  dictating: [1400, 2400],
  uploading: [1600, 2600],
  sending: [900, 1500],
  receiving: [900, 1500],
  messaging: [1800, 3000],
  waiting: [2000, 3400],
  spawning: [700, 1100],
  composing: [1600, 2600],
  // Once per leg of the drag cycle, so the glance lands with the move.
  dragging: [1500, 2100],

  happy: [2400, 4200],
  excited: [900, 1600],
  laughing: [700, 1200],
  playful: [800, 1600],
  proud: [2000, 3400],
  celebrate: [700, 1300],
  bouncing: [1200, 2000],
  shy: [2200, 3600],
  sad: [2600, 4200],
  angry: null,
  confused: [1100, 1900],
  suspicious: [1800, 3000],
  surprised: null,
  scared: [600, 1100],
  curious: [1800, 3200],
  humming: [2400, 4000],

  alerting: [700, 1200],
  notifying: [900, 1500],
  refusing: [2600, 4500],
};

/**
 * Blink interval range. `null` means the state does not blink — either the
 * eyes are already closed, or the character is showing a belt animation where
 * a blink would read as a glitch.
 */
export const STATE_BLINK_MS: Record<CharacterState, [number, number] | null> = Object.fromEntries(
  CHARACTER_STATES.map((s) => {
    if (s === 'sleeping' || s === 'drowsy' || s === 'powering-down' || s === 'sad') return [s, null];
    if (s === 'surprised' || s === 'scared' || s === 'alerting') return [s, [5200, 9000]];
    if (s === 'excited' || s === 'celebrate' || s === 'laughing') return [s, [2600, 4600]];
    return [s, [3400, 7200]];
  }),
) as Record<CharacterState, [number, number] | null>;

/** Per-state face adjustments layered over DEFAULT_FACE_TUNE. */
export const STATE_FACE_TUNE: Partial<Record<CharacterState, Partial<FaceTune>>> = {
  angry: { gap: 1.28, size: 0.78 },
  working: { size: 0.9, eyeWidth: 1.12, eyeHeight: 1.05 },
  surprised: { size: 0.94, gap: 1.22 },
  scared: { size: 0.96, gap: 1.26 },
  shy: { size: 0.8, gap: 1.1, height: 1.06 },
  sad: { size: 0.82, height: 1.05 },
  proud: { size: 0.88, height: 0.94 },
  excited: { size: 0.92 },
  celebrate: { size: 0.92 },
  sleeping: { size: 0.84, height: 1.04 },
  thinking: { gap: 1.22 },
  suspicious: { gap: 1.24, size: 0.82 },
  refusing: { gap: 1.24, size: 0.84 },
  curious: { size: 0.9 },
  humming: { size: 0.84, height: 1.02 },
};

export function faceTuneForState(state: CharacterState, base: FaceTune): FaceTune {
  const override = STATE_FACE_TUNE[state];
  return override ? { ...base, ...override } : base;
}

/** Gaze drift: amplitude in shape units and the interval between new targets. */
export const STATE_GAZE: Record<string, { x: number; y: number; every: [number, number] }> = {
  default: { x: 4, y: 2.4, every: [2400, 4600] },
  searching: { x: 15, y: 9, every: [550, 1150] },
  reading: { x: 12, y: 4, every: [700, 1200] },
  thinking: { x: 7, y: 6, every: [1400, 2400] },
  listening: { x: 5, y: 3, every: [1800, 3000] },
  shy: { x: 3, y: 7, every: [2000, 3400] },
  bored: { x: 10, y: 4, every: [1600, 2800] },
  confused: { x: 9, y: 7, every: [900, 1600] },
  scared: { x: 11, y: 6, every: [500, 1000] },
  curious: { x: 9, y: 5, every: [1200, 2200] },
  humming: { x: 5, y: 4, every: [2200, 3800] },
  // Wide and slow: the eyes are following where the body is going, not
  // scanning, so the target changes once per leg of the cycle.
  dragging: { x: 13, y: 5, every: [1500, 2100] },
};

export const gazeForState = (state: CharacterState) => STATE_GAZE[state] ?? STATE_GAZE.default!;

/**
 * One-off flourish played when a state is entered.
 *
 * A state describes how a character *is*; an entry effect marks the moment it
 * *became* that. Confetti on every frame of `celebrate` would be noise, but a
 * single burst as the state arrives is the punctuation the transition needs.
 * Applied once per transition, never on mount, and skipped under reduced
 * motion.
 */
export interface EntryEffect {
  /** Full revolutions to spin. */
  spin?: number;
  /** Confetti pieces to throw. */
  burst?: number;
  /** Hop on arrival. */
  bounce?: boolean;
}

export const STATE_ENTRY_EFFECTS: Partial<Record<CharacterState, EntryEffect>> = {
  celebrate: { spin: 1, burst: 16 },
  surprised: { bounce: true },
  waking: { bounce: true },
};

/**
 * States in which an unattended character may occasionally do something on
 * its own — a small hop, a single spin — when `antics` is enabled.
 */
export const ANTIC_STATES: readonly CharacterState[] = ['idle', 'happy', 'proud'];

/**
 * The mouth each state wears in line mode.
 *
 * Mirrors the eye tables: one named mouth per state, morphed to on entry.
 * The eyes carry most of the expression already, so the mouth only needs to
 * agree with them — a frown under `sad`, an "o" under `surprised` — rather
 * than say something on its own.
 */
export const STATE_MOUTH: Record<CharacterState, MouthId> = {
  idle: 'soft',
  sleeping: 'flat',
  drowsy: 'flat',
  bored: 'flat',
  waking: 'o',
  'powering-down': 'flat',

  listening: 'soft',
  thinking: 'flat',
  searching: 'dot',
  reading: 'flat',
  writing: 'soft',
  working: 'flat',
  loading: 'dot',
  progress: 'flat',
  radar: 'dot',
  orbit: 'soft',
  dictating: 'o',
  uploading: 'soft',
  sending: 'smile',
  receiving: 'o',
  messaging: 'soft',
  waiting: 'soft',
  spawning: 'o',
  composing: 'soft',
  dragging: 'o',

  happy: 'smile',
  excited: 'grin',
  laughing: 'open',
  playful: 'smirk',
  proud: 'grin',
  celebrate: 'grin',
  bouncing: 'smile',
  shy: 'pout',
  sad: 'frown',
  angry: 'wavy',
  confused: 'wavy',
  /*
   * `tight` rather than `smirk`: suspicion is a mouth held shut while the
   * eyes do the doubting, and the smirk it wore before read as amusement
   * next to the narrowed eye. `refusing` keeps its frown — that one is a
   * refusal, not merely a reservation.
   */
  suspicious: 'tight',
  surprised: 'open',
  scared: 'wavy',
  curious: 'o',
  humming: 'hum',

  alerting: 'o',
  notifying: 'dot',
  refusing: 'frown',
};

/**
 * States whose mouth pulses open and shut, as though speaking. The pulse is
 * layered on `open` and switched off under reduced motion.
 */
export const STATE_MOUTH_TALK: readonly CharacterState[] = [
  'composing',
  'dictating',
  'messaging',
  'sending',
  'laughing',
  'humming',
];

/**
 * States that are moments rather than conditions, and what they become when
 * the moment has passed.
 *
 * `spawning` is an arrival and `waking` is a transition; both look wrong held
 * indefinitely, and every host that used them had to write the same timeout
 * to move on. The renderer owns the clock instead, and tells the host through
 * `onSettle` so its own bookkeeping can follow.
 */
export const STATE_SETTLE_TO: Partial<Record<CharacterState, { to: CharacterState; afterMs: number }>> = {
  // Long enough for the gather belt to finish drawing itself in.
  spawning: { to: 'idle', afterMs: 2000 },
  // Just past the eyes' closed → half → open sequence.
  waking: { to: 'idle', afterMs: 1600 },
};

export const settleForState = (state: CharacterState): { to: CharacterState; afterMs: number } | null =>
  STATE_SETTLE_TO[state] ?? null;

export const mouthForState = (state: CharacterState): MouthId => STATE_MOUTH[state] ?? 'soft';

export const IDLE_STATE: CharacterState = 'idle';

export const isCharacterState = (value: string): value is CharacterState =>
  (CHARACTER_STATES as readonly string[]).includes(value);
