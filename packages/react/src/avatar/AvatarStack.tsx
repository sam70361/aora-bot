import { renderAvatarDataUrl, shapeMaskImage, type FaceStyle, type NoseId } from '@aora-bot/engine';
import type { CSSProperties } from 'react';
import { useLocale } from '../locale/index.js';
import {
  agentColor,
  agentFace,
  agentNose,
  agentShape,
  AVATAR_SIZES,
  type AgentLike,
  type AvatarSize,
} from './identity.js';
import { cx } from '../utils/cx.js';

export const STACK_MAX_VISIBLE = 3;

/** Default overlap, as a fraction of one disc. */
export const STACK_OVERLAP = 0.36;

export interface StackLayoutOptions {
  /** Fraction of a disc that each one hides of the previous. */
  overlap?: number;
  /** Reserve a slot at the end for the "+N" chip. */
  withOverflow?: boolean;
}

export interface StackLayout {
  /** Left offset of each disc, in pixels, in draw order. */
  offsets: number[];
  /** Overlap actually used, so a caller can derive the mask offset from it. */
  overlap: number;
  /** Total width of the cluster, including the overflow slot when reserved. */
  width: number;
}

/**
 * Where the discs in a cluster go.
 *
 * Pulled out of the component because the numbers are needed in places that
 * are not rendering the cluster: a popover that has to line up with the third
 * face, a row that needs the width before it lays out, a test that wants to
 * check the arithmetic without a DOM.
 */
export function layoutAvatarStack(count: number, sizePx: number, opts: StackLayoutOptions = {}): StackLayout {
  const overlap = opts.overlap ?? STACK_OVERLAP;
  const step = sizePx * (1 - overlap);
  const slots = Math.max(0, count);
  const offsets = Array.from({ length: slots }, (_, index) => step * index);
  const total = slots + (opts.withOverflow ? 1 : 0);

  return {
    offsets,
    overlap,
    // The last disc contributes its whole width; every earlier one only
    // contributes the part of it that is not hidden by its neighbour.
    width: total > 0 ? step * (total - 1) + sizePx : 0,
  };
}

export interface StackMetrics {
  sizePx: number;
  overlap: number;
  maxVisible: number;
}

/**
 * Sensible cluster proportions for each avatar size.
 *
 * Small clusters overlap harder and show fewer faces. At 16px, three discs at
 * the usual overlap are a smear; two at a tighter one still read as "a group",
 * which is all the size can carry.
 */
const STACK_METRICS: Record<AvatarSize, { overlap: number; maxVisible: number }> = {
  xs: { overlap: 0.48, maxVisible: 2 },
  sm: { overlap: 0.42, maxVisible: 3 },
  md: { overlap: STACK_OVERLAP, maxVisible: 3 },
  lg: { overlap: 0.32, maxVisible: 3 },
  xl: { overlap: 0.26, maxVisible: 4 },
};

export const stackMetrics = (size: AvatarSize): StackMetrics => ({
  sizePx: AVATAR_SIZES[size],
  ...STACK_METRICS[size],
});

const AVATAR_SIZE_IDS = Object.keys(STACK_METRICS) as AvatarSize[];

/**
 * The band an arbitrary pixel size falls in.
 *
 * Components take pixels rather than size names, so the proportions above
 * have to be reachable from a number. Nearest rather than next-one-down,
 * which would make a 34px cluster overlap as hard as a 28px one.
 */
export const stackMetricsForPx = (sizePx: number): StackMetrics =>
  stackMetrics(
    AVATAR_SIZE_IDS.reduce((best, size) =>
      Math.abs(AVATAR_SIZES[size] - sizePx) < Math.abs(AVATAR_SIZES[best] - sizePx) ? size : best,
    ),
  );

export interface Participants {
  visible: AgentLike[];
  /** How many did not fit. */
  hidden: number;
}

/** Split a membership list into the faces to draw and a count for the rest. */
export function participantsFromMembers(members: AgentLike[], max: number = STACK_MAX_VISIBLE): Participants {
  const limit = Math.max(0, max);
  const visible = members.slice(0, limit);
  return { visible, hidden: Math.max(0, members.length - visible.length) };
}

