// src/systems/ShardSystem.ts
// Star rank upgrades and hero dissolve.

import { DISSOLVE_SHARDS, STAR_UPGRADE_COSTS } from '../constants/gameConfig';
import { HEROES_DATA } from '../data/heroes';
import type { FormationGrid, HeroOwnershipState, RealmSaveData } from '../types';
import { canAfford, deduct } from './EconomySystem';
import { loadCurrentRealm, saveCurrentRealm } from './SaveSystem';

export function getStarUpCost(starRank: number): { shards: number; gold: number } | null {
  const entry = STAR_UPGRADE_COSTS.find((cost) => cost.from === starRank);
  if (!entry) return null;
  return { shards: entry.shards, gold: entry.gold };
}

export function getTotalShards(
  realm: RealmSaveData,
  heroId: string,
  ownership: HeroOwnershipState,
): number {
  return ownership.shardCount + (realm.inventory.heroShards[heroId] ?? 0);
}

export function starUp(heroId: string): boolean {
  const realm = loadCurrentRealm();
  if (!realm) return false;

  const heroIndex = realm.ownedHeroes.findIndex(
    (hero) => hero.heroId === heroId && hero.isOwned,
  );
  if (heroIndex < 0) return false;

  const hero = realm.ownedHeroes[heroIndex];
  if (hero.starRank >= 5) return false;

  const cost = getStarUpCost(hero.starRank);
  if (!cost) return false;

  if (getTotalShards(realm, heroId, hero) < cost.shards || !canAfford('gold', cost.gold)) {
    return false;
  }

  if (!deduct('gold', cost.gold)) return false;

  const shardDeduction = deductShards(realm, heroId, hero, cost.shards);
  if (!shardDeduction) return false;

  const updatedHeroes = [...shardDeduction.realm.ownedHeroes];
  updatedHeroes[heroIndex] = {
    ...shardDeduction.ownership,
    starRank: hero.starRank + 1,
  };

  saveCurrentRealm({
    ...shardDeduction.realm,
    ownedHeroes: updatedHeroes,
  });
  return true;
}

export function dissolve(heroId: string): boolean {
  const realm = loadCurrentRealm();
  if (!realm) return false;

  const heroData = HEROES_DATA.find((hero) => hero.id === heroId);
  if (!heroData) return false;

  const heroIndex = realm.ownedHeroes.findIndex(
    (hero) => hero.heroId === heroId && hero.isOwned,
  );
  if (heroIndex < 0) return false;

  const shardYield = DISSOLVE_SHARDS[heroData.rarity];
  const currentInventoryShards = realm.inventory.heroShards[heroId] ?? 0;

  const updatedHeroes = [...realm.ownedHeroes];
  updatedHeroes[heroIndex] = { ...updatedHeroes[heroIndex], isOwned: false };

  saveCurrentRealm({
    ...realm,
    ownedHeroes: updatedHeroes,
    currentFormation: clearHeroFromFormation(realm.currentFormation, heroId),
    inventory: {
      ...realm.inventory,
      heroShards: {
        ...realm.inventory.heroShards,
        [heroId]: currentInventoryShards + shardYield,
      },
    },
  });
  return true;
}

function deductShards(
  realm: RealmSaveData,
  heroId: string,
  ownership: HeroOwnershipState,
  amount: number,
): { realm: RealmSaveData; ownership: HeroOwnershipState } | null {
  let remaining = amount;
  const heroShards = { ...realm.inventory.heroShards };
  const inventoryAmount = heroShards[heroId] ?? 0;

  const fromInventory = Math.min(inventoryAmount, remaining);
  remaining -= fromInventory;
  if (fromInventory > 0) {
    const nextAmount = inventoryAmount - fromInventory;
    if (nextAmount > 0) {
      heroShards[heroId] = nextAmount;
    } else {
      delete heroShards[heroId];
    }
  }

  let shardCount = ownership.shardCount;
  const fromOwnership = Math.min(shardCount, remaining);
  shardCount -= fromOwnership;
  remaining -= fromOwnership;

  if (remaining > 0) return null;

  const heroIndex = realm.ownedHeroes.findIndex((hero) => hero.heroId === heroId);
  const updatedHeroes = [...realm.ownedHeroes];
  if (heroIndex >= 0) {
    updatedHeroes[heroIndex] = { ...updatedHeroes[heroIndex], shardCount };
  }

  return {
    realm: {
      ...realm,
      ownedHeroes: updatedHeroes,
      inventory: {
        ...realm.inventory,
        heroShards,
      },
    },
    ownership: { ...ownership, shardCount },
  };
}

function clearHeroFromFormation(formation: FormationGrid, heroId: string): FormationGrid {
  return {
    slots: formation.slots.map((slot) => (
      slot.assignedHeroId === heroId
        ? { ...slot, assignedHeroId: null }
        : slot
    )),
  };
}
