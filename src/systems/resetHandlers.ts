// src/systems/resetHandlers.ts
// Placeholder reset hooks for systems not yet built — wired by ResetService.

import type { RealmSaveDataV3 } from '../types';

import { WeeklyTaskSystem } from './WeeklyTaskSystem';

export function resetWeeklyTasks(save: RealmSaveDataV3, weekKey: string): void {
  WeeklyTaskSystem.resetWeekly(save, weekKey);
}

export function resetFriendDailyGifts(save: RealmSaveDataV3, dateKey: string): void {
  void save;
  void dateKey;
}

export function resetCovenantDailyContribution(save: RealmSaveDataV3, dateKey: string): void {
  void save;
  void dateKey;
}

export function resetCovenantBossWeekly(save: RealmSaveDataV3, weekKey: string): void {
  void save;
  void weekKey;
}

export function rolloverRiftSeasonIfExpired(save: RealmSaveDataV3, now: Date): void {
  void save;
  void now;
}

export function rolloverArenaSeasonIfExpired(save: RealmSaveDataV3, now: Date): void {
  void save;
  void now;
}

export function rotateFeaturedBannerIfExpired(save: RealmSaveDataV3, now: Date): void {
  void save;
  void now;
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

export function resetPatronDailyGift(save: RealmSaveDataV3, dateKey: string): void {
  void save;
  void dateKey;
}
