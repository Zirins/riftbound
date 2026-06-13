// src/save/defaults/buildDefaultRealmV3.ts
// Factory for a complete V2 realm save used by fresh saves.

import { ENERGY, HEROES, STARTER } from '../../constants/gameConfig';
import type {
  FormationGrid,
  HeroOwnershipState,
  RealmSaveDataV3,
} from '../../types';
import { toDateString } from '../utils/saveDateUtils';
import { createDefaultAchievementState } from './createDefaultAchievementState';
import { createDefaultAwakeningState } from './createDefaultAwakeningState';
import { createDefaultBondState } from './createDefaultBondState';
import { createDefaultInventory } from './createDefaultInventory';
import { createDefaultCovenantState } from './createDefaultCovenantState';
import { createDefaultFeaturedBannerState } from './createDefaultFeaturedBannerState';
import { createDefaultFriendState } from './createDefaultFriendState';
import { createDefaultMonetizationState } from './createDefaultMonetizationState';
import { createDefaultOfflineRewardState } from './createDefaultOfflineRewardState';
import { createDefaultPatronState } from './createDefaultPatronState';
import { createDefaultResetState } from './createDefaultResetState';
import { createDefaultRiftSeasonState } from './createDefaultRiftSeasonState';
import { createDefaultSigilState } from './createDefaultSigilState';
import { createDefaultVoidTrialState } from './createDefaultVoidTrialState';
import { createDefaultWeeklyTaskState } from './createDefaultWeeklyTaskState';
import { createDefaultWorldFeedState } from './createDefaultWorldFeedState';

const DEFAULT_LINEUP_HERO_IDS: readonly string[] = [
  HEROES.KAEL.ID,
  HEROES.SURA.ID,
  HEROES.MIRA.ID,
  HEROES.NYRA.ID,
];

export function buildDefaultRealmV3(
  realmId: string,
  playerName: string,
  now = Date.now(),
): RealmSaveDataV3 {
  const today = toDateString(now);
  const defaultFormation = buildDefaultFormationGrid();
  const ownedHeroes = DEFAULT_LINEUP_HERO_IDS.map((heroId) => buildStarterHero(heroId, now));

  return {
    realmId,
    playerName,
    avatarColorIndex: 0,
    accountLevel: 1,
    accountXP: 0,
    resonanceTier: 1,
    inventory: createDefaultInventory({
      gold: STARTER.GOLD,
      riftCrystals: STARTER.RIFT_CRYSTALS,
      voidGems: 0,
      xpFragments: STARTER.XP_FRAGMENTS,
      energy: STARTER.ENERGY,
      maxEnergy: ENERGY.MAX,
      lastEnergyRegenAt: now,
      ownedSigilIds: [],
      heroShards: {},
    }),
    ownedHeroes,
    currentFormation: defaultFormation,
    clearedStages: [],
    pityCounters: {},
    arenaState: {
      rankPoints: 0,
      rankTier: 'rift_initiate',
      attemptsUsedToday: 0,
      lastAttemptResetDate: today,
      lastRewardClaimDate: '',
      defenseFormation: defaultFormation,
    },
    riftChronicle: {
      currentStreak: 0,
      lastClaimDate: '',
      totalDaysClaimed: 0,
    },
    tasks: [],
    mail: [],
    dailyShopState: {
      date: today,
      purchasedItemIds: [],
    },
    lastFreeSummonDate: '',
    settings: {
      musicVolume: 80,
      sfxVolume: 80,
      defaultAutoUltimate: false,
    },
    lastSaved: now,
    sigilState: createDefaultSigilState(),
    awakeningState: createDefaultAwakeningState(ownedHeroes),
    bondState: createDefaultBondState(),
    formationPresets: [],
    achievementState: createDefaultAchievementState(),
    weeklyTaskState: createDefaultWeeklyTaskState(now),
    offlineRewardState: createDefaultOfflineRewardState(now),
    covenantState: createDefaultCovenantState(now),
    friendState: createDefaultFriendState(now),
    patronState: createDefaultPatronState(),
    riftSeasonState: createDefaultRiftSeasonState(now),
    featuredBannerState: createDefaultFeaturedBannerState(now),
    voidTrialState: createDefaultVoidTrialState(now),
    monetizationState: createDefaultMonetizationState(),
    worldFeedState: createDefaultWorldFeedState(now),
    resetState: createDefaultResetState(now),
  };
}

function buildStarterHero(heroId: string, acquiredAt: number): HeroOwnershipState {
  return {
    heroId,
    isOwned: true,
    starRank: 1,
    level: 1,
    currentXP: 0,
    shardCount: 0,
    equippedSigilIds: [],
    acquiredAt,
  };
}

function buildDefaultFormationGrid(): FormationGrid {
  const rows = ['front', 'front', 'back', 'back'] as const;
  const cols = [0, 1, 0, 1];

  return {
    slots: DEFAULT_LINEUP_HERO_IDS.map((heroId, slotIndex) => ({
      slotIndex,
      row: rows[slotIndex],
      col: cols[slotIndex],
      assignedHeroId: heroId,
    })),
  };
}
