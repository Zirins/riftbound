// src/systems/ShardSystem.ts
// Star rank and dissolve — Phase 5: cost lookup only; mutations wired in Phase 6.

import { STAR_UPGRADE_COSTS } from '../constants/gameConfig';

export function getStarUpCost(starRank: number): { shards: number; gold: number } | null {
  const entry = STAR_UPGRADE_COSTS.find((cost) => cost.from === starRank);
  if (!entry) return null;
  return { shards: entry.shards, gold: entry.gold };
}
