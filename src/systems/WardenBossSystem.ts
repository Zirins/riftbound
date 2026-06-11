// src/systems/WardenBossSystem.ts
// Rift Warden boss — Rift Slam telegraph and Summon Adds.

import Phaser from 'phaser';
import { ENEMIES, FORMATION, UI, WARDEN } from '../constants/gameConfig';
import type { EnemyRuntimeState, HeroRuntimeState } from '../types';

interface PendingSlam {
  impactX: number;
  impactY: number;
  warningCircle: Phaser.GameObjects.Arc;
  remainingMs: number;
}

export class WardenBossSystem {
  private slamCooldownMs = 0;
  private summonCooldownMs = 0;
  private pendingSlams: PendingSlam[] = [];
  private spawnCounter = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  reset(): void {
    this.slamCooldownMs = WARDEN.SLAM_INTERVAL;
    this.summonCooldownMs = WARDEN.SUMMON_INTERVAL;
    this.clearPendingSlams();
  }

  update(
    deltaMs: number,
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
    onSummon: (grunt: EnemyRuntimeState) => void,
  ): { bossHp: number; bossMaxHp: number } | null {
    const warden = enemies.find(
      (enemy) => enemy.enemyId === WARDEN.ID && enemy.isAlive,
    );
    if (!warden) {
      this.clearPendingSlams();
      return null;
    }

    this.slamCooldownMs -= deltaMs;
    if (this.slamCooldownMs <= 0) {
      this.queueSlam(heroes);
      this.slamCooldownMs = WARDEN.SLAM_INTERVAL;
    }

    this.summonCooldownMs -= deltaMs;
    if (this.summonCooldownMs <= 0) {
      this.summonGrunts(warden, onSummon);
      this.summonCooldownMs = WARDEN.SUMMON_INTERVAL;
    }

    this.resolvePendingSlams(deltaMs, heroes);

    return { bossHp: warden.currentHP, bossMaxHp: warden.maxHP };
  }

  destroy(): void {
    this.clearPendingSlams();
  }

  private queueSlam(heroes: HeroRuntimeState[]): void {
    const living = heroes.filter((hero) => hero.isAlive);
    if (living.length === 0) return;

    const target = living.reduce((lowest, hero) =>
      hero.currentHP < lowest.currentHP ? hero : lowest,
    );

    const warningCircle = this.scene.add.circle(
      target.x,
      target.y,
      WARDEN.SLAM_RADIUS,
      WARDEN.WARN_COLOR,
      WARDEN.WARN_ALPHA,
    );
    warningCircle.setDepth(UI.ULTIMATE_VFX_DEPTH - 1);

    this.pendingSlams.push({
      impactX: target.x,
      impactY: target.y,
      warningCircle,
      remainingMs: WARDEN.SLAM_DELAY,
    });
  }

  private resolvePendingSlams(deltaMs: number, heroes: HeroRuntimeState[]): void {
    for (const slam of this.pendingSlams) {
      slam.remainingMs -= deltaMs;
    }

    const ready = this.pendingSlams.filter((slam) => slam.remainingMs <= 0);
    for (const slam of ready) {
      slam.warningCircle.destroy();
      this.applySlamDamage(slam.impactX, slam.impactY, heroes);
    }

    this.pendingSlams = this.pendingSlams.filter((slam) => slam.remainingMs > 0);
  }

  private applySlamDamage(impactX: number, impactY: number, heroes: HeroRuntimeState[]): void {
    const radiusSq = WARDEN.SLAM_RADIUS * WARDEN.SLAM_RADIUS;

    for (const hero of heroes) {
      if (!hero.isAlive) continue;
      const dx = hero.x - impactX;
      const dy = hero.y - impactY;
      if (dx * dx + dy * dy >= radiusSq) continue;

      hero.currentHP -= WARDEN.SLAM_DAMAGE;
      if (hero.currentHP <= 0) {
        hero.currentHP = 0;
        hero.isAlive = false;
      }
    }
  }

  private summonGrunts(
    warden: EnemyRuntimeState,
    onSummon: (grunt: EnemyRuntimeState) => void,
  ): void {
    for (let index = 0; index < WARDEN.SUMMON_COUNT; index += 1) {
      const offsetX = (index - (WARDEN.SUMMON_COUNT - 1) / 2) * FORMATION.ENEMY_SUMMON_SPREAD;
      const grunt = this.createSummonedGrunt(warden, offsetX);
      onSummon(grunt);
    }
  }

  private createSummonedGrunt(
    warden: EnemyRuntimeState,
    offsetX: number,
  ): EnemyRuntimeState {
    this.spawnCounter += 1;

    return {
      enemyId: ENEMIES.GRUNT.ID,
      instanceId: `${ENEMIES.GRUNT.ID}_summon_${this.spawnCounter}`,
      x: warden.x + offsetX,
      y: warden.y,
      currentHP: ENEMIES.GRUNT.HP,
      maxHP: ENEMIES.GRUNT.HP,
      attack: ENEMIES.GRUNT.ATTACK,
      defense: ENEMIES.GRUNT.DEFENSE,
      moveSpeed: ENEMIES.GRUNT.SPEED,
      attackCooldown: ENEMIES.GRUNT.ATTACK_COOLDOWN,
      attackRange: ENEMIES.GRUNT.ATTACK_RANGE,
      radius: ENEMIES.GRUNT.RADIUS,
      isAlive: true,
      attackCooldownRemaining: 0,
      activeDebuffs: [],
    };
  }

  private clearPendingSlams(): void {
    for (const slam of this.pendingSlams) {
      slam.warningCircle.destroy();
    }
    this.pendingSlams = [];
  }
}
