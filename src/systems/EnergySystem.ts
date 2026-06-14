// src/systems/EnergySystem.ts
// Energy regeneration and spend/refund via EconomySystem.

import { ENERGY } from '../constants/gameConfig';
import type { PlayerInventoryV3, RealmSaveDataV3 } from '../types';
import * as Economy from './EconomySystem';
import { loadCurrentRealm, saveCurrentRealm } from './SaveSystem';

function getMaxEnergy(inventory: PlayerInventoryV3): number {
  return inventory.maxEnergy ?? ENERGY.MAX;
}

export function computeRegen(): void {
  const realm = loadCurrentRealm();
  if (!realm) return;

  const save = realm as RealmSaveDataV3;
  const { inventory } = save;
  const now = Date.now();
  const maxEnergy = getMaxEnergy(inventory);

  if (inventory.energy >= maxEnergy) {
    saveCurrentRealm({
      ...save,
      inventory: { ...inventory, lastEnergyRegenAt: now },
    });
    return;
  }

  const elapsedMs = now - inventory.lastEnergyRegenAt;
  const regenPerMs = ENERGY.REGEN_PER_MINUTE / 60_000;
  const gained = Math.floor(elapsedMs * regenPerMs);

  if (gained <= 0) return;

  const newEnergy = Math.min(maxEnergy, inventory.energy + gained);
  const consumed = newEnergy - inventory.energy;
  const msConsumed = consumed / regenPerMs;

  saveCurrentRealm({
    ...save,
    inventory: {
      ...inventory,
      energy: newEnergy,
      lastEnergyRegenAt: inventory.lastEnergyRegenAt + msConsumed,
    },
  });
}

export function hasEnough(cost: number): boolean {
  return Economy.canAfford('energy', cost);
}

export function deduct(cost: number): boolean {
  return Economy.deduct('energy', cost);
}

export function refund(amount: number): void {
  Economy.grant('energy', amount);
}
