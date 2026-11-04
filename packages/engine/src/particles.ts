import { CENTER, VIEWBOX_MARGIN } from './core/types.js';
import { clamp, smoothstep } from './math/easing.js';

export const CONFETTI_COLORS = ['#F26F73', '#F98431', '#E8B455', '#42B27C', '#2A92FE', '#8E7BE3'];

const STAR_COLOR = '#F4C34E';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds lived. */
  age: number;
  /** Total lifetime in seconds. */
  life: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  kind: 'dot' | 'strip' | 'star';
}

export interface TrailPoint {
  x: number;
  y: number;
  /** Depth: positive in front of the body, negative behind it. */
  z: number;
}

/** A point on a ribbon's orbit, remembering the angle it was taken at. */
interface OrbitPoint extends TrailPoint {
  angle: number;
}

/**
 * One ribbon flung off a spinning body.
 *
 * It rides a tilted circular orbit about the body and is drawn as the arc it
 * has swept, wide at the head and thin at the tail. It grows in, follows the
 * spin while the body turns, coasts when it stops, then draws its arc back
 * into the head and is gone.
 */
export interface Trail {
  /** The swept arc, tail first. */
  points: OrbitPoint[];
  /** Degrees; the renderer derives the colour. */
  hue: number;
  /** Head width at rest, in shape units. */
  width: number;
  /** Head width as drawn this frame: grown in, shrunk while retracting, wider in front. */
  size: number;
  opacity: number;
  /** Orbit inclination towards the viewer, radians. */
  tilt: number;
  /** Orbit rotation in the picture plane, radians. */
  roll: number;
  radius: number;
  /** Where the head is on the orbit, radians. */
  angle: number;
  /** The ribbon's own angular speed, on top of what the spin hands it. */
  drift: number;
  /** Share of the body's spin the ribbon follows. */
  follow: number;
  /** Spin speed the ribbon carries on with once the body has stopped. */
  carry: number;
  /** Longest arc the ribbon sweeps, radians. */
  arc: number;
  age: number;
  /** 0 = out, 1 = drawn back in. */
  retract: number;
  /** A resident ribbon of `sustain`, rather than one flung off a spin. */
  resident: boolean;
}

export interface ParticleSystemOptions {
  /** Orbit radius, normally the shape's beltRadius. */
  radius?: number;
  /** Scale multiplier applied to every particle. */
  sizeScale?: number;
  random?: () => number;
}

export interface ParticleUpdate {
  /** Current body angular velocity in radians per second. */
  spinVelocity: number;
  /** Multiplier on particle size, for small render sizes. */
  sizeScale: number;
  /** More ribbons, for a spin of more than one turn. */
  wide: boolean;
  /** Keep two slow ribbons circling even when nothing spins. */
  sustain: boolean;
}

const GRAVITY = 40;
/** Spin below this, in rad/s, has stopped as far as the ribbons are concerned. */
const SPINNING = 0.9;
/** Ribbons are flung only while the spin is at least this fast. */
const FLINGING = 5;
/** The outermost orbit, kept just inside the margin round shape space. */
const OUTER_ORBIT = CENTER + VIEWBOX_MARGIN - 6;
/** Angular step between recorded points, radians. */
const POINT_STEP = 0.09;
const MAX_POINTS = 48;

/**
 * Confetti bursts and spin ribbons.
 *
 * Both live here because they share the update loop and the same coordinate
 * space, but they are independent: confetti is ballistic and short-lived,
 * ribbons ride orbits round the body and are drawn back in when the spin ends.
 */
