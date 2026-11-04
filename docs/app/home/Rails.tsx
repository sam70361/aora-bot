import {
  COLOR_IDS,
  getInkColorCss,
  prefersReducedMotion,
  useLabel,
  type CharacterState,
  type ColorId,
  type FaceStyle,
  type ShapeFamily,
  type ShapeId,
} from '@aora-bot/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useI18n, useLocalized } from '../shared/i18n.js';
import type { Preset } from '../shared/share.js';
import { NextIcon, PrevIcon } from './icons.js';
import { Radio, RadioGroup, ScrollRootProvider, useNearVisible } from './Radio.js';
import type { StyleChoice, StyleGroup } from './registry.js';
import { StillMark } from './StillMark.js';

interface PreviewProps {
  sizePx: number;
  /** How far outside the scroll container's edge a preview starts drawing. */
  margin: string;
  shape: ShapeId;
  color: ColorId;
  state?: CharacterState;
  style: string;
  variant: string;
  face: FaceStyle;
  styleOptions?: Preset['params'];
}

/** A fixed box that draws its character only while it is near the visible part of its list. */
export function Preview({ sizePx, margin, ...mark }: PreviewProps) {
  const [box, setBox] = useState<HTMLSpanElement | null>(null);
  const near = useNearVisible(box, margin);
  return (
    <span ref={setBox} className="site-home__slot" style={{ '--site-slot': `${sizePx}px` } as CSSProperties}>
      {near ? <StillMark {...mark} sizePx={sizePx} /> : null}
    </span>
  );
}

/** The parts of the preset every preview copies from the big character. */
export const lookOf = (preset: Preset) => ({
  style: preset.style,
  variant: preset.variant,
  face: preset.face,
  styleOptions: preset.params,
});

/** Left edge: every series, every variant, each drawn in its own style. */
export function StyleRail({
  groups,
  preset,
  onPick,
}: {
  groups: StyleGroup[];
  preset: Preset;
  onPick: (choice: StyleChoice) => void;
}) {
  const t = useI18n();
  const text = useLocalized();
  const label = useLabel();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);

  return (
    <aside className="site-capsule site-home__rail site-home__rail--style">
      <p className="site-home__cap">{t('home.rail.style')}</p>
      <ScrollRootProvider value={root}>
        <RadioGroup ref={setRoot} label={t('home.rail.style')} className="site-home__scroll">
          {groups.map((group) => {
            const series = label.style(group.id, group.label);
            return (
              <div key={group.id} className="site-home__group">
                <p className="site-home__groupName">{series}</p>
                {group.choices.map((choice) => {
                  const name = group.choices.length === 1 ? series : label.variant(choice.variant);
                  return (
                    <Radio
                      key={`${choice.style}:${choice.variant}`}
                      value={`${choice.style}:${choice.variant}`}
                      className="site-home__opt site-home__opt--style"
                      checked={choice.style === preset.style && choice.variant === preset.variant}
                      label={text.pair(name, series)}
                      onSelect={() => onPick(choice)}
                    >
                      <Preview
                        sizePx={48}
                        margin="80px 0px"
                        shape={preset.shape}
                        color={preset.color}
                        style={choice.style}
                        variant={choice.variant}
                        face={preset.face}
                        // Parameters belong to a series, so only the current series is drawn with them.
                        styleOptions={choice.style === preset.style ? preset.params : undefined}
                      />
                      <span className="site-home__optName">{name}</span>
                    </Radio>
                  );
                })}
              </div>
            );
          })}
        </RadioGroup>
      </ScrollRootProvider>
    </aside>
  );
}

