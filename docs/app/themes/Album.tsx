import { getInkColorCss, useLabel } from '@aora-bot/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useI18n, useLocalized } from '../shared/i18n.js';
import { DiceIcon, PrevIcon } from '../shared/icons.js';
import { useLocalePath } from '../shared/locale-path.js';
import { useLocationSearch } from '../shared/location.js';
import { useNearVisible } from '../shared/Radio.js';
import { decodeShare, shareUrl } from '../shared/share.js';
import { CardDialog, CardSheet, cardNumber, type Opened } from './CardDialog.js';
import { CardStill } from './CardStill.js';
import { ALBUMS, albumEntry, useAlbum, type Album, type ThemeCard } from './catalog.js';
import { lookFor, lookStyle, type ThemeLook } from './looks/index.js';
import { Art, CardFace, CoverTitle, Seal, useTilt } from './parts.js';
import { StickerWall } from './walls/StickerWall.js';

/** Pockets on one binder page: two rows of five on a wide screen. */
const PAGE_SIZE = 10;

/** The column counts the pockets are laid out in, widest screen first (`.site-themes__pockets`). */
const POCKET_COLUMNS = [5, 4, 3, 2] as const;

/**
 * The empty sleeves after a page's `count` cards: one for each place left in
 * its last row, at any of the column counts, each with its place on the page
 * and the counts it is there for, so the stylesheet shows the ones that
 * finish the row it is in.
 */
const emptySleeves = (count: number): { place: number; fills: string }[] =>
  Array.from(
    { length: Math.max(...POCKET_COLUMNS.map((c) => Math.ceil(count / c) * c - count)) },
    (_, i) => ({
      place: count + i,
      fills: POCKET_COLUMNS.filter((c) => count + i < Math.ceil(count / c) * c).join(' '),
    }),
  );

/** The size a card's still is drawn at; the sticker wall draws its stickers at the same size, so they share stills. */
const CARD_PX = 192;

