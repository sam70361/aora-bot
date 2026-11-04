# Sprite sets

Two `sprite-mate` sheets used by the docs to demonstrate `SpriteMark`. Both are project-original and released under the Aora Bot License with the rest of Aora Bot.

| Set      | Frames                        | Origin                                                                                                                                                   |
| -------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bao`    | 32 ids, 2 frames each, 240 px | Rendered from the procedural `bao` character (the `bun` shape). Two frames per id at the 900 ms and 2100 ms phases of the breathing loop.                |
| `tapkin` | 12 ids, 1 frame each, 320 px  | A prompt-designed original character (cream mochi hamster) generated with AI assistance, chroma-keyed and sliced into a 4×3 grid. No third-party assets. |

Each folder carries its `manifest.json` (`kind: "sprite-mate"`, `formatVersion: 1`). The `provenance` block in each manifest records the pipeline that produced the frames. No third-party notice applies.
