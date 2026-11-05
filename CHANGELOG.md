# Changelog

## 0.1.3

All four packages are released at this version to carry the Aora Bot License 1.1. The code is unchanged.

### License

- Free users must credit Aora Bot once a product that uses it is publicly released: the words "Aora Bot" with a link to the GitHub repository, in any one place of their choice, such as an About page, the website footer, a store description or the README, or, for a product that cannot carry a link, its manual or credits. Personal use, learning and research, internal testing and unreleased projects require no credit, and a commercial license may omit it.
- Versions 0.1.1 and 0.1.2 remain under the Aora Bot License 1.0.

### Docs

- The license page describes the credit requirement and provides an optional template for commercial license inquiries.
- Documentation pages end with a copyright notice linking to the license page.
- A new Copyright page sets out who owns the code and the characters, how the name and characters may be used, and how third-party content is treated.

## 0.1.2

Only `@aora-bot/element` is released at this version; the other packages stay at 0.1.1.

### `@aora-bot/element`

- `style-options`, a JSON object of the style series' parameters, such as `style-options='{"paperOffset":12}'`. Text that is not a JSON object is ignored, and removing the attribute restores the defaults.

### Avatar endpoint

- `shape`, `color` and `face` replace what the id picks, and each parameter of the chosen style series can be given by name, such as `paperOffset=12` or `outline=false`. Values out of range return HTTP 400.

### Docs

- The console's code chip copies the character in three formats: React, an `<aora-bot>` tag with its script, or an avatar link.
- The style parameters button is dimmed when the chosen style has nothing to tune.
- Page addresses no longer end in `.html`.

## 0.1.1

First release. Four packages, a documentation site and an avatar endpoint.

### `@aora-bot/engine`

- **Characters.** 46 procedural characters in ten families (`SHAPE_FAMILIES`): round, rounded rectangle, polygon, petal, garden, fruit, figure, sea, critter and people. Each body is an outline derived at runtime; ears, leaves, antennae and hair are separate parts (`body`, `leaf`, `inner` and `hair` tones) that ride the body's pose. `defineShape` registers a custom outline, with parts. Every shape has a named cast member (`CAST`, `castMember`).
- **Faces.** Three faces (`FACE_STYLES`): `cute`, the default, painted on the body with dot eyes, a small mouth and blush; `eyes`, two cut-outs; and `line`, with parametric mouths and six noses. A face fitter searches each silhouette for the roomiest spot, so no eye is hand-placed, and keeps clear of hair.
- **States.** 44 animation states driven by damped springs at a fixed substep, with mood effects (Zz, sparkles, tears, a heart, thinking dots, orbiting planets, progress, sound waves and more) evaluated as pure functions of time. `spin()` turns a character about its vertical axis; celebrations throw ribbons and confetti.
- **Styles.** Three series, each with its own parameters and ranges (`resolveStyleOptions`, `paramsForVariant`):
  - `vector`: `solid`, `outline`, `glass`, `sticker`, `paper`, `soft` and `riso`;
  - `pixel`: `crisp`, `dot` and `block`, rasterised from the same frame;
  - `kaomoji`: `plain` and `bubble`, the character written as text, with brackets chosen by the shape (`kaomoji(shape, state)`).
- **Colour.** Twelve inks with light and dark pairs resolved by `light-dark()`, so a character follows the page's `color-scheme`. `getInkVars(color)` writes every custom property a colour needs (`--aora-fg`, `--aora-face`, `--aora-face-soft`, `--aora-face-sticker`, `--aora-hair-shade` and `--aora-ink2`); leaves read `--aora-leaf`. A flat or gradient `ink` overrides the palette; `{ flat: 'currentColor' }` on `outline` draws a single line in the text colour.
- **HUD.** Ten readout forms (`progress`, `timer`, `clock`, `voice`, `context`, `balance`, `gauge`, `kpi`, `notify` and `sync`) drawn in the ring around the silhouette.
- **Agents.** A numeric emotion protocol, a multi-session arbiter, adapters for Claude Code and Cursor, and state channels over `postMessage` and line streams, on a DOM-free `/agent` entry.
- **Rendering.** One shared `requestAnimationFrame` loop for every character on the page, `autoPause` for visibility, viewport and reduced motion, and server-safe static SVG on the `/static` entry (`colorScheme: 'system' | 'page'`).

### `@aora-bot/element`

- `<aora-bot>`, a Web Component for pages without React: attributes for the character, state, style series, variant, size and the rest of the drawing options, `spin`, `bounce` and `burst` methods, and `role="img"` with the cast member's name as its label.
- A single-file CDN build that bundles the engine and registers the tag on load: `<script type="module" src="https://cdn.jsdelivr.net/npm/@aora-bot/element">`.
- `defineAoraBot(tagName)`, safe to import during server rendering.

### `@aora-bot/react`

- `CharacterMark`, `CharacterMarkMirror` and `MarkStageProvider`, which shares one animation between every character of the same appearance.
- `AppearanceProvider` for drawing defaults in a subtree; `useMarkCommands` to hold, release, poke and spin from anywhere.
- Avatars and activity: `AgentAvatar`, `AvatarStack`, `AvatarStatusDot`, `WorkingBadge`, `UnreadBadge`, `ActivityMark`, `GroupActivityMark` and `ActivityTicker`.
- Pickers and editing: `CharacterPicker`, `CompactCharacterPicker`, `AgentCharacterPicker`, `AvatarEditor`, `AvatarTrigger` and `EditableAvatar`.
- `HudPlate`, `AgentHud`, `AgentStateProvider`, `useStateChannel`, `useIdleSleep`, `SpriteMark` and `ConfettiLayer`.
- `LocaleProvider` with `en-US` and `zh-CN`, and `useLabel()` for every shape, colour, state, face, style and parameter.
- Requires React 19.

### `@aora-bot/surfaces`

Product and demo surfaces built on the two packages above, in their own stylesheet layer (`aora.surfaces`) with `aora-s-` class names: the walkthrough (`DemoDesktop`, `JobBubbles`, `SuggestionCards`, `LandingWait`, `HandOff`, `Composer`), scenes (`RestrictedScene`, `DeviceBezel`, `BootLoop`, `LoadingMark`), template publishing (`TemplateDialog`, `ShareCard`, `usePublishMark`), occupancy lists and cast stages.

### Avatar endpoint

`https://aora-bot.vercel.app/avatar/<id>.svg` returns a deterministic character for any id, ready for an `<img>` or Markdown, with optional `style`, `variant`, `state` and `size`.

### Docs

- The home page is a console: one large character with its style, colour, face, shape and expression around it, a snippet to copy and a link to share.
- Guides, design pages for every shape, state, face, colour and style, a page per component, internals, and ten scenarios with live demos, in English and Chinese, with a switch in the navbar between the two.
- A sponsor page with payment codes, open sponsor seats and a way to get in touch.
- Guides for using Aora Bot without React and for the avatar endpoint.
- A license page that spells out who uses Aora Bot free and when a commercial license is needed, and a link in the navbar to the classic Emotion Ball.

### License

Released under the Aora Bot License: free for individuals, education, non-profits, open-source projects and teams of up to 3 people, commercial use included; larger companies need a commercial license. Reselling the engine or characters on their own, hosting them as a service and selling them as goods are not allowed.
