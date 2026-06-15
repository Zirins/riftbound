// src/systems/RiftSeasonSystem.ts
// 30-day Rift Season battle pass — XP, claims, premium unlock (Section 30).

import { RIFT_SEASON } from '../constants/gameConfig';
import { DAILY_TASKS } from '../data/tasks';
import { getRiftSeasonTierRewards } from '../data/riftSeasonRewards';
import { WEEKLY_MISSIONS, isWeeklyMissionActive } from '../data/weeklyTasks';
import { createDefaultRiftSeasonState } from '../save/defaults/createDefaultRiftSeasonState';
import {
  getLocalDateKey,
  getLocalWeekKey,
  getSeasonDay,
  isSeasonExpired,
} from '../save/utils/saveDateUtils';
import type { GameEvent, RealmSaveDataV3 } from '../types';
import { ArenaSeasonSystem } from './ArenaSeasonSystem';
import { EconomySystem } from './EconomySystem';
import { GameEventBus } from './GameEventBus';
import { RewardSystem } from './RewardSystem';

export interface RiftSeasonClaimResult {
  success: boolean;
  reason?: string;
}

export interface RiftSeasonPremiumResult {
  success: boolean;
  reason?: string;
}

function ensureRiftSeasonFields(save: RealmSaveDataV3): void {
  if (!save.riftSeasonState) {
    save.riftSeasonState = createDefaultRiftSeasonState();
  }

  const state = save.riftSeasonState;
  if (state.dailyXpDateKey === undefined) state.dailyXpDateKey = '';
  if (!state.dailyXpGrantedTaskIds) state.dailyXpGrantedTaskIds = [];
  if (state.allDailyBonusDateKey === undefined) state.allDailyBonusDateKey = '';
  if (state.weeklyXpWeekKey === undefined) state.weeklyXpWeekKey = '';
  if (!state.weeklyXpGrantedMissionIds) state.weeklyXpGrantedMissionIds = [];
  if (state.allWeeklyBonusWeekKey === undefined) state.allWeeklyBonusWeekKey = '';
}

function syncSeasonDatesFromArena(save: RealmSaveDataV3): void {
  ArenaSeasonSystem.ensureSeasonState(save);
  ensureRiftSeasonFields(save);

  const { seasonStartDate, seasonEndDate } = save.arenaState;
  save.riftSeasonState.seasonStartDate = seasonStartDate;
  save.riftSeasonState.seasonEndDate = seasonEndDate;
  save.riftSeasonState.seasonId = `rift_${seasonStartDate}`;
}

function resetSeasonProgress(save: RealmSaveDataV3): void {
  ensureRiftSeasonFields(save);

  save.riftSeasonState.currentXp = 0;
  save.riftSeasonState.claimedFreeTiers = [];
  save.riftSeasonState.claimedPremiumTiers = [];
  save.riftSeasonState.premiumUnlocked = false;
  save.riftSeasonState.dailyXpDateKey = '';
  save.riftSeasonState.dailyXpGrantedTaskIds = [];
  save.riftSeasonState.allDailyBonusDateKey = '';
  save.riftSeasonState.weeklyXpWeekKey = '';
  save.riftSeasonState.weeklyXpGrantedMissionIds = [];
  save.riftSeasonState.allWeeklyBonusWeekKey = '';
}

function syncDailyXpTracking(save: RealmSaveDataV3, now = new Date()): void {
  ensureRiftSeasonFields(save);
  const today = getLocalDateKey(now);
  if (save.riftSeasonState.dailyXpDateKey !== today) {
    save.riftSeasonState.dailyXpDateKey = today;
    save.riftSeasonState.dailyXpGrantedTaskIds = [];
  }
}

function syncWeeklyXpTracking(save: RealmSaveDataV3, now = new Date()): void {
  ensureRiftSeasonFields(save);
  const weekKey = getLocalWeekKey(now);
  if (save.riftSeasonState.weeklyXpWeekKey !== weekKey) {
    save.riftSeasonState.weeklyXpWeekKey = weekKey;
    save.riftSeasonState.weeklyXpGrantedMissionIds = [];
  }
}

function addSeasonXp(save: RealmSaveDataV3, amount: number, source: string): number {
  if (amount <= 0) return save.riftSeasonState.currentXp;

  ensureRiftSeasonFields(save);
  const before = save.riftSeasonState.currentXp;
  const after = Math.min(RIFT_SEASON.MAX_XP, before + amount);
  save.riftSeasonState.currentXp = after;

  if (import.meta.env.DEV && after !== before) {
    console.info('[RiftSeasonSystem] XP granted', {
      source,
      amount: after - before,
      total: after,
    });
  }

  return after;
}

