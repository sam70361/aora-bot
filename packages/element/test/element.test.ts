// @vitest-environment happy-dom
import { castMember, FACE_STYLES } from '@aora-bot/engine';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AoraBotElement, defineAoraBot } from '../src/index.js';

/*
 * Reduced motion keeps the shared ticker out of these tests: the character
 * draws one frame on creation and never schedules another.
 */

beforeAll(() => {
  defineAoraBot();
});

afterEach(() => {
  document.body.replaceChildren();
});

function mount(attributes: Record<string, string> = {}): AoraBotElement {
  const el = document.createElement('aora-bot') as AoraBotElement;
  el.setAttribute('reduced-motion', '');
  for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
  document.body.appendChild(el);
  return el;
}

const mark = (el: AoraBotElement) => el.shadowRoot!.querySelector<HTMLElement>('.mark')!;

/** The markup without its generated ids and references to them, so two characters compare equal. */
const markup = (el: AoraBotElement) => mark(el).innerHTML.replace(/ id="[^"]*"|url\(#[^)]*\)/g, '');

describe('defineAoraBot', () => {
  it('registers the tag and returns the constructor', () => {
    expect(customElements.get('aora-bot')).toBe(AoraBotElement);
    expect(defineAoraBot()).toBe(AoraBotElement);
    expect(document.createElement('aora-bot')).toBeInstanceOf(AoraBotElement);
  });

  it('is safe to call twice', () => {
    expect(() => {
      defineAoraBot();
      defineAoraBot();
    }).not.toThrow();
  });

  it('registers another tag name with a subclass', () => {
    const Constructor = defineAoraBot('x-aora-bot');
    expect(customElements.get('x-aora-bot')).toBe(Constructor);
    expect(new Constructor()).toBeInstanceOf(AoraBotElement);
    expect(defineAoraBot('x-aora-bot')).toBe(Constructor);
  });
});

