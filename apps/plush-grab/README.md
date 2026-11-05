# Plush Grab

A prototype of a real claw machine, modelled in 3D at full size with React, Vite and Three.js. It is one self-contained cabinet: glass playfield, control panel, prize door and a built-in capsule bay that pays out on every play. Orbit around it, zoom in, and play it with its own controls.

Overall size: 90 × 87 × 183 cm (W × D × H). One scene unit is 8 cm; every dimension lives in `src/game/spec.js` and `src/game/sim.js`.

## Run it

From the repository root:

```bash
pnpm install
pnpm dev:plush
```

Then open http://localhost:5184.

## The machine

- **Playfield:** claw on a two-axis gantry above a pile of 70 plush toys in four sizes (small to jumbo). Big toys are easier to land on but catch and hold less reliably. A clear shield above the chute walls keeps the pile from spilling in, and the pit restocks itself when it runs low.
- **Control panel:** joystick, lit drop button, a flush-mounted POS card reader and a two-line LED display showing the status, credits and wins. The reader has a screen, a contactless pad and four status lights. Payment is simulated, so no card data is handled or charged. The price is a placeholder set in `src/game/spec.js`.
- **Prize door:** claw prizes fall down the chute into a bin behind a smoked flap at the lower left, then the flap swings and hands them out.
- **Capsule bay (always win):** built into the lower right of the cabinet. Behind one window a hopper of capsules feeds a four-pocket gate wheel. After every play, win or lose, the wheel turns half a turn and one capsule rolls down two zig-zag ramps into the pickup alcove below, where an LED strip prompts you to open it. The alcove holds four; a fifth opens the oldest automatically.

## Cabinet finishes

Pick a finish in the side panel while the machine runs. Your choice is remembered. Each one restyles the cabinet, trim, marquee, playfield art, displays and the room, and the shape stays the same.

- **Candy Arcade (playful):** gloss pink laminate, yellow edge trim, mint hardware, confetti carpet.
- **Neon Night (edgy):** matte midnight purple, magenta and cyan LED edges, synthwave sunset playfield.
- **Retro Diner (nostalgic):** cherry red enamel, cream head, polished chrome, checkerboard floor.
- **Walnut & Brass (refined):** walnut veneer, brushed brass, bronze panel, cream playfield.

Skins live in `src/game/skins.js`, so adding another one means adding one entry there.

## Play

- Drag the joystick on the machine, or use the arrow keys or WASD. Hold to keep moving.
- Press the red button, or Space or Enter, to drop the claw. One credit per play.
- Tap the card reader on the panel, press P, or use the Tap card button to pay. Each approved tap adds one credit; a machine already holding 99 credits refuses the tap without charging. M toggles sound; the Music button toggles the arcade tune.
- Tap a capsule in the alcove, press O, or use Open capsule. The toy goes to the prize shelf beside the machine.
- Drag the background to walk around the machine and scroll to zoom. The view buttons jump to the whole machine, the claw, the capsule bay or the rear service panel.
- On phones and tablets an on-screen D-pad and drop button appear below the machine.
- Audio starts after your first click or key press (browsers block sound before any interaction).

## Layout

- `src/game/spec.js`: physical layout of the cabinet, shared by the simulations and the model.
- `src/game/sim.js`: the claw simulation. `createSim(handlers)` owns the prizes, the claw and the credits; `onPlayEnd` fires after every play. No DOM, no rendering.
- `src/game/pos.js`: the card reader's payment flow (tap, read, process, approve). Also headless.
- `src/game/capsules.js`: the capsule bay simulation (hopper, gate wheel, ramps, alcove, opening). Also headless.
- `src/game/skins.js`: the cabinet finishes and their artwork.
- `src/game/device.js`: the whole cabinet as a Three.js model, with its moving parts, pointer targets and skin application.
- `src/game/capsuleView.js`: capsule meshes and the opening animation.
- `src/game/scene.js`: the gantry, claw and plush toy meshes.
- `src/game/engine.js`: runs everything in one scene and loop, plus the orbit camera, view presets and pointer input on the physical controls. In development, `window.__plushGrab` can step the game clock by hand.
- `src/game/sfx.js`: Web Audio sound effects, motor hum and the chiptune loop.
- `src/game/plush.js`: 2D plush drawings, used for the prize shelf thumbnails.
- `src/components/`: React UI around the stage (view buttons, side panel, prize shelf, touch controls).
