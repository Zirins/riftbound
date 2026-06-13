// src/save/defaults/createDefaultBondState.ts

import type { BondState } from '../../types';

export function createDefaultBondState(): BondState {
  return {
    activatedBondIds: [],
  };
}
