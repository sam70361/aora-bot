# Contributing

## Setup

```bash
pnpm install
pnpm run build:lib   # the docs site imports the packages by source, but build once first
pnpm run dev         # documentation site with live reload
```

Development needs Node 22.12 or later (see `.nvmrc`) and pnpm 10 or later; the
published packages run on Node 20 and later. The pnpm version is pinned in
`package.json` via `packageManager`, so `corepack enable` is enough to get the
right one.

## Layout

```
packages/engine/   the character engine: geometry, motion, rendering
packages/element/  the <aora-bot> Web Component and its CDN build
packages/react/    React primitives
packages/surfaces/ product components built on the React package
docs/              Rspress documentation site
api/               the avatar endpoint (a Vercel Function)
examples/          runnable integration samples, not part of the workspace build
```

The docs site aliases `@aora-bot/engine`, `@aora-bot/react` and `@aora-bot/surfaces` to their sources,
so editing a component reloads the site without a separate watch process.

## Before opening a pull request

```bash
pnpm run check   # build:lib → lint → format:check → typecheck → test → docs build
```

That is the same sequence CI runs, in the same order. The libraries are built
first because the React and surfaces packages and the docs resolve their workspace
dependencies through `dist/`.

Aora Bot is [MIT](./LICENSE) licensed, and so is every contribution: by opening a
pull request you agree that your work is released under the same license. There is
no CLA. Instead, sign off each commit (`git commit -s`) to certify the
[Developer Certificate of Origin](https://developercertificate.org/): that you wrote
the change, or otherwise have the right to submit it under MIT. Do not submit
characters, art or code copied from another project unless its license is compatible
with MIT, and say where it came from in the pull request.

The `emotion-ball` branch is the classic edition under its own license and is not
open to contributions.

## Tests

The engine's deterministic half is snapshot tested: shape outlines, derived
metrics, expression geometry, belt frames and spring curves. If your change
moves a curve, the snapshots will fail — inspect the diff, and update with
`pnpm --filter @aora-bot/engine test -- -u` only once you are satisfied the new
output is correct. The runtime renderer has lifecycle tests under `happy-dom`
with fake timers, so blinks, belt entry and cleanup are covered without a
browser.

The React layer has two kinds of tests. Server-rendering smoke tests check that
every exported component renders through `renderToString` without a DOM: the
documentation site is statically generated, so a component that touches `window`
while rendering breaks the build. Client tests under `happy-dom` cover behaviour
that only exists after mount, such as the stage's `maxSources` fallback, the
ticker's crossfade cleanup and the confetti layer's subscription.

## Adding a shape

Shapes are userland-extensible. Before proposing one for the core set, publish
it with `defineShape` and check it reads clearly at 16, 36 and 120 pixels —
that constraint is why intricate shapes do not belong in the built-in set.

A generator returns one closed outline centred on the origin; the registry
normalises size and position, fits the face and derives the belt radius, so
you only get the proportions right. Two hints exist for the cases the fitter
cannot infer: `leftDX` nudges the left eye on top-heavy or triangular bodies,
and `faceHint` moves the face search when the body's mass is not where its
bounding box is. Cusps should be softened with
`shapeGenerators.fourierSmooth` rather than a corner radius.

If you still think it belongs, open an issue with the generator function and
screenshots at those three sizes. A built-in character is drawn in
`shapes/characters/<family>.ts` (a body, optional `parts` for ears, leaves or an
antenna, and the face centre); file its id in one family of `SHAPE_FAMILIES`
(`SHAPE_IDS` follows) and regenerate the snapshots. Removing a character means
deleting its entry from that family file and regenerating the snapshots.

## Adding a state

A state is a row across several tables, not a single enum. Add the id to
`CHARACTER_STATES` and its group in `STATE_GROUPS`, then fill
`STATE_CUTE_EYES`, `STATE_CUTE_MOUTH`, `STATE_BLUSH` and `STATE_FX` for the
default face, `STATE_EYE_TOPOLOGIES`, `STATE_MOUTH`, `STATE_EYE_SWITCH_MS` and
`STATE_BLINK_MS` for the `eyes` and `line` faces, and a behaviour in
`behaviours.ts`. If it is a feeling or an
agent event, give it a two-digit id in `agent/protocol.ts` — **never
renumber an existing id**. The ids are a wire contract, and they are laid out
in four segments: `00`–`09` lifecycle, `10`–`29` feeling, `30`–`49` agent work,
`50`–`59` signalling. `00`–`27` and `30`–`52` are taken, so `28`, `29` and
`53`–`59` are the free slots; a new segment means extending the table, not renumbering
what is there. Update `docs/theme/labels.ts` and both locale files.

## Adding a theme

A theme is data the engine already knows how to draw, plus one look file for
the site. Nothing else names it, so the steps below are the whole job:

1. **Engine entry.** `packages/engine/src/themes/<id>/`: `definition.ts` (the
   cast, and the shapes, colours, skins, faces and states it opens),
   `skins.ts` for any skin of its own, and `index.ts` exporting the
   `ThemePackage`. The theme is its own build entry and subpath,
   `@aora-bot/engine/themes/<id>`, and the core never bundles it.
2. **Art.** A theme is first designed as a lab sheet: a standalone page that
   draws the cast, its doodles and its motions. Comments that say "the lab"
   mean that sheet. Draw the characters as fields in `packages/engine/scripts/art/<id>`,
   add the source to `THEME_SOURCES`, and run
   `pnpm --filter @aora-bot/engine generate:faces` to write
   `art.generated.ts`, `cast.generated.ts` and `faces.generated.ts`. Do not
   edit those by hand.
3. **Manifest.** An entry in `packages/engine/src/themes/manifest.ts`: names,
   the ids it owns, its loader, and `cards`, every card the theme shows in
   order, borrowed core members included. `cards` is what the site counts
   before the theme loads.
4. **React subpath.** `packages/react/src/themes/<id>.ts` re-exporting the
   entry, so a React app installs it from `@aora-bot/react/themes/<id>`.
5. **Avatar pool.** Install the entry in `api/_avatar.ts` and give it a
   `THEME_POOL_BASE` (its cast's size when it first serves avatars). The pool
   is the cast, append only: never reorder or remove a member once it ships.
6. **Docs look.** `docs/app/themes/looks/<id>.ts`, registered in
   `looks/index.ts`: palette, foil, pattern, emblem, title, scene and card
   frame. A theme without one wears the neutral look until it has one.
7. **Doodles and motions.** `decor.ts` (a `DecorSpec`: the mood doodles round
   the character) and `motions.ts` (the signature motions its art's parts
   name), in `ThemePackage.decor` and `ThemePackage.motions`, with
   `extras: EXTRAS` from `../extras/index.js`. The extras are one shared
   chunk, so the core and a theme without them never load it.

The album page, the card dialog, the shelf's wall and the album's sticker wall
pick the theme up from the manifest's `cards`, the engine's `themeLook` and
the look file, with no code of their own to change. The shelf wall mixes in
the first members of the new theme, drawn in its skin and colours on pools of
its cover cloth; the sticker wall lays every card out on its cloth and lets
each one change state on its own beat.

Before opening the pull request, check both walls:

- screenshots of `/themes/` and `/themes/<id>`, light and dark, Chinese and
  English, desktop and a phone width, with the sticker wall in view;
- the shelf's and the album's first-load JavaScript, LCP, TBT and CLS against
  `main` (a production build, `pnpm --filter @aora-bot/docs build`), and the
  frame rate while the walls move. CLS stays at zero: the walls' boxes are set
  before any theme loads. A skin heavy enough to make a still take more than
  a frame to draw shows up here first;
- live characters with their doodles and motions in Safari or WebKit as well
  as Chrome: a live character with extras is drawn in layered HTML inside its
  SVG, which WebKit composites by rules of its own.

## Adding a locale

`packages/react/src/locale/en-US.ts` is the source of truth for the key set.
Add a file alongside it exporting a `Record` over the same keys; TypeScript
will tell you what is missing. The surfaces' copy is separate, in
`packages/surfaces/src/locale/`, and follows the same rule.

## Style

Prettier handles formatting; run `pnpm run format`. `oxlint` handles the
rest — `pnpm run lint` — with the rule set in `.oxlintrc.json`.

Comments should explain constraints and decisions that the code cannot show on
its own. Do not annotate what the next line does.

## Releasing

The four packages are published to npm under the `@aora-bot` scope; the docs
and the workspace root are private. Give the four the same version and move the
`Unreleased` section of `CHANGELOG.md` under it, then push a tag from a clean `main`:

```sh
git tag v0.3.0
git push origin v0.3.0
```

The `Release` workflow checks that the tag matches every package's version, runs
`pnpm run check`, publishes with npm provenance and opens a GitHub release with
that version's `CHANGELOG.md` section.
`pnpm publish` turns the `workspace:` ranges into the released version, so the
packages depend on each other by version once they are on the registry.

The workflow publishes through npm trusted publishing, so it needs no token. Each
package must list this repository and `release.yml` as a trusted publisher on
npmjs.com (package settings, Trusted Publisher) once before the first tagged
release.

## Security

Report vulnerabilities privately, as described in [SECURITY.md](./SECURITY.md),
and not in a public issue.
