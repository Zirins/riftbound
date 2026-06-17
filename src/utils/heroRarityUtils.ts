// src/utils/heroRarityUtils.ts
// Hero grade display and ordering (B / A / A+ / S).

import type { HeroRarity } from '../types';
import type { ItemRarity } from '../data/items';

export const HERO_RARITY_RANK: Record<HeroRarity, number> = {
  b: 0,
  a: 1,
  a_plus: 2,
  s: 3,
};

export function formatHeroRarity(rarity: HeroRarity): string {
  switch (rarity) {
    case 'b': return 'B';
    case 'a': return 'A';
    case 'a_plus': return 'A+';
    case 's': return 'S';
  }
}

/** Top-tier summon reveal flash (A+ and S). */
export function isTopHeroRarity(rarity: HeroRarity): boolean {
  return rarity === 'a_plus' || rarity === 's';
}

/** Ten-pull guarantee: at least one hero above B grade. */
export function isTenPullGuaranteeTier(rarity: HeroRarity): boolean {
  return rarity !== 'b';
}

/** Map hero grade to inventory item color tier for shard display. */
export function heroRarityToItemRarity(rarity: HeroRarity): ItemRarity {
  switch (rarity) {
    case 'b': return 'uncommon';
    case 'a': return 'rare';
    case 'a_plus': return 'legendary';
    case 's': return 'legendary';
  }
}

/** Grade used for "random mid-tier shard" rewards (legacy rare-random pools). */
export const RANDOM_SHARD_HERO_GRADE: HeroRarity = 'a';
