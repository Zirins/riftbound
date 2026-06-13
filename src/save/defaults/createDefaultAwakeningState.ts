// src/save/defaults/createDefaultAwakeningState.ts

import type { HeroAwakeningState, HeroOwnershipState } from '../../types';

export function createDefaultAwakeningState(
  ownedHeroes: HeroOwnershipState[],
): Record<string, HeroAwakeningState> {
  const state: Record<string, HeroAwakeningState> = {};
  for (const hero of ownedHeroes) {
    if (hero.isOwned) {
      state[hero.heroId] = { heroId: hero.heroId, awakeningLevel: 0 };
    }
  }
  return state;
}
