// src/systems/CovShopSystem.ts
// Weekly-capped Sect shop purchases (Section 27).

import { AWAKENING_CRYSTAL_ITEM_ID } from '../data/awakeningData';
import {
  COVENANT_SHOP_ITEMS,
  getCovShopItemDefinition,
  type CovShopItemDefinition,
  type CovShopItemId,
} from '../data/covenantShop';
import { HEROES_DATA } from '../data/heroes';
import { RANDOM_SHARD_HERO_GRADE } from '../utils/heroRarityUtils';
import { getLocalWeekKey } from '../save/utils/saveDateUtils';
import type { RealmSaveDataV3, RewardBundle } from '../types';
import { CovSystem } from './CovSystem';
import { CovTechSystem } from './CovTechSystem';
import { EconomySystem } from './EconomySystem';
import { RewardSystem } from './RewardSystem';

export interface CovShopPurchaseResult {
  success: boolean;
  reason?: string;
}

export interface CovShopItemView {
  id: CovShopItemId;
  name: string;
  description: string;
  cost: number;
  baseWeeklyLimit: number;
  effectiveWeeklyLimit: number;
  purchasedThisWeek: number;
  remaining: number;
  techBonus: number;
  canPurchase: boolean;
  blockReason?: string;
}

function pickRandomRareHeroId(save: RealmSaveDataV3): string {
  const ownedRareIds = save.ownedHeroes
    .filter((hero) => hero.isOwned)
    .map((hero) => hero.heroId)
    .filter((heroId) => HEROES_DATA.find((hero) => hero.id === heroId)?.rarity === RANDOM_SHARD_HERO_GRADE);

  if (ownedRareIds.length === 0) return 'kael';

  const index = Math.floor(Math.random() * ownedRareIds.length);
  return ownedRareIds[index];
}

function buildRewardBundle(save: RealmSaveDataV3, item: CovShopItemDefinition): RewardBundle {
  switch (item.id) {
    case 'cov_shop_xp_fragments':
      return {
        source: 'covenant_shop',
        items: [{ itemId: 'xp_fragment', quantity: 10 }],
      };
    case 'cov_shop_sigil_dust':
      return {
        source: 'covenant_shop',
        items: [{ itemId: 'sigil_dust', quantity: 20 }],
      };
    case 'cov_shop_awakening_crystal':
      return {
        source: 'covenant_shop',
        items: [{ itemId: AWAKENING_CRYSTAL_ITEM_ID, quantity: 1 }],
      };
    case 'cov_shop_rare_shard_box':
      return {
        source: 'covenant_shop',
        heroShards: [{ heroId: pickRandomRareHeroId(save), quantity: 5 }],
      };
    default:
      return { source: 'covenant_shop' };
  }
}

export class CovShopSystem {
  static ensureCurrentWeek(save: RealmSaveDataV3, now = new Date()): void {
    if (!CovSystem.isInCovenant(save)) return;

    const weekKey = getLocalWeekKey(now);
    if (save.covenantState.shopState.weekKey !== weekKey) {
      CovShopSystem.resetWeekly(save, weekKey);
    }
  }

  static resetWeekly(save: RealmSaveDataV3, weekKey: string): void {
    if (!save.covenantState) return;

    const purchasedItemCountsBefore = {
      ...save.covenantState.shopState.purchasedItemCounts,
    };
    const previousWeekKey = save.covenantState.shopState.weekKey;

    save.covenantState.shopState = {
      weekKey,
      purchasedItemCounts: {},
    };

    if (import.meta.env.DEV) {
      console.info('[CovShopSystem] resetWeekly', {
        previousWeekKey,
        weekKey,
        purchasedItemCountsBefore,
        purchasedItemCountsAfter: save.covenantState.shopState.purchasedItemCounts,
      });
    }
  }

  static getPurchasedCount(save: RealmSaveDataV3, itemId: string): number {
    CovShopSystem.ensureCurrentWeek(save);
    return save.covenantState?.shopState.purchasedItemCounts[itemId] ?? 0;
  }

  static getEffectiveWeeklyLimit(save: RealmSaveDataV3, item: CovShopItemDefinition): number {
    const bonus = CovTechSystem.getShopWeeklyLimitBonus(save, item.id);
    return item.weeklyLimit + bonus;
  }

  static getItemView(save: RealmSaveDataV3, item: CovShopItemDefinition): CovShopItemView {
    const purchased = CovShopSystem.getPurchasedCount(save, item.id);
    const techBonus = CovTechSystem.getShopWeeklyLimitBonus(save, item.id);
    const effectiveLimit = item.weeklyLimit + techBonus;
    const remaining = Math.max(0, effectiveLimit - purchased);

    let canPurchase = CovSystem.isInCovenant(save);
    let blockReason: string | undefined;

    if (!canPurchase) {
      blockReason = 'Join a Sect first';
    } else if (remaining <= 0) {
      canPurchase = false;
      blockReason = 'Weekly limit reached';
    } else if (EconomySystem.getCurrencyBalance(save, 'covenant_coin') < item.cost) {
      canPurchase = false;
      blockReason = `Need ${item.cost} Sect Coins`;
    }

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      cost: item.cost,
      baseWeeklyLimit: item.weeklyLimit,
      effectiveWeeklyLimit: effectiveLimit,
      purchasedThisWeek: purchased,
      remaining,
      techBonus,
      canPurchase,
      blockReason,
    };
  }

  static getShopViews(save: RealmSaveDataV3): CovShopItemView[] {
    CovShopSystem.ensureCurrentWeek(save);
    return COVENANT_SHOP_ITEMS.map((item) => CovShopSystem.getItemView(save, item));
  }

  static purchaseItem(save: RealmSaveDataV3, itemId: string): CovShopPurchaseResult {
    const definition = getCovShopItemDefinition(itemId);
    if (!definition) {
      return { success: false, reason: 'Item not found' };
    }

    const view = CovShopSystem.getItemView(save, definition);
    if (!view.canPurchase) {
      return { success: false, reason: view.blockReason ?? 'Cannot purchase' };
    }

    const spend = EconomySystem.spendCurrency(
      save,
      'covenant_coin',
      definition.cost,
      'covenant_shop',
    );
    if (!spend.success) {
      return { success: false, reason: spend.reason ?? 'Insufficient Sect Coins' };
    }

    const bundle = buildRewardBundle(save, definition);
    const grant = RewardSystem.grantRewardBundle(save, bundle);
    if (!grant.success) {
      EconomySystem.grantCurrency(save, 'covenant_coin', definition.cost, 'dev_grant');
      return { success: false, reason: grant.errors?.join(', ') ?? 'Reward grant failed' };
    }

    const shopState = save.covenantState.shopState;
    shopState.purchasedItemCounts = {
      ...shopState.purchasedItemCounts,
      [itemId]: (shopState.purchasedItemCounts[itemId] ?? 0) + 1,
    };

    return { success: true };
  }
}

export function resetWeekly(save: RealmSaveDataV3, weekKey: string): void {
  CovShopSystem.resetWeekly(save, weekKey);
}
