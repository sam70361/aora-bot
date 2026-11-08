import { useState } from 'react';
import { useI18n, useLocalized } from '../shared/i18n.js';
import { useLocalePath } from '../shared/locale-path.js';
import { useNearVisible } from '../shared/Radio.js';
import { CardStill } from './CardStill.js';
import { ALBUMS, useAlbum, type AlbumEntry } from './catalog.js';
import { lookFor, lookStyle } from './looks/index.js';
import { Art, CardBack, CoverTitle, Pattern, Seal } from './parts.js';
import { ShelfWall } from './walls/ShelfWall.js';

/** How many members a booklet's window shows: the first of the theme's cast, the second one in front. */
const WINDOW_SIZE = 3;

/** The size a window's stills are drawn at; the shelf's wall shows the same stills. */
const WINDOW_PX = 160;

/** How many card backs fan out beside the shelf's title. */
const FAN_SIZE = 3;

/**
 * The exhibition's front page, `/themes/`: one booklet per theme the engine
 * ships, in manifest order, and a fan of their card backs, in front of a wall
 * of the members the booklets show.
 */
export function ThemeShelf() {
  const t = useI18n();
  const text = useLocalized();

  return (
    <div className="site-themes">
      <header className="site-themes__intro">
        <ShelfWall members={WINDOW_SIZE} sizePx={WINDOW_PX} />
        <div className="site-themes__introText">
          <p className="site-themes__eyebrow">{t('themes.eyebrow')}</p>
          <h1 className="site-themes__title">{t('themes.shelf.title')}</h1>
          <p className="site-themes__lede">{t('themes.shelf.lede')}</p>
        </div>
        <span className="site-themes__fan" aria-hidden="true">
          {ALBUMS.slice(0, FAN_SIZE).map((album) => {
            const look = lookFor(album.id);
            return (
              <span key={album.id} className="site-themes__fanCard" style={lookStyle(look)}>
                <CardBack look={look} name={text.pick(album.name)} />
              </span>
            );
          })}
        </span>
      </header>
      <ol className="site-themes__shelf" aria-label={t('themes.shelf.title')}>
        {ALBUMS.map((album) => (
          <li key={album.id} className="site-themes__slot">
            <Booklet album={album} />
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * A theme's booklet: its cloth and pattern, a bound spine, the corner
 * ornament, the seal and volume, the name, and a window onto its first
 * members. The theme loads when the booklet nears the screen; until then the
 * window holds empty boxes of the same size.
 */
function Booklet({ album }: { album: AlbumEntry }) {
  const t = useI18n();
  const text = useLocalized();
  const path = useLocalePath();
  const look = lookFor(album.id);
  const [box, setBox] = useState<HTMLAnchorElement | null>(null);
  const near = useNearVisible(box, '240px 0px');
  const loaded = useAlbum(album.id, near);
  const shown = loaded?.cards.slice(0, WINDOW_SIZE) ?? [];
  const volume = String(album.volume).padStart(2, '0');

  return (
    <a
      ref={setBox}
      href={path(`/themes/${album.id}`)}
      className="site-themes__booklet"
      data-stitch={look.spine.stitch}
      style={lookStyle(look)}
    >
      <Pattern look={look} />
      <span className="site-themes__spine" aria-hidden="true" />
      <Art markup={look.deco} viewBox="0 0 120 120" className="site-themes__deco" />
      <span className="site-themes__bookletTop">
        <Seal look={look} />
        <span className="site-themes__volume">{t('themes.vol', { n: volume })}</span>
      </span>
      <span className="site-themes__bookletName">
        <CoverTitle
          text={text.pick(album.name)}
          look={look}
          placement="booklet"
          className="site-themes__display"
        />
        <span className="site-themes__gloss">{text.other(album.name)}</span>
      </span>
      <span className="site-themes__window" aria-hidden="true">
        {Array.from({ length: WINDOW_SIZE }, (_, i) => {
          const card = shown[i];
          return (
            <span key={i} className="site-themes__windowSlot" data-slot={i}>
              {card ? <CardStill card={card} state={card.preset.state} sizePx={WINDOW_PX} /> : null}
            </span>
          );
        })}
      </span>
      <span className="site-themes__bookletFoot">
        <span className="site-themes__count">
          {loaded ? t('themes.count', { count: String(loaded.cards.length) }) : ''}
        </span>
        <span className="site-themes__open">{t('themes.open')}</span>
      </span>
      <span className="site-themes__foilCorner site-themes__foilCorner--top" aria-hidden="true" />
      <span className="site-themes__foilCorner site-themes__foilCorner--bottom" aria-hidden="true" />
    </a>
  );
}
