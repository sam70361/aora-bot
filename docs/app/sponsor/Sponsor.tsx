import { withBase } from '@rspress/core/runtime';
import { CharacterMark, COLOR_IDS, SHAPE_IDS } from '@aora-bot/react';
import { useI18n } from '../shared/i18n.js';
import {
  AgentIcon,
  AlipayIcon,
  ArrowIcon,
  BoardIcon,
  CapIcon,
  CloudIcon,
  CoffeeIcon,
  CrmIcon,
  HeartIcon,
  HubIcon,
  PenIcon,
  PlusIcon,
  QQIcon,
  TerminalIcon,
  WeChatIcon,
  WeChatPayIcon,
} from './icons.js';

/**
 * The codes cut out of the payment cards, on white with the payee's name under
 * them; the brand is the small mark over each, so neither card floods the page
 * with its colour. `width`/`height` are the files' own pixel sizes and only
 * reserve the aspect ratio; replacing a file with a different size means
 * updating them. The files live in `docs/content/public/sponsor/`.
 */
const CODES = [
  {
    file: 'wechat-pay-code.png',
    name: 'sponsor.wechatName',
    altKey: 'sponsor.wechatAlt',
    width: 376,
    height: 420,
    Icon: WeChatPayIcon,
  },
  {
    file: 'alipay-code.png',
    name: 'sponsor.alipayName',
    altKey: 'sponsor.alipayAlt',
    width: 376,
    height: 420,
    Icon: AlipayIcon,
  },
] as const;

const CONTACTS = [
  {
    file: 'wechat-contact.jpg',
    width: 803,
    height: 1024,
    title: 'sponsor.contactTitle',
    note: 'sponsor.contactNote',
    alt: 'sponsor.contactAlt',
    Icon: WeChatIcon,
  },
  {
    file: 'qq-group.jpg',
    width: 467,
    height: 594,
    title: 'sponsor.qqTitle',
    note: 'sponsor.qqNote',
    alt: 'sponsor.qqAlt',
    Icon: QQIcon,
  },
] as const;

const AUDIENCE = [
  'sponsor.audience.frontend',
  'sponsor.audience.agent',
  'sponsor.audience.maker',
  'sponsor.audience.design',
] as const;

/** Sponsor seats, all open: the lead seat spans the row. */
const SEATS = [
  { id: 'lead', tier: 'sponsor.seatLead', lead: true },
  { id: 'second', tier: 'sponsor.seatTier', lead: false },
  { id: 'third', tier: 'sponsor.seatTier', lead: false },
] as const;

/** The kinds of sponsor the audience suits, each with the reach it gives them. */
const FITS = [
  { title: 'sponsor.fit.agent.title', text: 'sponsor.fit.agent.text', Icon: AgentIcon },
  { title: 'sponsor.fit.board.title', text: 'sponsor.fit.board.text', Icon: BoardIcon },
  { title: 'sponsor.fit.cloud.title', text: 'sponsor.fit.cloud.text', Icon: CloudIcon },
  { title: 'sponsor.fit.devtools.title', text: 'sponsor.fit.devtools.text', Icon: TerminalIcon },
  { title: 'sponsor.fit.education.title', text: 'sponsor.fit.education.text', Icon: CapIcon },
  { title: 'sponsor.fit.design.title', text: 'sponsor.fit.design.text', Icon: PenIcon },
] as const;

/** The author's other products, not open yet. Product names, so the same in every language. */
const PRODUCTS = [
  { name: 'Aora CRM', Icon: CrmIcon },
  { name: 'Aora Hub', Icon: HubIcon },
] as const;

/** Five different shapes and colours, spread over the registries; gray is left out, it reads as sulking. */
const HUES = COLOR_IDS.filter((id) => id !== 'gray');
const HAPPY = Array.from({ length: 5 }, (_, i) => ({
  shape: SHAPE_IDS[Math.floor((i * SHAPE_IDS.length) / 5)]!,
  color: HUES[(i * 2) % HUES.length]!,
}));

/**
 * 打赏作者. The two payment cards side by side, the WeChat and QQ group cards
 * under them, the open sponsor seats with the kinds of sponsor the project
 * suits, the products on the way and a row of characters having a nice time.
 * Every image carries its intrinsic size, so a late arrival moves nothing.
 */
