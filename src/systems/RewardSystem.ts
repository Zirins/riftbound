// src/systems/RewardSystem.ts
// Stage reward computation and grant — all V2 rewards route through grantRewardBundle().

import { computeAccountLevel, DISSOLVE_SHARDS } from '../constants/gameConfig';
import { HEROES_DATA } from '../data/heroes';
import type {
  BattlePerformance,
  ClearedStageRecord,
  GrantResult,
  RewardBundle,
  RewardPreview,
  RealmSaveDataV3,
  StageReward,
} from '../types';
import * as Economy from './EconomySystem';
import { checkUnlocks } from './FeatureUnlockSystem';
import { getStageData } from './StageLoader';
import { loadCurrentRealm, saveCurrentRealm } from './SaveSystem';
import { reportProgress } from './TaskSystem';
import { applyRewardBundle } from './rewardBundleGrant';

function computeStars(heroesThatDied: number): number {
  if (heroesThatDied === 0) return 3;
  if (heroesThatDied <= 2) return 2;
  return 1;
}

function rollGold(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function computeStageReward(stageId: string, performance: BattlePerformance): StageReward | null {
  const stage = getStageData(stageId);
  if (!stage) return null;

  const shardGrants: { heroId: string; amount: number }[] = [];
  for (const drop of stage.rewards.shardDrops ?? []) {
    if (Math.random() < drop.chance) {
      const heroData = HEROES_DATA.find((hero) => hero.id === drop.heroId);
      const amount = heroData ? DISSOLVE_SHARDS[heroData.rarity] : 5;
      shardGrants.push({ heroId: drop.heroId, amount });
    }
  }

  return {
    stageId,
    stars: computeStars(performance.heroesThatDied),
    gold: rollGold(stage.rewards.gold.min, stage.rewards.gold.max),
    crystals: stage.rewards.crystals,
    xpFragments: stage.rewards.xpFragments,
    clearTimeMs: performance.clearTimeMs,
    shardGrants,
  };
}

export function grantReward(reward: StageReward): void {
  const realm = loadCurrentRealm();
  if (!realm) return;

  Economy.grantMultiple([
    { type: 'gold', amount: reward.gold },
    { type: 'crystals', amount: reward.crystals },
    { type: 'xpFragments', amount: reward.xpFragments },
  ]);

  const currentRealm = loadCurrentRealm();
  if (!currentRealm) return;

  const heroShards = { ...currentRealm.inventory.heroShards };
  for (const grant of reward.shardGrants) {
    heroShards[grant.heroId] = (heroShards[grant.heroId] ?? 0) + grant.amount;
  }

  const now = Date.now();
  const existing = currentRealm.clearedStages.find((record) => record.stageId === reward.stageId);
  let clearedStages: ClearedStageRecord[];

  if (existing) {
    clearedStages = currentRealm.clearedStages.map((record) => (
      record.stageId === reward.stageId
        ? {
            ...record,
            stars: Math.max(record.stars, reward.stars),
            bestClearTimeMs: record.bestClearTimeMs === 0
              ? reward.clearTimeMs
              : Math.min(record.bestClearTimeMs, reward.clearTimeMs),
          }
        : record
    ));
  } else {
    clearedStages = [
      ...currentRealm.clearedStages,
      {
        stageId: reward.stageId,
        stars: reward.stars,
        bestClearTimeMs: reward.clearTimeMs,
        firstClearedAt: now,
      },
    ];
  }

  saveCurrentRealm({
    ...currentRealm,
    inventory: { ...currentRealm.inventory, heroShards },
    clearedStages,
    accountLevel: computeAccountLevel(clearedStages.length),
  });

  reportProgress('task_complete_stages', 1);
  checkUnlocks();
}

export class RewardSystem {
  static grantRewardBundle(save: RealmSaveDataV3, bundle: RewardBundle): GrantResult {
    if (import.meta.env.DEV) {
      console.info('[RewardSystem] grant', { source: bundle.source, bundle });
    }

    return applyRewardBundle(save, bundle);
  }

  static grantRewardBundles(save: RealmSaveDataV3, bundles: RewardBundle[]): GrantResult {
    const mergedErrors: string[] = [];
    const grantedBundle: RewardBundle = { source: bundles[0]?.source ?? 'dev_grant' };

    for (const bundle of bundles) {
      const result = RewardSystem.grantRewardBundle(save, bundle);
      if (!result.success && result.errors) {
        mergedErrors.push(...result.errors);
      }
    }

    return {
      success: mergedErrors.length === 0,
      grantedBundle,
      errors: mergedErrors.length > 0 ? mergedErrors : undefined,
    };
  }

  static previewRewardBundle(save: RealmSaveDataV3, bundle: RewardBundle): RewardPreview {
    const ownedHeroIds = new Set(
      save.ownedHeroes.filter((hero) => hero.isOwned).map((hero) => hero.heroId),
    );

    const wouldGrantNewHeroes = (bundle.heroes ?? [])
      .map((hero) => hero.heroId)
      .filter((heroId) => !ownedHeroIds.has(heroId));

    return {
      bundle,
      wouldGrantNewHeroes,
    };
  }
}

/** Convenience wrapper — loads current realm, grants bundle, persists save. */
export function grantRewardBundleToCurrentRealm(bundle: RewardBundle): GrantResult {
  const realm = loadCurrentRealm();
  if (!realm) {
    return { success: false, grantedBundle: bundle, errors: ['No active save'] };
  }

  const save = realm as RealmSaveDataV3;
  const result = RewardSystem.grantRewardBundle(save, bundle);
  if (result.success) {
    saveCurrentRealm(save);
  }

  return result;
}
