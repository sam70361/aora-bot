import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

/*
 * The appearance switch's two icons, on the site's 24px outline grid. Rspress
 * hands them `fill="currentColor"` for its own solid glyphs; these are drawn
 * in stroke, so that fill is dropped.
 */
const outline = ({ fill: _fill, ...props }: IconProps): IconProps => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  ...props,
});

const RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const [x, y] = [Math.sin(a), -Math.cos(a)];
  const at = (r: number) => `${(12 + x * r).toFixed(2)} ${(12 + y * r).toFixed(2)}`;
  return `M${at(7.4)}L${at(9.2)}`;
}).join('');

export const IconSun = (props: IconProps) => (
  <svg {...outline(props)}>
    <circle cx="12" cy="12" r="4.2" />
    <path d={RAYS} />
  </svg>
);

/** A crescent, a circle of radius 8 with a bite of radius 6.6, and a small star in the bite. */
export const IconMoon = (props: IconProps) => (
  <svg {...outline(props)}>
    <path d="M19.37 13.92A8 8 0 1 1 10.08 4.63A6.6 6.6 0 0 0 19.37 13.92Z" />
    <path
      d="M18 2.9Q18.35 4.65 20.1 5Q18.35 5.35 18 7.1Q17.65 5.35 15.9 5Q17.65 4.65 18 2.9Z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);