function areAllDailyTasksComplete(save: RealmSaveDataV3): boolean {
  return save.tasks.length > 0
    && save.tasks.length >= DAILY_TASKS.length
    && save.tasks.every((task) => task.completed);
}

function areAllWeeklyMissionsComplete(save: RealmSaveDataV3): boolean {
  const activeMissions = WEEKLY_MISSIONS.filter((mission) => isWeeklyMissionActive(mission.id));
  if (activeMissions.length === 0 || !save.weeklyTaskState) return false;

  return activeMissions.every((mission) => {
    const entry = save.weeklyTaskState!.tasks.find((task) => task.taskId === mission.id);
    return entry?.completed ?? false;
  });
}

function checkAllDailyTasksBonus(save: RealmSaveDataV3, now = new Date()): void {
  syncDailyXpTracking(save, now);
  const today = getLocalDateKey(now);

  if (!areAllDailyTasksComplete(save)) return;
  if (save.riftSeasonState.allDailyBonusDateKey === today) return;

  save.riftSeasonState.allDailyBonusDateKey = today;
  addSeasonXp(save, RIFT_SEASON.XP_ALL_DAILY_BONUS, 'all_daily_tasks_bonus');
}

function checkAllWeeklyMissionsBonus(save: RealmSaveDataV3, now = new Date()): void {
  syncWeeklyXpTracking(save, now);
  const weekKey = getLocalWeekKey(now);

  if (!areAllWeeklyMissionsComplete(save)) return;
  if (save.riftSeasonState.allWeeklyBonusWeekKey === weekKey) return;

  save.riftSeasonState.allWeeklyBonusWeekKey = weekKey;
  addSeasonXp(save, RIFT_SEASON.XP_ALL_WEEKLY_BONUS, 'all_weekly_missions_bonus');
}

let handlersRegistered = false;

export class RiftSeasonSystem {
  static init(): void {
    if (handlersRegistered) return;
    handlersRegistered = true;

    const eventTypes: GameEvent['type'][] = [
      'stage_cleared',
      'arena_won',
      'void_trial_floor_cleared',
      'daily_task_completed',
      'weekly_mission_completed',
    ];

    for (const type of eventTypes) {
      GameEventBus.register(type, RiftSeasonSystem.handleEvent);
    }
  }

  static handleEvent(save: RealmSaveDataV3, event: GameEvent, now = new Date()): void {
    RiftSeasonSystem.ensureSeasonState(save, now);

    switch (event.type) {
      case 'stage_cleared':
        addSeasonXp(save, RIFT_SEASON.XP_CAMPAIGN_CLEAR, 'campaign_clear');
        break;
      case 'arena_won':
        addSeasonXp(save, RIFT_SEASON.XP_ARENA_WIN, 'arena_win');
        break;
      case 'void_trial_floor_cleared':
        addSeasonXp(save, RIFT_SEASON.XP_VOID_TRIAL_FLOOR, 'void_trial_floor');
        break;
      case 'daily_task_completed': {
        syncDailyXpTracking(save, now);
        if (!save.riftSeasonState.dailyXpGrantedTaskIds.includes(event.taskId)) {
          save.riftSeasonState.dailyXpGrantedTaskIds = [
            ...save.riftSeasonState.dailyXpGrantedTaskIds,
            event.taskId,
          ];
          addSeasonXp(save, RIFT_SEASON.XP_DAILY_TASK, `daily_task:${event.taskId}`);
        }
        checkAllDailyTasksBonus(save, now);
        break;
      }
      case 'weekly_mission_completed': {
        syncWeeklyXpTracking(save, now);
        if (!save.riftSeasonState.weeklyXpGrantedMissionIds.includes(event.missionId)) {
          save.riftSeasonState.weeklyXpGrantedMissionIds = [
            ...save.riftSeasonState.weeklyXpGrantedMissionIds,
            event.missionId,
          ];
          addSeasonXp(save, RIFT_SEASON.XP_WEEKLY_MISSION, `weekly_mission:${event.missionId}`);
        }
        checkAllWeeklyMissionsBonus(save, now);
        break;
      }
      default:
        break;
    }
  }

  /**
   * Rift Season shares Arena season calendar dates (Section 30.1).
   * arenaState.seasonStartDate / seasonEndDate are the source of truth.
   */
  static ensureSeasonState(save: RealmSaveDataV3, now = new Date()): void {
    ensureRiftSeasonFields(save);
    ArenaSeasonSystem.ensureSeasonState(save, now.getTime());
    syncSeasonDatesFromArena(save);
  }

  static getSeasonDay(save: RealmSaveDataV3, now = new Date()): number {
    RiftSeasonSystem.ensureSeasonState(save, now);
    return getSeasonDay(save.arenaState.seasonStartDate, now);
  }

