// src/systems/EnergySystem.ts
// Energy regeneration and spend/refund via EconomySystem.

import { ENERGY } from '../constants/gameConfig';
import * as Economy from './EconomySystem';
import { loadCurrentRealm, saveCurrentRealm } from './SaveSystem';

export function computeRegen(): void {
  const realm = loadCurrentRealm();
  if (!realm) return;

  const { inventory } = realm;
  const now = Date.now();
  const elapsedMs = now - inventory.lastEnergyRegenAt;
  const regenPerMs = ENERGY.REGEN_PER_MINUTE / 60_000;
  const gained = Math.floor(elapsedMs * regenPerMs);

  if (gained <= 0) return;

  const newEnergy = Math.min(ENERGY.MAX, inventory.energy + gained);
  const consumed = newEnergy - inventory.energy;
  const msConsumed = consumed / regenPerMs;

  saveCurrentRealm({
    ...realm,
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
