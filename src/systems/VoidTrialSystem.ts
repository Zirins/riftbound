// src/systems/VoidTrialSystem.ts
// Void Trial daily attempts, floor progression, and milestone rewards (Section 21).

import { VOID_TRIAL } from '../constants/gameConfig';
import { AWAKENING_CRYSTAL_ITEM_ID } from '../data/awakeningData';
import {
  getVoidTrialFloor,
  isVoidTrialMilestoneFloor,
} from '../data/voidTrialFloors';
import type {
  RealmSaveDataV3,
  RewardBundle,
  VoidTrialAttemptResult,
  VoidTrialFloorResolveResult,
  VoidTrialWeeklyClaimResult,
} from '../types';
import { GameEventBus } from './GameEventBus';
import { RewardSystem } from './RewardSystem';
import { ResetService } from './ResetService';
import { resetVoidTrialDaily } from './resetHandlers';

const RIFT_SEASON_VOID_TRIAL_XP = 10;

function ensureVoidTrialState(save: RealmSaveDataV3): void {
  if (save.voidTrialState.weeklyMilestoneClaimed === undefined) {
    save.voidTrialState = {
      ...save.voidTrialState,
      weeklyMilestoneClaimed: false,
    };
  }
}

function syncDailyAttempts(save: RealmSaveDataV3, now = new Date()): void {
  ensureVoidTrialState(save);
  const dateKey = ResetService.getLocalDateKey(now);
  if (save.voidTrialState.lastAttemptResetDate !== dateKey) {
    resetVoidTrialDaily(save, dateKey);
  }
}

function buildFirstClearBundle(floorNumber: number): RewardBundle | null {
  if (!isVoidTrialMilestoneFloor(floorNumber)) return null;

  switch (floorNumber) {
    case 1:
      return {
        source: 'void_trial',
        currencies: [{ type: 'gold', amount: 2_000 }],
        items: [{ itemId: 'xp_fragment', quantity: 30 }],
      };
    case 5:
      return {
        source: 'void_trial',
        items: [{ itemId: 'sigil_dust', quantity: 50 }],
      };
    case 10:
      return {
        source: 'void_trial',
        items: [{ itemId: 'sigil_box_rare', quantity: 1 }],
      };
    case 15:
      return {
        source: 'void_trial',
        items: [{ itemId: AWAKENING_CRYSTAL_ITEM_ID, quantity: 2 }],
      };
    case 20:
      return {
        source: 'void_trial',
        currencies: [{ type: 'void_gem', amount: 50 }],
        items: [{ itemId: 'sigil_box_epic', quantity: 1 }],
      };
    default:
      return null;
  }
}

function buildWeeklyRewardBundle(highestFloor: number): RewardBundle {
  if (highestFloor >= 20) {
    return {
      source: 'void_trial',
      currencies: [{ type: 'gold', amount: 15_000 }, { type: 'void_gem', amount: 25 }],
      items: [{ itemId: AWAKENING_CRYSTAL_ITEM_ID, quantity: 2 }],
    };
  }
  if (highestFloor >= 15) {
    return {
      source: 'void_trial',
      currencies: [{ type: 'gold', amount: 10_000 }],
      items: [{ itemId: AWAKENING_CRYSTAL_ITEM_ID, quantity: 1 }],
    };
  }
  if (highestFloor >= 10) {
    return {
      source: 'void_trial',
      currencies: [
        { type: 'gold', amount: 8_000 },
        { type: 'rift_crystal', amount: 30 },
      ],
      items: [{ itemId: 'sigil_dust', quantity: 50 }],
    };
  }
  if (highestFloor >= 5) {
    return {
      source: 'void_trial',
      currencies: [{ type: 'gold', amount: 5_000 }],
      items: [{ itemId: 'sigil_dust', quantity: 30 }],
    };
  }
  return {
    source: 'void_trial',
    currencies: [{ type: 'gold', amount: 3_000 }],
  };
}

export class VoidTrialSystem {
  static syncResets(save: RealmSaveDataV3, now = new Date()): void {
    ResetService.runDueResets(save, now);
  }

  static getDailyAttempts(save: RealmSaveDataV3, now = new Date()): number {
    syncDailyAttempts(save, now);
    return Math.max(0, VOID_TRIAL.DAILY_ATTEMPTS - save.voidTrialState.attemptsUsedToday);
  }

