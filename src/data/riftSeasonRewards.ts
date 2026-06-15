// src/data/riftSeasonRewards.ts
// Rift Season battle pass reward tracks — 30 tiers, 100 XP each (Section 30).

import { AWAKENING_CRYSTAL_ITEM_ID } from './awakeningData';
import type { RewardBundle } from '../types';

export interface RiftSeasonTierRewards {
  tier: number;
  free: RewardBundle;
  premium: RewardBundle;
}

function tierBundle(
  tier: number,
  free: RewardBundle,
  premium: RewardBundle,
): RiftSeasonTierRewards {
  return { tier, free, premium };
}

/** Escalating free/premium tracks — premium is visibly richer at every tier. */
export const RIFT_SEASON_TIER_REWARDS: RiftSeasonTierRewards[] = [
  tierBundle(1,
    { source: 'rift_season', currencies: [{ type: 'gold', amount: 500 }] },
    { source: 'rift_season', currencies: [{ type: 'gold', amount: 1_000 }, { type: 'rift_crystal', amount: 30 }] },
  ),
  tierBundle(2,
    { source: 'rift_season', currencies: [{ type: 'gold', amount: 600 }] },
    { source: 'rift_season', currencies: [{ type: 'gold', amount: 1_200 }, { type: 'rift_crystal', amount: 35 }] },
  ),
  tierBundle(3,
    { source: 'rift_season', currencies: [{ type: 'rift_crystal', amount: 20 }] },
    { source: 'rift_season', currencies: [{ type: 'rift_crystal', amount: 50 }, { type: 'gold', amount: 800 }] },
  ),
  tierBundle(4,
    { source: 'rift_season', currencies: [{ type: 'gold', amount: 800 }] },
    { source: 'rift_season', currencies: [{ type: 'gold', amount: 1_500 }], items: [{ itemId: 'sigil_dust', quantity: 5 }] },
  ),
  tierBundle(5,
    { source: 'rift_season', items: [{ itemId: 'xp_fragment', quantity: 10 }] },
    { source: 'rift_season', items: [{ itemId: 'xp_fragment', quantity: 25 }, { itemId: 'sigil_dust', quantity: 8 }] },
  ),
  tierBundle(6,
    { source: 'rift_season', currencies: [{ type: 'gold', amount: 1_000 }] },
    { source: 'rift_season', currencies: [{ type: 'gold', amount: 2_000 }, { type: 'rift_crystal', amount: 40 }] },
  ),
  tierBundle(7,
    { source: 'rift_season', currencies: [{ type: 'rift_crystal', amount: 25 }] },
    { source: 'rift_season', currencies: [{ type: 'rift_crystal', amount: 60 }] },
  ),
  tierBundle(8,
    { source: 'rift_season', items: [{ itemId: 'sigil_dust', quantity: 8 }] },
    { source: 'rift_season', items: [{ itemId: 'sigil_dust', quantity: 20 }, { itemId: 'xp_fragment', quantity: 15 }] },
  ),
  tierBundle(9,
    { source: 'rift_season', currencies: [{ type: 'gold', amount: 1_200 }] },
    { source: 'rift_season', currencies: [{ type: 'gold', amount: 2_500 }, { type: 'rift_crystal', amount: 50 }] },
  ),
  tierBundle(10,
    { source: 'rift_season', currencies: [{ type: 'void_gem', amount: 10 }] },
    { source: 'rift_season', currencies: [{ type: 'void_gem', amount: 25 }, { type: 'rift_crystal', amount: 60 }] },
  ),
  tierBundle(11,
    { source: 'rift_season', currencies: [{ type: 'rift_crystal', amount: 30 }] },
    { source: 'rift_season', currencies: [{ type: 'rift_crystal', amount: 70 }, { type: 'gold', amount: 1_500 }] },
  ),
  tierBundle(12,
    { source: 'rift_season', items: [{ itemId: 'xp_fragment', quantity: 15 }] },
    { source: 'rift_season', items: [{ itemId: 'xp_fragment', quantity: 35 }, { itemId: 'sigil_dust', quantity: 12 }] },
  ),
  tierBundle(13,
    { source: 'rift_season', currencies: [{ type: 'gold', amount: 1_500 }] },
    { source: 'rift_season', currencies: [{ type: 'gold', amount: 3_000 }] },
  ),
  tierBundle(14,
    { source: 'rift_season', items: [{ itemId: 'sigil_dust', quantity: 12 }] },
    { source: 'rift_season', items: [{ itemId: 'sigil_dust', quantity: 30 }, { itemId: 'xp_fragment', quantity: 20 }] },
  ),
  tierBundle(15,
    { source: 'rift_season', currencies: [{ type: 'void_gem', amount: 15 }] },
    { source: 'rift_season', currencies: [{ type: 'void_gem', amount: 35 }, { type: 'rift_crystal', amount: 80 }] },
  ),
  tierBundle(16,
    { source: 'rift_season', currencies: [{ type: 'rift_crystal', amount: 40 }] },
    { source: 'rift_season', currencies: [{ type: 'rift_crystal', amount: 90 }, { type: 'gold', amount: 2_000 }] },
  ),
  tierBundle(17,
    { source: 'rift_season', items: [{ itemId: 'xp_fragment', quantity: 20 }] },
    { source: 'rift_season', items: [{ itemId: 'xp_fragment', quantity: 45 }, { itemId: 'sigil_dust', quantity: 15 }] },
  ),
  tierBundle(18,
    { source: 'rift_season', currencies: [{ type: 'gold', amount: 2_000 }] },
    { source: 'rift_season', currencies: [{ type: 'gold', amount: 4_000 }, { type: 'rift_crystal', amount: 100 }] },
  ),
  tierBundle(19,
    { source: 'rift_season', items: [{ itemId: 'sigil_dust', quantity: 18 }] },
    { source: 'rift_season', items: [{ itemId: 'sigil_dust', quantity: 40 }, { itemId: AWAKENING_CRYSTAL_ITEM_ID, quantity: 1 }] },
  ),
  tierBundle(20,
    { source: 'rift_season', currencies: [{ type: 'void_gem', amount: 20 }] },
    { source: 'rift_season', currencies: [{ type: 'void_gem', amount: 45 }, { type: 'rift_crystal', amount: 120 }] },
  ),
  tierBundle(21,
    { source: 'rift_season', currencies: [{ type: 'rift_crystal', amount: 50 }] },
    { source: 'rift_season', currencies: [{ type: 'rift_crystal', amount: 130 }, { type: 'gold', amount: 3_000 }] },
  ),
  tierBundle(22,
    { source: 'rift_season', items: [{ itemId: 'xp_fragment', quantity: 25 }] },
    { source: 'rift_season', items: [{ itemId: 'xp_fragment', quantity: 55 }, { itemId: 'sigil_dust', quantity: 20 }] },
  ),
  tierBundle(23,
    { source: 'rift_season', currencies: [{ type: 'gold', amount: 2_500 }] },
    { source: 'rift_season', currencies: [{ type: 'gold', amount: 5_000 }, { type: 'rift_crystal', amount: 140 }] },
  ),
  tierBundle(24,
    { source: 'rift_season', items: [{ itemId: 'sigil_dust', quantity: 25 }] },
    { source: 'rift_season', items: [{ itemId: 'sigil_dust', quantity: 50 }, { itemId: AWAKENING_CRYSTAL_ITEM_ID, quantity: 1 }] },
  ),
  tierBundle(25,
    { source: 'rift_season', currencies: [{ type: 'void_gem', amount: 25 }] },
    { source: 'rift_season', currencies: [{ type: 'void_gem', amount: 55 }, { type: 'rift_crystal', amount: 150 }] },
  ),
  tierBundle(26,
    { source: 'rift_season', currencies: [{ type: 'rift_crystal', amount: 60 }] },
    { source: 'rift_season', currencies: [{ type: 'rift_crystal', amount: 160 }, { type: 'gold', amount: 4_000 }] },
  ),
  tierBundle(27,
    { source: 'rift_season', items: [{ itemId: 'xp_fragment', quantity: 30 }] },
    { source: 'rift_season', items: [{ itemId: 'xp_fragment', quantity: 70 }, { itemId: 'sigil_dust', quantity: 30 }] },
  ),
  tierBundle(28,
    { source: 'rift_season', currencies: [{ type: 'gold', amount: 3_000 }] },
    { source: 'rift_season', currencies: [{ type: 'gold', amount: 6_000 }, { type: 'rift_crystal', amount: 180 }] },
  ),
  tierBundle(29,
    { source: 'rift_season', items: [{ itemId: AWAKENING_CRYSTAL_ITEM_ID, quantity: 1 }] },
    { source: 'rift_season', items: [{ itemId: AWAKENING_CRYSTAL_ITEM_ID, quantity: 2 }, { itemId: 'sigil_dust', quantity: 40 }] },
  ),
  tierBundle(30,
    { source: 'rift_season', currencies: [{ type: 'void_gem', amount: 30 }] },
    { source: 'rift_season', currencies: [{ type: 'void_gem', amount: 70 }, { type: 'rift_crystal', amount: 200 }] },
  ),
];

const TIERS_BY_NUMBER = new Map(RIFT_SEASON_TIER_REWARDS.map((entry) => [entry.tier, entry]));

export function getRiftSeasonTierRewards(tier: number): RiftSeasonTierRewards | undefined {
  return TIERS_BY_NUMBER.get(tier);
}

export function getXpRequiredForTier(tier: number): number {
  return tier * 100;
}
