// src/save/defaults/createDefaultResetState.ts

import type { ResetState } from '../../types';
import { getIsoWeekKey, toDateString } from '../utils/saveDateUtils';

export function createDefaultResetState(now = Date.now()): ResetState {
  return {
    lastDailyResetDate: toDateString(now),
    lastWeeklyResetWeekKey: getIsoWeekKey(now),
    lastSeasonId: 'season_1',
  };
}
