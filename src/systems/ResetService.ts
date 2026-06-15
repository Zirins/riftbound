// src/systems/ResetService.ts
// Centralized local date math and daily/weekly reset orchestration (Section 9).

import { createDefaultResetState } from '../save/defaults/createDefaultResetState';
import {
  getLocalDateKey,
  getLocalWeekKey,
  getSeasonDay,
  isSeasonExpired,
} from '../save/utils/saveDateUtils';
import type { RealmSaveDataV3, ResetResult } from '../types';
import { resetDaily as resetArenaDaily } from './ArenaMatchSystem';
import { resetDaily as resetShopDaily } from './ShopSystem';
import { resetDaily as resetTasksDaily } from './TaskSystem';
import { VoidTrialSystem } from './VoidTrialSystem';
import {
  resetCovenantBossWeekly,
  resetCovenantDailyContribution,
  resetFriendDailyGifts,
  resetPatronDailyGift,
  resetVoidTrialDaily,
  resetWeeklyTasks,
  rolloverArenaSeasonIfExpired,
  rolloverRiftSeasonIfExpired,
  rotateFeaturedBannerIfExpired,
} from './resetHandlers';

function ensureResetState(save: RealmSaveDataV3, now: Date): void {
  if (!save.resetState) {
    save.resetState = createDefaultResetState(now.getTime());
  }
}

export class ResetService {
  static getLocalDateKey(now = new Date()): string {
    return getLocalDateKey(now);
  }

  static getLocalWeekKey(now = new Date()): string {
    return getLocalWeekKey(now);
  }

  static hasDailyResetPassed(save: RealmSaveDataV3, now = new Date()): boolean {
    ensureResetState(save, now);
    return save.resetState.lastDailyResetDate !== getLocalDateKey(now);
  }

  static hasWeeklyResetPassed(save: RealmSaveDataV3, now = new Date()): boolean {
    ensureResetState(save, now);
    return save.resetState.lastWeeklyResetWeekKey !== getLocalWeekKey(now);
  }

  static getSeasonDay(seasonStartDate: string, now = new Date()): number {
    return getSeasonDay(seasonStartDate, now);
  }

  static isSeasonExpired(seasonEndDate: string, now = new Date()): boolean {
    return isSeasonExpired(seasonEndDate, now);
  }

  static runDueResets(save: RealmSaveDataV3, now = new Date()): ResetResult {
    ensureResetState(save, now);

    const dailyDateKey = getLocalDateKey(now);
    const weeklyWeekKey = getLocalWeekKey(now);
    const handlersRun: string[] = [];
    let dailyResetApplied = false;
    let weeklyResetApplied = false;

    if (ResetService.hasDailyResetPassed(save, now)) {
      dailyResetApplied = true;
      resetTasksDaily(save, dailyDateKey);
      handlersRun.push('TaskSystem.resetDaily');
      resetShopDaily(save, dailyDateKey);
      handlersRun.push('ShopSystem.resetDaily');
      resetArenaDaily(save, dailyDateKey);
      handlersRun.push('ArenaMatchSystem.resetDaily');
      resetVoidTrialDaily(save, dailyDateKey);
      handlersRun.push('VoidTrial.resetDaily');
      resetFriendDailyGifts(save, dailyDateKey);
      handlersRun.push('FriendSystem.resetDailyGifts');
      resetCovenantDailyContribution(save, dailyDateKey);
      handlersRun.push('CovenantSystem.resetDailyContribution');
      resetPatronDailyGift(save, dailyDateKey);
      handlersRun.push('PatronSystem.resetDailyGift');
      save.resetState.lastDailyResetDate = dailyDateKey;
    }

    if (ResetService.hasWeeklyResetPassed(save, now)) {
      weeklyResetApplied = true;
      resetWeeklyTasks(save, weeklyWeekKey);
      handlersRun.push('WeeklyTaskSystem.resetWeekly');
      resetCovenantBossWeekly(save, weeklyWeekKey);
      handlersRun.push('CovenantBossSystem.resetWeekly');
      VoidTrialSystem.resetWeekly(save, weeklyWeekKey);
      handlersRun.push('VoidTrialSystem.resetWeekly');
      save.resetState.lastWeeklyResetWeekKey = weeklyWeekKey;
    }

    rolloverRiftSeasonIfExpired(save, now);
    handlersRun.push('RiftSeasonSystem.rolloverIfExpired');
    rolloverArenaSeasonIfExpired(save, now);
    handlersRun.push('ArenaSeasonSystem.rolloverIfExpired');
    rotateFeaturedBannerIfExpired(save, now);
    handlersRun.push('FeaturedBannerSystem.rotateIfExpired');

    if (import.meta.env.DEV && (dailyResetApplied || weeklyResetApplied)) {
      console.info('[ResetService] runDueResets', {
        dailyResetApplied,
        weeklyResetApplied,
        dailyDateKey,
        weeklyWeekKey,
        handlersRun,
      });
    }

    return {
      dailyResetApplied,
      weeklyResetApplied,
      dailyDateKey,
      weeklyWeekKey,
      handlersRun,
    };
  }

  /** Force the next runDueResets call to treat daily boundaries as crossed. */
  static simulateDailyReset(save: RealmSaveDataV3): void {
    ensureResetState(save, new Date());
    save.resetState.lastDailyResetDate = '1970-01-01';
  }

  /** Force the next runDueResets call to treat weekly boundaries as crossed. */
  static simulateWeeklyReset(save: RealmSaveDataV3): void {
    ensureResetState(save, new Date());
    save.resetState.lastWeeklyResetWeekKey = '1970-W01';
  }
}
