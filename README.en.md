<div align="center">

# Aora Bot

**A procedural character engine for the web — a roster of generated characters, animated states, sixteen faces, three drawing styles, an SVG HUD, and the UI surfaces built on top of them.**

[Console](https://aora-bot.vercel.app/en/) | [Documentation](https://aora-bot.vercel.app/en/guide/getting-started) | [Scenarios](https://aora-bot.vercel.app/en/scenarios/chat-stream) | [Emotion Ball](https://sam70361.github.io/aora-bot/) | [中文](./README.md)

</div>

<p align="center">
  <img src=".github/media/hero.gif" width="860" alt="Six Aora Bot characters, Dot the cream ball, a strawberry, a cat, a star, a robot and a cloud, moving through happy, excited, shy, surprised, curious, thinking, asleep, angry, celebrating and laughing">
</p>

---

## What this is

A cartoon character that is drawn entirely by code. There are no sprite sheets and no
Lottie files — every body is an outline in code (some with ears, leaves or an antenna as
separate parts), every expression is a few numbers describing a curved stroke,
interpolated by springs, and every animation frame is written directly to SVG attributes
by a `requestAnimationFrame` loop.

The roster has 71 characters, from round blobs and rice cakes to fruit, treats, critters, objects, people and coal.
Here they all are, happy, each in its own face and colour, led by Dot, the cream-white ball:

<p align="center">
  <img src=".github/media/cast.png" width="760" alt="The whole cast of 71 members in a grid, each smiling, with its member id underneath, Dot first">
</p>

Seven holiday and seasonal themes add 122 more characters: Halloween, Christmas, Spring Festival, Mid-Autumn, Easter, Summer and Valentine's Day. Each theme is its own entry (`@aora-bot/engine/themes/<id>`), loaded only when used, so it adds nothing to the main bundle. See every theme in the [Themes](https://aora-bot.vercel.app/en/themes/) gallery.

<p align="center">
  <img src=".github/media/themes.png" width="760" alt="Seven themes, a row each, with six of each theme's characters smiling and their ids underneath">
</p>

Every character combines independent choices, all of which you can try in the
[console](https://aora-bot.vercel.app/en/): the character itself, the style (`vector`, `pixel`
or `kaomoji`) and its variant, the ink colour, the face and the animation state.

<p align="center">
  <img src=".github/media/styles.gif" width="860" alt="Dot drawn in every style: the sixteen vector variants, the three pixel variants and both kaomoji variants, all moving together">
  <br>
  <sub>Dot in every style: <code>vector</code> (<code>solid</code>, <code>outline</code>, <code>glass</code>, <code>sticker</code>, <code>paper</code>, <code>soft</code>, <code>riso</code>, <code>pencil</code>, <code>marker</code>, <code>crayon</code>, <code>watercolor</code>, <code>neon</code>, <code>chalk</code>, <code>origami</code>, <code>relief</code>, <code>gothic</code>), <code>pixel</code> (<code>crisp</code>, <code>dot</code>, <code>block</code>) and <code>kaomoji</code> (<code>plain</code>, <code>bubble</code>).</sub>
</p>

On top of the engine sits a set of React components for the things products actually need
from a character system: a stable character per user derived from any id, shape and
colour pickers, an avatar studio with image crop, group avatar groups, chat activity
indicators, a numeric emotion protocol for AI agents, a HUD that draws progress, timers,
waveforms and KPIs in the ring around the character, and a stage that lets hundreds of
characters share a handful of animations. Onboarding and restricted-state scenes, template
publishing, occupancy lists and cast stages are a separate package built on those.

The default face is `cute` (dot eyes, a small mouth, a blush). The `eyes` face and the
**line face** — a parametric nose and mouth drawn in the same ink and stroke weight as the
eyes — are available with `face="eyes"` and `face="line"`.

## Quick start

```bash
pnpm add @aora-bot/react
```

```tsx
import { CharacterMark } from '@aora-bot/react';
import '@aora-bot/react/styles.css';

<CharacterMark shape="mochi" state="happy" sizePx={96} />;
```

Requires React 19. The product surfaces (walkthrough, scenes, template dialog,
occupancy list, cast stage) are optional:

```bash
pnpm add @aora-bot/surfaces @aora-bot/react
```

```tsx
import { RestrictedScene } from '@aora-bot/surfaces';
import '@aora-bot/react/styles.css';
import '@aora-bot/surfaces/styles.css'; // after the react stylesheet
```

Without React, one script tag puts a character on any page:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@aora-bot/element"></script>
<aora-bot character="mochi" state="happy" size="96"></aora-bot>
```

When all you need is an avatar image, put an [avatar API](https://aora-bot.vercel.app/en/guide/avatar-api) URL in an `<img>`; the same id always gives the same character:

```html
<img src="https://aora-bot.vercel.app/avatar/alice.svg" width="64" height="64" alt="alice" />
```

> The CDN script and the avatar endpoint are not yet available in mainland China; installing from npm and bundling is not affected. Access for users in mainland China is planned.

## Packages

| Package              | What it does                                                                                                                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@aora-bot/engine`   | The engine. Shapes and style series, face fitting, pose projection, spring integrator, state machine, belts, HUD dials, particles, emotion protocol and arbiter. No React; `/static` and `/agent` need no DOM. |
| `@aora-bot/element`  | The `<aora-bot>` Web Component for pages without React, with a single-file CDN build that bundles the engine.                                                                                                  |
| `@aora-bot/react`    | React components. `CharacterMark`, `CharacterStageProvider`, avatars and stacks, pickers, avatar studio, activity badges, HUD plates, agent state, sprites, confetti, locale provider.                         |
| `@aora-bot/surfaces` | Product and demo surfaces built on `@aora-bot/react`. Walkthrough pieces, scenes, template dialog and publishing, occupancy list, cast stage. Peer-depends on the engine and the React package.                |

Each package has its own README: [`packages/engine`](./packages/engine/README.md),
[`packages/element`](./packages/element/README.md),
[`packages/react`](./packages/react/README.md),
[`packages/surfaces`](./packages/surfaces/README.md).

## Repository layout

```
packages/engine/     from-scratch character engine (TypeScript)
packages/element/    Web Component for pages without React
packages/react/      React component layer
packages/surfaces/   product and demo surfaces on top of the React layer
docs/                Rspress documentation site
api/                 avatar endpoint (Vercel Function)
examples/            standalone samples, not part of the workspace build
```

## From Emotion Ball to Aora Bot

This repository used to hold Emotion Ball. Emotion Ball has now been upgraded to Aora Bot. The classic edition is kept in full in the [`emotion-ball` branch](https://github.com/sam70361/aora-bot/tree/emotion-ball) under its original license, is no longer updated, and can still be [tried online](https://sam70361.github.io/aora-bot/).

- **A rewritten engine**: a handful of plain JavaScript scripts became four npm packages written in TypeScript, with full types, tests and server rendering.
- **Original characters**: all 46 launch characters are original designs, Nimbo and Twinkle from Mood Mates joined the cast as originals too, and the cast has since grown to 71. Emotion Ball's signature little ball lives on as Dot (`dot`), who leads the cast.
- **More to work with**: 32 expressions grew into 44 animation states, with three faces, three styles (vector, pixel and kaomoji), HUD dials and a full set of React components. The emotion protocol still accepts `{ emotionId }` messages, so the AI side connects the same way.
- **License**: from free for non-commercial use with separate commercial licensing, to tiered licensing: individuals, education, non-profits, open-source projects and teams of up to 3 people use it free, commercially too, and larger companies buy a commercial license.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Sponsor

If Aora Bot gave your interface a little more expression, you are welcome to buy the author a coffee.

<table align="center">
  <tr>
    <td align="center">
      <img src="docs/content/public/sponsor/wechat-pay.svg" width="20" height="20" alt=""> <b>WeChat Pay</b>
      <br>
      <img src="docs/content/public/sponsor/wechat-pay-code.png" width="188" alt="WeChat Pay QR code">
    </td>
    <td align="center">
      <img src="docs/content/public/sponsor/alipay.svg" width="20" height="20" alt=""> <b>Alipay</b>
      <br>
      <img src="docs/content/public/sponsor/alipay-code.png" width="188" alt="Alipay QR code">
    </td>
  </tr>
</table>

More about it on the [sponsor page](https://aora-bot.vercel.app/en/sponsor).

## Contact

<table align="center">
  <tr>
    <td align="center">
      <img src="docs/content/public/sponsor/wechat-contact.jpg" width="160" alt="Personal WeChat QR code">
      <br>
      <sub>Add me on WeChat: questions, collaboration or suggestions</sub>
    </td>
    <td align="center">
      <img src="docs/content/public/sponsor/qq-group.jpg" width="160" alt="QQ group QR code">
      <br>
      <sub>Join the QQ group: 626080597</sub>
    </td>
  </tr>
</table>

## Become a sponsor

Aora Bot is built for front-end, AI and hardware developers, and designers use it for avatars and mascots. A sponsor's logo goes here and on the [sponsor page](https://aora-bot.vercel.app/en/sponsor).

<table align="center">
  <tr>
    <td align="center" colspan="2" width="640" height="100"><b>Lead sponsor</b><br><sub>Open seat</sub></td>
  </tr>
  <tr>
    <td align="center" width="320" height="80"><b>Sponsor</b><br><sub>Open seat</sub></td>
    <td align="center" width="320" height="80"><b>Sponsor</b><br><sub>Open seat</sub></td>
  </tr>
</table>

Who reads it: React and front-end developers, AI agent builders, hardware makers, designers and indie developers. Ideal sponsors:

- **AI models and agent platforms**: the core audience builds interfaces for AI assistants and agents; the emotion protocol and the Claude Code and Cursor adapters are made for them.
- **Dev boards and smart hardware**: makers putting a face on small screens and desk devices, right when they choose a board for a smart toy or desk companion.
- **Cloud and hosting platforms**: readers are mostly React and front-end developers, and every one of them ships somewhere.
- **Developer tools and IDEs**: the audience writes code every day, and the people who see the logo decide what their team uses.
- **Coding education and courses**: one line of code brings a character to life, which also draws developers just learning front end and AI.
- **Design tools and asset platforms**: designers and indie developers come here for avatars, mascots and expressions.

Add me on WeChat above with the note “Aora Bot sponsorship”.

## License

Aora Bot is source-available under the tiered [Aora Bot License](./LICENSE):

- **Free, commercial use included**: individuals and independent developers, students and educational institutions, non-profits, non-profit open-source projects, and teams of up to 3 people in total. Once the product is publicly released, it must credit "Powered by Aora Bot" with a link to this repository in any one place, such as the About page, the website footer, the product description or the README.
- **Commercial license**: larger companies using it in a live product need a commercial license, under which the credit may be omitted; evaluation and prototyping are free. Terms and an inquiry template are in [LICENSE-COMMERCIAL.md](./LICENSE-COMMERCIAL.md); contact 1251579308@qq.com.
- **Not allowed for anyone**: reselling the engine or characters as a package of their own, offering a hosted character, avatar or expression service built on it, selling the characters as goods such as stickers or sticker packs, or training generative models on the character designs.

The classic Emotion Ball keeps its original license; see the [`emotion-ball` branch](https://github.com/sam70361/aora-bot/tree/emotion-ball).
