// src/systems/PatronSystem.ts
// Patron Tier — cumulative spend loyalty track (Section 34).

import { PATRON_PERKS, PATRON_TIER_THRESHOLDS, type PatronPerkDefinition } from '../data/patronPerks';
import type { RealmSaveDataV3 } from '../types';

/**
 * Patron points source (Phase 28 decision — documented):
 * Option (a): cumulative Void Gem value from monetization purchases.
 * Each successful purchaseVoidGemPackage / purchaseEntitlement adds that SKU's
 * patronPoints to patronState.patronPoints (lifetime, never decrements).
 * Stored in save.patronState.patronPoints; patronState.patronTier is derived.
 */
export class PatronSystem {
  static getPatronPoints(save: RealmSaveDataV3): number {
    return save.patronState.patronPoints;
  }

  static getPatronTier(points = 0): number {
    let tier = 0;
    for (let index = PATRON_TIER_THRESHOLDS.length - 1; index >= 0; index -= 1) {
      if (points >= PATRON_TIER_THRESHOLDS[index]) {
        tier = index;
        break;
      }
    }
    return tier;
  }

  static syncPatronTier(save: RealmSaveDataV3): number {
    const tier = PatronSystem.getPatronTier(save.patronState.patronPoints);
    save.patronState.patronTier = tier;
    return tier;
  }

  static addPatronPoints(save: RealmSaveDataV3, amount: number): number {
    const delta = Math.max(0, Math.floor(amount));
    if (delta <= 0) return save.patronState.patronPoints;

    save.patronState.patronPoints += delta;
    return save.patronState.patronPoints;
  }

  static getPointsForNextTier(points: number): { current: number; next: number; required: number } | null {
    const tier = PatronSystem.getPatronTier(points);
    if (tier >= 10) return null;

    const currentThreshold = PATRON_TIER_THRESHOLDS[tier];
    const nextThreshold = PATRON_TIER_THRESHOLDS[tier + 1];
    return {
      current: points - currentThreshold,
      next: nextThreshold - currentThreshold,
      required: nextThreshold,
    };
  }

  static getUnlockedPerks(tier: number): PatronPerkDefinition[] {
    return PATRON_PERKS.filter((perk) => perk.tier <= tier);
  }

  static getPerkListForDisplay(tier: number): Array<PatronPerkDefinition & { unlocked: boolean }> {
    return PATRON_PERKS.map((perk) => ({
      ...perk,
      unlocked: perk.tier <= tier,
    }));
  }

  static formatTierLabel(tier: number): string {
    if (tier <= 0) return 'Patron Tier 0';
    if (tier >= 10) return 'Rift Patron';
    return `Patron Tier ${tier}`;
  }
}
