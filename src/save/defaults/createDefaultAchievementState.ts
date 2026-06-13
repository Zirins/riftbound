// src/save/defaults/createDefaultAchievementState.ts

import type { AchievementSaveState } from '../../types';

export function createDefaultAchievementState(): AchievementSaveState {
  return {
    completedAchievementIds: [],
    claimedAchievementIds: [],
  };
}
