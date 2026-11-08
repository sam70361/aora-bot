import { springToLinearEasing, type FaceStyle, type NoseId } from '@aora-bot/engine';
import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { cx } from '@aora-bot/react';
import { useSurfaceLocale } from '../locale/index.js';
import { CastFigure, type CastMemberSpec } from './CastFigure.js';
import type { CastStep } from './useCastScene.js';

export interface CastStageProps {
  members: readonly CastMemberSpec[];
  steps: readonly CastStep[];
  /** Which step is on screen. Drive it with `useCastScene`. */
  stepIndex?: number;
  /** Stage box. Positions are measured from its centre, so both are needed. */
  widthPx?: number;
  heightPx?: number;
  /** Default member size, for members that do not set their own. */
  sizePx?: number;
  /** How long a move takes. Also the transition duration. */
  moveMs?: number;
  /** Spring the easing is sampled from: stiffness and damping. */
  spring?: { omega: number; zeta: number };
  face?: FaceStyle;
  nose?: NoseId | null;
  lineWeight?: number;
  /** Called when a member finishes a move. Fires once per member per step. */
  onArrive?: (memberId: string, stepIndex: number) => void;
  /** Scenery: a device frame, an `PortraitSlot`, a caption. Rendered over the stage. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Several characters moving through a script together.
 *
 * The movement is a CSS transition with a `linear()` easing sampled from the
 * engine's own spring, which is the only way to get spring motion out of the
 * compositor: a real spring needs a frame loop, and a frame loop for four
 * members that are merely gliding would compete with the animation each of
 * them is already running for its face. Sampling the analytic solution gives
 * the same curve — overshoot included — for the price of a string.
 *
 * Steps are data and members are data, so a host writes its own choreography
 * and this component never learns what the scene is about.
 */
/** Hoisted so the default does not change identity between renders. */
const DEFAULT_SPRING = { omega: 13, zeta: 0.62 };

export function CastLineup({
  members,
  steps,
  stepIndex = 0,
  widthPx = 320,
  heightPx = 320,
  sizePx = 80,
  // Close to `springSettleTime` for the default spring, so the transition and
  // the curve it is sampled from finish at about the same moment.
  moveMs = 560,
  spring = DEFAULT_SPRING,
  face,
  nose,
  lineWeight,
  onArrive,
  children,
  className,
  style,
}: CastStageProps) {
  const { t } = useSurfaceLocale();
  const easing = useMemo(() => springToLinearEasing(spring.omega, spring.zeta), [spring.omega, spring.zeta]);
  const step: CastStep | undefined = steps[stepIndex];

  return (
    <div
      className={cx('aora-s-cast-lineup', className)}
      role="img"
      aria-label={t('cast.stage')}
      data-step={step?.id}
      style={{ width: widthPx, height: heightPx, ...style }}
    >
      {members.map((member) => (
        <CastFigure
          key={member.id}
          member={member}
          position={step?.positions[member.id] ?? null}
          easing={easing}
          durationMs={moveMs}
          sizePx={sizePx}
          face={face}
          nose={nose}
          lineWeight={lineWeight}
          onArrive={onArrive ? (id) => onArrive(id, stepIndex) : undefined}
        />
      ))}
      {children}
    </div>
  );
}
