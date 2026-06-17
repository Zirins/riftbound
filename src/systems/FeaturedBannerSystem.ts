// src/systems/FeaturedBannerSystem.ts
// Featured banner pulls — separate pity, 50/50, 14-day rotation (Section 31).

import { DISSOLVE_SHARDS, FEATURED_BANNER, GACHA } from '../constants/gameConfig';
import {
  buildFeaturedHeroPool,
  FEATURED_BANNER_ROTATION,
  getFeaturedBannerDefinition,
  getFeaturedBannerIndex,
  getAPlusPoolHeroIds,
  pickHeroFromFeaturedPool,
} from '../data/banners';
import { HEROES_DATA } from '../data/heroes';
import { createDefaultFeaturedBannerState } from '../save/defaults/createDefaultFeaturedBannerState';
import {
  getLocalDateKey,
  getSeasonDay,
  isSeasonExpired,
  parseLocalDateKey,
} from '../save/utils/saveDateUtils';
import type { HeroRarity, RealmSaveDataV3, SummonResult } from '../types';
import {
  HERO_RARITY_RANK,
  isTenPullGuaranteeTier,
} from '../utils/heroRarityUtils';
import { EconomySystem } from './EconomySystem';
import { GameEventBus } from './GameEventBus';
import { reportProgress } from './TaskSystem';

const RARITY_RANK = HERO_RARITY_RANK;

function pickNonFeaturedAPlus(featuredHeroId: string): string {
  const topTier = getAPlusPoolHeroIds().filter((id) => id !== featuredHeroId);
  if (topTier.length === 0) return featuredHeroId;
  return topTier[Math.floor(Math.random() * topTier.length)];
}
function ensureFeaturedBannerState(save: RealmSaveDataV3): void {
  if (!save.featuredBannerState) {
    save.featuredBannerState = createDefaultFeaturedBannerState();
  }
}

function getCurrentBannerDefinition(save: RealmSaveDataV3) {
  return getFeaturedBannerDefinition(save.featuredBannerState.currentBannerId)
    ?? FEATURED_BANNER_ROTATION[0];
}

function startBannerRotationEntry(
  save: RealmSaveDataV3,
  bannerId: string,
  now = Date.now(),
): void {
  const definition = getFeaturedBannerDefinition(bannerId) ?? FEATURED_BANNER_ROTATION[0];
  const bannerStartDate = getLocalDateKey(new Date(now));
  const endDate = parseLocalDateKey(bannerStartDate);
  endDate.setDate(endDate.getDate() + FEATURED_BANNER.DURATION_DAYS);

  save.featuredBannerState.currentBannerId = definition.id;
  save.featuredBannerState.bannerStartDate = bannerStartDate;
  save.featuredBannerState.bannerEndDate = getLocalDateKey(endDate);
  save.featuredBannerState.totalPullsOnCurrentBanner = 0;
}

export type LegendaryResolvePath = 'guarantee' | 'fifty_fifty_win' | 'fifty_fifty_loss';

function resolveLegendaryHero(
  save: RealmSaveDataV3,
  featuredHeroId: string,
): { heroId: string; path: LegendaryResolvePath } {
  if (save.featuredBannerState.guaranteedFeatured) {
    save.featuredBannerState.guaranteedFeatured = false;
    return { heroId: featuredHeroId, path: 'guarantee' };
  }

  if (Math.random() < 0.5) {
    save.featuredBannerState.guaranteedFeatured = false;
    return { heroId: featuredHeroId, path: 'fifty_fifty_win' };
  }

  save.featuredBannerState.guaranteedFeatured = true;
  return {
    heroId: pickNonFeaturedAPlus(featuredHeroId),
    path: 'fifty_fifty_loss',
  };
}

function computeFeaturedRarity(pityCount: number, forceMinRarity?: HeroRarity): HeroRarity {
  if (pityCount >= FEATURED_BANNER.HARD_PITY - 1) {
    return 'a_plus';
  }

  let bRate: number = GACHA.UNCOMMON_RATE;
  let aRate: number = GACHA.RARE_RATE;
  let topRate: number = GACHA.EPIC_RATE + GACHA.LEGENDARY_RATE;

  if (pityCount >= FEATURED_BANNER.SOFT_PITY_START) {
    const boost = (pityCount - FEATURED_BANNER.SOFT_PITY_START + 1) * GACHA.SOFT_PITY_EPIC_BOOST;
    topRate += boost;
    bRate = Math.max(0, bRate - boost);
  }

  const roll = Math.random();
  let rarity: HeroRarity;
  if (roll < bRate) rarity = 'b';
  else if (roll < bRate + aRate) rarity = 'a';
  else if (roll < bRate + aRate + GACHA.EPIC_RATE + GACHA.LEGENDARY_RATE) rarity = 'a_plus';
  else rarity = 's';

  if (forceMinRarity && RARITY_RANK[rarity] < RARITY_RANK[forceMinRarity]) {
    return forceMinRarity;
  }
  return rarity;
}

function applyPullOutcome(
  save: RealmSaveDataV3,
  heroId: string,
): { isNew: boolean; shardsGranted: number } {
  const heroData = HEROES_DATA.find((hero) => hero.id === heroId);
  const rarity = heroData?.rarity ?? 'a';
  const existingIndex = save.ownedHeroes.findIndex((hero) => hero.heroId === heroId);
  const alreadyOwned = existingIndex >= 0 && save.ownedHeroes[existingIndex].isOwned;

  if (alreadyOwned) {
    const shardsGranted = DISSOLVE_SHARDS[rarity];
    const heroShards = { ...save.inventory.heroShards };
    heroShards[heroId] = (heroShards[heroId] ?? 0) + shardsGranted;
    save.inventory = { ...save.inventory, heroShards };
    return { isNew: false, shardsGranted };
  }

  if (existingIndex >= 0) {
    save.ownedHeroes[existingIndex] = { ...save.ownedHeroes[existingIndex], isOwned: true };
  } else {
    save.ownedHeroes.push({
      heroId,
      isOwned: true,
      starRank: 1,
      level: 1,
      currentXP: 0,
      shardCount: 0,
      equippedSigilIds: [],
      acquiredAt: Date.now(),
    });
  }

  GameEventBus.emit(save, {
    type: 'hero_summoned',
    heroId,
    rarity,
    duplicate: false,
  });

  return { isNew: true, shardsGranted: 0 };
}

