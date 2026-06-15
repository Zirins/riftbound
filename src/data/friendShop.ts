// src/data/friendShop.ts
// Friend Shop inventory (Section 28.3).

export type FriendShopItemId =
  | 'friend_shop_xp_fragments'
  | 'friend_shop_sigil_dust'
  | 'friend_shop_rare_shards';

export interface FriendShopItemDefinition {
  id: FriendShopItemId;
  name: string;
  description: string;
  cost: number;
  weeklyLimit: number;
}

export const FRIEND_SHOP_ITEMS: FriendShopItemDefinition[] = [
  {
    id: 'friend_shop_xp_fragments',
    name: 'XP Fragment ×5',
    description: '5 XP Fragments',
    cost: 10,
    weeklyLimit: 5,
  },
  {
    id: 'friend_shop_sigil_dust',
    name: 'Sigil Dust ×10',
    description: '10 Sigil Dust',
    cost: 25,
    weeklyLimit: 3,
  },
  {
    id: 'friend_shop_rare_shards',
    name: 'Random Rare Shard ×2',
    description: '2 random Rare hero shards',
    cost: 40,
    weeklyLimit: 2,
  },
];

const ITEMS_BY_ID = new Map(FRIEND_SHOP_ITEMS.map((item) => [item.id, item]));

export function getFriendShopItemDefinition(itemId: string): FriendShopItemDefinition | undefined {
  return ITEMS_BY_ID.get(itemId as FriendShopItemId);
}
