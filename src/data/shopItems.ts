// src/data/shopItems.ts
// Celestial Market item pool — pure configuration.

export type ShopRewardType =
  | 'xpFragments'
  | 'gold'
  | 'crystals'
  | 'heroShards'
  | 'randomRareShards'
  | 'energy';

export interface ShopItemDefinition {
  id: string;
  name: string;
  rewardType: ShopRewardType;
  amount: number;
  heroId?: string;
  costType: 'gold' | 'crystals';
  costAmount: number;
}

export const SHOP_ITEMS: ShopItemDefinition[] = [
  {
    id: 'xp_frags_30',
    name: 'XP Fragments ×30',
    rewardType: 'xpFragments',
    amount: 30,
    costType: 'gold',
    costAmount: 800,
  },
  {
    id: 'xp_frags_80',
    name: 'XP Fragments ×80',
    rewardType: 'xpFragments',
    amount: 80,
    costType: 'crystals',
    costAmount: 50,
  },
  {
    id: 'gold_500',
    name: '500 Gold',
    rewardType: 'gold',
    amount: 500,
    costType: 'crystals',
    costAmount: 30,
  },
  {
    id: 'crystals_50',
    name: '50 Crystals',
    rewardType: 'crystals',
    amount: 50,
    costType: 'gold',
    costAmount: 3_000,
  },
  {
    id: 'kael_shards_5',
    name: 'Tie Shan Shards ×5',
    rewardType: 'heroShards',
    amount: 5,
    heroId: 'kael',
    costType: 'crystals',
    costAmount: 200,
  },
  {
    id: 'sura_shards_5',
    name: 'Chi Feng Shards ×5',
    rewardType: 'heroShards',
    amount: 5,
    heroId: 'sura',
    costType: 'crystals',
    costAmount: 200,
  },
  {
    id: 'mira_shards_5',
    name: 'Ling Yu Shards ×5',
    rewardType: 'heroShards',
    amount: 5,
    heroId: 'mira',
    costType: 'crystals',
    costAmount: 200,
  },
  {
    id: 'nyra_shards_5',
    name: 'Yu Han Shards ×5',
    rewardType: 'heroShards',
    amount: 5,
    heroId: 'nyra',
    costType: 'crystals',
    costAmount: 200,
  },
  {
    id: 'rare_shards_5',
    name: 'Rare Shards ×5',
    rewardType: 'randomRareShards',
    amount: 5,
    costType: 'crystals',
    costAmount: 150,
  },
  {
    id: 'energy_60',
    name: '60 Energy',
    rewardType: 'energy',
    amount: 60,
    costType: 'crystals',
    costAmount: 50,
  },
];
