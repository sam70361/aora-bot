import { CharacterMark, useLabel, type CharacterState } from '@aora-bot/react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { CodeChip, ShareButton } from '../shared/CopyControls.js';
import { useI18n, useLocalized } from '../shared/i18n.js';
import { CloseIcon, NextIcon, PrevIcon } from '../shared/icons.js';
import { Radio, RadioGroup } from '../shared/Radio.js';
import { StillMark } from '../shared/StillMark.js';
import { themedCopyFor, themedLineFor, type ThemedCard } from '../shared/themed-snippet.js';
import { markOf, type Album } from './catalog.js';
import { lookStyle, type ThemeLook } from './looks/index.js';
import { CardBack, CardFace, Particles, Pattern, useReducedMotion } from './parts.js';

/** The card a dialog shows. */
export interface Opened {
  index: number;
  state: CharacterState;
  /** Non-zero once the card was drawn; each draw counts up, which replays the reveal. */
  reveal: number;
}

export interface CardDialogProps {
  album: Album | null;
  look: ThemeLook;
  /** The theme's name in the reader's language, for the card's back. */
  themeName: string;
  opened: Opened | null;
  onChange: (opened: Opened) => void;
  /** After the dialog has closed, by its button, Escape or a click on the backdrop. */
  onClose: () => void;
}

const NAME_ID = 'site-themes-card-name';
const DESC_ID = 'site-themes-card-desc';

export const cardNumber = (index: number) => `No.${String(index + 1).padStart(2, '0')}`;

/**
 * One card, large and alive: the only running character on the page.
 *
 * A native modal `<dialog>`: the browser keeps focus inside it and the rest of
 * the page inert, and Escape closes it. The element is always in the page and
 * only its contents come and go, so opening and closing touch nothing in the
 * page's own flow; the stylesheet locks the page's scroll while it is open,
 * against a scrollbar gutter that is always reserved.
 */
