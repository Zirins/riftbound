// src/systems/WaveSystem.ts
// Wave spawning, clear detection, and boss victory.

import Phaser from 'phaser';
import { COMBAT, FORMATION, WARDEN } from '../constants/gameConfig';
import { getEnemySpawnTemplate, isBossEnemyId } from '../data/enemies';
import { getEnemyStartPosition } from './FormationSystem';
import { clampEnemyPosition } from './BattlefieldBounds';
import type { EnemyRuntimeState, HeroRuntimeState, WaveConfig } from '../types';

export class WaveSystem extends Phaser.Events.EventEmitter {
  private waveConfigs: WaveConfig[] = [];
  private currentWaveIndex = 0;
  private interWavePauseMs = 0;
  private spawnCounter = 0;
  private wavesClearedCount = 0;
  private clearedWaveIndices = new Set<number>();

  constructor(_scene: Phaser.Scene) {
    super();
  }

  get isInterWavePause(): boolean {
    return this.interWavePauseMs > 0;
  }

  get isBossWave(): boolean {
    return this.waveConfigs[this.currentWaveIndex]?.isBossWave ?? false;
  }

  getWavesCleared(): number {
    return this.wavesClearedCount;
  }

  init(waves: WaveConfig[]): void {
    this.waveConfigs = waves;
    this.currentWaveIndex = 0;
    this.interWavePauseMs = 0;
    this.spawnCounter = 0;
    this.wavesClearedCount = 0;
    this.clearedWaveIndices.clear();
    this.spawnWave(0);
  }

  update(
    deltaMs: number,
    _heroes: HeroRuntimeState[],
    _enemies: EnemyRuntimeState[],
    _onSummon: (enemy: EnemyRuntimeState) => void,
  ): void {
    if (this.interWavePauseMs <= 0) return;

    this.interWavePauseMs -= deltaMs;
    if (this.interWavePauseMs <= 0) {
      this.interWavePauseMs = 0;
      this.spawnWave(this.currentWaveIndex + 1);
    }
  }

  onEnemyKilled(killedEnemyId: string, enemies: EnemyRuntimeState[]): void {
    if (this.isBossWave && isBossEnemyId(killedEnemyId)) {
      this.emit('bossKilled');
      this.emit('battleVictory');
      return;
    }

    const livingCount = enemies.filter((enemy) => enemy.isAlive).length;
    if (livingCount === 0) {
      this.handleWaveCleared();
    }
  }

  destroy(): void {
    this.removeAllListeners();
    this.clearedWaveIndices.clear();
    this.interWavePauseMs = 0;
  }

  private handleWaveCleared(): void {
    if (this.clearedWaveIndices.has(this.currentWaveIndex)) return;

    this.clearedWaveIndices.add(this.currentWaveIndex);
    this.emit('waveCleared', { waveIndex: this.currentWaveIndex });
    this.wavesClearedCount += 1;

    const isLastWave = this.currentWaveIndex >= this.waveConfigs.length - 1;
    if (isLastWave) {
      this.emit('battleVictory');
      return;
    }

    if (this.waveConfigs[this.currentWaveIndex].isBossWave) {
      return;
    }

    this.interWavePauseMs = COMBAT.WAVE_PAUSE_DURATION;
    this.emit('bossHpUpdate', { bossHp: 0, bossMaxHp: WARDEN.HP, visible: false });
  }

  private spawnWave(waveIndex: number): void {
    if (waveIndex >= this.waveConfigs.length) return;

    this.interWavePauseMs = 0;
    this.currentWaveIndex = waveIndex;
    const wave = this.waveConfigs[waveIndex];
    const enemies = this.buildWaveEnemies(waveIndex, wave.enemies, wave.statScale ?? 1);

    if (wave.isBossWave) {
      const boss = enemies.find((enemy) => enemy.isBoss);
      if (boss) {
        this.emit('bossHpUpdate', {
          bossHp: boss.currentHP,
          bossMaxHp: boss.maxHP,
          visible: true,
        });
      }
    }

    this.emit('waveEnemiesSpawned', {
      waveIndex,
      waveNumber: waveIndex + 1,
      isBossWave: wave.isBossWave,
      enemies,
    });
  }

  private buildWaveEnemies(
    waveIndex: number,
    definitions: { enemyId: string; count: number }[],
    statScale = 1,
  ): EnemyRuntimeState[] {
    const enemies: EnemyRuntimeState[] = [];
    let slotIndex = 0;

    for (const definition of definitions) {
      const template = getEnemySpawnTemplate(definition.enemyId);
      if (!template) continue;

      for (let copyIndex = 0; copyIndex < definition.count; copyIndex += 1) {
        const position = this.getSpawnPosition(slotIndex);
        this.spawnCounter += 1;
        const instanceId = `${definition.enemyId}_w${waveIndex}_${this.spawnCounter}`;
        const scaledHp = Math.round(template.hp * statScale);
        const scaledAttack = Math.round(template.attack * statScale);
        const scaledDefense = Math.round(template.defense * statScale);

        enemies.push({
          enemyId: definition.enemyId,
          instanceId,
          x: position.x,
          y: position.y,
          currentHP: scaledHp,
          maxHP: scaledHp,
          attack: scaledAttack,
          defense: scaledDefense,
          moveSpeed: template.speed,
          attackCooldown: template.attackCooldown,
          attackRange: template.attackRange,
          radius: template.radius,
          isAlive: true,
          attackCooldownRemaining: 0,
          activeDebuffs: [],
          targetingRule: template.targetingRule,
          dodgeChance: template.dodgeChance,
          basicAttackDamageReduction: template.basicAttackDamageReduction,
          basicAttackMultiplier: template.basicAttackMultiplier,
          isBoss: template.isBoss,
          bossTraits: template.bossTraits,
        });
        clampEnemyPosition(enemies[enemies.length - 1]);

        slotIndex += 1;
      }
    }

    return enemies;
  }

  private getSpawnPosition(slotIndex: number): { x: number; y: number } {
    const baseSlot = slotIndex % FORMATION.ENEMY_POSITIONS.length;
    const position = getEnemyStartPosition(baseSlot);
    const overflowRow = Math.floor(slotIndex / FORMATION.ENEMY_POSITIONS.length);

    return {
      x: position.x + overflowRow * FORMATION.ENEMY_OVERFLOW_X_OFFSET,
      y: position.y,
    };
  }
}
