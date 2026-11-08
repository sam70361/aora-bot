/**
 * A white eye behind two lids, shared by the faces built on it (`droopy`,
 * `pie`).
 *
 * The white is an ellipse about the eye's centre. The upper lid is a curve
 * at `lidY`, sloped by `lidA` (positive drops towards the nose) and bowed by
 * `upK`; the lower lid is a curve at `lowY` that `lowK` pushes up in the
 * middle. Everything the lids leave open shows white, with a pupil in it.
 * A shut eye is a lash line. Lengths are dot radii, before the eye's `sc`.
 */
import type { Point } from '../../core/types.js';
import {
  bandRing,
  convexBand,
  ellipseBand,
  lidBand,
  meet,
  place,
  quad,
  ribbon,
  starRing,
  dropRing,
} from './geometry.js';
import { clockOf, insideRuns, LayerList, shutness, unit } from './reading.js';
import type { DrawnEye, EyeContext, FaceLayer } from './types.js';

/** Where a lid that is out of the way sits: above or below the white. */
export const LID_NONE = 2.1;

export interface LidEyeConfig {
  /** Half-width of the white. */
  rx: number;
  /** Height of the white over its width. */
  tall: number;
  /**
   * Whether the heavy outline is part of the look. Otherwise the rim is a hairline that a coarse
   * renderer may leave out rather than let it swallow a small white.
   */
  outlined?: boolean;
  /** Stroke weights of the rim, the lid lines and the shut lash. */
  rim: number;
  lid: number;
  lash: number;
  /** Stroke weight of an x drawn in the white. */
  cross: number;
  /** Where both lids meet when the eye blinks shut. */
  shut: number;
  /** Bags under the eyes, shown by the `bag` field. */
  bag?: boolean;
  /** A wedge cut from the pupil for its highlight. */
  wedge?: boolean;
  /** Lashes on the shut line. */
  ticks?: boolean;
}

export type LidField =
  | 'lidY'
  | 'lidA'
  | 'upK'
  | 'lowY'
  | 'lowK'
  | 'px'
  | 'py'
  | 'pr'
  | 'pt'
  | 'sc'
  | 'cross'
  | 'star'
  | 'markR'
  | 'bag'
  | 'sweat';

export const LID_REST: DrawnEye<LidField> = {
  lidY: -LID_NONE,
  lidA: 0,
  upK: 0,
  lowY: LID_NONE,
  lowK: 0,
  px: 0,
  py: 0,
  pr: 0.5,
  pt: 1,
  sc: 1,
  cross: 0,
  star: 0,
  markR: 0.5,
  bag: 0,
  sweat: 0,
};

/** Lids for an open eye `open` of the way open: the upper lid from `rest` down to `shut`, the lower lid rising once it is past halfway. */
export function blinkLids(
  open: number,
  rest: number,
  shut: number,
): Pick<DrawnEye<LidField>, 'lidY' | 'lowY'> {
  return {
    lidY: rest + (1 - open) * (shut - rest),
    lowY: LID_NONE - unit((0.6 - open) / 0.6) * (LID_NONE - shut),
  };
}

/** Gap between the lids, at the middle, below which the eye reads as shut. */
const SHUT_GAP = 0.3;
/** The pupil's wedge: where it points (radians, on the left eye) and half its angle. */
const WEDGE = { at: -0.95, half: 0.74 } as const;
/** Share of the gaze the pupil follows. */
const PUPIL_GAZE = 0.5;

