// src/save/defaults/createDefaultRiftSeasonState.ts

import { RIFT_SEASON } from '../../constants/gameConfig';
import type { RiftSeasonState } from '../../types';
import { toDateString } from '../utils/saveDateUtils';

export function createDefaultRiftSeasonState(now = Date.now()): RiftSeasonState {
  const seasonStartDate = toDateString(now);
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + RIFT_SEASON.SEASON_DURATION_DAYS);

  return {
    seasonId: 'season_1',
    seasonStartDate,
    seasonEndDate: toDateString(endDate.getTime()),
    currentXp: 0,
    claimedFreeTiers: [],
    claimedPremiumTiers: [],
    premiumUnlocked: false,
  };
}
