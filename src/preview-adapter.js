import { idleGrid } from './symbols.js';
export class PreviewError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}
const clone = value => structuredClone(value);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Authored fixtures only: no RNG, reel strips, payline evaluator or payout calculation.
const fixtures = {
  loss: { grid: idleGrid, winCents: 0, winningCells: [] },
  win: { grid: [['burger','cherries','seven','shake','coffee'], ['coffee','wild','coffee','fries','dollar'], ['sundae','burger','pie','cherries','star']], winCents: 200, winningCells: [5,6,7] },
};
export class PreviewAdapter {
  constructor({ latency = 1650, storage = globalThis.sessionStorage } = {}) {
    this.latency = latency; this.storage = storage; this.scenario = 'sequence'; this.pending = null;
    try { this.session = JSON.parse(storage?.getItem('neon-diner-preview-v1')); } catch {}
    if (!this.session || !Number.isSafeInteger(this.session.balanceCents) || !Array.isArray(this.session.history)) {
      this.session = { balanceCents: 100000, history: [], grid: clone(idleGrid), counter: 0 };
    }
  }
  save() { try { this.storage?.setItem('neon-diner-preview-v1', JSON.stringify(this.session)); } catch {} }
  async initialize() {
    return { mode: 'preview', config: { minBetCents: 10, betStepCents: 1, maxBetCents: null, currency: 'EUR' }, balanceCents: this.session.balanceCents, history: clone(this.session.history), grid: clone(this.session.grid || idleGrid) };
  }
  setScenario(scenario) { this.scenario = scenario; }
  async spin({ betCents, requestId }) {
    const existing = this.session.history.find(r => r.requestId === requestId);
    if (existing) return clone(existing);
    if (this.pending) throw new PreviewError('A round is already pending.', 'PENDING');
    this.pending = { requestId, betCents };
    await sleep(this.latency);
    if (this.scenario === 'connection') throw new PreviewError('Connection interrupted.', 'CONNECTION');
    return this.settle(this.scenario);
  }
  settle(scenario) {
    const { requestId, betCents } = this.pending;
    const key = scenario === 'sequence' ? (this.session.counter % 3 === 1 ? 'win' : 'loss') : scenario;
    const fixture = fixtures[key] || fixtures.loss;
    const row = { ...clone(fixture), requestId, roundId: `preview-${++this.session.counter}`, betCents, balanceCents: this.session.balanceCents - betCents + fixture.winCents, timestamp: new Date().toISOString(), status: 'Settled' };
    this.session.balanceCents = row.balanceCents;
    this.session.grid = clone(row.grid);
    this.session.history.unshift(row);
    this.session.history = this.session.history.slice(0, 200);
    this.pending = null; this.save(); return clone(row);
  }
  async recover() {
    await sleep(500);
    // A reconnect retrieves the same pending round; never submits another bet.
    return this.pending ? this.settle('loss') : null;
  }
}