export function createParticleSystem(options: ParticleSystemOptions = {}) {
  const radius = options.radius ?? 100;
  const random = options.random ?? Math.random;
  const between = (lo: number, hi: number): number => lo + random() * (hi - lo);

  let particles: Particle[] = [];
  let trails: Trail[] = [];

  let clock = 0;
  let yaw = 0;
  let wasSpinning = false;
  /** Clock times at which the ribbons of the current spin are due. */
  let due: number[] = [];
  let flung = 0;
  let planes: { tilt: number; roll: number }[] = [];
  let baseHue = 0;
  let residentDue = 0;

  function burst(count = 14, speed = 1, spread = 1): void {
    for (let i = 0; i < count; i++) {
      // Spread evenly round the body, with a little jitter, so a burst never
      // comes out lopsided.
      const angle = (i / count) * Math.PI * 2 + between(-0.35, 0.35);
      const r = radius * between(0.84, 1.02);
      const velocity = between(170, 360) * speed;
      const isStar = random() < 0.18;

      particles.push({
        x: CENTER + Math.cos(angle) * r,
        y: CENTER + Math.sin(angle) * r,
        vx: Math.cos(angle) * velocity * spread,
        vy: Math.sin(angle) * velocity * spread - between(20, 75),
        age: 0,
        life: between(0.45, 0.85),
        size: isStar ? between(7, 10) : between(4, 8),
        rotation: random() * Math.PI * 2,
        spin: (random() - 0.5) * 9,
        color: isStar ? STAR_COLOR : CONFETTI_COLORS[Math.floor(random() * CONFETTI_COLORS.length)]!,
        kind: isStar ? 'star' : random() < 0.3 ? 'dot' : 'strip',
      });
    }
  }

  /** Two or three orbit planes crossing at different angles, so the ribbons fan out rather than nest. */
  function choosePlanes(count: number): void {
    const n = random() < 0.45 ? 2 : 3;
    const roll = between(-0.9, 0.9);
    planes = Array.from({ length: n }, (_, i) => ({
      tilt: between(0.16, 0.72),
      roll: roll + (i * Math.PI) / n + between(-0.15, 0.15),
    }));
    baseHue = random() * 360;
    flung = 0;
    due = Array.from({ length: count }, (_, i) => clock + i * between(0.055, 0.105));
  }

  function orbitPoint(t: Trail, angle: number): OrbitPoint {
    const hx = t.radius * Math.sin(angle);
    const hy = -t.radius * Math.cos(angle) * Math.sin(t.tilt);
    const c = Math.cos(t.roll);
    const s = Math.sin(t.roll);
    return {
      x: CENTER + hx * c - hy * s,
      y: CENTER + hx * s + hy * c,
      z: Math.cos(angle) * Math.cos(t.tilt),
      angle,
    };
  }

  function ribbon(
    fields: Pick<
      Trail,
      'hue' | 'width' | 'tilt' | 'roll' | 'radius' | 'angle' | 'drift' | 'follow' | 'arc' | 'resident'
    >,
  ): Trail {
    return { ...fields, points: [], size: 0, opacity: 0, carry: 0, age: 0, retract: 0 };
  }

  function fling(count: number, direction: number): void {
    const plane = planes[flung % planes.length]!;
    // Inner and outer orbits in turn, so the ribbons stack outwards.
    const inner = Math.min(radius * 1.06, OUTER_ORBIT - 24);
    const tier = (OUTER_ORBIT - inner) / Math.max(count - 1, 1);
    const width = count <= 3 ? between(9, 12) : count === 4 ? between(7.6, 9.8) : between(6.4, 8.4);
    trails.push(
      ribbon({
        hue: baseHue + (360 * flung) / count + between(-14, 14),
        width,
        tilt: plane.tilt + between(-0.04, 0.04),
        roll: plane.roll + between(-0.05, 0.05),
        radius: inner + flung * tier + between(-1.5, 1.5),
        angle: yaw - between(0, 0.18) * direction,
        drift: direction * between(0.5, 1.1),
        follow: between(0.74, 0.94),
        arc: between(2.2, 3.4),
        resident: false,
      }),
    );
    flung++;
  }

  function settleResident(index: number): void {
    trails.push(
      ribbon({
        hue: random() * 360,
        width: between(6.2, 8),
        tilt: between(0.1, 0.22),
        roll: between(-0.12, 0.12),
        radius: Math.min(radius * 1.1 + index * 14, OUTER_ORBIT),
        angle: random() * Math.PI * 2,
        drift: (random() < 0.5 ? -1 : 1) * between(1.7, 2.3),
        follow: 0.8,
        arc: between(2.4, 3.2),
        resident: true,
      }),
    );
  }

  function update(dt: number, state: ParticleUpdate): void {
    clock += dt;
    const damping = Math.pow(0.94, 60 * dt);

    for (const p of particles) {
      p.age += dt;
      p.vy += GRAVITY * dt;
      p.vx *= damping;
      p.vy *= damping;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
    }
    particles = particles.filter((p) => p.age < p.life);

    const velocity = state.spinVelocity;
    const turned = velocity * dt;
    yaw += turned;
    const spinning = Math.abs(velocity) >= SPINNING;
    const direction = velocity >= 0 ? 1 : -1;

    if (spinning && !wasSpinning) choosePlanes(state.wide ? 6 : 4 + Math.round(random()));
    if (!spinning) due = [];
    wasSpinning = spinning;
    if (Math.abs(velocity) >= FLINGING) {
      const count = due.length + flung;
      while (due.length > 0 && clock >= due[0]!) {
        due.shift();
        fling(count, direction);
      }
    }

    if (state.sustain && clock >= residentDue) {
      const residents = trails.filter((t) => t.resident).length;
      if (residents < 2) settleResident(residents);
      residentDue = clock + 0.7;
    }

    for (const t of trails) {
      t.age += dt;
      const retracting = t.resident ? !state.sustain : !spinning || t.age > 5;
      t.retract = clamp(t.retract + (retracting ? dt / 0.5 : -dt / 0.35), 0, 1);

      if (t.resident) {
        t.angle += t.drift * dt + turned * t.follow;
      } else if (spinning) {
        t.carry = velocity * t.follow;
        t.angle += turned * t.follow + t.drift * dt;
      } else {
        // The body has stopped; the ribbon coasts on and slows.
        t.angle += (t.carry + t.drift) * dt;
        const slow = Math.exp(-2.6 * dt);
        t.carry *= slow;
        t.drift *= slow;
      }

      // Record the sweep at an even angular step, so a fast frame still draws a smooth arc.
      const last = t.points.length > 0 ? t.points[t.points.length - 1]!.angle : t.angle - 0.001 * direction;
      const swept = t.angle - last;
      const steps = Math.min(Math.ceil(Math.abs(swept) / POINT_STEP), 24);
      for (let i = 1; i <= steps; i++) t.points.push(orbitPoint(t, last + (swept * i) / steps));
      if (t.points.length === 0) t.points.push(orbitPoint(t, t.angle));

      // Draw the arc back into the head as the ribbon retracts.
      const span = t.arc * (1 - smoothstep(0, 1, t.retract));
      while (t.points.length > 2 && Math.abs(t.angle - t.points[0]!.angle) > span) t.points.shift();
      const over = Math.abs(t.angle - t.points[0]!.angle) - span;
      if (t.points.length >= 2 && over > 0) {
        const tail = t.points[0]!.angle;
        t.points[0] = orbitPoint(t, tail + Math.sign(t.angle - tail) * over);
      }
      if (t.points.length > MAX_POINTS) t.points.splice(0, t.points.length - MAX_POINTS);

      // Wider as the head swings to the front, grown in, narrowed while drawing back.
      const front = Math.cos(t.angle) * Math.cos(t.tilt);
      const depth = 0.72 + 0.28 * clamp(front, 0, 1);
      const grow = smoothstep(0, 1, t.age / 0.34);
      t.size = t.width * depth * 1.7 * grow * (1 - 0.72 * t.retract * t.retract);
      t.opacity = Math.min(t.age / 0.26, 1);
    }
    // A ribbon only reaches 1 while drawing back, so this drops exactly the spent ones.
    trails = trails.filter((t) => t.retract < 1);
  }

  function clear(): void {
    particles = [];
    trails = [];
    due = [];
  }

  return {
    burst,
    update,
    clear,
    get particles() {
      return particles;
    },
    get trails() {
      return trails;
    },
    get active() {
      return particles.length > 0 || trails.length > 0;
    },
  };
}

