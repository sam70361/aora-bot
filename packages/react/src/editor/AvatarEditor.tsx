import type { FaceStyle, NoseId } from '@aora-bot/engine';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ClipboardEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useLocale, type LocaleKey } from '../locale/index.js';
import { CharacterMark } from '../mark/CharacterMark.js';
import { AgentCharacterPicker, type CharacterChoice } from '../picker/AgentCharacterPicker.js';
import {
  clampPan,
  clampZoom,
  coverScale,
  CROP_STAGE_PX,
  cropToDataUrl,
  loadImage,
  readImageFile,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  type LoadedImage,
  type Pan,
} from './crop.js';
import { cx } from '../utils/cx.js';

/** Everything the editor can change about an avatar. */
export interface AvatarDraft extends CharacterChoice {
  /** A picture, which takes precedence over the character. `null` for none. */
  pictureUrl?: string | null;
}

export type AvatarEditorTab = 'character' | 'generate' | 'upload';

export interface AvatarEditorProps {
  /** The committed avatar. Edits start from here. */
  value: AvatarDraft;
  /** Called with the new avatar when the edit is confirmed or silently kept. */
  onCommit?: (next: AvatarDraft) => void;
  /**
   * Called when the editor should go away. `save` and `cancel` are the two
   * buttons; `dismiss` is Escape or a click outside, which keeps the staged
   * character (see the note on `onCommit` below).
   */
  onClose?: (reason: 'save' | 'cancel' | 'dismiss') => void;
  /** Hide the Generate tab unless a host can actually generate an image. */
  generateImage?: (prompt: string, signal: AbortSignal) => Promise<string>;
  /** Hide the Character tab — a group avatar has no character to choose. */
  characterTab?: boolean;
  /** Which tab opens first. Defaults to Upload when there is already a picture. */
  initialTab?: AvatarEditorTab;
  face?: FaceStyle;
  nose?: NoseId | null;
  lineWeight?: number;
  /** Size of the character preview above the picker. Defaults to `AVATAR_PREVIEW_PX`. */
  previewPx?: number;
  className?: string;
  style?: CSSProperties;
}

/** Default size of the character preview. */
export const AVATAR_PREVIEW_PX = 72;

/**
 * The avatar dialog: pick a character, generate a picture, or upload one.
 *
 * Two deliberate asymmetries in how it closes.
 *
 * A staged *character* survives a dismissal. Shapes and colours are cheap and
 * reversible — every one of them is a valid avatar, and someone who clicked a
 * hexagon and then pressed Escape meant to keep the hexagon; asking them to
 * find the Save button to confirm a two-click decision is the wrong ceremony.
 *
 * A staged *picture* does not. It is the result of a crop nobody has looked
 * at from the outside yet, and replacing a face with a badly framed photo is
 * exactly the change someone would want to think about. So an uncommitted
 * crop is dropped on dismissal and only Save applies it.
 */
