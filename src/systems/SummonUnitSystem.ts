// src/systems/SummonUnitSystem.ts
// V2 summon placeholder — full summon logic arrives in a later phase.

import type { BattleHero, BattleState } from '../types';

export class SummonUnitSystem {
  static summonUnit(
    summonId: string,
    caster: BattleHero,
    battleState: BattleState,
  ): void {
    console.warn('[SummonUnitSystem] summon not implemented yet', {
      summonId,
      casterId: caster.heroId,
      enemyCount: battleState.enemies.length,
    });
  }
}
