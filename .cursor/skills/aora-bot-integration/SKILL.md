---
name: aora-bot-integration
description: Embed Aora Bot characters in a host app — CharacterMark, the line face, the HUD, the emotion protocol, the arbiter, state channels, Claude Code / Cursor adapters, product surfaces (pickers, editor, scenes, cast, activity), SpriteMark, autoPause. Use when wiring an AI agent to a face, posting aoraBotId, drawing progress or timers around a character, or mounting the React surfaces.
---

# Aora Bot integration

## Install

```bash
pnpm add @aora-bot/react
```

```tsx
import { CharacterMark } from '@aora-bot/react';
import '@aora-bot/react/styles.css';

<CharacterMark shape="cloud" color="blue" state="thinking" sizePx={96} />;
```

React 19 is required. For geometry or a Node relay without React, use
`@aora-bot/engine` and `@aora-bot/engine/agent`.

## Appearance

A character is `{ shape, color, styleId, variant, face, nose, lineWeight, state }`.

- `shape` — one of the 40 `SHAPE_IDS` (`mochi` by default; filed by family in
  `SHAPE_FAMILIES`).
- `color` — one of the 12 `COLOR_IDS`. `ink` overrides the paint with any CSS
  colour or gradient when the palette does not fit the host.
- `styleId` / `variant` — the series and its look: `vector` (`solid` default,
  `outline`, `glass`, `sticker`, `paper`, `soft`, `riso`, `pencil`, `marker`, `crayon`,
  `watercolor`, `neon`, `chalk`), `pixel` (`crisp`,
  `dot`, `block`), `kaomoji` (`plain`, `bubble`). `listStyles()` is the source.
- `face` — `cute` (default: eyes, mouth and blush) | `eyes` (cut-out eyes
  only) | `line` (stroked nose + mouth).
- `nose` — `slant` | `angular` | `hook` | `long` | `curve` | `bow`. Omit for
  `autoNoseForKey(seed)`.
- `lineWeight` — one stroke weight (see `LINE_WEIGHT_RANGE`) shared by nose,
  mouth and HUD dials. Set it once per character; never per surface.
- `eyeScale` — enlarge or shrink the eyes without changing the topology.
- `preset` — a `CAST` id (`nimbo`, `bao`, …). Supplies shape and colour
  unless overridden.
- `emotionId` — two-digit protocol id; ignored when `state` is set.
- `followTarget` — `{ x, y }` in viewport pixels the eyes should track;
  `followPointer` does the same for the mouse.
- `hud` — a `HudSpec` drawn in the ring outside the body (below).
- `onSettle` — fires when a finite state (`spawning`, `celebrate`, …) has
  resolved to its `STATE_SETTLE_TO` target.

`autoPause` stops the loop when the tab is hidden, the element is off
screen, or reduced motion is on. `entryEffects` (default on) plays the
one-off flourish some states define. `antics` (default off) adds the
occasional idle bounce.

Every surface below takes `face`, `nose` and `lineWeight`, so a line-face
character stays a line-face character in a picker, a stack, an activity
mark or a scene.

## HUD

A belt replaces the body to say what the character is doing; a HUD draws in
the ring around a clean silhouette to say what it knows. Ten readout forms,
all data-driven — composing, scanning and breathing stay on the state table:

```
{ kind: 'progress', value: 0..1 }       { kind: 'timer', remainingMs, totalMs }
{ kind: 'clock', date? }                { kind: 'voice', level, bands?, mode? }
{ kind: 'context', used, total }        { kind: 'balance', value, low?, unit? }
{ kind: 'gauge', value, max }           { kind: 'kpi', value, delta?, series? }
{ kind: 'notify', count }               { kind: 'sync', state }
```

```tsx
<CharacterMark state="progress" hud={{ kind: 'progress', value: 0.4 }} />
<HudPlate hud={{ kind: 'timer', remainingMs: 42_000, totalMs: 60_000 }} level="loud" />
<AgentHud />   // draws whatever the arbiter's winning session sent
```

`HudPlate` renders the dial alone (a badge next to a name, a card corner);
`AgentHud` reads `hud` from the nearest `AgentStateProvider`. `evaluateHud`
from the engine returns the pure geometry for hosts that draw elsewhere.
`isHudSpec` validates untrusted input; the channel and protocol parsers
already call it.

## Emotion protocol

Agents speak two-digit ids, not state names. Originals are never
renumbered: `00` sleeping, `02` idle, `03` curious, `09` dragging, `10`
happy, `27` humming, `30` thinking, `32` working, `33` celebrate, `34`
alerting, `38` refusing, `40` searching, `41` powering-down. Full table in
`EMOTIONS`.

