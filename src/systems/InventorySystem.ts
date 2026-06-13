// src/systems/InventorySystem.ts
// Single write path for non-currency inventory items (Section 4.3).

import { getItemDefinition } from '../data/items';
import type {
  ItemCost,
  RealmSaveDataV3,
  RewardBundle,
  SpendResult,
  UseItemContext,
  UseItemResult,
} from '../types';
import {
  addItemQuantity,
  readItemQuantity,
  removeItemQuantity,
} from './inventoryWrite';
import { applyRewardBundle } from './rewardBundleGrant';

export class InventorySystem {
  static addItem(save: RealmSaveDataV3, itemId: string, quantity: number): void {
    addItemQuantity(save, itemId, quantity);
  }

  static removeItem(
    save: RealmSaveDataV3,
    itemId: string,
    quantity: number,
    reason: string,
  ): SpendResult {
    if (quantity <= 0) {
      return { success: quantity === 0 };
    }

    if (!removeItemQuantity(save, itemId, quantity)) {
      return { success: false, reason: `Insufficient ${itemId} (${reason})` };
    }

    return { success: true };
  }

  static getQuantity(save: RealmSaveDataV3, itemId: string): number {
    return readItemQuantity(save.inventory, itemId);
  }

  static hasItems(save: RealmSaveDataV3, costs: ItemCost[]): boolean {
    return costs.every((cost) => (
      cost.quantity <= 0 || InventorySystem.getQuantity(save, cost.itemId) >= cost.quantity
    ));
  }

  static useConsumable(
    save: RealmSaveDataV3,
    itemId: string,
    quantity: number,
    context?: UseItemContext,
  ): UseItemResult {
    if (quantity <= 0) {
      return { success: quantity === 0 };
    }

    const definition = getItemDefinition(itemId);
    if (!definition) {
      return { success: false, reason: `Unknown item: ${itemId}` };
    }

    if (!definition.consumable) {
      return { success: false, reason: `${definition.name} is not consumable` };
    }

    const removeResult = InventorySystem.removeItem(save, itemId, quantity, 'use_consumable');
    if (!removeResult.success) {
      return { success: false, reason: removeResult.reason };
    }

    if (!definition.openRewards) {
      return { success: true };
    }

    void context;

    const bundle = scaleOpenRewards(definition.openRewards, quantity);
    const grantResult = applyRewardBundle(save, bundle);
    if (!grantResult.success) {
      return {
        success: false,
        reason: grantResult.errors?.join('; ') ?? 'Failed to grant box contents',
      };
    }

    return { success: true, rewardsGranted: bundle };
  }
}

function scaleOpenRewards(template: RewardBundle, quantity: number): RewardBundle {
  if (quantity <= 1) return template;

  return {
    ...template,
    currencies: template.currencies?.map((entry) => ({
      ...entry,
      amount: entry.amount * quantity,
    })),
    items: template.items?.map((entry) => ({
      ...entry,
      quantity: entry.quantity * quantity,
    })),
    heroShards: template.heroShards?.map((entry) => ({
      ...entry,
      quantity: entry.quantity * quantity,
    })),
  };
}

/** @internal Sync legacy xpFragments into itemQuantities after load. */
export function syncLegacyItemFields(save: RealmSaveDataV3): void {
  const quantity = readItemQuantity(save.inventory, 'xp_fragment');
  save.inventory = {
    ...save.inventory,
    itemQuantities: { ...(save.inventory.itemQuantities ?? {}), xp_fragment: quantity },
    xpFragments: quantity,
  };
}
