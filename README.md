# Neon Dinner Midnight

Frontend reskin project for Burning Hot. The original game is unchanged. This repository contains the approved diner theme, responsive 5×3 screen, editable bet, preset buttons, spin status, autoplay, history, rules and a reconnect state.

## Run

Requires Node.js 22.12 or newer. Install the locked dependencies with `npm ci`.

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
```

Open http://127.0.0.1:4173. The static production output is `dist/`.

## Preview mode

No wagering backend is connected. `Preview controls` selects a scripted sequence, a 2 EUR win, a loss, or an interrupted connection. These fixtures test presentation only and deliberately do not calculate payouts from a wager or a grid. The badge remains visible to distinguish the preview from a live game.

The preview starts with 1000 EUR of sample balance, minimum 0.10 EUR, step 0.01 EUR and no configured maximum. Balance is replaced with the adapter's response after settlement. Session data remains in this browser tab and is capped at 200 completed rounds. Reload restores completed rounds without replaying a win animation. Preview interruption recovery is illustrative, not durable server recovery.

Preset buttons select 1, 2, 5, 10, 50 or 100 EUR as the total bet. This is the interpretation of the approved fixed-bet block; if additive controls are required by the original integration, change this binding, not the engine. Autoplay has 5, 10, 25, 50 and 100 rounds. Stop lets the pending spin finish, then stops. No funds, live RNG, payline evaluation or RTP are implemented here.

## Source map

The layout follows the supplied existing-game structure:

```text
src/
  @types/env.d.ts
  game/
    api/
      index.ts                 # adapter factory / future integration point
      schema.ts, schema.json   # frontend boundary; not a production API spec
      PreviewAdapter.js
    assets/
      common/                  # symbol textures + measured visible bounds
      desktop/                 # background (shared with mobile)
      common.pixi.manifest.json
    common/
      Components/              # dialogs, rules
      locales/en.json           # all UI text, flat camelCase keys
      GameController.js
      symbols.js
      i18n.js
    desktop/
      Components/GameConsole.vue
      Styles/index.css
      NeonDinnerDesktop.vue
    mobile/
      Styles/index.css
    pixi/
      Components/ReelStage.vue  # Vue lifecycle/accessibility bridge
      utils/                   # motion, visible slots, symbol geometry
      NeonDinner.ts            # Pixi application and five reel containers
    utils/money.js
  App.vue
  main.ts
```

Desktop and mobile deliberately share one mounted screen and one renderer; mobile styles
change the layout without recreating an in-flight round on resize. There are no separate
mobile textures, audio or scenes yet, so unused bundles and audio/random implementations
have not been added. Original artwork is preserved in `docs/art-source/`.

Symbols now use the reviewed reconstructed artwork in `public/symbols/<id>/`.
Each symbol has a Spine 4.2 JSON, text atlas and PNG. `src/game/assets/symbol-rigs.json`
records the artwork bounds inside the atlas. The static reel sprite is a framed region
of that same atlas PNG, so changing to Spine does not swap artwork or upload a second
copy of the texture. Original WebP assets and the old common manifest remain references.
To import another compatible reviewed package, run
`node scripts/import-symbol-rigs.cjs /path/to/neon-dinner-assets`.

The stack is Vue 3 + PixiJS 8 + Vite. Vue owns HTML controls and dialogs; Pixi owns the visible 5×3 board, symbol sprites, clipping, animation and winner highlights. A screen-reader list mirrors the canvas. Pixi responds to resize and reduced-motion changes and releases its renderer on unmount. Currency values, numeric presets and payout coefficients are data rather than translation keys.

Each reel uses one full-height mask and six recycled symbol views. Continuous movement
uses elapsed time in row units, acceleration, speed-dependent vertical blur, and a
velocity-matched deceleration to an integer row. Reels stop in sequence. Decorative
symbols during travel are an unweighted visual sequence, never a mathematical reel strip.
The final three symbols always come from the adapter. Gentle shading and vertical
compression toward the top/bottom give the reels a convex appearance.

On receipt of a result, balance/history are updated and the controller enters `settling`.
Controls stay locked and autoplay waits until Pixi confirms that all five reels stopped.
Stop during travel or deceleration completes the current round and cancels the next one.
Reduced motion shows the supplied final grid without scrolling.

## Sprite / Spine win lifecycle

Spinning and settling use only the 30 recycled Pixi sprites. JSON/atlas data is loaded
at initialization, but no Spine display instances are created before a winning result.
Only indices in the supplied `winningCells` become Spine instances, playing `win` once
with `autoUpdate: false`. The application advances only those instances, and stops its
ticker after the animation completes. Nonwinning symbols stay static throughout.
Starting the next spin destroys all win instances and restores all static views before
reel movement begins, including when a new spin interrupts a win. Shared texture and
parsed skeleton data remain cached for reuse; they are not duplicated per cell.
Autoplay waits for the win-complete callback before scheduling its next round; a manual
spin can interrupt the animation immediately. Static fallback and reduced motion also
release this gate, so a missing/disabled animation never leaves autoplay waiting.

The win layer sits outside the five reel masks. A padded backing canvas lets 150% wins
extend above/below/alongside the board. Resizing keeps the sprite and rig origins aligned.
Reduced motion retains static winning symbols and highlights. A failed rig load or
instance construction also retains its static symbol instead of hiding the result.

These assets are reconstructed flat artwork on weighted meshes, with separate halo and
sparkle effects; they are not fully separated object parts or native `.spine` projects.
All four source clips are included, but the game uses only `win` as requested.
The integration uses official `@esotericsoftware/spine-pixi-v8` 4.2.120.
See `docs/SPINE-RUNTIME-LICENSE.txt` for the runtime license distributed with this project.

`tests/spine-browser.cjs` verifies the real sprite-to-Spine transition, all 11 symbols,
texture sharing, matching setup positions, the 150% backing-canvas bounds, mobile
resizing, interrupted wins, cleanup, reduced motion and unavailable-rig fallback.

`npm test` covers money, round state, translations, geometry, continuous movement and
presentation gating. `npm run typecheck` checks TypeScript and Vue. Optional
`tests/browser.cjs` and `tests/motion-browser.cjs` use Playwright with Edge against the
development server; supply `PLAYWRIGHT_MODULE` if Playwright is installed outside this project.

The historical folder and existing Sites slug remain `neon-diner` to preserve paths. The displayed game name and page metadata are Neon Dinner. The approved concept PNG remains an unchanged historical reference.

## Delivery boundary

This is an initial interactive frontend, not a certified production wagering client. Before integration, provide the current API schema, symbol IDs, auth/session flow, pending-round recovery, history pagination and server error taxonomy. The math remains owned by the backend. Displayed paytable content is copied from the supplied document and requires the existing product's approval before live release.
