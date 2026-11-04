// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FX_KINDS } from '../src/core/types.js';
import { evaluateFx } from '../src/motion/fx.js';
import { STATE_FX } from '../src/motion/states.js';
import { STATE_BELT } from '../src/motion/belts.js';

const ANCHOR = { x: 90, y: 110, r: 8 };

describe('effects', () => {
  it('draw something at every moment, in plain finite numbers', () => {
    for (const kind of FX_KINDS) {
      for (const settled of [true, false]) {
        for (const t of [0, 0.3, 0.9, 1.7, 3.1, 7.4]) {
          const frame = evaluateFx(kind, t, { settled, ring: 128, anchor: ANCHOR });
          expect(frame.kind).toBe(kind);
          expect(frame.items.length, `${kind} @ ${t}`).toBeGreaterThan(0);
          for (const item of frame.items) {
            for (const value of Object.values(item)) {
              if (typeof value === 'number') expect(Number.isFinite(value), `${kind} @ ${t}`).toBe(true);
            }
            expect(item.opacity).toBeGreaterThanOrEqual(0);
            expect(item.opacity).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('are a pure function of time', () => {
    for (const kind of FX_KINDS) {
      const a = evaluateFx(kind, 2.35, { ring: 120, anchor: ANCHOR });
      const b = evaluateFx(kind, 2.35, { ring: 120, anchor: ANCHOR });
      expect(b).toEqual(a);
    }
  });

  it('settle on a frame that does not depend on the clock', () => {
    for (const kind of FX_KINDS) {
      const early = evaluateFx(kind, 0.1, { settled: true, ring: 120, anchor: ANCHOR });
      const late = evaluateFx(kind, 5.9, { settled: true, ring: 120, anchor: ANCHOR });
      expect(late, kind).toEqual(early);
    }
  });

  it('give every belt state something to show, except the two that move or dim the body', () => {
    const bare = Object.keys(STATE_BELT).filter((state) => !(state in STATE_FX));
    expect(bare.sort()).toEqual(['bouncing', 'powering-down']);
  });
});