export function CardDialog({ album, look, themeName, opened, onChange, onClose }: CardDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const card = opened && album ? album.cards[opened.index] : undefined;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (card && !element.open) {
      element.showModal();
      close.current?.focus();
    } else if (!card && element.open) {
      element.close();
    }
  }, [card]);

  return (
    <dialog
      ref={dialog}
      className="site-themes__dialog"
      style={lookStyle(look)}
      aria-labelledby={NAME_ID}
      aria-describedby={DESC_ID}
      onClose={onClose}
      onClick={(event) => {
        // The sheet fills the dialog, so only a click on the backdrop lands on the dialog itself.
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      {card && opened && album ? (
        <CardSheet
          album={album}
          look={look}
          themeName={themeName}
          opened={opened}
          labelled
          closeRef={close}
          onChange={onChange}
          onDismiss={() => dialog.current?.close()}
        />
      ) : null}
    </dialog>
  );
}

export interface CardSheetProps {
  album: Album;
  look: ThemeLook;
  themeName: string;
  opened: Opened;
  /** Whether this sheet carries the ids the dialog is labelled by; only the dialog's own sheet does. */
  labelled?: boolean;
  closeRef?: RefObject<HTMLButtonElement | null>;
  onChange: (opened: Opened) => void;
  onDismiss: () => void;
}

/** The dialog's contents: the card on its cloth, and its name, expressions, code and share link. */
export function CardSheet({
  album,
  look,
  themeName,
  opened,
  labelled = false,
  closeRef,
  onChange,
  onDismiss,
}: CardSheetProps) {
  const t = useI18n();
  const text = useLocalized();
  const label = useLabel();
  const reduced = useReducedMotion();
  const card = album.cards[opened.index]!;
  const preset = { ...card.preset, state: opened.state };
  const themed: ThemedCard = { theme: album.id, member: card.id, preset };
  const count = album.cards.length;
  const step = (by: number) => onChange({ ...opened, index: (opened.index + by + count) % count });

  /*
   * A drawn card plays its reveal once, and shows a still until it has
   * landed: the live character starts its engine afterwards, so no script
   * runs while the card turns and the compositor moves it on its own. Under
   * reduced motion there is no reveal to wait for.
   */
  const drawing = opened.reveal > 0 && !reduced;
  const [landed, setLanded] = useState(0);
  const revealing = drawing && landed !== opened.reveal;

  return (
    <div className="site-themes__sheet">
      <div className="site-themes__stage">
        <Pattern look={look} />
        <div
          key={`${opened.index}:${opened.reveal}`}
          className="site-themes__deal"
          data-motion={reduced ? undefined : drawing ? 'draw' : 'deal'}
        >
          <span className="site-themes__lift" aria-hidden="true" />
          <div className="site-themes__fade">
            <div
              className="site-themes__flipper"
              onAnimationEnd={(event) => {
                if (event.target === event.currentTarget) setLanded(opened.reveal);
              }}
            >
              <span className="site-themes__side site-themes__side--front">
                <CardFace
                  look={look}
                  number={cardNumber(opened.index)}
                  total={String(count).padStart(2, '0')}
                  name={text.pick(card.name)}
                  gloss={text.other(card.name)}
                  art={
                    <span className="site-themes__figure">
                      {reduced || revealing ? (
                        <StillMark {...markOf(preset, card.nose)} sizePx={256} sizeCss="100%" />
                      ) : (
                        <CharacterMark
                          shape={preset.shape}
                          color={preset.color}
                          styleId={preset.style}
                          variant={preset.variant}
                          face={preset.face}
                          nose={card.nose}
                          state={preset.state}
                          sizeCss="100%"
                          followPointer
                          autoPause
                        />
                      )}
                    </span>
                  }
                >
                  {drawing ? <span className="site-themes__sweep" aria-hidden="true" /> : null}
                </CardFace>
              </span>
              {drawing ? (
                <span className="site-themes__side site-themes__side--back" aria-hidden="true">
                  <CardBack look={look} name={themeName} />
                </span>
              ) : null}
            </div>
          </div>
          {drawing ? <Particles look={look} /> : null}
        </div>
        <button
          type="button"
          className="site-home__nav site-themes__step site-themes__step--prev"
          aria-label={t('themes.prev')}
          onClick={() => step(-1)}
        >
          <PrevIcon />
        </button>
        <button
          type="button"
          className="site-home__nav site-themes__step site-themes__step--next"
          aria-label={t('themes.next')}
          onClick={() => step(1)}
        >
          <NextIcon />
        </button>
      </div>

      <div key={opened.reveal} className="site-themes__info" data-motion={drawing ? 'follow' : undefined}>
        <div className="site-themes__head">
          <h2 id={labelled ? NAME_ID : undefined} className="site-themes__name">
            {text.pick(card.name)}
            <span className="site-themes__nameGloss">{text.other(card.name)}</span>
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="site-home__nav site-themes__close"
            aria-label={t('themes.close')}
            onClick={onDismiss}
          >
            <CloseIcon />
          </button>
        </div>
        <p id={labelled ? DESC_ID : undefined} className="site-themes__desc">
          {text.pick(card.desc)}
        </p>

        <div className="site-themes__expr">
          <p className="site-themes__cap">{t('home.rail.state')}</p>
          <RadioGroup label={t('home.rail.state')} className="site-themes__groups">
            {album.stateGroups.map((group) => (
              <div key={group.id} className="site-themes__group">
                <span className="site-themes__groupName">{label.stateGroup(group.id, group.label)}</span>
                <span className="site-themes__chips">
                  {group.states.map((state) => {
                    const name = label.state(state) || state;
                    return (
                      <Radio
                        key={state}
                        value={state}
                        className="site-themes__chip"
                        checked={state === opened.state}
                        label={name}
                        onSelect={() => onChange({ ...opened, state })}
                      >
                        {name}
                      </Radio>
                    );
                  })}
                </span>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="site-themes__actions">
          <CodeChip
            line={(format) => themedLineFor(format, themed)}
            copy={(format) => themedCopyFor(format, themed)}
          />
          <ShareButton preset={preset} />
        </div>
      </div>
    </div>
  );
}