  static getDaysRemaining(save: RealmSaveDataV3, now = new Date()): number {
    const seasonDay = RiftSeasonSystem.getSeasonDay(save, now);
    return Math.max(0, RIFT_SEASON.SEASON_DURATION_DAYS - seasonDay + 1);
  }

  static getCurrentTier(save: RealmSaveDataV3): number {
    RiftSeasonSystem.ensureSeasonState(save);
    return Math.min(
      RIFT_SEASON.TOTAL_TIERS,
      Math.floor(save.riftSeasonState.currentXp / RIFT_SEASON.XP_PER_TIER),
    );
  }

  static addXp(save: RealmSaveDataV3, amount: number, source = 'dev_grant'): number {
    RiftSeasonSystem.ensureSeasonState(save);
    return addSeasonXp(save, amount, source);
  }

  static claimFreeTier(save: RealmSaveDataV3, tier: number): RiftSeasonClaimResult {
    RiftSeasonSystem.ensureSeasonState(save);

    if (tier < 1 || tier > RIFT_SEASON.TOTAL_TIERS) {
      return { success: false, reason: 'Invalid tier' };
    }

    if (save.riftSeasonState.claimedFreeTiers.includes(tier)) {
      return { success: false, reason: 'Tier already claimed' };
    }

    const requiredXp = tier * RIFT_SEASON.XP_PER_TIER;
    if (save.riftSeasonState.currentXp < requiredXp) {
      return { success: false, reason: `Requires ${requiredXp} season XP` };
    }

    const rewards = getRiftSeasonTierRewards(tier);
    if (!rewards) {
      return { success: false, reason: 'Tier rewards not found' };
    }

    RewardSystem.grantRewardBundle(save, rewards.free);
    save.riftSeasonState.claimedFreeTiers = [...save.riftSeasonState.claimedFreeTiers, tier];
    GameEventBus.emit(save, { type: 'rift_season_tier_claimed', tier, premium: false });

    return { success: true };
  }

  static claimPremiumTier(save: RealmSaveDataV3, tier: number): RiftSeasonClaimResult {
    RiftSeasonSystem.ensureSeasonState(save);

    if (!save.riftSeasonState.premiumUnlocked) {
      return { success: false, reason: 'Premium track not unlocked' };
    }

    if (tier < 1 || tier > RIFT_SEASON.TOTAL_TIERS) {
      return { success: false, reason: 'Invalid tier' };
    }

    if (save.riftSeasonState.claimedPremiumTiers.includes(tier)) {
      return { success: false, reason: 'Premium tier already claimed' };
    }

    const requiredXp = tier * RIFT_SEASON.XP_PER_TIER;
    if (save.riftSeasonState.currentXp < requiredXp) {
      return { success: false, reason: `Requires ${requiredXp} season XP` };
    }

    const rewards = getRiftSeasonTierRewards(tier);
    if (!rewards) {
      return { success: false, reason: 'Tier rewards not found' };
    }

    RewardSystem.grantRewardBundle(save, rewards.premium);
    save.riftSeasonState.claimedPremiumTiers = [...save.riftSeasonState.claimedPremiumTiers, tier];
    GameEventBus.emit(save, { type: 'rift_season_tier_claimed', tier, premium: true });

    return { success: true };
  }

  static purchasePremium(save: RealmSaveDataV3): RiftSeasonPremiumResult {
    RiftSeasonSystem.ensureSeasonState(save);

    if (save.riftSeasonState.premiumUnlocked) {
      return { success: false, reason: 'Premium already unlocked this season' };
    }

    const spend = EconomySystem.spendCurrency(
      save,
      'void_gem',
      RIFT_SEASON.PREMIUM_TRACK_COST_VOID_GEMS,
      'rift_season_premium',
    );

    if (!spend.success) {
      return { success: false, reason: spend.reason ?? 'Insufficient Void Gems' };
    }

    save.riftSeasonState.premiumUnlocked = true;
    return { success: true };
  }

  static setPremiumUnlocked(save: RealmSaveDataV3, unlocked: boolean): void {
    RiftSeasonSystem.ensureSeasonState(save);
    save.riftSeasonState.premiumUnlocked = unlocked;
  }

  /** Resets progress when the shared Arena season ends. Premium does not persist. */
  static rolloverIfExpired(save: RealmSaveDataV3, now = new Date()): boolean {
    RiftSeasonSystem.ensureSeasonState(save, now);

    if (!isSeasonExpired(save.arenaState.seasonEndDate, now)) {
      return false;
    }

    resetSeasonProgress(save);

    if (import.meta.env.DEV) {
      console.info('[RiftSeasonSystem] season rollover — progress reset for new Arena season');
    }

    return true;
  }
}
