// src/save/migrations/migrateSaveV2ToV3.ts
// Idempotent realm migration from V1.1 (schema 2) to V2 (schema 3) save fields.

import { createDefaultAchievementState } from '../defaults/createDefaultAchievementState';
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
import { createDefaultWeeklyTaskState } from '../defaults/createDefaultWeeklyTaskState';
import { createDefaultWorldFeedState } from '../defaults/createDefaultWorldFeedState';
import type { RealmSaveDataV2, RealmSaveDataV3 } from '../../types';

export function migrateSaveV2ToV3(save: RealmSaveDataV2): RealmSaveDataV3 {
  const migrated = structuredClone(save) as RealmSaveDataV3;

  migrated.inventory = migrated.inventory
    ? upgradeInventoryToV3(migrated.inventory)
    : createDefaultInventory();

  migrated.sigilState ??= createDefaultSigilState();
  migrated.bondState ??= createDefaultBondState();
  migrated.formationPresets ??= [];
  migrated.achievementState ??= createDefaultAchievementState();
  migrated.weeklyTaskState ??= createDefaultWeeklyTaskState();
  migrated.offlineRewardState ??= createDefaultOfflineRewardState();
  migrated.covenantState ??= createDefaultCovenantState();
  migrated.friendState ??= createDefaultFriendState();
  migrated.patronState ??= createDefaultPatronState();
  migrated.riftSeasonState ??= createDefaultRiftSeasonState();
  migrated.featuredBannerState ??= createDefaultFeaturedBannerState();
  migrated.voidTrialState ??= createDefaultVoidTrialState();
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
