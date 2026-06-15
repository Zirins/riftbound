// src/systems/resetHandlers.ts
// Placeholder reset hooks for systems not yet built — wired by ResetService.

import type { RealmSaveDataV3 } from '../types';
import { CovSystem } from './CovSystem';
import { resetWeekly as resetCovenantShopWeekly } from './CovShopSystem';
import { CovBossSystem } from './CovBossSystem';
import { ArenaSeasonSystem } from './ArenaSeasonSystem';
import { RiftSeasonSystem } from './RiftSeasonSystem';
import { resetDailyGifts as resetFriendDailyGiftsHandler } from './FriendSystem';
import { resetWeekly as resetFriendShopWeekly } from './FriendShopSystem';
import { WeeklyTaskSystem } from './WeeklyTaskSystem';
import { FeaturedBannerSystem } from './FeaturedBannerSystem';

export function resetWeeklyTasks(save: RealmSaveDataV3, weekKey: string): void {
  WeeklyTaskSystem.resetWeekly(save, weekKey);
}

export function resetFriendDailyGifts(save: RealmSaveDataV3, dateKey: string): void {
  resetFriendDailyGiftsHandler(save, dateKey);
}

export function resetCovenantDailyContribution(save: RealmSaveDataV3, dateKey: string): void {
  CovSystem.resetDailyContribution(save, dateKey);
}

export function resetCovenantBossWeekly(save: RealmSaveDataV3, weekKey: string): void {
  CovBossSystem.resetWeekly(save, weekKey);
}

export function resetCovenantShopWeeklyHandler(save: RealmSaveDataV3, weekKey: string): void {
  resetCovenantShopWeekly(save, weekKey);
}

export function rolloverRiftSeasonIfExpired(save: RealmSaveDataV3, now: Date): void {
  RiftSeasonSystem.rolloverIfExpired(save, now);
}

export function rolloverArenaSeasonIfExpired(save: RealmSaveDataV3, now: Date): void {
  ArenaSeasonSystem.rolloverIfExpired(save, now);
}

export function rotateFeaturedBannerIfExpired(save: RealmSaveDataV3, now: Date): void {
  FeaturedBannerSystem.rotateIfExpired(save, now);
}

export function resetVoidTrialDaily(save: RealmSaveDataV3, dateKey: string): void {
  if (!save.voidTrialState) return;
  if (save.voidTrialState.lastAttemptResetDate === dateKey) return;
  save.voidTrialState = {
    ...save.voidTrialState,
    attemptsUsedToday: 0,
    lastAttemptResetDate: dateKey,
  };
}

export function resetFriendShopWeeklyHandler(save: RealmSaveDataV3, weekKey: string): void {
  resetFriendShopWeekly(save, weekKey);
}

export function resetPatronDailyGift(save: RealmSaveDataV3, dateKey: string): void {
  void save;
  void dateKey;
}
