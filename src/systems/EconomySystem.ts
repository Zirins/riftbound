// src/systems/EconomySystem.ts
// All V1.1 currency mutations route through this system.

import { ENERGY } from '../constants/gameConfig';
import type { PlayerInventoryV2, RealmSaveData } from '../types';
import { loadCurrentRealm, saveCurrentRealm } from './SaveSystem';

export type CurrencyType = 'gold' | 'crystals' | 'xpFragments' | 'energy';

export interface CurrencyGrant {
  type: CurrencyType;
  amount: number;
}

export function canAfford(type: CurrencyType, amount: number): boolean {
  if (amount <= 0) return amount === 0;
  const realm = loadCurrentRealm();
  if (!realm) return false;
  return getBalance(realm.inventory, type) >= amount;
}

export function deduct(type: CurrencyType, amount: number): boolean {
  if (amount <= 0) return amount === 0;

  const realm = loadCurrentRealm();
  if (!realm) return false;

  const balance = getBalance(realm.inventory, type);
  if (balance < amount) return false;

  const updated = applyBalance(realm, type, balance - amount);
  saveCurrentRealm(updated);
  return true;
}

export function grant(type: CurrencyType, amount: number): void {
  if (amount <= 0) return;

  const realm = loadCurrentRealm();
  if (!realm) return;

  const balance = getBalance(realm.inventory, type);
  const updated = applyBalance(realm, type, balance + amount);
  saveCurrentRealm(updated);
}

export function grantMultiple(grants: CurrencyGrant[]): void {
  if (grants.length === 0) return;

  const realm = loadCurrentRealm();
  if (!realm) return;

  let inventory = realm.inventory;
  for (const { type, amount } of grants) {
    if (amount <= 0) continue;
    const balance = getBalance(inventory, type);
    inventory = setBalance(inventory, type, balance + amount);
  }

  saveCurrentRealm({ ...realm, inventory });
}

function applyBalance(
  realm: RealmSaveData,
  type: CurrencyType,
  newBalance: number,
): RealmSaveData {
  return {
    ...realm,
    inventory: setBalance(realm.inventory, type, newBalance),
  };
}

function getBalance(inventory: PlayerInventoryV2, type: CurrencyType): number {
  switch (type) {
    case 'gold':
      return inventory.gold;
    case 'crystals':
      return inventory.riftCrystals;
    case 'xpFragments':
      return inventory.xpFragments;
    case 'energy':
      return inventory.energy;
  }
}

function setBalance(
  inventory: PlayerInventoryV2,
  type: CurrencyType,
  value: number,
): PlayerInventoryV2 {
  switch (type) {
    case 'gold':
      return { ...inventory, gold: Math.max(0, value) };
    case 'crystals':
      return { ...inventory, riftCrystals: Math.max(0, value) };
    case 'xpFragments':
      return { ...inventory, xpFragments: Math.max(0, value) };
    case 'energy':
      return {
        ...inventory,
        energy: Math.min(Math.max(0, value), ENERGY.MAX),
      };
  }
}