  static canAttemptFloor(
    save: RealmSaveDataV3,
    floorNumber: number,
    now = new Date(),
  ): { canAttempt: boolean; reason?: string } {
    syncDailyAttempts(save, now);

    if (!Number.isInteger(floorNumber) || floorNumber < 1 || floorNumber > VOID_TRIAL.MAX_FLOOR) {
      return { canAttempt: false, reason: 'Invalid floor' };
    }

    if (!getVoidTrialFloor(floorNumber)) {
      return { canAttempt: false, reason: 'Floor not found' };
    }

    const { highestFloorCleared } = save.voidTrialState;
    if (floorNumber > highestFloorCleared + 1) {
      return { canAttempt: false, reason: 'Clear the previous floor first' };
    }

    if (VoidTrialSystem.getDailyAttempts(save, now) <= 0) {
      return { canAttempt: false, reason: 'No daily attempts remaining' };
    }

    return { canAttempt: true };
  }

  static attemptFloor(
    save: RealmSaveDataV3,
    floorNumber: number,
    now = new Date(),
  ): VoidTrialAttemptResult {
    const validation = VoidTrialSystem.canAttemptFloor(save, floorNumber, now);
    if (!validation.canAttempt) {
      return { success: false, reason: validation.reason };
    }

    save.voidTrialState = {
      ...save.voidTrialState,
      attemptsUsedToday: save.voidTrialState.attemptsUsedToday + 1,
    };

    return { success: true };
  }

  static resolveFloorResult(
    save: RealmSaveDataV3,
    floorNumber: number,
    won: boolean,
  ): VoidTrialFloorResolveResult {
    ensureVoidTrialState(save);

    const state = save.voidTrialState;
    let highestFloorCleared = state.highestFloorCleared;
    let firstClearGranted = false;
    let firstClearBundle: RewardBundle | undefined;

    if (won) {
      if (floorNumber > state.weeklyHighestFloor) {
        save.voidTrialState = {
          ...save.voidTrialState,
          weeklyHighestFloor: floorNumber,
        };
      }

      if (floorNumber > highestFloorCleared) {
        highestFloorCleared = floorNumber;
        save.voidTrialState = {
          ...save.voidTrialState,
          highestFloorCleared: floorNumber,
        };

        const bundle = buildFirstClearBundle(floorNumber);
        const alreadyClaimed = state.firstClearClaimedFloors.includes(floorNumber);
        if (bundle && !alreadyClaimed) {
          RewardSystem.grantRewardBundle(save, bundle);
          save.voidTrialState = {
            ...save.voidTrialState,
            firstClearClaimedFloors: [...save.voidTrialState.firstClearClaimedFloors, floorNumber],
          };
          firstClearGranted = true;
          firstClearBundle = bundle;
        }

        save.riftSeasonState.currentXp += RIFT_SEASON_VOID_TRIAL_XP;
        GameEventBus.emit(save, { type: 'void_trial_floor_cleared', floorNumber });
      }
    }

    return {
      won,
      highestFloorCleared,
      firstClearGranted,
      firstClearBundle,
    };
  }

  static canClaimWeeklyReward(save: RealmSaveDataV3): boolean {
    ensureVoidTrialState(save);
    const state = save.voidTrialState;
    return state.weeklyHighestFloor >= 1 && !state.weeklyMilestoneClaimed;
  }

  static claimWeeklyReward(save: RealmSaveDataV3): VoidTrialWeeklyClaimResult {
    ensureVoidTrialState(save);
    const state = save.voidTrialState;

    if (state.weeklyMilestoneClaimed) {
      return { success: false, reason: 'Weekly reward already claimed' };
    }

    if (state.weeklyHighestFloor < 1) {
      return { success: false, reason: 'Clear at least floor 1 this week' };
    }

    const bundle = buildWeeklyRewardBundle(state.weeklyHighestFloor);
    RewardSystem.grantRewardBundle(save, bundle);
    save.voidTrialState = {
      ...save.voidTrialState,
      weeklyMilestoneClaimed: true,
    };

    return { success: true, bundle };
  }

  static resetWeekly(save: RealmSaveDataV3, weekKey: string): void {
    ensureVoidTrialState(save);
    const state = save.voidTrialState;

    if (state.lastWeeklyRewardWeekKey === weekKey) return;

    if (state.weeklyHighestFloor > 0 && !state.weeklyMilestoneClaimed) {
      const bundle = buildWeeklyRewardBundle(state.weeklyHighestFloor);
      RewardSystem.grantRewardBundle(save, bundle);
    }

    save.voidTrialState = {
      ...state,
      weeklyHighestFloor: 0,
      weeklyMilestoneClaimed: false,
      lastWeeklyRewardWeekKey: weekKey,
    };
  }

  static getWeeklyRewardPreview(save: RealmSaveDataV3): RewardBundle {
    ensureVoidTrialState(save);
    const highestFloor = Math.max(1, save.voidTrialState.weeklyHighestFloor);
    return buildWeeklyRewardBundle(highestFloor);
  }
}
