---
name: aora-bot-design
description: Add or draw characters, states, effects, belts, HUD forms, mouths, or cast members in Aora Bot. Use when extending the engine's design language — a new silhouette, a new animation state, a protocol id, or a named character.
---

# Aora Bot design

English-first code. Bilingual data (`{ en, zh }`) for anything a reader sees.
Procedural where it moves: a pose is a spring, an effect is a function of
time, a mouth is a handful of numbers. Characters are the exception — they
are drawn by hand, as SVG paths, and that is the point of them.

## The default look

The default face is `cute`: white dot eyes, a small mouth and a pink blush
painted on the body. `eyes` and `line` are the other two plain faces, and ten
drawn faces (`DRAWN_FACE_STYLES`: `brow`, `glossy`, `sparkle`, `button`,
`shades`, `droopy`, `bigmouth`, `pie`, `screen`, `symbol`) complete
`FACE_STYLES`. Three series draw the same
snapshot: `vector` (solid, outline, glass, sticker, paper, soft, riso, and the
drawing media pencil, marker, crayon, watercolor, neon, chalk),
`pixel` (crisp, dot, block) and `kaomoji` (plain, bubble). Whatever you add
must read in all three.

## Characters

Each character is one entry in `CHARACTERS` in
`packages/engine/src/shapes/characters/<family>.ts` (one file per `SHAPE_FAMILIES` family; a new family also gets a line in `characters/index.ts`), drawn in a 100 × 100 box:

- `body`: an SVG path string (`M L H V C Q A Z`; arcs may be rotated), or
  `{ loop }` for a dense outline sampled into a ring of points. Prefer a path.
