// src/data/items.ts
// V2 inventory item definitions — pure configuration.

import type { InventoryItemType, RewardBundle } from '../types';

export type ItemCategory =
  | 'currency'
  | 'enhancement'
  | 'sigil'
  | 'material'
  | 'shard'
  | 'special';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  type: InventoryItemType;
  category: ItemCategory;
  rarity: ItemRarity;
  maxStack: number;
  consumable: boolean;
  iconPath: string;
  /** Nested rewards opened when a consumable box is used. */
  openRewards?: RewardBundle;
}

export const ITEMS: ItemDefinition[] = [
  {
    id: 'xp_fragment',
    name: 'XP Fragment',
    description: 'Resonant memory shards used to level up heroes.',
    type: 'xp_fragment',
    category: 'enhancement',
    rarity: 'common',
    maxStack: 99_999,
    consumable: false,
    iconPath: 'assets/items/xp_fragment.png',
  },
  {
    id: 'sigil_dust',
    name: 'Sigil Dust',
    description: 'Refined essence used to upgrade and breakthrough Sigils.',
    type: 'sigil_dust',
    category: 'enhancement',
    rarity: 'uncommon',
    maxStack: 99_999,
    consumable: false,
    iconPath: 'assets/items/sigil_dust.png',
  },
  {
    id: 'awakening_crystal',
    name: 'Awakening Crystal',
    description: 'Crystallized rift power that unlocks a hero\'s Awakening path.',
    type: 'awakening_crystal',
    category: 'enhancement',
    rarity: 'epic',
    maxStack: 999,
    consumable: false,
    iconPath: 'assets/items/awakening_crystal.png',
  },
  {
    id: 'hero_shard_voucher',
    name: 'Hero Shard Voucher',
    description: 'A sealed voucher redeemable for hero shards through the roster.',
    type: 'hero_shard',
    category: 'shard',
    rarity: 'rare',
    maxStack: 999,
    consumable: false,
    iconPath: 'assets/items/hero_shard_voucher.png',
  },
  {
    id: 'sigil_box_common',
    name: 'Common Sigil Cache',
    description: 'Opens to reveal a random Common equipment Sigil.',
    type: 'sigil_box',
    category: 'sigil',
    rarity: 'common',
    maxStack: 99,
    consumable: true,
    iconPath: 'assets/items/sigil_box_common.png',
    openRewards: {
      source: 'dev_grant',
      items: [{ itemId: 'sigil_dust', quantity: 5 }],
    },
  },
  {
    id: 'sigil_box_rare',
    name: 'Rare Sigil Cache',
    description: 'Opens to reveal a random Rare equipment Sigil.',
    type: 'sigil_box',
    category: 'sigil',
    rarity: 'rare',
    maxStack: 99,
    consumable: true,
    iconPath: 'assets/items/sigil_box_rare.png',
    openRewards: {
      source: 'dev_grant',
      items: [{ itemId: 'sigil_dust', quantity: 15 }],
    },
  },
  {
    id: 'sigil_box_epic',
    name: 'Epic Sigil Cache',
    description: 'Opens to reveal a random Epic equipment Sigil.',
    type: 'sigil_box',
    category: 'sigil',
    rarity: 'epic',
    maxStack: 99,
    consumable: true,
    iconPath: 'assets/items/sigil_box_epic.png',
    openRewards: {
      source: 'dev_grant',
      items: [{ itemId: 'sigil_dust', quantity: 30 }],
    },
  },
  {
    id: 'reward_box_daily',
    name: 'Daily Supply Cache',
    description: 'A compact cache of gold and XP Fragments.',
    type: 'reward_box',
    category: 'special',
    rarity: 'uncommon',
    maxStack: 99,
    consumable: true,
    iconPath: 'assets/items/reward_box_daily.png',
    openRewards: {
      source: 'dev_grant',
      currencies: [{ type: 'gold', amount: 1_000 }],
      items: [{ itemId: 'xp_fragment', quantity: 20 }],
    },
  },
  {
    id: 'reward_box_weekly',
    name: 'Weekly Resonance Cache',
    description: 'A larger cache of resources earned from weekly missions.',
    type: 'reward_box',
    category: 'special',
    rarity: 'rare',
    maxStack: 99,
    consumable: true,
    iconPath: 'assets/items/reward_box_weekly.png',
    openRewards: {
      source: 'dev_grant',
      currencies: [{ type: 'gold', amount: 5_000 }, { type: 'rift_crystal', amount: 30 }],
      items: [{ itemId: 'xp_fragment', quantity: 80 }],
    },
  },
  {
    id: 'covenant_badge',
    name: 'Covenant Badge',
    description: 'Proof of Covenant contribution used in weekly shop exchanges.',
    type: 'material',
    category: 'material',
    rarity: 'uncommon',
    maxStack: 999,
    consumable: false,
    iconPath: 'assets/items/covenant_badge.png',
  },
  {
    id: 'rift_season_emblem',
    name: 'Rift Season Emblem',
    description: 'A commemorative emblem from the current Rift Season.',
    type: 'event_item',
    category: 'special',
    rarity: 'rare',
    maxStack: 99,
    consumable: false,
    iconPath: 'assets/items/rift_season_emblem.png',
  },
  {
    id: 'void_trial_relic',
    name: 'Void Trial Relic',
    description: 'A relic shard earned from deep Void Trial floors.',
    type: 'material',
    category: 'material',
    rarity: 'epic',
    maxStack: 99,
    consumable: false,
    iconPath: 'assets/items/void_trial_relic.png',
  },
];

const ITEMS_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

export function getItemDefinition(itemId: string): ItemDefinition | undefined {
  return ITEMS_BY_ID.get(itemId);
}

export function isKnownItem(itemId: string): boolean {
  return ITEMS_BY_ID.has(itemId);
}

export function getItemsByCategory(category: ItemCategory): ItemDefinition[] {
  return ITEMS.filter((item) => item.category === category);
}

export function getItemsByType(type: InventoryItemType): ItemDefinition[] {
  return ITEMS.filter((item) => item.type === type);
}
