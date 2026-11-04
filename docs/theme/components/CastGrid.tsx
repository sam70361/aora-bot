import {
  CAST,
  EMOTION_IDS,
  MarkStageProvider,
  StagedMark,
  stateForEmotion,
  useLabel,
  type CharacterPreset,
  type CharacterState,
} from '@aora-bot/react';
import { useEffect, useState, type CSSProperties } from 'react';
import { useI18n, useLocalized } from '../../app/shared/i18n.js';
import { COPIED_RESET_MS, copyText } from '../../app/shared/clipboard.js';

/** How long each id holds during a tour. */
const TOUR_STEP_MS = 1400;

/**
 * The named cast, one card each.
 *
 * Each card has a live mark, both names, the one-line description, the shape
 * and colour it is made of, and its original accent as a swatch. "Tour"
 * walks the card through every protocol id, which is the quickest way to see
 * a character's whole range; "Copy" puts the preset prop on the clipboard.
 */
export function CastGrid() {
  return (
    // A touring card holds its own id, so at most one appearance per member.
    <MarkStageProvider maxSources={CAST.length}>
      <div className="site-cast">
        {CAST.map((member) => (
          <CastCard key={member.id} member={member} />
        ))}
      </div>
    </MarkStageProvider>
  );
}

function CastCard({ member }: { member: CharacterPreset }) {
  const t = useI18n();
  const label = useLabel();
  const text = useLocalized();

  const [touring, setTouring] = useState(false);
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!touring) return;
    const timer = setInterval(() => setStep((s) => (s + 1) % EMOTION_IDS.length), TOUR_STEP_MS);
    return () => clearInterval(timer);
  }, [touring]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const state: CharacterState = touring ? stateForEmotion(EMOTION_IDS[step]) : 'idle';
  const snippet = `<CharacterMark preset="${member.id}" />`;

  const copy = async () => setCopied(await copyText(snippet));

  return (
    <article className="site-cast__card" style={{ '--site-cast-accent': member.accent } as CSSProperties}>
      <div className="site-cast__stage">
        <StagedMark
          shape={member.shape}
          color={member.color}
          face={member.face}
          nose={member.nose}
          state={state}
          sizePx={84}
        />
        {touring && (
          <span className="site-cast__id">
            <code>{EMOTION_IDS[step]}</code> {state}
          </span>
        )}
      </div>
      <header className="site-cast__head">
        <strong>{text.pick(member.name)}</strong>
        <em>{text.other(member.name)}</em>
        <code className="site-cast__slug">{member.id}</code>
      </header>
      <p className="site-cast__desc">{text.pick(member.desc)}</p>
      <dl className="site-cast__traits">
        <dt>shape</dt>
        <dd>
          <code>{member.shape}</code>
          <em>{label.shape(member.shape)}</em>
        </dd>
        <dt>color</dt>
        <dd>
          <code>{member.color}</code>
          <em>{label.color(member.color)}</em>
        </dd>
        <dt>accent</dt>
        <dd>
          <span className="site-cast__swatch" aria-hidden="true" />
          <code>{member.accent}</code>
        </dd>
      </dl>
      <div className="site-controls">
        <button
          type="button"
          className="site-btn"
          aria-pressed={touring}
          data-active={touring ? 'true' : undefined}
          onClick={() => setTouring((v) => !v)}
        >
          {touring ? t('cast.stop') : t('cast.tour')}
        </button>
        <button type="button" className="site-btn" onClick={copy}>
          <span role="status">{copied ? t('cast.copied') : t('cast.copy')}</span>
        </button>
      </div>
    </article>
  );
}
