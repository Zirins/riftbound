// src/save/defaults/createDefaultVoidTrialState.ts

import type { VoidTrialState } from '../../types';
import { getIsoWeekKey, toDateString } from '../utils/saveDateUtils';

export function createDefaultVoidTrialState(now = Date.now()): VoidTrialState {
  return {
    highestFloorCleared: 0,
    firstClearClaimedFloors: [],
    attemptsUsedToday: 0,
    lastAttemptResetDate: toDateString(now),
    lastWeeklyRewardWeekKey: getIsoWeekKey(now),
    weeklyHighestFloor: 0,
  };
}
