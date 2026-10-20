// Cosmetic motion in row units. No probabilities, virtual reel weights or payout logic.
const ACCELERATION_TIME = .24;
export class ReelMotion {
  constructor(column = 0) {
    this.column = column;
    this.speed = 15;
    this.position = 0;
    this.age = 0;
    this.phase = 'idle';
    this.plan = null;
    this.stopRequested = false;
  }
  start() {
    this.position = 0; this.age = 0; this.plan = null;
    this.stopRequested = false; this.phase = 'rolling';
  }
  requestStop() { this.stopRequested = true; }
  update(dt) {
    if (this.phase === 'idle') return;
    this.age += dt;
    if (this.phase === 'rolling') {
      // Analytic acceleration avoids frame-rate-dependent integration drift.
      const a = Math.min(this.age, ACCELERATION_TIME);
      this.position = this.speed * (a*a/(2*ACCELERATION_TIME) + Math.max(0,this.age-ACCELERATION_TIME));
      if (this.stopRequested && this.age >= ACCELERATION_TIME) {
        const start = this.position;
        const end = Math.ceil(start + 5 + this.column);
        // Cubic ease-out starts at exactly the current velocity, ends at zero.
        // All three result symbols are above the visible mask when the plan is created.
        this.plan = { start, end, duration: 3*(end-start)/this.speed, age: 0 };
        this.phase = 'stopping';
      }
    } else {
      this.plan.age = Math.min(this.plan.duration, this.plan.age+dt);
      const u = this.plan.age/this.plan.duration;
      this.position = this.plan.start+(this.plan.end-this.plan.start)*(1-(1-u)**3);
      if(u===1) { this.position=this.plan.end; this.phase='idle'; }
    }
  }
  get active() { return this.phase !== 'idle'; }
  get velocity() {
    if(this.phase==='idle') return 0;
    if(this.phase==='stopping') return this.speed*(1-this.plan.age/this.plan.duration)**2;
    return this.speed*Math.min(1,this.age/ACCELERATION_TIME);
  }
}

export function visibleSlots(position) {
  const first = Math.floor(-position)-1;
  return Array.from({length:6},(_,i)=>first+i);
}

export function symbolForSlot(slot, motion, initial, target, decoration) {
  const row = motion.plan ? slot+motion.plan.end : -1;
  if(target && row>=0 && row<3) return target[row];
  if(slot>=0 && slot<3) return initial[slot];
  return decoration[((-slot*3+motion.column*2)%decoration.length+decoration.length)%decoration.length];
}
