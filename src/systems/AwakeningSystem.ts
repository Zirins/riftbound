// src/systems/AwakeningSystem.ts
// Hero Awakening progression — eligibility, costs, and state updates (Section 15.5).

import { AWAKENING } from '../constants/gameConfig';
import {
  AWAKENING_CRYSTAL_ITEM_ID,
  collectModifiersThroughLevel,
  getAwakeningLevelData,
  getNextAwakeningCostForLevel,
} from '../data/awakeningData';
import type {
  AwakeningCost,
  AwakeningResult,
  RealmSaveDataV3,
  SkillModifier,
} from '../types';
import { EconomySystem } from './EconomySystem';
import { InventorySystem } from './InventorySystem';
import { loadCurrentRealm, saveCurrentRealm } from './SaveSystem';

export class AwakeningSystem {
  static getAwakeningLevel(save: RealmSaveDataV3, heroId: string): 0 | 1 | 2 | 3 {
    return save.awakeningState[heroId]?.awakeningLevel ?? 0;
  }

  static getNextAwakeningCost(heroId: string, currentLevel: number): AwakeningCost {
    const trackCost = getAwakeningLevelData(heroId, (currentLevel + 1) as 1 | 2 | 3)?.costs;
    const standardCost = getNextAwakeningCostForLevel(currentLevel);
    return {
      gold: trackCost?.gold ?? standardCost?.gold ?? 0,
      awakeningCrystals: trackCost?.awakeningCrystals ?? standardCost?.awakeningCrystals ?? 0,
    };
  }

  static getSkillModifiers(save: RealmSaveDataV3, heroId: string): SkillModifier[] {
    const level = AwakeningSystem.getAwakeningLevel(save, heroId);
    return collectModifiersThroughLevel(heroId, level);
  }

  static isEligible(save: RealmSaveDataV3, heroId: string): boolean {
    const ownership = save.ownedHeroes.find((hero) => hero.heroId === heroId && hero.isOwned);
    if (!ownership) return false;
    if (ownership.starRank < AWAKENING.REQUIRED_STAR_RANK) return false;

    const currentLevel = AwakeningSystem.getAwakeningLevel(save, heroId);
    if (currentLevel >= AWAKENING.MAX_LEVEL) return false;

    return AwakeningSystem.canAffordNextAwakening(save, heroId, currentLevel);
  }

  static isUnlocked(save: RealmSaveDataV3, heroId: string): boolean {
    const ownership = save.ownedHeroes.find((hero) => hero.heroId === heroId && hero.isOwned);
    if (!ownership) return false;
    return ownership.starRank >= AWAKENING.REQUIRED_STAR_RANK;
  }

  static awaken(save: RealmSaveDataV3, heroId: string): AwakeningResult {
    const currentLevel = AwakeningSystem.getAwakeningLevel(save, heroId);

    const ownership = save.ownedHeroes.find((hero) => hero.heroId === heroId && hero.isOwned);
    if (!ownership) {
      return { success: false, newLevel: currentLevel, reason: 'Hero is not owned' };
    }

    if (ownership.starRank < AWAKENING.REQUIRED_STAR_RANK) {
      return {
        success: false,
        newLevel: currentLevel,
        reason: `Requires ${AWAKENING.REQUIRED_STAR_RANK} stars`,
      };
    }

    if (currentLevel >= AWAKENING.MAX_LEVEL) {
      return { success: false, newLevel: currentLevel, reason: 'Max Awakening reached' };
    }

    if (!AwakeningSystem.canAffordNextAwakening(save, heroId, currentLevel)) {
      return { success: false, newLevel: currentLevel, reason: 'Insufficient materials' };
    }

    const cost = AwakeningSystem.getNextAwakeningCost(heroId, currentLevel);
    const goldSpend = EconomySystem.spendCurrency(save, 'gold', cost.gold, 'hero_awakening');
    if (!goldSpend.success) {
      return { success: false, newLevel: currentLevel, reason: goldSpend.reason ?? 'Gold spend failed' };
    }

    const crystalSpend = InventorySystem.removeItem(
      save,
      AWAKENING_CRYSTAL_ITEM_ID,
      cost.awakeningCrystals,
      'hero_awakening',
    );
    if (!crystalSpend.success) {
      EconomySystem.grantCurrency(save, 'gold', cost.gold, 'dev_grant');
      return { success: false, newLevel: currentLevel, reason: crystalSpend.reason ?? 'Crystal spend failed' };
    }

    const newLevel = (currentLevel + 1) as 1 | 2 | 3;
    if (!save.awakeningState[heroId]) {
      save.awakeningState[heroId] = { heroId, awakeningLevel: 0 };
    }
    save.awakeningState[heroId].awakeningLevel = newLevel;

    return { success: true, newLevel };
  }

  private static canAffordNextAwakening(
    save: RealmSaveDataV3,
    heroId: string,
    currentLevel: number,
  ): boolean {
    const cost = AwakeningSystem.getNextAwakeningCost(heroId, currentLevel);
    const canPayGold = EconomySystem.canAfford(save, [{ type: 'gold', amount: cost.gold }]);
    const canPayCrystals = InventorySystem.hasItems(save, [{
      itemId: AWAKENING_CRYSTAL_ITEM_ID,
      quantity: cost.awakeningCrystals,
    }]);
    return canPayGold && canPayCrystals;
  }
}

export function awakenHero(heroId: string): AwakeningResult {
  const realm = loadCurrentRealm();
  if (!realm) {
    return { success: false, newLevel: 0, reason: 'No save loaded' };
  }

  const save = realm as RealmSaveDataV3;
  const result = AwakeningSystem.awaken(save, heroId);
  if (result.success) {
    saveCurrentRealm(save);
  }
  return result;
}
