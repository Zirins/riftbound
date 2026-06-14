// src/systems/SweepSystem.ts
// Sweep 1x/10x on 3-star cleared campaign stages (Section 20).

import { DAILY_TASKS } from '../data/tasks';
import type {
  RealmSaveDataV3,
  StageReward,
  SweepResult,
  SweepValidation,
} from '../types';
import { EconomySystem } from './EconomySystem';
import * as EnergySystem from './EnergySystem';
import { GameEventBus } from './GameEventBus';
import {
  buildSweepPerformance,
  computeStageReward,
  grantSweepReward,
} from './RewardSystem';
import { getStageData } from './StageLoader';
import { loadCurrentRealm, saveCurrentRealm } from './SaveSystem';

const RIFT_SEASON_CAMPAIGN_XP = 3;
const SWEEP_COUNTS = [1, 10] as const;
export type SweepCount = (typeof SWEEP_COUNTS)[number];

function isSweepCount(count: number): count is SweepCount {
  return count === 1 || count === 10;
}

function loadMutableSave(): RealmSaveDataV3 | null {
  const realm = loadCurrentRealm();
  return realm ? (realm as RealmSaveDataV3) : null;
}

function getClearedRecord(save: RealmSaveDataV3, stageId: string) {
  return save.clearedStages.find((record) => record.stageId === stageId);
}

function reportDailyTaskProgress(save: RealmSaveDataV3, taskId: string, increment: number): void {
  if (increment <= 0) return;

  const definition = DAILY_TASKS.find((task) => task.id === taskId);
  if (!definition) return;

  save.tasks = save.tasks.map((task) => {
    if (task.taskId !== taskId || task.claimed) return task;

    const currentProgress = task.currentProgress + increment;
    return {
      ...task,
      currentProgress,
      completed: currentProgress >= definition.requiredProgress,
    };
  });
}

function applyCampaignClearProgression(
  save: RealmSaveDataV3,
  stageId: string,
  swept: boolean,
): void {
  const record = getClearedRecord(save, stageId);
  const stars = record?.stars ?? 3;

  reportDailyTaskProgress(save, 'task_complete_stages', 1);
  save.riftSeasonState.currentXp += RIFT_SEASON_CAMPAIGN_XP;
  GameEventBus.emit(save, { type: 'stage_cleared', stageId, stars, swept });
}

function logEnergyCheckpoint(label: string, save: RealmSaveDataV3 | null): void {
  if (!import.meta.env.DEV || !save) return;
  console.info(`[SweepSystem] ${label}`, { energy: save.inventory.energy });
}

export class SweepSystem {
  static isSweepUnlocked(save: RealmSaveDataV3, stageId: string): boolean {
    return getClearedRecord(save, stageId)?.stars === 3;
  }

  static canSweep(save: RealmSaveDataV3, stageId: string, count: number): SweepValidation {
    const energyAvailable = save.inventory.energy;

    if (!isSweepCount(count)) {
      return {
        canSweep: false,
        reason: 'Sweep count must be 1 or 10',
        energyRequired: 0,
        energyAvailable,
      };
    }

    const stage = getStageData(stageId);
    if (!stage) {
      return {
        canSweep: false,
        reason: 'Stage not found',
        energyRequired: 0,
        energyAvailable,
      };
    }

    if (!SweepSystem.isSweepUnlocked(save, stageId)) {
      return {
        canSweep: false,
        reason: 'Requires 3-star clear',
        energyRequired: stage.energyCost * count,
        energyAvailable,
      };
    }

    const energyRequired = stage.energyCost * count;
    if (!EconomySystem.canAfford(save, [{ type: 'energy', amount: energyRequired }])) {
      return {
        canSweep: false,
        reason: `Not enough energy (need ${energyRequired}, have ${energyAvailable})`,
        energyRequired,
        energyAvailable,
      };
    }

    const performance = buildSweepPerformance(stageId);
    for (let i = 0; i < count; i += 1) {
      const reward = computeStageReward(stageId, performance, save.clearedStages);
      if (!reward) {
        return {
          canSweep: false,
          reason: 'Unable to compute sweep rewards',
          energyRequired,
          energyAvailable,
        };
      }
    }

    return {
      canSweep: true,
      energyRequired,
      energyAvailable,
    };
  }

  static sweep(_save: RealmSaveDataV3, stageId: string, count: 1 | 10): SweepResult {
    EnergySystem.computeRegen();

    const save = loadMutableSave();
    if (!save) {
      return {
        success: false,
        reason: 'No save loaded',
        sweepCount: 0,
        energySpent: 0,
        rewards: [],
      };
    }

    logEnergyCheckpoint('energy before sweep', save);

    const validation = SweepSystem.canSweep(save, stageId, count);
    if (!validation.canSweep) {
      return {
        success: false,
        reason: validation.reason ?? 'Cannot sweep',
        sweepCount: 0,
        energySpent: 0,
        rewards: [],
      };
    }

    const stage = getStageData(stageId);
    if (!stage) {
      return {
        success: false,
        reason: 'Stage not found',
        sweepCount: 0,
        energySpent: 0,
        rewards: [],
      };
    }

    const energyRequired = stage.energyCost * count;
    const spendResult = EconomySystem.spendCurrency(save, 'energy', energyRequired, 'campaign_sweep');
    if (!spendResult.success) {
      return {
        success: false,
        reason: spendResult.reason ?? 'Not enough energy',
        sweepCount: 0,
        energySpent: 0,
        rewards: [],
      };
    }

    logEnergyCheckpoint('energy after spend (pre-save)', save);
    saveCurrentRealm(save);

    const persistedAfterSpend = loadMutableSave();
    logEnergyCheckpoint('energy after spend persisted', persistedAfterSpend);

    const performance = buildSweepPerformance(stageId);
    const grantedRewards: StageReward[] = [];

    for (let sweepIndex = 0; sweepIndex < count; sweepIndex += 1) {
      const reward = computeStageReward(stageId, performance, save.clearedStages);
      if (!reward) {
        EconomySystem.grantCurrency(save, 'energy', energyRequired, 'campaign_sweep');
        saveCurrentRealm(save);
        return {
          success: false,
          reason: 'Sweep failed while granting rewards — energy refunded',
          sweepCount: 0,
          energySpent: 0,
          rewards: [],
        };
      }

      const grantResult = grantSweepReward(save, reward);
      if (!grantResult.success) {
        EconomySystem.grantCurrency(save, 'energy', energyRequired, 'campaign_sweep');
        saveCurrentRealm(save);
        return {
          success: false,
          reason: grantResult.errors?.join(', ') ?? 'Reward grant failed — energy refunded',
          sweepCount: 0,
          energySpent: 0,
          rewards: [],
        };
      }

      grantedRewards.push(reward);
      applyCampaignClearProgression(save, stageId, true);
    }

    saveCurrentRealm(save);
    logEnergyCheckpoint('energy after full sweep persisted', loadMutableSave());

    return {
      success: true,
      sweepCount: count,
      energySpent: energyRequired,
      rewards: grantedRewards,
    };
  }
}
