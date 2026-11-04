/**
 * The HUD data contract.
 *
 * A state says what the character *is doing*; a HUD says what it *knows*.
 * Those are different layers and they do not share kinds: composing, scanning
 * and breathing already live on the state table, so they are not dials. A
 * HUD is a figure the host already has — a fraction, a deadline, a token
 * count — drawn in the ring outside a clean body.
 *
 * The same message travels down the agent channel as a state does: the
 * sender says `{ kind: 'context', used, total }` and never has to know how
 * many ticks the dial has.
 */
export const HUD_KINDS = [
  'progress',
  'timer',
  'clock',
  'voice',
  'context',
  'balance',
  'gauge',
  'kpi',
  'notify',
  'sync',
] as const;

export type HudKind = (typeof HUD_KINDS)[number];

export type SyncState = 'idle' | 'syncing' | 'done' | 'error';
export type VoiceMode = 'listening' | 'speaking';

export type HudSpec =
  /** Determinate progress, 0..1. */
  | { kind: 'progress'; value: number }
  /** A countdown. Both fields in milliseconds. */
  | { kind: 'timer'; remainingMs: number; totalMs: number }
  /** A clock. `date` is epoch milliseconds; hosts that omit it get the frame clock. */
  | { kind: 'clock'; date?: number }
  /** An audio meter. `level` is 0..1. */
  | { kind: 'voice'; level: number; bands?: number; mode?: VoiceMode }
  /** Context window occupancy, in tokens or any other unit. */
  | { kind: 'context'; used: number; total: number }
  /** A credit or currency balance. `unit` is a label for the host, not geometry. */
  | { kind: 'balance'; value: number; low?: boolean; unit?: string }
  /** An arbitrary measurement against a ceiling. */
  | { kind: 'gauge'; value: number; max: number }
  /** A single figure, optionally with a change and a history to spark-line. */
  | { kind: 'kpi'; value: number; delta?: number; series?: readonly number[] }
  /** Unread count. */
  | { kind: 'notify'; count: number }
  /** Sync lifecycle. */
  | { kind: 'sync'; state: SyncState };

export const HUD_KIND_LABELS: Record<HudKind, { en: string; zh: string }> = {
  progress: { en: 'Progress', zh: '进度' },
  timer: { en: 'Timer', zh: '倒计时' },
  clock: { en: 'Clock', zh: '时钟' },
  voice: { en: 'Voice', zh: '语音' },
  context: { en: 'Context', zh: '上下文' },
  balance: { en: 'Balance', zh: '余额' },
  gauge: { en: 'Gauge', zh: '仪表' },
  kpi: { en: 'KPI', zh: '指标' },
  notify: { en: 'Notifications', zh: '通知' },
  sync: { en: 'Sync', zh: '同步' },
};

export const isHudKind = (value: unknown): value is HudKind =>
  typeof value === 'string' && (HUD_KINDS as readonly string[]).includes(value);

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const optionalNum = (v: unknown): boolean => v === undefined || num(v);
const optionalBool = (v: unknown): boolean => v === undefined || typeof v === 'boolean';

/**
 * Strict validation, used by the protocol parser.
 *
 * A spec that is half-right is worse than none: `{ kind: 'progress' }` with
 * no value would draw an empty ring and look like a stalled job rather than
 * like a malformed message.
 */
export function isHudSpec(value: unknown): value is HudSpec {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const spec = value as Record<string, unknown>;
  if (!isHudKind(spec.kind)) return false;

  switch (spec.kind) {
    case 'progress':
      return num(spec.value);
    case 'timer':
      return num(spec.remainingMs) && num(spec.totalMs);
    case 'clock':
      return optionalNum(spec.date);
    case 'voice':
      return (
        num(spec.level) &&
        optionalNum(spec.bands) &&
        (spec.mode === undefined || spec.mode === 'listening' || spec.mode === 'speaking')
      );
    case 'context':
      return num(spec.used) && num(spec.total);
    case 'balance':
      return (
        num(spec.value) &&
        optionalBool(spec.low) &&
        (spec.unit === undefined || typeof spec.unit === 'string')
      );
    case 'gauge':
      return num(spec.value) && num(spec.max);
    case 'kpi':
      return (
        num(spec.value) &&
        optionalNum(spec.delta) &&
        (spec.series === undefined || (Array.isArray(spec.series) && spec.series.every(num)))
      );
    case 'notify':
      return num(spec.count);
    case 'sync':
      return (
        spec.state === 'idle' || spec.state === 'syncing' || spec.state === 'done' || spec.state === 'error'
      );
  }
}
