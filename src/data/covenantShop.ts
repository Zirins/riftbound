// src/data/covenantShop.ts
// Sect shop inventory (Section 27.1).

export type CovShopItemId =
  | 'cov_shop_xp_fragments'
  | 'cov_shop_sigil_dust'
  | 'cov_shop_awakening_crystal'
  | 'cov_shop_rare_shard_box';

export interface CovShopItemDefinition {
  id: CovShopItemId;
  name: string;
  description: string;
  cost: number;
  weeklyLimit: number;
}

export const COVENANT_SHOP_ITEMS: CovShopItemDefinition[] = [
  {
    id: 'cov_shop_xp_fragments',
    name: 'XP Fragment ×10',
    description: '10 XP Fragments',
    cost: 20,
    weeklyLimit: 5,
  },
  {
    id: 'cov_shop_sigil_dust',
    name: 'Sigil Dust ×20',
    description: '20 Sigil Dust',
    cost: 40,
    weeklyLimit: 3,
  },
  {
    id: 'cov_shop_awakening_crystal',
    name: 'Awakening Crystal ×1',
    description: '1 Awakening Crystal',
    cost: 120,
    weeklyLimit: 1,
  },
  {
    id: 'cov_shop_rare_shard_box',
    name: 'Rare Hero Shard Box ×5',
    description: '5 random Rare hero shards',
    cost: 100,
    weeklyLimit: 2,
  },
];

const ITEMS_BY_ID = new Map(COVENANT_SHOP_ITEMS.map((item) => [item.id, item]));

export function getCovShopItemDefinition(itemId: string): CovShopItemDefinition | undefined {
  return ITEMS_BY_ID.get(itemId as CovShopItemId);
}