export class FeaturedBannerSystem {
  static ensureState(save: RealmSaveDataV3, now = new Date()): void {
    ensureFeaturedBannerState(save);
    if (!getFeaturedBannerDefinition(save.featuredBannerState.currentBannerId)) {
      startBannerRotationEntry(save, FEATURED_BANNER_ROTATION[0].id, now.getTime());
    }
  }

  static rotateIfExpired(save: RealmSaveDataV3, now = new Date()): boolean {
    FeaturedBannerSystem.ensureState(save, now);

    if (!isSeasonExpired(save.featuredBannerState.bannerEndDate, now)) {
      return false;
    }

    const currentIndex = getFeaturedBannerIndex(save.featuredBannerState.currentBannerId);
    const nextIndex = currentIndex < 0
      ? 0
      : (currentIndex + 1) % FEATURED_BANNER_ROTATION.length;
    const nextBanner = FEATURED_BANNER_ROTATION[nextIndex];

    startBannerRotationEntry(save, nextBanner.id, now.getTime());

    if (import.meta.env.DEV) {
      console.info('[FeaturedBannerSystem] banner rotated', {
        bannerId: nextBanner.id,
        featuredHeroId: nextBanner.featuredHeroId,
        pityCounter: save.featuredBannerState.pityCounter,
        guaranteedFeatured: save.featuredBannerState.guaranteedFeatured,
      });
    }

    return true;
  }

  static getPityCount(save: RealmSaveDataV3): number {
    FeaturedBannerSystem.ensureState(save);
    return save.featuredBannerState.pityCounter;
  }

  static isGuaranteedFeatured(save: RealmSaveDataV3): boolean {
    FeaturedBannerSystem.ensureState(save);
    return save.featuredBannerState.guaranteedFeatured;
  }

  static getDaysRemaining(save: RealmSaveDataV3, now = new Date()): number {
    FeaturedBannerSystem.ensureState(save, now);
    const day = getSeasonDay(save.featuredBannerState.bannerStartDate, now);
    return Math.max(0, FEATURED_BANNER.DURATION_DAYS - day + 1);
  }

  static getCurrentBanner(save: RealmSaveDataV3) {
    FeaturedBannerSystem.ensureState(save);
    return getCurrentBannerDefinition(save);
  }

  static pull(save: RealmSaveDataV3, count: 1 | 10): SummonResult[] {
    FeaturedBannerSystem.ensureState(save);

    const cost = count === 10 ? GACHA.TEN_PULL_COST : GACHA.SINGLE_PULL_COST;
    const spend = EconomySystem.spendCurrency(save, 'rift_crystal', cost, 'featured_banner_pull');
    if (!spend.success) return [];

    const banner = getCurrentBannerDefinition(save);
    const pool = buildFeaturedHeroPool(banner.featuredHeroId);
    const results: SummonResult[] = [];

    for (let i = 0; i < count; i += 1) {
      let forceMinRarity: HeroRarity | undefined;
      if (count === 10 && i === 9 && GACHA.TEN_PULL_GUARANTEE) {
        const hasGradePlus = results.some((result) => isTenPullGuaranteeTier(result.rarity));
        if (!hasGradePlus) forceMinRarity = 'a';
      }

      const pityCount = save.featuredBannerState.pityCounter;
      const rarity = computeFeaturedRarity(pityCount, forceMinRarity);
      const legendaryResolve = rarity === 'a_plus' || rarity === 's'
        ? resolveLegendaryHero(save, banner.featuredHeroId)
        : null;
      const heroId = legendaryResolve?.heroId
        ?? pickHeroFromFeaturedPool(pool, rarity);

      const outcome = applyPullOutcome(save, heroId);
      save.featuredBannerState.pityCounter = (rarity === 'a_plus' || rarity === 's') ? 0 : pityCount + 1;
      save.featuredBannerState.totalPullsOnCurrentBanner += 1;

      results.push({
        heroId,
        rarity,
        isNew: outcome.isNew,
        shardsGranted: outcome.shardsGranted,
        ...(legendaryResolve ? { legendaryResolvePath: legendaryResolve.path } : {}),
      });
    }

    if (results.length > 0) {
      reportProgress('task_perform_summon', 1);
    }

    if (import.meta.env.DEV) {
      console.info('[FeaturedBannerSystem] pull', {
        count,
        pityAfter: save.featuredBannerState.pityCounter,
        guaranteedFeatured: save.featuredBannerState.guaranteedFeatured,
        results: results.map((r) => ({ heroId: r.heroId, rarity: r.rarity })),
      });
    }

    return results;
  }

  static devSetPity(save: RealmSaveDataV3, pity: number): void {
    FeaturedBannerSystem.ensureState(save);
    save.featuredBannerState.pityCounter = Math.max(0, Math.floor(pity));
  }

  static devSetGuaranteedFeatured(save: RealmSaveDataV3, guaranteed: boolean): void {
    FeaturedBannerSystem.ensureState(save);
    save.featuredBannerState.guaranteedFeatured = guaranteed;
  }
}
