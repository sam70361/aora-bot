// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import {
  CHARACTER_STATES,
  COLOR_IDS,
  CUTE_EYE_IDS,
  CUTE_MOUTH_IDS,
  DRAWN_FACE_STYLES,
  EYE_CLASSES,
  FACE_STYLES,
  FX_KINDS,
  SHAPE_IDS,
  STATE_FX,
  createCharacter,
  createSimulation,
  drawnFaceText,
  getFaceDesign,
  getShape,
  isCuteFamily,
  isDrawnFace,
  kaomoji,
  listStyles,
  renderStaticSvg,
  type DrawnFaceGeometry,
  type DrawnFaceStyle,
  type FrameSnapshot,
  type ShapeId,
} from '../src/index.js';
import { morphDrawnPair } from '../src/face/drawn/index.js';
import { polygonArea } from '../src/face/features.js';
import { drawnMouthPaint, type DrawnPalette } from '../src/render/vector/drawn.js';
import { CUTE_EYE_READINGS } from '../src/face/drawn/reading.js';

/*
 * The drawn faces: every design is a complete face — its own eyes for every
 * state, its own mouths, its own text — and reads in every series, variant
 * and colour the cute face does.
 */

const FACES = DRAWN_FACE_STYLES;

/** The least a drawn face may shrink to on `cactus`, a body narrow all the way up, against its designed size. */
const CACTUS_MIN_SCALE = 0.6;

afterEach(() => {
  document.body.replaceChildren();
});

/** One drawn face's layers in a still frame. */
function stillFrame(face: DrawnFaceStyle, state: (typeof CHARACTER_STATES)[number]): FrameSnapshot {
  const sim = createSimulation({ face, state, still: true, reducedMotion: true });
  sim.settle();
  const frame = sim.snapshot();
  sim.dispose();
  return frame;
}

const drawnOf = (frame: FrameSnapshot): DrawnFaceGeometry[] => frame.face.geometry?.drawn ?? [];

describe('the face list', () => {
  it('leads with capsule, then the three plain faces and the other drawn ones, under lowercase one-word ids', () => {
    expect(FACE_STYLES.slice(0, 4)).toEqual(['capsule', 'cute', 'eyes', 'line']);
    expect([FACE_STYLES[0], ...FACE_STYLES.slice(4)]).toEqual([...DRAWN_FACE_STYLES]);
    for (const face of FACES) expect(face).toMatch(/^[a-z]+$/);
  });

  it('counts the drawn faces as the cute family and nothing else as drawn', () => {
    for (const face of FACES) {
      expect(isDrawnFace(face)).toBe(true);
      expect(isCuteFamily(face)).toBe(true);
    }
    expect(isDrawnFace('cute')).toBe(false);
    expect(isCuteFamily('cute')).toBe(true);
    expect(isCuteFamily('line')).toBe(false);
  });
});

