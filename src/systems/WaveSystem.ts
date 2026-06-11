// src/systems/WaveSystem.ts
// V0.1 stub — tracks living enemies and emits waveCleared when all are dead.
// Full wave spawning arrives in Prompt 7.

import Phaser from 'phaser';
import type { EnemyRuntimeState } from '../types';

export class WaveSystem extends Phaser.Events.EventEmitter {
  onEnemyKilled(enemies: EnemyRuntimeState[]): void {
    const livingCount = enemies.filter((enemy) => enemy.isAlive).length;
    if (livingCount === 0) {
      this.emit('waveCleared');
    }
  }
}
