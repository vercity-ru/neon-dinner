import test from 'node:test';
import assert from 'node:assert/strict';
import { GameController } from '../src/game-controller.js';
import { PreviewAdapter } from '../src/preview-adapter.js';
import { parseMoney, validateBet } from '../src/money.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
async function setup(latency = 2) {
  const adapter = new PreviewAdapter({ latency, storage: null });
  const game = new GameController(adapter, { autoDelay: 3 }); await game.initialize(); return { game, adapter };
}
test('currency accepts decimal commas and does not round fractional cents', () => {
  assert.equal(parseMoney('0,10'), 10); assert.equal(parseMoney('0.11'), 11);
  for (const input of ['0.001','-1','NaN','1e3','','1,2,3']) assert.equal(parseMoney(input), null);
  assert.equal(validateBet(9, {minBetCents:10,betStepCents:1},100), 'Minimum bet is 0,10 EUR.');
  assert.equal(validateBet(11, {minBetCents:10,betStepCents:1},100), '');
  assert.match(validateBet(110, {minBetCents:10,betStepCents:1},100), /Insufficient/);
});
test('one in-flight round, unchanged balance until response, immutable bet during spin', async () => {
  const {game} = await setup(25); const p=game.spin();
  assert.equal(game.state.phase,'spinning'); assert.equal(game.state.balanceCents,100000);
  assert.equal(game.setBet(100),false); await game.spin(); await p;
  assert.equal(game.state.history.length,1); assert.equal(game.state.balanceCents,99990);
});
test('stop finishes current spin and schedules no next round', async () => {
  const {game} = await setup(20); game.startAuto(5); game.stopAuto();
  assert.equal(game.state.phase,'spinning'); assert.equal(game.state.stopping,true);
  await wait(70); assert.equal(game.state.history.length,1); assert.equal(game.state.autoActive,false);
});
test('autoplay counts exactly five authored rounds', async () => {
  const {game} = await setup();
  const done = new Promise(resolve => game.addEventListener('change', () => { if (game.state.history.length === 5 && !game.state.autoActive) resolve(); }));
  game.startAuto(5); await done;
  assert.equal(game.state.history.length,5); assert.equal(game.state.remaining,0); assert.equal(game.state.autoActive,false);
});
test('reconnect blocks new bets and recovers existing round exactly once', async () => {
  const {game,adapter} = await setup(); adapter.setScenario('connection'); await game.spin();
  assert.equal(game.state.phase,'reconnecting'); assert.equal(game.state.balanceCents,100000);
  await game.spin(); assert.equal(game.state.history.length,0); assert.equal(game.setBet(200),false);
  await game.recover(); await game.recover();
  assert.equal(game.state.history.length,1); assert.equal(game.state.balanceCents,99990);
});
test('completed request identifiers are idempotent in preview adapter', async () => {
  const {adapter} = await setup(); const a=await adapter.spin({betCents:10,requestId:'same'});
  const b=await adapter.spin({betCents:10,requestId:'same'}); assert.deepEqual(a,b); assert.equal(adapter.session.history.length,1);
});
test('fixture win is an authored result, independent of bet size', async () => {
  const {game,adapter} = await setup(); adapter.setScenario('win'); game.setBet(100); await game.spin();
  assert.equal(game.state.winCents,200); assert.equal(game.state.balanceCents,100100);
});
test('minimum and insufficient balance never send a request', async () => {
  const {game} = await setup(); assert.equal(game.setBet(9),false);
  assert.equal(game.setBet(100001),false); assert.equal(game.state.betCents,10); assert.equal(game.state.history.length,0);
});
