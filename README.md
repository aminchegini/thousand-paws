# Thousand Paws

A small 3D arcade with two cabinets, built with React, Vite and Three.js.

- **Thousand Paws.** A counter races upward, speeding up and slowing down at random. Press the big red button when it reads exactly 1000 and one of the eight teddy bears on the shelf beside you unlocks.
- **Plush Grab.** A full-size claw machine with a capsule bay that pays out on every play.

## Licence: free to use, not for commercial use

This project is **source-available**. You may read, run, change and share it for noncommercial purposes under the [PolyForm Noncommercial License 1.0.0](LICENSE).

**Commercial use is not allowed without written permission from Amin Chegini.** [COMMERCIAL.md](COMMERCIAL.md) says what counts as commercial use and how to ask.

Because of that restriction this is not "open source" as the Open Source Initiative defines it. The token pipeline it is paired with, [pawprint-tokens](https://github.com/aminchegini/pawprint-tokens), is MIT licensed.

## Run it

You need Node 22 or newer and pnpm 10.

```bash
pnpm install
```

```bash
pnpm dev
```

That starts Thousand Paws on http://localhost:5183. For Plush Grab on http://localhost:5184:

```bash
pnpm dev:plush
```

Tests and production builds:

```bash
pnpm test
```

```bash
pnpm build
```

## How Thousand Paws plays

- Press the red button on the cabinet, the Start button in the side panel, or Space. The counter starts at 0.
- Its speed changes every 0.3 to 1.2 seconds: crawl, medium or sprint. From 985 on it only uses slow speeds.
- Press again to stop it. You win only if the number on screen is exactly 1000. A miss tells you how far off you were.
- The counter never skips 1000. It stays on screen for a guaranteed minimum time, which shrinks from 120 ms to 50 ms as your shelf fills up.
- If nobody stops it, the round ends as a miss at 1050.
- Each win unlocks one random bear. The gold bear, The Grand, comes last.
- Progress is saved in your browser. There is no account and no server.

Every number above is a constant in [`apps/thousand-paws/src/game/spec.js`](apps/thousand-paws/src/game/spec.js).

## Layout

| Path | What it is |
|---|---|
| `apps/thousand-paws` | The counter game. `src/game/counter.js` is the headless simulation, `arcade.js` the 3D model, `engine.js` the loop, camera and input. |
| `apps/plush-grab` | The claw machine. See its [README](apps/plush-grab/README.md). |
| `packages/arcade-kit` | What both cabinets share: Three.js helpers, the LED display, the tone engine and the teddy bear model. |

Add `?seed=123` to the Thousand Paws address to replay the same rounds. In development, `window.__thousandPaws` can step the game clock by hand, which the tests use to stop the counter on an exact number.

## Design tokens: the starting point

This repository is the subject of a Figma-to-code token pipeline, and it starts out on purpose in the state that pipeline is meant to fix:

- Plush Grab keeps its colours as hex values in `src/game/skins.js` and under its own names (`--pink`, `--trim`, `--mint`) in `src/styles.css`. That is how it was really built.
- Thousand Paws was then written the way a second team would: stock Tailwind colours, its own names (`--brand-candy`, `--btn-red`, `--shelf-wood`) and hex values in `src/game/palette.js`. That part is staged for the demonstration.

The migration to shared tokens happens in later pull requests.
