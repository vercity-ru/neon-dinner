# Neon Diner Midnight

Frontend reskin project for Burning Hot. The original game is unchanged. This repository contains the approved diner theme, responsive 5×3 screen, editable bet, preset buttons, spin status, autoplay, history, rules and a reconnect state.

## Run

Requires Node.js 22 or newer. No package installation is needed.

```sh
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

- `src/app.js`: DOM rendering, dialog interactions and keyboard support.
- `src/game-controller.js`: frontend state and autoplay orchestration.
- `src/preview-adapter.js`: authored preview scenarios only.
- `src/money.js`: minor-unit parsing, display and configured bet validation.
- `src/symbols.js`: reskin identity map.
- `src/styles.css`: responsive theme and reduced-motion behavior.
- `assets/`: generated background, transparent symbol atlas and optimized runtime assets.
- `docs/backend-contract.md`: integration contract to align with the real API.
- `docs/approved-concept.png`: approved visual reference.

All runtime source is plain ES modules with no framework lock-in. Artwork is separate from HTML controls; this is not a screenshot with click targets. Build and serving use Node built-ins. Fonts have local system fallbacks; the optional web font loads from Google Fonts.

## Delivery boundary

This is an initial interactive frontend, not a certified production wagering client. Before integration, provide the current API schema, symbol IDs, auth/session flow, pending-round recovery, history pagination and server error taxonomy. The math remains owned by the backend. Displayed paytable content is copied from the supplied document and requires the existing product's approval before live release.
