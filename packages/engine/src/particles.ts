import { CENTER, VIEWBOX_MARGIN } from './core/types.js';
import { clamp, easeOutCubic, smoothstep } from './math/easing.js';

/** Paper colours: the palette's hues a step lighter, so confetti reads as a flourish and not as another body. */
export const CONFETTI_COLORS = ['#EE5A5E', '#F7803D', '#F0B53A', '#33B477', '#24A6C9', '#3D8BF2', '#9474EA'];

const STAR_GOLD = '#F7C04A';

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
 * It rides a flattened circle round the body and is drawn as the stretch of
 * that circle it has swept, broad at the head and fine at the tail. It
 * swells in, travels with the spin, coasts once the body stops, and then
 * reels its tail into the head and is gone.
 */
export interface Trail {
  /** The swept arc, tail first. */
  points: OrbitPoint[];
  /** Degrees; the renderer derives the colour. */
  hue: number;
  /** Head width at rest, in shape units. */
  width: number;
  /** Head width as drawn this frame. */
  size: number;
  opacity: number;
  /** How flat the orbit looks: 0 is edge-on, 1 a full circle facing the viewer. */
  squash: number;
  /** The orbit's turn in the picture plane, radians. */
  roll: number;
  radius: number;
  /** Where the head is on the orbit, radians. */
  angle: number;
  /** The ribbon's own angular speed, on top of what the spin hands it. */
  drift: number;
  /** Share of the body's spin the ribbon travels with. */
  follow: number;
  /** Spin speed the ribbon keeps once the body has stopped. */
  carry: number;
  /** Longest stretch of orbit the ribbon covers, radians. */
  arc: number;
  age: number;
  /** 0 while out, 1 once reeled in. */
  reel: number;
  /** One of the slow pair `sustain` keeps circling, rather than one flung off a spin. */
  resident: boolean;
}

export interface ParticleSystemOptions {
  /** Orbit radius, normally the shape's beltRadius. */
  radius?: number;
  /** Multiplier on every piece of paper. */
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

/** The golden angle, so successive pieces and ribbons never bunch up. */
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Paper, in body radii and seconds: how hard it is thrown, how it falls, and how long it lasts. */
const PAPER = {
  speed: [1.4, 2.8],
  lift: [0.2, 0.6],
  gravity: 1.5,
  drag: 2.2,
  life: [0.6, 1],
  /** One piece in this many is a star, one in `dotEvery` of the rest a dot. */
  starEvery: 6,
  dotEvery: 3,
} as const;

/** Spin, in rad/s, below which the ribbons treat the body as still. */
export const SPIN_REST = 1;
/** Ribbons only leave the body while it spins at least this fast. */
const SPIN_FLING = 4.5;
/** The outermost orbit, kept just inside the margin round shape space. */
const OUTER_ORBIT = CENTER + VIEWBOX_MARGIN - 6;
/** Angular step between recorded points, radians. */
const POINT_STEP = 0.08;
const MAX_POINTS = 52;

/** Ribbon timing, in seconds: swelling in, fading in, reeling out and in, and the longest a flung one stays. */
const RIBBON = { grow: 0.4, fade: 0.22, reelIn: 0.45, reelOut: 0.3, stay: 4.5, coast: 2.2 } as const;

/**
 * Confetti bursts and spin ribbons.
 *
 * Both live here because they share the update loop and the same coordinate
 * space, but they are independent: confetti is ballistic and short-lived,
 * ribbons ride orbits round the body and are reeled in when the spin ends.
 */
export function createParticleSystem(options: ParticleSystemOptions = {}) {
  const radius = options.radius ?? 100;
  const scale = options.sizeScale ?? 1;
  const random = options.random ?? Math.random;
  const pick = (range: readonly [number, number]): number => range[0] + random() * (range[1] - range[0]);
  const around = (spread: number): number => (random() * 2 - 1) * spread;

  let particles: Particle[] = [];
  let trails: Trail[] = [];

  let clock = 0;
  let yaw = 0;
  let wasSpinning = false;
  /** Clock times at which the ribbons of the current spin leave the body. */
  let launches: number[] = [];
  let launched = 0;
  let planes: { squash: number; roll: number }[] = [];
  let firstHue = 0;
  let residentAt = 0;

  function burst(count = 14, speed = 1, spread = 1): void {
    const offset = random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const angle = offset + i * GOLDEN;
      const from = radius * pick([0.9, 1]);
      const throwSpeed = radius * pick(PAPER.speed) * speed * spread;
      const star = i % PAPER.starEvery === PAPER.starEvery - 1;
      const dot = !star && i % PAPER.dotEvery === 0;
      particles.push({
        x: CENTER + Math.cos(angle) * from,
        y: CENTER + Math.sin(angle) * from,
        vx: Math.cos(angle) * throwSpeed,
        vy: Math.sin(angle) * throwSpeed - radius * pick(PAPER.lift),
        age: 0,
        life: pick(PAPER.life),
        size: scale * (star ? pick([6.5, 9]) : pick([3.5, 7.5])),
        rotation: random() * Math.PI * 2,
        spin: (random() < 0.5 ? -1 : 1) * pick([3, 7]),
        color: star ? STAR_GOLD : CONFETTI_COLORS[(i * 3) % CONFETTI_COLORS.length]!,
        kind: star ? 'star' : dot ? 'dot' : 'strip',
      });
    }
  }

