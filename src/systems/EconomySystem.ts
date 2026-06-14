// src/systems/EconomySystem.ts
// All currency mutations route through this system (Section 4.2).

import type {
  CurrencyCost,
  CurrencyType as V2CurrencyType,
  PlayerInventoryV3,
  RealmSaveDataV3,
  RewardSource,
  SpendReason,
  SpendResult,
} from '../types';
import {
  addItemQuantity,
  readItemQuantity,
  removeItemQuantity,
} from './inventoryWrite';
import { loadCurrentRealm, saveCurrentRealm } from './SaveSystem';

/** V1.1 currency keys used by tasks, shop, and hero progression. */
export type LegacyCurrencyType = 'gold' | 'crystals' | 'xpFragments' | 'energy';

/** V1.1 alias consumed by tasks.ts and shopItems.ts. */
export type CurrencyType = LegacyCurrencyType;

export interface CurrencyGrant {
  type: LegacyCurrencyType;
  amount: number;
}

function toV3Inventory(inventory: PlayerInventoryV3): PlayerInventoryV3 {
  return {
    ...inventory,
    itemQuantities: inventory.itemQuantities ?? {},
    arenaCoins: inventory.arenaCoins ?? 0,
    covenantCoins: inventory.covenantCoins ?? 0,
    friendshipPoints: inventory.friendshipPoints ?? 0,
  };
}

export class EconomySystem {
  static canAfford(save: RealmSaveDataV3, costs: CurrencyCost[]): boolean {
    return costs.every((cost) => (
      cost.amount <= 0 || EconomySystem.getCurrencyBalance(save, cost.type) >= cost.amount
    ));
  }

  static spendCurrency(
    save: RealmSaveDataV3,
    type: V2CurrencyType,
    amount: number,
    reason: SpendReason,
  ): SpendResult {
    return EconomySystem.spendCurrencies(save, [{ type, amount }], reason);
  }

  static spendCurrencies(
    save: RealmSaveDataV3,
    costs: CurrencyCost[],
    reason: SpendReason,
  ): SpendResult {
    const activeCosts = costs.filter((cost) => cost.amount > 0);
    if (activeCosts.length === 0) {
      return { success: true };
    }

    if (!EconomySystem.canAfford(save, activeCosts)) {
      return { success: false, reason: `Insufficient currency (${reason})` };
    }

    for (const cost of activeCosts) {
      const balance = EconomySystem.getCurrencyBalance(save, cost.type);
      EconomySystem.setCurrencyBalance(save, cost.type, balance - cost.amount);
    }

    if (import.meta.env.DEV) {
      console.info('[EconomySystem] spend', { costs: activeCosts, reason });
    }

    return { success: true };
  }

  static getCurrencyBalance(save: RealmSaveDataV3, type: V2CurrencyType): number {
    const inventory = toV3Inventory(save.inventory);
    switch (type) {
      case 'gold':
        return inventory.gold;
      case 'rift_crystal':
        return inventory.riftCrystals;
      case 'void_gem':
        return inventory.voidGems;
      case 'energy':
        return inventory.energy;
      case 'arena_coin':
        return inventory.arenaCoins;
      case 'covenant_coin':
        return inventory.covenantCoins;
      case 'friendship_point':
        return inventory.friendshipPoints;
    }
  }

  /** Internal grant path used by RewardSystem. */
  static grantCurrency(
    save: RealmSaveDataV3,
    type: V2CurrencyType,
    amount: number,
    source: RewardSource,
  ): void {
    if (amount <= 0) return;

    const balance = EconomySystem.getCurrencyBalance(save, type);
    EconomySystem.setCurrencyBalance(save, type, balance + amount);

    if (import.meta.env.DEV) {
      console.info('[EconomySystem] grant', { type, amount, source });
    }
  }

