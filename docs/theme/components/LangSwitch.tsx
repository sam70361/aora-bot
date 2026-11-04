import { removeBase, useLang, useLocation, useNavigate, withBase } from '@rspress/core/runtime';

/** The same page in the other language: Chinese at the root, English under `/en/`. */
const counterpart = (pathname: string, toEnglish: boolean): string => {
  const rest = removeBase(pathname).replace(/^\/en(?=\/|$)/, '') || '/';
  return withBase(toEnglish ? `/en${rest}` : rest);
};

/**
 * The navbar's language control: a switch with both languages engraved in its
 * track and the current one raised on the thumb. It replaces Rspress's
 * language menu, which two languages do not need.
 */
export function LangSwitch() {
  const english = useLang() === 'en';
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={english}
      aria-label="English"
      title={english ? '切换到简体中文' : 'Switch to English'}
      className="site-lang"
      onClick={() => navigate(counterpart(pathname, !english) + search + hash)}
    >
      <span className="site-lang__mark" aria-hidden="true">
        中
      </span>
      <span className="site-lang__mark" aria-hidden="true">
        EN
      </span>
      <span className="site-lang__thumb" aria-hidden="true">
        {english ? 'EN' : '中'}
      </span>
    </button>
  );
}