```ts
import { parseAgentMessage, resolveEmotionId, createArbiter } from '@aora-bot/engine/agent';

parseAgentMessage({ aoraBotId: '32', tips: 'Editing…', hud: { kind: 'progress', value: 0.4 } });
// → { emotionId: '32', state: 'working', tips: 'Editing…', hud: { kind: 'progress', value: 0.4 } }
```

`hud` is optional and travels with `tips`: it is per-session, the winning
session's dial is what shows, and an invalid `hud` is dropped rather than
failing the message.

Malformed input returns `null`. Unknown ids fall back by segment, then to
`02` (idle).

## Arbitration

Several sessions, one face. Highest priority wins; a state holds the
screen for `minDisplayMs`; one-shot events (`celebrate`, `alerting`,
`surprised`) are never dropped.

```tsx
import { AgentStateProvider, useAgentState, CharacterMark } from '@aora-bot/react';

function Face() {
  const { state, tips, hud, update } = useAgentState();
  return (
    <>
      <CharacterMark state={state} hud={hud} />
      <span>{tips}</span>
      <button onClick={() => update({ sessionId: 'demo', emotionId: '33' })}>done</button>
    </>
  );
}

<AgentStateProvider>
  <Face />
</AgentStateProvider>;
```

## Channels

Same object on HTTP, stdin, and `postMessage`:

```
{ "session_id": "s1", "aoraBotId": "32", "tips": "Editing…" }
{ "session_id": "s1", "aoraBotId": "32", "hud": { "kind": "progress", "value": 0.4 } }
{ "session_id": "s1", "agent_id": "claude-code", "event": "PreToolUse" }
{ "session_id": "s1", "state": "thinking" }
```

- `normalize` / `normalizeLine` — Node relays.
- `openMessageChannel` — iframes (`type: 'aora:state'`).
- `useEventSourceChannel(url)` — browser, feeds the nearest provider.

A sample relay lives at `examples/agent-relay/relay.mjs`.

## Adapters

`claudeCode`: SessionStart→idle, UserPromptSubmit→thinking,
PreToolUse→searching, PostToolUse→working, PostToolUseFailure→alerting,
Notification→refusing (`38`, "needs your approval"), Stop→celebrate,
SessionEnd→sleeping.

`cursor`: planning→thinking, toolCall→searching, fileEdit→working,
error→alerting, awaitingApproval→refusing, responding→composing,
taskComplete→celebrate, sessionEnd→sleeping.

`stateForTool('grep')` is the table `ActivityBadge` reads. For roster rows
that know only a verb (`reading`, `editing`, `running`, …) use
`stateForActivity(verb)` from `ACTIVITY_VERBS`; `characterStateForRoster`
folds verb, unread count and presence into one state for `AgentPortrait`.

## Surfaces

Pick the smallest thing that does the job; all of them share the stage,
locale and face settings.

| Need                                        | Use                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------ |
| One character, animated                     | `CharacterMark`                                                                      |
| Dozens or hundreds                          | `CharacterStageProvider` + `StagedMark`                                              |
| Hold a state from a button, wait for settle | `useMarkCommands`, `useMarkSettle`, `useTapCycle`                                    |
| "Someone is working" in a chat              | `ActivityBadge` (`facts`, `bubble`, `onPoke`), `GroupActivityBadge`                  |
| A user's avatar from an id                  | `AgentPortrait`, `AvatarGroup`, `AvatarStatusDot`, `WorkingBadge`                    |
| Choose shape and ink                        | `CharacterSelector`, `AgentCharacterSelector`, `CompactCharacterSelector`            |
| Character or cropped picture, editable      | `AvatarStudio`, `AvatarButton`, `AvatarField`                                        |
| Name, publish, share a preset               | `TemplateDialog`, `VisibilityControls`, `ShareCard`, `usePublishMark`                |
| Who is in the room, who is speaking         | `OccupancyList`, `OccupancyMark`                                                     |
| A blocked, paused or denied surface         | `RestrictedScene`, `DeviceBezel`                                                     |
| Boot / loading                              | `BootLoop`, `LoadingCharacter`                                                       |
| Several characters entering and handing off | `CastLineup`, `CastFigure`, `PortraitSlot`, `useCastScene`                           |
| Onboarding walkthrough                      | `DemoDesktop`, `JobBubbles`, `SuggestionCards`, `LandingWait`, `HandOff`, `Composer` |
| Sleep after inactivity                      | `useIdleSleep`                                                                       |
| Celebration                                 | `CelebrationLayer`, `createConfettiController`                                       |

Labels for every catalogue id (states, shapes, inks, mouths, HUD kinds)
come from `useLabel()` under `LocaleProvider`; do not keep a parallel table
in the host.

## Sprites

`SpriteMark` takes a sprite-mate manifest and the same `state` /
`emotionId`. Missing ids walk the manifest fallback, then the protocol
segment fallback, then `02`.
