import { useEffect, useState } from 'react';

/**
 * Turns the default navbar into a floating capsule.
 *
 * This component renders nothing visible. It only tracks scroll depth and
 * writes an attribute on the document, which the stylesheet uses to restyle
 * the real navbar. Reshaping the existing bar with CSS keeps every behaviour
 * already wired into it; building a replacement would mean rebuilding the
 * search shortcut, the mobile drawer and the locale switcher too.
 */
export function CapsuleNav() {
  const [condensed, setCondensed] = useState(false);

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.siteNav = condensed ? 'condensed' : 'rest';
    return () => {
      delete document.documentElement.dataset.siteNav;
    };
  }, [condensed]);

  return null;
}
