/** Frontend adapter contract, not a claim about the production server's schema. */
export interface GameConfig {
  minBetCents: number;
  betStepCents: number;
  maxBetCents: number | null;
  currency: string;
}
export interface SpinRequest { betCents: number; requestId: string }
export interface RoundResult {
  requestId: string;
  roundId: string;
  grid: string[][];
  betCents: number;
  balanceCents: number;
  winCents: number;
  winningCells?: number[];
  timestamp: string;
  status: string;
  multiplier?: number;
}
