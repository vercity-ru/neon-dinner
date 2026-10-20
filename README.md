# Neon Dinner Midnight

Frontend reskin project for Burning Hot. The original game is unchanged. This repository contains the approved diner theme, responsive 5×3 screen, editable bet, preset buttons, spin status, autoplay, history, rules and a reconnect state.

## Run

Requires Node.js 22 or newer. Install the locked dependencies with `npm ci`.

```sh
npm ci
npm run dev
npm test
npm run build
```

Open http://127.0.0.1:4173. The static production output is `dist/`.

## Preview mode

No wagering backend is connected. `Preview controls` selects a scripted sequence, a 2 EUR win, a loss, or an interrupted connection. These fixtures test presentation only and deliberately do not calculate payouts from a wager or a grid. The badge remains visible to distinguish the preview from a live game.

The preview starts with 1000 EUR of sample balance, minimum 0.10 EUR, step 0.01 EUR and no configured maximum. Balance is replaced with the adapter's response after settlement. Session data remains in this browser tab and is capped at 200 completed rounds. Reload restores completed rounds without replaying a win animation. Preview interruption recovery is illustrative, not durable server recovery.

Preset buttons select 1, 2, 5, 10, 50 or 100 EUR as the total bet. This is the interpretation of the approved fixed-bet block; if additive controls are required by the original integration, change this binding, not the engine. Autoplay has 5, 10, 25, 50 and 100 rounds. Stop lets the pending spin finish, then stops. No funds, live RNG, payline evaluation or RTP are implemented here.

## Source map

- `src/App.vue`: Vue 3 Composition API screen and reactive UI state.
- `src/components/ReelStage.vue`: PixiJS 8 canvas, masks, textures, animation and localized Wild label.
- `src/components/GameDialog.vue`: shared accessible native dialog.
- `src/components/GameRules.vue`: localized rules and paytable.
- `src/locales/en.json`: every English UI label, rule, error and accessible description, with flat camelCase keys.
- `src/i18n.js`: dictionary lookup, fallback and named interpolation, for example `t('spinWon', { amount })`.
- `src/game-controller.js`: framework-independent round and autoplay state machine. Errors are key/parameter objects.
- `src/preview-adapter.js`: authored preview outcomes; no game math.
- `src/reel-layout.js`: responsive sprite geometry, covered by tests.
- `src/money.js`: integer minor-unit parsing and configured validation.
- `src/symbols.js`: backend-to-art mapping and symbol translation keys.
- `vite.config.js`: Vue SFC build and localized HTML metadata.
- `assets/`: existing background and symbol art. Vite bundles only referenced runtime WebP files.

The stack is Vue 3 + PixiJS 8 + Vite. Vue owns HTML controls and dialogs; Pixi owns the visible 5×3 board, symbol sprites, clipping, animation and winner highlights. A screen-reader list mirrors the canvas. Pixi responds to resize and reduced-motion changes and releases its renderer on unmount. Currency values, numeric presets and payout coefficients are data rather than translation keys.

The historical folder and existing Sites slug remain `neon-diner` to preserve paths. The displayed game name and page metadata are Neon Dinner. The approved concept PNG remains an unchanged historical reference.

## Delivery boundary

This is an initial interactive frontend, not a certified production wagering client. Before integration, provide the current API schema, symbol IDs, auth/session flow, pending-round recovery, history pagination and server error taxonomy. The math remains owned by the backend. Displayed paytable content is copied from the supplied document and requires the existing product's approval before live release.