/** Right edge: every swatch as a dot, then the faces, each drawn on the current character. */
export function ColorRail({
  faces,
  preset,
  onColor,
  onFace,
}: {
  faces: readonly FaceStyle[];
  preset: Preset;
  onColor: (color: ColorId) => void;
  onFace: (face: FaceStyle) => void;
}) {
  const t = useI18n();
  const label = useLabel();

  return (
    <aside className="site-capsule site-home__rail site-home__rail--color">
      <p className="site-home__cap">{t('home.rail.color')}</p>
      <RadioGroup label={t('home.rail.color')} className="site-home__scroll site-home__scroll--dots">
        {COLOR_IDS.map((color) => (
          <Radio
            key={color}
            value={color}
            className="site-home__dot"
            checked={color === preset.color}
            label={label.color(color) || color}
            onSelect={() => onColor(color)}
          >
            <span
              className="site-home__swatch"
              style={{ '--site-dot': getInkColorCss(color) } as CSSProperties}
            />
          </Radio>
        ))}
      </RadioGroup>
      <p className="site-home__cap site-home__cap--next">{t('home.rail.face')}</p>
      <RadioGroup label={t('home.rail.face')} className="site-home__faces">
        {faces.map((face) => (
          <Radio
            key={face}
            value={face}
            className="site-home__opt site-home__opt--face"
            checked={face === preset.face}
            label={label.face(face) || face}
            onSelect={() => onFace(face)}
          >
            <StillMark
              shape={preset.shape}
              color={preset.color}
              style={preset.style}
              variant={preset.variant}
              styleOptions={preset.params}
              face={face}
              sizePx={32}
            />
          </Radio>
        ))}
      </RadioGroup>
    </aside>
  );
}

/** Bottom edge: every body in the registry, family by family, with previous and next. */
export function ShapeStrip({
  families,
  preset,
  onPick,
}: {
  families: readonly ShapeFamily[];
  preset: Preset;
  onPick: (shape: ShapeId) => void;
}) {
  const t = useI18n();
  const label = useLabel();
  const [track, setTrack] = useState<HTMLDivElement | null>(null);
  const centred = useRef(false);

  const order = families.flatMap((family) => family.shapes);
  const step = (by: number) => {
    const at = order.indexOf(preset.shape);
    onPick(order[(at + by + order.length) % order.length]!);
  };

  // Keep the chosen body in the middle of the strip, however it was chosen.
  // `scrollTo` on the track and not `scrollIntoView`, which would scroll the page too.
  useEffect(() => {
    const current = track?.querySelector<HTMLElement>(`[data-value="${CSS.escape(preset.shape)}"]`);
    if (!track || !current) return;
    track.scrollTo({
      left: current.offsetLeft - track.clientWidth / 2 + current.offsetWidth / 2,
      behavior: centred.current && !prefersReducedMotion() ? 'smooth' : 'auto',
    });
    centred.current = true;
  }, [track, preset.shape]);

  return (
    <div className="site-capsule site-home__strip">
      <button
        type="button"
        className="site-home__nav"
        aria-label={t('home.prevShape')}
        onClick={() => step(-1)}
      >
        <PrevIcon />
      </button>
      <ScrollRootProvider value={track}>
        <RadioGroup ref={setTrack} label={t('home.rail.shape')} className="site-home__track">
          {families.map((family) => (
            <div key={family.id} className="site-home__family">
              {family.shapes.map((shape) => {
                const name = label.shape(shape) || shape;
                return (
                  <Radio
                    key={shape}
                    value={shape}
                    className="site-home__opt site-home__opt--shape"
                    checked={shape === preset.shape}
                    label={name}
                    onSelect={() => onPick(shape)}
                  >
                    <Preview
                      sizePx={56}
                      margin="0px 160px"
                      shape={shape}
                      color={preset.color}
                      {...lookOf(preset)}
                    />
                    <span className="site-home__optName">{name}</span>
                  </Radio>
                );
              })}
            </div>
          ))}
        </RadioGroup>
      </ScrollRootProvider>
      <button
        type="button"
        className="site-home__nav"
        aria-label={t('home.nextShape')}
        onClick={() => step(1)}
      >
        <NextIcon />
      </button>
    </div>
  );
}
