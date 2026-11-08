import { STATE_GROUPS, type CharacterState } from '@aora-bot/react';
import { fnv1a32, mulberry32 } from '@aora-bot/engine';
import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { useI18n } from '../../shared/i18n.js';
import type { Album } from '../catalog.js';
import { lookStyle, type ThemeLook } from '../looks/index.js';
import { Pattern, useReducedMotion } from '../parts.js';
import { decodedUrl, pageValues, pageVarsOf, stillDrawer, toImage, type PageValues } from './images.js';
import { shuffled } from './still.js';

/** How far below the screen a sticker is drawn ahead of being scrolled to, as the cards are. */
const NEAR_MARGIN = '320px 0px';

/** The moods a sticker is given, from the engine's own groups: a held face should be an expression. */
const MOOD_GROUP = 'feeling';

/** A sticker changes state every this many ms, give or take its own share of the spread. */
const BEAT_MS = 2600;
const BEAT_SPREAD_MS = 3000;

/** How long after a page turns visible the first beats wait, at most, so they do not all land at once. */
const WAKE_SPREAD_MS = 1600;

/**
 * How much the wall does at once. A modest device (a narrow screen, or four
 * cores or fewer) keeps fewer stickers cycling, through fewer states, and
 * changes one less often.
 */
const PACE = {
  full: { states: 3, cyclers: Infinity, swapGapMs: 260 },
  modest: { states: 2, cyclers: 4, swapGapMs: 1100 },
} as const;
const MODEST_QUERY = '(width < 640px)';
const MODEST_CORES = 4;

/** After an image is made, the next waits this long: decoding one is the only work the page itself does for a still. */
const IMAGE_GAP_MS = 120;

/** The room an image keeps past its box on each side, as a share of the box, for the die-cut edge and its shadow. */
const BLEED = 0.16;

/** How far a sticker turns, in degrees either way, and how far it sits off its cell, as a share of the cell. */
const TURN_DEG = 9;
const NUDGE = 0.07;

/** The pop a sticker gives when it changes, by transform alone. */
const POP: Keyframe[] = [
  { transform: 'scale(1)' },
  { transform: 'scale(1.12) rotate(-3deg)', offset: 0.32 },
  { transform: 'scale(0.97) rotate(1deg)', offset: 0.7 },
  { transform: 'scale(1)' },
];
const POP_OPTIONS: KeyframeAnimationOptions = { duration: 480, easing: 'ease-out' };

/** Where each sticker sits: a seeded turn and nudge, the same on every visit. */
function placesOf(id: string, count: number): { cell: number; style: CSSProperties }[] {
  const random = mulberry32(fnv1a32(id));
  return Array.from({ length: count }, (_, cell) => ({
    cell,
    style: {
      '--sticker-turn': `${((random() * 2 - 1) * TURN_DEG).toFixed(1)}deg`,
      '--sticker-x': `${((random() * 2 - 1) * NUDGE * 100).toFixed(1)}%`,
      '--sticker-y': `${((random() * 2 - 1) * NUDGE * 100).toFixed(1)}%`,
    } as CSSProperties,
  }));
}

/** Each sticker's turn of states: where the theme starts, then moods the theme offers, a different pick per sticker. */
function turnsOf(album: Album, states: number): CharacterState[][] {
  const offered = new Set(album.stateGroups.flatMap((group) => group.states));
  const moods = (STATE_GROUPS.find((group) => group.id === MOOD_GROUP)?.states ?? []).filter(
    (state) => offered.has(state) && state !== album.defaultState,
  );
  return album.cards.map((card, i) => [
    album.defaultState,
    ...shuffled(moods, fnv1a32(`${card.id}:${i}`)).slice(0, states - 1),
  ]);
}

/**
 * The album's sticker wall: every member as a die-cut sticker on the theme's
 * cloth, each changing state on its own beat.
 *
 * The field has one cell per card in the manifest, so its box is laid out
 * before the theme loads and nothing moves when it fills. A sticker is two
 * images, never a live character and never inline markup: each state is
 * drawn in a worker, made into an image with its die-cut edge inside it and
 * decoded before it is shown, and a change of state loads the next image
 * into the hidden one and cross-fades them. A sticker is drawn when it nears
 * the screen, and only stickers on screen keep time; the wall stops in a
 * hidden tab, and under `prefers-reduced-motion` it fills and holds still.
 */
