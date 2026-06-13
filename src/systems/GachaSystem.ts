// src/systems/GachaSystem.ts
// Standard banner pulls with full pity mechanics.

import { DISSOLVE_SHARDS, GACHA } from '../constants/gameConfig';
import { BANNERS, STANDARD_BANNER_ID } from '../data/banners';
import { HEROES_DATA } from '../data/heroes';
import type { BannerData, HeroRarity, RealmSaveData, SummonResult } from '../types';
import { canAfford, deduct } from './EconomySystem';
import { loadCurrentRealm, saveCurrentRealm } from './SaveSystem';
import { reportProgress } from './TaskSystem';

const RARITY_RANK: Record<HeroRarity, number> = {
  uncommon: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getBanner(bannerId: string): BannerData | undefined {
  return BANNERS.find((banner) => banner.id === bannerId);
}

export function isFreeClaimAvailable(): boolean {
  const realm = loadCurrentRealm();
  if (!realm) return false;
  return realm.lastFreeSummonDate !== todayString();
}

export function claimFreePull(): SummonResult[] {
  if (!isFreeClaimAvailable()) return [];

  const results = executePulls(STANDARD_BANNER_ID, 1);
  if (results.length === 0) return [];

  const realm = loadCurrentRealm();
  if (!realm) return [];

  saveCurrentRealm({ ...realm, lastFreeSummonDate: todayString() });
  reportProgress('task_perform_summon', 1);
  return results;
}

export function pull(bannerId: string, count: 1 | 10): SummonResult[] {
  const banner = getBanner(bannerId);
  if (!banner) return [];

  const cost = count === 10 ? GACHA.TEN_PULL_COST : GACHA.SINGLE_PULL_COST;
  if (!canAfford('crystals', cost) || !deduct('crystals', cost)) return [];

  const results = executePulls(bannerId, count);
  if (results.length > 0) {
    reportProgress('task_perform_summon', 1);
  }
  return results;
}

function executePulls(bannerId: string, count: 1 | 10): SummonResult[] {
  const banner = getBanner(bannerId);
  if (!banner) return [];

  let realm = loadCurrentRealm();
  if (!realm) return [];

  const results: SummonResult[] = [];

  for (let i = 0; i < count; i += 1) {
    let forceMinRarity: HeroRarity | undefined;
    if (count === 10 && i === 9 && GACHA.TEN_PULL_GUARANTEE) {
      const hasRarePlus = results.some((result) => result.rarity !== 'uncommon');
      if (!hasRarePlus) forceMinRarity = 'rare';
    }

    const pityCount: number = realm.pityCounters[bannerId] ?? 0;
    const rarity = computeRarity(pityCount, forceMinRarity);
    const heroId = pickHeroFromPool(banner, rarity);
    const outcome = applyPullOutcome(realm, heroId);

    const nextPity: number = rarity === 'legendary' ? 0 : pityCount + 1;
    realm = {
      ...realm,
      pityCounters: { ...realm.pityCounters, [bannerId]: nextPity },
    };

    results.push({
      heroId,
      rarity,
      isNew: outcome.isNew,
      shardsGranted: outcome.shardsGranted,
    });
  }

  saveCurrentRealm(realm);
  return results;
}

function computeRarity(pityCount: number, forceMinRarity?: HeroRarity): HeroRarity {
  if (pityCount >= GACHA.LEGENDARY_PITY) return 'legendary';

  if (pityCount >= GACHA.HARD_PITY) {
    let epic = GACHA.EPIC_RATE;
    let legendary = GACHA.LEGENDARY_RATE;
    if (pityCount >= GACHA.SOFT_PITY_START) {
      const boost = (pityCount - GACHA.SOFT_PITY_START + 1) * GACHA.SOFT_PITY_EPIC_BOOST;
      epic += boost;
    }
    const total = epic + legendary;
    return Math.random() < legendary / total ? 'legendary' : 'epic';
  }

  let uncommon: number = GACHA.UNCOMMON_RATE;
  let rare: number = GACHA.RARE_RATE;
  let epic: number = GACHA.EPIC_RATE;

  if (pityCount >= GACHA.SOFT_PITY_START) {
    const boost = (pityCount - GACHA.SOFT_PITY_START + 1) * GACHA.SOFT_PITY_EPIC_BOOST;
    epic += boost;
    uncommon = Math.max(0, uncommon - boost);
  }

  const roll = Math.random();
  let rarity: HeroRarity;
  if (roll < uncommon) rarity = 'uncommon';
  else if (roll < uncommon + rare) rarity = 'rare';
  else if (roll < uncommon + rare + epic) rarity = 'epic';
  else rarity = 'legendary';

  if (forceMinRarity && RARITY_RANK[rarity] < RARITY_RANK[forceMinRarity]) {
    return forceMinRarity;
  }
  return rarity;
}

function pickHeroFromPool(banner: BannerData, rarity: HeroRarity): string {
  const pool = banner.heroPool.filter((entry) => entry.rarity === rarity);
  if (pool.length === 0) {
    return HEROES_DATA.find((hero) => hero.rarity === rarity)?.id ?? HEROES_DATA[0].id;
  }

  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.heroId;
  }
  return pool[pool.length - 1].heroId;
}

function applyPullOutcome(
  realm: RealmSaveData,
  heroId: string,
): { isNew: boolean; shardsGranted: number } {
  const heroData = HEROES_DATA.find((hero) => hero.id === heroId);
  const rarity = heroData?.rarity ?? 'rare';
  const existingIndex = realm.ownedHeroes.findIndex((hero) => hero.heroId === heroId);
  const alreadyOwned = existingIndex >= 0 && realm.ownedHeroes[existingIndex].isOwned;

  if (alreadyOwned) {
    const shardsGranted = DISSOLVE_SHARDS[rarity];
    const heroShards = { ...realm.inventory.heroShards };
    heroShards[heroId] = (heroShards[heroId] ?? 0) + shardsGranted;
    realm.inventory = { ...realm.inventory, heroShards };
    return { isNew: false, shardsGranted };
  }

  const ownedHeroes = [...realm.ownedHeroes];
  if (existingIndex >= 0) {
    ownedHeroes[existingIndex] = { ...ownedHeroes[existingIndex], isOwned: true };
  } else {
    ownedHeroes.push({
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
  realm.ownedHeroes = ownedHeroes;
  return { isNew: true, shardsGranted: 0 };
}

export function getPityCount(bannerId: string): number {
  const realm = loadCurrentRealm();
  return realm?.pityCounters[bannerId] ?? 0;
}

export function getFreePullCountdownMs(): number {
  const now = new Date();
  const nextUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.max(0, nextUtcMidnight - now.getTime());
}
