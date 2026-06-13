// src/save/defaults/createDefaultInventory.ts

import { ENERGY, STARTER } from '../../constants/gameConfig';
import type { PlayerInventoryV2, PlayerInventoryV3 } from '../../types';

export function createDefaultInventory(base?: Partial<PlayerInventoryV2>): PlayerInventoryV3 {
  const now = Date.now();
  return {
    gold: base?.gold ?? STARTER.GOLD,
    riftCrystals: base?.riftCrystals ?? STARTER.RIFT_CRYSTALS,
    voidGems: base?.voidGems ?? 0,
    xpFragments: base?.xpFragments ?? STARTER.XP_FRAGMENTS,
    energy: base?.energy ?? STARTER.ENERGY,
    maxEnergy: base?.maxEnergy ?? ENERGY.MAX,
    lastEnergyRegenAt: base?.lastEnergyRegenAt ?? now,
    ownedSigilIds: base?.ownedSigilIds ?? [],
    heroShards: base?.heroShards ?? {},
    itemQuantities: {},
    arenaCoins: 0,
    covenantCoins: 0,
    friendshipPoints: 0,
  };
}

/** Upgrades a V1.1 inventory to V3 without resetting existing balances. */
export function upgradeInventoryToV3(inventory: PlayerInventoryV2): PlayerInventoryV3 {
  const partial = inventory as Partial<PlayerInventoryV3>;
  return {
    ...inventory,
    itemQuantities: partial.itemQuantities ?? {},
    arenaCoins: partial.arenaCoins ?? 0,
    covenantCoins: partial.covenantCoins ?? 0,
    friendshipPoints: partial.friendshipPoints ?? 0,
  };
}