describe('<aora-bot>', () => {
  it('draws one SVG into its shadow root and destroys it on disconnect', () => {
    const el = mount({ character: 'mochi' });
    const controller = el.controller!;

    expect(mark(el).querySelectorAll('svg')).toHaveLength(1);
    expect(mark(el).firstElementChild).toBe(controller.element);

    el.remove();
    expect(el.controller).toBeNull();
    expect(mark(el).querySelector('svg')).toBeNull();
  });

  it('builds a new character when it is connected again', () => {
    const el = mount();
    const first = el.controller;
    el.remove();
    document.body.appendChild(el);

    expect(el.controller).not.toBeNull();
    expect(el.controller).not.toBe(first);
    expect(mark(el).querySelectorAll('svg')).toHaveLength(1);
  });

  it('applies the cast member preset', () => {
    const member = castMember('byte')!;
    const el = mount({ character: 'byte' });
    const reference = mount({ shape: member.shape, color: member.color });

    expect(markup(el)).toBe(markup(reference));
    expect(mark(el).style.getPropertyValue('--aora-fg')).toBe(
      mark(reference).style.getPropertyValue('--aora-fg'),
    );
  });

  it('lets an explicit attribute win over the preset', () => {
    const el = mount({ character: 'byte', color: 'pink' });
    const preset = mount({ character: 'byte' });

    expect(mark(el).style.getPropertyValue('--aora-fg')).not.toBe(
      mark(preset).style.getPropertyValue('--aora-fg'),
    );
  });

  it('falls back to the defaults for values it does not know', () => {
    const el = mount({
      character: 'nobody',
      shape: 'blob-9',
      color: 'plaid',
      state: 'vibing',
      face: 'mustache',
      nose: 'pickle',
      'style-id': 'watercolour',
      variant: 'oil',
      'eye-scale': 'big',
      'line-weight': '',
      size: 'wide',
    });
    const plain = mount();

    expect(el.controller).not.toBeNull();
    expect(markup(el)).toBe(markup(plain));
  });

  it('updates the live character instead of replacing it', () => {
    const el = mount({ character: 'mochi', state: 'idle' });
    const controller = el.controller!;
    const update = vi.spyOn(controller, 'update');

    el.setAttribute('state', 'happy');
    el.setAttribute('variant', 'outline');
    el.setAttribute('style-id', 'pixel');
    el.setAttribute('face', 'line');
    el.setAttribute('paused', '');

    expect(el.controller).toBe(controller);
    expect(update).toHaveBeenCalledTimes(5);
    expect(update).toHaveBeenNthCalledWith(1, expect.objectContaining({ state: 'happy' }));
    expect(update).toHaveBeenNthCalledWith(2, expect.objectContaining({ variant: 'outline' }));
    expect(update).toHaveBeenNthCalledWith(3, expect.objectContaining({ style: 'pixel' }));
    expect(update).toHaveBeenNthCalledWith(4, expect.objectContaining({ face: 'line' }));
    expect(update).toHaveBeenNthCalledWith(5, expect.objectContaining({ paused: true }));
  });

  it('accepts every face the engine lists, drawn faces included', () => {
    const el = mount({ character: 'mochi' });
    const update = vi.spyOn(el.controller!, 'update');
    const faces = FACE_STYLES.filter((face) => face !== 'cute');
    for (const face of faces) el.setAttribute('face', face);
    expect(update.mock.calls.map(([options]) => options.face)).toEqual(faces);
  });

  it('returns an option to its default when the attribute is removed', () => {
    const el = mount({ 'eye-scale': '1.4', 'line-weight': '1.2', emphasis: '' });
    const update = vi.spyOn(el.controller!, 'update');

    el.removeAttribute('eye-scale');
    el.removeAttribute('line-weight');
    el.removeAttribute('emphasis');

    expect(update).toHaveBeenLastCalledWith(
      expect.objectContaining({ eyeScale: 1, lineWeight: 1, emphasis: false }),
    );
  });

  it('passes style-options to the engine as series parameters', () => {
    const el = mount({ variant: 'paper', 'style-options': '{"paperOffset":12}' });
    const plain = mount({ variant: 'paper' });
    const update = vi.spyOn(el.controller!, 'update');

    expect(markup(el)).not.toBe(markup(plain));

    el.setAttribute('style-options', '{"paperOffset":4}');
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ styleOptions: { paperOffset: 4 } }));
    expect(markup(el)).not.toBe(markup(plain));
    expect(el.styleOptions).toBe('{"paperOffset":4}');
  });

  it.each(['{paperOffset: 12', 'paperOffset', '[12]', 'null', '12', '"paperOffset"', ''])(
    'ignores style-options %j',
    (value) => {
      const el = mount({ variant: 'paper', 'style-options': value });

      expect(markup(el)).toBe(markup(mount({ variant: 'paper' })));
      expect(() => el.setAttribute('style-options', value)).not.toThrow();
    },
  );

  it('returns to the series defaults when style-options is removed', () => {
    const el = mount({ variant: 'paper', 'style-options': '{"paperOffset":12}' });
    const update = vi.spyOn(el.controller!, 'update');

    el.removeAttribute('style-options');

    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ styleOptions: {} }));
    expect(markup(el)).toBe(markup(mount({ variant: 'paper' })));
  });

  it('paints the colour through custom properties and clears the old ones', () => {
    const el = mount({ color: 'black' });
    expect(mark(el).style.getPropertyValue('--aora-face-soft')).not.toBe('');

    el.setAttribute('color', 'blue');
    expect(mark(el).style.getPropertyValue('--aora-fg')).not.toBe('');
    expect(mark(el).style.getPropertyValue('--aora-face-soft')).toBe('');

    el.setAttribute('eye-color', '#ff0000');
    expect(mark(el).style.getPropertyValue('--aora-eye')).toBe('#ff0000');
  });

  it('builds a new character when an option the engine reads once changes', () => {
    const el = mount({ character: 'mochi' });
    const first = el.controller!;
    const destroy = vi.spyOn(first, 'destroy');

    el.setAttribute('seed', 'ada');

    expect(destroy).toHaveBeenCalledOnce();
    expect(el.controller).not.toBe(first);
    expect(mark(el).querySelectorAll('svg')).toHaveLength(1);
  });

  it('sizes the host from a number of pixels or a CSS length', () => {
    const el = mount({ size: '96' });
    const css = () => el.shadowRoot!.querySelector('style')!.textContent;

    expect(css()).toContain(':host { width: 96px; height: 96px; }');
    el.setAttribute('size', '4rem');
    expect(css()).toContain(':host { width: 4rem; height: 4rem; }');
    el.removeAttribute('size');
    expect(css()).not.toContain('96px');
    expect(css()).not.toContain('4rem');
  });

  it('proxies the controller methods', () => {
    const el = mount();
    const controller = el.controller!;
    const spin = vi.spyOn(controller, 'spin');
    const bounce = vi.spyOn(controller, 'bounce');
    const burst = vi.spyOn(controller, 'burst');
    const pause = vi.spyOn(controller, 'pause');
    const resume = vi.spyOn(controller, 'resume');

    el.spin(2);
    el.bounce(0.5);
    el.burst(8);
    el.pause();
    el.resume();

    expect(spin).toHaveBeenCalledWith(2);
    expect(bounce).toHaveBeenCalledWith(0.5);
    expect(burst).toHaveBeenCalledWith(8);
    expect(pause).toHaveBeenCalledOnce();
    expect(resume).toHaveBeenCalledOnce();
  });

  it('ignores the methods while disconnected', () => {
    const el = document.createElement('aora-bot') as AoraBotElement;

    expect(el.controller).toBeNull();
    expect(() => {
      el.spin();
      el.bounce();
      el.burst();
      el.pause();
      el.resume();
    }).not.toThrow();
  });

  it('mirrors its attributes as properties', () => {
    const el = mount();

    el.state = 'happy';
    el.styleId = 'pixel';
    el.eyeScale = 1.5;
    el.paused = true;

    expect(el.getAttribute('state')).toBe('happy');
    expect(el.getAttribute('style-id')).toBe('pixel');
    expect(el.getAttribute('eye-scale')).toBe('1.5');
    expect(el.hasAttribute('paused')).toBe(true);
    expect(el.eyeScale).toBe(1.5);
    expect(el.paused).toBe(true);

    el.state = null;
    el.paused = false;
    expect(el.hasAttribute('state')).toBe(false);
    expect(el.hasAttribute('paused')).toBe(false);
    expect(el.state).toBeNull();
  });
});

describe('accessibility', () => {
  it('is an image named after the character', () => {
    const el = mount({ character: 'mochi' });

    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe(castMember('mochi')!.name.en);
  });

  it('follows the character and the language of the page', () => {
    const el = mount({ character: 'mochi' });
    el.setAttribute('character', 'dot');
    expect(el.getAttribute('aria-label')).toBe(castMember('dot')!.name.en);

    document.body.lang = 'zh-CN';
    el.setAttribute('character', 'pip');
    expect(el.getAttribute('aria-label')).toBe(castMember('pip')!.name.zh);
    document.body.removeAttribute('lang');
  });

  it('has a generic name without a character', () => {
    expect(mount().getAttribute('aria-label')).toBe('Aora Bot');
  });

  it('keeps a label and a role the author set', () => {
    const el = document.createElement('aora-bot') as AoraBotElement;
    el.setAttribute('reduced-motion', '');
    el.setAttribute('aria-label', 'Support assistant');
    el.setAttribute('role', 'presentation');
    document.body.appendChild(el);
    el.setAttribute('character', 'dot');

    expect(el.getAttribute('aria-label')).toBe('Support assistant');
    expect(el.getAttribute('role')).toBe('presentation');
  });
});
