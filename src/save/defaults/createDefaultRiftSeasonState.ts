// src/save/defaults/createDefaultRiftSeasonState.ts
// Rift Season state — dates synced from Arena season on first ensure (Section 30.1).

import { RIFT_SEASON } from '../../constants/gameConfig';
import type { RiftSeasonState } from '../../types';
import { getLocalDateKey, parseLocalDateKey } from '../utils/saveDateUtils';

export function createDefaultRiftSeasonState(now = Date.now()): RiftSeasonState {
  const seasonStartDate = getLocalDateKey(new Date(now));
  const endDate = parseLocalDateKey(seasonStartDate);
  endDate.setDate(endDate.getDate() + RIFT_SEASON.SEASON_DURATION_DAYS);

  return {
    seasonId: `rift_${seasonStartDate}`,
    seasonStartDate,
    seasonEndDate: getLocalDateKey(endDate),
    currentXp: 0,
    claimedFreeTiers: [],
    claimedPremiumTiers: [],
    premiumUnlocked: false,
    dailyXpDateKey: '',
    dailyXpGrantedTaskIds: [],
    allDailyBonusDateKey: '',
    weeklyXpWeekKey: '',
    weeklyXpGrantedMissionIds: [],
    allWeeklyBonusWeekKey: '',
  };
}