export interface AvatarStackProps {
  members: AgentLike[];
  sizePx?: number;
  /**
   * How far each disc overlaps the previous one, as a fraction of its size.
   * Defaults to the proportions for the nearest avatar size band.
   */
  overlap?: number;
  /** Show a "+N" chip when there are more members than fit. */
  showOverflow?: boolean;
  /** Faces to draw before the "+N" chip. Defaults to the size band's count. */
  maxVisible?: number;
  /** Face style for every member, overriding their identities. */
  face?: FaceStyle;
  /** Nose for every member, overriding their identities. `null` draws none. */
  nose?: NoseId | null;
  /** Stroke width multiplier for every member. */
  lineWeight?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Overlapping cluster of group members.
 *
 * Each disc punches a hole in the one behind it, using the neighbour's own
 * silhouette as a mask rather than a circle. That keeps the gap even around a
 * hexagon or a drop, where a circular cut-out would bite into the shape
 * on one side and leave a wedge on the other.
 */
export function AvatarStack({
  members,
  sizePx = 28,
  overlap,
  showOverflow = true,
  maxVisible,
  face,
  nose,
  lineWeight,
  className,
  style,
}: AvatarStackProps) {
  const { t } = useLocale();
  const band = stackMetricsForPx(sizePx);
  const { visible, hidden } = participantsFromMembers(members, maxVisible ?? band.maxVisible);
  const withOverflow = hidden > 0 && showOverflow;
  const layout = layoutAvatarStack(visible.length, sizePx, {
    overlap: overlap ?? band.overlap,
    withOverflow,
  });
  const step = sizePx * (1 - layout.overlap);

  return (
    <span className={cx('aora-stack', className)} style={{ width: layout.width, height: sizePx, ...style }}>
      {visible.map((member, index) => {
        const next = visible[index + 1];
        const cut = next ?? (withOverflow ? member : undefined);

        return (
          <span
            key={member.id}
            className="aora-stack__item"
            style={{
              left: layout.offsets[index],
              width: sizePx,
              height: sizePx,
              zIndex: visible.length - index,
              ...(cut ? holeMask(cut, sizePx, step) : null),
            }}
          >
            <img
              src={renderAvatarDataUrl(member.id, {
                shape: agentShape(member),
                color: agentColor(member),
                face: face ?? agentFace(member),
                // `=== undefined`: `null` is a request for no nose at all.
                nose: nose !== undefined ? nose : agentNose(face ? { ...member, face } : member),
                lineWeight,
              })}
              alt={member.name ?? ''}
              width={sizePx}
              height={sizePx}
            />
          </span>
        );
      })}

      {withOverflow && (
        <span
          className="aora-stack__overflow"
          role="img"
          aria-label={`${hidden} ${t('avatar.more')}`}
          style={{ left: step * visible.length, width: sizePx, height: sizePx }}
        >
          +{hidden}
        </span>
      )}
    </span>
  );
}

/**
 * Cut the next disc's silhouette out of this one.
 *
 * Two masks composited with `exclude`: the full square minus the neighbour's
 * inflated shape, offset by the overlap distance.
 */
function holeMask(next: AgentLike, sizePx: number, step: number): CSSProperties {
  const mask = shapeMaskImage({ shape: agentShape(next), sizePx, inflatePx: 8 });
  return {
    maskImage: `linear-gradient(#000, #000), ${mask}`,
    maskPosition: `0 0, ${step}px 0`,
    maskSize: `${sizePx}px ${sizePx}px, ${sizePx}px ${sizePx}px`,
    maskRepeat: 'no-repeat, no-repeat',
    maskComposite: 'exclude',
    WebkitMaskImage: `linear-gradient(#000, #000), ${mask}`,
    WebkitMaskPosition: `0 0, ${step}px 0`,
    WebkitMaskSize: `${sizePx}px ${sizePx}px, ${sizePx}px ${sizePx}px`,
    WebkitMaskRepeat: 'no-repeat, no-repeat',
    WebkitMaskComposite: 'xor',
  } as CSSProperties;
}

export interface GroupAvatarProps {
  group: AgentLike;
  sizePx?: number;
  /** Face style for every member, overriding their identities. */
  face?: FaceStyle;
  /** Nose for every member, overriding their identities. `null` draws none. */
  nose?: NoseId | null;
  /** Stroke width multiplier for every member. */
  lineWeight?: number;
  className?: string;
  style?: CSSProperties;
}

/** Convenience wrapper that reads members off a group record. */
export function GroupAvatar({
  group,
  sizePx = 28,
  face,
  nose,
  lineWeight,
  className,
  style,
}: GroupAvatarProps) {
  return (
    <AvatarStack
      members={group.members ?? []}
      sizePx={sizePx}
      face={face}
      nose={nose}
      lineWeight={lineWeight}
      className={className}
      style={style}
    />
  );
}

export { agentColor };
