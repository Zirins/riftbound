// src/systems/WaveSystem.ts
// Wave spawning, clear detection, Rift Warden boss orchestration.

import Phaser from 'phaser';
import { COMBAT, ENEMIES, FORMATION, WARDEN, WAVES } from '../constants/gameConfig';
import { getEnemyStartPosition } from './FormationSystem';
import { WardenBossSystem } from './WardenBossSystem';
import type { EnemyRuntimeState, HeroRuntimeState } from '../types';

interface EnemyTemplate {
  id: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  attackCooldown: number;
  attackRange: number;
  radius: number;
}

const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  [ENEMIES.GRUNT.ID]: {
    id: ENEMIES.GRUNT.ID,
    hp: ENEMIES.GRUNT.HP,
    attack: ENEMIES.GRUNT.ATTACK,
    defense: ENEMIES.GRUNT.DEFENSE,
    speed: ENEMIES.GRUNT.SPEED,
    attackCooldown: ENEMIES.GRUNT.ATTACK_COOLDOWN,
    attackRange: ENEMIES.GRUNT.ATTACK_RANGE,
    radius: ENEMIES.GRUNT.RADIUS,
  },
  [ENEMIES.SPECTER.ID]: {
    id: ENEMIES.SPECTER.ID,
    hp: ENEMIES.SPECTER.HP,
    attack: ENEMIES.SPECTER.ATTACK,
    defense: ENEMIES.SPECTER.DEFENSE,
    speed: ENEMIES.SPECTER.SPEED,
    attackCooldown: ENEMIES.SPECTER.ATTACK_COOLDOWN,
    attackRange: ENEMIES.SPECTER.ATTACK_RANGE,
    radius: ENEMIES.SPECTER.RADIUS,
  },
  [ENEMIES.IRONCLAD.ID]: {
    id: ENEMIES.IRONCLAD.ID,
    hp: ENEMIES.IRONCLAD.HP,
    attack: ENEMIES.IRONCLAD.ATTACK,
    defense: ENEMIES.IRONCLAD.DEFENSE,
    speed: ENEMIES.IRONCLAD.SPEED,
    attackCooldown: ENEMIES.IRONCLAD.ATTACK_COOLDOWN,
    attackRange: ENEMIES.IRONCLAD.ATTACK_RANGE,
    radius: ENEMIES.IRONCLAD.RADIUS,
  },
  [ENEMIES.INVOKER.ID]: {
    id: ENEMIES.INVOKER.ID,
    hp: ENEMIES.INVOKER.HP,
    attack: ENEMIES.INVOKER.ATTACK,
    defense: ENEMIES.INVOKER.DEFENSE,
    speed: ENEMIES.INVOKER.SPEED,
    attackCooldown: ENEMIES.INVOKER.ATTACK_COOLDOWN,
    attackRange: ENEMIES.INVOKER.ATTACK_RANGE,
    radius: ENEMIES.INVOKER.RADIUS,
  },
  [WARDEN.ID]: {
    id: WARDEN.ID,
    hp: WARDEN.HP,
    attack: WARDEN.ATTACK,
    defense: WARDEN.DEFENSE,
    speed: WARDEN.SPEED,
    attackCooldown: WARDEN.ATTACK_COOLDOWN,
    attackRange: COMBAT.MELEE_ATTACK_RANGE,
    radius: WARDEN.RADIUS,
  },
};

export class WaveSystem extends Phaser.Events.EventEmitter {
  private currentWaveIndex = 0;
  private interWavePauseMs = 0;
  private spawnCounter = 0;
  private readonly wardenBoss: WardenBossSystem;

  constructor(scene: Phaser.Scene) {
    super();
    this.wardenBoss = new WardenBossSystem(scene);
  }

  get isInterWavePause(): boolean {
    return this.interWavePauseMs > 0;
  }

  get isBossWave(): boolean {
    return WAVES[this.currentWaveIndex]?.isBossWave ?? false;
  }

  startStage(): void {
    this.currentWaveIndex = 0;
    this.interWavePauseMs = 0;
    this.spawnWave(0);
  }

  update(
    deltaMs: number,
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
    onSummon: (grunt: EnemyRuntimeState) => void,
  ): void {
    if (this.interWavePauseMs > 0) {
      this.interWavePauseMs -= deltaMs;
      if (this.interWavePauseMs <= 0) {
        this.spawnWave(this.currentWaveIndex + 1);
      }
      return;
    }

    if (!this.isBossWave) return;

    const bossState = this.wardenBoss.update(deltaMs, heroes, enemies, (grunt) => {
      enemies.push(grunt);
      onSummon(grunt);
    });

    if (bossState) {
      this.emit('bossHpUpdate', { ...bossState, visible: true });
    }
  }

  onEnemyKilled(killedEnemyId: string, enemies: EnemyRuntimeState[]): void {
    if (killedEnemyId === WARDEN.ID) {
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
    this.wardenBoss.destroy();
  }

  private handleWaveCleared(): void {
    this.emit('waveCleared', { waveIndex: this.currentWaveIndex });

    if (WAVES[this.currentWaveIndex].isBossWave) {
      return;
    }

    this.interWavePauseMs = COMBAT.WAVE_PAUSE_DURATION;
    this.emit('bossHpUpdate', { bossHp: 0, bossMaxHp: WARDEN.HP, visible: false });
  }

  private spawnWave(waveIndex: number): void {
    if (waveIndex >= WAVES.length) return;

    this.currentWaveIndex = waveIndex;
    const wave = WAVES[waveIndex];
    const enemies = this.buildWaveEnemies(waveIndex, wave.enemies);

    if (wave.isBossWave) {
      this.wardenBoss.reset();
      const warden = enemies.find((enemy) => enemy.enemyId === WARDEN.ID);
      if (warden) {
        this.emit('bossHpUpdate', {
          bossHp: warden.currentHP,
          bossMaxHp: warden.maxHP,
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
  ): EnemyRuntimeState[] {
    const enemies: EnemyRuntimeState[] = [];
    let slotIndex = 0;

    for (const definition of definitions) {
      const template = ENEMY_TEMPLATES[definition.enemyId];
      if (!template) continue;

      for (let copyIndex = 0; copyIndex < definition.count; copyIndex += 1) {
        const position = this.getSpawnPosition(slotIndex);
        this.spawnCounter += 1;
        const instanceId = `${definition.enemyId}_w${waveIndex}_${this.spawnCounter}`;

        enemies.push({
          enemyId: definition.enemyId,
          instanceId,
          x: position.x,
          y: position.y,
          currentHP: template.hp,
          maxHP: template.hp,
          attack: template.attack,
          defense: template.defense,
          moveSpeed: template.speed,
          attackCooldown: template.attackCooldown,
          attackRange: template.attackRange,
          radius: template.radius,
          isAlive: true,
          attackCooldownRemaining: 0,
          activeDebuffs: [],
        });

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