export function AvatarEditor({
  value,
  onCommit,
  onClose,
  generateImage,
  characterTab = true,
  initialTab,
  face,
  nose,
  lineWeight,
  previewPx = AVATAR_PREVIEW_PX,
  className,
  style,
}: AvatarEditorProps) {
  const { t } = useLocale();
  const tabs = editorTabs(characterTab, Boolean(generateImage));
  const [tab, setTab] = useState<AvatarEditorTab>(
    () => initialTab ?? (value.pictureUrl ? 'upload' : (tabs[0] ?? 'upload')),
  );

  const [staged, setStaged] = useState<CharacterChoice>(value);
  const [source, setSource] = useState<LoadedImage | null>(null);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<LocaleKey | null>(null);
  const [pending, setPending] = useState(false);
  const [prompt, setPrompt] = useState('');

  const rootRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // The staged character is what the preview and the picker show, so a
  // dismissal has nothing left to decide: whatever is on screen is what the
  // host is told about.
  const stagedRef = useRef(staged);
  const commitRef = useRef(onCommit);
  useEffect(() => {
    stagedRef.current = staged;
    commitRef.current = onCommit;
  }, [staged, onCommit]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      commitRef.current?.(stagedRef.current);
      onClose?.('dismiss');
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // An in-flight generation outlives neither the dialog nor a second attempt.
  useEffect(() => () => abortRef.current?.abort(), []);

  const view = source ? { width: source.width, height: source.height, zoom } : null;

  const accept = async (dataUrl: string) => {
    const loaded = await loadImage(dataUrl);
    if (!loaded) {
      setError('editor.upload.notAnImage');
      return;
    }
    setSource(loaded);
    setPan({ x: 0, y: 0 });
    setZoom(ZOOM_MIN);
    setRemoved(false);
    setError(null);
  };

  const acceptFile = async (file: File | null | undefined) => {
    if (!file) return;
    const read = await readImageFile(file);
    if (!read.ok) {
      setError(read.reason === 'too-large' ? 'editor.upload.tooLarge' : 'editor.upload.notAnImage');
      return;
    }
    await accept(read.dataUrl);
  };

  const save = () => {
    const picture = source ? cropToDataUrl(source.element, { pan, zoom }) : null;
    const pictureUrl = picture ?? (removed ? null : value.pictureUrl);
    onCommit?.({ ...staged, pictureUrl });
    onClose?.('save');
  };

  const cancel = () => {
    setStaged(value);
    setSource(null);
    setRemoved(false);
    onClose?.('cancel');
  };

  /*
   * Paste is caught on the dialog rather than on the window, and stopped
   * here. A host listening for paste on the document — a chat composer, a
   * canvas — would otherwise also receive the image and act on it, and the
   * person pasting meant it for the dialog they have open.
   */
  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const file = [...(event.clipboardData?.items ?? [])]
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .find((item): item is File => item != null);
    if (!file) return;
    event.preventDefault();
    event.stopPropagation();
    void acceptFile(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void acceptFile(event.dataTransfer?.files?.[0]);
  };

  const generate = async () => {
    if (!generateImage || !prompt.trim() || pending) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    setError(null);
    try {
      const dataUrl = await generateImage(prompt.trim(), controller.signal);
      if (!controller.signal.aborted) await accept(dataUrl);
    } catch {
      if (!controller.signal.aborted) setError('editor.generate.failed');
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  };

  const showPicture = source?.dataUrl ?? (removed ? null : value.pictureUrl);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('editor.title')}
      className={cx('aora-editor', className)}
      style={style}
      onPaste={onPaste}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <div className="aora-editor__head">
        <span className="aora-editor__preview" aria-label={t('editor.preview')} role="img">
          {showPicture ? (
            <img src={showPicture} alt="" />
          ) : (
            <CharacterMark
              shape={staged.shape}
              color={staged.color}
              face={face ?? staged.face}
              nose={nose !== undefined ? nose : staged.nose}
              lineWeight={lineWeight}
              sizePx={previewPx}
              state="happy"
            />
          )}
        </span>
        <button type="button" className="aora-button" aria-label={t('editor.close')} onClick={cancel}>
          ×
        </button>
      </div>

      <div className="aora-editor__tabs" role="tablist" aria-label={t('editor.tabs')}>
        {tabs.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`aora-editor-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`aora-editor-panel-${id}`}
            className="aora-editor__tab"
            data-selected={tab === id || undefined}
            onClick={() => setTab(id)}
          >
            {t(TAB_LABEL[id])}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`aora-editor-panel-${tab}`}
        aria-labelledby={`aora-editor-tab-${tab}`}
        className="aora-editor__panel"
      >
        {tab === 'character' && (
          <AgentCharacterPicker
            value={staged}
            hasPicture={Boolean(showPicture)}
            lineWeight={lineWeight}
            actions={false}
            immediate
            onCommit={setStaged}
          />
        )}

        {tab === 'generate' && (
          <div className="aora-editor__generate">
            <textarea
              className="aora-field"
              rows={3}
              placeholder={t('editor.generate.placeholder')}
              aria-label={t('editor.generate.placeholder')}
              value={prompt}
              readOnly={pending}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                // The shortcut every other multi-line field in an app this
                // shape uses; Enter alone still inserts a newline.
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void generate();
              }}
            />
            <button
              type="button"
              className="aora-button aora-button--primary"
              disabled={pending || !prompt.trim()}
              onClick={() => void generate()}
            >
              {t(pending ? 'editor.generate.pending' : 'editor.generate.action')}
            </button>
          </div>
        )}

        {tab === 'upload' && (
          <div className="aora-editor__upload">
            {source && view ? (
              <CropStage
                source={source}
                pan={pan}
                zoom={zoom}
                onPan={(next) => setPan(clampPan(next, view))}
                onZoom={(next) => {
                  const clamped = clampZoom(next);
                  setZoom(clamped);
                  // Re-clamp on the new scale, or zooming out leaves the
                  // window sitting outside a now-smaller image.
                  setPan((current) => clampPan(current, { ...view, zoom: clamped }));
                }}
                zoomLabel={t('editor.zoom')}
                hint={t('editor.crop.hint')}
              />
            ) : (
              <label className="aora-editor__drop">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void acceptFile(event.target.files?.[0])}
                />
                <span className="aora-editor__dropText">{t('editor.upload.prompt')}</span>
                <span className="aora-editor__dropHint">{t('editor.upload.hint')}</span>
              </label>
            )}
          </div>
        )}

        {error && (
          <p className="aora-editor__error" role="alert">
            {t(error)}
          </p>
        )}
      </div>

      <div className="aora-editor__actions">
        {showPicture && (
          <button
            type="button"
            className="aora-button"
            onClick={() => {
              setSource(null);
              setRemoved(true);
            }}
          >
            {t(value.pictureUrl ? 'editor.useCharacter' : 'editor.remove')}
          </button>
        )}
        <span className="aora-editor__spacer" />
        <button type="button" className="aora-button" onClick={cancel}>
          {t('editor.cancel')}
        </button>
        <button type="button" className="aora-button aora-button--primary" onClick={save}>
          {t('editor.save')}
        </button>
      </div>
    </div>
  );
}

const TAB_LABEL: Record<AvatarEditorTab, LocaleKey> = {
  character: 'editor.tab.character',
  generate: 'editor.tab.generate',
  upload: 'editor.tab.upload',
};

function editorTabs(character: boolean, generate: boolean): AvatarEditorTab[] {
  const tabs: AvatarEditorTab[] = [];
  if (character) tabs.push('character');
  if (generate) tabs.push('generate');
  tabs.push('upload');
  return tabs;
}

interface CropStageProps {
  source: LoadedImage;
  pan: Pan;
  zoom: number;
  onPan: (pan: Pan) => void;
  onZoom: (zoom: number) => void;
  zoomLabel: string;
  hint: string;
}

/**
 * A round window over an image, draggable, with a zoom.
 *
 * The image is scaled with `width`/`height` rather than a CSS transform so
 * the browser resamples once per size change instead of once per frame of the
 * drag, and pointer capture is taken on the stage so a fast drag that leaves
 * the 96px circle keeps moving the image rather than stopping dead.
 */
function CropStage({ source, pan, zoom, onPan, onZoom, zoomLabel, hint }: CropStageProps) {
  const drag = useRef<{ id: number; x: number; y: number; pan: Pan } | null>(null);
  const scale = coverScale({ width: source.width, height: source.height, zoom });

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, pan };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    onPan({
      x: active.pan.x + (event.clientX - active.x),
      y: active.pan.y + (event.clientY - active.y),
    });
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="aora-crop">
      <div
        className="aora-crop__stage"
        style={{ width: CROP_STAGE_PX, height: CROP_STAGE_PX }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img
          src={source.dataUrl}
          alt=""
          draggable={false}
          style={{
            width: source.width * scale,
            height: source.height * scale,
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
          }}
        />
      </div>
      <span className="aora-crop__hint">{hint}</span>
      <div className="aora-crop__zoom">
        <button
          type="button"
          className="aora-button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => onZoom(zoom - ZOOM_STEP)}
        >
          −
        </button>
        <input
          type="range"
          aria-label={zoomLabel}
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.01}
          value={zoom}
          onChange={(event) => onZoom(Number(event.target.value))}
        />
        <button
          type="button"
          className="aora-button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => onZoom(zoom + ZOOM_STEP)}
        >
          +
        </button>
      </div>
    </div>
  );
}
