# Changelog

## 0.2.0

### `@aora-bot/engine`

- **Characters.** Eleven new characters, each with a cast member: a `treat` family (`pudding`, `toast`, `icecream`, `cupcake`, `fries`, `candy` and `burger`), `avocado` and `melon` in fruit, `eggplant` in garden and `lion` in critter. `ghost` is redrawn rounder, with a scalloped hem of three soft lobes and two small arms.
- **Characters.** Eleven more characters, each with a cast member: an `object` family (`cottage`, `chat`, `gift` and `bulb`), `hamster`, `hedgehog`, `koala` and `bat` in critter, `seal` and `puffer` in sea, and `planet` in figure.
- **Faces.** Ten drawn faces join `FACE_STYLES` (`DRAWN_FACE_STYLES`): `brow`, `glossy`, `sparkle`, `button`, `shades`, `droopy`, `bigmouth`, `pie`, `screen` and `symbol`. Each is a complete face of the cute family — its own eyes for all 44 states, its own or explicitly shared mouths, layout, blink and gaze — written as one `FaceDesign` table and drawn as layers with paint roles, so it reads in every vector variant, in pixel and in kaomoji (`kaomoji(shape, state, face)`, `faceText`). States morph field by field, a switch to or from a drawn face cross-fades, and a face that does not fit a narrow body shrinks and sits lower until it does. `getInkVars('black')` adds `--aora-face-pupil` and `--aora-face-glint` for them.
- **Faces.** Three more drawn faces: `capsule` (two upright capsule eyes, mirrored, with the cute mouth; it now leads `FACE_STYLES` and the face pickers), `teardrop` (tall dark drops, round on top and a little narrower below, with one highlight) and `specs` (one dark eye with one highlight inside small, bold round glasses joined by a flat bridge). `defineFace` registers a host's or theme's own drawn face (fitted at runtime, `FACE_KIT` for the shared geometry), and `defineVectorMedium` registers a vector variant.
- **Characters.** A `coal` family of three black lumps with uneven edges, each with a cast member: `chunk`, a lump of blunt-cornered flat faces (Cinder, 红红), `lump`, a rounder ball bumpy all the way round (Sooty, 烟烟), and `fluff`, a tuft of soot ringed with short uneven bristles (Ashy, 灰灰).
- **Cast.** Dot (`dot`, 球球) is a cream-white ball wearing `capsule` and leads the cast; `circle` leads the round family and the shape list.
- **Defaults.** `DEFAULT_SHAPE` (`mochi`) and `DEFAULT_FACE` (`cute`) name what a character falls back to when neither its options nor its cast member choose, and `VECTOR_VARIANTS` lists the `vector` series' variants (with `CharacterVariant` derived from it). The engine, the element and the React components read them instead of repeating the values; both are re-exported by `@aora-bot/react`.
- **Variants.** Two paper media join the `vector` series. `origami` keeps each piece's outline round and crumples the sheet inside it into many soft, low facets, each lit by how it faces the light, with faint creases, on a small shadow of its own. `relief` presses each piece up from behind as one thick card: a lit rim up and to the left, a shaded rim down and to the right, standing off the page on a soft shadow. Neither reads parameters; the geometry is seeded by the outline and cached, and static output is deterministic.
- **Variants.** `gothic` joins the `vector` series as its sixteenth variant: a dark storybook drawing in ink. Each piece is darkened from the edge in, hatched and cross-hatched on the side away from the light, and ringed by a brushed ink line that swells on the shadow side and thins where the brush lifts; the fills carry a paper grain. It reads `grain` and `hatching`, and below 80 px the grain and hatching fade out as in the other media.
- **Canvas.** Shape space is now 240 units square (`SHAPE_SPACE`), centred at 120 (`CENTER`), and the drawing box is `-24 -24 288 288` (`VIEWBOX`, `VIEWBOX_STR`). Built-in and registered outlines are normalised to the new size, so custom shapes need no change; code that hard-coded shape-space coordinates should read the constants.
- **Face tune.** Every `FaceTune` field is now a ratio of the fitted face, with 1 meaning as fitted (`DEFAULT_FACE_TUNE` is all ones). `STATE_FACE_TUNE` holds per-state ratios that multiply into the base, so a host's tune and a state's adjustment compose.
- **Celebrations.** Confetti and ribbons are redesigned: a new seven-colour palette (`CONFETTI_COLORS`), bursts spread on the golden angle, paper that lifts, tumbles and settles under its own drag, and ribbons that grow, coast and reel back in. `SPIN_REST` is exported. `Trail` now carries `squash` and `reel` in place of `tilt` and `retract`.
- **Variants.** Six drawing media join the `vector` series: `pencil` (a double graphite line, hatching on the shadow side, paper grain), `marker` (a scribbled fill over a pale offset pass, a dark double outline), `crayon` (a waxy fill with the paper's tooth showing and a ragged edge), `watercolor` (a light wash with pooled pigment, a bloom, granulation and a dried edge), `neon` (a glowing tube with a core) and `chalk` (crumbling chalk lines, diagonal strokes, dust). The body and its pieces are redrawn from their outlines; the face in every face style, the effects, the HUD, the belt and the confetti take the medium as a group. None paints a background, and each reads on a light or a dark page through the ink tokens; `crayon` and `watercolor` wear the dark face of `soft`. New parameters: `wobble`, `grain`, `hatching` and `neonGlow`, and `strokeWidth` now also sets the line of `pencil`, `marker`, `neon` and `chalk`. Textures are seeded, so static output is deterministic. Below 80 px the grain and the hatching fade out and a medium's line stays about a pixel wide, so at 24 px every medium's face reads as clearly as `outline`'s; a live character measures its own width, a static one goes by `sizePx`.
- **Part colours.** A shape part may carry its own `color` (`PartColor`: a palette colour, which follows the page as a body of that colour does, or any CSS colour). Its tone's recipe is applied to that colour instead of the ink, and the part is ringed in a line derived from it, so a black hat reads on a black body. It is drawn in every vector variant (as a line in its colour on the outlined ones), in every medium and in the pixel style, in live and static output alike.
- **Props.** `defineShapeWithProps(id, { base, props, at, scale })` defines a character as another one wearing props; `defineShape` takes `props` too. A prop is a part with `prop: true`: the face keeps off any prop that lies over the body, as it keeps off hair.
- **Themes.** A theme is its own entry, `@aora-bot/engine/themes/<id>`: its characters (baked into points, with their face boxes and fits), cast, skins and labels, as plain data and painters. The core keeps only the mechanism and a manifest (`THEME_MANIFEST`: each theme's names, the ids it owns and a loader). `installTheme(entry)` installs one, idempotently; `await loadTheme(id)` loads it through the manifest. Until then a synchronous call naming one of its ids throws `ThemeNotInstalledError`, and `themesNeeded(ids)` says which themes a set of ids needs. A theme installed in the main entry is adopted by `/static` on the same page, and the other way round. `defineTheme`, `getTheme` and `listThemes` read a theme's definition: its cast and, per console dimension, an open list or a fixed value. The first is Halloween: 23 characters and two skins of the `vector` series, `doodle` and `grainy`, which take every colour from the ink. Six more ship alongside it, each with its own characters, cast and labels: `christmas` (18 characters), `spring-festival` (18), `mid-autumn` (17), `easter` (15), `summer` (17) and `valentine` (14). The main entry carries none of them.
- **Visibility.** What only a theme names is drawn and accepted by id everywhere but left out of the default lists. `SHAPE_FAMILIES`, `SHAPE_IDS`, `CAST` and `COLOR_IDS` hold the listed ones; `ALL_SHAPE_IDS`, `ALL_CAST_IDS` and `ALL_COLOR_IDS` every id the engine knows, and `CORE_SHAPE_IDS` the core's own. A theme's manifest entry lists the characters it promotes into the default lists (`listedShapes`); a style's unlisted variants are accepted (`acceptsVariant`, `allVariants`) but not in `variants`.
- **Palette.** `cream`, a warm off-white, is listed and leads `COLOR_IDS`: it is Dot's colour. Four muted colours follow the bright ones: `sage`, `clay`, `navy` and `mauve`, each with its own inks for a light and a dark page. `night`, a near-black that stays dark on a dark page, is unlisted; taking it out of `UNLISTED_COLOR_IDS` lists it. `ASSIGNABLE_COLOR_IDS`, the colours an id is hashed onto, is now a fixed list, so a growing palette never moves an existing avatar onto another colour. The face rule black follows is now general and measured from the ink (`faceInks`): a very dark ink takes the white face and white hair shading, a very light one the dark face with light pupils, which is what black does on a dark page. Yellow and cream now wear the dark face, in every variant.
- **Faces and lines on either page.** A light or very dark ink no longer fades into the page it shares a tone with. Lines drawn in the ink (`outline`, `glass`, the kaomoji, the line face) are deepened on a light page, keeping their hue, and lifted on a dark one (`lineInks`, `--aora-ink-line`). The `eyes` and `line` faces' cut-out eyes take the rule's face colour on a body that would swallow the page (`cutFaceInk`, `--aora-eye`), so cream gets dark eyes and night white ones. In `riso` a light ink prints over itself instead of pink, so cream stays cream (`risoSecondInk`). The pixel `dot` panel lights a character in its dark-page ink on either page: black lights white with unlit eyes, and night is lifted. `getSwatchCss` gives a picker the colour a body takes on the current page, so black's chip turns white on a dark page.

### `@aora-bot/react`

- **Renamed components.** Several exports have clearer names; the old names are removed. `CharacterPicker`, `CompactCharacterPicker` and `AgentCharacterPicker` are now `CharacterSelector`, `CompactCharacterSelector` and `AgentCharacterSelector`; `AgentAvatar` is `AgentPortrait`; `AvatarStack` is `AvatarGroup` (with `layoutAvatarGroup`, `groupMetrics`, `groupMetricsForPx` and `GROUP_MAX_VISIBLE`); `AvatarChrome` is `AvatarFrame`; `AvatarEditor`, `AvatarTrigger` and `EditableAvatar` are `AvatarStudio`, `AvatarButton` and `AvatarField`; `MarkStageProvider` is `CharacterStageProvider`; `ActivityMark`, `GroupActivityMark` and `ActivityTicker` are `ActivityBadge`, `GroupActivityBadge` and `ActivityLine`; `ConfettiLayer` is `CelebrationLayer`. Hooks follow: `usePokeCycle` is `useTapCycle`, `useActivityPresence` is `useActivityStatus`, `useSpawnEntrance` is `useArrival`, and `activityFromTool` is `activityForTool`. Props types, CSS class names and documentation routes are renamed to match.
- **Sizes.** A character mark defaults to 32 px. Avatar sizes are `xs` 16, `sm` 24, `md` 32, `lg` 40 and `xl` 80 px; an activity badge is 32 px, 24 px in a group, which cycles every 2.4 s with a 600 ms ink transition.
- **Colour chips.** `CharacterSelector` paints each chip in the colour the character takes on the current page, and rings a chip that is too faint on the page (cream, butter, ivory on a light page; night on a dark one) in its line ink.
- **Avatar studio.** Uploads up to 20 MB are accepted; the source is fitted within 1600 px, cropped on a 120 px stage and exported at 360 px, with zoom from 1 to 4 in steps of 0.25.
- Labels for `relief` (浮雕) and `gothic` (暗黑手绘) in both locales, and for the `chunk` (煤块), `lump` (煤球) and `fluff` (煤灰团) characters.
- Labels for the six new variants and their parameters in both locales.
- Labels for the new colours (`night`, `cream`, `sage`, `clay`, `navy`, `mauve`) in both locales; a theme's characters and skins are named by the theme (`themeLabel`). A mark that names a theme's character, member, skin or colour holds its box, loads the theme and then draws; `@aora-bot/react/themes/<id>` re-exports a theme's entry, and the theme API is re-exported.

### `@aora-bot/surfaces`

- **Renamed components.** `CastStage`, `CastMember` and `AvatarSlot` are now `CastLineup`, `CastFigure` and `PortraitSlot`; `LoadingMark` is `LoadingCharacter`.

### `@aora-bot/element`

- `shape`, `character`, `variant` and `color` accept a theme's ids: the element holds its size, loads the theme and then draws.
- The element defaults to 32 px.

### Docs

- A What's New page in the navbar summarises each release.
- Pages for the paper media, and component pages under their new names.
- The home page has two views, remembered between visits and linkable with `?view=`: the console, and an exhibit that steps through the cast and every state with an attribute panel, autoplay and the share code. Dot in `capsule` and cream opens both.
- Behind either view, the wall of characters can be drawn as line art, the default, or in colour.
- The site opens in dark mode on a first visit; the switch stays, and a choice is remembered.
- `pnpm media` records the README's hero, styles, cast and themes images from the built element, in Chrome's virtual time, so a recording does not depend on the machine.

### Avatar endpoint

- An arbitrary id now picks its member by a jump consistent hash over `AVATAR_POOL`, the cast in the order it joined. Every id keeps the member it had with the first 46; as the cast grows from n to m members, about (m − n) / m of ids move, each onto a new member. The `pool` parameter fixes how many members an id may land on, so `pool=46` keeps every avatar exactly as it was.
- `theme=<id>` picks from that theme's cast with the same hash, grown from `THEME_POOL_BASE`, and fills every parameter the request leaves out from the theme: its skin, face, state and colour, or a fixed dimension's value. Theme characters stay out of the default pool; `shape`, `variant` and `color` accept them by id. Every shipped theme is installed on the server.

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
