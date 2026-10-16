# Backend adapter integration

The implemented adapter is a frontend preview. The interface below is a proposed boundary, not a claim about existing API endpoints. Replace the adapter in `src/app.js` when the current backend contract is supplied. Never infer or calculate outcomes in the browser.

## initialize

Returns mode, config, balanceCents, grid and history. Config contains currency, minBetCents, betStepCents and nullable maxBetCents. Values are integer minor units. Map actual backend IDs to the display IDs in `src/symbols.js`. A grid contains three arrays of five display symbol IDs.

## spin

Receives `{betCents, requestId}`. The request ID must be treated idempotently by the backend. Resolve with `{roundId, requestId, betCents, balanceCents, winCents, grid, winningCells, timestamp, status, multiplier?}`. `winningCells` is an optional list of row-major indexes 0–14 supplied by the backend. History multiplier is displayed only when supplied, never inferred. Use authoritative server status and money. The UI blocks another spin while the request is unresolved.

## recover

Fetch the pending round by its original identity; do not submit another wager. A disconnect sets the UI to a blocking reconnect state and stops autoplay. On successful reconciliation, replace balance and present the result. Implement durable pending-round IDs, startup recovery and real retry policy against the actual API before enabling live play. The preview adapter's pending state is memory-only.

## Authentication and errors

Auth, tokens, endpoints and polling are intentionally unspecified. Never embed a server secret in static frontend code. Require runtime response validation, typed server errors, authentication expiry handling and an explicit under-review/voided/refunded flow once their payloads are known. The current preview implements a connection interruption and a generic blocking failure; it does not invent financial transitions for those unresolved cases.

## Preserved presentation rules

- 5 reels, 3 rows, 5 fixed lines.
- Wild shown only on reels 2, 3, 4; Star only on 1, 3, 5.
- Status texts: Place a bet; Good luck; You have won N,NN EUR; Better luck next time.
- Balance replaced only after round response.
- Stop autoplay completes current round and cancels subsequent rounds.
- Buttons select total-bet presets; confirm set versus additive semantics against the original UI before live integration.

No assumed RTP, maximum bet, maximum win, probabilities or reel strips are part of the adapter.
