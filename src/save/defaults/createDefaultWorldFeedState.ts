// src/save/defaults/createDefaultWorldFeedState.ts

import type { WorldFeedState } from '../../types';
import { toDateString } from '../utils/saveDateUtils';

export function createDefaultWorldFeedState(now = Date.now()): WorldFeedState {
  return {
    dateKey: toDateString(now),
    messageSeed: now % 100_000,
    displayedIndex: 0,
  };
}
