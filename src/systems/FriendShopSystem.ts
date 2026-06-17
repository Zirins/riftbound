// src/systems/FriendShopSystem.ts
// Weekly-capped Friend Shop purchases (Section 28.3).

import {
  FRIEND_SHOP_ITEMS,
  getFriendShopItemDefinition,
  type FriendShopItemDefinition,
  type FriendShopItemId,
} from '../data/friendShop';
import { HEROES_DATA } from '../data/heroes';
import { RANDOM_SHARD_HERO_GRADE } from '../utils/heroRarityUtils';
import { getLocalWeekKey } from '../save/utils/saveDateUtils';
import type { RealmSaveDataV3, RewardBundle } from '../types';
import { EconomySystem } from './EconomySystem';
import { RewardSystem } from './RewardSystem';

export interface FriendShopPurchaseResult {
  success: boolean;
  reason?: string;
}

export interface FriendShopItemView {
  id: FriendShopItemId;
  name: string;
  description: string;
  cost: number;
  weeklyLimit: number;
  purchasedThisWeek: number;
  remaining: number;
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

function buildRewardBundle(save: RealmSaveDataV3, item: FriendShopItemDefinition): RewardBundle {
  switch (item.id) {
    case 'friend_shop_xp_fragments':
      return {
        source: 'friend_shop',
        items: [{ itemId: 'xp_fragment', quantity: 5 }],
      };
    case 'friend_shop_sigil_dust':
      return {
        source: 'friend_shop',
        items: [{ itemId: 'sigil_dust', quantity: 10 }],
      };
    case 'friend_shop_rare_shards':
      return {
        source: 'friend_shop',
        heroShards: [{ heroId: pickRandomRareHeroId(save), quantity: 2 }],
      };
    default:
      return { source: 'friend_shop' };
  }
}

export class FriendShopSystem {
  static ensureCurrentWeek(save: RealmSaveDataV3, now = new Date()): void {
    const weekKey = getLocalWeekKey(now);
    if (save.friendState.lastShopResetWeekKey !== weekKey) {
      FriendShopSystem.resetWeekly(save, weekKey);
    }
  }

  /** Unconditional weekly reset — always clears purchase counts (Phase 22 pattern). */
  static resetWeekly(save: RealmSaveDataV3, weekKey: string): void {
    const purchasedBefore = { ...save.friendState.shopPurchasesThisWeek };
    const previousWeekKey = save.friendState.lastShopResetWeekKey;

    save.friendState.shopPurchasesThisWeek = {};
    save.friendState.lastShopResetWeekKey = weekKey;

    if (import.meta.env.DEV) {
      console.info('[FriendShopSystem] resetWeekly', {
        previousWeekKey,
        weekKey,
        purchasedBefore,
        purchasedAfter: save.friendState.shopPurchasesThisWeek,
      });
    }
  }

  static getPurchasedCount(save: RealmSaveDataV3, itemId: string): number {
    FriendShopSystem.ensureCurrentWeek(save);
    return save.friendState.shopPurchasesThisWeek[itemId] ?? 0;
  }

  static getItemView(save: RealmSaveDataV3, item: FriendShopItemDefinition): FriendShopItemView {
    const purchased = FriendShopSystem.getPurchasedCount(save, item.id);
    const remaining = Math.max(0, item.weeklyLimit - purchased);

    let canPurchase = true;
    let blockReason: string | undefined;

    if (remaining <= 0) {
      canPurchase = false;
      blockReason = 'Weekly limit reached';
    } else if (EconomySystem.getCurrencyBalance(save, 'friendship_point') < item.cost) {
      canPurchase = false;
      blockReason = `Need ${item.cost} Friendship Points`;
    }

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      cost: item.cost,
      weeklyLimit: item.weeklyLimit,
      purchasedThisWeek: purchased,
      remaining,
      canPurchase,
      blockReason,
    };
  }

  static getShopViews(save: RealmSaveDataV3): FriendShopItemView[] {
    FriendShopSystem.ensureCurrentWeek(save);
    return FRIEND_SHOP_ITEMS.map((item) => FriendShopSystem.getItemView(save, item));
  }

  static purchaseItem(save: RealmSaveDataV3, itemId: string): FriendShopPurchaseResult {
    const definition = getFriendShopItemDefinition(itemId);
    if (!definition) {
      return { success: false, reason: 'Item not found' };
    }

    const view = FriendShopSystem.getItemView(save, definition);
    if (!view.canPurchase) {
      return { success: false, reason: view.blockReason ?? 'Cannot purchase' };
    }

    const spend = EconomySystem.spendCurrency(
      save,
      'friendship_point',
      definition.cost,
      'friend_shop',
    );
    if (!spend.success) {
      return { success: false, reason: spend.reason ?? 'Insufficient Friendship Points' };
    }

    const bundle = buildRewardBundle(save, definition);
    const grant = RewardSystem.grantRewardBundle(save, bundle);
    if (!grant.success) {
      EconomySystem.grantCurrency(save, 'friendship_point', definition.cost, 'dev_grant');
      return { success: false, reason: grant.errors?.join(', ') ?? 'Reward grant failed' };
    }

    save.friendState.friendshipPoints = EconomySystem.getCurrencyBalance(save, 'friendship_point');
    save.friendState.shopPurchasesThisWeek = {
      ...save.friendState.shopPurchasesThisWeek,
      [itemId]: (save.friendState.shopPurchasesThisWeek[itemId] ?? 0) + 1,
    };

    return { success: true };
  }
}

export function resetWeekly(save: RealmSaveDataV3, weekKey: string): void {
  FriendShopSystem.resetWeekly(save, weekKey);
}
