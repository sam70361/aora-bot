import { Link } from '@rspress/core/theme-original';
import { useI18n } from '../../app/shared/i18n.js';
import { useLocalePath } from '../../app/shared/locale-path.js';

/**
 * The copyright line. The layout renders it once per page, in one of two
 * slots depending on the page type: below the doc column on documentation
 * pages, and below the page on the full-screen ones.
 */
export function SiteFooter() {
  const t = useI18n();
  const localePath = useLocalePath();

  return (
    <footer className="site-footer">
      <p className="site-footer__text">
        {t('footer.lead')}
        <Link className="site-footer__link" href={localePath('/guide/license')}>
          {t('footer.license')}
        </Link>
        {t('footer.tail')}
      </p>
    </footer>
  );
}