  private static setCurrencyBalance(
    save: RealmSaveDataV3,
    type: V2CurrencyType,
    value: number,
  ): void {
    const inventory = toV3Inventory(save.inventory);

    switch (type) {
      case 'gold':
        save.inventory = { ...inventory, gold: Math.max(0, value) };
        break;
      case 'rift_crystal':
        save.inventory = { ...inventory, riftCrystals: Math.max(0, value) };
        break;
      case 'void_gem':
        save.inventory = { ...inventory, voidGems: Math.max(0, value) };
        break;
      case 'energy': {
        const maxEnergy = inventory.maxEnergy;
        const clamped = Math.min(Math.max(0, value), maxEnergy);
        const now = Date.now();
        const spent = clamped < inventory.energy;
        const atCap = clamped >= maxEnergy;
        save.inventory = {
          ...inventory,
          energy: clamped,
          lastEnergyRegenAt: spent || atCap ? now : inventory.lastEnergyRegenAt,
        };
        break;
      }
      case 'arena_coin':
        save.inventory = { ...inventory, arenaCoins: Math.max(0, value) };
        break;
      case 'covenant_coin':
        save.inventory = { ...inventory, covenantCoins: Math.max(0, value) };
        break;
      case 'friendship_point':
        save.inventory = { ...inventory, friendshipPoints: Math.max(0, value) };
        break;
    }
  }
}

// ─── V1.1 convenience API (load/save current realm) ─────────────────────────

export function canAfford(type: LegacyCurrencyType, amount: number): boolean {
  if (amount <= 0) return amount === 0;
  const realm = loadCurrentRealm();
  if (!realm) return false;
  return getLegacyBalance(realm as RealmSaveDataV3, type) >= amount;
}

export function deduct(type: LegacyCurrencyType, amount: number): boolean {
  if (amount <= 0) return amount === 0;

  const realm = loadCurrentRealm();
  if (!realm) return false;

  const save = realm as RealmSaveDataV3;

  if (type === 'xpFragments') {
    if (!removeItemQuantity(save, 'xp_fragment', amount)) return false;
    saveCurrentRealm(save);
    return true;
  }

  const result = EconomySystem.spendCurrency(
    save,
    mapLegacyToV2Currency(type),
    amount,
    'legacy_deduct',
  );
  if (!result.success) return false;

  saveCurrentRealm(save);
  return true;
}

export function grant(type: LegacyCurrencyType, amount: number): void {
  if (amount <= 0) return;

  const realm = loadCurrentRealm();
  if (!realm) return;

  const save = realm as RealmSaveDataV3;

  if (type === 'xpFragments') {
    addItemQuantity(save, 'xp_fragment', amount);
    saveCurrentRealm(save);
    return;
  }

  EconomySystem.grantCurrency(save, mapLegacyToV2Currency(type), amount, 'dev_grant');
  saveCurrentRealm(save);
}

export function grantMultiple(grants: CurrencyGrant[]): void {
  if (grants.length === 0) return;

  const realm = loadCurrentRealm();
  if (!realm) return;

  const save = realm as RealmSaveDataV3;
  for (const { type, amount } of grants) {
    if (amount <= 0) continue;

    if (type === 'xpFragments') {
      addItemQuantity(save, 'xp_fragment', amount);
      continue;
    }

    EconomySystem.grantCurrency(save, mapLegacyToV2Currency(type), amount, 'dev_grant');
  }

  saveCurrentRealm(save);
}

function mapLegacyToV2Currency(type: Exclude<LegacyCurrencyType, 'xpFragments'>): V2CurrencyType {
  switch (type) {
    case 'gold':
      return 'gold';
    case 'crystals':
      return 'rift_crystal';
    case 'energy':
      return 'energy';
  }
}

function getLegacyBalance(save: RealmSaveDataV3, type: LegacyCurrencyType): number {
  switch (type) {
    case 'gold':
      return EconomySystem.getCurrencyBalance(save, 'gold');
    case 'crystals':
      return EconomySystem.getCurrencyBalance(save, 'rift_crystal');
    case 'xpFragments':
      return readItemQuantity(save.inventory, 'xp_fragment');
    case 'energy':
      return EconomySystem.getCurrencyBalance(save, 'energy');
  }
}
