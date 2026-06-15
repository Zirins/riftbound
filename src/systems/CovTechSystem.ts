// src/systems/CovTechSystem.ts
// Sect tech passive buffs from covLevel (Section 25.5).

import {
  COVENANT_TECH_UNLOCKS,
  computeCovenantLevelFromXp,
  type CovenantTechDefinition,
} from '../data/covenantLevels';
import { mergeGlobalModifiers } from '../data/bonds';
import type { GlobalStatModifiers, RealmSaveDataV3 } from '../types';

function isInCovenant(save: RealmSaveDataV3): boolean {
  return save.covenantState?.covId != null;
}

export class CovTechSystem {
  static computeTechModifiers(save: RealmSaveDataV3): GlobalStatModifiers {
    if (!isInCovenant(save)) return {};

    const level = save.covenantState.covLevel;
    let modifiers: GlobalStatModifiers = {};

    for (const tech of COVENANT_TECH_UNLOCKS) {
      if (tech.level > level || !tech.combatModifiers) continue;
      modifiers = mergeGlobalModifiers(modifiers, tech.combatModifiers);
    }

    return modifiers;
  }

  static getActiveTechDefinitions(save: RealmSaveDataV3): CovenantTechDefinition[] {
    if (!isInCovenant(save)) return [];

    const level = save.covenantState.covLevel;
    return COVENANT_TECH_UNLOCKS.filter(
      (tech) => tech.level <= level && tech.level > 1,
    );
  }

  static formatActiveTechLabels(save: RealmSaveDataV3): string[] {
    return CovTechSystem.getActiveTechDefinitions(save).map((tech) => tech.label);
  }

  static recalculateLevel(save: RealmSaveDataV3): void {
    if (!isInCovenant(save)) return;
    save.covenantState.covLevel = computeCovenantLevelFromXp(save.covenantState.covXP);
  }

  static scaleCampaignGold(save: RealmSaveDataV3, amount: number): number {
    const bonus = CovTechSystem.computeTechModifiers(save).campaignGoldPercent ?? 0;
    return Math.floor(amount * (1 + bonus));
  }

  static scaleCovenantCoinGrant(save: RealmSaveDataV3, amount: number): number {
    const bonus = CovTechSystem.computeTechModifiers(save).covenantCoinGainPercent ?? 0;
    return Math.floor(amount * (1 + bonus));
  }

  static getEnergyRegenMultiplier(save: RealmSaveDataV3): number {
    const bonus = CovTechSystem.computeTechModifiers(save).energyRegenPercent ?? 0;
    return 1 + bonus;
  }

  /**
   * Lv3 "Shop slot +1" → +1 weekly purchase limit on Sigil Dust (3→4).
   * Lv9 spec bonus → another +1 on Sigil Dust only (4→5 at Lv9+).
   */
  static getShopWeeklyLimitBonus(save: RealmSaveDataV3, shopItemId: string): number {
    if (!isInCovenant(save) || shopItemId !== 'cov_shop_sigil_dust') return 0;

    const level = save.covenantState.covLevel;
    let bonus = 0;
    if (level >= 3) bonus += 1;
    if (level >= 9) bonus += 1;
    return bonus;
  }

  static describeShopLimitBonuses(save: RealmSaveDataV3): string | null {
    const bonus = CovTechSystem.getShopWeeklyLimitBonus(save, 'cov_shop_sigil_dust');
    if (bonus <= 0) return null;
    return `Sigil Dust weekly limit +${bonus} (Lv3/Lv9 tech)`;
  }
}
