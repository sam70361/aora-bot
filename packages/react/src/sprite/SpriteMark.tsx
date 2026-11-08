import {
  emotionIdForState,
  isSpriteManifest,
  resolveSpriteFrames,
  type CastId,
  type CharacterState,
  type ColorId,
  type EmotionId,
  type FaceStyle,
  type NoseId,
  type ShapeId,
  type SpriteManifest,
} from '@aora-bot/engine';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useLocale } from '../locale/index.js';
import { useReducedMotion } from '../stage/hooks.js';
import { StagedMark } from '../stage/CharacterStage.js';
import { cx } from '../utils/cx.js';

export type { SpriteManifest, SpriteClip } from '@aora-bot/engine';

const manifestCache = new Map<string, Promise<SpriteManifest>>();

/** Fetch and validate a manifest. Cached per URL for the page's lifetime; a failure is forgotten so a retry can succeed. */
export function loadSpriteManifest(url: string): Promise<SpriteManifest> {
  let pending = manifestCache.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`sprite manifest ${url}: HTTP ${r.status}`);
        return r.json() as Promise<unknown>;
      })
      .then((json) => {
        if (!isSpriteManifest(json)) throw new Error(`sprite manifest ${url}: not a sprite-mate manifest`);
        return json;
      });
    pending.catch(() => manifestCache.delete(url));
    manifestCache.set(url, pending);
  }
  return pending;
}

export interface SpriteManifestStatus {
  manifest: SpriteManifest | null;
  error: Error | null;
  loading: boolean;
}

