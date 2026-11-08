# @aora-bot/surfaces

Product and demo surfaces for [Aora Bot](https://aora-bot.vercel.app): the onboarding
walkthrough, restricted and loading scenes, the template dialog with publishing, the
occupancy list and the cast stage. They are built from the primitives in
[`@aora-bot/react`](https://www.npmjs.com/package/@aora-bot/react), which stays free of
anything product-shaped.

## Install

```bash
pnpm add @aora-bot/surfaces @aora-bot/react @aora-bot/engine
```

`@aora-bot/react`, `@aora-bot/engine` and React 19 are peer dependencies, so the application
chooses one copy of each.

```tsx
import { RestrictedScene } from '@aora-bot/surfaces';
import '@aora-bot/react/styles.css';
import '@aora-bot/surfaces/styles.css';

export function Blocked() {
  return <RestrictedScene tone="offline" />;
}
```

Import the surfaces stylesheet after the React one. It uses the library's design tokens, sits
in its own `aora.surfaces` CSS layer after the library's layers, and every class is prefixed
`aora-s-`.

## Surfaces

| Group       | Exports                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------- |
| Walkthrough | `DemoDesktop`, `JobBubbles`, `SuggestionCards`, `LandingWait`, `HandOff`, `Composer`         |
| Scenes      | `RestrictedScene`, `DeviceBezel`, `BootLoop`, `LoadingCharacter`                             |
| Template    | `TemplateDialog`, `VisibilityControls`, `ShareCard`, `usePublishMark`                        |
| Occupancy   | `OccupancyList`, `OccupancyMark`                                                             |
| Cast        | `CastLineup`, `CastFigure`, `PortraitSlot`, `useCastScene`                                   |
| Locale      | `SurfaceLocaleProvider`, `useSurfaceLocale`, `SURFACE_LOCALES`, `surfaceEnUS`, `surfaceZhCN` |

## Copy and languages

The language follows the `LocaleProvider` from `@aora-bot/react`. Override individual strings
with `SurfaceLocaleProvider`; the React provider's `overrides` only know the React package's keys.

```tsx
import { LocaleProvider } from '@aora-bot/react';
import { SurfaceLocaleProvider } from '@aora-bot/surfaces';

<LocaleProvider locale="zh-CN">
  <SurfaceLocaleProvider overrides={{ 'template.title': '新建模板' }}>{children}</SurfaceLocaleProvider>
</LocaleProvider>;
```

## Server rendering

`@aora-bot/surfaces/static` has no `'use client'` banner and needs no DOM: `normalizeTemplateDraft`
with `TEMPLATE_LIMITS` and `TEMPLATE_ERROR_KEYS`, plus the two copy tables. A route can validate a
submitted draft with the same function the dialog runs.

## Documentation

- [Components](https://aora-bot.vercel.app/en/components/overview)
- [Walkthrough surfaces](https://aora-bot.vercel.app/en/components/walkthrough)

## License

[Aora Bot License](https://github.com/sam70361/aora-bot/blob/main/LICENSE): free for individuals, education, non-profits, open-source projects and teams of up to 3 people, commercial use included; a publicly released product must credit Aora Bot with a link to the repository. Larger companies need a [commercial license](https://github.com/sam70361/aora-bot/blob/main/LICENSE-COMMERCIAL.md).
