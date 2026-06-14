// src/store/GameState.ts
// Runtime battle state factory — not persisted to localStorage.

import type { EnemyRuntimeState, GameState, HeroRuntimeState } from '../types';

export function createBattleGameState(
  heroes: HeroRuntimeState[],
  enemies: EnemyRuntimeState[],
  autoUltimate = false,
): GameState {
  return {
    currentStageId: 'stage_1',
    currentWaveIndex: 0,
    heroes,
    enemies,
    autoUltimate,
    isPaused: false,
    isVictory: false,
    isDefeat: false,
    elapsedTimeMs: 0,
    firstHeroToFall: null,
  };
}
