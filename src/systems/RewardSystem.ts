// src/systems/RewardSystem.ts
// Stage reward computation and grant.

import { DISSOLVE_SHARDS } from '../constants/gameConfig';
import { HEROES_DATA } from '../data/heroes';
import type { BattlePerformance, ClearedStageRecord, StageReward } from '../types';
import * as Economy from './EconomySystem';
import { checkUnlocks } from './FeatureUnlockSystem';
import { getStageData } from './StageLoader';
import { loadCurrentRealm, saveCurrentRealm } from './SaveSystem';
import { reportProgress } from './TaskSystem';

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
  });

  reportProgress('task_complete_stages', 1);
  checkUnlocks();
}