  /** Two or three orbits crossing at evenly turned angles, so the ribbons fan out instead of nesting. */
  function planSpin(count: number): void {
    const n = count <= 4 ? 2 : 3;
    const roll = around(0.8);
    planes = Array.from({ length: n }, (_, i) => ({
      squash: pick([0.2, 0.62]),
      roll: roll + (i * Math.PI) / n + around(0.12),
    }));
    firstHue = random() * 360;
    launched = 0;
    launches = Array.from({ length: count }, (_, i) => clock + i * pick([0.07, 0.12]));
  }

  function orbitPoint(t: Trail, angle: number): OrbitPoint {
    const along = t.radius * Math.sin(angle);
    const up = -t.radius * Math.cos(angle) * t.squash;
    const c = Math.cos(t.roll);
    const s = Math.sin(t.roll);
    return {
      x: CENTER + along * c - up * s,
      y: CENTER + along * s + up * c,
      z: Math.cos(angle) * Math.sqrt(1 - t.squash * t.squash),
      angle,
    };
  }

  function ribbon(
    fields: Pick<
      Trail,
      'hue' | 'width' | 'squash' | 'roll' | 'radius' | 'angle' | 'drift' | 'follow' | 'arc' | 'resident'
    >,
  ): Trail {
    return { ...fields, points: [], size: 0, opacity: 0, carry: 0, age: 0, reel: 0 };
  }

  function launch(count: number, direction: number): void {
    const plane = planes[launched % planes.length]!;
    // Each ribbon rides a little further out than the last, so they stack outwards.
    const inner = Math.min(radius * 1.05, OUTER_ORBIT - 22);
    const step = (OUTER_ORBIT - inner) / Math.max(count - 1, 1);
    const width = count <= 3 ? pick([8.5, 11.5]) : count === 4 ? pick([7.2, 9.4]) : pick([6, 8]);
    trails.push(
      ribbon({
        hue: firstHue + launched * (GOLDEN * (180 / Math.PI)),
        width,
        squash: clamp(plane.squash + around(0.05), 0.12, 0.7),
        roll: plane.roll + around(0.06),
        radius: inner + launched * step + around(1.2),
        angle: yaw - pick([0, 0.2]) * direction,
        drift: direction * pick([0.4, 1]),
        follow: pick([0.7, 0.9]),
        arc: pick([2, 3.2]),
        resident: false,
      }),
    );
    launched++;
  }

  function addResident(index: number): void {
    trails.push(
      ribbon({
        hue: random() * 360,
        width: pick([6, 7.8]),
        squash: pick([0.12, 0.24]),
        roll: around(0.1),
        radius: Math.min(radius * 1.12 + index * 13, OUTER_ORBIT),
        angle: random() * Math.PI * 2,
        drift: (random() < 0.5 ? -1 : 1) * pick([1.5, 2.1]),
        follow: 0.75,
        arc: pick([2.2, 3]),
        resident: true,
      }),
    );
  }

  function updatePaper(dt: number): void {
    const keep = Math.exp(-PAPER.drag * dt);
    const fall = PAPER.gravity * radius * dt;
    for (const p of particles) {
      p.age += dt;
      p.vx *= keep;
      p.vy = p.vy * keep + fall;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
    }
    particles = particles.filter((p) => p.age < p.life);
  }

