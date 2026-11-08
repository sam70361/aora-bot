import type { ReactNode } from 'react';

/** Outline icons on a 24px grid, drawn in `currentColor`; `sponsor.css` gives them their stroke. */
const icon = (className: string, children: ReactNode) => (
  <svg className={`site-sponsor__icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

/** A cup on its saucer with a heart on the front; the three wisps of steam rise in turn. */
export const CoffeeIcon = () =>
  icon(
    'site-sponsor__icon--coffee',
    <>
      <path className="site-sponsor__steam" d="M8.2 2.8c-.9 1 .9 2 0 3" />
      <path className="site-sponsor__steam" d="M11 2.3c-.9 1 .9 2 0 3" />
      <path className="site-sponsor__steam" d="M13.8 2.8c-.9 1 .9 2 0 3" />
      <path d="M4.5 9h13v4.5a5.5 5.5 0 0 1-5.5 5.5h-2a5.5 5.5 0 0 1-5.5-5.5z" />
      <path d="M17.5 10.5h1a2.75 2.75 0 0 1 0 5.5h-1.4" />
      <path d="M3.5 21.2h15" />
      <path
        d="M11 15.9c-1.6-1-2.4-1.9-2.4-2.8a1.2 1.2 0 0 1 2.4-.3a1.2 1.2 0 0 1 2.4.3c0 .9-.8 1.8-2.4 2.8z"
        fill="currentColor"
        stroke="none"
      />
    </>,
  );

export const HeartIcon = () =>
  icon(
    'site-sponsor__icon--heart',
    <path
      d="M12 19.5s-7-4.3-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.1c0 5.1-7 9.4-7 9.4z"
      fill="currentColor"
      stroke="none"
    />,
  );

/** A speech bubble with three dots. */
export const ChatIcon = () =>
  icon(
    'site-sponsor__icon--chat',
    <>
      <path d="M7.5 4h9A2.5 2.5 0 0 1 19 6.5v6a2.5 2.5 0 0 1-2.5 2.5h-5l-4 3.5V15A2.5 2.5 0 0 1 5 12.5v-6A2.5 2.5 0 0 1 7.5 4z" />
      <g fill="currentColor" stroke="none">
        <circle cx="9" cy="9.5" r="1" />
        <circle cx="12" cy="9.5" r="1" />
        <circle cx="15" cy="9.5" r="1" />
      </g>
    </>,
  );

/** A contact card: a person on the left, two lines of details on the right. */
export const CrmIcon = () =>
  icon(
    'site-sponsor__icon--crm',
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <circle cx="9" cy="10.5" r="2" />
      <path d="M5.8 16a3.4 3.4 0 0 1 6.4 0M14.5 10h3.5M14.5 13.5h2.5" />
    </>,
  );

/** Two people, one behind the other. */
export const GroupIcon = () =>
  icon(
    'site-sponsor__icon--group',
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 19.5a6.5 6.5 0 0 1 13 0" />
      <path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M18 14.2a6.5 6.5 0 0 1 3.5 5.3" />
    </>,
  );

export const PlusIcon = () => icon('site-sponsor__icon--plus', <path d="M12 6v12M6 12h12" />);

/** A chip with its pins out and a small face on the die. */
export const BoardIcon = () =>
  icon(
    'site-sponsor__icon--board',
    <>
      <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" />
      <path d="M9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3" />
      <path d="M10.4 13.6q1.6 1.2 3.2 0" />
      <g fill="currentColor" stroke="none">
        <circle cx="10.3" cy="10.8" r="0.8" />
        <circle cx="13.7" cy="10.8" r="0.8" />
      </g>
    </>,
  );

/** Two four-pointed sparkles. */
export const AgentIcon = () =>
  icon(
    'site-sponsor__icon--agent',
    <>
      <path d="M10 3.5Q10.9 8.6 16 9.5Q10.9 10.4 10 15.5Q9.1 10.4 4 9.5Q9.1 8.6 10 3.5Z" />
      <path d="M17 13.5Q17.5 16 20 16.5Q17.5 17 17 19.5Q16.5 17 14 16.5Q16.5 16 17 13.5Z" />
    </>,
  );

/** A terminal with a prompt and a cursor. */
export const TerminalIcon = () =>
  icon(
    'site-sponsor__icon--terminal',
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M7 10l2.5 2L7 14M12 14h4.5" />
    </>,
  );

/** A mortarboard with its tassel. */
export const CapIcon = () =>
  icon(
    'site-sponsor__icon--cap',
    <>
      <path d="M12 5L2.5 9.5L12 14l9.5-4.5z" />
      <path d="M6.5 11.6v3.9c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-3.9M21.5 9.5v5" />
    </>,
  );

/** A cloud with an arrow going up into it. */
export const CloudIcon = () =>
  icon(
    'site-sponsor__icon--cloud',
    <>
      <path d="M7.5 18.5H7a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 17.8 8.6a4.5 4.5 0 0 1-.3 9.9h-1" />
      <path d="M12 20.5v-7M9.5 15.5l2.5-2.5 2.5 2.5" />
    </>,
  );

export const ArrowIcon = () => icon('site-sponsor__icon--arrow', <path d="M5 12h14M13 6l6 6-6 6" />);

/** A pen, nib down. */
export const PenIcon = () =>
  icon(
    'site-sponsor__icon--pen',
    <>
      <path d="M15.5 4.5l4 4L9 19H5v-4z" />
      <path d="M13 7l4 4" />
    </>,
  );

/** The payment brands' own marks, filled in their own colours rather than outlined in `currentColor`. */
const brand = (children: ReactNode) => (
  <svg className="site-sponsor__brand" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

/** A green speech bubble with a white tick. */
export const WeChatPayIcon = () =>
  brand(
    <>
      <path
        d="M12 2C6.2 2 1.5 5.9 1.5 10.7c0 2.7 1.5 5.1 3.8 6.7L4.6 21.6l4.3-2.6c1 .3 2 .4 3.1.4 5.8 0 10.5-3.9 10.5-8.7S17.8 2 12 2z"
        fill="#07C160"
      />
      <path d="M5.8 9.6l1.5-.7 2.9 2.6 9.6-5.4.5.7-10 7.6z" fill="#fff" />
    </>,
  );

/** A blue rounded square with the white 支 of its name. */
export const AlipayIcon = () =>
  brand(
    <>
      <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="#1677FF" />
      <path
        d="M12 4.6V9M6.8 7.2h10.4M7.6 10.4h8Q13.8 15.6 9.6 17.3Q6.6 18.4 6.3 16.4Q6.1 14.4 9.3 14.2Q13 14 21 17.6"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>,
  );

/** A hub: one node in the middle, four around it. */
export const HubIcon = () =>
  icon(
    'site-sponsor__icon--hub',
    <>
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="5.5" cy="6" r="1.8" />
      <circle cx="18.5" cy="6" r="1.8" />
      <circle cx="5.5" cy="18" r="1.8" />
      <circle cx="18.5" cy="18" r="1.8" />
      <path d="M10.2 10.3L6.8 7.2M13.8 10.3l3.4-3.1M10.2 13.7l-3.4 3.1M13.8 13.7l3.4 3.1" />
    </>,
  );
