// src/save/defaults/createDefaultFriendState.ts

import type { FriendState } from '../../types';
import { getIsoWeekKey, toDateString } from '../utils/saveDateUtils';

export function createDefaultFriendState(now = Date.now()): FriendState {
  return {
    friendIds: [],
    sentGiftToday: [],
    receivedGiftToday: [],
    friendshipPoints: 0,
    lastGiftResetDate: toDateString(now),
    shopPurchasesThisWeek: {},
    lastShopResetWeekKey: getIsoWeekKey(now),
  };
}
