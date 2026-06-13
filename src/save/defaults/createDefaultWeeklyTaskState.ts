// src/save/defaults/createDefaultWeeklyTaskState.ts

import type { WeeklyTaskSaveState } from '../../types';
import { getIsoWeekKey } from '../utils/saveDateUtils';

export function createDefaultWeeklyTaskState(now = Date.now()): WeeklyTaskSaveState {
  return {
    weekKey: getIsoWeekKey(now),
    tasks: [],
  };
}