  /** Records the head's sweep at an even angular step, then trims the tail back to what the ribbon may cover. */
  function sweep(t: Trail, direction: number): void {
    const last = t.points.length > 0 ? t.points[t.points.length - 1]!.angle : t.angle - 0.001 * direction;
    const swept = t.angle - last;
    const steps = Math.min(Math.ceil(Math.abs(swept) / POINT_STEP), 20);
    for (let i = 1; i <= steps; i++) t.points.push(orbitPoint(t, last + (swept * i) / steps));
    if (t.points.length === 0) t.points.push(orbitPoint(t, t.angle));

    const cover = t.arc * (1 - smoothstep(0, 1, t.reel));
    const behind = (p: OrbitPoint): number => Math.abs(t.angle - p.angle);
    let cut = 0;
    while (cut < t.points.length - 2 && behind(t.points[cut + 1]!) > cover) cut++;
    if (cut > 0) t.points.splice(0, cut);
    const tail = t.points[0]!;
    if (t.points.length >= 2 && behind(tail) > cover) {
      t.points[0] = orbitPoint(t, t.angle - Math.sign(t.angle - tail.angle) * cover);
    }
    if (t.points.length > MAX_POINTS) t.points.splice(0, t.points.length - MAX_POINTS);
  }

  function update(dt: number, state: ParticleUpdate): void {
    clock += dt;
    updatePaper(dt);

    const velocity = state.spinVelocity;
    const turned = velocity * dt;
    yaw += turned;
    const spinning = Math.abs(velocity) >= SPIN_REST;
    const direction = velocity >= 0 ? 1 : -1;

    if (spinning && !wasSpinning) planSpin(state.wide ? 6 : 4 + Math.round(random()));
    if (!spinning) launches = [];
    wasSpinning = spinning;
    if (Math.abs(velocity) >= SPIN_FLING) {
      const count = launches.length + launched;
      while (launches.length > 0 && clock >= launches[0]!) {
        launches.shift();
        launch(count, direction);
      }
    }

    if (state.sustain && clock >= residentAt) {
      const residents = trails.filter((t) => t.resident).length;
      if (residents < 2) addResident(residents);
      residentAt = clock + 0.6;
    }

    for (const t of trails) {
      t.age += dt;
      const reeling = t.resident ? !state.sustain : !spinning || t.age > RIBBON.stay;
      t.reel = clamp(t.reel + (reeling ? dt / RIBBON.reelIn : -dt / RIBBON.reelOut), 0, 1);

      if (t.resident) {
        t.angle += t.drift * dt + turned * t.follow;
      } else if (spinning) {
        t.carry = velocity * t.follow;
        t.angle += turned * t.follow + t.drift * dt;
      } else {
        // The body has stopped; the ribbon coasts on and slows.
        t.angle += (t.carry + t.drift) * dt;
        const slow = Math.exp(-RIBBON.coast * dt);
        t.carry *= slow;
        t.drift *= slow;
      }

      sweep(t, direction);

      // Broader as the head swings round to the front, and thinner while reeling in.
      const front = clamp(Math.cos(t.angle), 0, 1);
      const grow = easeOutCubic(Math.min(t.age / RIBBON.grow, 1));
      t.size = t.width * 1.55 * (0.78 + 0.22 * front) * grow * (1 - 0.8 * smoothstep(0, 1, t.reel));
      t.opacity = smoothstep(0, RIBBON.fade, t.age);
    }
    // A ribbon only reaches 1 while reeling in, so this drops exactly the spent ones.
    trails = trails.filter((t) => t.reel < 1);
  }

  function clear(): void {
    particles = [];
    trails = [];
    launches = [];
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

/** Opacity over a piece's life: in at once, held, then out over its second half. */
export function particleOpacity(p: Particle): number {
  const t = clamp(p.age / p.life, 0, 1);
  return Math.min(t / 0.06, 1) * (1 - smoothstep(0.5, 1, t));
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

/** Paper shrinks a little as it falls, faster near the end. */
export function particleSize(p: Particle): number {
  const t = clamp(p.age / p.life, 0, 1);
  return p.size * (1 - 0.3 * t * t);
}