/** The card a share link names, by the body it draws, in a state the theme offers. */
function linkedCard(album: Album, query: string): Opened | null {
  const shared = decodeShare(new URLSearchParams(query).get('s'));
  if (!shared) return null;
  const index = album.cards.findIndex((card) => card.preset.shape === shared.shape);
  if (index < 0) return null;
  const offered = album.stateGroups.some((group) => group.states.includes(shared.state));
  return { index, state: offered ? shared.state : album.defaultState, reveal: 0 };
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * A theme's album, `/themes/<id>`: the other albums, a header in the theme's
 * sky with its scene and title, a sticker wall of its members on its cloth,
 * then every member as a card in a sleeve on binder pages. A card opens its dialog, the draw button deals one at random,
 * and a `?s=` share link opens the page on one.
 *
 * The shell is static: the names come from the manifest and the pockets are
 * counted from it. The theme loads on the client and its stills fill the
 * pockets they were given; a member the theme borrows from the core adds a
 * pocket at the end of the last page, below everything else.
 */
export function ThemeAlbum({ id }: { id: string }) {
  const t = useI18n();
  const text = useLocalized();
  const label = useLabel();
  const entry = albumEntry(id);
  const look = lookFor(id);
  const album = useAlbum(id);
  const query = useLocationSearch();
  const [opened, setOpened] = useState<Opened | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const draws = useRef(0);

  // A share link opens its card once the album is in. Read once: the address then follows the dialog.
  const [linked, setLinked] = useState(false);
  if (album && !linked) {
    setLinked(true);
    const card = linkedCard(album, query);
    if (card) setOpened(card);
  }

  // The address follows the open card, so it can be copied or reloaded; closing returns it to the album.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!album) return;
    const card = opened ? album.cards[opened.index] : undefined;
    if (card && opened) {
      history.replaceState(history.state, '', shareUrl({ ...card.preset, state: opened.state }));
    } else if (wasOpen.current) {
      const url = new URL(window.location.href);
      url.searchParams.delete('s');
      history.replaceState(history.state, '', url);
    }
    wasOpen.current = !!card;
  }, [album, opened]);

  const open = (index: number, from: HTMLElement) => {
    if (!album) return;
    opener.current = from;
    setOpened({ index, state: album.defaultState, reveal: 0 });
  };

  const draw = (from: HTMLElement) => {
    if (!album || album.cards.length === 0) return;
    const count = album.cards.length;
    const last = opened?.index ?? -1;
    const pick = Math.floor(Math.random() * (count > 1 && last >= 0 ? count - 1 : count));
    opener.current = from;
    draws.current += 1;
    setOpened({
      index: last >= 0 && pick >= last ? pick + 1 : pick,
      state: album.defaultState,
      reveal: draws.current,
    });
  };

  const count = album?.cards.length ?? entry?.cards.length ?? 0;
  const pages = Array.from({ length: Math.ceil(count / PAGE_SIZE) }, (_page, page) =>
    Array.from({ length: Math.min(PAGE_SIZE, count - page * PAGE_SIZE) }, (_slot, i) => page * PAGE_SIZE + i),
  );

  if (!entry) return null;
  const name = text.pick(entry.name);

  return (
    <div className="site-themes site-themes--album">
      <AlbumSwitch current={id} />

      <header className="site-themes__cover" style={lookStyle(look)}>
        <span className="site-themes__scene" aria-hidden="true">
          <Art
            markup={look.scene.layers.join('')}
            viewBox="0 0 1440 360"
            preserve="xMaxYMax slice"
            className="site-themes__sceneArt"
          />
        </span>
        <div className="site-themes__coverText">
          <p className="site-themes__kicker">
            <Seal look={look} />
            {t('themes.album.vol', { n: pad(entry.volume) })}
          </p>
          <h1 className="site-themes__coverTitle">
            <CoverTitle text={name} look={look} placement="header" className="site-themes__display" />
          </h1>
          <p className="site-themes__gloss">{text.other(entry.name)}</p>
          <p className="site-themes__tagline">{text.pick(look.tagline)}</p>
          <div className="site-themes__facts">
            <span className="site-themes__fact">
              {album ? t('themes.count', { count: String(album.cards.length) }) : ''}
            </span>
            <ul className="site-themes__inks" aria-label={t('themes.inks')}>
              {(album?.colors ?? []).map((color) => (
                <li
                  key={color}
                  className="site-themes__ink"
                  title={label.color(color) || color}
                  style={{ '--site-ink': getInkColorCss(color) } as CSSProperties}
                />
              ))}
            </ul>
          </div>
          <div className="site-themes__coverActions">
            <button
              type="button"
              className="site-themes__draw"
              aria-haspopup="dialog"
              disabled={!album}
              onClick={(event) => draw(event.currentTarget)}
            >
              <DiceIcon />
              {t('themes.draw')}
            </button>
          </div>
        </div>
      </header>

      <StickerWall id={id} album={album} count={count} look={look} sizePx={CARD_PX} />

      <section
        className="site-themes__binder"
        aria-labelledby="site-themes-cards"
        data-ring={look.binder.ring}
        style={lookStyle(look)}
      >
        <h2 id="site-themes-cards" className="site-home__sr">
          {t('themes.cards')}
        </h2>
        {pages.map((page, p) => (
          <div key={page[0]} className="site-themes__page">
            <p className="site-themes__pageHead">
              <span className="site-themes__pageNo">{t('themes.page', { n: String(p + 1) })}</span>
              <span className="site-themes__pageRange">
                {cardNumber(page[0]!)} – {cardNumber(page[page.length - 1]!)}
              </span>
            </p>
            <ol className="site-themes__pockets" start={page[0]! + 1}>
              {page.map((index) => (
                <li key={index} className="site-themes__pocket">
                  <Card
                    card={album?.cards[index]}
                    index={index}
                    total={album ? pad(album.cards.length) : undefined}
                    look={look}
                    onOpen={open}
                  />
                </li>
              ))}
              {emptySleeves(page.length).map(({ place, fills }) => (
                <li
                  key={`empty-${place}`}
                  className="site-themes__pocket"
                  data-empty={fills}
                  aria-hidden="true"
                >
                  <span className="site-themes__sleeve">
                    <Seal look={look} className="site-themes__seal--sleeve" />
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>

      {album ? <Warmup album={album} look={look} name={name} /> : null}

      <CardDialog
        album={album}
        look={look}
        themeName={name}
        opened={opened}
        onChange={setOpened}
        onClose={() => {
          setOpened(null);
          opener.current?.focus({ preventScroll: true });
        }}
      />
    </div>
  );
}

/**
 * One pocket's card: the theme's card front with a still of the member,
 * drawn when it nears the screen, in a box that never changes size. Until the
 * theme is in, the window shows a placeholder silhouette. It leans toward the
 * pointer where the device can hover.
 */
function Card({
  card,
  index,
  total,
  look,
  onOpen,
}: {
  card: ThemeCard | undefined;
  index: number;
  total: string | undefined;
  look: ThemeLook;
  onOpen: (index: number, from: HTMLElement) => void;
}) {
  const text = useLocalized();
  const [box, setBox] = useState<HTMLButtonElement | null>(null);
  const near = useNearVisible(box, '320px 0px');
  useTilt(card ? box : null);

  return (
    <button
      ref={setBox}
      type="button"
      className="site-themes__card"
      aria-haspopup="dialog"
      disabled={!card}
      onClick={(event) => onOpen(index, event.currentTarget)}
    >
      <CardFace
        look={look}
        number={cardNumber(index)}
        total={total}
        name={card ? text.pick(card.name) : ''}
        gloss={card ? text.other(card.name) : ''}
        art={
          card && near ? (
            <span className="site-themes__figure">
              <CardStill card={card} state={card.preset.state} sizePx={CARD_PX} />
            </span>
          ) : (
            <span className="site-themes__placeholder" />
          )
        }
      >
        <span className="site-themes__glare" aria-hidden="true" />
      </CardFace>
    </button>
  );
}

/** How long the warm-up stays painted: one whole draw, so every frame of it has been rendered once. */
const WARMUP_MS = 1600;

/** The card the warm-up draws: any card, drawn as the draw button would, in the theme's resting state. */
const warmupCard = (album: Album): Opened => ({ index: 0, state: album.defaultState, reveal: 1 });

const noop = () => {};

/**
 * One drawn card, played through once while the page is idle, inert and at
 * 1% opacity in a box of the dialog's size that is fixed in place and
 * contained, so it takes no space and nothing can reach it. The script,
 * fonts, patterns and layers a draw needs are then compiled, decoded and
 * painted before the reader asks for one, and the first draw turns as
 * smoothly as the next.
 */
function Warmup({ album, look, name }: { album: Album; look: ThemeLook; name: string }) {
  const [phase, setPhase] = useState<'waiting' | 'painting' | 'done'>('waiting');
  useEffect(() => {
    if (phase === 'done') return;
    if (phase === 'painting') {
      const timer = setTimeout(() => setPhase('done'), WARMUP_MS);
      return () => clearTimeout(timer);
    }
    const start = () => setPhase('painting');
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(start, { timeout: 4000 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = setTimeout(start, 200);
    return () => clearTimeout(handle);
  }, [phase]);
  if (phase !== 'painting' || album.cards.length === 0) return null;
  return (
    <div className="site-themes__warmup" aria-hidden="true" inert style={lookStyle(look)}>
      <CardSheet
        album={album}
        look={look}
        themeName={name}
        opened={warmupCard(album)}
        onChange={noop}
        onDismiss={noop}
      />
    </div>
  );
}

/** Every album, the current one marked, and the way back to the shelf. */
function AlbumSwitch({ current }: { current: string }) {
  const t = useI18n();
  const text = useLocalized();
  const path = useLocalePath();

  return (
    <nav className="site-themes__switch" aria-label={t('themes.switch')}>
      <a className="site-themes__back" href={path('/themes/')}>
        <PrevIcon />
        {t('themes.back')}
      </a>
      <span className="site-themes__tabs">
        {ALBUMS.map((album) => {
          const look = lookFor(album.id);
          return (
            <a
              key={album.id}
              className="site-themes__tab"
              href={path(`/themes/${album.id}`)}
              aria-current={album.id === current ? 'page' : undefined}
              style={lookStyle(look)}
            >
              <Seal look={look} className="site-themes__seal--tab" />
              {text.pick(album.name)}
            </a>
          );
        })}
      </span>
    </nav>
  );
}
