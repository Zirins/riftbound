// src/save/defaults/createDefaultPatronState.ts

import type { PatronState } from '../../types';

export function createDefaultPatronState(): PatronState {
  return {
    patronPoints: 0,
    patronTier: 0,
    dailyGiftClaimedDate: '',
  };
}
