import { CENTER, type Point } from '../core/types.js';
import { clamp, easeOutCubic, lerp, smoothstep } from '../math/easing.js';
import type { CharacterState } from './states.js';

export const BELT_KINDS = [
  'dots',
  'orbit',
  'radar',
  'progress',
  'gather',
  'wave',
  'send',
  'receive',
  'dock',
  'ball',
  'whirl',
  'standby',
  'pencil',
  'bang',
] as const;

export type BeltKind = (typeof BELT_KINDS)[number];

/**
 * Which states hand their body over to a belt overlay.
 *
 * A belt is a different mode of being rather than a decoration: the body
 * collapses into a small core sphere and the meaning is carried by what orbits
 * it. States not listed here animate as a whole body.
 */
export const STATE_BELT: Partial<Record<CharacterState, BeltKind>> = {
  thinking: 'dots',
  orbit: 'orbit',
  messaging: 'orbit',
  waiting: 'orbit',
  radar: 'radar',
  progress: 'progress',
  spawning: 'gather',
  dictating: 'wave',
  sending: 'send',
  receiving: 'receive',
  uploading: 'dock',
  bouncing: 'ball',
  loading: 'whirl',
  'powering-down': 'standby',
  writing: 'pencil',
  alerting: 'bang',
};

/** How far the body shrinks when this belt takes over. */
export const BELT_CORE_SIZE: Record<BeltKind, number> = {
  dots: 22,
  orbit: 26,
  radar: 28,
  progress: 30,
  gather: 26,
  wave: 20,
  send: 26,
  receive: 26,
  dock: 26,
  ball: 30,
  whirl: 28,
  standby: 26,
  // Both of these keep a larger core than the rest: the glyph is the actor
  // and the body is what it acts on, so a body shrunk to a bead would leave
  // the pencil scribbling beside nothing.
  pencil: 34,
  bang: 24,
};

/**
 * How much of a belt's own motion the whole figure takes when the cute face
 * keeps its body. Only the bouncing ball moves the body; the rest of the belt
 * is shown beside it as an effect (motion/fx-activity.ts).
 */
export const BELT_BODY_SHARE: Partial<Record<BeltKind, number>> = { ball: 0.7 };

/** Fraction of the blend spent morphing the body to a circle before it shrinks. */
export const BELT_MORPH_SPLIT = 0.62;

export interface BeltDot {
  x: number;
  y: number;
  r: number;
  opacity: number;
}

export interface BeltRing {
  x: number;
  y: number;
  r: number;
  width: number;
  opacity: number;
  /** Stroke dash pattern, for progress arcs. */
  dash?: string;
}

/**
 * A drawn object carried by a belt, in shape space and centred on the body
 * like the dots and rings are. The outline comes from `motion/glyphs.ts`;
 * the frame only says where it goes.
 */
export interface BeltGlyph {
  kind: 'pencil' | 'bang';
  x: number;
  y: number;
  /** Degrees, clockwise, about the glyph's own centre. */
  rotation: number;
  scale: number;
  opacity: number;
}

export interface BeltFrame {
  dots: BeltDot[];
  rings: BeltRing[];
  /** Present only for the belts that draw an object rather than a field of dots. */
  glyphs?: BeltGlyph[];
  /** Offset applied to the core sphere itself. */
  coreX: number;
  coreY: number;
  /** Scale applied to the core sphere. */
  coreScale: number;
  coreOpacity: number;
}

const empty = (): BeltFrame => ({ dots: [], rings: [], coreX: 0, coreY: 0, coreScale: 1, coreOpacity: 1 });

const DOT_SPREAD = 62;

/** Height of a belt glyph in shape units, before the frame's own scale. */
export const BELT_GLYPH_SIZE = 62;

/**
 * Evaluate a belt at time `t` seconds.
 *
 * Every belt is a pure function of time. Nothing accumulates, so a belt can be
 * scrubbed, paused, or resumed at any point and still be correct — which is
 * what lets a page freeze hundreds of characters mid-animation without
 * them drifting out of sync when they resume.
 */