export function StickerWall({
  id,
  album,
  count,
  look,
  sizePx,
}: {
  id: string;
  album: Album | null;
  count: number;
  look: ThemeLook;
  /** The size the stills are drawn at: the cards'. */
  sizePx: number;
}) {
  const t = useI18n();
  const section = useRef<HTMLElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const places = useMemo(() => placesOf(id, count), [id, count]);

  useEffect(() => {
    const el = field.current;
    const sheet = section.current;
    if (!el || !sheet || !album) return;
    const arts = [...el.querySelectorAll<HTMLElement>('.site-themes__stickerArt')].slice(
      0,
      album.cards.length,
    );
    const modest =
      window.matchMedia(MODEST_QUERY).matches || (navigator.hardwareConcurrency ?? 8) <= MODEST_CORES;
    const pace = modest ? PACE.modest : PACE.full;
    const turns = turnsOf(album, pace.states);
    const drawer = stillDrawer();
    const sheetStyle = getComputedStyle(sheet);
    const cut = {
      edgePx: Number.parseFloat(sheetStyle.getPropertyValue('--_edge')) || 1.5,
      paper: sheetStyle.getPropertyValue('--_paper').trim() || '#fff',
    };
    const values: Record<string, string> = {};
    const valuesFor = (names: string[]): PageValues => {
      const missing = names.filter((name) => !(name in values));
      if (missing.length > 0) Object.assign(values, pageValues(arts[0]!, missing));
      return values;
    };

    let live = true;
    const step = new Int8Array(arts.length);
    const filled = new Uint8Array(arts.length);
    const random = mulberry32(fnv1a32(album.id));
    const period = Float64Array.from(arts, () => BEAT_MS + random() * BEAT_SPREAD_MS);
    const rank = Float64Array.from(arts, () => random());
    const due = new Float64Array(arts.length);
    const visible = new Set<number>();
    const near = new Set<number>();
    const urls = new Map<string, string>();
    let timer = 0;
    let making = false;
    let gap = 0;
    const keyOf = (i: number, state: CharacterState) => `${i}|${state}`;
    const nextOf = (i: number) => turns[i]![(step[i]! + 1) % turns[i]!.length]!;

    /** The stickers on screen that keep time: all of them, or on a modest device a seeded few. */
    const cyclers = () => [...visible].sort((a, b) => rank[a]! - rank[b]!).slice(0, pace.cyclers);

    // Two layers per sticker: the one shown and the one the next state goes into, its image decoded already.
    const show = (i: number, state: CharacterState) => {
      const art = arts[i]!;
      let [front, back] = [...art.children] as HTMLElement[];
      if (!front || !back) {
        front = document.createElement('span');
        back = document.createElement('span');
        front.className = back.className = 'site-themes__stickerImg';
        art.replaceChildren(front, back);
      }
      const shown = front.hasAttribute('data-on') ? front : back.hasAttribute('data-on') ? back : null;
      const target = shown === front ? back : front;
      target.style.borderImageSource = `url("${urls.get(keyOf(i, state))!}")`;
      target.toggleAttribute('data-on', true);
      shown?.toggleAttribute('data-on', false);
      if (shown && !reduced) art.parentElement!.animate(POP, POP_OPTIONS);
    };

    /** The next image to make: a sticker in view to fill, then one near the screen, then a cycler's next state. */
    const wanted = (): { i: number; state: CharacterState } | null => {
      for (const i of [...visible, ...near]) if (!filled[i]) return { i, state: turns[i]![0]! };
      if (reduced) return null;
      for (const i of cyclers()) if (!urls.has(keyOf(i, nextOf(i)))) return { i, state: nextOf(i) };
      return null;
    };

    // One image at a time: the worker draws it, this thread wraps and decodes it, then waits a little.
    const make = () => {
      if (making || gap || !live) return;
      const job = wanted();
      if (!job) return;
      making = true;
      const { i, state } = job;
      const card = album.cards[i]!;
      drawer
        .draw({ theme: album.id, card, state, sizePx })
        .then((svg) =>
          decodedUrl(
            toImage(svg, card.preset.color, valuesFor(pageVarsOf(svg)), {
              bleed: BLEED,
              boxPx: arts[i]!.clientWidth || sizePx,
              cut,
              clip: true,
            }),
          ),
        )
        .then(
          (url) => {
            if (!live) {
              URL.revokeObjectURL(url);
              return;
            }
            urls.set(keyOf(i, state), url);
            if (!filled[i]) {
              filled[i] = 1;
              due[i] = performance.now() + period[i]! * (0.4 + random() * 0.6);
              show(i, state);
            }
          },
          (error: unknown) => console.error(error),
        )
        .finally(() => {
          making = false;
          if (!live) return;
          gap = window.setTimeout(() => {
            gap = 0;
            make();
          }, IMAGE_GAP_MS);
          arm();
        });
    };

    const ready = (i: number) => filled[i] === 1 && urls.has(keyOf(i, nextOf(i)));
    let lastSwap = -Infinity;
    const arm = () => {
      clearTimeout(timer);
      if (!live || reduced || document.hidden) return;
      let soonest = Infinity;
      for (const i of cyclers()) if (ready(i)) soonest = Math.min(soonest, due[i]!);
      if (soonest === Infinity) return;
      const at = Math.max(soonest, lastSwap + pace.swapGapMs);
      timer = window.setTimeout(beat, Math.max(16, at - performance.now()));
    };

    // The most overdue cycler whose next image is ready changes; the rest keep their turn for the next beat.
    const beat = () => {
      const now = performance.now();
      let pick = -1;
      for (const i of cyclers())
        if (ready(i) && due[i]! <= now && (pick < 0 || due[i]! < due[pick]!)) pick = i;
      if (pick >= 0) {
        step[pick] = (step[pick]! + 1) % turns[pick]!.length;
        show(pick, turns[pick]![step[pick]!]!);
        due[pick] = now + period[pick]!;
        lastSwap = now;
      }
      arm();
      make();
    };

    const wake = () => {
      const now = performance.now();
      for (let i = 0; i < due.length; i++) due[i] = now + random() * Math.min(period[i]!, WAKE_SPREAD_MS);
    };

    const track = (set: Set<number>) => (entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        const i = arts.indexOf(entry.target as HTMLElement);
        if (entry.isIntersecting) set.add(i);
        else set.delete(i);
      }
      make();
      arm();
    };
    const inView = new IntersectionObserver(track(visible));
    const nearView = new IntersectionObserver(track(near), { rootMargin: NEAR_MARGIN });
    for (const art of arts) {
      inView.observe(art);
      nearView.observe(art);
    }

    const onVisibility = () => {
      if (!document.hidden) wake();
      arm();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      live = false;
      clearTimeout(timer);
      clearTimeout(gap);
      drawer.close();
      inView.disconnect();
      nearView.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      for (const art of arts) {
        art.parentElement?.getAnimations().forEach((animation) => animation.cancel());
        art.replaceChildren();
      }
      for (const url of urls.values()) URL.revokeObjectURL(url);
    };
  }, [album, reduced, sizePx]);

  return (
    <section
      ref={section}
      className="site-themes__stickers"
      data-site-wall="stickers"
      aria-hidden="true"
      style={{ ...lookStyle(look), '--_bleed': BLEED } as CSSProperties}
    >
      <Pattern look={look} />
      <p className="site-themes__stickersHead">
        <span className="site-themes__stickersCap">{t('themes.stickers')}</span>
        <span className="site-themes__stickersHint">{t('themes.stickers.hint')}</span>
      </p>
      <div ref={field} className="site-themes__stickerField">
        {places.map(({ cell, style }) => (
          <span key={cell} className="site-themes__sticker" style={style}>
            <span className="site-themes__stickerArt" />
          </span>
        ))}
      </div>
    </section>
  );
}
