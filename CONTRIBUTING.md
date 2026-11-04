# Contributing

## Setup

```bash
pnpm install
pnpm run build:lib   # the docs site imports the packages by source, but build once first
pnpm run dev         # documentation site with live reload
```

Node 22+ for development (see `.nvmrc`); the published packages run on Node
20+. pnpm 10+ as well. The pnpm version is pinned in
`package.json` via `packageManager`, so `corepack enable` is enough to get the
right one.

## Layout

```
packages/engine/   the character engine — geometry, motion, rendering
packages/react/    React primitives
packages/surfaces/ product and demo surfaces built on the React package
docs/              Rspress documentation site
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

By opening a pull request you agree that your contribution is distributed under the
[Aora Bot License](./LICENSE) and may be included in commercially licensed copies
(section 6.2 of the license).

## Tests

The engine's deterministic half is snapshot tested: shape outlines, derived
metrics, expression geometry, belt frames and spring curves. If your change
moves a curve, the snapshots will fail — inspect the diff, and update with
`pnpm --filter @aora-bot/engine test -- -u` only once you are satisfied the new
output is correct. The runtime renderer has lifecycle tests under `happy-dom`
with fake timers, so blinks, belt entry and cleanup are covered without a
browser.

The React layer has two kinds of tests. Server-rendering smoke tests: every
exported component must render through `renderToString` without a DOM, because
the documentation site is statically generated and a component that touches
`window` at render time breaks the build. And client tests under `happy-dom`
for behaviour that only exists after mount — the stage's `maxSources`
fallback, the ticker's crossfade cleanup, the confetti layer's subscription.

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

The three packages are published to npm under the `@aora-bot` scope; the docs
and the workspace root are private. Give the three the same version, add the
entry to `CHANGELOG.md`, then from a clean `main`:

```sh
pnpm run check
pnpm -r publish --access public
```

`pnpm publish` turns the `workspace:` ranges into the released version, so the
packages depend on each other by version once they are on the registry.