export function evaluateBelt(kind: BeltKind, t: number): BeltFrame {
  const frame = empty();

  switch (kind) {
    case 'dots': {
      // Three beads including the core; a Gaussian travels along them.
      const period = 1.4;
      const phase = (t % period) / period;
      for (let i = -1; i <= 1; i++) {
        const centreOffset = i * DOT_SPREAD;
        const lead = (i + 1) / 3;
        let d = phase - lead;
        if (d < -0.5) d += 1;
        if (d > 0.5) d -= 1;
        const bump = Math.exp(-(d * d) / 0.012);
        if (i === 0) {
          frame.coreScale = 1 + bump * 0.18;
          frame.coreY = -bump * 6;
          continue;
        }
        frame.dots.push({
          x: CENTER + centreOffset,
          y: CENTER - bump * 6,
          r: 11 + bump * 2.6,
          opacity: 0.55 + bump * 0.45,
        });
      }
      break;
    }

    case 'orbit': {
      // Five satellites on an inclined ellipse; depth drives size and alpha.
      const count = 5;
      for (let i = 0; i < count; i++) {
        const a = t * 1.9 + (i / count) * Math.PI * 2;
        const depth = Math.cos(a);
        frame.dots.push({
          x: CENTER + Math.sin(a) * 52,
          y: CENTER + depth * 22,
          r: 6.5 + depth * 2.2,
          opacity: 0.45 + (depth + 1) * 0.27,
        });
      }
      break;
    }

    case 'radar': {
      const period = 1.3;
      for (let i = 0; i < 3; i++) {
        const p = (t / period + i / 3) % 1;
        frame.rings.push({
          x: CENTER,
          y: CENTER,
          r: 30 + easeOutCubic(p) * 74,
          width: 3.4 - p * 1.9,
          opacity: (1 - p) * 0.75,
        });
      }
      break;
    }

    case 'progress': {
      const cycle = 4;
      const p = clamp((t % cycle) / 2.5, 0, 1);
      const r = 48;
      const circumference = Math.PI * 2 * r;
      frame.rings.push({ x: CENTER, y: CENTER, r, width: 6, opacity: 0.16 });
      frame.rings.push({
        x: CENTER,
        y: CENTER,
        r,
        width: 6,
        opacity: 1,
        dash: `${circumference * p} ${circumference}`,
      });
      break;
    }

    case 'gather': {
      // Particles spiral inward, then the belt behaves like progress.
      const intro = 2;
      if (t < intro) {
        const p = t / intro;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + p * Math.PI * 1.6;
          const r = 96 * (1 - easeOutCubic(p));
          frame.dots.push({
            x: CENTER + Math.cos(a) * r,
            y: CENTER + Math.sin(a) * r,
            r: 7,
            opacity: 0.35 + p * 0.65,
          });
        }
        frame.coreScale = 0.7 + p * 0.3;
      } else {
        return evaluateBelt('progress', t - intro);
      }
      break;
    }

    case 'wave': {
      // Four bars with a pseudo-random envelope, like a level meter.
      for (let i = 0; i < 4; i++) {
        const seed = i * 1.7;
        const h =
          0.42 + 0.29 * Math.sin(t * 3.1 + seed) * Math.sin(t * 1.3 + seed) + 0.29 * Math.sin(t * 5.7 + seed);
        const height = clamp(h, 0.12, 1) * 34;
        frame.dots.push({
          x: CENTER + (i - 1.5) * 26,
          y: CENTER,
          r: 6,
          opacity: 0.5 + clamp(h, 0, 1) * 0.5,
        });
        frame.rings.push({
          x: CENTER + (i - 1.5) * 26,
          y: CENTER,
          r: height,
          width: 9,
          opacity: 0,
        });
      }
      break;
    }

    case 'send': {
      const period = 1.5;
      const p = (t % period) / period;
      const dist = easeOutCubic(p) * 120;
      const dx = 0.74;
      const dy = -0.62;
      frame.dots.push({ x: CENTER + dx * dist, y: CENTER + dy * dist, r: 9, opacity: 1 - p });
      frame.dots.push({
        x: CENTER + dx * dist * 0.72,
        y: CENTER + dy * dist * 0.72,
        r: 6,
        opacity: (1 - p) * 0.3,
      });
      frame.rings.push({ x: CENTER, y: CENTER, r: 24 + p * 40, width: 3, opacity: (1 - p) * 0.5 });
      frame.coreScale = p < 0.2 ? 1 - p * 0.3 : 1 + smoothstep(0.2, 0.6, p) * 0.05;
      break;
    }

    case 'receive': {
      const period = 1.7;
      const index = Math.floor(t / period);
      const p = (t % period) / period;
      // Deterministic per-arrival direction so it varies without state.
      const a = (index * 2.399963) % (Math.PI * 2);
      const dist = (1 - easeOutCubic(Math.min(1, p / 0.6))) * 130;
      if (p < 0.6) {
        frame.dots.push({ x: CENTER + Math.cos(a) * dist, y: CENTER + Math.sin(a) * dist, r: 9, opacity: 1 });
      } else {
        const q = (p - 0.6) / 0.4;
        frame.rings.push({ x: CENTER, y: CENTER, r: 26 + q * 44, width: 3, opacity: (1 - q) * 0.6 });
        frame.coreScale = 1 + (1 - q) * 0.11;
      }
      break;
    }

    case 'dock': {
      const intro = 1.1;
      if (t < intro) {
        const p = easeOutCubic(t / intro);
        for (let i = 0; i < 2; i++) {
          const from = -150 + i * 40;
          frame.dots.push({ x: CENTER + from * (1 - p), y: CENTER + from * (1 - p) * 0.6, r: 8, opacity: p });
        }
      } else {
        const a = (t - intro) * 2.2;
        for (let i = 0; i < 2; i++) {
          const angle = a + i * Math.PI;
          frame.dots.push({
            x: CENTER + Math.cos(angle) * 54,
            y: CENTER + Math.sin(angle) * 24,
            r: 8,
            opacity: 0.6 + Math.cos(angle) * 0.4,
          });
        }
      }
      break;
    }

    case 'ball': {
      // Free fall with a perfectly elastic floor at height 52.
      const height = 52;
      const g = (8 * height) / (0.62 * 0.62);
      const period = 2 * Math.sqrt((2 * height) / g);
      const local = t % period;
      const h = height - 0.5 * g * Math.pow(local - period / 2, 2);
      frame.coreY = -Math.max(0, h);
      // Squash on contact reads as weight; without it the bounce looks floaty.
      frame.coreScale = h < 4 ? 0.92 : 1;
      break;
    }

    case 'whirl': {
      frame.coreX = Math.sin(t * 0.9) * 16 + Math.sin(t * 1.7) * 7;
      frame.coreY = Math.sin(t * 1.3) * 14 + Math.sin(t * 0.6) * 6;
      break;
    }

    case 'standby': {
      const pulse = 0.28 + Math.sin(t * 1.6) * 0.2;
      frame.coreOpacity = clamp(pulse + 0.4, 0.1, 1);
      frame.coreScale = 0.96 + Math.sin(t * 1.6) * 0.04;
      if (t < 1) {
        frame.rings.push({ x: CENTER, y: CENTER, r: 90 * (1 - easeOutCubic(t)), width: 3, opacity: 1 - t });
      }
      break;
    }

    case 'pencil': {
      /*
       * A pencil scribbling beside the body. The path is a 2:1 Lissajous —
       * two strokes across for every loop down — which is what a hand
       * shading a line actually traces, and unlike a straight back-and-forth
       * it has no instant where the tip stops dead.
       */
      const period = 1.1;
      const phase = ((t % period) / period) * Math.PI * 2;
      const across = Math.sin(phase);
      const down = Math.sin(phase * 2);

      frame.glyphs = [
        {
          kind: 'pencil',
          x: CENTER + 52 + across * 22,
          y: CENTER + 6 + down * 11,
          // Held like a pen: leaning back, rocking a little with the stroke.
          rotation: 26 + across * 8,
          scale: 1,
          opacity: 1,
        },
      ];

      // Two faint marks left behind, so the scribble reads as writing rather
      // than as an object waving about.
      for (let i = 0; i < 2; i++) {
        const trail = Math.sin(phase - 0.5 - i * 0.45);
        frame.dots.push({
          x: CENTER + 52 + trail * 22,
          y: CENTER + 30,
          r: 4,
          opacity: 0.32 - i * 0.14,
        });
      }

      // The body leans into the stroke, as a page nudged by the hand does.
      frame.coreX = across * 3;
      frame.coreY = down * 1.6;
      break;
    }

    case 'bang': {
      /*
       * An exclamation mark that arrives with a snap and then refuses to be
       * ignored. A single overshoot on entry does the arriving; a slow
       * two-second pulse afterwards keeps it present without re-animating,
       * which at a glance is the difference between "look at this" and a
       * blinking error light.
       */
      const period = 2;
      const local = t % period;
      const drop = clamp(local / 0.34, 0, 1);
      // Overshoot past the resting height, then settle back onto it.
      const rise = easeOutCubic(drop) * 1.14 - smoothstep(0.34, 1, local) * 0.14;
      const hold = local > 0.34 ? 1 + Math.sin((local - 0.34) * 3.1) * 0.045 : 1;

      frame.glyphs = [
        {
          kind: 'bang',
          x: CENTER,
          y: CENTER - 74 * rise,
          rotation: 0,
          scale: (0.72 + rise * 0.28) * hold,
          opacity: drop,
        },
      ];

      frame.coreScale = 1 + (1 - drop) * 0.12;
      frame.coreY = (1 - drop) * 5;
      break;
    }
  }

  return frame;
}

