// src/save/defaults/createDefaultWeeklyTaskState.ts

import { WEEKLY_MISSIONS } from '../../data/weeklyTasks';
import type { WeeklyTaskEntry, WeeklyTaskSaveState } from '../../types';
import { getIsoWeekKey } from '../utils/saveDateUtils';

export function buildFreshWeeklyTaskEntries(): WeeklyTaskEntry[] {
  return WEEKLY_MISSIONS.map((mission) => ({
    taskId: mission.id,
    currentProgress: 0,
    completed: false,
    claimed: false,
  }));
}

export function createDefaultWeeklyTaskState(now = Date.now()): WeeklyTaskSaveState {
  return {
    weekKey: getIsoWeekKey(now),
    tasks: buildFreshWeeklyTaskEntries(),
    disciplinedRoutineDayKeys: [],
  };
}