export function Sponsor() {
  const t = useI18n();

  return (
    <div className="site-sponsor">
      <div className="site-sponsor__cast" aria-hidden="true">
        {HAPPY.map(({ shape, color }) => (
          <CharacterMark
            key={`${shape}-${color}`}
            shape={shape}
            color={color}
            state="happy"
            sizePx={52}
            autoPause
          />
        ))}
      </div>

      <h1 className="site-sponsor__title">
        {t('sponsor.title')}
        <CoffeeIcon />
      </h1>
      <div className="site-sponsor__text">
        <p className="site-sponsor__lead">{t('sponsor.lead')}</p>
        <p className="site-sponsor__note">{t('sponsor.note')}</p>
      </div>

      <div className="site-sponsor__codes">
        {CODES.map(({ file, name, altKey, width, height, Icon }) => (
          <figure key={file} className="site-sponsor__pay">
            <figcaption className="site-sponsor__pay-name">
              <Icon />
              {t(name)}
            </figcaption>
            <img
              className="site-sponsor__pay-code"
              src={withBase(`/sponsor/${file}`)}
              alt={t(altKey)}
              width={width}
              height={height}
              loading="lazy"
              decoding="async"
            />
          </figure>
        ))}
      </div>

      <p className="site-sponsor__thanks">
        <HeartIcon />
        {t('sponsor.thanks')}
      </p>

      <section id="contact" className="site-sponsor__contacts">
        {CONTACTS.map(({ file, width, height, title, note, alt, Icon }) => (
          <div key={file} className="site-sponsor__contact">
            <img
              className="site-sponsor__qr site-sponsor__qr--contact"
              src={withBase(`/sponsor/${file}`)}
              alt={t(alt)}
              width={width}
              height={height}
              loading="lazy"
              decoding="async"
            />
            <div className="site-sponsor__contact-text">
              <h2 className="site-sponsor__contact-title">
                <Icon />
                {t(title)}
              </h2>
              <p>{t(note)}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="site-sponsor__partner" aria-labelledby="site-sponsor-partner">
        <header className="site-sponsor__partner-head">
          <h2 id="site-sponsor-partner" className="site-sponsor__heading">
            {t('sponsor.partnerTitle')}
          </h2>
          <p className="site-sponsor__partner-lead">{t('sponsor.partnerLead')}</p>
          <div className="site-sponsor__audience">
            <span className="site-sponsor__audience-label">{t('sponsor.audienceLabel')}</span>
            <ul>
              {AUDIENCE.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </div>
        </header>

        <ul className="site-sponsor__seats">
          {SEATS.map(({ id, tier, lead }) => (
            <li key={id} className="site-sponsor__seat" data-lead={lead || undefined}>
              <span className="site-sponsor__seat-tier">{t(tier)}</span>
              <span className="site-sponsor__seat-mark">
                <PlusIcon />
              </span>
              <span className="site-sponsor__seat-text">{t('sponsor.seat')}</span>
            </li>
          ))}
        </ul>

        <h3 className="site-sponsor__fits-title">{t('sponsor.fitsTitle')}</h3>
        <ul className="site-sponsor__fits">
          {FITS.map(({ title, text, Icon }) => (
            <li key={title} className="site-sponsor__fit">
              <span className="site-sponsor__fit-icon">
                <Icon />
              </span>
              <div className="site-sponsor__fit-body">
                <h4 className="site-sponsor__fit-title">{t(title)}</h4>
                <p className="site-sponsor__fit-text">{t(text)}</p>
              </div>
            </li>
          ))}
        </ul>

        <footer className="site-sponsor__partner-foot">
          <a className="site-sponsor__action" href="#contact">
            {t('sponsor.partnerAction')}
            <ArrowIcon />
          </a>
          <span className="site-sponsor__partner-cta">{t('sponsor.partnerCta')}</span>
        </footer>
      </section>

      <ul className="site-sponsor__products">
        {PRODUCTS.map(({ name, Icon }) => (
          <li key={name} className="site-sponsor__product">
            <Icon />
            <span className="site-sponsor__product-name">{name}</span>
            <small>{t('sponsor.soon')}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
