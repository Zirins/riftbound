// src/data/banners.ts
// Gacha banner definitions — standard + featured rotation (Sections 31).

import { GACHA } from '../constants/gameConfig';
import { HEROES_DATA } from './heroes';
import type { BannerData, HeroRarity } from '../types';

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

/** Featured banner rotation — 14-day cycles, separate pity (Section 31). */
export interface FeaturedBannerDefinition {
  id: string;
  name: string;
  description: string;
  featuredHeroId: string;
}

export const FEATURED_BANNER_ROTATION: FeaturedBannerDefinition[] = [
  {
    id: 'featured_caira',
    name: 'Veil of Morning',
    description: 'Rate-up: Xi Wei — Radiant of the Morning Veil',
    featuredHeroId: 'caira_dawnveil',
  },
  {
    id: 'featured_marek',
    name: 'Gathering Squall',
    description: 'Rate-up: Cang Lei — Lord of the Gathering Squall',
    featuredHeroId: 'marek_stormreign',
  },
  {
    id: 'featured_veyra',
    name: 'Hollow Mirror',
    description: 'Rate-up: Huan Li — Sovereign of the Hollow Mirror',
    featuredHeroId: 'veyra_hollowglass',
  },
  {
    id: 'featured_thane',
    name: 'Ironbark Vigil',
    description: 'Rate-up: Yan Gen — Warden of the Ironbark',
    featuredHeroId: 'thane_ironroot',
  },
];

const FEATURED_BY_ID = new Map(FEATURED_BANNER_ROTATION.map((banner) => [banner.id, banner]));

export function getFeaturedBannerDefinition(bannerId: string): FeaturedBannerDefinition | undefined {
  return FEATURED_BY_ID.get(bannerId);
}

export function getFeaturedBannerIndex(bannerId: string): number {
  return FEATURED_BANNER_ROTATION.findIndex((banner) => banner.id === bannerId);
}

export function buildFeaturedHeroPool(featuredHeroId: string) {
  return HEROES_DATA.map((hero) => ({
    heroId: hero.id,
    rarity: hero.rarity,
    weight: hero.id === featuredHeroId ? 2 : 1,
    isFeatured: hero.id === featuredHeroId,
  }));
}

export function getLegendaryPoolHeroIds(): string[] {
  return HEROES_DATA.filter((hero) => hero.rarity === 'legendary').map((hero) => hero.id);
}

export function pickHeroFromFeaturedPool(
  pool: ReturnType<typeof buildFeaturedHeroPool>,
  rarity: HeroRarity,
): string {
  const entries = pool.filter((entry) => entry.rarity === rarity);
  if (entries.length === 0) {
    return HEROES_DATA.find((hero) => hero.rarity === rarity)?.id ?? HEROES_DATA[0].id;
  }

  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.heroId;
  }
  return entries[entries.length - 1].heroId;
}