- `parts` (optional): ears, leaves, antennae, a belly. `tone` is `body`
  (the body's ink, merged into the outline), `leaf` (green) or `inner`
  (half ink, half white). Parts ride the body's pose and never morph.
- `face: [x, y]`: where the face centre goes, in the same box. Set it when
  the mass is not at the middle of the box. `leftDX` nudges the left eye on
  tapering bodies.

The registry does the rest: it sizes the union of body and parts to the box
(the area correction uses the body alone), builds the 96-point ring for
morphing, fits the face, and measures `tiltScale`, `beltRadius` and
`spanAt` from the outline. Nothing is hand-tuned per shape.

### The design bar

A character earns a slot only if it is cute at 24 px, not just at 120.

- Plump and soft. No sharp tips, no pinched necks, no thin limbs. Round
  every convex corner; keep concave notches shallow.
- One idea per silhouette. If it needs a label to be told from a neighbour
  (`frog` next to `bear`, `peach` next to an apple, a lumpy `bean` next to
  `blob`), it is a duplicate, not a character.
- Room for the face. The fitted eyes must stay big; check the face centre
  and the eye size in the `getShape(id).face` table on the shapes page.
- Check it in outline, sticker and pixel crisp as well as solid: parts must
  join the outline cleanly and the pixel grid must keep the shape.
- Draw plump bodies from circles: arcs, a fillet arc for every concave join,
  and mirrored halves for anything symmetric (`heart`, `pear`, `crescent`).
  Corners then have the radius you meant, and the edges have no wobble to
  chase. Keep the face near the middle of the box: the face is projected on a
  sphere, so a face drawn far off-centre (a crescent's belly) has its outer
  eye foreshortened; tilt the body so the belly sits nearer the centre.

- `inner` parts are not drawn in `outline` and `glass`, so a feature the
  character cannot be told without (an acorn's cap, a cup's lid, a fox's
  ears) is body ink in the silhouette, with a lighter `inner` highlight laid
  on top if it needs one. A snout or a chin may be `inner` alone; the head
  still has to read without it.
- Features that need a second colour to read (a sun's rays, a lemon's
  nipples, a mouse's bigger ears) come out as a virus, a bird or a bear in
  one ink. Pick features whose silhouette is the idea: a tail, an arm, a
  cap, a stem.

Draw first, then look. Render a contact sheet outside the repo: every
character at 96 px and 24 px, in solid / outline / sticker / soft / pixel /
kaomoji bubble, in four states (idle, happy, thinking, sad) and two colours.
Iterate on the picture, not the path. Drop what does not hold up.

### Adding a character

1. Draw it in `CHARACTERS` (a key of every `ShapeId`, so the type forces the
   rest).
2. File its id in exactly one family of `SHAPE_FAMILIES`
   (`core/types.ts`). `SHAPE_IDS`, the docs shape page, the home dock and
   the console all read that table; a test checks that every id is in
   exactly one family. The order inside a family is the catalogue order.
3. Add a member to `CAST` in `core/cast.ts`. The cast is one named member
   per shape in `SHAPE_IDS` order; tests enforce it. Add its id to
   `CAST_IDS` in the same place.
4. Add `shape.<id>` to both locale files in `packages/react/src/locale/`.
   The docs read labels through `useLabel()` and have no table of their own.
5. Give it brackets in `render/kaomoji/table.ts` if it has an obvious face
   frame; otherwise it wears plain parentheses.
6. Leave `AUTO_SHAPE_POOL` alone unless the shape is still a blob at 16 px:
   it fixes which shape a key maps to, so reordering it changes everyone's
   automatic avatar. Append the member's id to the end of `AVATAR_POOL` in
   `api/_avatar.ts`; never reorder or remove entries there, since the
   avatar endpoint's consistent hash depends on that order.
7. Run `pnpm --filter @aora-bot/engine generate:faces`, which stores how
   every drawn face fits the new body. Add a `CHANGELOG.md` line, run the
   engine tests and inspect the snapshot diff before
   `pnpm --filter @aora-bot/engine test -- -u`.

Cap the roster by taste, not by count: when a new character is added, ask
which existing one it makes redundant.

### Custom shapes

`defineShape(id, outline, { leftDX, faceHint, parts })` registers an outline
function and optional parts (`{ tone, outline }` in the body's coordinates)
for hosts. It is the userland path: new characters for the core set are
drawn in `characters/` and need a design-bar case. `shapeGenerators`
holds only the generic helpers (`roundedPolygon`, `superellipse`,
`circleUnion`, `resampleClosed`, `fourierSmooth`); do not grow it into
a per-character library.

## Adding a state

A state is a row across several tables, not a single enum.

1. Add the id to `CHARACTER_STATES` and its group in `STATE_GROUPS`
   (`motion/states.ts`).
2. Fill every `Record<CharacterState, …>` table — the compiler lists them:
   `STATE_EYE_TOPOLOGIES` and `STATE_CUTE_EYES`, `STATE_CUTE_MOUTH` and
   `STATE_MOUTH`, `STATE_BLUSH`, `STATE_EYE_SWITCH_MS`, `STATE_BLINK_MS` —
   and a behaviour in `behaviours.ts`.
3. Optional: `STATE_FX` (the cute face's effect), `STATE_BELT` (the
   belt, see below), `STATE_FACE_TUNE`, `STATE_GAZE`, `STATE_ENTRY_EFFECTS`,
   `STATE_MOUTH_TALK`, and `STATE_SETTLE_TO` if the state is finite (a
   `spawning`-like entrance that resolves to another state after `afterMs`;
   the engine fires `onSettle` when it does).
4. Give it a two-digit id in `agent/protocol.ts`. **Never renumber an
   existing id.** Fill a gap in the state's segment (see
   `EMOTION_SEGMENTS`) or append after its highest id; check `EMOTION_IDS`
   first.
5. Add `state.<id>` and `stateDesc.<id>` to both locale files.
6. If the state should carry a HUD by default in the docs, add it to the
   suggestion map in `docs/theme/components/StateMatrix.tsx`.

The cute face gets its eyes from `CUTE_EYE_TOPOLOGIES` and its mouth from
`CUTE_MOUTH_IDS`; `eyes` and `line` keep the parametric eye topologies and
`MOUTH_IDS`. In line-face mode thin expressions share the character's
`lineWeight` (default `LINE_WEIGHT`, clamped to `LINE_WEIGHT_RANGE`) with the
nose, mouth and HUD dials.

## Adding an effect

On the cute face a state throws something off beside its expression: Zz,
sparkles, a heart, a tear, and for the busy states what the character is
doing (rising dots, a loading wheel, a progress bar, a radar ping, a small
orbit, a pencil). Effects are pure functions of time, carried on the snapshot
as `fx`, so vector, pixel and kaomoji draw the same frame.

Never draw an effect round the body. A ring hugging the outline reads as a
selection frame, not as something the character is doing, and at 24 px it is
the loudest thing on the mark. Instruments sit at `CORNER_X` / `CORNER_Y`
(`motion/fx-units.ts`), the top right, where the thinking dots and the Zz are.

1. Add the kind to `FX_KINDS` (`core/types.ts`) and map the state to it in
   `STATE_FX`.
2. Add a `case` in `evaluateFx` (`motion/fx.ts`, or `fx-activity.ts` for
   activity effects) returning `FxItem`s in shape space. Positions are
   written in a 100-unit canvas and converted with `atX` / `atY`.
   Honour `settled`: reduced motion and static output show every piece
   present and none mid-flight.
3. If it needs a new primitive, extend `FxItem.shape` and teach the vector
   and pixel renderers (and the kaomoji tail) to draw it.

## Belts

Belts are how the `eyes` and `line` faces read the busy states: the body
collapses into a core sphere and what orbits it carries the meaning. On the `cute` face the belt is not used
(`snapshot.belt` is `null`) and the whole figure stays, with `fx` beside it.

A belt is a pure function of time.

1. Add the id to `BELT_KINDS` in `motion/belts.ts` and a core size to
   `BELT_CORE_SIZE`.
2. Add a `case` in `evaluateBelt` returning dots, rings and glyphs in belt
   units. A glyph is a path string in a `BELT_GLYPH_SIZE` box, generated by
   a function, never pasted.
3. Point states at it from `STATE_BELT`. The `beltFade` spring handles the
   crossfade; `blendBeltFrames` must be able to interpolate your frame, so
   keep dot counts stable within a belt.
4. Add `belt.<id>` to both locale files.

A new busy state usually wants both: an `fx` for the cute face and a belt
for the others.

## Adding a HUD form

A HUD draws in the ring outside a clean silhouette and says what the
character knows. A new one is a variant of `HudSpec`. State-like leftovers
(typing, scanning, breathing) belong on the state table, not here.

1. Add the kind to `HUD_KINDS` and the variant to `HudSpec` in
   `hud/spec.ts`; extend `isHudSpec` so untrusted wire input is rejected
   rather than drawn. Add an `{ en, zh }` entry to `HUD_KIND_LABELS`; the
   locale files read it, so there is no separate `hud.<kind>` to write.
2. Add a `case` in `evaluateHud` in `hud/dials.ts` returning arcs, bars,
   ticks, pips and paths in ring units. Use `ctx.lineWeight` for every
   stroke — the HUD and the face are one stroke — and only the ink colour.
3. Add a suggested state in `docs/theme/components/StateMatrix.tsx` if one
   fits (it is checked against `HUD_KINDS`).

No text inside the ring except the single figure a `kpi` / `balance` shows.
No second colour. No WebGL.

## Adding a drawn face

A drawn face is one `FaceDesign` in `face/drawn/designs/<id>.ts`, a complete
face of the cute family. Draw it from a prototype; never derive it from the
cute face's geometry at runtime.

1. Add the id to `DRAWN_FACE_STYLES` (`core/types.ts`) and the design to
   `FACE_DESIGNS` (`face/drawn/index.ts`).
2. Name the eye's numbers (`Field`) and write every cute expression with
   `vocabulary(rest, form)`, plus any expressions of the face's own. Parts
   that come and go are amounts, so states morph by interpolation; a builder
   always lays down every part it has and lets `LayerList` drop the ones at
   zero.
3. Write `states`, `mouths`, `stateMouth`: share the cute tables by naming
   them (`STATE_CUTE_EYES`, `CUTE_MOUTHS`), and override per state where the
   face differs. Quiet the effects its eyes already show (`quietFx`).
4. Layout in cute dot radii from the cute eye line; paint through roles
   (`face`, `pupil`, `feature`, `glint`, `iris`, accents, `light`), never
   colours, so variants and palette colours apply. Mark a part that drifts
   off the face `loose`, so the fit to narrow bodies ignores it.
5. Give it a glyph per kind of eye and per mouth (`kaomoji`), and
   `face.<id>` in both locale files.
6. Run `pnpm --filter @aora-bot/engine generate:faces`: it stores the face's
   extent over all its states and its fit to every body of the roster, which
   a live mount reads instead of working them out. `drawn-stored.test.ts`
   fails until they match.
7. Check it in every vector variant, pixel crisp, dot and block at 24 px and
   kaomoji, on all twelve colours on light and dark pages, and on the
   narrowest shapes.

## Adding a mouth or a nose

Cute mouths are named in `CUTE_MOUTH_IDS` and drawn by the cute face; point
states at them from `STATE_CUTE_MOUTH`. Line-face mouths are `MouthSpec`
values in `face/features.ts` — a handful of numbers that morph by lerp:
add a name to `MOUTH_IDS` and a spec to `MOUTHS`, then point states at it
from `STATE_MOUTH`. Add `mouth.<id>` to both locale files.

Noses are traits of the line face, not expressions. A new nose is a control
polyline in `RAW_NOSES`, never morphed.

## Adding a cast member

`packages/engine/src/core/cast.ts`. A preset is `{ id, name, desc, shape,
color, accent }` plus optional `face` / `nose`. `color` is the nearest
palette `ColorId`; `accent` is its swatch hex (`ink(color)`). The cast is
one named member per shape, so a new member means a new shape, and the
tests fail if the two lists drift. `castMember` returns `null` for an id
that has gone, so stored preferences can go stale safely. No shipped
member sets `face` or `nose`.
