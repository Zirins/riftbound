// src/save/migrations/migrateSaveV2ToV3.ts
// Idempotent realm migration from V1.1 (schema 2) to V2 (schema 3) save fields.

import { createDefaultAchievementState } from '../defaults/createDefaultAchievementState';
import { createDefaultArenaSeasonFields } from '../defaults/createDefaultArenaSeasonFields';
import { createDefaultAwakeningState } from '../defaults/createDefaultAwakeningState';
import { createDefaultBondState } from '../defaults/createDefaultBondState';
import {
  createDefaultInventory,
  upgradeInventoryToV3,
} from '../defaults/createDefaultInventory';
import { createDefaultCovenantState } from '../defaults/createDefaultCovenantState';
import { createDefaultFeaturedBannerState } from '../defaults/createDefaultFeaturedBannerState';
import { createDefaultFriendState } from '../defaults/createDefaultFriendState';
import { createDefaultMonetizationState } from '../defaults/createDefaultMonetizationState';
import { createDefaultOfflineRewardState } from '../defaults/createDefaultOfflineRewardState';
import { createDefaultPatronState } from '../defaults/createDefaultPatronState';
import { createDefaultResetState } from '../defaults/createDefaultResetState';
import { createDefaultRiftSeasonState } from '../defaults/createDefaultRiftSeasonState';
import { createDefaultSigilState } from '../defaults/createDefaultSigilState';
import { createDefaultVoidTrialState } from '../defaults/createDefaultVoidTrialState';
import { createDefaultWeeklyTaskState, buildFreshWeeklyTaskEntries } from '../defaults/createDefaultWeeklyTaskState';
import { createDefaultWorldFeedState } from '../defaults/createDefaultWorldFeedState';
import type { RealmSaveDataV2, RealmSaveDataV3, OfflineRewardState } from '../../types';

