import type { CuteEyeId } from '../face/topologies.js';
import { STATE_BLUSH, STATE_CUTE_EYES, STATE_GROUPS, type CharacterState } from './states.js';

/**
 * The mood a state carries, as a skin's accent reads it: settled (`calm`),
 * cheerful (`bright`), cross (`heated`), down (`low`), startled (`tense`) or
 * half asleep (`drowsy`).
 */
export const STATE_MOODS = ['calm', 'bright', 'heated', 'low', 'tense', 'drowsy'] as const;
export type StateMood = (typeof STATE_MOODS)[number];

/** The expressions that name a mood of their own; every other one is calm. */
const EYE_MOODS: Partial<Record<CuteEyeId, StateMood>> = {
  mad: 'heated',
  cross: 'heated',
  sad: 'low',
  dotWide: 'tense',
  dotSmall: 'tense',
};

const GROUP_OF = new Map<CharacterState, string>(
  STATE_GROUPS.flatMap((group) => group.states.map((state) => [state, group.id] as const)),
);

/**
 * A state's mood, read from how the engine already sorts it: a resting state
 * other than idle is drowsy, a busy one calm, a feeling that flushes the
 * cheeks bright, and otherwise the mood its leading expression names.
 */
export function moodOf(state: CharacterState): StateMood {
  const group = GROUP_OF.get(state);
  if (group === 'resting') return state === 'idle' ? 'calm' : 'drowsy';
  if (group === 'attending') return 'calm';
  if (group === 'feeling' && STATE_BLUSH[state] > 0) return 'bright';
  return EYE_MOODS[STATE_CUTE_EYES[state][0]!] ?? 'calm';
}

/**
 * How a skin's accent leans with each mood: a colour mixed into it, and how
 * much. The accent stays the ink's own colour underneath, so every palette
 * colour still works, and every lean keeps it light enough to read on either
 * page.
 */
export const MOOD_LEAN: Readonly<Record<StateMood, { tint: string; share: number } | null>> = {
  calm: null,
  bright: { tint: '#FFF0B0', share: 34 },
  heated: { tint: '#FF5446', share: 46 },
  low: { tint: '#8FA6D8', share: 42 },
  tense: { tint: '#FFC646', share: 40 },
  drowsy: { tint: '#6F7BB8', share: 48 },
};

/** How long an accent takes to lean into a new mood in a live scene, in milliseconds. */
export const MOOD_EASE_MS = 480;
