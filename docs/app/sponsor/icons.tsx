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

/** The brands' own marks, filled in their own colours rather than outlined in `currentColor`. */
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

/** A green rounded square with two white speech bubbles, each with two eyes. */
export const WeChatIcon = () =>
  brand(
    <>
      <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="#07C160" />
      <path
        d="M9.6 5.4c-3.1 0-5.6 2.06-5.6 4.6 0 1.45.82 2.75 2.1 3.6l-.55 1.95 2.25-1.2c.58.16 1.18.25 1.8.25 3.1 0 5.6-2.06 5.6-4.6S12.7 5.4 9.6 5.4z"
        fill="#fff"
      />
      <path
        d="M15.6 10.7c2.43 0 4.4 1.66 4.4 3.7 0 1.13-.6 2.14-1.56 2.82l.42 1.48-1.75-.93c-.47.14-.98.33-1.51.33-2.43 0-4.4-1.66-4.4-3.7s1.97-3.7 4.4-3.7z"
        fill="#fff"
        stroke="#07C160"
        strokeWidth="1.2"
      />
      <g fill="#07C160">
        <circle cx="7.7" cy="8.7" r="0.8" />
        <circle cx="11.5" cy="8.7" r="0.8" />
        <circle cx="14.1" cy="13.6" r="0.62" />
        <circle cx="17.1" cy="13.6" r="0.62" />
      </g>
    </>,
  );

/** The QQ penguin: black, with a white belly and eyes, a yellow beak and feet and a red scarf. */
export const QQIcon = () =>
  brand(
    <>
      <g fill="#111" stroke="#fff" strokeWidth="0.5">
        <ellipse cx="5.9" cy="14.6" rx="1.3" ry="3" transform="rotate(28 5.9 14.6)" />
        <ellipse cx="18.1" cy="14.6" rx="1.3" ry="3" transform="rotate(-28 18.1 14.6)" />
        <ellipse cx="12" cy="12.4" rx="6" ry="8.6" />
      </g>
      <ellipse cx="12" cy="15.4" rx="4.2" ry="5.2" fill="#fff" />
      <path d="M6.5 11.9q5.5 2.5 11 0l.35 1.7q-5.85 2.7-11.7 0z" fill="#EB1923" />
      <path d="M14.4 13.5l1.2 3.7 1.9-.8-.9-3.6z" fill="#EB1923" />
      <ellipse cx="10.1" cy="7.7" rx="1.25" ry="1.7" fill="#fff" />
      <ellipse cx="13.9" cy="7.7" rx="1.25" ry="1.7" fill="#fff" />
      <ellipse cx="10.4" cy="8" rx="0.6" ry="0.85" fill="#111" />
      <ellipse cx="13.6" cy="8" rx="0.6" ry="0.85" fill="#111" />
      <ellipse cx="12" cy="10.5" rx="2.2" ry="1.05" fill="#FAAB07" />
      <ellipse cx="9.3" cy="21.2" rx="2.5" ry="0.95" fill="#FAAB07" />
      <ellipse cx="14.7" cy="21.2" rx="2.5" ry="0.95" fill="#FAAB07" />
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