/** The builder for a lid eye of this configuration. */
export function lidEye(cfg: LidEyeConfig): (spec: DrawnEye<LidField>, ctx: EyeContext) => FaceLayer[] {
  return (s, ctx) => {
    // A blink closes whatever lids the expression has: the upper one comes down, the lower one rises past halfway.
    const blink = unit(ctx.blink);
    const lidY = cfg.shut + (s.lidY - cfg.shut) * blink;
    const lowY = s.lowY > cfg.shut ? s.lowY - unit((0.6 - blink) / 0.6) * (s.lowY - cfg.shut) : s.lowY;
    const rx = cfg.rx * s.sc;
    const ry = rx * cfg.tall;
    const bowl = (x: number): number => 1 - Math.min(1, (x / rx) ** 2);
    const top = (x: number): number => lidY + Math.tan(s.lidA) * x + s.upK * bowl(x);
    const low = (x: number): number => Math.max(lowY - s.lowK * bowl(x), top(x));
    const white = meet(ellipseBand(0, 0, rx, ry), lidBand(top, low));
    const whiteRing = bandRing(white);
    const shut = shutness(low(0) - top(0), SHUT_GAP);
    const w = ctx.weight;

    const out = new LayerList();
    out.add('face', [whiteRing], 1, { plate: true });

    const prx = s.pr;
    const pry = s.pr * s.pt;
    const gx = s.px + ctx.look[0] * PUPIL_GAZE;
    const gy = s.py + ctx.look[1] * PUPIL_GAZE;
    const nx = gx / Math.max(0.01, rx - prx - 0.1);
    const ny = gy / Math.max(0.01, ry - pry - 0.1);
    const k = Math.hypot(nx, ny) > 1 ? 1 / Math.hypot(nx, ny) : 1;
    const px = gx * k;
    const py = gy * k;
    const markless = 1 - unit(s.cross + s.star);
    out.add('pupil', [bandRing(meet(white, ellipseBand(px, py, prx, pry)))], markless);
    if (cfg.wedge) {
      // Both highlights face the same way on screen, so the right eye takes the mirrored angle.
      const mid = ctx.nose === 1 ? WEDGE.at : Math.PI - WEDGE.at;
      const fan: Point[] = [[px, py]];
      for (let i = 0; i <= 8; i++) {
        const a = mid - WEDGE.half + (2 * WEDGE.half * i) / 8;
        fan.push([px + Math.cos(a) * prx * 1.05, py + Math.sin(a) * pry * 1.05]);
      }
      out.add('face', [bandRing(meet(white, ellipseBand(px, py, prx, pry), convexBand(fan)))], markless);
    }

    const markY = s.py * 0.5;
    const r = s.markR;
    out.add(
      'pupil',
      [
        ribbon(
          [
            [-r, markY - r],
            [r, markY + r],
          ],
          (cfg.cross / 2) * w,
        ),
        ribbon(
          [
            [r, markY - r],
            [-r, markY + r],
          ],
          (cfg.cross / 2) * w,
        ),
      ],
      s.cross,
    );
    const star = place(starRing(r, 0.46), 0, markY);
    out.add('gold', [star], s.star);
    out.add('pupil', [ribbon(star, 0.06 * w, true)], s.star);

    if (whiteRing)
      out.add('feature', [ribbon(whiteRing, (cfg.rim / 2) * w, true)], 1 - shut, { detail: !cfg.outlined });
    const lids = insideRuns(top, rx, ry, false).concat(
      lowY < LID_NONE - 0.3 ? insideRuns(low, rx, ry, true) : [],
    );
    out.add(
      'feature',
      lids.map((run) => ribbon(run, (cfg.lid / 2) * w)),
      1 - shut,
    );

    const ly = (top(0) + low(0)) / 2;
    const reach = rx * 0.92;
    const curve = quad([-reach, ly - 0.1], [0, ly + 0.62], [reach, ly - 0.1]);
    const lash = [ribbon(curve, (cfg.lash / 2) * w)];
    if (cfg.ticks) {
      for (const t of [0.02, 0.16, 0.3]) {
        const at = curve[Math.round(t * (curve.length - 1))]!;
        lash.push(ribbon([at, [at[0] - 0.3 + t * 0.5, at[1] + 0.3 - t * 0.2]], (cfg.lash / 2) * w));
      }
    }
    out.add('feature', lash, shut);

    if (cfg.bag) {
      const bag = quad([-rx * 0.62, ry + 0.22], [0, ry + 0.55], [rx * 0.62, ry + 0.22]);
      out.add('feature', [ribbon(bag, 0.05 * w)], s.bag * (1 - shut * 0.4) * 0.55);
    }
    if (s.sweat > 0.004) {
      const p = (clockOf(ctx) * 0.45) % 1;
      const fade = p < 0.75 ? 1 : (1 - p) / 0.25;
      const drop = place(dropRing(0.4), -rx * 0.5, -ry - 0.3 + p * 1.1);
      out.add('tear', [drop], s.sweat * fade, { loose: true });
      out.add('feature', [ribbon(drop, 0.035 * w, true)], s.sweat * fade, { loose: true });
    }
    return out.layers;
  };
}