/** Load a manifest by URL. Resolves to `{ manifest: null, loading: false }` with no URL. */
export function useSpriteManifest(url: string | null | undefined): SpriteManifestStatus {
  const [result, setResult] = useState<{ url: string; manifest: SpriteManifest | null; error: Error | null }>(
    {
      url: '',
      manifest: null,
      error: null,
    },
  );

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    loadSpriteManifest(url).then(
      (manifest) => {
        if (!cancelled) setResult({ url, manifest, error: null });
      },
      (error: Error) => {
        if (!cancelled) setResult({ url, manifest: null, error });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url) return { manifest: null, error: null, loading: false };
  if (result.url !== url) return { manifest: null, error: null, loading: true };
  return { manifest: result.manifest, error: result.error, loading: false };
}

/** What to show while the manifest loads, or if it fails. */
export type SpriteFallback = 'character' | 'none';

export interface SpriteMarkProps {
  /**
   * URL of a `manifest.json`. Frames resolve relative to it. Fetched on the
   * client; use `manifest` + `baseUrl` instead to render on the server.
   */
  src?: string;
  /** An already-loaded manifest. Takes precedence over `src`. */
  manifest?: SpriteManifest;
  /** Directory the manifest's frame files live in. Required with `manifest`. */
  baseUrl?: string;
  state?: CharacterState;
  /** Protocol id. Ignored when `state` is given. */
  emotionId?: EmotionId;
  sizePx?: number;
  /** Override the manifest's frame rate. */
  fps?: number;
  /** Hold the first frame. */
  paused?: boolean;
  /**
   * Shown until a `src` manifest arrives, and if it fails: a procedural
   * character in the same state, or an empty box of the final size.
   */
  fallback?: SpriteFallback;
  /*
   * The fallback character's appearance, given rather than derived.
   *
   * It cannot come from the manifest: the fallback is what is on screen
   * *before* the manifest has been fetched, which is precisely when there is
   * nothing to derive it from. Without these a sheet of a blue crystal
   * arrives after a black blob, which reads as two different characters.
   */
  shape?: ShapeId;
  color?: ColorId;
  face?: FaceStyle;
  nose?: NoseId | null;
  /** A named character from the cast, supplying the four above together. */
  preset?: CastId;
  /** Accessible name. Defaults to the manifest's English name. */
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

const joinUrl = (base: string, file: string) =>
  (base.endsWith('/') || base === '' ? base : `${base}/`) + file;

/**
 * A raster character driven by the same states as the vector ones.
 *
 * Frames are shown with one `<img>` whose `src` swaps on a timer at the
 * manifest's rate; there is no canvas and no per-frame JavaScript beyond
 * that assignment. Under reduced motion only the first frame is shown.
 * States the sheet lacks fall back through the manifest, then the protocol
 * segment, then idle, so a twelve-frame sheet still answers every state.
 *
 * Rendering on the server: pass `manifest` and `baseUrl` and the first frame
 * is emitted as plain markup. With `src` the server output is the fallback.
 */
export function SpriteMark({
  src,
  manifest: given,
  baseUrl,
  state,
  emotionId,
  sizePx = 32,
  fps: fpsOverride,
  paused = false,
  fallback = 'character',
  shape,
  color,
  face,
  nose,
  preset,
  alt,
  className,
  style,
}: SpriteMarkProps) {
  const { t } = useLocale();
  const reduced = useReducedMotion();
  const fetched = useSpriteManifest(given ? null : src);
  const manifest = given ?? fetched.manifest;
  const base = useMemo(() => {
    if (given) return baseUrl ?? '';
    return src ? src.slice(0, src.lastIndexOf('/') + 1) : '';
  }, [given, baseUrl, src]);

  const id = state ? emotionIdForState(state) : (emotionId ?? '02');
  const clip = useMemo(() => (manifest ? resolveSpriteFrames(manifest, id) : null), [manifest, id]);
  const urls = useMemo(() => clip?.files.map((f) => joinUrl(base, f)) ?? [], [clip, base]);

  const fps = fpsOverride ?? (manifest?.fps && manifest.fps > 0 ? manifest.fps : 1);
  const urlsKey = urls.join('\0');
  const [frame, setFrame] = useState(0);
  const [seenUrls, setSeenUrls] = useState(urlsKey);
  if (seenUrls !== urlsKey) {
    setSeenUrls(urlsKey);
    setFrame(0);
  }

  // The hook rather than a read at mount, so turning the preference on
  // mid-session stops the sheet where it is.
  useEffect(() => {
    if (urls.length < 2 || paused || reduced) return;
    const timer = setInterval(() => setFrame((f) => (f + 1) % urls.length), Math.max(50, 1000 / fps));
    return () => clearInterval(timer);
  }, [urls, fps, paused, reduced]);

  // Preload the rest of the clip so swaps never flash an empty box.
  useEffect(() => {
    if (urls.length < 2 || typeof Image === 'undefined') return;
    for (const url of urls.slice(1)) {
      const img = new Image();
      img.src = url;
    }
  }, [urls]);

  const classes = cx('aora-sprite', className);
  const box: CSSProperties = { width: sizePx, height: sizePx, ...style };
  const error = given ? null : fetched.error;

  if (!clip || urls.length === 0) {
    const status = error ? 'error' : manifest ? 'empty' : 'loading';
    const label = error ? t('sprite.failed') : t('sprite.loading');
    if (fallback === 'character') {
      return (
        <span className={classes} data-sprite-status={status} style={box} role="img" aria-label={label}>
          <StagedMark
            state={state}
            emotionId={emotionId}
            shape={shape}
            color={color}
            face={face}
            nose={nose}
            preset={preset}
            sizePx={sizePx}
          />
        </span>
      );
    }
    return <span className={classes} data-sprite-status={status} style={box} role="img" aria-label={label} />;
  }

  const url = urls[(paused ? 0 : frame) % urls.length]!;
  const anchor = manifest?.anchor ?? [0.5, 0.5];

  return (
    <span
      className={classes}
      data-sprite-status="ready"
      data-state={state}
      data-emotion={clip.id}
      style={box}
    >
      <img
        src={url}
        alt={alt ?? manifest?.name?.en ?? manifest?.id ?? ''}
        width={sizePx}
        height={sizePx}
        draggable={false}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: `${anchor[0] * 100}% ${anchor[1] * 100}%`,
        }}
      />
    </span>
  );
}
