# Agent relay

A zero-dependency Node script that turns agent events into a face.

```bash
# from the repository root, after `pnpm run build:lib`
node examples/agent-relay/relay.mjs
```

Then, in another terminal:

```bash
curl -X POST http://127.0.0.1:27182/state \
  -H 'content-type: application/json' \
  -d '{"session_id":"s1","aoraBotId":"32","tips":"Editing…"}'
```

Open http://127.0.0.1:27182 — the page shows the current character and
listens on `/events`.

A message may also carry a `hud` block. It is validated like the rest of the
payload (an invalid `hud` is dropped, the message still applies) and rides
along with the winning session's state, so `/events` and `/preview.svg` both
show it:

```bash
curl -X POST http://127.0.0.1:27182/state \
  -H 'content-type: application/json' \
  -d '{"session_id":"s1","aoraBotId":"47","tips":"Indexing 3 of 8","hud":{"kind":"progress","value":0.375}}'
```

Pipe a stream of lines instead:

```bash
my-agent --emit-json | node examples/agent-relay/relay.mjs --stdin
```

`POST /state` answers 204 on success and 400 with the reason on a bad
payload, matching the channel contract. The React side of the same flow is
`useEventSourceChannel` + `CharacterMark`; see
[Agent integration](https://aora-bot.vercel.app/en/guide/agent-integration).
