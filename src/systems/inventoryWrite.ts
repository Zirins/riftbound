// src/systems/inventoryWrite.ts
// Low-level inventory quantity mutations — no RewardSystem dependency.

import { getItemDefinition, isKnownItem } from '../data/items';
import type { PlayerInventoryV3, RealmSaveDataV3 } from '../types';

function ensureItemQuantities(inventory: PlayerInventoryV3): Record<string, number> {
  return inventory.itemQuantities ?? {};
}

export function readItemQuantity(inventory: PlayerInventoryV3, itemId: string): number {
  const fromBag = ensureItemQuantities(inventory)[itemId] ?? 0;
  if (itemId === 'xp_fragment') {
    return Math.max(fromBag, inventory.xpFragments);
  }
  return fromBag;
}

export function writeItemQuantity(
  inventory: PlayerInventoryV3,
  itemId: string,
  quantity: number,
): PlayerInventoryV3 {
  const clamped = Math.max(0, quantity);
  const itemQuantities = { ...ensureItemQuantities(inventory), [itemId]: clamped };

  if (itemId === 'xp_fragment') {
    return { ...inventory, itemQuantities, xpFragments: clamped };
  }

  return { ...inventory, itemQuantities };
}

export function addItemQuantity(save: RealmSaveDataV3, itemId: string, quantity: number): void {
  if (quantity <= 0 || !isKnownItem(itemId)) return;

  const definition = getItemDefinition(itemId);
  if (!definition) return;

  const current = readItemQuantity(save.inventory, itemId);
  const next = Math.min(current + quantity, definition.maxStack);
  save.inventory = writeItemQuantity(save.inventory, itemId, next);
}

export function removeItemQuantity(
  save: RealmSaveDataV3,
  itemId: string,
  quantity: number,
): boolean {
  if (quantity <= 0) return quantity === 0;
  if (!isKnownItem(itemId)) return false;

  const current = readItemQuantity(save.inventory, itemId);
  if (current < quantity) return false;

  save.inventory = writeItemQuantity(save.inventory, itemId, current - quantity);
  return true;
}
