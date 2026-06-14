// src/systems/RewardSystem.ts
// Stage reward computation and grant — all V2 rewards route through grantRewardBundle().

import { computeAccountLevel, DISSOLVE_SHARDS } from '../constants/gameConfig';
import { AWAKENING_CRYSTAL_ITEM_ID } from '../data/awakeningData';
import { HEROES_DATA } from '../data/heroes';
import { getAllSigilDefinitions } from '../data/sigils';
import type {
  BattlePerformance,
  ClearedStageRecord,
  EquipmentSigilRarity,
  GrantResult,
  RewardBundle,
  RewardPreview,
  RealmSaveDataV3,
  StageReward,
} from '../types';
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

function rollCampaignSigil(rarity: EquipmentSigilRarity): string | null {
  const pool = getAllSigilDefinitions().filter(
    (definition) => definition.rarity === rarity && definition.dropSources.includes('campaign'),
  );
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

export function computeStageReward(
  stageId: string,
  performance: BattlePerformance,
  clearedStages: ClearedStageRecord[] = loadCurrentRealm()?.clearedStages ?? [],
): StageReward | null {
  const stage = getStageData(stageId);
  if (!stage) return null;

  const isFirstClear = !clearedStages.some((record) => record.stageId === stageId);

  const shardGrants: { heroId: string; amount: number }[] = [];
  for (const drop of stage.rewards.shardDrops ?? []) {
    if (Math.random() < drop.chance) {
      const heroData = HEROES_DATA.find((hero) => hero.id === drop.heroId);
      const amount = heroData ? DISSOLVE_SHARDS[heroData.rarity] : 5;
      shardGrants.push({ heroId: drop.heroId, amount });
    }
  }

  const sigilGrants: { sigilDefinitionId: string; level: number }[] = [];
  if (stage.rewards.sigilDrop && Math.random() < stage.rewards.sigilDrop.chance) {
    const sigilId = rollCampaignSigil(stage.rewards.sigilDrop.rarity);
    if (sigilId) {
      sigilGrants.push({ sigilDefinitionId: sigilId, level: 1 });
    }
  }

  const firstClearItemGrants: { itemId: string; quantity: number }[] = [];
  if (isFirstClear) {
    for (const item of stage.rewards.firstClearItems ?? []) {
      firstClearItemGrants.push({ itemId: item.itemId, quantity: item.quantity });
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
    sigilGrants,
    firstClearItemGrants,
  };
}

export function grantReward(reward: StageReward): void {
  const realm = loadCurrentRealm();
  if (!realm) return;

  const save = realm as RealmSaveDataV3;
  const bundle: RewardBundle = {
    source: 'campaign_clear',
    currencies: [
      { type: 'gold', amount: reward.gold },
      { type: 'rift_crystal', amount: reward.crystals },
    ],
    heroShards: reward.shardGrants.map((grant) => ({
      heroId: grant.heroId,
      quantity: grant.amount,
    })),
    sigils: reward.sigilGrants.map((grant) => ({
      sigilDefinitionId: grant.sigilDefinitionId,
      level: grant.level,
    })),
    items: [
      ...reward.firstClearItemGrants.map((grant) => ({
        itemId: grant.itemId,
        quantity: grant.quantity,
      })),
      ...(reward.xpFragments > 0
        ? [{ itemId: 'xp_fragment', quantity: reward.xpFragments }]
        : []),
    ],
  };

  const grantResult = RewardSystem.grantRewardBundle(save, bundle);
  if (!grantResult.success) {
    console.warn('[RewardSystem] grant failed', grantResult.errors);
    return;
  }

  const now = Date.now();
  const existing = save.clearedStages.find((record) => record.stageId === reward.stageId);
  let clearedStages: ClearedStageRecord[];

  if (existing) {
    clearedStages = save.clearedStages.map((record) => (
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
      ...save.clearedStages,
      {
        stageId: reward.stageId,
        stars: reward.stars,
        bestClearTimeMs: reward.clearTimeMs,
        firstClearedAt: now,
      },
    ];
  }

  save.clearedStages = clearedStages;
  save.accountLevel = computeAccountLevel(clearedStages.length);
  saveCurrentRealm(save);

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

export { AWAKENING_CRYSTAL_ITEM_ID };
