// src/systems/HeroProgressionSystem.ts
// Hero level progression — costs, stats, RP, and level-up mutations.

import {
  LEVEL_CAP,
  LEVEL_UP_COSTS,
  RP_FORMULA_WEIGHTS,
  STAR_MULTIPLIERS,
} from '../constants/gameConfig';
import { HEROES_DATA } from '../data/heroes';
import type { HeroData, HeroOwnershipState, HeroStats, RealmSaveDataV3 } from '../types';
import { canAfford, deduct } from './EconomySystem';
import { loadCurrentRealm, saveCurrentRealm } from './SaveSystem';
import { BondSystem } from './BondSystem';
import { SigilSystem } from './SigilSystem';
import { reportProgress } from './TaskSystem';

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

export function computeHeroStats(heroId: string): HeroStats | null {
  const realm = loadCurrentRealm();
  const heroData = HEROES_DATA.find((hero) => hero.id === heroId);
  const ownership = realm?.ownedHeroes.find(
    (hero) => hero.heroId === heroId && hero.isOwned,
  );
  if (!heroData || !ownership) return null;
  return resolveHeroStats(ownership, heroData, realm as RealmSaveDataV3 | null);
}

export function computeRP(hero: HeroOwnershipState, heroData: HeroData): number {
  const realm = loadCurrentRealm();
  const { hp, attack, defense } = resolveHeroStats(
    hero,
    heroData,
    realm as RealmSaveDataV3 | null,
  );
  const { HP_WEIGHT, ATTACK_WEIGHT, DEFENSE_WEIGHT, STARS_WEIGHT, LEVEL_WEIGHT } = RP_FORMULA_WEIGHTS;
  return Math.floor(
    hp * HP_WEIGHT
    + attack * ATTACK_WEIGHT
    + defense * DEFENSE_WEIGHT
    + hero.starRank * STARS_WEIGHT
    + hero.level * LEVEL_WEIGHT,
  );
}

export function levelUp(heroId: string): boolean {
  const realm = loadCurrentRealm();
  if (!realm) return false;

  const heroIndex = realm.ownedHeroes.findIndex(
    (hero) => hero.heroId === heroId && hero.isOwned,
  );
  if (heroIndex < 0) return false;

  const hero = realm.ownedHeroes[heroIndex];
  const cap = getLevelCap(hero.starRank);
  if (hero.level >= cap) return false;

  const cost = getLevelUpCost(hero.level);
  if (!canAfford('gold', cost.gold) || !canAfford('xpFragments', cost.xpFragments)) {
    return false;
  }

  const goldDeductOk = deduct('gold', cost.gold);
  const xpDeductOk = deduct('xpFragments', cost.xpFragments);
  if (!goldDeductOk || !xpDeductOk) {
    return false;
  }

  const currentRealm = loadCurrentRealm();
  if (!currentRealm) return false;

  const currentHeroIndex = currentRealm.ownedHeroes.findIndex(
    (entry) => entry.heroId === heroId && entry.isOwned,
  );
  if (currentHeroIndex < 0) return false;

  const currentHero = currentRealm.ownedHeroes[currentHeroIndex];
  const updatedHeroes = [...currentRealm.ownedHeroes];
  updatedHeroes[currentHeroIndex] = { ...currentHero, level: currentHero.level + 1 };

  saveCurrentRealm({ ...currentRealm, ownedHeroes: updatedHeroes });
  reportProgress('task_level_hero', 1);
  return true;
}

function resolveHeroStats(
  hero: HeroOwnershipState,
  heroData: HeroData,
  save: RealmSaveDataV3 | null,
): HeroStats {
  const base = buildHeroStats(hero, heroData);
  if (!save) return base;

  const withBonds = BondSystem.applyGlobalModifiers(
    base,
    BondSystem.computeGlobalModifiers(save),
  );
  return SigilSystem.applyBonusesToStats(
    withBonds,
    SigilSystem.computeSigilStatBonuses(save, hero.heroId),
  );
}

function buildHeroStats(
  hero: HeroOwnershipState,
  heroData: HeroData,
): HeroStats {
  const starMult = STAR_MULTIPLIERS[hero.starRank] ?? 1;
  const levelOffset = hero.level - 1;
  return {
    hp: Math.floor((heroData.baseHP + heroData.hpPerLevel * levelOffset) * starMult),
    attack: Math.floor((heroData.baseAttack + heroData.attackPerLevel * levelOffset) * starMult),
    defense: Math.floor((heroData.baseDefense + heroData.defensePerLevel * levelOffset) * starMult),
  };
}