describe.each(FACES)('the %s design', (face) => {
  const design = getFaceDesign(face);

  it('is filed under its own id', () => {
    expect(design.id).toBe(face);
  });

  it('draws every cute expression, so a state table written in cute names always resolves', () => {
    for (const id of CUTE_EYE_IDS) expect(design.expressions).toHaveProperty(id);
  });

  it('has an expression for every name its state table uses, and a kind for each of its own', () => {
    for (const state of CHARACTER_STATES) {
      const names = design.states[state];
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) {
        expect(design.expressions).toHaveProperty(name);
        if (!(CUTE_EYE_IDS as readonly string[]).includes(name)) expect(design.classes).toHaveProperty(name);
      }
    }
  });

  it('gives every eye of every expression the same numbers, so any two morph field by field', () => {
    const keys = Object.keys(design.expressions.dot[0]).sort();
    for (const pair of Object.values(design.expressions)) {
      expect(Object.keys(pair[0]).sort()).toEqual(keys);
      expect(Object.keys(pair[1]).sort()).toEqual(keys);
      for (const v of [...Object.values(pair[0]), ...Object.values(pair[1])])
        expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('wears a known mouth in every state', () => {
    for (const state of CHARACTER_STATES) {
      expect(CUTE_MOUTH_IDS).toContain(design.stateMouth[state]);
      expect(design.mouths[design.stateMouth[state]]).toBeDefined();
    }
  });

  it('writes a glyph for every kind of eye and every mouth', () => {
    for (const kind of EYE_CLASSES) expect(design.kaomoji.eyes[kind]).toBeTruthy();
    for (const mouth of CUTE_MOUTH_IDS) expect(typeof design.kaomoji.mouths[mouth]).toBe('string');
  });

  it('quiets only effects that exist', () => {
    for (const kind of design.quietFx) expect(FX_KINDS).toContain(kind);
  });

  it('shows layers in every state, with every point a number', () => {
    for (const state of CHARACTER_STATES) {
      const drawn = drawnOf(stillFrame(face, state));
      expect(drawn).toHaveLength(1);
      const [d] = drawn;
      expect(d!.style).toBe(face);
      expect(d!.left.layers.length + d!.right.layers.length).toBeGreaterThan(0);
      for (const shape of [d!.left, d!.right, ...(d!.plate ? [d!.plate] : [])]) {
        for (const layer of shape.layers) {
          expect(layer.opacity).toBeGreaterThan(0);
          for (const ring of layer.rings)
            for (const [x, y] of ring) expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
        }
      }
    }
  });

  it('hides the plain eyes once the drawn ones have the face', () => {
    expect(stillFrame(face, 'idle').face.geometry?.eyeOpacity).toBe(0);
  });

  it('morphs: half-way between two expressions every number is between its two ends', () => {
    const a = design.expressions.dot;
    const b = design.expressions.mad;
    const mid = morphDrawnPair(a, b, 0.5);
    for (const side of [0, 1] as const) {
      for (const key of Object.keys(a[side])) {
        const lo = Math.min(a[side][key]!, b[side][key]!);
        const hi = Math.max(a[side][key]!, b[side][key]!);
        expect(mid[side][key]).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(mid[side][key]).toBeLessThanOrEqual(hi + 1e-9);
      }
    }
    for (const side of [0, 1] as const) {
      for (const key of Object.keys(a[side])) {
        expect(morphDrawnPair(a, b, 0)[side][key]).toBeCloseTo(a[side][key]!, 9);
        expect(morphDrawnPair(a, b, 1)[side][key]).toBeCloseTo(b[side][key]!, 9);
      }
    }
  });

  it('never pops a part between two expressions: across the morph, paint comes and goes a little at a time', () => {
    const ctx = {
      nose: 1,
      order: 0,
      time: 0,
      settled: true,
      blink: 1,
      look: [0, 0],
      weight: 1,
      mid: 2.6,
    } as const;
    // How much paint an eye lays down: each layer's area times its opacity, in square dot radii.
    const paint = (eye: (typeof design.expressions)['dot'][0]): number =>
      design
        .eye(eye, ctx)
        .reduce(
          (sum, layer) =>
            sum + layer.opacity * layer.rings.reduce((s, ring) => s + Math.abs(polygonArea(ring)), 0),
          0,
        );
    // Every move a state can make: into and out of the resting eye, and along each state's own cycle.
    const moves = new Set<string>();
    for (const cycle of Object.values(design.states)) {
      cycle.forEach((name, i) => {
        moves
          .add(`dot>${name}`)
          .add(`${name}>dot`)
          .add(`${name}>${cycle[(i + 1) % cycle.length]}`);
      });
    }
    const steps = 60;
    for (const move of moves) {
      const [from, to] = move.split('>') as [string, string];
      const a = design.expressions[from]!;
      const b = design.expressions[to]!;
      const frames = Array.from({ length: steps + 1 }, (_, i) => paint(morphDrawnPair(a, b, i / steps)[0]));
      const scale = Math.max(...frames, 1);
      for (let i = 1; i <= steps; i++) {
        // One step of a sixty-step morph moves a small share of the paint; a part popping in moves a whole part's worth.
        expect(Math.abs(frames[i]! - frames[i - 1]!) / scale, move).toBeLessThan(0.15);
      }
    }
  });

  it('renders every state statically, the same every time', () => {
    for (const state of CHARACTER_STATES) {
      const svg = renderStaticSvg({ face, state, color: 'blue' });
      expect(svg).toBe(renderStaticSvg({ face, state, color: 'blue' }));
      expect(svg).not.toBe(renderStaticSvg({ state, color: 'blue' }));
    }
  });

  it('renders in every series and variant', () => {
    for (const style of listStyles()) {
      for (const variant of style.variants) {
        const svg = renderStaticSvg({
          face,
          state: 'happy',
          style: style.id,
          variant,
          color: 'pink',
          sizePx: 24,
        });
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg).not.toContain('NaN');
      }
    }
  });

  it('follows every palette colour', () => {
    for (const color of COLOR_IDS) {
      expect(renderStaticSvg({ face, state: 'idle', color })).not.toContain('NaN');
    }
  });

  it('writes its own text for every state', () => {
    const text = CHARACTER_STATES.map((state) => drawnFaceText(design, state));
    for (const line of text) expect(line.length).toBeGreaterThan(0);
    // Its eyes are its own: no drawn face writes the cute face's text for every state.
    expect(CHARACTER_STATES.some((state) => kaomoji('mochi', state, face) !== kaomoji('mochi', state))).toBe(
      true,
    );
  });
});

describe('readings of the cute expressions', () => {
  it('read every cute expression as the kind of eye it is', () => {
    expect(CUTE_EYE_READINGS.dot.map((r) => r.kind)).toEqual(['open', 'open']);
    expect(CUTE_EYE_READINGS.arch.map((r) => r.kind)).toEqual(['smile', 'smile']);
    expect(CUTE_EYE_READINGS.curve.map((r) => r.kind)).toEqual(['closed', 'closed']);
    expect(CUTE_EYE_READINGS.mad.map((r) => r.kind)).toEqual(['mad', 'mad']);
    expect(CUTE_EYE_READINGS.sad.map((r) => r.kind)).toEqual(['sad', 'sad']);
    expect(CUTE_EYE_READINGS.cross.map((r) => r.kind)).toEqual(['cross', 'cross']);
    expect(CUTE_EYE_READINGS.star.map((r) => r.kind)).toEqual(['star', 'star']);
    expect(CUTE_EYE_READINGS.wink.map((r) => r.kind)).toEqual(['smile', 'open']);
    expect(CUTE_EYE_READINGS.dotHalf[0].open).toBeCloseTo(0.5);
    expect(CUTE_EYE_READINGS.dotWide[0].size).toBeCloseTo(1.35);
  });

  it('turn a glance into an offset towards or away from the nose, per eye', () => {
    const [left, right] = CUTE_EYE_READINGS.dotLeft;
    expect(left.off[0]).toBeLessThan(0);
    expect(right.off[0]).toBeGreaterThan(0);
  });
});

describe('the brow face', () => {
  /** The gap between the two brows' inner tips, in shape units: negative once they cross. */
  const browOf = (state: 'idle' | 'angry'): number => {
    const d = drawnOf(stillFrame('brow', state))[0]!;
    // The brow is the last layer of each eye.
    const xs = (layers: DrawnFaceGeometry['left']['layers']): number[] =>
      layers[layers.length - 1]!.rings[0]!.map(([x]) => x);
    return Math.min(...xs(d.right.layers)) - Math.max(...xs(d.left.layers));
  };

  it('keeps the brows apart at rest and joins them into a V in anger', () => {
    expect(browOf('idle')).toBeGreaterThan(0);
    expect(browOf('angry')).toBeLessThan(0);
  });
});

// The first fit of each face measures it over every state and searches each body, which is slow once and cached after.
describe('fitting a drawn face to its body', { timeout: 60000 }, () => {
  /** How far, in shape units, the furthest point of a face's fixed layers lies outside the body at its height. */
  const overflow = (face: DrawnFaceStyle, shape: ShapeId): number => {
    const sim = createSimulation({ face, shape, state: 'surprised', still: true, reducedMotion: true });
    sim.settle();
    const d = drawnOf(sim.snapshot())[0]!;
    sim.dispose();
    const def = getShape(shape);
    let worst = 0;
    for (const part of [d.left, d.right, ...(d.plate ? [d.plate] : [])]) {
      const t = part.transform;
      const [a, b, c, e] = t.matrix;
      for (const layer of part.layers) {
        if (layer.loose) continue;
        for (const ring of layer.rings) {
          for (const [px, py] of ring) {
            const x = t.x + a * (px - t.pivotX) + c * (py - t.pivotY);
            const y = t.y + b * (px - t.pivotX) + e * (py - t.pivotY);
            const [lo, hi] = def.spanAt(Math.min(def.bottom, Math.max(def.top, y)));
            worst = Math.max(worst, def.top - y, lo - x, x - hi);
          }
        }
      }
    }
    return worst;
  };
  const narrow = (
    ['pear', 'drop', 'onigiri', 'flame', 'heart', 'eggplant', 'avocado', 'melon'] as const
  ).filter((id) => (SHAPE_IDS as readonly string[]).includes(id)) as ShapeId[];

  it.each(FACES)('keeps the %s face, brows and frames included, inside narrow-topped bodies', (face) => {
    for (const shape of narrow) expect(overflow(face, shape), shape).toBeLessThan(1);
  });

  it('fits a face once per body, whatever it is doing: its place does not move with the expression', () => {
    // States with no face tuning of their own, so the cute plate under them is the same size.
    const states = ['idle', 'happy', 'laughing', 'listening', 'loading', 'playful'] as const;
    for (const face of FACES) {
      for (const shape of ['pear', 'mochi'] as const) {
        const centres = states.map((state) => {
          const sim = createSimulation({ face, shape, state, still: true, reducedMotion: true });
          sim.settle();
          const d = drawnOf(sim.snapshot())[0]!;
          sim.dispose();
          return [d.left.transform.pivotX, d.left.transform.pivotY, d.right.transform.pivotX];
        });
        for (const c of centres) for (let i = 0; i < 3; i++) expect(c[i]).toBeCloseTo(centres[0]![i]!, 6);
      }
    }
  });

  it('keeps a face near the cute face’s size on a narrow body by lowering it and bringing its eyes together first', () => {
    const fitOn = (face: DrawnFaceStyle) => {
      const sim = createSimulation({
        face,
        shape: 'cactus',
        state: 'idle',
        still: true,
        reducedMotion: true,
      });
      sim.settle();
      const d = drawnOf(sim.snapshot())[0]!;
      sim.dispose();
      return d.fit;
    };
    for (const face of FACES) {
      const fit = fitOn(face);
      const { separation, minSeparation } = getFaceDesign(face).layout;
      expect(fit.scale, face).toBeGreaterThanOrEqual(CACTUS_MIN_SCALE);
      // Spacing is given up before size, and never past the design's own minimum.
      expect(fit.squeeze * separation, face).toBeGreaterThanOrEqual(minSeparation - 1e-3);
      if (fit.scale < 1) expect(fit.squeeze * separation, face).toBeCloseTo(minSeparation, 3);
    }
  });

  it('leaves a face that fits as drawn at its drawn size', () => {
    const roomy = drawnOf(stillFrame('brow', 'idle'))[0]!;
    const sim = createSimulation({
      face: 'brow',
      shape: 'pear',
      state: 'idle',
      still: true,
      reducedMotion: true,
    });
    sim.settle();
    const tight = drawnOf(sim.snapshot())[0]!;
    sim.dispose();
    const width = (d: DrawnFaceGeometry): number => {
      const xs = d.left.layers[0]!.rings[0]!.map(([x]) => x);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(width(tight)).toBeLessThan(width(roomy));
  });
});

describe('effects a drawn face already shows', () => {
  it('drops the cute tear on a face that cries its own', () => {
    expect(STATE_FX.sad).toBe('tear');
    expect(stillFrame('glossy', 'sad').fx).toBeNull();
    expect(stillFrame('brow', 'sad').fx).not.toBeNull();
  });
});

describe('palette tokens', () => {
  it('turns a black body’s brows and pupils with the page in static output', () => {
    const svg = renderStaticSvg({ face: 'brow', color: 'black', state: 'idle' });
    expect(svg).toMatch(/--a\w+-soft/);
    expect(svg).toMatch(/--a\w+-pupil/);
  });

  it('leaves the cute face’s static output alone', () => {
    expect(renderStaticSvg({ color: 'black', state: 'idle' })).not.toContain('-pupil');
  });
});

describe('live', () => {
  const mount = (): HTMLElement => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    return host;
  };

  it('draws every drawn face live in every series and switches between them without throwing', () => {
    for (const style of ['vector', 'pixel', 'kaomoji'] as const) {
      const character = createCharacter(mount(), { face: 'brow', style, state: 'idle', reducedMotion: true });
      for (const face of FACES) {
        character.update({ face, state: 'happy' });
        character.update({ state: 'angry' });
      }
      character.update({ face: 'cute' });
      character.destroy();
    }
  });

  it('cross-fades one drawn face into another rather than swapping it in one frame', () => {
    const sim = createSimulation({ face: 'brow', state: 'idle', seed: 'fade' });
    sim.step(1);
    sim.update({ face: 'shades' });
    sim.step(1 / 60);
    const drawn = drawnOf(sim.snapshot());
    expect(drawn.map((d) => d.style)).toEqual(['brow', 'shades']);
    expect(drawn[0]!.opacity + drawn[1]!.opacity).toBeCloseTo(1);
    for (let i = 0; i < 120; i++) sim.step(1 / 60);
    expect(drawnOf(sim.snapshot()).map((d) => d.style)).toEqual(['shades']);
    sim.dispose();
  });

  it('mixes the mouth’s paint across a switch instead of swapping it', () => {
    const sim = createSimulation({ face: 'cute', state: 'happy', seed: 'mouth' });
    sim.step(1);
    sim.update({ face: 'bigmouth' });
    for (let i = 0; i < 6; i++) sim.step(1 / 60);
    const g = sim.snapshot().face.geometry!;
    const palette = { paint: (role: string) => `<${role}>`, rim: null } as unknown as DrawnPalette;
    const mid = drawnMouthPaint(g.drawn!, g.eyeOpacity ?? 1, '<plain>', palette);
    expect(mid).toMatch(/^color-mix\(in oklab, <plain>, <feature> \d+%\)$/);
    for (let i = 0; i < 120; i++) sim.step(1 / 60);
    const end = sim.snapshot().face.geometry!;
    expect(drawnMouthPaint(end.drawn!, end.eyeOpacity ?? 1, '<plain>', palette)).toBe('<feature>');
    sim.dispose();
  });

  it('hands the face back to the plain eyes when it switches to the cute face', () => {
    const sim = createSimulation({ face: 'pie', state: 'idle', seed: 'back' });
    sim.step(1);
    sim.update({ face: 'cute' });
    for (let i = 0; i < 120; i++) sim.step(1 / 60);
    const frame = sim.snapshot();
    expect(drawnOf(frame)).toHaveLength(0);
    expect(frame.face.geometry?.eyeOpacity ?? 1).toBe(1);
    sim.dispose();
  });
});
