// src/save/defaults/createDefaultSigilState.ts

import type { SigilOwnershipState } from '../../types';

export function createDefaultSigilState(): SigilOwnershipState {
  return {
    ownedSigils: [],
    nextInstanceId: 1,
  };
}