export function migrateSaveV2ToV3(save: RealmSaveDataV2): RealmSaveDataV3 {
  const migrated = structuredClone(save) as RealmSaveDataV3;

  migrated.inventory = migrated.inventory
    ? upgradeInventoryToV3(migrated.inventory)
    : createDefaultInventory();

  migrated.sigilState ??= createDefaultSigilState();
  migrated.bondState ??= createDefaultBondState();
  migrated.formationPresets ??= [];
  migrated.achievementState ??= createDefaultAchievementState();
  if (!migrated.achievementState.progressById) {
    migrated.achievementState.progressById = {};
  }
  migrated.weeklyTaskState ??= createDefaultWeeklyTaskState();
  if (!migrated.weeklyTaskState.disciplinedRoutineDayKeys) {
    migrated.weeklyTaskState.disciplinedRoutineDayKeys = [];
  }
  if (migrated.weeklyTaskState.tasks.length === 0) {
    migrated.weeklyTaskState.tasks = buildFreshWeeklyTaskEntries();
  }
  migrated.offlineRewardState ??= createDefaultOfflineRewardState();
  if (migrated.offlineRewardState) {
    const offlineState = migrated.offlineRewardState as OfflineRewardState & { lastClaimAt?: number };
    if (offlineState.lastOnlineAt === undefined) {
      offlineState.lastOnlineAt = offlineState.lastClaimAt ?? Date.now();
    }
  }
  migrated.covenantState ??= createDefaultCovenantState();
  if (migrated.covenantState && !migrated.covenantState.shopState) {
    migrated.covenantState.shopState = createDefaultCovenantState().shopState;
  }
  if (migrated.covenantState?.shopState && !migrated.covenantState.shopState.purchasedItemCounts) {
    migrated.covenantState.shopState.purchasedItemCounts = {};
  }
  if (migrated.covenantState?.bossState) {
    const boss = migrated.covenantState.bossState;
    if (boss.playerDamageThisWeek === undefined) boss.playerDamageThisWeek = 0;
    if (boss.lastNpcDamageDate === undefined) boss.lastNpcDamageDate = '';
    if (boss.npcDamageToday === undefined) boss.npcDamageToday = [];
    if (boss.killRewardMailSent === undefined) boss.killRewardMailSent = false;
    if (boss.killRewardMailWeekKey === undefined) boss.killRewardMailWeekKey = '';
  }
  migrated.friendState ??= createDefaultFriendState();
  migrated.patronState ??= createDefaultPatronState();
  migrated.riftSeasonState ??= createDefaultRiftSeasonState();
  if (migrated.riftSeasonState) {
    const rs = migrated.riftSeasonState;
    if (rs.dailyXpDateKey === undefined) rs.dailyXpDateKey = '';
    if (!rs.dailyXpGrantedTaskIds) rs.dailyXpGrantedTaskIds = [];
    if (rs.allDailyBonusDateKey === undefined) rs.allDailyBonusDateKey = '';
    if (rs.weeklyXpWeekKey === undefined) rs.weeklyXpWeekKey = '';
    if (!rs.weeklyXpGrantedMissionIds) rs.weeklyXpGrantedMissionIds = [];
    if (rs.allWeeklyBonusWeekKey === undefined) rs.allWeeklyBonusWeekKey = '';
  }
  migrated.featuredBannerState ??= createDefaultFeaturedBannerState();
  migrated.voidTrialState ??= createDefaultVoidTrialState();
  if (migrated.voidTrialState.weeklyMilestoneClaimed === undefined) {
    migrated.voidTrialState.weeklyMilestoneClaimed = false;
  }
  migrated.monetizationState ??= createDefaultMonetizationState();
  migrated.worldFeedState ??= createDefaultWorldFeedState();
  migrated.resetState ??= createDefaultResetState();

  if (!migrated.awakeningState) {
    migrated.awakeningState = createDefaultAwakeningState(migrated.ownedHeroes);
  } else {
    for (const hero of migrated.ownedHeroes) {
      if (hero.isOwned && !migrated.awakeningState[hero.heroId]) {
        migrated.awakeningState[hero.heroId] = {
          heroId: hero.heroId,
          awakeningLevel: 0,
        };
      }
    }
  }

  if (migrated.arenaState) {
    const seasonFields = createDefaultArenaSeasonFields();
    if (!migrated.arenaState.seasonStartDate) {
      migrated.arenaState.seasonStartDate = seasonFields.seasonStartDate;
    }
    if (!migrated.arenaState.seasonEndDate) {
      migrated.arenaState.seasonEndDate = seasonFields.seasonEndDate;
    }
    if (migrated.arenaState.lastMatchDate === undefined) {
      migrated.arenaState.lastMatchDate = seasonFields.lastMatchDate;
    }
    if (migrated.arenaState.inactivityDecayBaseRankPoints === undefined) {
      migrated.arenaState.inactivityDecayBaseRankPoints = 0;
    }
    if (migrated.arenaState.inactivityDecayMatchDate === undefined) {
      migrated.arenaState.inactivityDecayMatchDate = '';
    }
    if (migrated.arenaState.inactivityDecayThroughDate === undefined) {
      migrated.arenaState.inactivityDecayThroughDate = '';
    }
  }

  return migrated;
}

/** Returns true when a realm is missing any V3 save field. */
export function realmNeedsV3Migration(save: RealmSaveDataV2): boolean {
  const realm = save as Partial<RealmSaveDataV3>;
  const inventory = realm.inventory;

  return (
    !inventory
    || !('itemQuantities' in inventory)
    || !realm.sigilState
    || !realm.awakeningState
    || !realm.bondState
    || realm.formationPresets === undefined
    || !realm.achievementState
    || !realm.weeklyTaskState
    || !realm.offlineRewardState
    || !realm.covenantState
    || !realm.friendState
    || !realm.patronState
    || !realm.riftSeasonState
    || !realm.featuredBannerState
    || !realm.voidTrialState
    || !realm.monetizationState
    || !realm.worldFeedState
    || !realm.resetState
  );
}
