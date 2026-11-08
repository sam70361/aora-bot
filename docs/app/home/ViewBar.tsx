import { useI18n, type MessageKey } from '../shared/i18n.js';
import { Radio, RadioGroup } from '../shared/Radio.js';
import { HOME_VIEWS, type Backdrop, type HomeView } from './views.js';

const VIEW_NAMES: Record<HomeView, MessageKey> = {
  console: 'home.view.console',
  exhibit: 'home.view.exhibit',
};

/**
 * The view switch, and beside it the line-art switch, in one small pill.
 * Each view places it among its own controls; the choices are the page's.
 */
export function ViewBar({
  view,
  onView,
  backdrop,
  onBackdrop,
}: {
  view: HomeView;
  onView: (view: HomeView) => void;
  backdrop: Backdrop;
  onBackdrop: (backdrop: Backdrop) => void;
}) {
  const t = useI18n();
  return (
    <div className="site-home__viewbar">
      <RadioGroup label={t('home.view')} className="site-home__tabs">
        {HOME_VIEWS.map((id) => (
          <Radio
            key={id}
            value={id}
            className="site-home__tab"
            checked={id === view}
            label={t(VIEW_NAMES[id])}
            onSelect={() => onView(id)}
          >
            {t(VIEW_NAMES[id])}
          </Radio>
        ))}
      </RadioGroup>
      <label className="site-home__lineart" title={t('home.lineart.hint')}>
        <input
          type="checkbox"
          role="switch"
          className="site-home__switch"
          checked={backdrop === 'lineart'}
          onChange={(event) => onBackdrop(event.target.checked ? 'lineart' : 'wall')}
        />
        {t('home.lineart')}
      </label>
    </div>
  );
}
