// src/systems/HeroProgressionSystem.ts
// Hero level progression — Phase 5: cost/RP/stats only; levelUp wired in Phase 6.

import {
  LEVEL_CAP,
  LEVEL_UP_COSTS,
  RP_FORMULA_WEIGHTS,
  STAR_MULTIPLIERS,
} from '../constants/gameConfig';
import type { HeroData, HeroOwnershipState } from '../types';

export function getLevelUpCost(level: number): { gold: number; xpFragments: number } {
  const bracket = LEVEL_UP_COSTS.find(
    (entry) => level >= entry.minLevel && level <= entry.maxLevel,
  );
  const tier = bracket ?? LEVEL_UP_COSTS[LEVEL_UP_COSTS.length - 1];
  return { gold: tier.goldPerLevel, xpFragments: tier.xpFragPerLevel };
}

export function getLevelCap(starRank: number): number {
  return LEVEL_CAP[starRank] ?? LEVEL_CAP[5];
}

export function computeHeroStats(
  hero: HeroOwnershipState,
  heroData: HeroData,
): { hp: number; attack: number; defense: number } {
  const starMult = STAR_MULTIPLIERS[hero.starRank] ?? 1;
  const levelOffset = hero.level - 1;
  return {
    hp: Math.floor((heroData.baseHP + heroData.hpPerLevel * levelOffset) * starMult),
    attack: Math.floor((heroData.baseAttack + heroData.attackPerLevel * levelOffset) * starMult),
    defense: Math.floor((heroData.baseDefense + heroData.defensePerLevel * levelOffset) * starMult),
  };
}

export function computeRP(hero: HeroOwnershipState, heroData: HeroData): number {
  const { hp, attack, defense } = computeHeroStats(hero, heroData);
  const { HP_WEIGHT, ATTACK_WEIGHT, DEFENSE_WEIGHT, STARS_WEIGHT, LEVEL_WEIGHT } = RP_FORMULA_WEIGHTS;
  return Math.floor(
    hp * HP_WEIGHT
    + attack * ATTACK_WEIGHT
    + defense * DEFENSE_WEIGHT
    + hero.starRank * STARS_WEIGHT
    + hero.level * LEVEL_WEIGHT,
  );
}
