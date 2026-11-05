import { Link } from '@rspress/core/theme-original';
import { useI18n } from '../../app/shared/i18n.js';
import { useLocalePath } from '../../app/shared/locale-path.js';

/** The copyright line at the end of every documentation page. */
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
