import { clamp01 } from '../math/easing.js';
import type { HudSpec } from './spec.js';

/** How urgent a reading is. Same four levels the plate understands. */
export type HudLevel = 'info' | 'ok' | 'warn' | 'alert';

/**
 * A HUD as a figure a product can print.
 *
 * The dial is a shape; this is the number. They have to stay in one function
 * so a host cannot show 83% beside a ring that is half full.
 */
export interface HudReading {
  value: string;
  unit?: string;
  level: HudLevel;
}

const compact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (abs >= 10_000) return `${trim(n / 1_000)}k`;
  if (abs >= 1000) return `${trim(n / 1_000)}k`;
  return Number.isInteger(n) ? String(n) : trim(n);
};

const trim = (n: number): string => {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const pad = (n: number): string => String(Math.floor(n)).padStart(2, '0');

const mmss = (ms: number): string => {
  const safe = Math.max(0, Math.round(ms / 1000));
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
};

const hhmm = (epoch: number): string => {
  const d = new Date(epoch);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Format a spec the way a status bar would print it. */
export function formatHud(spec: HudSpec, nowMs = 0): HudReading {
  switch (spec.kind) {
    case 'progress': {
      const pct = Math.round(clamp01(spec.value) * 100);
      return { value: String(pct), unit: '%', level: pct >= 100 ? 'ok' : 'info' };
    }
    case 'timer': {
      const left = spec.totalMs > 0 ? spec.remainingMs / spec.totalMs : 0;
      return { value: mmss(spec.remainingMs), level: left > 0 && left < 0.1 ? 'warn' : 'info' };
    }
    case 'clock':
      return { value: hhmm(spec.date ?? nowMs), level: 'info' };
    case 'voice':
      return {
        value: spec.mode === 'speaking' ? 'talk' : 'listen',
        unit: `${Math.round(clamp01(spec.level) * 100)}%`,
        level: 'info',
      };
    case 'context': {
      const used = spec.total > 0 ? spec.used / spec.total : 0;
      return {
        value: `${compact(spec.used)}/${compact(spec.total)}`,
        level: used > 0.9 ? 'alert' : used > 0.75 ? 'warn' : 'info',
      };
    }
    case 'balance':
      return {
        value: compact(spec.value),
        unit: spec.unit,
        level: spec.low ? 'warn' : 'info',
      };
    case 'gauge': {
      const used = spec.max > 0 ? spec.value / spec.max : 0;
      return {
        value: compact(spec.value),
        unit: `/${compact(spec.max)}`,
        level: used > 0.9 ? 'warn' : 'info',
      };
    }
    case 'kpi': {
      const delta = spec.delta;
      return {
        value: compact(spec.value),
        unit: delta == null || delta === 0 ? undefined : `${delta > 0 ? '+' : ''}${trim(delta)}`,
        level: delta != null && delta < 0 ? 'warn' : delta != null && delta > 0 ? 'ok' : 'info',
      };
    }
    case 'notify':
      return { value: String(Math.max(0, Math.round(spec.count))), level: spec.count > 0 ? 'warn' : 'info' };
    case 'sync':
      return {
        value:
          spec.state === 'done'
            ? 'ok'
            : spec.state === 'error'
              ? 'err'
              : spec.state === 'syncing'
                ? 'sync'
                : 'idle',
        level: spec.state === 'done' ? 'ok' : spec.state === 'error' ? 'alert' : 'info',
      };
  }
}
