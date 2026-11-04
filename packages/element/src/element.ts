import {
  COLOR_IDS,
  DEFAULT_STYLE_ID,
  FACE_STYLES,
  IDLE_STATE,
  SHAPE_IDS,
  autoNoseForKey,
  castMember,
  createCharacter,
  getInkVars,
  getLeafColor,
  getStyle,
  hasStyle,
  isCharacterState,
  isNoseId,
  type CastId,
  type CharacterController,
  type CharacterOptions,
  type CharacterPreset,
  type CharacterState,
  type ColorId,
  type FaceStyle,
  type NoseId,
  type ShapeId,
  type StyleId,
  type StyleVariant,
} from '@aora-bot/engine';

/**
 * The attributes `<aora-bot>` reads, as an author writes them. Every value is
 * a string in the document; the types say which ones the element understands
 * and fall back from the rest.
 */
export interface AoraBotAttributes {
  /** A named character from the cast. Supplies `shape`, `color`, `face` and `nose` when they are not given. */
  character?: CastId;
  shape?: ShapeId;
  color?: ColorId;
  face?: FaceStyle;
  /** A nose id, or `none` for no nose. */
  nose?: NoseId | 'none';
  state?: CharacterState;
  /** The style series. Named `style-id` because `style` is already the inline CSS. */
  'style-id'?: StyleId;
  variant?: StyleVariant;
  /** A JSON object of the series' parameters, such as `{"paperOffset":12}`. */
  'style-options'?: string;
  seed?: string;
  /** A CSS length, or a bare number of pixels. Defaults to 28px. */
  size?: string | number;
  /** Colour of the eye cut-outs. */
  'eye-color'?: string;
  /** Corner badge colour, shown in the `notifying` state. */
  'badge-color'?: string;
  'eye-scale'?: string | number;
  'line-weight'?: string | number;
  'reduced-motion'?: boolean;
  paused?: boolean;
  emphasis?: boolean;
  antics?: boolean;
  'auto-pause'?: boolean;
}

const ATTRIBUTES = [
  'character',
  'shape',
  'color',
  'face',
  'nose',
  'state',
  'style-id',
  'variant',
  'style-options',
  'seed',
  'size',
  'eye-color',
  'badge-color',
  'eye-scale',
  'line-weight',
  'reduced-motion',
  'paused',
  'emphasis',
  'antics',
  'auto-pause',
] as const satisfies readonly (keyof AoraBotAttributes)[];

/** What the engine reads once, when a character is created. A change to one of them builds a new character. */
const FIXED = new Set<string>(['seed', 'reduced-motion', 'auto-pause']);

const BASE_STYLES = `
:host { display: inline-block; width: 28px; height: 28px; }
:host([hidden]) { display: none; }
.mark {
  display: flex;
  width: 100%;
  height: 100%;
  --aora-bg: var(--aora-bg-base, Canvas);
}
.mark > svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
  user-select: none;
  -webkit-user-select: none;
}
`;

interface Resolved {
  live: CharacterOptions;
  fixed: Pick<CharacterOptions, 'seed' | 'reducedMotion' | 'autoPause'>;
  color: ColorId;
  member: CharacterPreset | null;
  eyeColor: string | null;
  size: string | null;
}

const pick = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined =>
  value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

