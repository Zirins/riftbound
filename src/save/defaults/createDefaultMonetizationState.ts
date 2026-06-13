// src/save/defaults/createDefaultMonetizationState.ts

import type { MonetizationState } from '../../types';

export function createDefaultMonetizationState(): MonetizationState {
  return {
    foundersPackClaimed: false,
    monthlyCardActiveUntil: null,
    monthlyCardDailyClaimsRemaining: 0,
    growthFundPurchased: false,
    growthFundClaimedMilestones: [],
    testPurchaseHistory: [],
  };
}
