// src/systems/FormationSystem.ts
// Formation positions and walk-in animation before combat starts.

import Phaser from 'phaser';
import { CANVAS, FORMATION } from '../constants/gameConfig';
import type { EnemyRuntimeState, HeroRuntimeState } from '../types';

interface WalkInUnit {
  runtime: HeroRuntimeState | EnemyRuntimeState;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

export function getStartPosition(slotIndex: number): { x: number; y: number } {
  const position = FORMATION.HERO_POSITIONS[slotIndex];
  return { x: position.x, y: position.y };
}

export function getEnemyStartPosition(slotIndex: number): { x: number; y: number } {
  const position = FORMATION.ENEMY_POSITIONS[slotIndex];
  return { x: position.x, y: position.y };
}

/** Battlefield 2×2 grid position derived from FORMATION.HERO_POSITIONS values. */
export function getHeroBattlePosition(slotIndex: number): { x: number; y: number } {
  const positions = FORMATION.HERO_POSITIONS;
  const leftColX = positions[2].x;
  const rightColX = positions[0].x;
  const frontRowY = positions[0].y;
  const backRowY = positions[3].y;

  switch (slotIndex) {
    case 0:
      return { x: leftColX, y: frontRowY };
    case 1:
      return { x: rightColX, y: frontRowY };
    case 2:
      return { x: leftColX, y: backRowY };
    case 3:
      return { x: rightColX, y: backRowY };
    default:
      return getStartPosition(slotIndex);
  }
}

export class FormationSystem extends Phaser.Events.EventEmitter {
  private walkInUnits: WalkInUnit[] = [];
  private elapsedMs = 0;
  private isWalkingIn = false;

  get isActive(): boolean {
    return this.isWalkingIn;
  }

  animateWalkIn(
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
  ): void {
    this.walkInUnits = [];
    this.elapsedMs = 0;
    this.isWalkingIn = true;

    heroes.forEach((hero, slotIndex) => {
      const target = getHeroBattlePosition(slotIndex);
      hero.x = FORMATION.HERO_WALK_IN_SPAWN_X;
      hero.y = target.y;
      hero.targetX = target.x;
      hero.targetY = target.y;

      this.walkInUnits.push({
        runtime: hero,
        startX: FORMATION.HERO_WALK_IN_SPAWN_X,
        startY: target.y,
        targetX: target.x,
        targetY: target.y,
      });
    });

    const enemySpawnX = CANVAS.WIDTH + FORMATION.ENEMY_WALK_IN_SPAWN_OFFSET;
    enemies.forEach((enemy, slotIndex) => {
      const target = getEnemyStartPosition(slotIndex);
      enemy.x = enemySpawnX;
      enemy.y = target.y;

      this.walkInUnits.push({
        runtime: enemy,
        startX: enemySpawnX,
        startY: target.y,
        targetX: target.x,
        targetY: target.y,
      });
    });
  }

  update(deltaSeconds: number): void {
    if (!this.isWalkingIn) return;

    this.elapsedMs += deltaSeconds * 1000;
    const progress = Math.min(this.elapsedMs / FORMATION.WALK_IN_DURATION, 1);

    for (const unit of this.walkInUnits) {
      const runtime = unit.runtime;
      runtime.x = unit.startX + (unit.targetX - unit.startX) * progress;
      runtime.y = unit.startY + (unit.targetY - unit.startY) * progress;

      if ('targetX' in runtime) {
        runtime.targetX = unit.targetX;
        runtime.targetY = unit.targetY;
      }
    }

    if (progress >= 1 || this.allUnitsArrived()) {
      this.snapToTargets();
      this.isWalkingIn = false;
      this.walkInUnits = [];
      this.emit('formationReady');
    }
  }

  private allUnitsArrived(): boolean {
    const threshold = FORMATION.ARRIVAL_THRESHOLD;
    return this.walkInUnits.every((unit) => {
      const dx = unit.runtime.x - unit.targetX;
      const dy = unit.runtime.y - unit.targetY;
      return dx * dx + dy * dy <= threshold * threshold;
    });
  }

  private snapToTargets(): void {
    for (const unit of this.walkInUnits) {
      unit.runtime.x = unit.targetX;
      unit.runtime.y = unit.targetY;
      if ('targetX' in unit.runtime) {
        unit.runtime.targetX = unit.targetX;
        unit.runtime.targetY = unit.targetY;
      }
    }
  }
}
