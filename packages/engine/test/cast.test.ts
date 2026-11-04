import { describe, expect, it } from 'vitest';
import { CAST, CAST_IDS, castMember, isCastId } from '../src/core/cast.js';
import { COLOR_IDS, SHAPE_IDS } from '../src/core/types.js';

/*
 * The cast is the one table a product stores an id from, so the invariants
 * that matter are the ones a stored id depends on: the roster and the lookup
 * cannot disagree, every member has to be reproducible from primitives the
 * engine still defines, and an id that has gone stale has to fail softly
 * rather than take the page down.
 */

describe('CAST', () => {
  it('has one member per body, matching the id list exactly and in order', () => {
    expect(CAST).toHaveLength(SHAPE_IDS.length);
    expect(CAST_IDS).toHaveLength(SHAPE_IDS.length);
    expect(CAST.map((m) => m.id)).toEqual([...CAST_IDS]);
    expect(CAST.map((m) => m.shape)).toEqual([...SHAPE_IDS]);
  });

  it('gives every member a unique id', () => {
    expect(new Set(CAST_IDS).size).toBe(CAST_IDS.length);
  });

  it('is built only out of shapes and colours the engine still has', () => {
    // A renamed shape would otherwise leave a member rendering as a blob and
    // nothing would say so.
    for (const member of CAST) {
      expect(SHAPE_IDS, member.id).toContain(member.shape);
      expect(COLOR_IDS, member.id).toContain(member.color);
    }
  });

  it('names and describes every member in both languages', () => {
    for (const member of CAST) {
      expect(member.name.en, member.id).toBeTruthy();
      expect(member.name.zh, member.id).toBeTruthy();
      expect(member.desc.en, member.id).toBeTruthy();
      expect(member.desc.zh, member.id).toBeTruthy();
      expect(member.accent, member.id).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('keeps the default face throughout, as its own documentation claims', () => {
    for (const member of CAST) {
      expect(member.face, member.id).toBeUndefined();
      expect(member.nose, member.id).toBeUndefined();
    }
  });
});

describe('castMember', () => {
  it('finds every member by its id', () => {
    for (const id of CAST_IDS) expect(castMember(id)?.id, id).toBe(id);
  });

  it('answers null for an id that has gone stale, or for none at all', () => {
    expect(castMember('nobody')).toBeNull();
    expect(castMember(null)).toBeNull();
    expect(castMember(undefined)).toBeNull();
    expect(castMember('')).toBeNull();
  });

  it('is not fooled by inherited properties', () => {
    // Ids come out of storage and off the wire; a prototype key must not
    // resolve to a function where a preset was expected.
    expect(castMember('constructor')).toBeNull();
    expect(castMember('toString')).toBeNull();
  });
});

describe('isCastId', () => {
  it('accepts the roster and rejects everything else', () => {
    for (const id of CAST_IDS) expect(isCastId(id), id).toBe(true);
    expect(isCastId('nobody')).toBe(false);
    expect(isCastId('constructor')).toBe(false);
  });
});
