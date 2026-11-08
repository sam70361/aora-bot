import type { ReactNode } from 'react';

/** Outline icons on a 24px grid, drawn in `currentColor`; the stylesheet gives them their stroke. */
const icon = (children: ReactNode) => (
  <svg className="site-icon" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

export const ArrowIcon = () => icon(<path d="M5 12h13M13 6l6 6-6 6" />);
export const PrevIcon = () => icon(<path d="M15 6l-6 6 6 6" />);
export const NextIcon = () => icon(<path d="M9 6l6 6-6 6" />);
export const CopyIcon = () =>
  icon(
    <>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
    </>,
  );
export const PlayIcon = () => icon(<path d="M8 5.5v13l10.5-6.5z" />);
export const PauseIcon = () => icon(<path d="M8.5 5.5v13M15.5 5.5v13" />);
export const CheckIcon = () => icon(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const CloseIcon = () => icon(<path d="M6 6l12 12M18 6L6 18" />);
export const LinkIcon = () =>
  icon(
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>,
  );
export const TuneIcon = () =>
  icon(
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>,
  );
/** A die seen from above a corner: lit top, shaded sides, and the pips foreshortened onto each face. */
export const DiceIcon = () =>
  icon(
    <g className="site-icon__dice">
      <path className="site-icon__dice-left" d="M4.2 7.5L12 12v9l-7.8-4.5z" />
      <path className="site-icon__dice-right" d="M19.8 7.5L12 12v9l7.8-4.5z" />
      <path className="site-icon__dice-top" d="M12 3l7.8 4.5L12 12 4.2 7.5z" />
      <g fill="currentColor" stroke="none">
        <ellipse cx="12" cy="7.5" rx="1.7" ry="1" />
        <ellipse cx="6.6" cy="11.6" rx="0.9" ry="1.2" transform="rotate(-30 6.6 11.6)" />
        <ellipse cx="9.6" cy="17" rx="0.9" ry="1.2" transform="rotate(-30 9.6 17)" />
        <ellipse cx="14" cy="13.1" rx="0.85" ry="1.15" transform="rotate(30 14 13.1)" />
        <ellipse cx="15.9" cy="14.3" rx="0.85" ry="1.15" transform="rotate(30 15.9 14.3)" />
        <ellipse cx="17.8" cy="15.4" rx="0.85" ry="1.15" transform="rotate(30 17.8 15.4)" />
      </g>
    </g>,
  );
