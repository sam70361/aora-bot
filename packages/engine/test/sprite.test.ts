import { describe, expect, it } from 'vitest';
import {
  isSpriteManifest,
  resolveSpriteFrames,
  spriteCoverage,
  SPRITE_FALLBACK_HOPS,
  type SpriteManifest,
} from '../src/agent/sprite.js';
import { EMOTION_IDS, IDLE_EMOTION_ID, SEGMENT_FALLBACK } from '../src/agent/protocol.js';

/*
 * A manifest is fetched off the network and hand-written by whoever painted
 * the frames, so both halves of this module are defensive by design: the
 * resolver has to answer for an id the sheet never heard of, and the audit
 * has to name the authoring mistakes rather than crashing on them. The
 * fallback chain is the part with teeth — a cycle in it would hang a page.
 */

const manifest = (over: Partial<SpriteManifest> = {}): SpriteManifest => ({
  kind: 'sprite-mate',
  formatVersion: 1,
  id: 'pet',
  frameSize: [64, 64],
  frames: { '02': ['idle-1.png', 'idle-2.png'] },
  ...over,
});

describe('isSpriteManifest', () => {
  it('accepts a well-formed manifest', () => {
    expect(isSpriteManifest(manifest())).toBe(true);
  });

  it('rejects anything that is not one, without throwing', () => {
    expect(isSpriteManifest(null)).toBe(false);
    expect(isSpriteManifest('a string')).toBe(false);
    expect(isSpriteManifest({})).toBe(false);
    expect(isSpriteManifest({ ...manifest(), kind: 'something-else' })).toBe(false);
    expect(isSpriteManifest({ ...manifest(), formatVersion: 2 })).toBe(false);
    expect(isSpriteManifest({ ...manifest(), frameSize: [64] })).toBe(false);
    expect(isSpriteManifest({ ...manifest(), frames: undefined })).toBe(false);
  });
});

describe('resolveSpriteFrames', () => {
  it('takes the id itself when the sheet has it', () => {
    const clip = resolveSpriteFrames(manifest({ frames: { '02': ['i.png'], '32': ['work.png'] } }), '32');
    expect(clip).toMatchObject({ id: '32', files: ['work.png'], via: 'direct' });
  });

  it('normalises the id, so a number or a one-digit string still lands', () => {
    const sheet = manifest();
    expect(resolveSpriteFrames(sheet, 2)?.id).toBe('02');
    expect(resolveSpriteFrames(sheet, '2')?.id).toBe('02');
  });

  it('follows the manifest chain before the protocol steps in', () => {
    const sheet = manifest({
      frames: { '02': ['i.png'], '40': ['sad.png'] },
      fallback: { '42': '41', '41': '40' },
    });
    // Two hops, and the result says the sheet's own table answered it.
    expect(resolveSpriteFrames(sheet, '42')).toMatchObject({ id: '40', via: 'manifest' });
  });

  it('gives up on a chain longer than the hop limit rather than walking it', () => {
    const fallback: Record<string, string> = {};
    const hops = SPRITE_FALLBACK_HOPS + 2;
    for (let i = 0; i < hops; i++) fallback[`9${i}`] = `9${i + 1}`;
    const sheet = manifest({ frames: { '02': ['i.png'], [`9${hops}`]: ['far.png'] }, fallback });

    // The far end exists, but it is past the limit, so idle answers instead.
    expect(resolveSpriteFrames(sheet, '90')).toMatchObject({ id: IDLE_EMOTION_ID, via: 'idle' });
  });

  it('does not hang on a chain that cycles', () => {
    const sheet = manifest({ fallback: { '40': '41', '41': '40' } });
    expect(resolveSpriteFrames(sheet, '40')).toMatchObject({ id: IDLE_EMOTION_ID, via: 'idle' });
  });

  it('falls back to the segment representative when the sheet has one', () => {
    const agent = SEGMENT_FALLBACK.agent;
    const sheet = manifest({ frames: { '02': ['i.png'], [agent]: ['agent.png'] } });
    // `33` is in the agent segment, so it borrows that segment's frames
    // rather than dropping straight to idle.
    expect(resolveSpriteFrames(sheet, '33')).toMatchObject({ id: agent, via: 'segment' });
  });

  it('falls back to idle, and answers null only for a sheet with nothing usable', () => {
    expect(resolveSpriteFrames(manifest(), '77')).toMatchObject({ id: IDLE_EMOTION_ID, via: 'idle' });
    expect(resolveSpriteFrames(manifest({ frames: {} }), '02')).toBeNull();
    // An empty frame list is the same as a missing one.
    expect(resolveSpriteFrames(manifest({ frames: { '02': [] } }), '02')).toBeNull();
  });
});

describe('spriteCoverage', () => {
  it('counts a one-clip sheet as one direct and the rest borrowed', () => {
    const report = spriteCoverage(manifest(), EMOTION_IDS);
    expect(report.direct).toBe(1);
    expect(report.dead).toBe(0);
    expect(report.fallback).toBe(EMOTION_IDS.length - 1);
    expect(report.problems).toEqual([]);
    expect(report.ids[IDLE_EMOTION_ID]).toEqual({ kind: 'direct' });
  });

  it('names the ids that borrow, and from where', () => {
    const agent = SEGMENT_FALLBACK.agent;
    const report = spriteCoverage(manifest({ frames: { '02': ['i.png'], [agent]: ['a.png'] } }), EMOTION_IDS);
    expect(report.ids['33']).toEqual({ kind: 'fallback', via: agent });
  });

  it('reports a sheet with no idle, since every other id leans on it', () => {
    const report = spriteCoverage(manifest({ frames: { '40': ['sad.png'] } }), EMOTION_IDS);
    expect(report.problems.join(' ')).toContain('idle');
    expect(report.dead).toBeGreaterThan(0);
  });

  it('reports an empty frame list, a dangling target and a cycle', () => {
    const report = spriteCoverage(
      manifest({
        frames: { '02': ['i.png'], '40': [] },
        fallback: { '41': '99', '50': '51', '51': '50' },
      }),
      EMOTION_IDS,
    );
    const problems = report.problems.join('\n');
    expect(problems).toContain('"40" lists no frames');
    expect(problems).toContain('unknown id');
    expect(problems).toContain('cycles');
  });
});