/**
 * Cross-fade two belt frames.
 *
 * Belts are swapped, not blended, everywhere except the one place where the
 * swap is visible as a jump: a character that goes from thinking to writing
 * has three beads on screen and needs one pencil. Collapsing the outgoing
 * dots into the incoming glyph — rather than fading them out where they
 * stand — is the same trick `BELT_MORPH_SPLIT` plays on the body, applied to
 * the overlay.
 */
export function blendBeltFrames(from: BeltFrame, to: BeltFrame, t: number): BeltFrame {
  const k = clamp(t, 0, 1);
  const frame: BeltFrame = {
    dots: [],
    rings: [],
    coreX: lerp(from.coreX, to.coreX, k),
    coreY: lerp(from.coreY, to.coreY, k),
    coreScale: lerp(from.coreScale, to.coreScale, k),
    coreOpacity: lerp(from.coreOpacity, to.coreOpacity, k),
  };

  // Where the outgoing dots are pulled towards: the incoming glyph if there
  // is one, otherwise the core.
  const sink = to.glyphs?.[0] ?? { x: CENTER, y: CENTER };

  for (const dot of from.dots) {
    frame.dots.push({
      x: lerp(dot.x, sink.x, k),
      y: lerp(dot.y, sink.y, k),
      r: dot.r * (1 - k),
      opacity: dot.opacity * (1 - k),
    });
  }
  for (const dot of to.dots) frame.dots.push({ ...dot, opacity: dot.opacity * k });

  for (const ring of from.rings) frame.rings.push({ ...ring, opacity: ring.opacity * (1 - k) });
  for (const ring of to.rings) frame.rings.push({ ...ring, opacity: ring.opacity * k });

  const glyphs: BeltGlyph[] = [];
  for (const glyph of from.glyphs ?? []) glyphs.push({ ...glyph, opacity: glyph.opacity * (1 - k) });
  for (const glyph of to.glyphs ?? []) glyphs.push({ ...glyph, opacity: glyph.opacity * k });
  if (glyphs.length > 0) frame.glyphs = glyphs;

  return frame;
}

export const beltForState = (state: CharacterState): BeltKind | null => STATE_BELT[state] ?? null;

/**
 * The body outline while a belt takes over, as points.
 *
 * `blend` is the belt blend (0 = the shape, 1 = a bare core). The first
 * `BELT_MORPH_SPLIT` of it lerps the ring to a circle; the rest shrinks that
 * circle to `coreSize`.
 */
export function beltBodyRing(
  ring: readonly Point[],
  radius: number,
  blend: number,
  coreSize: number,
): Point[] {
  const morph = clamp(blend / BELT_MORPH_SPLIT, 0, 1);
  const shrink = clamp((blend - BELT_MORPH_SPLIT) / (1 - BELT_MORPH_SPLIT), 0, 1);
  const targetRadius = radius + (coreSize - radius) * shrink;

  return ring.map(([x, y]) => {
    const dx = x - CENTER;
    const dy = y - CENTER;
    const len = Math.hypot(dx, dy) || 1;
    const blended = len + (targetRadius - len) * morph;
    const finalLen = shrink > 0 ? targetRadius : blended;
    return [CENTER + (dx / len) * finalLen, CENTER + (dy / len) * finalLen] as Point;
  });
}
