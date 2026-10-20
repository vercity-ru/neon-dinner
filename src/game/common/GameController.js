import { validateBet } from '../utils/money.js';
import { idleGrid } from './symbols.js';
export class GameController extends EventTarget {
  constructor(adapter, { autoDelay = 800, waitForPresentation = false } = {}) {
    super(); this.adapter = adapter; this.autoDelay = autoDelay; this.waitForPresentation = waitForPresentation; this.timer = null; this.disposed = false;
    this.state = { phase: 'loading', betCents: 10, balanceCents: 0, winCents: 0, grid: structuredClone(idleGrid), winningCells: [], history: [], remaining: 0, autoActive: false, stopping: false, error: '', result: null };
  }
  emit() { this.dispatchEvent(new Event('change')); }
  async initialize() {
    try { Object.assign(this.state, await this.adapter.initialize(), { phase: 'idle' }); }
    catch { Object.assign(this.state, { phase: 'error', error: { key: 'loadError' } }); }
    this.emit();
  }
  get locked() { return ['loading','spinning','settling','reconnecting','recovering','error'].includes(this.state.phase) || this.state.autoActive; }
  setBet(cents) {
    if (this.locked) return false;
    const error = validateBet(cents, this.state.config, this.state.balanceCents);
    if (error) { this.state.error = error; this.emit(); return false; }
    this.state.betCents = cents; this.state.error = ''; this.emit(); return true;
  }
  async spin(fromAuto = false) {
    if (['loading','spinning','settling','reconnecting','recovering','error'].includes(this.state.phase) || (this.state.autoActive && !fromAuto)) return;
    const error = validateBet(this.state.betCents, this.state.config, this.state.balanceCents);
    if (error) { this.stopAuto(); this.state.error = error; this.emit(); return; }
    if (fromAuto) this.state.remaining--;
    Object.assign(this.state, { phase: 'spinning', error: '', result: null, winningCells: [], winCents: 0 }); this.emit();
    try {
      const result = await this.adapter.spin({ betCents: this.state.betCents, requestId: crypto.randomUUID() });
      if (!this.disposed) { this.applyResult(result); if(!this.waitForPresentation) this.scheduleNext(); }
    } catch (error) {
      this.stopAuto();
      Object.assign(this.state, { phase: error.code === 'CONNECTION' ? 'reconnecting' : 'error', error: error.code === 'CONNECTION' ? { key: 'connectionLost' } : { key: 'roundError' } }); this.emit();
    }
  }
  applyResult(result) {
    Object.assign(this.state, { phase: this.waitForPresentation ? 'settling' : 'result', result, balanceCents: result.balanceCents, winCents: result.winCents, grid: result.grid, winningCells: result.winningCells || [], error: '', stopping: this.waitForPresentation && this.state.stopping });
    if (!this.state.history.some(r => r.roundId === result.roundId)) this.state.history.unshift(result);
    this.emit();
  }
  completePresentation() {
    if(this.disposed || this.state.phase!=='settling') return;
    this.state.phase='result'; this.state.stopping=false; this.emit(); this.scheduleNext();
  }
  startAuto(count) {
    if (this.locked || ![5,10,25,50,100].includes(count)) return;
    this.state.autoActive = true; this.state.remaining = count; this.state.stopping = false;
    this.spin(true);
  }
  scheduleNext() {
    if (this.state.autoActive && this.state.remaining > 0) this.timer = setTimeout(() => this.spin(true), this.autoDelay);
    else { this.state.autoActive = false; this.state.remaining = 0; this.emit(); }
  }
  stopAuto() {
    clearTimeout(this.timer); this.timer = null;
    this.state.stopping = this.state.autoActive && ['spinning','settling'].includes(this.state.phase);
    this.state.autoActive = false; this.state.remaining = 0; this.emit();
  }
  dispose() { this.disposed = true; clearTimeout(this.timer); this.state.autoActive = false; }
  async recover() {
    if (this.state.phase !== 'reconnecting') return;
    this.state.phase = 'recovering'; this.emit();
    try { const result = await this.adapter.recover(); if (result) this.applyResult(result); else throw new Error(); }
    catch { this.state.phase = 'reconnecting'; this.state.error = { key: 'reconnectFailed' }; this.emit(); }
  }
}
