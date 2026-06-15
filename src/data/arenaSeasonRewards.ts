// src/data/arenaSeasonRewards.ts
// End-of-season reward bundles per rank tier (Section 29.3).

import type { RewardBundle } from '../types';

export type ArenaSeasonTierId =
  | 'rift_initiate'
  | 'rift_adept'
  | 'rift_sentinel'
  | 'rift_vanguard'
  | 'rift_ascendant'
  | 'rift_paragon';

export const ARENA_SEASON_REWARDS: Record<ArenaSeasonTierId, RewardBundle> = {
  rift_initiate: {
    source: 'arena_season',
    currencies: [
      { type: 'gold', amount: 5_000 },
      { type: 'rift_crystal', amount: 50 },
    ],
  },
  rift_adept: {
    source: 'arena_season',
    currencies: [
      { type: 'gold', amount: 8_000 },
      { type: 'rift_crystal', amount: 80 },
      { type: 'arena_coin', amount: 50 },
    ],
  },
  rift_sentinel: {
    source: 'arena_season',
    currencies: [
      { type: 'rift_crystal', amount: 100 },
      { type: 'arena_coin', amount: 60 },
      { type: 'void_gem', amount: 25 },
    ],
  },
  rift_vanguard: {
    source: 'arena_season',
    currencies: [
      { type: 'rift_crystal', amount: 150 },
      { type: 'arena_coin', amount: 80 },
      { type: 'void_gem', amount: 50 },
    ],
  },
  rift_ascendant: {
    source: 'arena_season',
    currencies: [
      { type: 'rift_crystal', amount: 200 },
      { type: 'arena_coin', amount: 100 },
      { type: 'void_gem', amount: 75 },
    ],
  },
  rift_paragon: {
    source: 'arena_season',
    currencies: [
      { type: 'rift_crystal', amount: 250 },
      { type: 'arena_coin', amount: 125 },
      { type: 'void_gem', amount: 100 },
    ],
  },
};

export function getArenaSeasonReward(tierId: string): RewardBundle {
  const bundle = ARENA_SEASON_REWARDS[tierId as ArenaSeasonTierId];
  return bundle ?? ARENA_SEASON_REWARDS.rift_initiate;
}
