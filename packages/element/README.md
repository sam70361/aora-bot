# @aora-bot/element

The [Aora Bot](https://aora-bot.vercel.app) character as a Web Component, for pages without React.
A named cast of generated characters, animation states, three faces, and vector, pixel and
kaomoji styles, drawn entirely by code and animated from one shared frame loop. Pick one in the
[console](https://aora-bot.vercel.app/en/) and set it with attributes.

## From a CDN

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@aora-bot/element"></script>

<aora-bot character="mochi" state="happy" size="120"></aora-bot>
```

That one file carries the engine and registers `<aora-bot>` when it loads. No build step.

## Install

```bash
pnpm add @aora-bot/element
```

```ts
import { defineAoraBot } from '@aora-bot/element';

defineAoraBot(); // registers <aora-bot>; call it once, early
```

`defineAoraBot(tagName = 'aora-bot')` returns the element class and is safe to call more than
once. Importing the package never touches the DOM, so it is safe in a server render or a build
step; there, `defineAoraBot` registers nothing. `@aora-bot/engine` is a dependency and comes along
automatically. To ship the single bundled file from your own host, import
`@aora-bot/element/cdn`.

## Attributes

Every attribute is optional. A value the engine does not know falls back to the default, or to
the cast member's choice, and never throws.

| Attribute        | Values                                                                | Default                         |
| ---------------- | --------------------------------------------------------------------- | ------------------------------- |
| `character`      | A cast id such as `mochi`, `byte` or `luna`                           | None                            |
| `shape`          | One of the roster's shapes                                            | The cast member's, else `mochi` |
| `color`          | One hue of the palette                                                | The cast member's, else `black` |
| `face`           | `cute`, `eyes` or `line`                                              | The cast member's, else `cute`  |
| `nose`           | A nose id, or `none`                                                  | Derived from `seed`             |
| `state`          | One of the animation states                                           | `idle`                          |
| `style-id`       | `vector`, `pixel` or `kaomoji`                                        | `vector`                        |
| `variant`        | A variant of the chosen style, such as `outline` or `dot`             | The style's own default         |
| `style-options`  | A JSON object of the style's parameters, such as `{"paperOffset":12}` | The style's own defaults        |
| `seed`           | Any string; makes blinks and idle motion differ per instance          | `shape:color`                   |
| `size`           | A CSS length, or a number of pixels                                   | `28px`                          |
| `eye-color`      | Any CSS colour for the eye cut-outs                                   | The page background             |
| `badge-color`    | Any CSS colour for the `notifying` badge                              | `var(--aora-accent)`            |
| `eye-scale`      | A positive number                                                     | `1`                             |
| `line-weight`    | A number from 0.8 to 1.25                                             | `1`                             |
| `reduced-motion` | Boolean; draw one still frame instead of animating                    | Follows the OS setting          |
| `paused`         | Boolean; hold the current frame                                       | Off                             |
| `emphasis`       | Boolean; enlarge and converge the eyes                                | Off                             |
| `antics`         | Boolean; hop or spin now and then while idle                          | Off                             |
| `auto-pause`     | Boolean; stop while hidden or scrolled out of view                    | Off                             |

`style` is already the inline CSS attribute, so the style series is `style-id`. Changing an
attribute updates the running character; only `seed`, `reduced-motion` and `auto-pause` are read
once and build a new one. Each attribute is also a property in camel case, so
`el.state = 'happy'` and `el.styleId = 'pixel'` work.

`style-options` carries the parameters the style series declares, written as JSON in a
single-quoted attribute. A value that is not a JSON object is ignored.

```html
<aora-bot shape="mochi" color="blue" variant="paper" style-options='{"paperOffset":12}'></aora-bot>
```

The element is `role="img"` and labelled with the cast member's name, in Chinese when the nearest
`lang` is `zh`. Set your own `aria-label` or `role` and they are left alone.

## Methods

```ts
const el = document.querySelector('aora-bot');

el.state = 'celebrate';
el.spin(2); // two turns
el.bounce(0.5); // half a hop
el.burst(24); // confetti
el.pause();
el.resume();
el.controller; // the engine's CharacterController, or null while disconnected
```

`spin`, `bounce`, `burst`, `pause` and `resume` call the same methods on the engine controller
and do nothing while the element is not in a document. For anything finer, such as `followTarget`
or `hud`, call `el.controller.update({ ... })`.

## Styling

The character is drawn in a shadow root, so page CSS cannot reach inside. The host is
`display: inline-block`; size it with `size`, or with your own `width` and `height`. Ink follows
the page's `color-scheme`, and `--aora-bg-base` on any ancestor sets the colour behind the eye
cut-outs.

## Without the element

```ts
import { createCharacter } from '@aora-bot/engine';

const character = createCharacter(document.querySelector('#avatar')!, { shape: 'mochi', state: 'happy' });
```

## Documentation

- [Without React](https://aora-bot.vercel.app/en/guide/without-react)
- [Getting started](https://aora-bot.vercel.app/en/guide/getting-started)
- [Shapes](https://aora-bot.vercel.app/en/design/shapes) | [States](https://aora-bot.vercel.app/en/design/states) | [Palette](https://aora-bot.vercel.app/en/design/palette)
- [Cast](https://aora-bot.vercel.app/en/design/cast)

## License

[Aora Bot License](https://github.com/sam70361/aora-bot/blob/main/LICENSE): free for individuals, education, non-profits, open-source projects and teams of up to 3 people, commercial use included. Larger companies need a [commercial license](https://github.com/sam70361/aora-bot/blob/main/LICENSE-COMMERCIAL.md).