export type ParticleSystem = ReturnType<typeof createParticleSystem>;

/** Opacity curve: quick fade in, long power fade out. */
export function particleOpacity(p: Particle): number {
  const t = clamp(p.age / p.life, 0, 1);
  if (t < 0.1) return t / 0.1;
  return Math.pow(1 - (t - 0.1) / 0.9, 1.7);
}

/** A ribbon's colour: soft and a little light, so it reads as a flourish and not as part of the body. */
export const ribbonColor = (hue: number): string => `hsl(${Math.round(((hue % 360) + 360) % 360)} 62% 64%)`;

/**
 * The stretches of a ribbon on one side of the body, as `[first, last]` index
 * pairs. Each stretch takes one point from its neighbours on either side, so
 * the back and front halves meet instead of leaving a gap where it crosses.
 */
export function ribbonRuns(points: readonly TrailPoint[], side: 'back' | 'front'): [number, number][] {
  const runs: [number, number][] = [];
  const front = side === 'front';
  let start = 0;
  while (start < points.length) {
    const inFront = points[start]!.z >= 0;
    let end = start;
    while (end + 1 < points.length && points[end + 1]!.z >= 0 === inFront) end++;
    const a = Math.max(start - 1, 0);
    const b = Math.min(end + 1, points.length - 1);
    if (inFront === front && b > a) runs.push([a, b]);
    start = end + 1;
  }
  return runs;
}

/** Confetti shrinks a little as it falls. */
export function particleSize(p: Particle): number {
  return p.size * (1 - 0.4 * clamp(p.age / p.life, 0, 1));
}