const finite = (value: string | null): number | undefined => {
  if (value === null || value.trim() === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

/** The attribute as a JSON object; text that is not one is read as no parameters, never as an error. */
function jsonObject(value: string | null): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value ?? '');
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** A bare number is pixels. Anything else has to be a width the browser accepts. */
function cssLength(value: string | null): string | null {
  const text = value?.trim();
  if (!text) return null;
  const length = /^\d*\.?\d+$/.test(text) ? `${text}px` : text;
  const probe = document.createElement('span');
  probe.style.width = length;
  return probe.style.width ? length : null;
}

/**
 * Turn the attributes into engine options the way `CharacterMark` turns its
 * props: a value the engine does not know falls back to the cast member's
 * choice, then to the default. Every field is explicit, because the engine's
 * `update` keeps the old value of anything left `undefined`, which would make
 * a removed attribute a no-op.
 */
function resolve(el: Element): Resolved {
  const get = (name: keyof AoraBotAttributes) => el.getAttribute(name);
  const member = castMember(get('character'));
  const shape = pick(get('shape'), SHAPE_IDS) ?? member?.shape ?? 'mochi';
  const color = pick(get('color'), COLOR_IDS) ?? member?.color ?? 'black';
  const face = pick(get('face'), FACE_STYLES) ?? member?.face ?? 'cute';
  const seed = get('seed') || `${shape}:${color}`;

  const noseAttr = get('nose');
  const nose =
    noseAttr === 'none'
      ? null
      : noseAttr !== null && isNoseId(noseAttr)
        ? noseAttr
        : (member?.nose ?? autoNoseForKey(seed));

  const stateAttr = get('state');
  const state = stateAttr !== null && isCharacterState(stateAttr) ? stateAttr : IDLE_STATE;

  const styleAttr = get('style-id');
  const style = styleAttr !== null && hasStyle(styleAttr) ? styleAttr : DEFAULT_STYLE_ID;
  const series = getStyle(style);
  const variantAttr = get('variant');
  const variant =
    variantAttr !== null && series.variants.includes(variantAttr) ? variantAttr : series.defaultVariant;

  const eyeScale = finite(get('eye-scale'));

  return {
    live: {
      shape,
      state,
      variant,
      style,
      styleOptions: jsonObject(get('style-options')),
      face,
      nose,
      paused: el.hasAttribute('paused'),
      emphasis: el.hasAttribute('emphasis'),
      eyeScale: eyeScale !== undefined && eyeScale > 0 ? eyeScale : 1,
      lineWeight: finite(get('line-weight')) ?? 1,
      badgeColor: get('badge-color') ?? 'var(--aora-accent)',
      antics: el.hasAttribute('antics'),
    },
    fixed: {
      seed,
      reducedMotion: el.hasAttribute('reduced-motion') || undefined,
      autoPause: el.hasAttribute('auto-pause'),
    },
    color,
    member,
    eyeColor: get('eye-color'),
    size: cssLength(get('size')),
  };
}

// Outside a browser there is no `HTMLElement` to extend. The class still has to
// exist so importing the package, on a server or in a build step, does not throw.
// oxlint-disable-next-line typescript/no-extraneous-class -- a stand-in that is never constructed
const Base = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

/**
 * `<aora-bot>`: one animated character, configured by attributes.
 *
 * The character is drawn into a shadow root, so page CSS cannot reach it. It
 * is `role="img"`, labelled with the cast member's name unless the author gave
 * it a label of their own.
 */
export class AoraBotElement extends Base {
  static readonly observedAttributes: readonly string[] = ATTRIBUTES;

  declare character: string | null;
  declare shape: string | null;
  declare color: string | null;
  declare face: string | null;
  declare nose: string | null;
  declare state: string | null;
  declare styleId: string | null;
  declare variant: string | null;
  declare styleOptions: string | null;
  declare seed: string | null;
  declare size: string | null;
  declare eyeColor: string | null;
  declare badgeColor: string | null;
  declare eyeScale: number | null;
  declare lineWeight: number | null;
  declare reducedMotion: boolean;
  declare paused: boolean;
  declare emphasis: boolean;
  declare antics: boolean;
  declare autoPause: boolean;

  readonly #style = document.createElement('style');
  readonly #mark = document.createElement('span');
  #controller: CharacterController | null = null;
  /** The label this element wrote itself, so a label the author wrote later is never overwritten. */
  #autoLabel: string | null = null;

  constructor() {
    super();
    this.#mark.className = 'mark';
    this.attachShadow({ mode: 'open' }).append(this.#style, this.#mark);
  }

  /** The engine controller, or `null` while the element is not connected. */
  get controller(): CharacterController | null {
    return this.#controller;
  }

  connectedCallback(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'img');
    this.#apply(true);
  }

  disconnectedCallback(): void {
    this.#controller?.destroy();
    this.#controller = null;
  }

  attributeChangedCallback(name: string): void {
    if (this.#controller) this.#apply(FIXED.has(name));
  }

  spin(turns?: number): void {
    this.#controller?.spin(turns);
  }

  bounce(strength?: number): void {
    this.#controller?.bounce(strength);
  }

  burst(count?: number): void {
    this.#controller?.burst(count);
  }

  pause(): void {
    this.#controller?.pause();
  }

  resume(): void {
    this.#controller?.resume();
  }

  #apply(rebuild: boolean): void {
    const { live, fixed, color, member, eyeColor, size } = resolve(this);

    this.#style.textContent = size ? `${BASE_STYLES}:host { width: ${size}; height: ${size}; }` : BASE_STYLES;

    const vars = { ...getInkVars(color), '--aora-leaf': getLeafColor(color) };
    this.#mark.removeAttribute('style');
    for (const [name, value] of Object.entries(vars)) this.#mark.style.setProperty(name, value);
    if (eyeColor) this.#mark.style.setProperty('--aora-bg', eyeColor);

    this.#label(member);

    if (this.#controller && !rebuild) {
      this.#controller.update(live);
      return;
    }
    this.#controller?.destroy();
    this.#controller = createCharacter(this.#mark, { ...live, ...fixed });
  }

  #label(member: CharacterPreset | null): void {
    const own = this.getAttribute('aria-label');
    if (own !== null && own !== this.#autoLabel) return;
    const language = this.closest('[lang]')?.getAttribute('lang') ?? '';
    const label = member ? member.name[/^zh/i.test(language) ? 'zh' : 'en'] : 'Aora Bot';
    this.setAttribute('aria-label', label);
    this.#autoLabel = label;
  }
}

const PROPERTIES = {
  text: {
    character: 'character',
    shape: 'shape',
    color: 'color',
    face: 'face',
    nose: 'nose',
    state: 'state',
    styleId: 'style-id',
    variant: 'variant',
    styleOptions: 'style-options',
    seed: 'seed',
    size: 'size',
    eyeColor: 'eye-color',
    badgeColor: 'badge-color',
  },
  number: { eyeScale: 'eye-scale', lineWeight: 'line-weight' },
  flag: {
    reducedMotion: 'reduced-motion',
    paused: 'paused',
    emphasis: 'emphasis',
    antics: 'antics',
    autoPause: 'auto-pause',
  },
};

/** A property for each attribute: `el.state = 'happy'` is `el.setAttribute('state', 'happy')`. */
function defineProperty(name: string, attribute: string, kind: keyof typeof PROPERTIES): void {
  Object.defineProperty(AoraBotElement.prototype, name, {
    configurable: true,
    enumerable: true,
    get(this: Element) {
      const value = this.getAttribute(attribute);
      if (kind === 'flag') return value !== null;
      return kind === 'number' && value !== null ? (finite(value) ?? null) : value;
    },
    set(this: Element, value: unknown) {
      if (kind === 'flag') this.toggleAttribute(attribute, Boolean(value));
      else if (value == null) this.removeAttribute(attribute);
      else this.setAttribute(attribute, String(value));
    },
  });
}

for (const [kind, names] of Object.entries(PROPERTIES)) {
  for (const [name, attribute] of Object.entries(names)) {
    defineProperty(name, attribute, kind as keyof typeof PROPERTIES);
  }
}

let defined = false;

/**
 * Register `<aora-bot>`, or another tag name, and return the constructor.
 * Safe to call twice and safe to call without a DOM, where it registers nothing.
 */
export function defineAoraBot(tagName = 'aora-bot'): typeof AoraBotElement {
  if (typeof customElements === 'undefined') return AoraBotElement;
  const existing = customElements.get(tagName);
  if (existing) return existing as typeof AoraBotElement;
  // A constructor can only be registered once, so a second tag gets a subclass.
  const constructor = defined ? class extends AoraBotElement {} : AoraBotElement;
  customElements.define(tagName, constructor);
  defined = true;
  return constructor;
}

declare global {
  interface HTMLElementTagNameMap {
    'aora-bot': AoraBotElement;
  }
}
