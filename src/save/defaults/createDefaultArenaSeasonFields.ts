// src/save/defaults/createDefaultArenaSeasonFields.ts
// Arena season date fields on ArenaState (Section 29).

import { ARENA_SEASON } from '../../constants/gameConfig';
import { getLocalDateKey, parseLocalDateKey } from '../utils/saveDateUtils';

export interface ArenaSeasonDateFields {
  seasonStartDate: string;
  seasonEndDate: string;
  lastMatchDate: string;
  inactivityDecayBaseRankPoints: number;
  inactivityDecayMatchDate: string;
  inactivityDecayThroughDate: string;
}

export function createDefaultArenaSeasonFields(now = Date.now()): ArenaSeasonDateFields {
  const seasonStartDate = getLocalDateKey(new Date(now));
  const endDate = parseLocalDateKey(seasonStartDate);
  endDate.setDate(endDate.getDate() + ARENA_SEASON.SEASON_DURATION_DAYS);
  const seasonEndDate = getLocalDateKey(endDate);

  return {
    seasonStartDate,
    seasonEndDate,
    lastMatchDate: '',
    inactivityDecayBaseRankPoints: 0,
    inactivityDecayMatchDate: '',
    inactivityDecayThroughDate: '',
  };
}
