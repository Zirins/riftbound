// src/data/banners.ts
// Gacha banner definitions — pure configuration.

import { GACHA } from '../constants/gameConfig';
import { HEROES_DATA } from './heroes';
import type { BannerData } from '../types';

export const STANDARD_BANNER_ID = 'eternal_rift';

export const BANNERS: BannerData[] = [
  {
    id: STANDARD_BANNER_ID,
    name: 'Eternal Rift',
    description: 'The standard pool — all Relic Bearers available.',
    heroPool: HEROES_DATA.map((hero) => ({
      heroId: hero.id,
      rarity: hero.rarity,
      weight: 1,
      isFeatured: false,
    })),
    costPerPull: GACHA.SINGLE_PULL_COST,
    guaranteeAt: GACHA.LEGENDARY_PITY,
    softPityStart: GACHA.SOFT_PITY_START,
    isActive: true,
  },
];
