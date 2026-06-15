// src/systems/OfflineRewardSystem.ts
// Offline reward accrual and claim on Hub load (Section 22).

import { OFFLINE } from '../constants/gameConfig';
import type {
  OfflineRewardClaimResult,
  OfflineRewardPreview,
  RealmSaveDataV3,
  RewardBundle,
} from '../types';
import { RewardSystem } from './RewardSystem';

function computeHoursOffline(lastOnlineAt: number, now: number): number {
  return Math.max(0, (now - lastOnlineAt) / 3_600_000);
}

function computeRewardAmounts(hoursOffline: number): Pick<
  OfflineRewardPreview,
  'eligible' | 'hoursCredited' | 'gold' | 'xpFragments' | 'energy'
> {
  if (hoursOffline < OFFLINE.MIN_HOURS_TO_TRIGGER) {
    return {
      eligible: false,
      hoursCredited: 0,
      gold: 0,
      xpFragments: 0,
      energy: 0,
    };
  }

  const hoursCredited = Math.min(hoursOffline, OFFLINE.MAX_HOURS);

  return {
    eligible: true,
    hoursCredited,
    gold: Math.floor(hoursCredited * OFFLINE.GOLD_PER_HOUR),
    xpFragments: Math.floor(hoursCredited * OFFLINE.XP_PER_HOUR),
    energy: Math.floor(hoursCredited * OFFLINE.ENERGY_PER_HOUR),
  };
}

export class OfflineRewardSystem {
  static preview(save: RealmSaveDataV3, now = Date.now()): OfflineRewardPreview {
    const hoursOffline = computeHoursOffline(save.offlineRewardState.lastOnlineAt, now);
    const amounts = computeRewardAmounts(hoursOffline);

    return {
      hoursOffline,
      ...amounts,
    };
  }

  /** Called on Hub load — computes pending rewards or refreshes lastOnlineAt. */
  static syncOnHubLoad(save: RealmSaveDataV3, now = Date.now()): OfflineRewardPreview {
    const preview = OfflineRewardSystem.preview(save, now);

    if (preview.eligible) {
      save.offlineRewardState = {
        ...save.offlineRewardState,
        pendingGold: preview.gold,
        pendingXpFragments: preview.xpFragments,
        pendingEnergy: preview.energy,
      };
      // Offline window energy comes from the claim bundle only — do not also regen
      // for the same elapsed period via lastEnergyRegenAt.
      save.inventory = {
        ...save.inventory,
        lastEnergyRegenAt: now,
      };
      return preview;
    }

    save.offlineRewardState = {
      ...save.offlineRewardState,
      pendingGold: 0,
      pendingXpFragments: 0,
      pendingEnergy: 0,
      lastOnlineAt: now,
    };

    return preview;
  }

  static hasPendingRewards(save: RealmSaveDataV3): boolean {
    const { pendingGold, pendingXpFragments, pendingEnergy } = save.offlineRewardState;
    return pendingGold > 0 || pendingXpFragments > 0 || pendingEnergy > 0;
  }

  static touchLastOnline(save: RealmSaveDataV3, now = Date.now()): void {
    if (OfflineRewardSystem.hasPendingRewards(save)) return;

    save.offlineRewardState = {
      ...save.offlineRewardState,
      lastOnlineAt: now,
    };
  }

  static claim(save: RealmSaveDataV3, now = Date.now()): OfflineRewardClaimResult {
    const { pendingGold, pendingXpFragments, pendingEnergy } = save.offlineRewardState;

    if (!OfflineRewardSystem.hasPendingRewards(save)) {
      return { success: false, reason: 'No pending offline rewards' };
    }

    const bundle: RewardBundle = {
      source: 'offline_reward',
      currencies: [
        ...(pendingGold > 0 ? [{ type: 'gold' as const, amount: pendingGold }] : []),
        ...(pendingEnergy > 0 ? [{ type: 'energy' as const, amount: pendingEnergy }] : []),
      ],
      items: pendingXpFragments > 0
        ? [{ itemId: 'xp_fragment', quantity: pendingXpFragments }]
        : [],
    };

    RewardSystem.grantRewardBundle(save, bundle);

    save.offlineRewardState = {
      ...save.offlineRewardState,
      lastOnlineAt: now,
      pendingGold: 0,
      pendingXpFragments: 0,
      pendingEnergy: 0,
    };

    return { success: true, bundle };
  }
}
