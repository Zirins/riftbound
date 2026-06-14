// src/systems/rewardBundleGrant.ts
// Core reward application — shared by RewardSystem and InventorySystem.

import { EconomySystem } from './EconomySystem';
import { SigilSystem } from './SigilSystem';
import { addItemQuantity } from './inventoryWrite';
import type {
  GrantResult,
  HeroOwnershipState,
  RewardBundle,
  RealmSaveDataV3,
} from '../types';

export function applyRewardBundle(save: RealmSaveDataV3, bundle: RewardBundle): GrantResult {
  const errors: string[] = [];

  for (const currency of bundle.currencies ?? []) {
    if (currency.amount <= 0) continue;
    EconomySystem.grantCurrency(save, currency.type, currency.amount, bundle.source);
  }

  for (const item of bundle.items ?? []) {
    if (item.quantity <= 0) continue;
    addItemQuantity(save, item.itemId, item.quantity);
  }

  for (const shard of bundle.heroShards ?? []) {
    if (shard.quantity <= 0) continue;
    const heroShards = { ...save.inventory.heroShards };
    heroShards[shard.heroId] = (heroShards[shard.heroId] ?? 0) + shard.quantity;
    save.inventory = { ...save.inventory, heroShards };
  }

  for (const hero of bundle.heroes ?? []) {
    const owned = save.ownedHeroes.find((entry) => entry.heroId === hero.heroId);
    if (!owned?.isOwned) {
      save.ownedHeroes = [
        ...save.ownedHeroes.filter((entry) => entry.heroId !== hero.heroId),
        createOwnedHero(hero.heroId),
      ];
    } else if (hero.duplicateShardQuantity && hero.duplicateShardQuantity > 0) {
      const heroShards = { ...save.inventory.heroShards };
      heroShards[hero.heroId] = (heroShards[hero.heroId] ?? 0) + hero.duplicateShardQuantity;
      save.inventory = { ...save.inventory, heroShards };
    }
  }

  if (bundle.sigils && bundle.sigils.length > 0) {
    SigilSystem.grantSigilsFromRewards(save, bundle.sigils);
  }

  for (const attachment of bundle.mailAttachments ?? []) {
    const nested = applyRewardBundle(save, attachment);
    if (!nested.success && nested.errors) {
      errors.push(...nested.errors);
    }
  }

  return {
    success: errors.length === 0,
    grantedBundle: bundle,
    errors: errors.length > 0 ? errors : undefined,
  };
}

function createOwnedHero(heroId: string): HeroOwnershipState {
  return {
    heroId,
    isOwned: true,
    starRank: 1,
    level: 1,
    currentXP: 0,
    shardCount: 0,
    equippedSigilIds: [],
    acquiredAt: Date.now(),
  };
}
