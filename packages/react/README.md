# @aora-bot/react

React components for [Aora Bot](https://aora-bot.vercel.app), a procedural character engine
for the web. A roster of generated characters and a named cast, ink colours, animation
states, three faces, vector, pixel and kaomoji styles and an SVG HUD, drawn entirely by
code and animated from one shared frame loop. Try them in the
[console](https://aora-bot.vercel.app/en/).

## Install

```bash
pnpm add @aora-bot/react
```

Requires React 19. `@aora-bot/engine` is a dependency and comes along automatically.

## First character

```tsx
import { CharacterMark } from '@aora-bot/react';
import '@aora-bot/react/styles.css';

export function Hero() {
  return <CharacterMark shape="mochi" state="happy" sizePx={120} />;
}
```

Import the stylesheet once, at the root of the application. It lives in a CSS `@layer`, so
your own rules win without `!important`.

## Components

| Component                                                            | Use it for                                                                  |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `CharacterMark`                                                      | One animated character; `styleId`, `variant`, `face`, `hud`, `followTarget` |
| `MarkStageProvider` + `StagedMark`                                   | Many characters sharing a few engines; falls back to still images           |
| `useMarkCommands`, `useMarkCommand`, `useMarkSettle`, `usePokeCycle` | Hold a state, wait for settle, poke an agent from anywhere in the tree      |
| `CharacterMarkMirror`                                                | Re-drawing a running character elsewhere via `<use href>`                   |
| `AgentAvatar`, `AvatarStack`, `GroupAvatar`                          | A stable character per user, derived from any id                            |
| `UnreadBadge`, `AvatarStatusDot`, `WorkingBadge`                     | Avatar decorations                                                          |
| `CharacterPicker`, `AgentCharacterPicker`, `CompactCharacterPicker`  | Letting users choose a shape, colour, face and nose                         |
| `AvatarEditor`, `AvatarTrigger`, `EditableAvatar`                    | Character or cropped picture, in a dialog or inline                         |
| `ActivityMark`, `GroupActivityMark`                                  | "Someone is working" indicators, with facts, bubbles and poke               |
| `ActivityTicker`                                                     | Crossfading one-line status text                                            |
| `HudPlate`, `AgentHud`, `useHudSpec`                                 | Progress, timers, waveforms, KPIs and more drawn around the character       |
| `AgentStateProvider`, `useArbiter`, `useAgentHud`                    | Multi-session emotion protocol → one displayed state and HUD                |
| `useStateChannel`, `useEventSourceChannel`                           | Feeding that protocol from a `postMessage` port or an SSE stream            |
| `useIdleSleep`                                                       | Letting an unattended character drowse and then fall asleep                 |
| `SpriteMark`                                                         | Painted sprite sheet keyed by the same protocol ids                         |
| `ConfettiLayer`                                                      | Celebration without a character attached                                    |
| `LocaleProvider`, `useLabel`                                         | Component copy and catalogue labels in `en-US` or `zh-CN`                   |

Onboarding walkthroughs, scenes, the template dialog, the occupancy list and the cast stage
live in [`@aora-bot/surfaces`](https://github.com/sam70361/aora-bot/tree/main/packages/surfaces),
which builds on this package.

## Server rendering

`@aora-bot/react/static` contains only what can run without a DOM, and carries no
`'use client'` banner, so it is usable from a React Server Component. That is: the
static rendering functions (`renderStaticSvg`, `renderStaticSvgDataUrl`,
`renderAvatarDataUrl`, `shapeMaskImage`, `shapeRingMaskImage`), the
deterministic id hashing (`autoShapeForKey`, `autoColorForKey`,
`autoNoseForKey`), the identifier and cast tables, the crop arithmetic
(`fitImage`, `clampPan`, `clampZoom`, `exportPlacement` and their limits — but
not `cropToDataUrl`, `loadImage` or `readImageFile`, which need a canvas), and
both locale tables (`enUS`, `zhCN`) so a server can render the copy in either
language.

```tsx
import { renderAvatarDataUrl } from '@aora-bot/react/static';

export default function Page() {
  return <img src={renderAvatarDataUrl('ada@example.com')} width={40} height={40} alt="" />;
}
```

## Documentation

- [Getting started](https://aora-bot.vercel.app/en/guide/getting-started)
- [Component overview](https://aora-bot.vercel.app/en/components/overview)
- [Performance: hundreds of characters](https://aora-bot.vercel.app/en/guide/performance)
- [Server rendering](https://aora-bot.vercel.app/en/guide/server-rendering)

## License

[Aora Bot License](https://github.com/sam70361/aora-bot/blob/main/LICENSE): free for individuals, education, non-profits, open-source projects and teams of up to 3 people, commercial use included. Larger companies need a [commercial license](https://github.com/sam70361/aora-bot/blob/main/LICENSE-COMMERCIAL.md).
