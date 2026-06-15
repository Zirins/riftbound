// src/save/defaults/createDefaultOfflineRewardState.ts

import type { OfflineRewardState } from '../../types';

export function createDefaultOfflineRewardState(now = Date.now()): OfflineRewardState {
  return {
    lastOnlineAt: now,
    pendingGold: 0,
    pendingXpFragments: 0,
    pendingEnergy: 0,
  };
}
