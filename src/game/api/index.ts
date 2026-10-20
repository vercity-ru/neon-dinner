import { PreviewAdapter } from './PreviewAdapter.js';
// Replace this factory with the existing game's API adapter when its contract is supplied.
// Renderer code never creates outcomes or calculates payouts.
export const createGameApi = () => new PreviewAdapter();
export type { SpinRequest, RoundResult, GameConfig } from './schema';
