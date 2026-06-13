// src/systems/ShopSystem.ts
// Daily Celestial Market stock, purchases, and reset.

import { SHOP_ITEMS, type ShopItemDefinition } from '../data/shopItems';
import { HEROES_DATA } from '../data/heroes';
import type { RealmSaveDataV3 } from '../types';
import { getLocalDateKey } from '../save/utils/saveDateUtils';
import * as Economy from './EconomySystem';
import { loadCurrentRealm, saveCurrentRealm } from './SaveSystem';

function createSeededRng(seed: string): () => number {
  let state = 0;
  for (let i = 0; i < seed.length; i += 1) {
    state = (Math.imul(31, state) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function resetDaily(save: RealmSaveDataV3, dateKey: string): void {
  if (save.dailyShopState.date === dateKey) return;

  save.dailyShopState = {
    date: dateKey,
    purchasedItemIds: [],
  };
}

export function resetIfNewDay(): void {
  const realm = loadCurrentRealm();
  if (!realm) return;

  const save = realm as RealmSaveDataV3;
  const dateKey = getLocalDateKey();
  if (save.dailyShopState.date === dateKey) return;

  resetDaily(save, dateKey);
  saveCurrentRealm(save);
}

export function getDailyStock(): ShopItemDefinition[] {
  const today = getLocalDateKey();
  const rng = createSeededRng(`shop-${today}`);
  const stockCount = 5 + Math.floor(rng() * 2);

  const indices = SHOP_ITEMS.map((_, index) => index);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.slice(0, stockCount).map((index) => SHOP_ITEMS[index]);
}

export function isPurchased(itemId: string): boolean {
  const realm = loadCurrentRealm();
  return realm?.dailyShopState.purchasedItemIds.includes(itemId) ?? false;
}

export function purchase(itemId: string): boolean {
  const item = SHOP_ITEMS.find((entry) => entry.id === itemId);
  if (!item) return false;

  const realm = loadCurrentRealm();
  if (!realm || isPurchased(itemId)) return false;

  if (!Economy.canAfford(item.costType, item.costAmount)
    || !Economy.deduct(item.costType, item.costAmount)) {
    return false;
  }

  grantItemReward(item);

  const currentRealm = loadCurrentRealm();
  if (!currentRealm) return false;

  saveCurrentRealm({
    ...currentRealm,
    dailyShopState: {
      ...currentRealm.dailyShopState,
      purchasedItemIds: [...currentRealm.dailyShopState.purchasedItemIds, itemId],
    },
  });
  return true;
}

function grantItemReward(item: ShopItemDefinition): void {
  switch (item.rewardType) {
    case 'xpFragments':
    case 'gold':
    case 'crystals':
    case 'energy':
      Economy.grant(item.rewardType, item.amount);
      break;
    case 'heroShards':
      if (item.heroId) grantHeroShards(item.heroId, item.amount);
      break;
    case 'randomRareShards':
      grantRandomRareShards(item.amount);
      break;
  }
}

function grantHeroShards(heroId: string, amount: number): void {
  const realm = loadCurrentRealm();
  if (!realm) return;

  const current = realm.inventory.heroShards[heroId] ?? 0;
  saveCurrentRealm({
    ...realm,
    inventory: {
      ...realm.inventory,
      heroShards: {
        ...realm.inventory.heroShards,
        [heroId]: current + amount,
      },
    },
  });
}

function grantRandomRareShards(amount: number): void {
  const realm = loadCurrentRealm();
  if (!realm) return;

  const ownedRareIds = realm.ownedHeroes
    .filter((hero) => hero.isOwned)
    .map((hero) => hero.heroId)
    .filter((heroId) => HEROES_DATA.find((h) => h.id === heroId)?.rarity === 'rare');

  const heroId = ownedRareIds[0] ?? 'kael';
  grantHeroShards(heroId, amount);
}

export function getRefreshCountdownMs(): number {
  const now = new Date();
  const nextUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.max(0, nextUtcMidnight - now.getTime());
}

export function formatCost(item: ShopItemDefinition): string {
  return item.costType === 'gold'
    ? `${item.costAmount} Gold`
    : `${item.costAmount} 💎`;
}
