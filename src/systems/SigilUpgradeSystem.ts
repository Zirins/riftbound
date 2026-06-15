// src/systems/SigilUpgradeSystem.ts
// Sigil level up, breakthrough, and dissolve (Section 14.4–14.5).

import { SIGIL } from '../constants/gameConfig';
import { getSigilDefinition } from '../data/sigils';
import { EconomySystem } from './EconomySystem';
import { GameEventBus } from './GameEventBus';
import { InventorySystem } from './InventorySystem';
import { RewardSystem } from './RewardSystem';
import { SigilSystem } from './SigilSystem';
import type {
  RealmSaveDataV3,
  SigilDissolveResult,
  SigilUpgradeResult,
} from '../types';

export class SigilUpgradeSystem {
  static levelUp(save: RealmSaveDataV3, sigilInstanceId: string): SigilUpgradeResult {
    const owned = SigilSystem.findOwnedSigil(save, sigilInstanceId);
    if (!owned) {
      return { success: false, reason: 'Sigil not found' };
    }

    if (owned.level >= SIGIL.MAX_LEVEL) {
      return { success: false, reason: 'Sigil is max level', newLevel: owned.level };
    }

    const goldCost = SIGIL.LEVEL_COST_GOLD[owned.level - 1] ?? 0;
    const spend = EconomySystem.spendCurrency(save, 'gold', goldCost, 'sigil_level_up');
    if (!spend.success) {
      return { success: false, reason: spend.reason ?? 'Insufficient Gold' };
    }

    owned.level += 1;
    GameEventBus.emit(save, {
      type: 'sigil_upgraded',
      sigilId: owned.instanceId,
      newLevel: owned.level,
    });
    return { success: true, newLevel: owned.level };
  }

  static breakthrough(save: RealmSaveDataV3, sigilInstanceId: string): SigilUpgradeResult {
    const owned = SigilSystem.findOwnedSigil(save, sigilInstanceId);
    if (!owned) {
      return { success: false, reason: 'Sigil not found' };
    }

    if (owned.breakthroughLevel >= 3) {
      return {
        success: false,
        reason: 'Max breakthrough reached',
        newBreakthroughLevel: owned.breakthroughLevel,
      };
    }

    const breakthroughIndex = owned.breakthroughLevel as 0 | 1 | 2;
    const nextBreakthrough = (breakthroughIndex + 1) as 1 | 2 | 3;
    const requiredLevel = SIGIL.BREAKTHROUGH_LEVELS[breakthroughIndex];
    if (owned.level < requiredLevel) {
      return {
        success: false,
        reason: `Requires Sigil level ${requiredLevel}`,
        newBreakthroughLevel: owned.breakthroughLevel,
      };
    }

    const dustCost = SIGIL.BREAKTHROUGH_DUST[requiredLevel - 1] ?? 0;
    const goldCost = SIGIL.LEVEL_COST_GOLD[requiredLevel - 1] ?? 0;

    if (!InventorySystem.hasItems(save, [{ itemId: 'sigil_dust', quantity: dustCost }])) {
      return { success: false, reason: 'Insufficient Sigil Dust' };
    }

    const goldSpend = EconomySystem.spendCurrency(save, 'gold', goldCost, 'sigil_breakthrough');
    if (!goldSpend.success) {
      return { success: false, reason: goldSpend.reason ?? 'Insufficient Gold' };
    }

    const dustSpend = InventorySystem.removeItem(save, 'sigil_dust', dustCost, 'sigil_breakthrough');
    if (!dustSpend.success) {
      EconomySystem.grantCurrency(save, 'gold', goldCost, 'dev_grant');
      return { success: false, reason: dustSpend.reason ?? 'Sigil Dust spend failed' };
    }

    const roll = SigilSystem.rollBreakthroughSecondary(owned, owned.breakthroughLevel);
    if (!roll) {
      return { success: false, reason: 'Invalid Sigil definition' };
    }

    owned.breakthroughLevel = nextBreakthrough;
    owned.secondaryStats = [...owned.secondaryStats, roll];
    GameEventBus.emit(save, {
      type: 'sigil_upgraded',
      sigilId: owned.instanceId,
      newLevel: owned.level,
    });
    return { success: true, newBreakthroughLevel: owned.breakthroughLevel };
  }

  static dissolve(save: RealmSaveDataV3, sigilInstanceId: string): SigilDissolveResult {
    const owned = SigilSystem.findOwnedSigil(save, sigilInstanceId);
    if (!owned) {
      return { success: false, reason: 'Sigil not found' };
    }

    if (owned.equippedHeroId) {
      return { success: false, reason: 'Cannot dissolve an equipped Sigil' };
    }

    const definition = getSigilDefinition(owned.definitionId);
    if (!definition) {
      return { success: false, reason: 'Invalid Sigil definition' };
    }

    const dustAmount = SIGIL.DISSOLVE_DUST[definition.rarity];
    const grant = RewardSystem.grantRewardBundle(save, {
      source: 'dev_grant',
      items: [{ itemId: 'sigil_dust', quantity: dustAmount }],
    });

    if (!grant.success) {
      return { success: false, reason: grant.errors?.join(', ') ?? 'Reward grant failed' };
    }

    save.sigilState.ownedSigils = save.sigilState.ownedSigils.filter(
      (sigil) => sigil.instanceId !== sigilInstanceId,
    );

    return { success: true, dustGranted: dustAmount };
  }
}
